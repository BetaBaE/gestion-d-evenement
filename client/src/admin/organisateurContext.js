const STORAGE_KEY = 'selectedOrganisateurId';

export function getSelectedOrganisateurId() {
  return localStorage.getItem(STORAGE_KEY);
}

export function setSelectedOrganisateurId(organisateurId) {
  if (organisateurId) {
    localStorage.setItem(STORAGE_KEY, organisateurId);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}
