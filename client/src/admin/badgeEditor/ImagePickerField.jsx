import { getImageUrl } from '../../api/imageApi.js';
import { ImageField } from '../../components/form/index.js';

/**
 * Uploads an image for a badge element (optimized and stored server-side
 * like every other image) through `upload(file, options)` — the event's or
 * the template's upload route — and hands back its id; the caller stores
 * the id on the element's props. Supprimer only clears the element's image.
 */
export function ImagePickerField({ upload, imageId, onChange }) {
  return (
    <ImageField
      label="Image"
      variant="small"
      imageUrl={getImageUrl(imageId)}
      onUpload={async (file, options) => {
        const data = await upload(file, options);
        onChange(String(data.imageId));
      }}
      onDelete={async () => onChange(undefined)}
      deleteConfirmText="Retirer l'image de cet élément ?"
    />
  );
}
