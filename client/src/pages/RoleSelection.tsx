import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../services/api';
import {
  Shield,
  ChefHat,
  Receipt,
  UserCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  X,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

export const RoleSelection: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Forgot Password State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [accountPasswordInput, setAccountPasswordInput] = useState('');
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (searchParams.get('unlockAdmin') === 'true' && user?.id && user.hasAdminPassword && user.role !== 'CHIEF_ADMIN') {
      sessionStorage.removeItem(`admin_unlocked_${user.id}`);
      setAdminPasswordInput('');
      setAdminPasswordError('');
      setIsAdminModalOpen(true);
    }
  }, [searchParams, user]);

  const handleRoleSelect = (route: string) => {
    if (route === '/admin') {
      if (!user?.hasAdminPassword || user?.role === 'CHIEF_ADMIN') {
        navigate('/admin');
        return;
      }
      if (user?.id && sessionStorage.getItem(`admin_unlocked_${user.id}`) === 'true') {
        navigate('/admin');
        return;
      }
      setAdminPasswordInput('');
      setAdminPasswordError('');
      setIsAdminModalOpen(true);
      return;
    }
    navigate(route);
  };

  const handleVerifyAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordError('');
    setIsVerifying(true);
    try {
      await API.post('/auth/admin-password/verify', { password: adminPasswordInput });
      if (user?.id) {
        sessionStorage.setItem(`admin_unlocked_${user.id}`, 'true');
      }
      setIsAdminModalOpen(false);
      navigate('/admin');
    } catch (err: any) {
      setAdminPasswordError(err.response?.data?.message || 'Incorrect Admin password');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setIsResetting(true);
    try {
      const res = await API.post('/auth/admin-password/reset', {
        accountPassword: accountPasswordInput,
        newAdminPassword: newAdminPasswordInput,
      });
      updateUser(res.data.user);
      if (res.data.user?.id) {
        sessionStorage.setItem(`admin_unlocked_${res.data.user.id}`, 'true');
      }
      setResetSuccess(res.data.message || 'Admin password updated successfully!');
      setTimeout(() => {
        setIsResetModalOpen(false);
        setIsAdminModalOpen(false);
        navigate('/admin');
      }, 1000);
    } catch (err: any) {
      setResetError(err.response?.data?.message || 'Failed to reset Admin password');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background Lighting Effects */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content Area */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 py-8 flex-1 flex flex-col items-center">
        {/* Status Pill */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 shadow-inner">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Login Success • Choose Any Role Dashboard Below</span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center tracking-tight">
          Select Your Workstation
        </h2>
        <p className="text-slate-400 text-sm mt-2 text-center max-w-xl">
          Logged in as <span className="text-amber-400 font-semibold">{user?.name || 'User'}</span>. You can enter any role dashboard in this account.
        </p>

        {/* Chief Admin Master Control Card (Featured if Chief Admin or available) */}
        {user?.role === 'CHIEF_ADMIN' && (
          <div className="w-full mt-6">
            <div
              onClick={() => navigate('/chief-admin')}
              className="group p-6 rounded-3xl border border-purple-500/40 hover:border-purple-400 bg-gradient-to-r from-purple-950/60 via-slate-900/80 to-indigo-950/60 backdrop-blur-xl shadow-2xl shadow-purple-950/50 hover:shadow-purple-600/30 transition-all duration-300 cursor-pointer flex flex-col md:flex-row items-center justify-between gap-6 transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-4">
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform shrink-0">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-black text-white">Chief Admin Control Center</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/30 text-purple-200 border border-purple-400/40 uppercase">
                      Master Owner
                    </span>
                  </div>
                  <p className="text-xs text-purple-300 font-medium mt-0.5">SaaS Platform & Multi-Hotel Management</p>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">
                    Manage all hotel accounts across the platform, lock/unlock access, provision new hotels, and control account removals.
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/chief-admin');
                }}
                className="py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-lg shadow-purple-600/40 flex items-center space-x-2 transition-all shrink-0"
              >
                <span>Enter Control Center</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 4 Role Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mt-8">

          {/* 1. Admin Dashboard */}
          <div
            onClick={() => handleRoleSelect('/admin')}
            className="group p-6 rounded-3xl border border-slate-800 hover:border-purple-500/60 bg-slate-900/70 hover:bg-purple-950/30 transition-all duration-300 cursor-pointer relative flex flex-col justify-between backdrop-blur-xl shadow-xl hover:shadow-purple-950/40 transform hover:-translate-y-1"
          >
            <div>
              <div className="p-3.5 rounded-2xl bg-purple-500/20 text-purple-400 w-fit mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Admin</h3>
              <p className="text-xs text-purple-300 font-medium mb-3">System & Analytics</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Manage restaurant tables, food categories, menu items, staff accounts, and view sales reports.
              </p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleRoleSelect('/admin'); }}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              <span>Admin Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 2. Waiter Dashboard */}
          <div
            onClick={() => handleRoleSelect('/waiter')}
            className="group p-6 rounded-3xl border border-slate-800 hover:border-blue-500/60 bg-slate-900/70 hover:bg-blue-950/30 transition-all duration-300 cursor-pointer relative flex flex-col justify-between backdrop-blur-xl shadow-xl hover:shadow-blue-950/40 transform hover:-translate-y-1"
          >
            <div>
              <div className="p-3.5 rounded-2xl bg-blue-500/20 text-blue-400 w-fit mb-4 group-hover:scale-110 transition-transform">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Waiter</h3>
              <p className="text-xs text-blue-300 font-medium mb-3">Order Taking & Tables</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Interactive floor map, select table layout, place customer orders, and send tickets to kitchen.
              </p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleRoleSelect('/waiter'); }}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              <span>Waiter Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 3. Kitchen KDS Dashboard */}
          <div
            onClick={() => handleRoleSelect('/kitchen')}
            className="group p-6 rounded-3xl border border-slate-800 hover:border-amber-500/60 bg-slate-900/70 hover:bg-amber-950/30 transition-all duration-300 cursor-pointer relative flex flex-col justify-between backdrop-blur-xl shadow-xl hover:shadow-amber-950/40 transform hover:-translate-y-1"
          >
            <div>
              <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 w-fit mb-4 group-hover:scale-110 transition-transform">
                <ChefHat className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Kitchen</h3>
              <p className="text-xs text-amber-300 font-medium mb-3">Live Order Display (KDS)</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Real-time kitchen order queue, cook preparation timers, update order status to ready & served.
              </p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleRoleSelect('/kitchen'); }}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/30 flex items-center justify-center space-x-2 transition-all"
            >
              <span>Kitchen Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 4. Billing Cashier Dashboard */}
          <div
            onClick={() => handleRoleSelect('/billing')}
            className="group p-6 rounded-3xl border border-slate-800 hover:border-emerald-500/60 bg-slate-900/70 hover:bg-emerald-950/30 transition-all duration-300 cursor-pointer relative flex flex-col justify-between backdrop-blur-xl shadow-xl hover:shadow-emerald-950/40 transform hover:-translate-y-1"
          >
            <div>
              <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-400 w-fit mb-4 group-hover:scale-110 transition-transform">
                <Receipt className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Billing</h3>
              <p className="text-xs text-emerald-300 font-medium mb-3">POS Checkout & Settlement</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Calculate total bills, apply discounts, collect Cash or UPI payments, and generate invoices.
              </p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleRoleSelect('/billing'); }}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              <span>Billing Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 py-5 px-6 text-center text-xs text-slate-500">
        SmartResto Application • Universal Role Access Workstation
      </footer>

      {/* Admin Password Security Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-base">Enter Admin Password</h3>
              </div>
              <button onClick={() => setIsAdminModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              This account requires an Admin Dashboard passcode to enter.
            </p>

            {adminPasswordError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
                {adminPasswordError}
              </div>
            )}

            <form onSubmit={handleVerifyAdminPassword} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-300">Admin Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetModalOpen(true);
                      setAccountPasswordInput('');
                      setNewAdminPasswordInput('');
                      setResetError('');
                      setResetSuccess('');
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 hover:underline font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="••••••••"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !adminPasswordInput.trim()}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg"
                >
                  {isVerifying ? 'Verifying...' : 'Unlock Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot / Reset Admin Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-base">Reset Admin Password</h3>
              </div>
              <button onClick={() => setIsResetModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter your main <span className="text-amber-400 font-bold">{user?.email}</span> Account Login Password to verify ownership and reset your Admin Dashboard password.
            </p>

            {resetError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetAdminPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Login Password *</label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Your main login password"
                  value={accountPasswordInput}
                  onChange={(e) => setAccountPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Admin Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Enter new admin passcode (or leave blank to clear)"
                  value={newAdminPasswordInput}
                  onChange={(e) => setNewAdminPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !accountPasswordInput.trim()}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg disabled:opacity-50"
                >
                  {isResetting ? 'Resetting...' : 'Reset & Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelection;
