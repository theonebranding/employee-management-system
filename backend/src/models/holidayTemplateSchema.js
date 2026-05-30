import mongoose from 'mongoose';

const holidayEntrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
  },
  { _id: true }
);

const holidayTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    year: { type: Number, required: true },
    type: { type: String, enum: ['fixed', 'floating'], required: true },
    holidays: { type: [holidayEntrySchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

holidayTemplateSchema.index({ year: 1 });
holidayTemplateSchema.index({ type: 1 });

const HolidayTemplate = mongoose.model('HolidayTemplate', holidayTemplateSchema);
export default HolidayTemplate;
