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
} from 'react-admin';
import { Button, Box } from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import { ImageUploader } from '../components/ImageUploader.jsx';
import { adminImageUrl, uploadBadgeBackground, deleteBadgeBackground, badgePreviewUrl } from '../../api/imageApi.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';

const statutChoices = [
  { id: 'BROUILLON', name: 'Brouillon' },
  { id: 'PUBLIE', name: 'Publié' },
  { id: 'CLOTURE', name: 'Clôturé' },
  { id: 'ARCHIVE', name: 'Archivé' },
];

const orientationChoices = [
  { id: 'portrait', name: 'Portrait' },
  { id: 'paysage', name: 'Paysage' },
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

function BadgeBackgroundField() {
  const record = useRecordContext();
  if (!record) return null;

  const organisateurId = getSelectedOrganisateurId();

  return (
    <Box sx={{ mb: 2 }}>
      <ImageUploader
        label="Image de fond du badge"
        imageUrl={record.badgeConfig?.fondImageId ? adminImageUrl(record.badgeConfig.fondImageId) : null}
        onUpload={(file) => uploadBadgeBackground(organisateurId, record.id, file)}
        onDelete={() => deleteBadgeBackground(organisateurId, record.id)}
      />
      <Button
        variant="outlined"
        size="small"
        startIcon={<PreviewIcon />}
        onClick={() => window.open(badgePreviewUrl(organisateurId, record.id), '_blank')}
      >
        Aperçu du badge
      </Button>
    </Box>
  );
}

function EventForm({ isEdit }) {
  return (
    <SimpleForm>
      {isEdit && <BadgeBackgroundField />}
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
      <NumberInput source="badgeConfig.largeurMm" label="Largeur du badge (mm)" />
      <NumberInput source="badgeConfig.hauteurMm" label="Hauteur du badge (mm)" />
      <SelectInput source="badgeConfig.orientation" label="Orientation du badge" choices={orientationChoices} />
      <TextInput source="badgeConfig.couleurPrincipale" label="Couleur principale (hex)" placeholder="#1971c2" />
      <BooleanInput source="badgeConfig.afficherLogoOrganisateur" label="Afficher le logo de l'organisateur" />
      <BooleanInput source="badgeConfig.afficherLogoOrganisme" label="Afficher le logo de l'organisme" />
      <BooleanInput source="badgeConfig.afficherOrganisme" label="Afficher le nom de l'organisme" />
      <BooleanInput source="badgeConfig.afficherFonction" label="Afficher la fonction" />
      <BooleanInput source="badgeConfig.afficherPhoto" label="Afficher la photo" />
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
