export const getDefaultTemplateCatalog = () => [
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

export const getDefaultPayslipSettings = () => ({
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
  templates: getDefaultTemplateCatalog(),
});

const templateClassMap = {
  classic: 'border-top: 4px solid {{primaryColor}};',
  modern: 'background: linear-gradient(90deg, {{primaryColor}} 0%, #0ea5e9 100%); color: #fff;',
  minimal: 'border-bottom: 2px solid {{secondaryColor}};',
  executive: 'background: #111827; color: #fff;',
};

export const generatePayslipHtml = ({ salary, employee, settings, template }) => {
  const gross = Number(salary.baseSalary || 0) + Number(salary.bonuses || 0);
  const net = Number(salary.totalSalary || gross - Number(salary.deductions || 0));
  const monthName = new Date(
    salary.salaryYear || new Date().getFullYear(),
    (salary.salaryMonth || 1) - 1
  ).toLocaleString('en-US', { month: 'long' });
  const headerStyle =
    templateClassMap[template?.accentStyle || 'classic'] || templateClassMap.classic;

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payslip - ${salary.employeeName}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .card { max-width: 840px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .header { padding: 20px 24px; ${headerStyle.replace('{{primaryColor}}', settings.primaryColor).replace('{{secondaryColor}}', settings.secondaryColor)} }
    .body { padding: 24px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 18px; }
    .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .value { font-size: 14px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
    th { font-size: 12px; text-transform: uppercase; color: #64748b; }
    .total { font-weight: 700; color: ${settings.primaryColor}; }
    .footer { padding: 18px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .brand img { max-height: 48px; }
    .signature { margin-top: 24px; }
    .signature img { max-height: 64px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">
        ${settings.logoData ? `<img src="${settings.logoData}" alt="Company Logo" />` : ''}
        <div>
          <div style="font-size: 20px; font-weight: 700;">${settings.companyName}</div>
          <div style="font-size: 12px; opacity: 0.85;">${settings.companyAddress || ''}</div>
        </div>
      </div>
      <div style="font-size: 13px; margin-top: 8px;">Payslip for ${monthName} ${salary.salaryYear}</div>
    </div>
    <div class="body">
      <div class="grid">
        <div><div class="label">Employee Name</div><div class="value">${employee.name}</div></div>
        <div><div class="label">Employee Email</div><div class="value">${employee.email}</div></div>
        <div><div class="label">Employee ID</div><div class="value">${employee.employeeCode || employee._id || '-'}</div></div>
        <div><div class="label">Month</div><div class="value">${monthName}</div></div>
        <div><div class="label">Year</div><div class="value">${salary.salaryYear}</div></div>
      </div>

      <table>
        <thead>
          <tr><th>Component</th><th>Amount (INR)</th></tr>
        </thead>
        <tbody>
          <tr><td>Base Salary</td><td>${Number(salary.baseSalary || 0).toFixed(2)}</td></tr>
          <tr><td>Bonus</td><td>${Number(salary.bonuses || 0).toFixed(2)}</td></tr>
          <tr><td>Gross Salary</td><td>${gross.toFixed(2)}</td></tr>
          <tr><td>Total Deductions</td><td>${Number(salary.deductions || 0).toFixed(2)}</td></tr>
          <tr><td class="total">Net Salary</td><td class="total">${net.toFixed(2)}</td></tr>
        </tbody>
      </table>

      <div class="signature">
        ${settings.signatureData ? `<img src="${settings.signatureData}" alt="Authorized Signature" />` : ''}
        <div class="label" style="margin-top:8px;">Authorized Signatory</div>
      </div>
    </div>
    <div class="footer">
      <div>${settings.footerNote || ''}</div>
      <div style="margin-top: 4px;">${settings.companyEmail || ''} ${settings.companyPhone ? `| ${settings.companyPhone}` : ''}</div>
    </div>
  </div>
</body>
</html>`;
};
