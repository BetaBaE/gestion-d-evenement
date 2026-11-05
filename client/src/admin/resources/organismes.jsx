import {
  Datagrid,
  TextField,
  TextInput,
  ListBase,
  EditBase,
  CreateBase,
  useRecordContext,
  useNotify,
  useRefresh,
  Button as RaButton,
  useDataProvider,
  Pagination,
  required,
  email,
} from 'react-admin';
import { useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { FormDialog, DialogForm, FormSection, Field, ImageField, UrlInput } from '../../components/form/index.js';
import { getImageUrl, uploadOrganismeLogo, deleteOrganismeLogo } from '../../api/imageApi.js';
import { GroupActionsProvider, OrganismeCountsField, OrganismeShortcuts } from './GroupShortcuts.jsx';

function OrganismeLogoField({ eventId }) {
  const record = useRecordContext();
  const refresh = useRefresh();
  if (!record) {
    return (
      <Typography variant="body2" color="text.secondary">
        Le logo pourra être ajouté une fois l'organisme créé.
      </Typography>
    );
  }
  const organisateurId = getSelectedOrganisateurId();
  return (
    <ImageField
      label="Logo"
      variant="logo"
      imageUrl={getImageUrl(record.logoImageId, { v: record.updatedAt })}
      onUpload={async (file, options) => {
        await uploadOrganismeLogo(organisateurId, eventId, record.id, file, options);
        refresh();
      }}
      onDelete={async () => {
        await deleteOrganismeLogo(organisateurId, eventId, record.id);
        refresh();
      }}
    />
  );
}

const emailValide = email('Email invalide.');

function OrganismeForm({ eventId, isEdit }) {
  return (
    <DialogForm saveLabel={isEdit ? 'Enregistrer' : "Créer l'organisme"}>
      <FormSection title="Identité">
        <Field w="full">
          <OrganismeLogoField eventId={eventId} />
        </Field>
        <Field w="full">
          <TextInput source="nom" label="Nom" validate={required()} fullWidth />
        </Field>
        <Field w="full">
          <TextInput source="siegeSocial" label="Siège social" fullWidth />
        </Field>
      </FormSection>

      <FormSection title="Coordonnées">
        <Field w="full">
          <TextInput source="adresse" label="Adresse" fullWidth />
        </Field>
        <Field w="half">
          <TextInput source="ville" label="Ville" fullWidth />
        </Field>
        <Field w="half">
          <TextInput source="pays" label="Pays" fullWidth />
        </Field>
        <Field w="half">
          <TextInput source="telephone" label="Téléphone" type="tel" fullWidth />
        </Field>
        <Field w="half">
          <TextInput source="fax" label="Fax" type="tel" fullWidth />
        </Field>
        <Field w="half">
          <TextInput source="email" label="Email" type="email" validate={emailValide} fullWidth />
        </Field>
        <Field w="half">
          <UrlInput source="siteWeb" label="Site web" />
        </Field>
      </FormSection>

      <FormSection title="Personne de contact" description="Reçoit le lien d'inscription et les communications de l'organisateur.">
        <Field w="half">
          <TextInput source="contactNom" label="Nom du contact" fullWidth />
        </Field>
        <Field w="half">
          <TextInput source="contactFonction" label="Fonction" fullWidth />
        </Field>
        <Field w="half">
          <TextInput source="contactTelephone" label="Téléphone" type="tel" fullWidth />
        </Field>
        <Field w="half">
          <TextInput source="contactEmail" label="Email" type="email" validate={emailValide} fullWidth />
        </Field>
      </FormSection>
    </DialogForm>
  );
}

function DeleteOrganismeButton({ eventId, onDeleted }) {
  const record = useRecordContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();

  async function handleClick(event) {
    event.stopPropagation();
    try {
      await dataProvider.delete('organismes', { id: record.id, meta: { eventId } });
      notify('Organisme supprimé.', { type: 'success' });
      onDeleted();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur lors de la suppression.', { type: 'error' });
    }
  }

  if (!record) return null;

  return (
    <IconButton size="small" onClick={handleClick} aria-label="Supprimer">
      <DeleteIcon fontSize="small" />
    </IconButton>
  );
}

export function OrganismesPanel({ eventId }) {
  const notify = useNotify();
  const refresh = useRefresh();
  const [dialog, setDialog] = useState(null);
  const fileInputRef = useRef(null);

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const organisateurId = getSelectedOrganisateurId();
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axiosClient.post(
        `/admin/organisateurs/${organisateurId}/events/${eventId}/organismes/import`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      // Lines that failed validation are listed instead of being silently skipped.
      const skipped = data.errors?.length
        ? ` ${data.errors.length} ligne(s) ignorée(s) : ${data.errors.slice(0, 3).map((e) => `ligne ${e.line} (${e.message})`).join(', ')}${data.errors.length > 3 ? '…' : ''}.`
        : '';
      notify(`${data.created} organisme(s) importé(s).${skipped}`, { type: skipped ? 'warning' : 'success', autoHideDuration: skipped ? 12000 : 5000 });
      refresh();
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'import.", { type: 'error' });
    } finally {
      event.target.value = '';
    }
  }

  return (
    <Box>
      <RaButton label="Nouvel organisme" onClick={() => setDialog({ mode: 'create' })} sx={{ mb: 2 }} />
      <RaButton
        label="Importer un CSV"
        onClick={() => fileInputRef.current?.click()}
        sx={{ mb: 2, ml: 1 }}
      >
        <UploadFileIcon />
      </RaButton>
      {/* Ready-to-fill CSV (Excel FR: ";" separator, UTF-8): the expected columns, 3 sample rows. */}
      <RaButton label="Télécharger un exemple" component="a" href="/exemple-organismes.csv" download="exemple-organismes.csv" sx={{ mb: 2, ml: 1 }}>
        <FileDownloadIcon />
      </RaButton>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleImport}
      />

      <GroupActionsProvider eventId={eventId}>
      <ListBase resource="organismes" queryOptions={{ meta: { eventId } }}>
        <Datagrid
          bulkActionButtons={false}
          rowClick={(id, resource, record) => {
            setDialog({ mode: 'edit', id: record.id });
            return false;
          }}
        >
          <TextField source="nom" label="Nom" />
          <TextField source="ville" label="Ville" />
          <TextField source="email" label="Email" />
          <TextField source="contactNom" label="Contact" />
          <OrganismeCountsField eventId={eventId} label="Participants" />
          <OrganismeShortcuts eventId={eventId} label="" />
          <DeleteOrganismeButton eventId={eventId} onDeleted={refresh} />
        </Datagrid>
        <Pagination />
      </ListBase>
      </GroupActionsProvider>

      <FormDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.mode === 'create' ? 'Créer un organisme invité' : "Modifier l'organisme"}
      >
          {dialog?.mode === 'create' && (
            <CreateBase
              resource="organismes"
              mutationOptions={{
                meta: { eventId },
                onSuccess: () => {
                  notify('Organisme créé.', { type: 'success' });
                  refresh();
                  setDialog(null);
                },
              }}
            >
              <OrganismeForm eventId={eventId} isEdit={false} />
            </CreateBase>
          )}
          {dialog?.mode === 'edit' && (
            <EditBase
              resource="organismes"
              id={dialog.id}
              queryOptions={{ meta: { eventId } }}
              mutationMode="pessimistic"
              mutationOptions={{
                meta: { eventId },
                onSuccess: () => {
                  notify('Organisme modifié.', { type: 'success' });
                  refresh();
                  setDialog(null);
                },
              }}
            >
              <OrganismeForm eventId={eventId} isEdit />
            </EditBase>
          )}
      </FormDialog>
    </Box>
  );
}
