import { useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Edit,
  Create,
  Form,
  TextInput,
  BooleanInput,
  SelectInput,
  DateTimeInput,
  NumberInput,
  EditButton,
  required,
  minValue,
  useRecordContext,
  useNotify,
  useRefresh,
  useGetList,
} from 'react-admin';
import { Button, Chip, ListSubheader, MenuItem, Paper, Stack, Tab, Tabs, TextField as MuiTextField } from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import ArticleIcon from '@mui/icons-material/Article';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import { badgePreviewUrl, badgePreviewHtmlUrl } from '../../api/imageApi.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { axiosClient } from '../../api/axiosClient.js';
import { FormPage, FormSection, Field, ColorInput, FormActions, StickyActionBar } from '../../components/form/index.js';
import { CategoriesPanel } from './categories.jsx';
import { OrganismesPanel } from './organismes.jsx';
import { ParticipantsPanel } from './participants.jsx';
import { DashboardPanel } from './DashboardPanel.jsx';
import { ScanPanel } from './EventShow.jsx';

const statutChoices = [
  { id: 'BROUILLON', name: 'Brouillon' },
  { id: 'PUBLIE', name: 'Publié' },
  { id: 'CLOTURE', name: 'Clôturé' },
  { id: 'ARCHIVE', name: 'Archivé' },
];

const STATUT_COLORS = { BROUILLON: 'default', PUBLIE: 'success', CLOTURE: 'warning', ARCHIVE: 'default' };
const FORMAT_LABELS = { A4_PLIE_4: 'A4 plié en 4', A6: 'A6', CARTE: 'Carte' };

export function EventList() {
  return (
    <List>
      <Datagrid rowClick="edit">
        <TextField source="titre" label="Titre" />
        <TextField source="ville" label="Ville" />
        <DateField source="dateDebut" label="Date de début" showTime />
        <DateField source="dateFin" label="Date de fin" showTime />
        <TextField source="statut" label="Statut" />
        <EditButton label="Gérer" />
      </Datagrid>
    </List>
  );
}

function eventBasePath(eventId) {
  return `/admin/organisateurs/${getSelectedOrganisateurId()}/events/${eventId}`;
}

// ---- Validation (input-level: react-admin can't mix form- and input-level) ----
const finApresDebut = (value, all) =>
  value && all?.dateDebut && new Date(value) < new Date(all.dateDebut) ? 'La fin doit être après le début.' : undefined;
const limiteAvantDebut = (value, all) =>
  value && all?.dateDebut && new Date(value) > new Date(all.dateDebut)
    ? "La limite d'inscription doit précéder le début de l'événement."
    : undefined;

/** Picking a start date pre-fills an empty end date with the same value. */
function DefaultEndDate() {
  const dateDebut = useWatch({ name: 'dateDebut' });
  const { getValues, setValue } = useFormContext();
  useEffect(() => {
    if (dateDebut && !getValues('dateFin')) {
      setValue('dateFin', dateDebut, { shouldDirty: true, shouldValidate: true });
    }
  }, [dateDebut]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function InformationsSections() {
  return (
    <>
      <DefaultEndDate />
      <FormSection title="Informations générales" description="Visibles sur le formulaire d'inscription et dans les emails.">
        <Field w="full">
          <TextInput source="titre" label="Titre" validate={required()} fullWidth />
        </Field>
        <Field w="full">
          <TextInput source="description" label="Description" multiline minRows={3} fullWidth />
        </Field>
      </FormSection>

      <FormSection title="Lieu">
        <Field w="half">
          <TextInput source="lieu" label="Lieu" placeholder="Palais des Congrès" fullWidth />
        </Field>
        <Field w="half">
          <TextInput source="ville" label="Ville" fullWidth />
        </Field>
        <Field w="full">
          <TextInput source="adresse" label="Adresse" fullWidth />
        </Field>
      </FormSection>

      <FormSection title="Dates" description="La date de fin est préremplie avec la date de début.">
        <Field w="third">
          <DateTimeInput source="dateDebut" label="Début" validate={required()} fullWidth />
        </Field>
        <Field w="third">
          <DateTimeInput source="dateFin" label="Fin" validate={[required(), finApresDebut]} fullWidth />
        </Field>
        <Field w="third">
          <DateTimeInput source="dateLimiteInscription" label="Limite d'inscription" validate={limiteAvantDebut} fullWidth />
        </Field>
      </FormSection>

      <FormSection title="Inscriptions">
        <Field w="third">
          <SelectInput source="statut" label="Statut" choices={statutChoices} defaultValue="BROUILLON" fullWidth />
        </Field>
        <Field w="third">
          <NumberInput source="capaciteMax" label="Capacité maximale" min={1} validate={minValue(1, 'Au moins 1.')} fullWidth />
        </Field>
        <Field w="third">
          <Stack>
            <BooleanInput source="inscriptionOuverte" label="Inscription ouverte" defaultValue helperText={false} />
            <BooleanInput source="photoObligatoire" label="Photo obligatoire" helperText={false} />
          </Stack>
        </Field>
      </FormSection>

      <FormSection title="Scan" description="Délai pendant lequel un second scan du même badge est signalé comme doublon.">
        <Field w="third">
          <NumberInput source="antiDoublonMinutes" label="Anti-doublon (minutes)" min={1} defaultValue={2} validate={minValue(1, 'Au moins 1.')} fullWidth />
        </Field>
      </FormSection>
    </>
  );
}

// ---- Badge tab ----
function BadgeTemplateSection() {
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
  }, [record?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!record) return null;
  const organisateurId = getSelectedOrganisateurId();
  const badge = record.badge || {};

  async function handleApply() {
    if (!window.confirm('Appliquer ce modèle remplace le badge actuel de cet événement. Continuer ?')) return;
    const [kind, value] = choice.split(':');
    setIsApplying(true);
    try {
      await axiosClient.post(`${eventBasePath(record.id)}/badge-template`, kind === 'starter' ? { starterKey: value } : { modeleId: value });
      notify('Modèle de badge appliqué.', { type: 'success' });
      refresh();
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'application du modèle.", { type: 'error' });
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <FormSection
      title="Badge"
      description={`Format ${FORMAT_LABELS[badge.format] || '—'} · ${badge.elements?.length || 0} élément(s) · version ${badge.version || 1}`}
      action={
        <Button variant="contained" startIcon={<DesignServicesIcon />} component={RouterLink} to={`/admin/badge-editor/${record.id}`}>
          Ouvrir l'éditeur
        </Button>
      }
    >
      <Field w="half">
        <MuiTextField select fullWidth size="small" label="Modèle de badge" value={choice} onChange={(e) => setChoice(e.target.value)}>
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
        </MuiTextField>
      </Field>
      <Field w="half">
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" onClick={handleApply} disabled={isApplying || !choice}>
            Appliquer le modèle
          </Button>
          {/* Real links: window.open() is blocked or turned into same-tab navigation by popup blockers. */}
          <Button startIcon={<PreviewIcon />} component="a" href={badgePreviewUrl(organisateurId, record.id)} target="_blank" rel="noopener">
            Aperçu PDF
          </Button>
          <Button startIcon={<ArticleIcon />} component="a" href={badgePreviewHtmlUrl(organisateurId, record.id)} target="_blank" rel="noopener">
            Aperçu HTML
          </Button>
        </Stack>
      </Field>
    </FormSection>
  );
}

function BadgeSettingsForm() {
  return (
    <Form mode="onBlur" reValidateMode="onChange">
      <Stack spacing={2}>
        <FormSection title="Pliage" description="Pour le format A4 plié en 4.">
          <Field w="half">
            <BooleanInput source="badge.traitsDePliage" label="Afficher les traits de pliage" helperText={false} />
          </Field>
          <Field w="half">
            <BooleanInput
              source="badge.rotationLigneBas180"
              label="Pivoter la ligne du bas à 180°"
              helperText="Pour que P2 et P4 se lisent à l'endroit une fois plié."
            />
          </Field>
        </FormSection>
        <FormSection title="Couleurs du thème" description="Recolorent tous les éléments du badge qui utilisent ces couleurs.">
          <Field w="quarter">
            <ColorInput source="badge.theme.couleurPrincipale" label="Principale" />
          </Field>
          <Field w="quarter">
            <ColorInput source="badge.theme.couleurSecondaire" label="Secondaire" />
          </Field>
          <Field w="quarter">
            <ColorInput source="badge.theme.couleurAccent" label="Accent" />
          </Field>
          <Field w="quarter">
            <ColorInput source="badge.theme.couleurTexte" label="Texte" />
          </Field>
        </FormSection>
      </Stack>
      <StickyActionBar>
        <FormActions />
      </StickyActionBar>
    </Form>
  );
}

// ---- Tabbed event page ----
const TABS = [
  { key: 'informations', label: 'Informations' },
  { key: 'categories', label: 'Catégories' },
  { key: 'organismes', label: 'Organismes invités' },
  { key: 'participants', label: 'Participants' },
  { key: 'badge', label: 'Badge' },
  { key: 'scan', label: 'Scan' },
  { key: 'statistiques', label: 'Statistiques' },
];

function EventTitle() {
  return <span>{useRecordContext()?.titre || 'Événement'}</span>;
}

function EventTabs() {
  const record = useRecordContext();
  const refresh = useRefresh();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('onglet')) ? params.get('onglet') : 'informations';
  const eventId = record?.id;

  // Shared, cache-aware lists (refetched when edited in their own tabs).
  const { data: categories = [] } = useGetList(
    'categories',
    { pagination: { page: 1, perPage: 100 }, sort: { field: 'nom', order: 'ASC' }, meta: { eventId } },
    { enabled: !!eventId },
  );
  const { data: organismes = [] } = useGetList(
    'organismes',
    { pagination: { page: 1, perPage: 100 }, sort: { field: 'nom', order: 'ASC' }, meta: { eventId } },
    { enabled: !!eventId },
  );

  if (!record) return null;

  return (
    <FormPage
      title={
        <Stack direction="row" spacing={1.5} component="span" sx={{ alignItems: 'center' }}>
          <span>{record.titre}</span>
          <Chip size="small" label={statutChoices.find((s) => s.id === record.statut)?.name || record.statut} color={STATUT_COLORS[record.statut]} />
        </Stack>
      }
      breadcrumbs={[{ label: 'Événements', to: '/admin/events' }, { label: record.titre }]}
      maxWidth={1200}
    >
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_e, value) => setParams(value === 'informations' ? {} : { onglet: value }, { replace: true })}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map((t) => (
            <Tab key={t.key} value={t.key} label={t.label} />
          ))}
        </Tabs>
      </Paper>

      {tab === 'informations' && (
        <Form mode="onBlur" reValidateMode="onChange">
          <Stack spacing={2}>
            <InformationsSections />
          </Stack>
          <StickyActionBar>
            <FormActions />
          </StickyActionBar>
        </Form>
      )}
      {tab === 'categories' && <CategoriesPanel eventId={eventId} />}
      {tab === 'organismes' && <OrganismesPanel eventId={eventId} />}
      {tab === 'participants' && <ParticipantsPanel eventId={eventId} categories={categories} organismes={organismes} />}
      {tab === 'badge' && (
        <Stack spacing={2}>
          <BadgeTemplateSection />
          <BadgeSettingsForm />
        </Stack>
      )}
      {tab === 'scan' && <ScanPanel event={record} onRefresh={refresh} />}
      {tab === 'statistiques' && <DashboardPanel eventId={eventId} />}
    </FormPage>
  );
}

export function EventEdit() {
  return (
    <Edit title={<EventTitle />} actions={false} component="div" mutationMode="pessimistic" redirect={false}>
      <EventTabs />
    </Edit>
  );
}

export function EventCreate() {
  return (
    <Create title="Créer un événement" component="div" redirect="edit">
      <Form mode="onBlur" reValidateMode="onChange">
        <FormPage
          title="Créer un événement"
          subtitle="Les catégories, organismes, participants et le badge se configurent après la création."
          breadcrumbs={[{ label: 'Événements', to: '/admin/events' }, { label: 'Créer' }]}
          actions={<FormActions saveLabel="Créer l'événement" />}
        >
          <InformationsSections />
        </FormPage>
      </Form>
    </Create>
  );
}

