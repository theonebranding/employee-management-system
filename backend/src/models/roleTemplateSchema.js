import mongoose from 'mongoose';

const roleTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '' },
    permissions: [{ type: String, required: true }],
    isSystem: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const RoleTemplate = mongoose.model('RoleTemplate', roleTemplateSchema);

export default RoleTemplate;
