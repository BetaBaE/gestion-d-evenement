import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
    horodatage: { type: Date, required: true, default: Date.now },
    appareil: { type: String },
  },
  { timestamps: true },
);

scanSchema.index({ eventId: 1, participantId: 1, horodatage: 1 });
scanSchema.index({ eventId: 1, horodatage: 1 });

export const Scan = mongoose.model('Scan', scanSchema);
