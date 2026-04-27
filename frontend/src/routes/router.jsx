import { Navigate, Route, Routes } from 'react-router-dom';

// Employee Routes
// Admin Routes
import AdminAttendance from '../pages/admin/dashboard/attendance';
import AdminManageEmployees from '../pages/admin/dashboard/employees';
import AdminAddEmployee from '../pages/admin/dashboard/employees/addEmployee';
import AdminEmployeeProfile from '../pages/admin/dashboard/employees/employeeProfile';
import AdminHolidays from '../pages/admin/dashboard/holidays';
import AdminDashboardHome from '../pages/admin/dashboard/home';
import AdminLeaveManagement from '../pages/admin/dashboard/leaves';
import AdminPayroll from '../pages/admin/dashboard/payroll';
import AdminReports from '../pages/admin/dashboard/reports';
import AdminSalaryManagement from '../pages/admin/dashboard/salaries';
import AdminEmployeeSalaryProfile from '../pages/admin/dashboard/salaries/employeeSalary';
import AdminSettings from '../pages/admin/dashboard/settings';
import AdminSidebar from '../pages/admin/dashboard/sidebar';
import AdminTasks from '../pages/admin/dashboard/tasks';
import ConfirmRegistration from '../pages/auth/confirmRegistration';
import ForgotPassword from '../pages/auth/forgotPassword';
import Login from '../pages/auth/login';
import ResetPassword from '../pages/auth/resetPassword';
import Signup from '../pages/auth/signup';
import VerifyOtp from '../pages/auth/verifyOtp';
import Attendance from '../pages/employee/dashboard/attendance';
import History from '../pages/employee/dashboard/history';
import Holidays from '../pages/employee/dashboard/holidays';
import DashboardHome from '../pages/employee/dashboard/home';
import Leaves from '../pages/employee/dashboard/leaves';
import Settings from '../pages/employee/dashboard/settings';
import EmployeeTasks from '../pages/employee/dashboard/tasks';
import EmployeeSidebar from '../pages/employee/dashboard/sidebar';
import EmployeeDailyWork from '../pages/employee/dashboard/dailyWork';
import Home from '../pages/home';
import ProtectedRoute from '../routes/protectedRoute';

const AppRouter = () => {
  return (
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
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeSidebar isActive="Home" />
            <DashboardHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/attendance"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeSidebar isActive="Attendance" />
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/history"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeSidebar isActive="History" />
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/leaves"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeSidebar isActive="Leaves" />
            <Leaves />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/holidays"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeSidebar isActive="Holidays" />
            <Holidays />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/settings"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeSidebar isActive="Settings" />
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/daily-work"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeSidebar isActive="Daily Work" />
            <EmployeeDailyWork />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/dashboard/tasks"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeSidebar isActive="Tasks" />
            <EmployeeTasks />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard/home"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Home" />
            <AdminDashboardHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/attendance"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Attendance" />
            <AdminAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/employees"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Employees" />
            <AdminManageEmployees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/employees/add"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Employees" />
            <AdminAddEmployee />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/employees/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Employees" />
            <AdminEmployeeProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/salaries"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Salaries" />
            <AdminSalaryManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/salaries/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Salaries" />
            <AdminEmployeeSalaryProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/payroll"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Payroll" />
            <AdminPayroll />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/leaves"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Leaves" />
            <AdminLeaveManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/holidays"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Holidays" />
            <AdminHolidays />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/settings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Settings" />
            <AdminSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/tasks"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Tasks" />
            <AdminTasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard/reports"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSidebar isActive="Reports" />
            <AdminReports />
          </ProtectedRoute>
        }
      />

      {/* Catch-all Route for 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRouter;
