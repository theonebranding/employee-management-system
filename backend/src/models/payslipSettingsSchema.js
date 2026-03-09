import mongoose from 'mongoose';

const payslipTemplateSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    accentStyle: {
      type: String,
      enum: ['classic', 'modern', 'minimal', 'executive'],
      default: 'classic',
    },
  },
  { _id: false }
);

const payslipSettingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'Your Company' },
    companyAddress: { type: String, default: '' },
    companyEmail: { type: String, default: '' },
    companyPhone: { type: String, default: '' },
    logoData: { type: String, default: '' },
    signatureData: { type: String, default: '' },
    primaryColor: { type: String, default: '#0F766E' },
    secondaryColor: { type: String, default: '#E2E8F0' },
    footerNote: { type: String, default: 'This is a system generated payslip.' },
    activeTemplateId: { type: String, default: 'classic-template' },
    templates: {
      type: [payslipTemplateSchema],
      default: [
        {
          id: 'classic-template',
          name: 'Classic Ledger',
          description: 'Balanced blocks with summary rows',
          accentStyle: 'classic',
        },
        {
          id: 'modern-template',
          name: 'Modern Stripe',
          description: 'Top strip style with clean sections',
          accentStyle: 'modern',
        },
        {
          id: 'minimal-template',
          name: 'Minimal Mono',
          description: 'Lightweight compact payslip layout',
          accentStyle: 'minimal',
        },
        {
          id: 'executive-template',
          name: 'Executive Panel',
          description: 'Strong heading with highlighted totals',
          accentStyle: 'executive',
        },
      ],
    },
  },
  { timestamps: true }
);

const PayslipSettings = mongoose.model('PayslipSettings', payslipSettingsSchema);

export default PayslipSettings;
