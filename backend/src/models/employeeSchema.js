import mongoose from 'mongoose';
import { ROLE_TEMPLATES } from '../constants/roleTemplates.js';

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phoneNumber: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'employee' },
    roleTemplate: { type: String, default: ROLE_TEMPLATES.EMPLOYEE, index: true },
    permissions: [{ type: String }],
    dateofBirth: { type: Date },
    // professional info
    jobRole: { type: String },
    joinedDate: { type: Date },
    serviceTime: { type: String },
    // identification info
    aadharNumber: { type: String },
    panNumber: { type: String },
    licenseInfo: { type: String },
    // Bank info
    bankName: { type: String },
    branchName: { type: String },
    bankAccountNumber: { type: String },
    ifscCode: { type: String },
    // address info
    address: { type: String },
    state: { type: String },
    city: { type: String },
    district: { type: String },
    pinCode: { type: String },
    department: { type: String, index: true },
    team: { type: String, index: true },
    location: { type: String, index: true },
    costCenter: { type: String, index: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', index: true },
    // predefined Checkin time
    predefinedCheckInTime: { type: String, default: '10:00' },
    // email verification
    isVerified: { type: Boolean, default: false },
    mfaEnabled: { type: Boolean, default: false },
    mfaOtp: { type: String, default: null },
    mfaOtpExpires: { type: Date, default: null },
    mfaSessionToken: { type: String, default: null },
    otp: { type: String },
    otpExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordTokenExpires: { type: Date },
    documents: [
      {
        title: { type: String, required: true },
        type: {
          type: String,
          enum: ['offer-letter', 'aadhaar-card', 'pan-card', 'other'],
          default: 'other',
        },
        fileName: { type: String },
        mimeType: { type: String },
        fileData: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
