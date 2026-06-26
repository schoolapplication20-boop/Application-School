import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SchoolProvider } from './context/SchoolContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import MarketingLayout from './components/MarketingLayout';
import InstallPrompt from './components/InstallPrompt';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';

// Marketing Pages
const HomePage = lazy(() => import('./pages/marketing/HomePage'));
const SolutionsPage = lazy(() => import('./pages/marketing/SolutionsPage'));
const AboutUsPage = lazy(() => import('./pages/marketing/AboutUsPage'));
const ContactUsPage = lazy(() => import('./pages/marketing/ContactUsPage'));
const CareersPage = lazy(() => import('./pages/marketing/CareersPage'));
const BookDemoPage = lazy(() => import('./pages/marketing/BookDemoPage'));

// Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const OwnerLogin = lazy(() => import('./pages/auth/OwnerLogin'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const VerifyIdentity = lazy(() => import('./pages/auth/VerifyIdentity'));
const EnterOTP = lazy(() => import('./pages/auth/EnterOTP'));
const SetNewPassword = lazy(() => import('./pages/auth/SetNewPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const StudentSignup = lazy(() => import('./pages/auth/StudentSignup'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const Students = lazy(() => import('./pages/admin/Students'));
const Teachers = lazy(() => import('./pages/admin/Teachers'));
const Classes = lazy(() => import('./pages/admin/Classes'));
const Fees = lazy(() => import('./pages/admin/Fees'));
const Expenses = lazy(() => import('./pages/admin/Expenses'));
const Applications = lazy(() => import('./pages/admin/Applications'));
const CollectFee = lazy(() => import('./pages/admin/CollectFee'));
const FeeApprovals = lazy(() => import('./pages/admin/FeeApprovals'));
const Salaries = lazy(() => import('./pages/admin/Salaries'));
const LeaveManagement = lazy(() => import('./pages/admin/LeaveManagement'));
const Transport = lazy(() => import('./pages/admin/Transport'));
const AttendanceReport = lazy(() => import('./pages/admin/AttendanceReport'));
const TeacherAttendanceView = lazy(() => import('./pages/admin/TeacherAttendanceView'));

// Teacher Pages
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const MyStudents = lazy(() => import('./pages/teacher/MyStudents'));
const Schedule = lazy(() => import('./pages/teacher/Schedule'));
const Attendance = lazy(() => import('./pages/teacher/Attendance'));
const Marks = lazy(() => import('./pages/teacher/Marks'));
const Homework = lazy(() => import('./pages/teacher/Homework'));
const LeaveApproval = lazy(() => import('./pages/teacher/LeaveApproval'));
const TeacherMessages = lazy(() => import('./pages/teacher/TeacherMessages'));
const TeacherLeaveRequest = lazy(() => import('./pages/teacher/TeacherLeaveRequest'));
const TeacherSelfAttendance = lazy(() => import('./pages/teacher/TeacherSelfAttendance'));
const Assignments = lazy(() => import('./pages/teacher/Assignments'));
const TeacherAppointments = lazy(() => import('./pages/teacher/TeacherAppointments'));
const TeacherMeetingSlots = lazy(() => import('./pages/teacher/TeacherMeetingSlots'));

// Super Admin Pages
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const AdminManagement = lazy(() => import('./pages/superadmin/AdminManagement'));
const ExamSchedulePage = lazy(() => import('./pages/superadmin/ExamSchedulePage'));
const SetupSchool = lazy(() => import('./pages/superadmin/SetupSchool'));
const DiaryMonitoring = lazy(() => import('./pages/superadmin/DiaryMonitoring'));
const StudentTransportPage = lazy(() => import('./pages/superadmin/StudentTransportPage'));
const TransportDashboard = lazy(() => import('./pages/superadmin/transport/TransportDashboard'));
const BusManagement = lazy(() => import('./pages/superadmin/transport/BusManagement'));
const DriverManagement = lazy(() => import('./pages/superadmin/transport/DriverManagement'));
const Timetable = lazy(() => import('./pages/admin/Timetable'));

// Examination & Certificates Pages
const Examination = lazy(() => import('./pages/admin/Examination'));
const ExaminationView = lazy(() => import('./pages/teacher/ExaminationView'));

// Online Exam Pages
const OnlineExams = lazy(() => import('./pages/teacher/OnlineExams'));
const OnlineExamTake = lazy(() => import('./pages/student/OnlineExamTake'));
const OnlineExamsAdmin = lazy(() => import('./pages/admin/OnlineExamsAdmin'));

// Student Pages
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentAttendance = lazy(() => import('./pages/student/StudentAttendance'));
const StudentDiary = lazy(() => import('./pages/student/StudentDiary'));
const StudentFees = lazy(() => import('./pages/student/StudentFees'));
const StudentLeaveRequest = lazy(() => import('./pages/student/StudentLeaveRequest'));
const StudentMessages = lazy(() => import('./pages/student/StudentMessages'));
const StudentExams = lazy(() => import('./pages/student/StudentExams'));
const StudentMarks = lazy(() => import('./pages/student/StudentMarks'));
const ReportCard = lazy(() => import('./pages/student/ReportCard'));
const StudentAppointments = lazy(() => import('./pages/student/StudentAppointments'));
const MeetingBookings = lazy(() => import('./pages/student/MeetingBookings'));

// Shared pages
const SchoolCalendar = lazy(() => import('./pages/shared/SchoolCalendar'));
const ReportCardHub = lazy(() => import('./pages/shared/ReportCardHub'));

// Admin Messages
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));

// Admin SMS Notifications
const SMS = lazy(() => import('./pages/admin/sms/SMS'));

// School Settings
const SchoolSettings = lazy(() => import('./pages/admin/SchoolSettings'));

// Owner Pages
const FeatureControlDashboard = lazy(() => import('./pages/owner/FeatureControlDashboard'));

// 404
const NotFound = lazy(() => import('./pages/NotFound'));


function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <SchoolProvider>
      <NotificationProvider>
      <ToastProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <InstallPrompt />
          <SessionTimeoutWarning />
          <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
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
            <Route path="/student-signup" element={<StudentSignup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
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
            <Route path="/admin/fee-approvals"     element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="fees"><FeeApprovals /></ProtectedRoute>} />
            <Route path="/admin/expenses"          element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="expenses"><Expenses /></ProtectedRoute>} />
            <Route path="/admin/applications"      element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="applications"><Applications /></ProtectedRoute>} />
            <Route path="/admin/collect-fee"       element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="collectFee"><CollectFee /></ProtectedRoute>} />
            <Route path="/admin/salaries"          element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="salaries"><Salaries /></ProtectedRoute>} />
            <Route path="/admin/leave"             element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="leave"><LeaveManagement /></ProtectedRoute>} />
            <Route path="/admin/transport"         element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="transport"><Transport /></ProtectedRoute>} />
            <Route path="/admin/attendance-report"    element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="attendance"><AttendanceReport /></ProtectedRoute>} />
            <Route path="/admin/teacher-attendance"   element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><TeacherAttendanceView /></ProtectedRoute>} />
            <Route path="/admin/timetable"         element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="timetable"><Timetable /></ProtectedRoute>} />
            <Route path="/admin/examination"       element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="examination"><Examination /></ProtectedRoute>} />
            <Route path="/admin/online-exams"      element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permKey="examination"><OnlineExamsAdmin /></ProtectedRoute>} />

            {/* APPLICATION_OWNER platform dashboard */}
            <Route path="/owner/dashboard" element={
              <ProtectedRoute allowedRoles={['APPLICATION_OWNER']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/owner/feature-control" element={
              <ProtectedRoute allowedRoles={['APPLICATION_OWNER']}>
                <FeatureControlDashboard />
              </ProtectedRoute>
            } />

            {/* SUPER_ADMIN school dashboard */}
            <Route path="/superadmin/dashboard" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />

            {/* SUPER_ADMIN-only school management routes.
                APPLICATION_OWNER is blocked here by ProtectedRoute — they manage
                schools via the platform dashboard, not these school-level pages. */}
            <Route path="/report-cards"                 element={<ProtectedRoute allowedRoles={['ADMIN','SUPER_ADMIN','TEACHER']}><ReportCardHub /></ProtectedRoute>} />
            <Route path="/superadmin/admins"            element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminManagement /></ProtectedRoute>} />
            <Route path="/superadmin/exam-schedule"     element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><ExamSchedulePage /></ProtectedRoute>} />
            <Route path="/superadmin/setup-school"      element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><SetupSchool /></ProtectedRoute>} />
            <Route path="/superadmin/diary-monitoring"  element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><DiaryMonitoring /></ProtectedRoute>} />
            <Route path="/superadmin/student-transport" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} permKey="transport"><StudentTransportPage /></ProtectedRoute>} />
            <Route path="/superadmin/transport"         element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} permKey="transport"><TransportDashboard /></ProtectedRoute>} />
            <Route path="/superadmin/transport/buses"   element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} permKey="transport"><BusManagement /></ProtectedRoute>} />
            <Route path="/superadmin/transport/drivers" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} permKey="transport"><DriverManagement /></ProtectedRoute>} />

            {/* Teacher Routes */}
            <Route path="/teacher/dashboard"      element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/my-students"    element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="students"><MyStudents /></ProtectedRoute>} />
            <Route path="/teacher/schedule"       element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="timetable"><Schedule /></ProtectedRoute>} />
            <Route path="/teacher/attendance"     element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="attendance"><Attendance /></ProtectedRoute>} />
            <Route path="/teacher/marks"          element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="examination"><Marks /></ProtectedRoute>} />
            <Route path="/teacher/diary"          element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="diary"><Homework /></ProtectedRoute>} />
            <Route path="/teacher/leave-approval" element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="leave"><LeaveApproval /></ProtectedRoute>} />
            <Route path="/teacher/messages"       element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="messages"><TeacherMessages /></ProtectedRoute>} />
            <Route path="/teacher/leave-request"  element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="leave"><TeacherLeaveRequest /></ProtectedRoute>} />
            <Route path="/teacher/examination"    element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="examination"><ExaminationView /></ProtectedRoute>} />
            <Route path="/teacher/my-attendance"  element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="attendance"><TeacherSelfAttendance /></ProtectedRoute>} />
            <Route path="/teacher/assignments"    element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="diary"><Assignments /></ProtectedRoute>} />
            <Route path="/teacher/online-exams"   element={<ProtectedRoute allowedRoles={['TEACHER']} moduleKey="examination"><OnlineExams /></ProtectedRoute>} />
            <Route path="/teacher/appointments"   element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherAppointments /></ProtectedRoute>} />
            <Route path="/teacher/meeting-slots"  element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherMeetingSlots /></ProtectedRoute>} />

            {/* Student Routes */}
            <Route path="/student/dashboard"      element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/attendance"     element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="attendance"><StudentAttendance /></ProtectedRoute>} />
            <Route path="/student/diary"          element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="diary"><StudentDiary /></ProtectedRoute>} />
            <Route path="/student/fees"           element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="fees"><StudentFees /></ProtectedRoute>} />
            <Route path="/student/leave"          element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="leave"><StudentLeaveRequest /></ProtectedRoute>} />
            <Route path="/student/messages"       element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="messages"><StudentMessages /></ProtectedRoute>} />
            <Route path="/student/exams"          element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="examination"><StudentExams /></ProtectedRoute>} />
            <Route path="/student/marks"          element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="examination"><StudentMarks /></ProtectedRoute>} />
            <Route path="/student/report-card"    element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="examination"><ReportCard /></ProtectedRoute>} />
            <Route path="/student/appointments"   element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentAppointments /></ProtectedRoute>} />
            <Route path="/student/meetings"       element={<ProtectedRoute allowedRoles={['STUDENT']}><MeetingBookings /></ProtectedRoute>} />
            <Route path="/student/online-exams"   element={<ProtectedRoute allowedRoles={['STUDENT']} moduleKey="examination"><OnlineExamTake /></ProtectedRoute>} />

            {/* Shared routes (all authenticated roles) */}
            <Route path="/school/calendar"          element={<ProtectedRoute allowedRoles={['ADMIN','SUPER_ADMIN','TEACHER','STUDENT']}><SchoolCalendar /></ProtectedRoute>} />


            {/* Admin Messages */}
            <Route path="/admin/messages"     element={<ProtectedRoute allowedRoles={['ADMIN','SUPER_ADMIN']} permKey="messages"><AdminMessages /></ProtectedRoute>} />

            {/* Admin SMS Notifications */}
            <Route path="/admin/sms"          element={<ProtectedRoute allowedRoles={['ADMIN','SUPER_ADMIN']} permKey="sms"><SMS /></ProtectedRoute>} />

            {/* School Settings */}
            <Route path="/admin/settings"     element={<ProtectedRoute allowedRoles={['ADMIN','SUPER_ADMIN']}><SchoolSettings /></ProtectedRoute>} />

            {/* WhatsApp Ordering Portal — redirect to the standalone SaaS product */}
            <Route path="/whatsapp" element={<Navigate to={import.meta.env.VITE_WOP_URL || 'https://wop.my-skoolz.com'} replace />} />
            <Route path="/whatsapp/*" element={<Navigate to={import.meta.env.VITE_WOP_URL || 'https://wop.my-skoolz.com'} replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </Router>
      </ToastProvider>
      </NotificationProvider>
      </SchoolProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
