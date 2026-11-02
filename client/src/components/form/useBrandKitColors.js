import { useEffect, useState } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../../admin/organisateurContext.js';

const cache = new Map();

/** Brand-kit colors of the current organisateur, for ColorField presets. */
export function useBrandKitColors() {
  const organisateurId = getSelectedOrganisateurId();
  const [colors, setColors] = useState(() => cache.get(organisateurId) || []);

  useEffect(() => {
    if (!organisateurId || cache.has(organisateurId)) {
      setColors(cache.get(organisateurId) || []);
      return;
    }
    let cancelled = false;
    axiosClient
      .get(`/admin/organisateurs/${organisateurId}/brand-kit`)
      .then(({ data }) => {
        const list = Object.values(data?.couleurs || {}).filter(Boolean);
        cache.set(organisateurId, list);
        if (!cancelled) setColors(list);
      })
      .catch(() => cache.set(organisateurId, []));
    return () => {
      cancelled = true;
    };
  }, [organisateurId]);

  return colors;
}

/** Call after the brand kit is saved so pickers pick up the new colors. */
export function invalidateBrandKitColors(organisateurId) {
  cache.delete(organisateurId);
}
