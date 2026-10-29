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
  SelectInput,
  ReferenceInput,
  EditButton,
  required,
  email,
  minLength,
} from 'react-admin';

const roleChoices = [
  { id: 'SUPER_ADMIN', name: 'Super Admin' },
  { id: 'GESTIONNAIRE', name: 'Gestionnaire' },
];

export function UserList() {
  return (
    <List>
      <Datagrid rowClick="edit">
        <TextField source="nom" label="Nom" />
        <TextField source="prenom" label="Prénom" />
        <TextField source="email" label="Email" />
        <TextField source="role" label="Rôle" />
        <BooleanField source="actif" label="Actif" />
        <EditButton />
      </Datagrid>
    </List>
  );
}

export function UserEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="nom" label="Nom" validate={required()} fullWidth />
        <TextInput source="prenom" label="Prénom" validate={required()} fullWidth />
        <TextInput source="email" label="Email" validate={[required(), email()]} fullWidth />
        <SelectInput source="role" label="Rôle" choices={roleChoices} validate={required()} />
        <ReferenceInput source="organisateurId" reference="organisateurs" label="Organisateur">
          <SelectInput optionText="nom" />
        </ReferenceInput>
        <TextInput source="telephone" label="Téléphone" />
        <BooleanInput source="actif" label="Actif" />
      </SimpleForm>
    </Edit>
  );
}

export function UserCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="nom" label="Nom" validate={required()} fullWidth />
        <TextInput source="prenom" label="Prénom" validate={required()} fullWidth />
        <TextInput source="email" label="Email" validate={[required(), email()]} fullWidth />
        <TextInput
          source="password"
          label="Mot de passe"
          type="password"
          validate={[required(), minLength(8)]}
          fullWidth
        />
        <SelectInput source="role" label="Rôle" choices={roleChoices} validate={required()} />
        <ReferenceInput source="organisateurId" reference="organisateurs" label="Organisateur">
          <SelectInput optionText="nom" />
        </ReferenceInput>
        <TextInput source="telephone" label="Téléphone" />
      </SimpleForm>
    </Create>
  );
}
