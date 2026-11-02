import { Box, Breadcrumbs, Grid, Link, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';

const SPANS = {
  full: { xs: 12 },
  half: { xs: 12, md: 6 },
  third: { xs: 12, sm: 6, md: 4 },
  quarter: { xs: 12, sm: 6, md: 3 },
};

/**
 * A grid cell inside a FormSection. `w` sets the width on desktop (12-col
 * grid): full = 12, half = 6, third = 4, quarter = 3. Always full width on
 * mobile, so short fields (sigle, téléphone, capacité) aren't stretched on
 * desktop yet stay readable on a phone.
 */
export function Field({ w = 'full', children }) {
  return <Grid size={SPANS[w] || SPANS.full}>{children}</Grid>;
}

/** Card with a title, a one-line description and a 12-column field grid. */
export function FormSection({ title, description, children, action }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'flex-start', mb: 2, gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      <Grid container columnSpacing={2} rowSpacing={1.5}>
        {children}
      </Grid>
    </Paper>
  );
}

/** Sticky bottom action bar (also usable on its own inside a <Form>). */
export function StickyActionBar({ children, embedded = false }) {
  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        mx: embedded ? -3 : 0,
        px: embedded ? 3 : 2,
        py: 1.5,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        borderRadius: embedded ? 0 : '8px 8px 0 0',
        boxShadow: embedded ? 'none' : '0 -4px 12px rgba(0,0,0,0.15)',
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Page frame for every form: breadcrumb, title (the record's name, never
 * its id), optional subtitle, centred content (max ~1100 px) and a sticky
 * action bar. `embedded` drops the header and width cap (forms in dialogs).
 */
export function FormPage({ title, subtitle, breadcrumbs = [], actions, children, maxWidth = 1100, embedded = false }) {
  return (
    <Box sx={{ width: '100%', maxWidth: embedded ? 'none' : maxWidth, mx: 'auto', px: embedded ? 0 : { xs: 1, md: 2 }, pt: embedded ? 0 : 2 }}>
      {!embedded && (
        <Box sx={{ mb: 2 }}>
          {breadcrumbs.length > 0 && (
            <Breadcrumbs separator="›" sx={{ mb: 0.5, fontSize: 14 }}>
              {breadcrumbs.map((b, i) =>
                b.to && i < breadcrumbs.length - 1 ? (
                  <Link key={i} component={RouterLink} to={b.to} underline="hover" color="inherit">
                    {b.label}
                  </Link>
                ) : (
                  <Typography key={i} color="text.primary" sx={{ fontSize: 14 }}>
                    {b.label}
                  </Typography>
                ),
              )}
            </Breadcrumbs>
          )}
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      <Stack spacing={2} sx={{ pb: 2 }}>
        {children}
      </Stack>

      {actions && <StickyActionBar embedded={embedded}>{actions}</StickyActionBar>}
    </Box>
  );
}
