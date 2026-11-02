import { Box, Paper, Typography, IconButton, Stack, Tooltip } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { getBlockFormComponent } from './blockForms/index.js';
import { BlockStyleForm } from './BlockStyleForm.jsx';
import { blockCatalogEntry } from './blockCatalog.js';

export function BlockSettingsPanel({ selectedBlock, eventId, onChangeProps, onChangeStyle, onMoveUp, onMoveDown, onDuplicate, onDelete }) {
  if (!selectedBlock) {
    return (
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography variant="body2" color="text.secondary">
          Sélectionnez un bloc sur le badge pour modifier son contenu.
        </Typography>
      </Paper>
    );
  }

  const { bloc } = selectedBlock;
  const entry = blockCatalogEntry(bloc.type);
  const FormComponent = getBlockFormComponent(bloc.type);

  return (
    <Paper sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">{entry.label}</Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Monter">
            <IconButton size="small" onClick={onMoveUp}>
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Descendre">
            <IconButton size="small" onClick={onMoveDown}>
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Dupliquer">
            <IconButton size="small" onClick={onDuplicate}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton size="small" color="error" onClick={onDelete}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <FormComponent props={bloc.props || {}} onChange={onChangeProps} eventId={eventId} />
      </Box>

      <BlockStyleForm style={bloc.style || {}} onChange={onChangeStyle} />
    </Paper>
  );
}
