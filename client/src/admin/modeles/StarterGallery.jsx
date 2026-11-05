import { Box, Card, CardActionArea, CardActions, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { FORMAT_LABELS, STARTER_TEMPLATES } from '../../../../shared/badge-renderer/index.js';

export const STARTERS = Object.values(STARTER_TEMPLATES);

/**
 * The built-in starter templates (shared/badge-renderer/starters): thumbnail
 * (client/public/starters, npm run starters:thumbnails), format, description.
 * `selectedKey` + `onSelect`: picker mode (Nouveau modèle). `renderActions`:
 * gallery mode (Modèles de badge page).
 */
export function StarterGallery({ selectedKey, onSelect, renderActions, compact = false }) {
  return (
    <Grid container spacing={compact ? 1 : 2}>
      {STARTERS.map((s) => {
        const selected = s.key === selectedKey;
        const body = (
          <>
            <Box
              sx={{
                height: compact ? 120 : 190,
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 1,
              }}
            >
              <Box
                component="img"
                src={`/starters/${s.key}.png`}
                alt={`Aperçu du modèle ${s.label}`}
                sx={{ maxWidth: '100%', maxHeight: '100%', boxShadow: 2, borderRadius: 0.5 }}
              />
            </Box>
            <CardContent sx={{ py: compact ? 1 : 1.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: compact ? 0 : 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                  {s.label}
                </Typography>
                <Chip size="small" variant="outlined" label={FORMAT_LABELS[s.format] || s.format} />
              </Stack>
              {!compact && (
                <Typography variant="body2" color="text.secondary">
                  {s.description}
                </Typography>
              )}
            </CardContent>
          </>
        );
        return (
          <Grid key={s.key} size={compact ? { xs: 6, sm: 3 } : { xs: 12, sm: 6, lg: 3 }}>
            <Card
              variant="outlined"
              data-starter={s.key}
              sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderColor: selected ? 'primary.main' : undefined, borderWidth: selected ? 2 : 1 }}
            >
              {onSelect ? (
                <CardActionArea onClick={() => onSelect(s.key)} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                  {body}
                </CardActionArea>
              ) : (
                <Box sx={{ flex: 1 }}>{body}</Box>
              )}
              {renderActions && <CardActions>{renderActions(s)}</CardActions>}
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
