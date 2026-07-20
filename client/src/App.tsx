import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { Login } from './pages/Login';
import { WaiterDashboard } from './pages/WaiterDashboard';
import { KitchenDashboard } from './pages/KitchenDashboard';
import { BillingDashboard } from './pages/BillingDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

const queryClient = new QueryClient();

const RoleBasedRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    case 'KITCHEN':
      return <Navigate to="/kitchen" replace />;
    case 'CASHIER':
      return <Navigate to="/billing" replace />;
    default:
      return <Navigate to="/waiter" replace />;
  }
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['WAITER', 'ADMIN']} />}>
                <Route path="/waiter" element={<WaiterDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['KITCHEN', 'ADMIN']} />}>
                <Route path="/kitchen" element={<KitchenDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['CASHIER', 'ADMIN']} />}>
                <Route path="/billing" element={<BillingDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>

              {/* Home Redirect */}
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
