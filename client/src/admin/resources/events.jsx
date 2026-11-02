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
  SelectArrayInput,
  ArrayInput,
  SimpleFormIterator,
  DateTimeInput,
  NumberInput,
  EditButton,
  ShowButton,
  required,
  useRecordContext,
  RecordContextProvider,
} from 'react-admin';
import { Button, Box, Typography, Divider } from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import ArticleIcon from '@mui/icons-material/Article';
import { ImageUploader } from '../components/ImageUploader.jsx';
import {
  adminImageUrl,
  uploadBadgeBackground,
  deleteBadgeBackground,
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

const panneauChoices = [
  { id: 'P3', name: 'P3 (patronage et partenaires 1)' },
  { id: 'P4', name: 'P4 (partenaires 2)' },
  { id: 'AUTO', name: 'Auto (P3 puis P4 si plein)' },
];

const tailleLogoChoices = [
  { id: 'S', name: 'Petit (4 par ligne)' },
  { id: 'M', name: 'Moyen (3 par ligne)' },
  { id: 'L', name: 'Grand (2 par ligne)' },
];

function usePartenaireChoices() {
  const organisateurId = getSelectedOrganisateurId();
  const [choices, setChoices] = useState([]);

  useEffect(() => {
    axiosClient
      .get(`/admin/organisateurs/${organisateurId}/partenaires`, { params: { limit: 100 } })
      .then(({ data }) => setChoices(data.items.map((p) => ({ id: p._id, name: p.nom }))))
      .catch(() => setChoices([]));
  }, [organisateurId]);

  return choices;
}

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

function BadgeImagesField() {
  const record = useRecordContext();
  if (!record) return null;

  const organisateurId = getSelectedOrganisateurId();

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Badge — images
      </Typography>
      <ImageUploader
        label="Logo de l'événement (en-tête du badge)"
        imageUrl={
          record.badgeConfig?.entete?.logoEvenementImageId
            ? adminImageUrl(record.badgeConfig.entete.logoEvenementImageId)
            : null
        }
        onUpload={(file) => uploadBadgeLogoEvenement(organisateurId, record.id, file)}
        onDelete={() => deleteBadgeLogoEvenement(organisateurId, record.id)}
      />
      <ImageUploader
        label="Bannière d'en-tête (mode image, remplace l'en-tête généré)"
        imageUrl={
          record.badgeConfig?.entete?.banniereImageId
            ? adminImageUrl(record.badgeConfig.entete.banniereImageId)
            : null
        }
        onUpload={(file) => uploadBadgeBanniere(organisateurId, record.id, file)}
        onDelete={() => deleteBadgeBanniere(organisateurId, record.id)}
      />
      <ImageUploader
        label="Image de fond (carte simple)"
        imageUrl={record.badgeConfig?.fondImageId ? adminImageUrl(record.badgeConfig.fondImageId) : null}
        onUpload={(file) => uploadBadgeBackground(organisateurId, record.id, file)}
        onDelete={() => deleteBadgeBackground(organisateurId, record.id)}
      />
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

function GroupesPartenairesField() {
  const partenaireChoices = usePartenaireChoices();

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Badge — groupes de partenaires (P3 / P4)
      </Typography>
      {partenaireChoices.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Aucun partenaire dans la bibliothèque pour le moment — ajoutez-en depuis la page
          "Partenaires" pour pouvoir les assigner ici.
        </Typography>
      )}
      <ArrayInput source="badgeConfig.groupesPartenairesForm" label={false}>
        <SimpleFormIterator inline>
          <TextInput source="titre" label="Titre du groupe" helperText={false} />
          <SelectInput source="panneau" label="Panneau" choices={panneauChoices} helperText={false} />
          <SelectInput source="tailleLogos" label="Taille des logos" choices={tailleLogoChoices} helperText={false} />
          <SelectArrayInput
            source="partenaireIds"
            label="Partenaires"
            choices={partenaireChoices}
            helperText={false}
          />
        </SimpleFormIterator>
      </ArrayInput>
    </Box>
  );
}

// react-admin's SimpleForm merges the raw record on top of any transformed
// defaultValues, so groupesPartenaires (real shape: partenaires: [{partenaireId,
// ordre}]) can't be pre-transformed that way. Instead the form edits a parallel
// groupesPartenairesForm field (shape: partenaireIds: [id, ...]) seeded here from
// the record, and the real field is derived from it right before submit.
function transformEventRecord(record) {
  if (!record) return record;
  return {
    ...record,
    badgeConfig: {
      ...record.badgeConfig,
      groupesPartenairesForm: (record.badgeConfig?.groupesPartenaires || []).map((g) => ({
        titre: g.titre,
        panneau: g.panneau,
        tailleLogos: g.tailleLogos,
        partenaireIds: (g.partenaires || []).map((p) => p.partenaireId),
      })),
    },
  };
}

function transformBadgeConfigForSubmit(data) {
  const groupes = data.badgeConfig?.groupesPartenairesForm;
  const { groupesPartenairesForm, ...badgeConfigRest } = data.badgeConfig || {};
  return {
    ...data,
    badgeConfig: {
      ...badgeConfigRest,
      groupesPartenaires: (groupes || []).map((g) => ({
        titre: g.titre,
        panneau: g.panneau,
        tailleLogos: g.tailleLogos,
        partenaires: (g.partenaireIds || []).map((partenaireId, index) => ({ partenaireId, ordre: index })),
      })),
    },
  };
}

function EventFormInner({ isEdit }) {
  return (
    <SimpleForm>
      {isEdit && <BadgeImagesField />}
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
      <BooleanInput source="badgeConfig.panneauxActifs.p2" label="Activer le panneau P2 (infos pratiques)" />
      <BooleanInput source="badgeConfig.panneauxActifs.p3" label="Activer le panneau P3 (partenaires 1)" />
      <BooleanInput source="badgeConfig.panneauxActifs.p4" label="Activer le panneau P4 (partenaires 2)" />
      <BooleanInput source="badgeConfig.rotationLigneBas180" label="Pivoter la ligne du bas à 180°" />
      <BooleanInput source="badgeConfig.traitsDePliage" label="Afficher les traits de pliage" />
      <BooleanInput source="badgeConfig.afficherPhoto" label="Afficher la photo du participant" />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Badge — thème
      </Typography>
      <TextInput source="badgeConfig.theme.couleurPrincipale" label="Couleur principale (hex)" placeholder="#1971c2" />
      <TextInput source="badgeConfig.theme.couleurSecondaire" label="Couleur secondaire (hex)" placeholder="#dceefe" />
      <TextInput source="badgeConfig.theme.couleurAccent" label="Couleur accent (hex)" placeholder="#e3a72f" />
      <TextInput source="badgeConfig.theme.couleurTexte" label="Couleur texte (hex)" placeholder="#1f2a1f" />
      <BooleanInput source="badgeConfig.theme.degradeEntete" label="Dégradé dans l'en-tête" />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Badge — en-tête
      </Typography>
      <BooleanInput source="badgeConfig.entete.modeImage" label="Utiliser la bannière image plutôt que l'en-tête généré" />
      <TextInput source="badgeConfig.entete.patronageAr" label="Ligne de patronage (arabe)" fullWidth />
      <TextInput source="badgeConfig.entete.patronageFr" label="Ligne de patronage (français)" fullWidth />
      <TextInput source="badgeConfig.entete.titreAffiche" label="Titre affiché (vide = titre de l'événement)" fullWidth />
      <TextInput source="badgeConfig.entete.sousTitreParLigne" label="Sous-titre (ex: by Pollutec)" fullWidth />
      <TextInput source="badgeConfig.entete.edition" label="Édition (ex: 12ème édition)" />
      <TextInput source="badgeConfig.entete.descriptif" label="Descriptif court" fullWidth />
      <TextInput source="badgeConfig.siteWeb" label="Site web" fullWidth />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Badge — informations pratiques (P2)
      </Typography>
      <TextInput source="badgeConfig.infosPratiques.messageValidite" label="Message de validité" fullWidth multiline />
      <TextInput source="badgeConfig.infosPratiques.lieuDetail" label="Lieu — détail" fullWidth />
      <TextInput source="badgeConfig.infosPratiques.droitsEntree" label="Droits d'entrée" fullWidth multiline />
      <TextInput source="badgeConfig.infosPratiques.venirAuSalon" label="Venir au salon" fullWidth multiline />
      <TextInput source="badgeConfig.infosPratiques.noteEncadree.texte" label="Note encadrée — texte" fullWidth />
      <TextInput source="badgeConfig.infosPratiques.noteEncadree.lien" label="Note encadrée — lien" fullWidth />
      <BooleanInput source="badgeConfig.infosPratiques.afficherOrganisateur" label="Afficher le logo organisateur en bas de P2" />

      <GroupesPartenairesField />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Badge — encart promo (P4)
      </Typography>
      <BooleanInput source="badgeConfig.encartPromo.actif" label="Activer l'encart promo" />
      <TextInput source="badgeConfig.encartPromo.titre" label="Titre" fullWidth />
      <TextInput source="badgeConfig.encartPromo.pastille" label="Pastille (ex: -30%)" />
      <TextInput source="badgeConfig.encartPromo.texte" label="Texte" fullWidth multiline />
      <TextInput source="badgeConfig.encartPromo.couleur" label="Couleur (hex)" placeholder="#e8732c" />
      <EncartPromoPartenaireField />
    </SimpleForm>
  );
}

function EncartPromoPartenaireField() {
  const partenaireChoices = usePartenaireChoices();
  return (
    <SelectInput
      source="badgeConfig.encartPromo.partenaireId"
      label="Logo partenaire de l'encart (optionnel)"
      choices={partenaireChoices}
      emptyText="Aucun"
    />
  );
}

function EventForm({ isEdit }) {
  const record = useRecordContext();
  if (isEdit && !record) return null;
  return (
    <RecordContextProvider value={isEdit ? transformEventRecord(record) : record}>
      <EventFormInner isEdit={isEdit} />
    </RecordContextProvider>
  );
}

export function EventEdit() {
  return (
    <Edit transform={transformBadgeConfigForSubmit}>
      <EventForm isEdit />
    </Edit>
  );
}

export function EventCreate() {
  return (
    <Create transform={transformBadgeConfigForSubmit}>
      <EventForm isEdit={false} />
    </Create>
  );
}
