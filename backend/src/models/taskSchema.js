import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    targetDepartment: {
      type: String,
      default: '',
    },
    targetDesignation: {
      type: String,
      default: '',
    },
    assignedEmployeeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
    ],
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    attachments: [
      {
        fileName: { type: String, required: true },
        fileType: { type: String, required: true },
        fileData: { type: String, required: true },
      },
    ],
    links: [
      {
        label: { type: String, default: '' },
        url: { type: String, required: true },
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaskComment',
      },
    ],
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'completedByModel',
    },
    completedByModel: {
      type: String,
      enum: ['Employee', 'Admin'],
    },
    statusChangedBy: {
      type: String,
      enum: ['employee', 'admin'],
    },
  },
  { timestamps: true }
);

export default mongoose.model('Task', taskSchema);
