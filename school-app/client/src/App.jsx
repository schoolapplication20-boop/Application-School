import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import Attendance from './pages/teacher/Attendance';
import Assignments from './pages/teacher/Assignments';
import Marks from './pages/teacher/Marks';

// Parent Pages
import ParentDashboard from './pages/parent/ParentDashboard';
import Performance from './pages/parent/Performance';
import AttendanceView from './pages/parent/AttendanceView';
import AssignmentsView from './pages/parent/AssignmentsView';
import PayFees from './pages/parent/PayFees';
import Messages from './pages/parent/Messages';

// Global Styles
import './styles/App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth Routes (public) */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-identity" element={<VerifyIdentity />} />
          <Route path="/enter-otp" element={<EnterOTP />} />
          <Route path="/set-new-password" element={<SetNewPassword />} />

          {/* Protected: Reset Password (logged-in users) */}
          <Route
            path="/reset-password"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'PARENT']}>
                <ResetPassword />
              </ProtectedRoute>
            }
          />

          {/* ===== ADMIN ROUTES ===== */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Teachers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Classes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fees"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Fees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/expenses"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Expenses />
              </ProtectedRoute>
            }
          />

          {/* ===== TEACHER ROUTES ===== */}
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/attendance"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/assignments"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <Assignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/marks"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <Marks />
              </ProtectedRoute>
            }
          />

          {/* ===== PARENT ROUTES ===== */}
          <Route
            path="/parent/dashboard"
            element={
              <ProtectedRoute allowedRoles={['PARENT']}>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/performance"
            element={
              <ProtectedRoute allowedRoles={['PARENT']}>
                <Performance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/attendance"
            element={
              <ProtectedRoute allowedRoles={['PARENT']}>
                <AttendanceView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/assignments"
            element={
              <ProtectedRoute allowedRoles={['PARENT']}>
                <AssignmentsView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/fees"
            element={
              <ProtectedRoute allowedRoles={['PARENT']}>
                <PayFees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/messages"
            element={
              <ProtectedRoute allowedRoles={['PARENT']}>
                <Messages />
              </ProtectedRoute>
            }
          />

          {/* 404 - Catch all */}
          <Route
            path="*"
            element={
              <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', background: '#f7fafc', gap: '16px'
              }}>
                <span className="material-icons" style={{ fontSize: '64px', color: '#e2e8f0' }}>error_outline</span>
                <h1 style={{ fontSize: '48px', fontWeight: 800, color: '#e2e8f0', margin: 0 }}>404</h1>
                <p style={{ fontSize: '18px', color: '#a0aec0', marginBottom: '24px' }}>Page not found</p>
                <a href="/login" style={{ padding: '12px 28px', background: '#76C442', color: '#fff', borderRadius: '10px', fontWeight: 600, textDecoration: 'none' }}>
                  Go to Login
                </a>
              </div>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
