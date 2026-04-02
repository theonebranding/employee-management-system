import mongoose from 'mongoose';

const predefinedHolidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, default: 'GLOBAL', index: true },
    calendarCode: { type: String, default: 'INDIA-GLOBAL', index: true },
    isOptional: { type: Boolean, default: false },
  },
  { timestamps: true }
);

predefinedHolidaySchema.index({ date: 1, location: 1, name: 1 }, { unique: true });

const PredefinedHoliday = mongoose.model('PredefinedHoliday', predefinedHolidaySchema);
export default PredefinedHoliday;
