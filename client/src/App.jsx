import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SchoolProvider } from './context/SchoolContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import MarketingLayout from './components/MarketingLayout';
import InstallPrompt from './components/InstallPrompt';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
// Marketing Pages
import HomePage from './pages/marketing/HomePage';
import SolutionsPage from './pages/marketing/SolutionsPage';
import AboutUsPage from './pages/marketing/AboutUsPage';
import ContactUsPage from './pages/marketing/ContactUsPage';
import CareersPage from './pages/marketing/CareersPage';
import BookDemoPage from './pages/marketing/BookDemoPage';

// Auth Pages
import Login from './pages/auth/Login';
import OwnerLogin from './pages/auth/OwnerLogin';
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
import TeacherAttendanceView from './pages/admin/TeacherAttendanceView';
import Parents from './pages/admin/Parents';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import MyStudents from './pages/teacher/MyStudents';
import Schedule from './pages/teacher/Schedule';
import Attendance from './pages/teacher/Attendance';
import Marks from './pages/teacher/Marks';
import Homework from './pages/teacher/Homework';
import LeaveApproval from './pages/teacher/LeaveApproval';
import TeacherMessages from './pages/teacher/TeacherMessages';
import TeacherLeaveRequest from './pages/teacher/TeacherLeaveRequest';
import TeacherSelfAttendance from './pages/teacher/TeacherSelfAttendance';

// Super Admin Pages
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import AdminManagement from './pages/superadmin/AdminManagement';
import ExamSchedulePage from './pages/superadmin/ExamSchedulePage';
import SetupSchool from './pages/superadmin/SetupSchool';
import Timetable from './pages/admin/Timetable';

// Examination & Certificates Pages
import Examination from './pages/admin/Examination';
import ExaminationView from './pages/teacher/ExaminationView';

// Student Pages
import StudentDashboard      from './pages/student/StudentDashboard';
import StudentAttendance     from './pages/student/StudentAttendance';
import StudentDiary          from './pages/student/StudentDiary';
import StudentFees           from './pages/student/StudentFees';
import StudentLeaveRequest   from './pages/student/StudentLeaveRequest';
import StudentMessages       from './pages/student/StudentMessages';
import StudentExams          from './pages/student/StudentExams';
import StudentMarks          from './pages/student/StudentMarks';

// Admin Messages
import AdminMessages         from './pages/admin/AdminMessages';

// School Settings
import SchoolSettings        from './pages/admin/SchoolSettings';

// 404
import NotFound              from './pages/NotFound';


function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
      <NotificationProvider>
        <Router>
          <InstallPrompt />
          <SessionTimeoutWarning />
          <Routes>
            {/* Marketing Routes - Public */}
            <Route path="/marketing/home" element={
              <MarketingLayout>
                <HomePage />
              </MarketingLayout>
            } />
            <Route path="/marketing/solutions" element={
              <MarketingLayout>
                <SolutionsPage />
              </MarketingLayout>
            } />
            <Route path="/marketing/contact" element={
              <MarketingLayout>
                <ContactUsPage />
              </MarketingLayout>
            } />
            <Route path="/marketing/about" element={
              <MarketingLayout>
                <AboutUsPage />
              </MarketingLayout>
            } />
            <Route path="/marketing/careers" element={
              <MarketingLayout>
                <CareersPage />
              </MarketingLayout>
            } />
            <Route path="/marketing/demo" element={
              <MarketingLayout>
                <BookDemoPage />
              </MarketingLayout>
            } />
            
            {/* Root: redirect to login when running as installed PWA (standalone),
                otherwise show the marketing home page for browser visitors */}
            <Route path="/" element={
              window.matchMedia('(display-mode: standalone)').matches ||
              window.navigator.standalone === true
                ? <Navigate to="/login" replace />
                : <MarketingLayout><HomePage /></MarketingLayout>
            } />

            {/* Auth Routes */}
            <Route path="/login"       element={<Login />} />
            <Route path="/owner-login" element={<OwnerLogin />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-identity" element={<VerifyIdentity />} />
            <Route path="/enter-otp" element={<EnterOTP />} />
            <Route path="/set-new-password" element={<SetNewPassword />} />
            <Route path="/reset-password" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT']}>
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
            <Route path="/admin/attendance-report"    element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="attendance"><AttendanceReport /></ProtectedRoute>} />
            <Route path="/admin/teacher-attendance"   element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><TeacherAttendanceView /></ProtectedRoute>} />
            <Route path="/admin/parents"           element={<ProtectedRoute allowedRoles={['ADMIN']} permKey="parents"><Parents /></ProtectedRoute>} />
            <Route path="/admin/timetable"         element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="timetable"><Timetable /></ProtectedRoute>} />
            <Route path="/admin/examination"       element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="examination"><Examination /></ProtectedRoute>} />

            {/* /superadmin/dashboard:
                - APPLICATION_OWNER → OwnerDashboard (platform overview, manage all schools)
                - SUPER_ADMIN       → SchoolDashboard (their school overview)
                SuperAdminDashboard component routes internally based on role. */}
            <Route path="/superadmin/dashboard" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'APPLICATION_OWNER']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />

            {/* SUPER_ADMIN-only school management routes.
                APPLICATION_OWNER is blocked here by ProtectedRoute — they manage
                schools via the platform dashboard, not these school-level pages. */}
            <Route path="/superadmin/admins"            element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminManagement /></ProtectedRoute>} />
            <Route path="/superadmin/exam-schedule"     element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><ExamSchedulePage /></ProtectedRoute>} />
            <Route path="/superadmin/setup-school"      element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><SetupSchool /></ProtectedRoute>} />

            {/* Teacher Routes */}
            <Route path="/teacher/dashboard"     element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/my-students"   element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="students"><MyStudents /></ProtectedRoute>} />
            <Route path="/teacher/schedule"      element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="timetable"><Schedule /></ProtectedRoute>} />
            <Route path="/teacher/attendance"    element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="attendance"><Attendance /></ProtectedRoute>} />
            <Route path="/teacher/marks"         element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="examination"><Marks /></ProtectedRoute>} />
            <Route path="/teacher/diary"         element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="diary"><Homework /></ProtectedRoute>} />
            <Route path="/teacher/leave-approval" element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="leave"><LeaveApproval /></ProtectedRoute>} />
            <Route path="/teacher/messages"      element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="messages"><TeacherMessages /></ProtectedRoute>} />
            <Route path="/teacher/leave-request" element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="leave"><TeacherLeaveRequest /></ProtectedRoute>} />
            <Route path="/teacher/examination"   element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="examination"><ExaminationView /></ProtectedRoute>} />
            <Route path="/teacher/my-attendance" element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="attendance"><TeacherSelfAttendance /></ProtectedRoute>} />

            {/* Student Routes */}
            <Route path="/student/dashboard"  element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="attendance"><StudentAttendance /></ProtectedRoute>} />
            <Route path="/student/diary"      element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="diary"><StudentDiary /></ProtectedRoute>} />
            <Route path="/student/fees"       element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="fees"><StudentFees /></ProtectedRoute>} />
            <Route path="/student/leave"      element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="leave"><StudentLeaveRequest /></ProtectedRoute>} />
            <Route path="/student/messages"   element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="messages"><StudentMessages /></ProtectedRoute>} />
            <Route path="/student/exams"      element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="examination"><StudentExams /></ProtectedRoute>} />
            <Route path="/student/marks"      element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="examination"><StudentMarks /></ProtectedRoute>} />

            {/* Admin Messages */}
            <Route path="/admin/messages"     element={<ProtectedRoute allowedRoles={['ADMIN','SUPER_ADMIN']} permKey="messages"><AdminMessages /></ProtectedRoute>} />

            {/* School Settings */}
            <Route path="/admin/settings"     element={<ProtectedRoute allowedRoles={['ADMIN','SUPER_ADMIN']}><SchoolSettings /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </NotificationProvider>
      </SchoolProvider>
    </AuthProvider>
  );
}

export default App;
