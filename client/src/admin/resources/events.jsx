import { useEffect, useState } from 'react';
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
} from 'react-admin';
import {
  Button,
  Box,
  Typography,
  Divider,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  ListSubheader,
} from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import ArticleIcon from '@mui/icons-material/Article';
import { badgePreviewUrl, badgePreviewHtmlUrl } from '../../api/imageApi.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { axiosClient } from '../../api/axiosClient.js';

const statutChoices = [
  { id: 'BROUILLON', name: 'Brouillon' },
  { id: 'PUBLIE', name: 'Publié' },
  { id: 'CLOTURE', name: 'Clôturé' },
  { id: 'ARCHIVE', name: 'Archivé' },
];

const FORMAT_LABELS = {
  A4_PLIE_4: 'A4 plié en 4',
  A6: 'A6',
  CARTE: 'Carte',
};

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

function eventBasePath(eventId) {
  return `/admin/organisateurs/${getSelectedOrganisateurId()}/events/${eventId}`;
}

/**
 * Applies a template to this event's badge: either a built-in starter or
 * one of the organisateur's own ModeleBadge templates. Applying copies the
 * template into the event (it is not a live link to the template).
 */
function BadgeSection() {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [templates, setTemplates] = useState({ starters: [], modeles: [] });
  const [choice, setChoice] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!record) return;
    axiosClient
      .get(`${eventBasePath(record.id)}/badge-templates`)
      .then(({ data }) => {
        setTemplates(data);
        if (data.starters.length > 0) setChoice(`starter:${data.starters[0].key}`);
      })
      .catch(() => notify('Impossible de charger les modèles de badge.', { type: 'error' }));
  }, [record?.id]);

  if (!record) return null;
  const organisateurId = getSelectedOrganisateurId();

  async function handleApply() {
    const [kind, value] = choice.split(':');
    setIsApplying(true);
    try {
      await axiosClient.post(
        `${eventBasePath(record.id)}/badge-template`,
        kind === 'starter' ? { starterKey: value } : { modeleId: value },
      );
      notify('Modèle de badge appliqué.', { type: 'success' });
      refresh();
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'application du modèle.", { type: 'error' });
    } finally {
      setIsApplying(false);
    }
  }

  const badge = record.badge || {};

  return (
    <Box sx={{ mb: 2, width: '100%' }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Badge
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Format actuel : {FORMAT_LABELS[badge.format] || '—'} · {badge.elements?.length || 0} élément(s) · version{' '}
        {badge.version || 1}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>Modèle de badge</InputLabel>
          <Select value={choice} label="Modèle de badge" onChange={(e) => setChoice(e.target.value)}>
            <ListSubheader>Modèles de départ</ListSubheader>
            {templates.starters.map((t) => (
              <MenuItem key={t.key} value={`starter:${t.key}`}>
                {t.nom}
              </MenuItem>
            ))}
            {templates.modeles.length > 0 && <ListSubheader>Modèles de l'organisateur</ListSubheader>}
            {templates.modeles.map((m) => (
              <MenuItem key={m._id} value={`modele:${m._id}`}>
                {m.nom}
                {m.parDefaut ? ' (par défaut)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={handleApply} disabled={isApplying || !choice}>
          Appliquer le modèle
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Appliquer un modèle remplace le badge actuel de cet événement. L'éditeur visuel arrive dans une prochaine
        étape.
      </Typography>

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
      {isEdit && <BadgeSection />}
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

      {isEdit && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Badge — pliage
          </Typography>
          <BooleanInput source="badge.rotationLigneBas180" label="Pivoter la ligne du bas à 180°" />
          <BooleanInput source="badge.traitsDePliage" label="Afficher les traits de pliage" />

          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Badge — couleurs
          </Typography>
          <TextInput source="badge.theme.couleurPrincipale" label="Couleur principale (hex)" placeholder="#1971c2" />
          <TextInput source="badge.theme.couleurSecondaire" label="Couleur secondaire (hex)" placeholder="#dceefe" />
          <TextInput source="badge.theme.couleurAccent" label="Couleur accent (hex)" placeholder="#e3a72f" />
          <TextInput source="badge.theme.couleurTexte" label="Couleur texte (hex)" placeholder="#1f2a1f" />
        </>
      )}
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
