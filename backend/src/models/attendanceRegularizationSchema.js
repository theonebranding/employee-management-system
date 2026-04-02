import mongoose from 'mongoose';

const attendanceRegularizationSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', default: null, index: true },
    date: { type: Date, required: true, index: true },
    requestedCheckInTime: { type: Date, default: null },
    requestedCheckOutTime: { type: Date, default: null },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    workflowInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowInstance', default: null },
    decisionNote: { type: String, default: '' },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const AttendanceRegularization = mongoose.model(
  'AttendanceRegularization',
  attendanceRegularizationSchema
);

export default AttendanceRegularization;
