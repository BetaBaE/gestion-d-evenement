import { getImageUrl, uploadBadgeImage } from '../../api/imageApi.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { ImageField } from '../../components/form/index.js';

/**
 * Uploads an image for a badge element (optimized and stored server-side
 * like every other image) and hands back its id; the caller stores the id
 * on the element's props. Supprimer only clears the element's image.
 */
export function ImagePickerField({ eventId, imageId, onChange }) {
  return (
    <ImageField
      label="Image"
      variant="small"
      imageUrl={getImageUrl(imageId)}
      onUpload={async (file, options) => {
        const data = await uploadBadgeImage(getSelectedOrganisateurId(), eventId, file, options);
        onChange(String(data.imageId));
      }}
      onDelete={async () => onChange(undefined)}
      deleteConfirmText="Retirer l'image de cet élément ?"
    />
  );
}
