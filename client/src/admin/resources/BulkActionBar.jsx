import { useState } from 'react';
import { useListContext } from 'react-admin';
import { Button, Divider, Menu, MenuItem, Paper, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import CategoryIcon from '@mui/icons-material/Category';
import PrintIcon from '@mui/icons-material/Print';
import EmailIcon from '@mui/icons-material/Email';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useCurrentSelection, useSelectionMode } from './ParticipantSelection.jsx';
import { BulkConfirmDialog } from './BulkConfirmDialog.jsx';

/**
 * Sticky bar at the bottom of the participant list as soon as something is
 * selected. Every action goes through the confirmation dialog (server-side
 * eligibility summary) and then runs as a background job.
 */
export function BulkActionBar({ eventId, categories, onPrint }) {
  const { selection, count } = useCurrentSelection();
  const { onUnselectItems } = useListContext();
  const { setFilterMode } = useSelectionMode();
  const [request, setRequest] = useState(null);
  const [menu, setMenu] = useState(null); // { kind: 'categorie' | 'email', anchor }

  if (count === 0 && !request) return null;

  const open = (action, options = {}) => {
    setMenu(null);
    setRequest({ action, selection, options });
  };
  const clearSelection = () => {
    setFilterMode(false);
    onUnselectItems();
  };

  return (
    <>
      {count > 0 && (
        <Paper
          elevation={6}
          sx={{ position: 'sticky', bottom: 12, zIndex: 5, mt: 1, px: 1.5, py: 1, borderRadius: 2, border: 1, borderColor: 'divider' }}
        >
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mr: 1 }}>
              {count} sélectionné{count > 1 ? 's' : ''}
            </Typography>
            <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => open('VALIDER_ENVOYER')}>
              Valider et envoyer le badge
            </Button>
            <Button size="small" startIcon={<TaskAltIcon />} onClick={() => open('VALIDER')}>
              Valider sans envoyer
            </Button>
            <Button size="small" color="error" startIcon={<CancelIcon />} onClick={() => open('REFUSER')}>
              Refuser
            </Button>
            <Divider orientation="vertical" flexItem />
            <Button size="small" startIcon={<CategoryIcon />} endIcon={<ArrowDropDownIcon />} onClick={(e) => setMenu({ kind: 'categorie', anchor: e.currentTarget })}>
              Changer la catégorie
            </Button>
            {onPrint && (
              <Button size="small" startIcon={<PrintIcon />} onClick={() => onPrint(selection)}>
                Imprimer les badges
              </Button>
            )}
            <Button size="small" startIcon={<EmailIcon />} endIcon={<ArrowDropDownIcon />} onClick={(e) => setMenu({ kind: 'email', anchor: e.currentTarget })}>
              Renvoyer l'email
            </Button>
            <Button size="small" startIcon={<FileDownloadIcon />} onClick={() => open('EXPORTER')}>
              Exporter (Excel)
            </Button>
            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => open('SUPPRIMER')}>
              Supprimer
            </Button>
          </Stack>
        </Paper>
      )}

      <Menu anchorEl={menu?.anchor} open={menu?.kind === 'categorie'} onClose={() => setMenu(null)}>
        {categories.map((c) => (
          <MenuItem key={c.id} onClick={() => open('CHANGER_CATEGORIE', { categorieId: c.id })}>
            {c.nom}
          </MenuItem>
        ))}
      </Menu>
      <Menu anchorEl={menu?.anchor} open={menu?.kind === 'email'} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => open('RENVOYER_EMAIL', { type: 'CONFIRMATION' })}>Email de confirmation d'inscription</MenuItem>
        <MenuItem onClick={() => open('RENVOYER_EMAIL', { type: 'BADGE' })}>Email avec le badge (validés)</MenuItem>
      </Menu>

      <BulkConfirmDialog eventId={eventId} request={request} onClose={() => setRequest(null)} onStarted={clearSelection} />
    </>
  );
}
