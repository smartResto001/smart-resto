import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { Login } from './pages/Login';
import { RoleSelection } from './pages/RoleSelection';
import { WaiterDashboard } from './pages/WaiterDashboard';
import { KitchenDashboard } from './pages/KitchenDashboard';
import { BillingDashboard } from './pages/BillingDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ChiefAdminDashboard } from './pages/ChiefAdminDashboard';
import { ChiefAdminLogin } from './pages/ChiefAdminLogin';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RoleBasedRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'CHIEF_ADMIN') return <Navigate to="/chief-admin" replace />;
  return <Navigate to="/role-selection" replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Primary Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/chief-admin/login" element={<ChiefAdminLogin />} />
              <Route path="/chief-admin-login" element={<ChiefAdminLogin />} />

              {/* Protected Workstation Routes for Logged In Accounts */}
              <Route element={<ProtectedRoute />}>
                <Route path="/role-selection" element={<RoleSelection />} />
                <Route path="/chief-admin" element={<ChiefAdminDashboard />} />
                <Route path="/waiter" element={<WaiterDashboard />} />
                <Route path="/kitchen" element={<KitchenDashboard />} />
                <Route path="/billing" element={<BillingDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>

              {/* Root & Fallback Redirects */}
              <Route path="/" element={<RoleBasedRedirect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
