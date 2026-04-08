import mongoose from 'mongoose';

const taskCommentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    attachments: [String],
    edited: Boolean,
    editedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('TaskComment', taskCommentSchema);
