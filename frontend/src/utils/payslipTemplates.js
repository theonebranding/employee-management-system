export const defaultPayslipTemplates = [
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
];

export const defaultPayslipSettings = {
  companyName: 'Your Company',
  companyAddress: '',
  companyEmail: '',
  companyPhone: '',
  logoData: '',
  signatureData: '',
  primaryColor: '#0F766E',
  secondaryColor: '#E2E8F0',
  footerNote: 'This is a system generated payslip.',
  activeTemplateId: 'classic-template',
  templates: defaultPayslipTemplates,
};
