import express from 'express';
import dotenv from './config/dotenv.js';
import connectDB from './config/db.js';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

import authRoute from './routes/authRoute.js';
import attendanceRoute from './routes/attendanceRoute.js';
import employeeRoute from './routes/employeeRoute.js';
import attendanceSummaryRoute from './routes/attendanceSummaryRoute.js';
import holidayRoute from './routes/holidayRoute.js';
import adminRoute from './routes/adminRoute.js';
import leaveRoute from './routes/leaveRoute.js';
import lateCheckInRoute from './routes/lateCheckInRoute.js';
import salaryRoute from './routes/salaryRoute.js';
import dailyReportRoute from './routes/dailyReportRoute.js';
import workflowRoute from './routes/workflowRoute.js';
import auditRoute from './routes/auditRoute.js';
import orgRoute from './routes/orgRoute.js';
import attendancePolicyRoute from './routes/attendancePolicyRoute.js';
import payrollRoute from './routes/payrollRoute.js';
import sessionRoute from './routes/sessionRoute.js';
import integrationRoute from './routes/integrationRoute.js';
import jobRoute from './routes/jobRoute.js';
import reportingRoute from './routes/reportingRoute.js';
import leavePolicyRoute from './routes/leavePolicyRoute.js';
import { corsOptions, globalApiLimiter, mutationApiLimiter } from './middleware/security.js';
import { seedRbacCore } from './services/rbacService.js';
import { ensureDefaultWorkflows } from './services/workflowService.js';
import { registerIntegrationProcessors } from './services/integrationJobProcessors.js';
import { registerReportingProcessors } from './services/reportingJobProcessors.js';
import { registerLeaveProcessors } from './services/leaveJobProcessors.js';
import { startAsyncJobScheduler } from './services/asyncJobService.js';
import { startReportSchedulePolling } from './services/reportScheduleService.js';
import { ensureDefaultLeaveTypes } from './services/leavePolicyService.js';

dotenv();
const app = express();
const PORT = process.env.PORT || 8000;
const BODY_LIMIT = process.env.BODY_SIZE_LIMIT || '10mb';

// Middleware
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(mongoSanitize());
app.use(hpp());
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
app.use(cookieParser());
app.use(cors(corsOptions));
app.options('/api/*', cors(corsOptions));
app.use('/api', globalApiLimiter);
app.use('/api/v1', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  return mutationApiLimiter(req, res, next);
});

const bootstrapPlatform = async () => {
  try {
    await seedRbacCore();
    await ensureDefaultWorkflows();
    await ensureDefaultLeaveTypes();
    console.log('RBAC and workflow templates are ready');
  } catch (error) {
    console.error('Bootstrap error:', error.message);
  }
};

// Home Route
app.get('/', (req, res) => {
  res.send('Welcome to the Home Route, API is working :-)');
});

// Routes
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/attendance', attendanceRoute);
app.use('/api/v1/employee', employeeRoute);
app.use('/api/v1/attendance-summary', attendanceSummaryRoute);
app.use('/api/v1/holidays', holidayRoute);
app.use('/api/v1/admin', adminRoute);
app.use('/api/v1/leaves', leaveRoute);
app.use('/api/v1/late-checkins', lateCheckInRoute);
app.use('/api/v1/salary', salaryRoute);
app.use('/api/v1/daily-reports', dailyReportRoute);
app.use('/api/v1/workflows', workflowRoute);
app.use('/api/v1/audit-logs', auditRoute);
app.use('/api/v1/org', orgRoute);
app.use('/api/v1/attendance-policy', attendancePolicyRoute);
app.use('/api/v1/payroll', payrollRoute);
app.use('/api/v1/sessions', sessionRoute);
app.use('/api/v1/integrations', integrationRoute);
app.use('/api/v1/jobs', jobRoute);
app.use('/api/v1/reporting', reportingRoute);
app.use('/api/v1/leave-policy', leavePolicyRoute);

const startServer = async () => {
  await connectDB();
  await bootstrapPlatform();
  registerIntegrationProcessors();
  registerReportingProcessors();
  registerLeaveProcessors();
  startAsyncJobScheduler();
  startReportSchedulePolling();

  app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Fatal startup error:', error.message);
  process.exit(1);
});
