import mongoose from 'mongoose';
import { Event } from '../models/Event.js';
import { ApiError } from './errorHandler.js';

export async function eventScope(req, res, next) {
  try {
    const { eventId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return next(new ApiError(404, 'Ressource introuvable'));
    }

    const event = await Event.findOne({ _id: eventId, organisateurId: req.organisateurId });
    if (!event) {
      return next(new ApiError(404, 'Ressource introuvable'));
    }

    req.event = event;
    next();
  } catch (error) {
    next(error);
  }
}
