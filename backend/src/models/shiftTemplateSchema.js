import mongoose from 'mongoose';

const shiftTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    graceMinutes: { type: Number, default: 0 },
    minimumMinutesForHalfDay: { type: Number, default: 240 },
    overtimeEligibleAfterMinutes: { type: Number, default: 480 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

const ShiftTemplate = mongoose.model('ShiftTemplate', shiftTemplateSchema);

export default ShiftTemplate;
