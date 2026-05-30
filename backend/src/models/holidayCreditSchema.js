import mongoose from 'mongoose';

const holidayCreditSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HolidayTemplate',
      required: true,
    },
    sourceHolidayId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    year: { type: Number, required: true },
    status: {
      type: String,
      enum: ['available', 'redeemed', 'expired', 'forfeited'],
      default: 'available',
    },
    redeemedOn: { type: Date, default: null },
    redeemedAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    cancelledAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    forfeitedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

holidayCreditSchema.index({ employee: 1, status: 1 });
holidayCreditSchema.index({ employee: 1, redeemedOn: 1 });
holidayCreditSchema.index({ year: 1, status: 1 });

const HolidayCredit = mongoose.model('HolidayCredit', holidayCreditSchema);
export default HolidayCredit;
