import { useMemo } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { checkBadgeRules } from '../../../../shared/badge-renderer/index.js';

/**
 * "Vérifications": blocking problems (the badge can't be used for an event
 * until they're fixed, each with a one-click "Ajouter" placing the missing
 * element on P1) and warnings.
 */
export function RulesPanel({ badge, elements, onFix, onShowElement }) {
  const rules = useMemo(() => checkBadgeRules({ ...badge, elements }), [badge, elements]);

  return (
    <Stack spacing={0.75}>
      <Typography variant="overline" color="text.secondary">
        Vérifications
      </Typography>
      {rules.length === 0 && (
        <Alert severity="success" sx={{ py: 0, fontSize: 13 }}>
          Prêt à l'emploi
        </Alert>
      )}
      {rules.map((rule) => (
        <Alert
          key={`${rule.code}:${rule.elementId || ''}`}
          severity={rule.niveau === 'bloquant' ? 'error' : 'warning'}
          sx={{ py: 0, fontSize: 13, '& .MuiAlert-message': { width: '100%' } }}
        >
          {rule.message}
          {rule.correction && (
            <Button size="small" variant="outlined" color="inherit" sx={{ display: 'flex', mt: 0.5 }} onClick={() => onFix(rule.correction)}>
              Ajouter
            </Button>
          )}
          {rule.elementId && onShowElement && (
            <Button size="small" variant="outlined" color="inherit" sx={{ display: 'flex', mt: 0.5 }} onClick={() => onShowElement(rule.elementId)}>
              Sélectionner l'élément
            </Button>
          )}
        </Alert>
      ))}
    </Stack>
  );
}
