import { useState } from 'react';
import { useNotify, useRefresh } from 'react-admin';
import { Box, Button, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';

export function ImageUploader({ label, imageUrl, onUpload, onDelete }) {
  const notify = useNotify();
  const refresh = useRefresh();
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await onUpload(file);
      notify('Image mise à jour.', { type: 'success' });
      refresh();
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'envoi de l'image.", { type: 'error' });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  }

  async function handleDelete() {
    try {
      await onDelete();
      notify('Image supprimée.', { type: 'success' });
      refresh();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur lors de la suppression.', { type: 'error' });
    }
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        {imageUrl && (
          <Box
            component="img"
            src={imageUrl}
            alt={label}
            sx={{ maxHeight: 60, maxWidth: 160, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 1 }}
          />
        )}
        <Button component="label" variant="outlined" size="small" startIcon={<UploadFileIcon />} disabled={isUploading}>
          {imageUrl ? 'Remplacer' : 'Ajouter une image'}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFileChange} />
        </Button>
        {imageUrl && (
          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
            Supprimer
          </Button>
        )}
      </Stack>
    </Box>
  );
}
