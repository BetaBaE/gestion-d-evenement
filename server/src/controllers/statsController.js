import {
  getEventSummary,
  getPresenceByCategorie,
  getPresenceByOrganisme,
  getArrivalCurve,
  getNoShowParticipants,
  getParticipantDetail,
} from '../services/statsService.js';
import { ApiError } from '../middlewares/errorHandler.js';

export async function eventSummary(req, res, next) {
  try {
    const summary = await getEventSummary(req.event._id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

export async function presenceByCategorie(req, res, next) {
  try {
    const data = await getPresenceByCategorie(req.event._id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function presenceByOrganisme(req, res, next) {
  try {
    const data = await getPresenceByOrganisme(req.event._id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function arrivalCurve(req, res, next) {
  try {
    const data = await getArrivalCurve(req.event._id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function noShowParticipants(req, res, next) {
  try {
    const data = await getNoShowParticipants(req.event._id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function participantDetail(req, res, next) {
  try {
    const detail = await getParticipantDetail(req.event._id, req.params.participantId);
    if (!detail) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(detail);
  } catch (error) {
    next(error);
  }
}
