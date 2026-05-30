import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sendEmail from './sendEmail.js';

// Custom __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const injectData = (template, data) => {
  return template.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || '');
};

const adminEmail = 'man842289@gmail.com';

const sendResetPasswordEmail = async (email, name, otp) => {
  const templatePath = path.join(__dirname, 'templates', 'resetPassword.html');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const htmlContent = injectData(template, { name, otp });

  await sendEmail(email, 'Reset Your Password', htmlContent);
};

const sendResetPasswordSuccessEmail = async (email, name) => {
  const templatePath = path.join(__dirname, 'templates', 'successResetPassword.html');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const htmlContent = injectData(template, { name });

  await sendEmail(email, 'Password Reset Successfully', htmlContent);
};

const sendLeaveRequestEmail = async (email, reason, startDate, endDate) => {
  const templatePath = path.join(__dirname, 'templates', 'leaveRequest.html');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const htmlContent = injectData(template, { email, reason, startDate, endDate });

  await sendEmail(adminEmail, 'Leave Request Submitted', htmlContent);
};

const sendLeaveStatusEmail = async (email, reason, startDate, endDate, status) => {
  const templatePath = path.join(__dirname, 'templates', 'leaveStatus.html');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const htmlContent = injectData(template, { email, reason, startDate, endDate, status });

  await sendEmail(email, 'Leave Request Status Update', htmlContent);
};

const sendInvitationRequestEmail = async (email) => {
  const templatePath = path.join(__dirname, 'templates', 'invitationRequest.html');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const htmlContent = injectData(template, { email });

  await sendEmail(email, 'Invitation Request', htmlContent);
};

const sendDailyReportSubmittedEmail = async ({ name, email, employeeCode, reportDate, reportText }) => {
  const templatePath = path.join(__dirname, 'templates', 'dailyReportSubmitted.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  let subject = 'Daily Work Report';
  let body = reportText || '';
  if (reportText && reportText.startsWith('Subject:')) {
    const parts = reportText.split(/\n\n/);
    const subjectLine = parts.shift() || '';
    subject = subjectLine.replace(/^Subject:\s*/i, '').trim() || subject;
    body = parts.join('\n\n').trim();
  }

  const htmlContent = injectData(template, {
    name,
    email,
    employeeCode,
    date: reportDate,
    subject,
    body,
  });

  const subjectLine = `Daily Work Report - ${name} - ${reportDate}`;
  await sendEmail(adminEmail, subjectLine, htmlContent);
};

export {
  sendResetPasswordEmail,
  sendResetPasswordSuccessEmail,
  sendLeaveRequestEmail,
  sendLeaveStatusEmail,
  sendInvitationRequestEmail,
  sendDailyReportSubmittedEmail,
};
