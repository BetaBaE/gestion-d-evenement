import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Title, useNotify } from 'react-admin';
import { Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StarIcon from '@mui/icons-material/Star';
import ArchiveIcon from '@mui/icons-material/Archive';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import { ImportDesignDialog } from './ImportDesignDialog.jsx';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { FormPage, FormSection, Field } from '../../components/form/index.js';
import { NewTemplateDialog } from './NewTemplateDialog.jsx';
import { StarterGallery } from './StarterGallery.jsx';
import { formatLabel } from './BadgeFormatFields.jsx';

function basePath() {
  return `/admin/organisateurs/${getSelectedOrganisateurId()}/modeles-badge`;
}

/** The organisateur's badge templates: create, edit, duplicate, set default, archive. */
export function ModelesBadgePage() {
  const notify = useNotify();
  const navigate = useNavigate();
  const [modeles, setModeles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState(null);

  const load = useCallback(() => {
    setIsLoading(true);
    return axiosClient
      .get(basePath(), { params: { limit: 100 } })
      .then(({ data }) => setModeles(data.items))
      .catch(() => notify('Impossible de charger les modèles.', { type: 'error' }))
      .finally(() => setIsLoading(false));
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const openEditor = (id, query = '') => navigate(`/admin/modeles-badge/${id}/editeur${query}`);
  const [designOpen, setDesignOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  /** .badge.json exported from this app (any organisateur): exact copy. */
  async function importTemplateFile(file) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      notify('Fichier trop volumineux (20 Mo maximum).', { type: 'error' });
      return;
    }
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axiosClient.post(`${basePath()}/importer`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { partenairesCrees, partenairesReutilises, renomme, variablesInconnues = [] } = data.resume;
      const partenaires =
        partenairesCrees + partenairesReutilises > 0
          ? ` ${partenairesCrees} partenaire(s) créé(s), ${partenairesReutilises} réutilisé(s).`
          : '';
      const inconnues = variablesInconnues.length
        ? ` Variable(s) inconnue(s) à corriger dans l'éditeur avant utilisation : ${variablesInconnues.map((k) => `{{${k}}}`).join(', ')}.`
        : '';
      notify(`Modèle « ${data.modele.nom} » importé${renomme ? ' (renommé, un modèle porte déjà ce nom)' : ''}.${partenaires}${inconnues}`, {
        type: inconnues ? 'warning' : 'success',
        autoHideDuration: inconnues ? 15000 : 8000,
      });
      load();
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'import.", { type: 'error', autoHideDuration: 10000 });
    } finally {
      setImporting(false);
    }
  }

  async function action(promise, message) {
    try {
      await promise;
      notify(message, { type: 'success' });
      load();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur.', { type: 'error' });
    }
  }

  return (
    <>
      <Title title="Modèles de badge" />
      <FormPage
        title="Modèles de badge"
        subtitle="Modèles réutilisables pour les événements de cet organisateur. Un modèle peut être enregistré incomplet, mais il ne peut être appliqué à un événement qu'une fois le nom et le QR code ajoutés."
        breadcrumbs={[{ label: 'Modèles de badge' }]}
      >
        <FormSection
          title="Modèles de départ"
          description="Quatre modèles prêts à l'emploi. « Utiliser » crée une copie modifiable dans la bibliothèque."
        >
          <Field w="full">
            <StarterGallery
              renderActions={(s) => (
                <Button size="small" startIcon={<AddIcon />} onClick={() => setDialog({ initial: { depart: 'STARTER', starterKey: s.key, nom: s.label, description: s.description } })}>
                  Utiliser ce modèle
                </Button>
              )}
            />
          </Field>
        </FormSection>

        <FormSection
          title="Bibliothèque"
          action={
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end', rowGap: 1 }}>
              <Button component="label" startIcon={<FileUploadIcon />} disabled={importing}>
                Importer un modèle
                <input
                  type="file"
                  hidden
                  accept=".json,application/json"
                  onChange={(e) => {
                    importTemplateFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </Button>
              <Button startIcon={<WallpaperIcon />} onClick={() => setDesignOpen(true)}>
                Importer un design (PDF, PNG, JPG)
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({})}>
                Nouveau modèle
              </Button>
            </Stack>
          }
        >
          <Field w="full">
            {isLoading && modeles.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : modeles.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                Aucun modèle pour le moment. Créez-en un depuis une page vierge ou un modèle de départ.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {modeles.map((m) => (
                  <Grid key={m._id} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flex: 1, cursor: 'pointer' }} onClick={() => openEditor(m._id)}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }} noWrap title={m.nom}>
                            {m.nom}
                          </Typography>
                          {m.parDefaut && <Chip size="small" color="primary" icon={<StarIcon />} label="Par défaut" />}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {formatLabel(m)}
                          {m.format === 'A4_PLIE_4' && m.panneauxActifs?.length ? ` · ${m.panneauxActifs.join(', ')}` : ''}
                        </Typography>
                        {m.description && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {m.description}
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions sx={{ flexWrap: 'wrap' }}>
                        <Button size="small" startIcon={<EditIcon />} onClick={() => openEditor(m._id)}>
                          Modifier
                        </Button>
                        <Button
                          size="small"
                          startIcon={<ContentCopyIcon />}
                          onClick={() => setDialog({ initial: { depart: 'DUPLIQUER', sourceModeleId: m._id, nom: `${m.nom} (copie)`, description: m.description } })}
                        >
                          Dupliquer
                        </Button>
                        <Button size="small" startIcon={<FileDownloadIcon />} component="a" href={`${axiosClient.defaults.baseURL}${basePath()}/${m._id}/exporter`} download>
                          Exporter
                        </Button>
                        {!m.parDefaut && (
                          <Button size="small" startIcon={<StarIcon />} onClick={() => action(axiosClient.post(`${basePath()}/${m._id}/defaut`), 'Modèle par défaut défini.')}>
                            Par défaut
                          </Button>
                        )}
                        <Button
                          size="small"
                          color="error"
                          startIcon={<ArchiveIcon />}
                          onClick={() => {
                            if (window.confirm(`Archiver le modèle « ${m.nom} » ? Les événements qui l'utilisent gardent leur badge.`)) {
                              action(axiosClient.delete(`${basePath()}/${m._id}`), 'Modèle archivé.');
                            }
                          }}
                        >
                          Archiver
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Field>
        </FormSection>
      </FormPage>

      <ImportDesignDialog
        open={designOpen}
        onClose={() => setDesignOpen(false)}
        onCreated={(modele) => {
          setDesignOpen(false);
          openEditor(modele._id, '?astuce=design');
        }}
      />

      <NewTemplateDialog
        open={!!dialog}
        modeles={modeles}
        initial={dialog?.initial}
        onClose={() => setDialog(null)}
        onCreated={(modele) => {
          setDialog(null);
          openEditor(modele._id);
        }}
      />
    </>
  );
}
