import { useWatch } from 'react-hook-form';
import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  Edit,
  Create,
  Form,
  TextInput,
  BooleanInput,
  SelectInput,
  ReferenceInput,
  EditButton,
  required,
  email,
  minLength,
  useRecordContext,
  useNotify,
  useRedirect,
} from 'react-admin';
import { FormPage, FormSection, Field, PasswordInput, FormActions } from '../../components/form/index.js';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';

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

// The organisateur field is hidden for Super Admins but may still hold its
// prefilled value; never send it for them.
const dropOrganisateurForSuperAdmin = (data) =>
  data.role === 'SUPER_ADMIN' ? { ...data, organisateurId: undefined } : data;

const fullName = (r) => (r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : '');

function UserTitle() {
  return <span>{fullName(useRecordContext()) || 'Gestionnaire'}</span>;
}

/** Shown only for gestionnaires, who must belong to an organisateur. */
function RattachementSection() {
  const role = useWatch({ name: 'role' });
  if (role !== 'GESTIONNAIRE') return null;
  return (
    <FormSection title="Rattachement" description="Le gestionnaire ne voit que les données de cet organisateur.">
      <Field w="half">
        <ReferenceInput source="organisateurId" reference="organisateurs" sort={{ field: 'nom', order: 'ASC' }} perPage={100}>
          <SelectInput label="Organisateur" optionText="nom" validate={required("L'organisateur est requis pour un gestionnaire.")} fullWidth />
        </ReferenceInput>
      </Field>
    </FormSection>
  );
}

function UserForm({ isEdit }) {
  const record = useRecordContext();
  return (
    <Form mode="onBlur" reValidateMode="onChange" defaultValues={isEdit ? undefined : { role: 'GESTIONNAIRE', organisateurId: getSelectedOrganisateurId() }}>
      <FormPage
        title={isEdit ? fullName(record) : 'Créer un gestionnaire'}
        breadcrumbs={[{ label: 'Gestionnaires', to: '/admin/users' }, { label: isEdit ? fullName(record) : 'Créer' }]}
        actions={<FormActions />}
      >
        <FormSection title="Identité">
          <Field w="half">
            <TextInput source="nom" label="Nom" validate={required()} fullWidth />
          </Field>
          <Field w="half">
            <TextInput source="prenom" label="Prénom" validate={required()} fullWidth />
          </Field>
        </FormSection>

        <FormSection title="Compte" description={isEdit ? 'Laissez le nouveau mot de passe vide pour conserver l’actuel.' : 'Identifiants de connexion au back-office.'}>
          <Field w="half">
            <TextInput source="email" label="Email" type="email" validate={[required(), email('Email invalide.')]} fullWidth />
          </Field>
          <Field w="half">
            {isEdit ? (
              <PasswordInput source="nouveauMotDePasse" label="Nouveau mot de passe" validate={minLength(8, '8 caractères minimum.')} />
            ) : (
              <PasswordInput source="password" label="Mot de passe" validate={[required(), minLength(8, '8 caractères minimum.')]} />
            )}
          </Field>
          <Field w="half">
            <SelectInput source="role" label="Rôle" choices={roleChoices} validate={required()} fullWidth />
          </Field>
          {isEdit && (
            <Field w="half">
              <BooleanInput source="actif" label="Actif" sx={{ mt: 1 }} />
            </Field>
          )}
        </FormSection>

        <RattachementSection />

        <FormSection title="Contact">
          <Field w="half">
            <TextInput source="telephone" label="Téléphone" type="tel" fullWidth />
          </Field>
        </FormSection>
      </FormPage>
    </Form>
  );
}

export function UserEdit() {
  const notify = useNotify();
  const redirect = useRedirect();
  return (
    <Edit
      transform={dropOrganisateurForSuperAdmin}
      title={<UserTitle />}
      actions={false}
      component="div"
      mutationMode="pessimistic"
      mutationOptions={{
        // The user update API ignores passwords; a new one goes through the
        // dedicated reset endpoint once the rest of the profile is saved.
        onSuccess: async (data, variables) => {
          const nouveau = variables?.data?.nouveauMotDePasse;
          if (nouveau) {
            try {
              await axiosClient.post(`/admin/users/${data.id}/reset-password`, { password: nouveau });
            } catch (error) {
              notify(error.response?.data?.message || 'Profil enregistré, mais le mot de passe n’a pas pu être changé.', { type: 'error' });
              return;
            }
          }
          notify(nouveau ? 'Gestionnaire et mot de passe enregistrés.' : 'Gestionnaire enregistré.', { type: 'success' });
          redirect('list', 'users');
        },
      }}
    >
      <UserForm isEdit />
    </Edit>
  );
}

export function UserCreate() {
  return (
    <Create title="Créer un gestionnaire" component="div" transform={dropOrganisateurForSuperAdmin}>
      <UserForm isEdit={false} />
    </Create>
  );
}
