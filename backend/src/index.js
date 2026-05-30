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
import leaveTemplateRoute from './routes/leaveTemplateRoute.js';
import lateCheckInRoute from './routes/lateCheckInRoute.js';
import salaryRoute from './routes/salaryRoute.js';
import dailyReportRoute from './routes/dailyReportRoute.js';
import payrollRoute from './routes/payrollRoute.js';
import taskRoute from './routes/taskRoute.js';
import reportRoute from './routes/reportRoute.js';
import roleRoute from './routes/roleRoute.js';
import loanAdvanceRoute from './routes/loanAdvanceRoute.js';
import extraAllowanceRoute from './routes/extraAllowanceRoute.js';
import { corsOptions, globalApiLimiter } from './middleware/security.js';
import { registerScheduledJobs, yearBoundaryGuard } from './services/scheduledJobs.js';

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

// Year-boundary guard: lazily fires the year-end floating-credit expiry on
// the first request observed in a new IST calendar year. Must run on every
// request, before route handlers, so it cannot be skipped by route-specific
// middleware.
app.use(yearBoundaryGuard);

// Connect to MongoDB and register the year-end expiry cron once the DB is up
connectDB().then(() => {
  registerScheduledJobs();
});

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
app.use('/api/v1/leave-templates', leaveTemplateRoute);
app.use('/api/v1/late-checkins', lateCheckInRoute);
app.use('/api/v1/salary', salaryRoute);
app.use('/api/v1/daily-reports', dailyReportRoute);
app.use('/api/v1/payroll', payrollRoute);
app.use('/api/v1/tasks', taskRoute);
app.use('/api/v1/reports', reportRoute);
app.use('/api/v1/roles', roleRoute);
app.use('/api/v1/loan-advances', loanAdvanceRoute);
app.use('/api/v1/extra-allowances', extraAllowanceRoute);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
