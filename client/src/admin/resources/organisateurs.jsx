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
  EditButton,
  useRecordContext,
  useRefresh,
  useNotify,
  useRedirect,
  required,
  email,
} from 'react-admin';
import { Typography } from '@mui/material';
import { ALLOWED_FONTS } from '../../../../shared/badge-renderer/index.js';
import {
  FormPage,
  FormSection,
  Field,
  ImageField,
  ColorInput,
  UrlInput,
  FormActions,
  invalidateBrandKitColors,
} from '../../components/form/index.js';
import { getImageUrl, uploadOrganisateurLogo, deleteOrganisateurLogo } from '../../api/imageApi.js';

const FONT_CHOICES = ALLOWED_FONTS.map((f) => ({ id: f, name: f }));

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

export function organisateurDisplayName(record) {
  if (!record) return '';
  return record.sigle ? `${record.sigle} (${record.nom})` : record.nom;
}

function OrganisateurTitle() {
  const record = useRecordContext();
  return <span>{organisateurDisplayName(record) || 'Organisateur'}</span>;
}

function LogoField() {
  const record = useRecordContext();
  const refresh = useRefresh();
  if (!record) {
    return (
      <Typography variant="body2" color="text.secondary">
        Le logo pourra être ajouté une fois l'organisateur créé.
      </Typography>
    );
  }
  return (
    <ImageField
      label="Logo"
      variant="logo"
      imageUrl={getImageUrl(record.logoImageId, { v: record.updatedAt })}
      onUpload={async (file, options) => {
        await uploadOrganisateurLogo(record.id, file, options);
        refresh();
      }}
      onDelete={async () => {
        await deleteOrganisateurLogo(record.id);
        refresh();
      }}
    />
  );
}

function OrganisateurForm({ isEdit }) {
  const record = useRecordContext();
  return (
    <Form mode="onBlur" reValidateMode="onChange">
      <FormPage
        title={isEdit ? organisateurDisplayName(record) : 'Créer un organisateur'}
        subtitle={isEdit ? undefined : "L'organisateur regroupe ses événements, gestionnaires, partenaires et modèles de badge."}
        breadcrumbs={[{ label: 'Organisateurs', to: '/admin/organisateurs' }, { label: isEdit ? record?.nom : 'Créer' }]}
        actions={<FormActions />}
      >
        <FormSection title="Identité" description="Nom officiel, sigle et logo utilisés sur les badges et les emails.">
          <Field w="full">
            <LogoField />
          </Field>
          <Field w="full">
            <TextInput source="nom" label="Nom" validate={required()} fullWidth />
          </Field>
          <Field w="third">
            <TextInput source="sigle" label="Sigle" fullWidth />
          </Field>
          <Field w="third">
            <BooleanInput source="actif" label="Actif" defaultValue sx={{ mt: 1 }} />
          </Field>
        </FormSection>

        <FormSection title="Coordonnées" description="Affichées dans les emails envoyés aux participants.">
          <Field w="full">
            <TextInput source="adresse" label="Adresse" fullWidth />
          </Field>
          <Field w="half">
            <TextInput source="ville" label="Ville" fullWidth />
          </Field>
          <Field w="half">
            <TextInput source="pays" label="Pays" fullWidth />
          </Field>
          <Field w="half">
            <TextInput source="telephone" label="Téléphone" type="tel" fullWidth />
          </Field>
          <Field w="half">
            <TextInput source="fax" label="Fax" type="tel" fullWidth />
          </Field>
          <Field w="half">
            <TextInput source="email" label="Email" type="email" validate={email('Email invalide.')} fullWidth />
          </Field>
          <Field w="half">
            <UrlInput source="siteWeb" label="Site web" />
          </Field>
        </FormSection>

        <FormSection
          title="Identité visuelle"
          description="Couleurs et polices proposées en premier dans les sélecteurs et appliquées aux nouveaux modèles de badge."
        >
          <Field w="quarter">
            <ColorInput source="brandKit.couleurs.principale" label="Principale" />
          </Field>
          <Field w="quarter">
            <ColorInput source="brandKit.couleurs.secondaire" label="Secondaire" />
          </Field>
          <Field w="quarter">
            <ColorInput source="brandKit.couleurs.accent" label="Accent" />
          </Field>
          <Field w="quarter">
            <ColorInput source="brandKit.couleurs.texte" label="Texte" />
          </Field>
          <Field w="third">
            <SelectInput source="brandKit.polices.titres" label="Police des titres" choices={FONT_CHOICES} fullWidth />
          </Field>
          <Field w="third">
            <SelectInput source="brandKit.polices.texte" label="Police du texte" choices={FONT_CHOICES} fullWidth />
          </Field>
          <Field w="third">
            <SelectInput source="brandKit.polices.nom" label="Police des noms" choices={FONT_CHOICES} fullWidth />
          </Field>
        </FormSection>
      </FormPage>
    </Form>
  );
}

export function OrganisateurEdit() {
  const notify = useNotify();
  const redirect = useRedirect();
  return (
    <Edit
      title={<OrganisateurTitle />}
      actions={false}
      component="div"
      mutationMode="pessimistic"
      mutationOptions={{
        // Custom onSuccess replaces react-admin's default, so notify and
        // redirect explicitly after refreshing the cached brand-kit colors.
        onSuccess: (data) => {
          invalidateBrandKitColors(data.id);
          notify('Organisateur enregistré.', { type: 'success' });
          redirect('list', 'organisateurs');
        },
      }}
    >
      <OrganisateurForm isEdit />
    </Edit>
  );
}

export function OrganisateurCreate() {
  return (
    <Create title="Créer un organisateur" component="div">
      <OrganisateurForm isEdit={false} />
    </Create>
  );
}
