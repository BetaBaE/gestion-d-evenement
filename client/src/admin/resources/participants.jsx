import {
  Datagrid,
  TextField,
  SimpleForm,
  SelectInput,
  ListBase,
  CreateBase,
  useRecordContext,
  useNotify,
  useRefresh,
  useListContext,
  Button as RaButton,
  useDataProvider,
  SaveButton,
  Toolbar,
  Pagination,
  TextInput,
  required,
  BulkActionsToolbar,
} from 'react-admin';
import { useState } from 'react';
import { Box, Chip, Dialog, DialogContent, DialogTitle, IconButton, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EmailIcon from '@mui/icons-material/Email';
import PrintIcon from '@mui/icons-material/Print';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { Avatar } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { adminImageUrl, uploadParticipantPhoto, deleteAllParticipantPhotos } from '../../api/imageApi.js';

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

  async function handlePrint(event) {
    event.stopPropagation();
    window.open(`${axiosClient.defaults.baseURL}${basePath(eventId)}/${record.id}/badge.pdf`, '_blank');
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
        <IconButton size="small" onClick={handlePrint} aria-label="Imprimer le badge" title="Imprimer le badge">
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
      <Avatar src={record.photoImageId ? adminImageUrl(record.photoImageId) : undefined} sx={{ width: 32, height: 32 }}>
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

function ParticipantForm({ categories, organismes }) {
  return (
    <SimpleForm toolbar={<Toolbar><SaveButton /></Toolbar>}>
      <SelectInput
        source="invitedOrganismId"
        label="Organisme"
        choices={organismes.map((o) => ({ id: o.id, name: o.nom }))}
        validate={required()}
        fullWidth
      />
      <SelectInput
        source="categorieId"
        label="Catégorie"
        choices={categories.map((c) => ({ id: c.id, name: c.nom }))}
      />
      <SelectInput
        source="civilite"
        label="Civilité"
        choices={[{ id: 'M.', name: 'M.' }, { id: 'Mme', name: 'Mme' }]}
      />
      <TextInput source="nom" label="Nom" validate={required()} />
      <TextInput source="prenom" label="Prénom" validate={required()} />
      <TextInput source="fonction" label="Fonction" validate={required()} />
      <TextInput source="email" label="Email" validate={required()} fullWidth />
      <TextInput source="telephone" label="Téléphone" />
      <TextInput source="commentaire" label="Commentaire" fullWidth multiline />
    </SimpleForm>
  );
}

export function ParticipantsPanel({ eventId, categories, organismes }) {
  const notify = useNotify();
  const refresh = useRefresh();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Box>
      <RaButton label="Ajouter un participant" onClick={() => setCreateOpen(true)} sx={{ mb: 2 }} />
      <DeleteAllPhotosButton eventId={eventId} onDone={refresh} />

      <ListBase resource="participants" queryOptions={{ meta: { eventId } }}>
        <BulkActionsToolbar>
          <BulkValidateButton eventId={eventId} onDone={refresh} />
        </BulkActionsToolbar>
        <Datagrid rowClick={false}>
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un participant</DialogTitle>
        <DialogContent>
          <CreateBase
            resource="participants"
            mutationOptions={{
              meta: { eventId },
              onSuccess: () => {
                notify('Participant ajouté.', { type: 'success' });
                refresh();
                setCreateOpen(false);
              },
              onError: (error) => {
                notify(error.response?.data?.message || "Erreur lors de l'ajout.", { type: 'error' });
              },
            }}
          >
            <ParticipantForm categories={categories} organismes={organismes} />
          </CreateBase>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
