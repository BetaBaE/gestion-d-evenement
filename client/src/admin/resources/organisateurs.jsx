import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
  EditButton,
} from 'react-admin';

export function OrganisateurList() {
  return (
    <List>
      <Datagrid rowClick="edit">
        <TextField source="nom" label="Nom" />
        <TextField source="sigle" label="Sigle" />
        <TextField source="ville" label="Ville" />
        <TextField source="email" label="Email" />
        <BooleanField source="actif" label="Actif" />
        <EditButton />
      </Datagrid>
    </List>
  );
}

function OrganisateurForm() {
  return (
    <SimpleForm>
      <TextInput source="nom" label="Nom" required fullWidth />
      <TextInput source="sigle" label="Sigle" />
      <TextInput source="adresse" label="Adresse" fullWidth />
      <TextInput source="ville" label="Ville" />
      <TextInput source="pays" label="Pays" />
      <TextInput source="telephone" label="Téléphone" />
      <TextInput source="fax" label="Fax" />
      <TextInput source="email" label="Email" />
      <TextInput source="siteWeb" label="Site web" />
      <TextInput source="logoUrl" label="URL du logo" fullWidth />
      <BooleanInput source="actif" label="Actif" />
    </SimpleForm>
  );
}

export function OrganisateurEdit() {
  return (
    <Edit>
      <OrganisateurForm />
    </Edit>
  );
}

export function OrganisateurCreate() {
  return (
    <Create>
      <OrganisateurForm />
    </Create>
  );
}
