import { useEffect, useState } from 'react';
import { Title, useNotify } from 'react-admin';
import {
  Box,
  Paper,
  TextField,
  Button,
  Stack,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  FormControlLabel,
  Switch,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { axiosClient } from '../../api/axiosClient.js';
import { createPartenaire, adminImageUrl } from '../../api/imageApi.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';

export function PartenairesPage() {
  const notify = useNotify();
  const organisateurId = getSelectedOrganisateurId();
  const [partenaires, setPartenaires] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nom, setNom] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [actif, setActif] = useState(true);
  const [file, setFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  function load() {
    setIsLoading(true);
    axiosClient
      .get(`/admin/organisateurs/${organisateurId}/partenaires`, { params: { limit: 100 } })
      .then(({ data }) => setPartenaires(data.items.map((p) => ({ ...p, id: p._id }))))
      .catch(() => notify('Impossible de charger les partenaires.', { type: 'error' }))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    if (!file) {
      notify('Un logo est requis.', { type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      await createPartenaire(organisateurId, { nom, siteWeb, actif }, file);
      notify('Partenaire ajouté.', { type: 'success' });
      setNom('');
      setSiteWeb('');
      setActif(true);
      setFile(null);
      load();
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'ajout du partenaire.", { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await axiosClient.delete(`/admin/organisateurs/${organisateurId}/partenaires/${id}`);
      notify('Partenaire supprimé.', { type: 'success' });
      load();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur lors de la suppression.', { type: 'error' });
    }
  }

  return (
    <Box p={2}>
      <Title title="Partenaires" />
      <Typography variant="h5" mb={2}>
        Bibliothèque de partenaires
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Les logos ajoutés ici sont réutilisables pour tous les événements de cet organisateur, dans la
        configuration du badge (panneaux "Partenaires").
      </Typography>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Paper sx={{ p: 3, width: 360 }}>
          <Typography variant="subtitle1" mb={2}>
            Ajouter un partenaire
          </Typography>
          <form onSubmit={handleCreate}>
            <Stack spacing={2}>
              <TextField label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} required fullWidth />
              <TextField
                label="Site web (optionnel)"
                value={siteWeb}
                onChange={(e) => setSiteWeb(e.target.value)}
                fullWidth
              />
              <FormControlLabel
                control={<Switch checked={actif} onChange={(e) => setActif(e.target.checked)} />}
                label="Actif"
              />
              <Button component="label" variant="outlined">
                {file ? file.name : 'Choisir un logo'}
                <input
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </Button>
              <Button type="submit" variant="contained" disabled={isSaving}>
                Ajouter
              </Button>
            </Stack>
          </form>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, minWidth: 320 }}>
          <Typography variant="subtitle1" mb={1}>
            Partenaires existants
          </Typography>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List dense>
              {partenaires.map((p) => (
                <ListItem
                  key={p.id}
                  secondaryAction={
                    <IconButton edge="end" color="error" onClick={() => handleDelete(p.id)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar variant="rounded" src={adminImageUrl(p.logoImageId)} alt={p.nom} />
                  </ListItemAvatar>
                  <ListItemText primary={p.nom} secondary={p.actif ? 'Actif' : 'Inactif'} />
                </ListItem>
              ))}
              {partenaires.length === 0 && (
                <Typography variant="body2" color="text.secondary" p={2}>
                  Aucun partenaire pour le moment.
                </Typography>
              )}
            </List>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
