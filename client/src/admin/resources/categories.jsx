import {
  Datagrid,
  TextField,
  BooleanField,
  TextInput,
  ListBase,
  EditBase,
  CreateBase,
  useRecordContext,
  useNotify,
  useRefresh,
  Button as RaButton,
  useDataProvider,
  required,
} from 'react-admin';
import { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { FormDialog, DialogForm, FormSection, Field, ColorInput } from '../../components/form/index.js';
import DeleteIcon from '@mui/icons-material/Delete';
import { GroupActionsProvider, CategorieShortcuts } from './GroupShortcuts.jsx';

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

function CategorieForm({ isEdit }) {
  return (
    <DialogForm saveLabel={isEdit ? 'Enregistrer' : 'Créer la catégorie'} defaultValues={isEdit ? undefined : { couleur: '#1971C2' }}>
      <FormSection title="Catégorie" description="La couleur sert de bandeau sur le badge des participants de cette catégorie.">
        <Field w="half">
          <TextInput source="nom" label="Nom" validate={required()} fullWidth />
        </Field>
        <Field w="half">
          <ColorInput source="couleur" label="Couleur" />
        </Field>
        <Field w="full">
          <TextInput source="description" label="Description" fullWidth multiline minRows={2} />
        </Field>
      </FormSection>
    </DialogForm>
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

      <GroupActionsProvider eventId={eventId}>
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
          <CategorieShortcuts eventId={eventId} label="Participants" />
          <DeleteCategorieButton eventId={eventId} onDeleted={refresh} />
        </Datagrid>
      </ListBase>
      </GroupActionsProvider>

      <FormDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.mode === 'create' ? 'Créer une catégorie' : 'Modifier la catégorie'}
        maxWidth="sm"
      >
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
              <CategorieForm isEdit={false} />
            </CreateBase>
          )}
          {dialog?.mode === 'edit' && (
            <EditBase
              resource="categories"
              id={dialog.id}
              queryOptions={{ meta: { eventId } }}
              mutationMode="pessimistic"
              mutationOptions={{
                meta: { eventId },
                onSuccess: () => {
                  notify('Catégorie modifiée.', { type: 'success' });
                  refresh();
                  setDialog(null);
                },
              }}
            >
              <CategorieForm isEdit />
            </EditBase>
          )}
      </FormDialog>
    </Box>
  );
}
