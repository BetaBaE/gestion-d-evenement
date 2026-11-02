import { useState } from 'react';
import { useNotify } from 'react-admin';
import { Box, Button, CircularProgress, Stack } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { axiosClient } from '../../api/axiosClient.js';
import { adminImageUrl } from '../../api/imageApi.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';

/**
 * Uploads an image for a badge element (optimized and stored server-side
 * like every other image) and hands back its id; the caller stores the id
 * on the element's props.
 */
export function ImagePickerField({ eventId, imageId, onChange }) {
  const notify = useNotify();
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axiosClient.post(
        `/admin/organisateurs/${getSelectedOrganisateurId()}/events/${eventId}/badge-image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      onChange(String(data.imageId));
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'envoi de l'image.", { type: 'error' });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      {imageId && (
        <Box
          component="img"
          src={adminImageUrl(imageId)}
          alt=""
          sx={{ maxHeight: 48, maxWidth: 110, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 1 }}
        />
      )}
      <Button
        component="label"
        size="small"
        variant="outlined"
        disabled={isUploading}
        startIcon={isUploading ? <CircularProgress size={14} /> : <UploadFileIcon />}
      >
        {imageId ? 'Remplacer' : 'Choisir une image'}
        <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
      </Button>
    </Stack>
  );
}
