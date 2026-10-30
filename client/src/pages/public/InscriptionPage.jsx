import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Title,
  Text,
  Image,
  Select,
  TextInput,
  Button,
  Stack,
  Group,
  Divider,
  ActionIcon,
  Alert,
  Center,
  Loader,
  Box,
  Checkbox,
  FileButton,
  Avatar,
} from '@mantine/core';
import { IconTrash, IconPlus, IconCamera } from '@tabler/icons-react';
import { getInscriptionForm, submitInscription, imageUrl } from '../../api/publicApi.js';

function emptyParticipant() {
  return {
    civilite: 'M.',
    nom: '',
    prenom: '',
    fonction: '',
    email: '',
    telephone: '',
    consentementPhoto: false,
    photoFile: null,
  };
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isParticipantValid(p, photoObligatoire) {
  const baseValid = p.nom.trim() && p.prenom.trim() && p.fonction.trim() && /\S+@\S+\.\S+/.test(p.email);
  if (!photoObligatoire) return baseValid;
  return baseValid && !!p.photoFile && p.consentementPhoto;
}

function PhotoPreview({ file }) {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return <Avatar src={objectUrl} size={56} radius="md" />;
}

const ORGANISME_EDITABLE_FIELDS = ['siegeSocial', 'adresse', 'ville', 'pays', 'telephone', 'fax', 'email', 'siteWeb'];
const ORGANISME_FIELD_LABELS = {
  siegeSocial: 'Siège social',
  adresse: 'Adresse',
  ville: 'Ville',
  pays: 'Pays',
  telephone: 'Téléphone',
  fax: 'Fax',
  email: 'Email',
  siteWeb: 'Site web',
};

export function InscriptionPage() {
  const { formToken } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['inscription-form', formToken],
    queryFn: () => getInscriptionForm(formToken),
    retry: false,
  });

  const [selectedOrganismeId, setSelectedOrganismeId] = useState(null);
  const [organismeDetails, setOrganismeDetails] = useState({});
  const [participants, setParticipants] = useState([emptyParticipant()]);
  const [honeypot, setHoneypot] = useState('');
  const [submitError, setSubmitError] = useState(null);

  const selectedOrganisme = data?.organismes.find((o) => o.id === selectedOrganismeId);

  useEffect(() => {
    if (selectedOrganisme) {
      const details = {};
      ORGANISME_EDITABLE_FIELDS.forEach((field) => {
        details[field] = selectedOrganisme[field] || '';
      });
      setOrganismeDetails(details);
    }
  }, [selectedOrganismeId]);

  const mutation = useMutation({
    mutationFn: () =>
      submitInscription(formToken, {
        data: {
          invitedOrganismId: selectedOrganismeId,
          organismeDetails,
          participants: participants.map(
            ({ civilite, nom, prenom, fonction, email, telephone, consentementPhoto }) => ({
              civilite,
              nom,
              prenom,
              fonction,
              email,
              telephone,
              consentementPhoto,
            }),
          ),
          honeypot,
        },
        photos: participants.map((p) => p.photoFile),
      }),
    onError: (err) => {
      setSubmitError(err.response?.data?.message || 'Une erreur est survenue.');
    },
  });

  if (isLoading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center style={{ height: '100vh' }}>
        <Alert color="red" title="Inscription indisponible">
          {error.response?.data?.message || "Ce lien d'inscription n'est pas valide."}
        </Alert>
      </Center>
    );
  }

  if (mutation.isSuccess) {
    return (
      <Center style={{ height: '100vh' }}>
        <Alert color="green" title="Inscription confirmée">
          Votre inscription a bien été enregistrée. Un email de confirmation vous a été envoyé.
        </Alert>
      </Center>
    );
  }

  const photoObligatoire = !!data.event.photoObligatoire;
  const canSubmit =
    !!selectedOrganismeId &&
    participants.length > 0 &&
    participants.every((p) => isParticipantValid(p, photoObligatoire));

  function updateParticipant(index, field, value) {
    setParticipants((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  }

  function addParticipant() {
    setParticipants((prev) => [...prev, emptyParticipant()]);
  }

  function removeParticipant(index) {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);
    mutation.mutate();
  }

  return (
    <Container size="sm" py="xl">
      <Paper withBorder shadow="sm" p="xl" radius="md">
        {data.organisateur?.logoImageId && (
          <Center mb="md">
            <Image
              src={imageUrl(data.organisateur.logoImageId)}
              alt={data.organisateur.nom}
              h={60}
              w="auto"
              fit="contain"
            />
          </Center>
        )}

        <Title order={2} ta="center">
          {data.event.titre}
        </Title>
        <Text ta="center" c="dimmed" mb="lg">
          {data.event.lieu} {data.event.ville && `(${data.event.ville})`} — du{' '}
          {formatDate(data.event.dateDebut)} au {formatDate(data.event.dateFin)}
        </Text>

        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <Box aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
              <TextInput
                label="Ne pas remplir"
                value={honeypot}
                onChange={(e) => setHoneypot(e.currentTarget.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </Box>

            <Divider label="Organisme" labelPosition="left" />
            <Select
              label="Sélectionnez votre organisme"
              placeholder="Choisir..."
              data={data.organismes.map((o) => ({ value: o.id, label: o.nom }))}
              value={selectedOrganismeId}
              onChange={setSelectedOrganismeId}
              required
              searchable
            />

            {selectedOrganisme && (
              <Stack gap="xs">
                {ORGANISME_EDITABLE_FIELDS.map((field) => (
                  <TextInput
                    key={field}
                    label={ORGANISME_FIELD_LABELS[field]}
                    value={organismeDetails[field] || ''}
                    readOnly={!!selectedOrganisme[field]}
                    onChange={(e) =>
                      setOrganismeDetails((prev) => ({ ...prev, [field]: e.currentTarget.value }))
                    }
                  />
                ))}
              </Stack>
            )}

            <Divider label="Participants" labelPosition="left" />

            {participants.map((participant, index) => (
              <Paper key={index} withBorder p="md" radius="sm">
                <Group justify="space-between" mb="xs">
                  <Text fw={500}>Participant {index + 1}</Text>
                  {participants.length > 1 && (
                    <ActionIcon color="red" variant="subtle" onClick={() => removeParticipant(index)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Group>
                <Stack gap="xs">
                  <Select
                    label="Civilité"
                    data={['M.', 'Mme']}
                    value={participant.civilite}
                    onChange={(value) => updateParticipant(index, 'civilite', value)}
                  />
                  <TextInput
                    label="Nom"
                    required
                    value={participant.nom}
                    onChange={(e) => updateParticipant(index, 'nom', e.currentTarget.value)}
                  />
                  <TextInput
                    label="Prénom"
                    required
                    value={participant.prenom}
                    onChange={(e) => updateParticipant(index, 'prenom', e.currentTarget.value)}
                  />
                  <TextInput
                    label="Fonction"
                    required
                    value={participant.fonction}
                    onChange={(e) => updateParticipant(index, 'fonction', e.currentTarget.value)}
                  />
                  <TextInput
                    label="Email"
                    type="email"
                    required
                    value={participant.email}
                    onChange={(e) => updateParticipant(index, 'email', e.currentTarget.value)}
                  />
                  <TextInput
                    label="Téléphone"
                    value={participant.telephone}
                    onChange={(e) => updateParticipant(index, 'telephone', e.currentTarget.value)}
                  />

                  <Group gap="sm" align="center">
                    <PhotoPreview file={participant.photoFile} />
                    <FileButton
                      onChange={(file) => updateParticipant(index, 'photoFile', file)}
                      accept="image/jpeg,image/png,image/webp"
                      capture="user"
                    >
                      {(props) => (
                        <Button {...props} variant="light" size="xs" leftSection={<IconCamera size={14} />}>
                          {photoObligatoire ? 'Ajouter une photo *' : 'Ajouter une photo'}
                        </Button>
                      )}
                    </FileButton>
                  </Group>

                  {participant.photoFile && (
                    <Checkbox
                      label="J'accepte que ma photo soit utilisée pour mon badge et le contrôle d'accès à l'événement."
                      checked={participant.consentementPhoto}
                      onChange={(e) => updateParticipant(index, 'consentementPhoto', e.currentTarget.checked)}
                      required={photoObligatoire}
                    />
                  )}
                </Stack>
              </Paper>
            ))}

            <Button variant="light" leftSection={<IconPlus size={16} />} onClick={addParticipant}>
              Ajouter un participant
            </Button>

            {submitError && <Alert color="red">{submitError}</Alert>}

            <Button type="submit" disabled={!canSubmit} loading={mutation.isPending} fullWidth>
              Envoyer l'inscription
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
