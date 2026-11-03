import {
  Datagrid,
  TextField,
  SelectInput,
  ListBase,
  CreateBase,
  EditBase,
  useRecordContext,
  useNotify,
  useRefresh,
  useListContext,
  Button as RaButton,
  useDataProvider,
  Pagination,
  TextInput,
  required,
  email,
  BulkActionsToolbar,
} from 'react-admin';
import { useState } from 'react';
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EmailIcon from '@mui/icons-material/Email';
import PrintIcon from '@mui/icons-material/Print';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { Avatar } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { getImageUrl, uploadParticipantPhoto, deleteParticipantPhoto, deleteAllParticipantPhotos } from '../../api/imageApi.js';
import { FormDialog, DialogForm, FormSection, Field, ImageField } from '../../components/form/index.js';

const statutChoices = [
  { id: 'EN_ATTENTE', name: 'En attente' },
  { id: 'VALIDE', name: 'Validé' },
  { id: 'REFUSE', name: 'Refusé' },
];

const statutColors = {
  EN_ATTENTE: 'warning',
  VALIDE: 'success',
  REFUSE: 'error',
};

function basePath(eventId) {
  const organisateurId = getSelectedOrganisateurId();
  return `/admin/organisateurs/${organisateurId}/events/${eventId}/participants`;
}

function StatutChip() {
  const record = useRecordContext();
  if (!record) return null;
  const label = statutChoices.find((c) => c.id === record.statut)?.name || record.statut;
  return <Chip size="small" label={label} color={statutColors[record.statut] || 'default'} />;
}

function ParticipantRowActions({ eventId, onDone }) {
  const record = useRecordContext();
  const notify = useNotify();
  const [loading, setLoading] = useState(false);

  if (!record) return null;

  async function handleValidate(event) {
    event.stopPropagation();
    setLoading(true);
    try {
      await axiosClient.post(`${basePath(eventId)}/${record.id}/valider`);
      notify('Participant validé, badge envoyé.', { type: 'success' });
      onDone();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur lors de la validation.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefuse(event) {
    event.stopPropagation();
    setLoading(true);
    try {
      await axiosClient.post(`${basePath(eventId)}/${record.id}/refuser`);
      notify('Participant refusé.', { type: 'info' });
      onDone();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(event) {
    event.stopPropagation();
    setLoading(true);
    try {
      const type = record.statut === 'VALIDE' ? 'BADGE' : 'CONFIRMATION';
      await axiosClient.post(`${basePath(eventId)}/${record.id}/renvoyer-email`, { type });
      notify('Email renvoyé.', { type: 'success' });
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'envoi.", { type: 'error' });
    } finally {
      setLoading(false);
    }
  }


  return (
    <Stack direction="row" spacing={0.5}>
      {record.statut === 'EN_ATTENTE' && (
        <IconButton size="small" onClick={handleValidate} disabled={loading} aria-label="Valider et envoyer le badge" title="Valider et envoyer le badge">
          <CheckCircleIcon fontSize="small" color="success" />
        </IconButton>
      )}
      {record.statut === 'EN_ATTENTE' && (
        <IconButton size="small" onClick={handleRefuse} disabled={loading} aria-label="Refuser" title="Refuser">
          <CancelIcon fontSize="small" color="error" />
        </IconButton>
      )}
      <IconButton size="small" onClick={handleResend} disabled={loading} aria-label="Renvoyer email" title="Renvoyer email">
        <EmailIcon fontSize="small" />
      </IconButton>
      {record.statut === 'VALIDE' && (
        // A real link (new tab), not window.open(): popup blockers don't touch it.
        <IconButton
          size="small"
          component="a"
          href={`${axiosClient.defaults.baseURL}${basePath(eventId)}/${record.id}/badge.pdf`}
          target="_blank"
          rel="noopener"
          onClick={(e) => e.stopPropagation()}
          aria-label="Imprimer le badge"
          title="Imprimer le badge"
        >
          <PrintIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
}

function ParticipantPhotoCell({ eventId, onChanged }) {
  const record = useRecordContext();
  const notify = useNotify();
  const organisateurId = getSelectedOrganisateurId();

  if (!record) return null;

  async function handleFileChange(event) {
    event.stopPropagation();
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadParticipantPhoto(organisateurId, eventId, record.id, file);
      notify('Photo mise à jour.', { type: 'success' });
      onChanged();
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'envoi de la photo.", { type: 'error' });
    } finally {
      event.target.value = '';
    }
  }

  return (
    <label onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }}>
      <Avatar src={record.photoImageId ? getImageUrl(record.photoImageId, { prive: true }) : undefined} sx={{ width: 32, height: 32 }}>
        <PhotoCameraIcon fontSize="small" />
      </Avatar>
      <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFileChange} />
    </label>
  );
}

function DeleteAllPhotosButton({ eventId, onDone }) {
  const notify = useNotify();

  async function handleClick() {
    const organisateurId = getSelectedOrganisateurId();
    try {
      const result = await deleteAllParticipantPhotos(organisateurId, eventId);
      notify(`${result.deleted} photo(s) supprimée(s).`, { type: 'success' });
      onDone();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur lors de la suppression.', { type: 'error' });
    }
  }

  return <RaButton label="Supprimer toutes les photos" onClick={handleClick} />;
}

function CategorieInlineSelect({ eventId, categories, onChanged }) {
  const record = useRecordContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  if (!record) return null;

  async function handleChange(event) {
    const categorieId = event.target.value;
    try {
      await dataProvider.update('participants', {
        id: record.id,
        data: { categorieId },
        meta: { eventId },
      });
      notify('Catégorie mise à jour.', { type: 'success' });
      onChanged();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur.', { type: 'error' });
    }
  }

  return (
    <select value={record.categorieId} onChange={handleChange} onClick={(e) => e.stopPropagation()}>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.nom}
        </option>
      ))}
    </select>
  );
}

function BulkValidateButton({ eventId, onDone }) {
  const { selectedIds } = useListContext();
  const notify = useNotify();

  async function handleClick() {
    try {
      await axiosClient.post(`${basePath(eventId)}/valider-lot`, { participantIds: selectedIds });
      notify('Participants validés et badges envoyés.', { type: 'success' });
      onDone();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur lors de la validation groupée.', { type: 'error' });
    }
  }

  return <RaButton label="Valider et envoyer les badges" onClick={handleClick} />;
}

function ParticipantPhotoField({ eventId }) {
  const record = useRecordContext();
  const refresh = useRefresh();
  if (!record) {
    return (
      <Typography variant="body2" color="text.secondary">
        La photo pourra être ajoutée une fois le participant créé.
      </Typography>
    );
  }
  const organisateurId = getSelectedOrganisateurId();
  return (
    <ImageField
      label="Photo"
      variant="photo"
      imageUrl={getImageUrl(record.photoImageId, { prive: true, v: record.updatedAt })}
      onUpload={async (file, options) => {
        await uploadParticipantPhoto(organisateurId, eventId, record.id, file, options);
        refresh();
      }}
      onDelete={async () => {
        await deleteParticipantPhoto(organisateurId, eventId, record.id);
        refresh();
      }}
    />
  );
}

const civiliteChoices = [
  { id: 'M.', name: 'M.' },
  { id: 'Mme', name: 'Mme' },
];

// Fields the update API accepts (email and organisme are fixed after registration).
const EDITABLE_FIELDS = ['categorieId', 'civilite', 'nom', 'prenom', 'fonction', 'telephone', 'commentaire'];
const pickEditable = (data) =>
  Object.fromEntries(EDITABLE_FIELDS.filter((k) => data[k] !== null && data[k] !== undefined).map((k) => [k, data[k]]));

function ParticipantForm({ eventId, categories, organismes, isEdit }) {
  return (
    <DialogForm saveLabel={isEdit ? 'Enregistrer' : 'Ajouter le participant'}>
      <FormSection title="Identité">
        <Field w="full">
          <ParticipantPhotoField eventId={eventId} />
        </Field>
        <Field w="half">
          <TextInput source="nom" label="Nom" validate={required()} fullWidth />
        </Field>
        <Field w="half">
          <TextInput source="prenom" label="Prénom" validate={required()} fullWidth />
        </Field>
        <Field w="quarter">
          <SelectInput source="civilite" label="Civilité" choices={civiliteChoices} fullWidth />
        </Field>
        <Field w="quarter">
          <SelectInput source="categorieId" label="Catégorie" choices={categories.map((c) => ({ id: c.id, name: c.nom }))} fullWidth />
        </Field>
        <Field w="half">
          <TextInput source="fonction" label="Fonction" validate={required()} fullWidth />
        </Field>
      </FormSection>

      <FormSection
        title="Contact"
        description={isEdit ? "L'email et l'organisme ne sont pas modifiables après l'inscription." : undefined}
      >
        <Field w="half">
          <SelectInput
            source="invitedOrganismId"
            label="Organisme"
            choices={organismes.map((o) => ({ id: o.id, name: o.nom }))}
            validate={isEdit ? undefined : required()}
            disabled={isEdit}
            fullWidth
          />
        </Field>
        <Field w="half">
          <TextInput source="email" label="Email" type="email" validate={isEdit ? undefined : [required(), email('Email invalide.')]} disabled={isEdit} fullWidth />
        </Field>
        <Field w="half">
          <TextInput source="telephone" label="Téléphone" type="tel" fullWidth />
        </Field>
      </FormSection>

      <FormSection title="Remarques">
        <Field w="full">
          <TextInput source="commentaire" label="Commentaire" fullWidth multiline minRows={2} />
        </Field>
      </FormSection>
    </DialogForm>
  );
}

export function ParticipantsPanel({ eventId, categories, organismes }) {
  const notify = useNotify();
  const refresh = useRefresh();
  const [dialog, setDialog] = useState(null);

  return (
    <Box>
      <RaButton label="Ajouter un participant" onClick={() => setDialog({ mode: 'create' })} sx={{ mb: 2 }} />
      <DeleteAllPhotosButton eventId={eventId} onDone={refresh} />

      <ListBase resource="participants" queryOptions={{ meta: { eventId } }}>
        <BulkActionsToolbar>
          <BulkValidateButton eventId={eventId} onDone={refresh} />
        </BulkActionsToolbar>
        <Datagrid
          rowClick={(id, resource, record) => {
            setDialog({ mode: 'edit', id: record.id });
            return false;
          }}
        >
          <ParticipantPhotoCell eventId={eventId} onChanged={refresh} />
          <TextField source="nom" label="Nom" />
          <TextField source="prenom" label="Prénom" />
          <TextField source="email" label="Email" />
          <TextField source="fonction" label="Fonction" />
          <CategorieInlineSelect eventId={eventId} categories={categories} onChanged={refresh} />
          <StatutChip />
          <ParticipantRowActions eventId={eventId} onDone={refresh} />
        </Datagrid>
        <Pagination />
      </ListBase>

      <FormDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.mode === 'create' ? 'Ajouter un participant' : 'Modifier le participant'}
      >
        {dialog?.mode === 'create' && (
          <CreateBase
            resource="participants"
            mutationOptions={{
              meta: { eventId },
              onSuccess: () => {
                notify('Participant ajouté.', { type: 'success' });
                refresh();
                setDialog(null);
              },
              onError: (error) => {
                notify(error.response?.data?.message || "Erreur lors de l'ajout.", { type: 'error' });
              },
            }}
          >
            <ParticipantForm eventId={eventId} categories={categories} organismes={organismes} isEdit={false} />
          </CreateBase>
        )}
        {dialog?.mode === 'edit' && (
          <EditBase
            resource="participants"
            id={dialog.id}
            queryOptions={{ meta: { eventId } }}
            mutationMode="pessimistic"
            transform={pickEditable}
            mutationOptions={{
              meta: { eventId },
              onSuccess: () => {
                notify('Participant modifié.', { type: 'success' });
                refresh();
                setDialog(null);
              },
              onError: (error) => {
                notify(error.response?.data?.message || 'Erreur lors de l’enregistrement.', { type: 'error' });
              },
            }}
          >
            <ParticipantForm eventId={eventId} categories={categories} organismes={organismes} isEdit />
          </EditBase>
        )}
      </FormDialog>
    </Box>
  );
}
