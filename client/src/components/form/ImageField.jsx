import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';

const CHECKERBOARD = 'repeating-conic-gradient(#d0d0d0 0% 25%, #f4f4f4 0% 50%) 50% / 16px 16px';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const SIZES = {
  logo: { width: 240, height: 120 },
  photo: { width: 160, height: 160 },
  small: { width: 140, height: 80 },
};

/**
 * The one image input of the app (logos, photos, badge images).
 *
 * `onUpload(file, { onUploadProgress })` must return a promise; the field
 * shows progress while it runs. `onDelete()` is optional (no Supprimer
 * button without it). The preview never falls back to alt text: a URL that
 * fails to load shows "Image introuvable" with a Remplacer button.
 */
export function ImageField({
  label,
  imageUrl,
  onUpload,
  onDelete,
  variant = 'logo',
  maxSizeMb = 5,
  helperText,
  disabled,
  deleteConfirmText = 'Supprimer cette image ? Cette action est définitive.',
}) {
  const inputRef = useRef(null);
  const [loadError, setLoadError] = useState(false);
  const [progress, setProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const box = SIZES[variant] || SIZES.logo;
  const busy = progress !== null;

  useEffect(() => setLoadError(false), [imageUrl]);

  async function handleFile(file) {
    if (!file || disabled) return;
    setUploadError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('Format non accepté. Utilisez JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setUploadError(`Image trop lourde (max ${maxSizeMb} Mo).`);
      return;
    }
    setProgress(0);
    try {
      await onUpload(file, {
        onUploadProgress: (e) => setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 50),
      });
    } catch (error) {
      setUploadError(error?.response?.data?.message || "Erreur lors de l'envoi de l'image.");
    } finally {
      setProgress(null);
    }
  }

  async function handleDelete() {
    setConfirmOpen(false);
    try {
      await onDelete();
    } catch (error) {
      setUploadError(error?.response?.data?.message || 'Erreur lors de la suppression.');
    }
  }

  const hasImage = !!imageUrl && !loadError;

  return (
    <Box>
      {label && (
        <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 500 }}>
          {label}
        </Typography>
      )}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Box
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={hasImage ? `${label || 'Image'} — remplacer` : `${label || 'Image'} — choisir un fichier`}
          onClick={() => !busy && !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !busy && !disabled) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          sx={{
            position: 'relative',
            width: box.width,
            height: box.height,
            flexShrink: 0,
            borderRadius: 1.5,
            overflow: 'hidden',
            cursor: disabled ? 'default' : 'pointer',
            background: hasImage ? CHECKERBOARD : 'transparent',
            border: '2px dashed',
            borderColor: dragOver ? 'primary.main' : uploadError || loadError ? 'error.main' : 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 120ms',
            '&:hover': { borderColor: disabled ? 'divider' : 'primary.light' },
          }}
        >
          {hasImage && (
            <Box
              component="img"
              src={imageUrl}
              alt=""
              onError={() => setLoadError(true)}
              sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          )}
          {!hasImage && !loadError && (
            <Stack sx={{ alignItems: 'center', px: 1.5, textAlign: 'center', color: 'text.secondary' }} spacing={0.5}>
              <AddPhotoAlternateIcon />
              <Typography variant="caption">Glisser une image ou cliquer pour choisir</Typography>
            </Stack>
          )}
          {loadError && (
            <Stack sx={{ alignItems: 'center', color: 'error.main' }} spacing={0.5}>
              <BrokenImageIcon />
              <Typography variant="caption">Image introuvable</Typography>
            </Stack>
          )}
          {busy && (
            <Box sx={{ position: 'absolute', inset: 'auto 0 0 0', p: 1, bgcolor: 'rgba(0,0,0,0.55)' }}>
              <LinearProgress variant={progress > 0 ? 'determinate' : 'indeterminate'} value={progress} />
              <Typography variant="caption" sx={{ color: '#fff' }}>
                Envoi… {progress > 0 ? `${progress} %` : ''}
              </Typography>
            </Box>
          )}
        </Box>

        <Stack spacing={1} sx={{ pt: 0.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            disabled={busy || disabled}
            onClick={() => inputRef.current?.click()}
          >
            {imageUrl ? 'Remplacer' : 'Choisir une image'}
          </Button>
          {imageUrl && onDelete && (
            <Button size="small" color="error" startIcon={<DeleteIcon />} disabled={busy || disabled} onClick={() => setConfirmOpen(true)}>
              Supprimer
            </Button>
          )}
        </Stack>
      </Stack>

      <Typography variant="caption" color={uploadError ? 'error' : 'text.secondary'} sx={{ display: 'block', mt: 0.75 }}>
        {uploadError || helperText || `JPEG, PNG ou WebP · ${maxSizeMb} Mo maximum`}
      </Typography>

      <input
        ref={inputRef}
        type="file"
        hidden
        accept={ACCEPTED_TYPES.join(',')}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogContent>
          <DialogContentText>{deleteConfirmText}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
