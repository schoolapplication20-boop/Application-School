import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { BusinessProvider } from './context/BusinessContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/routing/ProtectedRoute';
import GuestRoute from './components/routing/GuestRoute';
import PageLoader from './components/common/PageLoader';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const EmailVerificationPage = lazy(() => import('./pages/auth/EmailVerificationPage'));
const OTPVerificationPage = lazy(() => import('./pages/auth/OTPVerificationPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

const OnboardingFlow = lazy(() => import('./pages/onboarding/OnboardingFlow'));

const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout'));
const OverviewPage = lazy(() => import('./pages/dashboard/OverviewPage'));
const OrdersPage = lazy(() => import('./pages/dashboard/OrdersPage'));
const CustomersPage = lazy(() => import('./pages/dashboard/CustomersPage'));
const ProductsPage = lazy(() => import('./pages/dashboard/ProductsPage'));
const AnalyticsPage = lazy(() => import('./pages/dashboard/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'));

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
      <Route path="/verify-email" element={<GuestRoute><EmailVerificationPage /></GuestRoute>} />
      <Route path="/verify-otp" element={<GuestRoute><OTPVerificationPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

      <Route
        path="/onboarding"
        element={(
          <ProtectedRoute requireBusiness={false}>
            <OnboardingFlow />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<OverviewPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <BrowserRouter>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BusinessProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </BusinessProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export default App;
