/**
 * Date rules of an event (pure, unit tested):
 * - the end is not before the start;
 * - the registration deadline, if any, is not after the end of the event
 *   (registering during a multi-day event is allowed, after it is not).
 * Returns the first problem as a French message, or null.
 */
export function eventDatesError({ dateDebut, dateFin, dateLimiteInscription }) {
  const debut = dateDebut ? new Date(dateDebut) : null;
  const fin = dateFin ? new Date(dateFin) : null;
  const limite = dateLimiteInscription ? new Date(dateLimiteInscription) : null;
  if (debut && fin && fin < debut) return "La date de fin doit être après la date de début.";
  if (limite && fin && limite > fin) return "La date limite d'inscription ne peut pas dépasser la fin de l'événement.";
  return null;
}

/** Why registration is closed right now because of dates, or null. */
export function registrationClosedReason(event, now = new Date()) {
  if (event.dateFin && now > new Date(event.dateFin)) return "Cet événement est terminé : les inscriptions sont closes.";
  if (event.dateLimiteInscription && now > new Date(event.dateLimiteInscription)) return "La date limite d'inscription est dépassée.";
  return null;
}
