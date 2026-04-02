import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    module: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Permission = mongoose.model('Permission', permissionSchema);

export default Permission;
