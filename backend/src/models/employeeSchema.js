import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    employeeCode: { type: String, unique: true },
    email: { type: String, unique: true, required: true },
    phoneNumber: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'employee' },
    dateofBirth: { type: Date },
    // professional info
    department: { type: String },
    designation: { type: String },
    employmentType: { type: String },
    workLocation: { type: String },
    joinedDate: { type: Date },
    serviceTime: { type: String },
    onboardingStatus: {
      type: String,
      enum: ['draft', 'onboarding_complete', 'payroll_ready', 'active'],
      default: 'draft',
    },
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
    emergencyContactName: { type: String },
    emergencyContactPhone: { type: String },
    // predefined Checkin time
    predefinedCheckInTime: { type: String, default: '10:00' },
    // email verification
    isVerified: { type: Boolean, default: false },
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
