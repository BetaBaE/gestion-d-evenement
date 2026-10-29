import {
  Datagrid,
  TextField,
  SimpleForm,
  TextInput,
  ListBase,
  EditBase,
  CreateBase,
  useRecordContext,
  useNotify,
  useRefresh,
  Button as RaButton,
  useDataProvider,
  SaveButton,
  Toolbar,
  Pagination,
} from 'react-admin';
import { useRef, useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';

function OrganismeForm() {
  return (
    <SimpleForm toolbar={<Toolbar><SaveButton /></Toolbar>}>
      <TextInput source="nom" label="Nom" required fullWidth />
      <TextInput source="siegeSocial" label="Siège social" fullWidth />
      <TextInput source="adresse" label="Adresse" fullWidth />
      <TextInput source="ville" label="Ville" />
      <TextInput source="pays" label="Pays" />
      <TextInput source="telephone" label="Téléphone" />
      <TextInput source="fax" label="Fax" />
      <TextInput source="email" label="Email" />
      <TextInput source="siteWeb" label="Site web" />
      <TextInput source="contactNom" label="Nom du contact" />
      <TextInput source="contactFonction" label="Fonction du contact" />
      <TextInput source="contactTelephone" label="Téléphone du contact" />
      <TextInput source="contactEmail" label="Email du contact" />
    </SimpleForm>
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
      notify(`${data.created} organisme(s) importé(s).`, { type: 'success' });
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleImport}
      />

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
          <DeleteOrganismeButton eventId={eventId} onDeleted={refresh} />
        </Datagrid>
        <Pagination />
      </ListBase>

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog?.mode === 'create' ? 'Nouvel organisme' : "Modifier l'organisme"}</DialogTitle>
        <DialogContent>
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
              <OrganismeForm />
            </CreateBase>
          )}
          {dialog?.mode === 'edit' && (
            <EditBase
              resource="organismes"
              id={dialog.id}
              queryOptions={{ meta: { eventId } }}
              mutationOptions={{
                meta: { eventId },
                onSuccess: () => {
                  notify('Organisme modifié.', { type: 'success' });
                  refresh();
                  setDialog(null);
                },
              }}
            >
              <OrganismeForm />
            </EditBase>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
