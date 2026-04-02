/* eslint-disable simple-import-sort/imports */
import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { PERMISSIONS } from '../constants/permissions';
import ProtectedRoute from '../routes/protectedRoute';

const AdminAttendance = lazy(() => import('../pages/admin/dashboard/attendance'));
const AdminDailyReports = lazy(() => import('../pages/admin/dashboard/dailyReports'));
const AdminManageEmployees = lazy(() => import('../pages/admin/dashboard/employees'));
const AdminEmployeeProfile = lazy(() => import('../pages/admin/dashboard/employees/employeeProfile'));
const AdminHolidays = lazy(() => import('../pages/admin/dashboard/holidays'));
const AdminDashboardHome = lazy(() => import('../pages/admin/dashboard/home'));
const AdminIntegrations = lazy(() => import('../pages/admin/dashboard/integrations'));
const AdminLeavePolicy = lazy(() => import('../pages/admin/dashboard/leavePolicy'));
const AdminLeaveManagement = lazy(() => import('../pages/admin/dashboard/leaves'));
const AdminPayrollRuns = lazy(() => import('../pages/admin/dashboard/payroll'));
const ReportsDashboard = lazy(() => import('../pages/admin/dashboard/reports'));
const AdminSalaryManagement = lazy(() => import('../pages/admin/dashboard/salaries'));
const AdminEmployeeSalaryProfile = lazy(() => import('../pages/admin/dashboard/salaries/employeeSalary'));
const AdminSecurityCenter = lazy(() => import('../pages/admin/dashboard/security'));
const AdminSettings = lazy(() => import('../pages/admin/dashboard/settings'));
const AdminSidebar = lazy(() => import('../pages/admin/dashboard/sidebar'));
const ConfirmRegistration = lazy(() => import('../pages/auth/confirmRegistration'));
const ForgotPassword = lazy(() => import('../pages/auth/forgotPassword'));
const Login = lazy(() => import('../pages/auth/login'));
const ResetPassword = lazy(() => import('../pages/auth/resetPassword'));
const Signup = lazy(() => import('../pages/auth/signup'));
const VerifyOtp = lazy(() => import('../pages/auth/verifyOtp'));
const Attendance = lazy(() => import('../pages/employee/dashboard/attendance'));
const History = lazy(() => import('../pages/employee/dashboard/history'));
const Holidays = lazy(() => import('../pages/employee/dashboard/holidays'));
const DashboardHome = lazy(() => import('../pages/employee/dashboard/home'));
const Leaves = lazy(() => import('../pages/employee/dashboard/leaves'));
const EmployeePayslips = lazy(() => import('../pages/employee/dashboard/payslips'));
const Settings = lazy(() => import('../pages/employee/dashboard/settings'));
const EmployeeSidebar = lazy(() => import('../pages/employee/dashboard/sidebar'));
const Home = lazy(() => import('../pages/home'));

const RouteLoader = () => (
  <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center text-light-text dark:text-dark-text">
    Loading...
  </div>
);

const AppRouter = () => {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/confirm-registration" element={<ConfirmRegistration />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<h1>Unauthorized Access</h1>} />

      {/* Employee Routes */}
      <Route
        path="/employee/dashboard/home"
        element={
          <ProtectedRoute
            allowedRoles={['employee']}
            allowedPermissions={[PERMISSIONS.ATTENDANCE_SELF_STATUS]}
          >
            <EmployeeSidebar isActive="Home" />
            <DashboardHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/attendance"
        element={
          <ProtectedRoute
            allowedRoles={['employee']}
            allowedPermissions={[PERMISSIONS.ATTENDANCE_SELF_CHECKIN]}
          >
            <EmployeeSidebar isActive="Attendance" />
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/history"
        element={
          <ProtectedRoute
            allowedRoles={['employee']}
            allowedPermissions={[PERMISSIONS.ATTENDANCE_SUMMARY_READ]}
          >
            <EmployeeSidebar isActive="History" />
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/leaves"
        element={
          <ProtectedRoute
            allowedRoles={['employee']}
            allowedPermissions={[PERMISSIONS.LEAVE_SELF_READ, PERMISSIONS.LEAVE_REQUEST_CREATE]}
          >
            <EmployeeSidebar isActive="Leaves" />
            <Leaves />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/holidays"
        element={
          <ProtectedRoute
            allowedRoles={['employee']}
            allowedPermissions={[PERMISSIONS.HOLIDAY_CALENDAR_READ]}
          >
            <EmployeeSidebar isActive="Holidays" />
            <Holidays />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/payslips"
        element={
          <ProtectedRoute
            allowedRoles={['employee']}
            allowedPermissions={[PERMISSIONS.PAYROLL_PAYSLIP_READ]}
          >
            <EmployeeSidebar isActive="Payslips" />
            <EmployeePayslips />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/settings"
        element={
          <ProtectedRoute
            allowedRoles={['employee']}
            allowedPermissions={[PERMISSIONS.EMPLOYEE_PROFILE_READ, PERMISSIONS.EMPLOYEE_PROFILE_UPDATE]}
          >
            <EmployeeSidebar isActive="Settings" />
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard/home"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[PERMISSIONS.ADMIN_PROFILE_READ]}
          >
            <AdminSidebar isActive="Home" />
            <AdminDashboardHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/attendance"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[PERMISSIONS.ATTENDANCE_SUMMARY_READ]}
          >
            <AdminSidebar isActive="Attendance" />
            <AdminAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/employees"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[PERMISSIONS.EMPLOYEE_DIRECTORY_READ]}
          >
            <AdminSidebar isActive="Employees" />
            <AdminManageEmployees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/employees/:id"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[PERMISSIONS.EMPLOYEE_DIRECTORY_READ]}
          >
            <AdminSidebar isActive="Employees" />
            <AdminEmployeeProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/salaries"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[PERMISSIONS.PAYROLL_SALARY_READ]}
          >
            <AdminSidebar isActive="Salaries" />
            <AdminSalaryManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/salaries/:id"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[PERMISSIONS.PAYROLL_SALARY_READ]}
          >
            <AdminSidebar isActive="Salaries" />
            <AdminEmployeeSalaryProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/payroll"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[
              PERMISSIONS.PAYROLL_RUN_READ,
              PERMISSIONS.PAYROLL_RUN_CREATE,
              PERMISSIONS.PAYROLL_RUN_VALIDATE,
            ]}
          >
            <AdminSidebar isActive="Payroll Runs" />
            <AdminPayrollRuns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/reports"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[
              PERMISSIONS.REPORTING_KPI_READ,
              PERMISSIONS.REPORTING_DRILLDOWN_READ,
              PERMISSIONS.REPORTING_SCHEDULE_MANAGE,
            ]}
          >
            <AdminSidebar isActive="Reports & BI" />
            <ReportsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/integrations"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[
              PERMISSIONS.INTEGRATION_CONFIG_MANAGE,
              PERMISSIONS.INTEGRATION_NOTIFY_SEND,
              PERMISSIONS.INTEGRATION_ACCOUNTING_EXPORT,
              PERMISSIONS.INTEGRATION_DEVICE_INGEST,
            ]}
          >
            <AdminSidebar isActive="Integrations" />
            <AdminIntegrations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/leaves"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[PERMISSIONS.LEAVE_ALL_READ]}
          >
            <AdminSidebar isActive="Leaves" />
            <AdminLeaveManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/leave-policy"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[
              PERMISSIONS.LEAVE_POLICY_MANAGE,
              PERMISSIONS.LEAVE_BALANCE_READ,
              PERMISSIONS.LEAVE_BALANCE_MANAGE,
              PERMISSIONS.LEAVE_ACCRUAL_RUN,
              PERMISSIONS.LEAVE_ENCASHMENT_MANAGE,
            ]}
          >
            <AdminSidebar isActive="Leave Policy" />
            <AdminLeavePolicy />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/holidays"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[PERMISSIONS.HOLIDAY_CALENDAR_MANAGE, PERMISSIONS.HOLIDAY_CALENDAR_READ]}
          >
            <AdminSidebar isActive="Holidays" />
            <AdminHolidays />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/daily-reports"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[PERMISSIONS.DAILY_REPORT_TEAM_READ]}
          >
            <AdminSidebar isActive="Daily Reports" />
            <AdminDailyReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/settings"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[PERMISSIONS.ADMIN_SETTINGS_READ]}
          >
            <AdminSidebar isActive="Settings" />
            <AdminSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/security"
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
            allowedPermissions={[PERMISSIONS.AUDIT_LOG_READ, PERMISSIONS.SECURITY_SESSION_READ]}
          >
            <AdminSidebar isActive="Security Center" />
            <AdminSecurityCenter />
          </ProtectedRoute>
        }
      />

      {/* Catch-all Route for 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
