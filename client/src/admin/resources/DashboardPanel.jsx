import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Stack,
} from '@mui/material';
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
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={600} sx={{ color }}>
        {value}
      </Typography>
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
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography color="error">Impossible de charger les statistiques.</Typography>
      </Box>
    );
  }

  const summary = summaryQuery.data;
  const arrivalData = (arrivalQuery.data || []).map((row) => ({
    label: formatSlotLabel(row.slot),
    count: row.count,
  }));

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile label="Inscrits" value={summary.inscrits} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile label="Validés" value={summary.valides} color={STATUS_COLORS.valides} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile label="En attente" value={summary.enAttente} color={STATUS_COLORS.enAttente} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile label="Refusés" value={summary.refuses} color={STATUS_COLORS.refuses} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile label="Présents" value={summary.presents} color={SERIES_PRESENTS} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile label="Taux de présence" value={formatPercent(summary.tauxPresence)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile label="Entrées totales" value={summary.totalEntries} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile label="Ré-entrées" value={summary.reentries} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Présence par catégorie
            </Typography>
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
              <Typography color="text.secondary">Aucune donnée.</Typography>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Présence par organisme
            </Typography>
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
              <Typography color="text.secondary">Aucune donnée.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 4 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Courbe d'arrivées (par tranche de 15 minutes)
        </Typography>
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
          <Typography color="text.secondary">Aucune arrivée enregistrée.</Typography>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Participants validés absents
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {absentsQuery.data?.length || 0} participant(s)
          </Typography>
        </Stack>
        {absentsQuery.data?.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Prénom</TableCell>
                  <TableCell>Fonction</TableCell>
                  <TableCell>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {absentsQuery.data.map((p) => (
                  <TableRow key={p._id} hover>
                    <TableCell>{p.nom}</TableCell>
                    <TableCell>{p.prenom}</TableCell>
                    <TableCell>{p.fonction}</TableCell>
                    <TableCell>{p.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary">Tous les participants validés se sont présentés.</Typography>
        )}
      </Paper>
    </Box>
  );
}
