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
} from 'react-admin';

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

function EventForm() {
  return (
    <SimpleForm>
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
      <NumberInput source="badgeConfig.largeurMm" label="Largeur du badge (mm)" />
      <NumberInput source="badgeConfig.hauteurMm" label="Hauteur du badge (mm)" />
      <SelectInput source="badgeConfig.orientation" label="Orientation du badge" choices={orientationChoices} />
      <BooleanInput source="badgeConfig.afficherLogo" label="Afficher le logo" />
      <BooleanInput source="badgeConfig.afficherOrganisme" label="Afficher l'organisme" />
      <BooleanInput source="badgeConfig.afficherFonction" label="Afficher la fonction" />
    </SimpleForm>
  );
}

export function EventEdit() {
  return (
    <Edit>
      <EventForm />
    </Edit>
  );
}

export function EventCreate() {
  return (
    <Create>
      <EventForm />
    </Create>
  );
}
