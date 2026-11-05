import { emailSummary, requeueFailedEmails } from '../services/emailQueue.js';

/** "Emails : 120 envoyés · 45 en file (≈ 3 min) · 2 échecs" + SMTP alert, for the event page. */
export async function getEventEmailSummary(req, res, next) {
  try {
    res.json(await emailSummary(req.event));
  } catch (error) {
    next(error);
  }
}

/** "Renvoyer": the event's failed emails go back to the queue. */
export async function resendFailedEmails(req, res, next) {
  try {
    const requeued = await requeueFailedEmails(req.event);
    res.json({ requeued });
  } catch (error) {
    next(error);
  }
}
