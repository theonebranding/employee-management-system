import mongoose from 'mongoose';
import { ROLE_TEMPLATES } from '../constants/roleTemplates.js';

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin', immutable: true },
    roleTemplate: { type: String, default: ROLE_TEMPLATES.SUPER_ADMIN, index: true },
    permissions: [{ type: String }],
    otp: { type: String },
    otpExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordTokenExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    mfaEnabled: { type: Boolean, default: false },
    mfaOtp: { type: String, default: null },
    mfaOtpExpires: { type: Date, default: null },
    mfaSessionToken: { type: String, default: null },
  },
  { timestamps: true }
);

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
