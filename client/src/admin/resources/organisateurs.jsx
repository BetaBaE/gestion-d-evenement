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
  useRecordContext,
} from 'react-admin';
import { ImageUploader } from '../components/ImageUploader.jsx';
import { adminImageUrl, uploadOrganisateurLogo, deleteOrganisateurLogo } from '../../api/imageApi.js';

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

function OrganisateurLogoField() {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <ImageUploader
      label="Logo de l'organisateur"
      imageUrl={record.logoImageId ? adminImageUrl(record.logoImageId) : null}
      onUpload={(file) => uploadOrganisateurLogo(record.id, file)}
      onDelete={() => deleteOrganisateurLogo(record.id)}
    />
  );
}

function OrganisateurFields() {
  return (
    <>
      <TextInput source="nom" label="Nom" required fullWidth />
      <TextInput source="sigle" label="Sigle" />
      <TextInput source="adresse" label="Adresse" fullWidth />
      <TextInput source="ville" label="Ville" />
      <TextInput source="pays" label="Pays" />
      <TextInput source="telephone" label="Téléphone" />
      <TextInput source="fax" label="Fax" />
      <TextInput source="email" label="Email" />
      <TextInput source="siteWeb" label="Site web" />
      <BooleanInput source="actif" label="Actif" />
    </>
  );
}

export function OrganisateurEdit() {
  return (
    <Edit>
      <SimpleForm>
        <OrganisateurLogoField />
        <OrganisateurFields />
      </SimpleForm>
    </Edit>
  );
}

export function OrganisateurCreate() {
  return (
    <Create>
      <SimpleForm>
        <OrganisateurFields />
      </SimpleForm>
    </Create>
  );
}
