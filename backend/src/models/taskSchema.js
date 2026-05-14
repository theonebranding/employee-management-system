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
    attachments: [String],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaskComment',
      },
    ],
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Task', taskSchema);
