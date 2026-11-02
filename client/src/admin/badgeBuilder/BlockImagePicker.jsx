import { useState } from 'react';
import { Box, Button, Stack, Typography, CircularProgress } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { axiosClient } from '../../api/axiosClient.js';
import { adminImageUrl } from '../../api/imageApi.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';

/**
 * Uploads via the generic /badge-image endpoint and returns the new
 * imageId to the caller — it never writes to badgeConfig itself, the
 * calling block form decides which prop key to store it under.
 */
export function BlockImagePicker({ label, eventId, imageId, onChange }) {
  const [isUploading, setIsUploading] = useState(false);
  const organisateurId = getSelectedOrganisateurId();

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axiosClient.post(
        `/admin/organisateurs/${organisateurId}/events/${eventId}/badge-image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      onChange(data.imageId);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  }

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        {imageId && (
          <Box
            component="img"
            src={adminImageUrl(imageId)}
            alt={label}
            sx={{ maxHeight: 48, maxWidth: 120, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 1 }}
          />
        )}
        <Button component="label" size="small" variant="outlined" startIcon={isUploading ? <CircularProgress size={14} /> : <UploadFileIcon />} disabled={isUploading}>
          {imageId ? 'Remplacer' : 'Choisir'}
          <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
        </Button>
        {imageId && (
          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onChange(null)}>
            Retirer
          </Button>
        )}
      </Stack>
    </Box>
  );
}
