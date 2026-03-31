import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyIdentity from './pages/auth/VerifyIdentity';
import EnterOTP from './pages/auth/EnterOTP';
import SetNewPassword from './pages/auth/SetNewPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import Students from './pages/admin/Students';
import Teachers from './pages/admin/Teachers';
import Classes from './pages/admin/Classes';
import Fees from './pages/admin/Fees';
import Expenses from './pages/admin/Expenses';
import Applications from './pages/admin/Applications';
import CollectFee from './pages/admin/CollectFee';
import Salaries from './pages/admin/Salaries';
import LeaveManagement from './pages/admin/LeaveManagement';
import Transport from './pages/admin/Transport';
import AttendanceReport from './pages/admin/AttendanceReport';
import Parents from './pages/admin/Parents';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import Schedule from './pages/teacher/Schedule';
import Attendance from './pages/teacher/Attendance';
import Assignments from './pages/teacher/Assignments';
import Marks from './pages/teacher/Marks';
import Homework from './pages/teacher/Homework';
import LeaveApproval from './pages/teacher/LeaveApproval';
import TeacherMessages from './pages/teacher/TeacherMessages';
import TeacherLeaveRequest from './pages/teacher/TeacherLeaveRequest';

// Super Admin Pages
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import AdminManagement from './pages/superadmin/AdminManagement';
import Timetable from './pages/admin/Timetable';

// Examination & Certificates Pages
import Examination from './pages/admin/Examination';
import ExaminationView from './pages/teacher/ExaminationView';
import ExaminationPortal from './pages/parent/ExaminationPortal';

// Parent Pages
import ParentDashboard from './pages/parent/ParentDashboard';
import Performance from './pages/parent/Performance';
import AttendanceView from './pages/parent/AttendanceView';
import AssignmentsView from './pages/parent/AssignmentsView';
import PayFees from './pages/parent/PayFees';
import Messages from './pages/parent/Messages';
import LeaveRequest from './pages/parent/LeaveRequest';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-identity" element={<VerifyIdentity />} />
            <Route path="/enter-otp" element={<EnterOTP />} />
            <Route path="/set-new-password" element={<SetNewPassword />} />
            <Route path="/reset-password" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'PARENT']}>
                <ResetPassword />
              </ProtectedRoute>
            } />

            {/* Admin Routes — SUPER_ADMIN has full access; permKey enforces module-level permission for restricted admins */}
            <Route path="/admin/dashboard"         element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/students"          element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="students"><Students /></ProtectedRoute>} />
            <Route path="/admin/teachers"          element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="teachers"><Teachers /></ProtectedRoute>} />
            <Route path="/admin/classes"           element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="classes"><Classes /></ProtectedRoute>} />
            <Route path="/admin/fees"              element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="fees"><Fees /></ProtectedRoute>} />
            <Route path="/admin/expenses"          element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="expenses"><Expenses /></ProtectedRoute>} />
            <Route path="/admin/applications"      element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="applications"><Applications /></ProtectedRoute>} />
            <Route path="/admin/collect-fee"       element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="collectFee"><CollectFee /></ProtectedRoute>} />
            <Route path="/admin/salaries"          element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="salaries"><Salaries /></ProtectedRoute>} />
            <Route path="/admin/leave"             element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="leave"><LeaveManagement /></ProtectedRoute>} />
            <Route path="/admin/transport"         element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="transport"><Transport /></ProtectedRoute>} />
            <Route path="/admin/attendance-report" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="attendance"><AttendanceReport /></ProtectedRoute>} />
            <Route path="/admin/parents"           element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="parents"><Parents /></ProtectedRoute>} />
            <Route path="/admin/timetable"         element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="timetable"><Timetable /></ProtectedRoute>} />
            <Route path="/admin/examination"       element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="examination"><Examination /></ProtectedRoute>} />

            {/* Super Admin Routes */}
            <Route path="/superadmin/dashboard"       element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><SuperAdminDashboard /></ProtectedRoute>} />
            <Route path="/superadmin/admins"          element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminManagement /></ProtectedRoute>} />

            {/* Teacher Routes */}
            <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/schedule" element={<ProtectedRoute allowedRoles={['TEACHER']}><Schedule /></ProtectedRoute>} />
            <Route path="/teacher/attendance" element={<ProtectedRoute allowedRoles={['TEACHER']}><Attendance /></ProtectedRoute>} />
            <Route path="/teacher/assignments" element={<ProtectedRoute allowedRoles={['TEACHER']}><Assignments /></ProtectedRoute>} />
            <Route path="/teacher/marks" element={<ProtectedRoute allowedRoles={['TEACHER']}><Marks /></ProtectedRoute>} />
            <Route path="/teacher/homework" element={<ProtectedRoute allowedRoles={['TEACHER']}><Homework /></ProtectedRoute>} />
            <Route path="/teacher/leave-approval" element={<ProtectedRoute allowedRoles={['TEACHER']}><LeaveApproval /></ProtectedRoute>} />
            <Route path="/teacher/messages" element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherMessages /></ProtectedRoute>} />
            <Route path="/teacher/leave-request" element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherLeaveRequest /></ProtectedRoute>} />
            <Route path="/teacher/examination"   element={<ProtectedRoute allowedRoles={['TEACHER']}><ExaminationView /></ProtectedRoute>} />

            {/* Parent Routes */}
            <Route path="/parent/dashboard" element={<ProtectedRoute allowedRoles={['PARENT']}><ParentDashboard /></ProtectedRoute>} />
            <Route path="/parent/performance" element={<ProtectedRoute allowedRoles={['PARENT']}><Performance /></ProtectedRoute>} />
            <Route path="/parent/attendance" element={<ProtectedRoute allowedRoles={['PARENT']}><AttendanceView /></ProtectedRoute>} />
            <Route path="/parent/assignments" element={<ProtectedRoute allowedRoles={['PARENT']}><AssignmentsView /></ProtectedRoute>} />
            <Route path="/parent/pay-fees" element={<ProtectedRoute allowedRoles={['PARENT']}><PayFees /></ProtectedRoute>} />
            <Route path="/parent/fees" element={<ProtectedRoute allowedRoles={['PARENT']}><PayFees /></ProtectedRoute>} />
            <Route path="/parent/messages" element={<ProtectedRoute allowedRoles={['PARENT']}><Messages /></ProtectedRoute>} />
            <Route path="/parent/leave"        element={<ProtectedRoute allowedRoles={['PARENT']}><LeaveRequest /></ProtectedRoute>} />
            <Route path="/parent/examination"  element={<ProtectedRoute allowedRoles={['PARENT']}><ExaminationPortal /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={
              <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f7fafc', gap: '16px' }}>
                <span className="material-icons" style={{ fontSize: '64px', color: '#e2e8f0' }}>error_outline</span>
                <h1 style={{ fontSize: '48px', fontWeight: 800, color: '#e2e8f0', margin: 0 }}>404</h1>
                <p style={{ fontSize: '18px', color: '#a0aec0', marginBottom: '24px' }}>Page not found</p>
                <a href="/login" style={{ padding: '12px 28px', background: '#76C442', color: '#fff', borderRadius: '10px', fontWeight: 600, textDecoration: 'none' }}>Go to Login</a>
              </div>
            } />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
