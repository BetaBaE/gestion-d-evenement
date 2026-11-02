import { useState } from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
  SelectInput,
  DateTimeInput,
  NumberInput,
  EditButton,
  ShowButton,
  required,
  useRecordContext,
  useNotify,
  useRefresh,
  Link,
} from 'react-admin';
import { Button, Box, Typography, Divider, MenuItem, FormControl, InputLabel, Select } from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import ArticleIcon from '@mui/icons-material/Article';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import { ImageUploader } from '../components/ImageUploader.jsx';
import {
  adminImageUrl,
  uploadBadgeBanniere,
  deleteBadgeBanniere,
  uploadBadgeLogoEvenement,
  deleteBadgeLogoEvenement,
  badgePreviewUrl,
  badgePreviewHtmlUrl,
} from '../../api/imageApi.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { axiosClient } from '../../api/axiosClient.js';

const statutChoices = [
  { id: 'BROUILLON', name: 'Brouillon' },
  { id: 'PUBLIE', name: 'Publié' },
  { id: 'CLOTURE', name: 'Clôturé' },
  { id: 'ARCHIVE', name: 'Archivé' },
];

const formatChoices = [
  { id: 'A4_PLIE_4', name: 'A4 plié en 4 (badge + infos + partenaires)' },
  { id: 'A6', name: 'A6 (badge seul)' },
  { id: 'CARTE', name: 'Carte (taille personnalisée)' },
];

const BADGE_TEMPLATES = [
  { id: 'SALON_A4_PLIE_4', name: 'Salon A4 plié en 4' },
  { id: 'BADGE_SIMPLE_A6', name: 'Badge simple A6' },
  { id: 'CARTE_COMPACTE', name: 'Carte compacte' },
];

export function EventList() {
  return (
    <List>
      <Datagrid rowClick="show">
        <TextField source="titre" label="Titre" />
        <TextField source="ville" label="Ville" />
        <DateField source="dateDebut" label="Date de début" showTime />
        <DateField source="dateFin" label="Date de fin" showTime />
        <TextField source="statut" label="Statut" />
        <ShowButton label="Gérer" />
        <EditButton />
      </Datagrid>
    </List>
  );
}

function BadgeTemplatePicker() {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [templateKey, setTemplateKey] = useState('SALON_A4_PLIE_4');
  const [isApplying, setIsApplying] = useState(false);

  if (!record) return null;
  const organisateurId = getSelectedOrganisateurId();

  async function handleApply() {
    setIsApplying(true);
    try {
      await axiosClient.post(
        `/admin/organisateurs/${organisateurId}/events/${record.id}/badge-template`,
        { templateKey },
      );
      notify('Modèle de badge appliqué.', { type: 'success' });
      refresh();
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'application du modèle.", { type: 'error' });
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 240 }}>
        <InputLabel>Modèle de badge</InputLabel>
        <Select value={templateKey} label="Modèle de badge" onChange={(e) => setTemplateKey(e.target.value)}>
          {BADGE_TEMPLATES.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button variant="contained" onClick={handleApply} disabled={isApplying}>
        Appliquer le modèle
      </Button>
      <Button
        component={Link}
        to={`/admin/events/${record.id}/badge-builder`}
        variant="outlined"
        startIcon={<DashboardCustomizeIcon />}
      >
        Modifier le badge
      </Button>
    </Box>
  );
}

function BadgeImagesField() {
  const record = useRecordContext();
  if (!record) return null;

  const organisateurId = getSelectedOrganisateurId();
  const enteteBlock = ['P1', 'P2', 'P3', 'P4']
    .flatMap((key) => record.badgeConfig?.panneaux?.[key]?.blocs || [])
    .find((b) => b.type === 'enteteEvenement');

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Badge — images de l'en-tête
      </Typography>
      {!enteteBlock && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Appliquez d'abord un modèle de badge ci-dessus pour pouvoir y ajouter des images.
        </Typography>
      )}
      {enteteBlock && (
        <>
          <ImageUploader
            label="Logo de l'événement (en-tête du badge)"
            imageUrl={enteteBlock.props?.logoImageId ? adminImageUrl(enteteBlock.props.logoImageId) : null}
            onUpload={(file) => uploadBadgeLogoEvenement(organisateurId, record.id, file)}
            onDelete={() => deleteBadgeLogoEvenement(organisateurId, record.id)}
          />
          <ImageUploader
            label="Bannière d'en-tête (mode image, remplace l'en-tête généré)"
            imageUrl={enteteBlock.props?.banniereImageId ? adminImageUrl(enteteBlock.props.banniereImageId) : null}
            onUpload={(file) => uploadBadgeBanniere(organisateurId, record.id, file)}
            onDelete={() => deleteBadgeBanniere(organisateurId, record.id)}
          />
        </>
      )}
      <Button
        variant="outlined"
        size="small"
        startIcon={<PreviewIcon />}
        onClick={() => window.open(badgePreviewUrl(organisateurId, record.id), '_blank')}
        sx={{ mr: 1 }}
      >
        Aperçu PDF
      </Button>
      <Button
        variant="outlined"
        size="small"
        startIcon={<ArticleIcon />}
        onClick={() => window.open(badgePreviewHtmlUrl(organisateurId, record.id), '_blank')}
      >
        Aperçu HTML
      </Button>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
}

function EventForm({ isEdit }) {
  return (
    <SimpleForm>
      {isEdit && (
        <>
          <BadgeTemplatePicker />
          <BadgeImagesField />
        </>
      )}
      <TextInput source="titre" label="Titre" validate={required()} fullWidth />
      <TextInput source="description" label="Description" multiline fullWidth />
      <TextInput source="lieu" label="Lieu" />
      <TextInput source="adresse" label="Adresse" fullWidth />
      <TextInput source="ville" label="Ville" />
      <DateTimeInput source="dateDebut" label="Date de début" validate={required()} />
      <DateTimeInput source="dateFin" label="Date de fin" validate={required()} />
      <DateTimeInput source="dateLimiteInscription" label="Date limite d'inscription" />
      <BooleanInput source="inscriptionOuverte" label="Inscription ouverte" />
      <SelectInput source="statut" label="Statut" choices={statutChoices} />
      <NumberInput source="capaciteMax" label="Capacité maximale" />
      <TextInput source="banniereUrl" label="URL de la bannière" fullWidth />
      <NumberInput source="antiDoublonMinutes" label="Anti-doublon (minutes)" />
      <BooleanInput source="photoObligatoire" label="Photo obligatoire à l'inscription" />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Badge — format
      </Typography>
      <SelectInput source="badgeConfig.format" label="Format du badge" choices={formatChoices} />
      <NumberInput source="badgeConfig.carteLargeurMm" label="Largeur (mm, format Carte)" />
      <NumberInput source="badgeConfig.carteHauteurMm" label="Hauteur (mm, format Carte)" />
      <BooleanInput source="badgeConfig.rotationLigneBas180" label="Pivoter la ligne du bas à 180°" />
      <BooleanInput source="badgeConfig.traitsDePliage" label="Afficher les traits de pliage" />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Badge — thème
      </Typography>
      <TextInput source="badgeConfig.theme.couleurPrincipale" label="Couleur principale (hex)" placeholder="#1971c2" />
      <TextInput source="badgeConfig.theme.couleurSecondaire" label="Couleur secondaire (hex)" placeholder="#dceefe" />
      <TextInput source="badgeConfig.theme.couleurAccent" label="Couleur accent (hex)" placeholder="#e3a72f" />
      <TextInput source="badgeConfig.theme.couleurTexte" label="Couleur texte (hex)" placeholder="#1f2a1f" />
      <BooleanInput source="badgeConfig.theme.degradeEntete" label="Dégradé dans l'en-tête" />
    </SimpleForm>
  );
}

export function EventEdit() {
  return (
    <Edit>
      <EventForm isEdit />
    </Edit>
  );
}

export function EventCreate() {
  return (
    <Create>
      <EventForm isEdit={false} />
    </Create>
  );
}
