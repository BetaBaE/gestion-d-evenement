import { useEffect, useMemo, useState } from 'react';
import { Title, useNotify, TextInput, BooleanInput, required } from 'react-admin';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { axiosClient } from '../../api/axiosClient.js';
import { createPartenaire, updatePartenaire, getImageUrl } from '../../api/imageApi.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { FormPage, FormSection, Field, FormDialog, DialogForm, ImageField, UrlInput } from '../../components/form/index.js';

/** Logo picked before the partner exists: kept locally and sent with the creation. */
function useLocalPreview(file) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  return url;
}

function PartenaireDialog({ dialog, onClose, onSaved }) {
  const notify = useNotify();
  const organisateurId = getSelectedOrganisateurId();
  const partenaire = dialog?.partenaire;
  const isEdit = !!partenaire;
  const [file, setFile] = useState(null);
  const [logoImageId, setLogoImageId] = useState(partenaire?.logoImageId);
  const localPreview = useLocalPreview(file);

  useEffect(() => {
    setFile(null);
    setLogoImageId(partenaire?.logoImageId);
  }, [partenaire]);

  async function handleSubmit(values) {
    if (!isEdit && !file) {
      notify('Ajoutez le logo du partenaire.', { type: 'error' });
      return;
    }
    const data = { nom: values.nom, siteWeb: values.siteWeb || '', actif: !!values.actif };
    try {
      if (isEdit) await updatePartenaire(organisateurId, partenaire.id, data);
      else await createPartenaire(organisateurId, data, file);
      notify(isEdit ? 'Partenaire enregistré.' : 'Partenaire ajouté.', { type: 'success' });
      onSaved();
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'enregistrement du partenaire.", { type: 'error' });
    }
  }

  return (
    <FormDialog
      open={!!dialog}
      onClose={onClose}
      title={isEdit ? partenaire.nom : 'Ajouter un partenaire'}
      subtitle="Logo réutilisable dans les badges de tous les événements de l'organisateur."
      maxWidth="sm"
    >
      {dialog && (
        <DialogForm
          record={isEdit ? partenaire : undefined}
          defaultValues={isEdit ? undefined : { actif: true }}
          saveLabel={isEdit ? 'Enregistrer' : 'Ajouter le partenaire'}
          onSubmit={handleSubmit}
        >
          <FormSection title="Identité">
            <Field w="full">
              <ImageField
                label="Logo"
                variant="logo"
                helperText={isEdit ? undefined : 'Obligatoire · JPEG, PNG ou WebP · 5 Mo maximum'}
                imageUrl={isEdit ? getImageUrl(logoImageId) : localPreview}
                onUpload={async (newFile, options) => {
                  if (!isEdit) {
                    setFile(newFile);
                    return;
                  }
                  const updated = await updatePartenaire(organisateurId, partenaire.id, {}, newFile, options);
                  setLogoImageId(updated?.logoImageId || logoImageId);
                  onSaved({ keepOpen: true });
                }}
                onDelete={isEdit ? undefined : async () => setFile(null)}
              />
            </Field>
            <Field w="half">
              <TextInput source="nom" label="Nom" validate={required()} fullWidth />
            </Field>
            <Field w="half">
              <UrlInput source="siteWeb" label="Site web" />
            </Field>
            <Field w="half">
              <BooleanInput source="actif" label="Actif" helperText="Seuls les partenaires actifs sont proposés dans l'éditeur de badge." />
            </Field>
          </FormSection>
        </DialogForm>
      )}
    </FormDialog>
  );
}

export function PartenairesPage() {
  const notify = useNotify();
  const organisateurId = getSelectedOrganisateurId();
  const [partenaires, setPartenaires] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState(null);

  function load() {
    setIsLoading(true);
    return axiosClient
      .get(`/admin/organisateurs/${organisateurId}/partenaires`, { params: { limit: 100 } })
      .then(({ data }) => {
        const items = data.items.map((p) => ({ ...p, id: p._id }));
        setPartenaires(items);
        return items;
      })
      .catch(() => notify('Impossible de charger les partenaires.', { type: 'error' }))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(event, p) {
    event.stopPropagation();
    if (!window.confirm(`Supprimer le partenaire « ${p.nom} » ?`)) return;
    try {
      await axiosClient.delete(`/admin/organisateurs/${organisateurId}/partenaires/${p.id}`);
      notify('Partenaire supprimé.', { type: 'success' });
      load();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur lors de la suppression.', { type: 'error' });
    }
  }

  return (
    <>
      <Title title="Partenaires" />
      <FormPage
        title="Partenaires"
        subtitle="Logos réutilisables pour tous les événements de cet organisateur, dans l'éditeur de badge."
        breadcrumbs={[{ label: 'Partenaires' }]}
      >
        <FormSection
          title="Bibliothèque de partenaires"
          description="Cliquez sur un partenaire pour le modifier."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({})}>
              Ajouter un partenaire
            </Button>
          }
        >
          <Field w="full">
            {isLoading && partenaires.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : partenaires.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                Aucun partenaire pour le moment.
              </Typography>
            ) : (
              <List dense disablePadding>
                {partenaires.map((p) => (
                  <ListItemButton key={p.id} onClick={() => setDialog({ partenaire: p })} sx={{ borderRadius: 1 }}>
                    <ListItemAvatar>
                      <Avatar
                        variant="rounded"
                        src={getImageUrl(p.logoImageId, { v: p.updatedAt })}
                        alt=""
                        sx={{ bgcolor: '#fff', '& img': { objectFit: 'contain' } }}
                      />
                    </ListItemAvatar>
                    <ListItemText primary={p.nom} secondary={p.siteWeb || null} />
                    <Chip size="small" label={p.actif ? 'Actif' : 'Inactif'} color={p.actif ? 'success' : 'default'} sx={{ mr: 1 }} />
                    <IconButton edge="end" color="error" aria-label="Supprimer" onClick={(e) => handleDelete(e, p)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemButton>
                ))}
              </List>
            )}
          </Field>
        </FormSection>
      </FormPage>

      <PartenaireDialog
        dialog={dialog}
        onClose={() => setDialog(null)}
        onSaved={({ keepOpen } = {}) => {
          load();
          if (!keepOpen) setDialog(null);
        }}
      />
    </>
  );
}
