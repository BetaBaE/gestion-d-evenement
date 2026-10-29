import { useQuery } from '@tanstack/react-query';
import {
  Box,
  SimpleGrid,
  Paper,
  Text,
  Title,
  Table,
  Loader,
  Center,
  Group,
} from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  getEventSummary,
  getPresenceByCategorie,
  getPresenceByOrganisme,
  getArrivalCurve,
  getNoShowParticipants,
} from '../../api/statsApi.js';

const STATUS_COLORS = {
  valides: '#0ca30c',
  enAttente: '#fab219',
  refuses: '#d03b3b',
};

const SERIES_INSCRITS = '#898781';
const SERIES_PRESENTS = '#2a78d6';

function StatTile({ label, value, color }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="28px" fw={600} style={{ color }}>
        {value}
      </Text>
    </Paper>
  );
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function formatSlotLabel(isoString) {
  return new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function DashboardPanel({ eventId }) {
  const summaryQuery = useQuery({
    queryKey: ['stats-summary', eventId],
    queryFn: () => getEventSummary(eventId),
  });
  const categorieQuery = useQuery({
    queryKey: ['stats-categorie', eventId],
    queryFn: () => getPresenceByCategorie(eventId),
  });
  const organismeQuery = useQuery({
    queryKey: ['stats-organisme', eventId],
    queryFn: () => getPresenceByOrganisme(eventId),
  });
  const arrivalQuery = useQuery({
    queryKey: ['stats-arrivees', eventId],
    queryFn: () => getArrivalCurve(eventId),
  });
  const absentsQuery = useQuery({
    queryKey: ['stats-absents', eventId],
    queryFn: () => getNoShowParticipants(eventId),
  });

  if (summaryQuery.isLoading) {
    return (
      <Center p="xl">
        <Loader />
      </Center>
    );
  }

  const summary = summaryQuery.data;
  const arrivalData = (arrivalQuery.data || []).map((row) => ({
    label: formatSlotLabel(row.slot),
    count: row.count,
  }));

  return (
    <Box>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="xl">
        <StatTile label="Inscrits" value={summary.inscrits} />
        <StatTile label="Validés" value={summary.valides} color={STATUS_COLORS.valides} />
        <StatTile label="En attente" value={summary.enAttente} color={STATUS_COLORS.enAttente} />
        <StatTile label="Refusés" value={summary.refuses} color={STATUS_COLORS.refuses} />
        <StatTile label="Présents" value={summary.presents} color={SERIES_PRESENTS} />
        <StatTile label="Taux de présence" value={formatPercent(summary.tauxPresence)} />
        <StatTile label="Entrées totales" value={summary.totalEntries} />
        <StatTile label="Ré-entrées" value={summary.reentries} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
        <Paper withBorder p="md" radius="md">
          <Title order={5} mb="sm">
            Présence par catégorie
          </Title>
          {categorieQuery.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categorieQuery.data} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e0d9" />
                <XAxis dataKey="nom" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="inscrits" name="Inscrits" fill={SERIES_INSCRITS} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="presents" name="Présents" fill={SERIES_PRESENTS} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Text c="dimmed">Aucune donnée.</Text>
          )}
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Title order={5} mb="sm">
            Présence par organisme
          </Title>
          {organismeQuery.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={organismeQuery.data} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e0d9" />
                <XAxis dataKey="nom" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="inscrits" name="Inscrits" fill={SERIES_INSCRITS} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="presents" name="Présents" fill={SERIES_PRESENTS} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Text c="dimmed">Aucune donnée.</Text>
          )}
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="md" radius="md" mb="xl">
        <Title order={5} mb="sm">
          Courbe d'arrivées (par tranche de 15 minutes)
        </Title>
        {arrivalData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={arrivalData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e0d9" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                name="Arrivées"
                stroke={SERIES_PRESENTS}
                fill={SERIES_PRESENTS}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Text c="dimmed">Aucune arrivée enregistrée.</Text>
        )}
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="sm">
          <Title order={5}>Participants validés absents</Title>
          <Text size="sm" c="dimmed">
            {absentsQuery.data?.length || 0} participant(s)
          </Text>
        </Group>
        {absentsQuery.data?.length > 0 ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom</Table.Th>
                <Table.Th>Prénom</Table.Th>
                <Table.Th>Fonction</Table.Th>
                <Table.Th>Email</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {absentsQuery.data.map((p) => (
                <Table.Tr key={p._id}>
                  <Table.Td>{p.nom}</Table.Td>
                  <Table.Td>{p.prenom}</Table.Td>
                  <Table.Td>{p.fonction}</Table.Td>
                  <Table.Td>{p.email}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed">Tous les participants validés se sont présentés.</Text>
        )}
      </Paper>
    </Box>
  );
}
