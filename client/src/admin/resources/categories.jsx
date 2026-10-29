import {
  Datagrid,
  TextField,
  BooleanField,
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
} from 'react-admin';
import { useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import DeleteIcon from '@mui/icons-material/Delete';

function ColorSwatch() {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <Box
      sx={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        backgroundColor: record.couleur || '#ccc',
        display: 'inline-block',
      }}
    />
  );
}

function CategorieForm() {
  return (
    <SimpleForm toolbar={<Toolbar><SaveButton /></Toolbar>}>
      <TextInput source="nom" label="Nom" required fullWidth />
      <TextInput source="couleur" label="Couleur (hex)" placeholder="#1971c2" />
      <TextInput source="description" label="Description" fullWidth multiline />
    </SimpleForm>
  );
}

function DeleteCategorieButton({ eventId, onDeleted }) {
  const record = useRecordContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();

  async function handleClick(event) {
    event.stopPropagation();
    try {
      await dataProvider.delete('categories', { id: record.id, meta: { eventId } });
      notify('Catégorie supprimée.', { type: 'success' });
      onDeleted();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur lors de la suppression.', { type: 'error' });
    }
  }

  if (!record || record.isDefault) return null;

  return (
    <IconButton size="small" onClick={handleClick} aria-label="Supprimer">
      <DeleteIcon fontSize="small" />
    </IconButton>
  );
}

export function CategoriesPanel({ eventId }) {
  const notify = useNotify();
  const refresh = useRefresh();
  const [dialog, setDialog] = useState(null);

  return (
    <Box>
      <RaButton label="Nouvelle catégorie" onClick={() => setDialog({ mode: 'create' })} sx={{ mb: 2 }} />

      <ListBase resource="categories" queryOptions={{ meta: { eventId } }}>
        <Datagrid
          bulkActionButtons={false}
          rowClick={(id, resource, record) => {
            setDialog({ mode: 'edit', id: record.id });
            return false;
          }}
        >
          <ColorSwatch />
          <TextField source="nom" label="Nom" />
          <BooleanField source="isDefault" label="Par défaut" />
          <TextField source="description" label="Description" />
          <DeleteCategorieButton eventId={eventId} onDeleted={refresh} />
        </Datagrid>
      </ListBase>

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <ColorLensIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          {dialog?.mode === 'create' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
        </DialogTitle>
        <DialogContent>
          {dialog?.mode === 'create' && (
            <CreateBase
              resource="categories"
              mutationOptions={{
                meta: { eventId },
                onSuccess: () => {
                  notify('Catégorie créée.', { type: 'success' });
                  refresh();
                  setDialog(null);
                },
              }}
            >
              <CategorieForm />
            </CreateBase>
          )}
          {dialog?.mode === 'edit' && (
            <EditBase
              resource="categories"
              id={dialog.id}
              queryOptions={{ meta: { eventId } }}
              mutationOptions={{
                meta: { eventId },
                onSuccess: () => {
                  notify('Catégorie modifiée.', { type: 'success' });
                  refresh();
                  setDialog(null);
                },
              }}
            >
              <CategorieForm />
            </EditBase>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
