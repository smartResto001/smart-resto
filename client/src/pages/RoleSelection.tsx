import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
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
  Eye,
  EyeOff,
  CreditCard,
  Sparkles,
  QrCode,
  Wallet,
} from 'lucide-react';

export const RoleSelection: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Forgot Password State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [accountPasswordInput, setAccountPasswordInput] = useState('');
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState('');
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Subscription Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<'UPI' | 'CARD' | 'CASH'>('UPI');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');

  const isTrialActive = user?.isTrial === true && !!user?.trialExpiresAt && new Date(user.trialExpiresAt) > new Date();
  const isPaidActive = user?.isPaid === true && (!user?.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());

  const isSubscriptionLocked =
    user?.role !== 'CHIEF_ADMIN' &&
    (user?.isLocked === true || (!isTrialActive && !isPaidActive));

  useEffect(() => {
    if (searchParams.get('unlockAdmin') === 'true' && user?.id && user.hasAdminPassword && user.role !== 'CHIEF_ADMIN') {
      sessionStorage.removeItem(`admin_unlocked_${user.id}`);
      setAdminPasswordInput('');
      setAdminPasswordError('');
      setIsAdminModalOpen(true);
    }
  }, [searchParams, user]);

  const handleRoleSelect = (route: string) => {
    if (isSubscriptionLocked) {
      setPayError('');
      setPaySuccess('');
      setIsPayModalOpen(true);
      return;
    }

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

  const handleCompleteSubscriptionPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');
    setPaySuccess('');
    setIsProcessingPayment(true);
    try {
      const res = await API.post('/auth/pay-subscription', {
        paymentMethod: payMethod,
      });
      updateUser(res.data.user);
      setPaySuccess(res.data.message || 'Payment complete! Role dashboards unlocked.');
      setTimeout(() => {
        setIsPayModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setPayError(err.response?.data?.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
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
        {/* Status Pill or Subscription Lock / Active Trial Banner */}
        {isSubscriptionLocked ? (
          <div className="w-full max-w-4xl mb-6 bg-gradient-to-r from-rose-950/80 via-slate-900/90 to-amber-950/80 border border-rose-800/80 rounded-3xl p-5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl shrink-0">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-white text-base sm:text-lg">Trial Expired / Access Locked</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                    Subscription Required
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Your free trial period has ended. Upgrade to Chief Admin's set plan to unlock all workstation dashboards.
                </p>
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-amber-300 font-bold mt-2">
                  <span className="bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800">
                    Plan: <strong>{user?.planName || 'Basic'} ({user?.subscriptionMonths || 1} Mo)</strong>
                  </span>
                  <span className="bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800">
                    Rate: <strong>₹{user?.monthlyFee || 1000}/mo</strong>
                  </span>
                  {user?.discountAmount ? (
                    <span className="bg-emerald-950/70 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-800/60">
                      Discount: <strong>- ₹{user.discountAmount}</strong>
                    </span>
                  ) : null}
                  <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-lg border border-amber-500/40 text-xs font-black">
                    Total: ₹{user?.totalPayable ?? 1000}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setPayError('');
                setPaySuccess('');
                setIsPayModalOpen(true);
              }}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/30 flex items-center space-x-2 transition-all transform hover:scale-105 shrink-0"
            >
              <CreditCard className="w-4 h-4" />
              <span>Subscribe & Unlock</span>
            </button>
          </div>
        ) : isTrialActive && user?.trialExpiresAt ? (
          <div className="w-full max-w-4xl mb-6 bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-teal-950/80 border border-emerald-700/80 rounded-3xl p-5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3.5 bg-emerald-500/20 text-emerald-400 rounded-2xl shrink-0">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-white text-base sm:text-lg">
                    🎁 {user.planName || 'Basic'} Free Trial Active
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                    No Payment Required
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  You are currently enjoying your free trial! Full access is granted to all workstation dashboards before payment.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-300 font-bold mt-2">
                  <span className="bg-slate-950/80 px-3 py-1 rounded-lg border border-emerald-800/60 font-mono flex items-center space-x-1">
                    <span>⏰ Trial Expires:</span>
                    <strong className="text-emerald-400">{new Date(user.trialExpiresAt).toLocaleString()}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold shrink-0 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Full Workstation Unlocked</span>
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 shadow-inner">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Login Success • Choose Any Role Dashboard Below</span>
          </div>
        )}

        {/* Heading */}
        <img src="/app-logo-512.png" alt="SmartResto Logo" className="w-16 h-16 rounded-2xl shadow-xl shadow-amber-500/20 mb-3 object-contain" />
        <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center tracking-tight">
          Select Your Workstation
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-2 text-center max-w-xl">
          Logged in as <span className="text-amber-400 font-semibold">{user?.name || 'User'}</span> ({user?.email}). You can enter any role dashboard in this account.
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
            className={`group p-6 rounded-3xl border transition-all duration-300 cursor-pointer relative flex flex-col justify-between backdrop-blur-xl shadow-xl transform hover:-translate-y-1 ${isSubscriptionLocked ? 'border-rose-900/60 bg-rose-950/20 hover:border-rose-700' : 'border-slate-800 hover:border-purple-500/60 bg-slate-900/70 hover:bg-purple-950/30 hover:shadow-purple-950/40'}`}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3.5 rounded-2xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                  <Shield className="w-7 h-7" />
                </div>
                {isSubscriptionLocked && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>Locked</span>
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Admin</h3>
              <p className="text-xs text-purple-300 font-medium mb-3">System & Analytics</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Manage restaurant tables, food categories, menu items, staff accounts, and view sales reports.
              </p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleRoleSelect('/admin'); }}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center space-x-2 transition-all ${isSubscriptionLocked ? 'bg-rose-900/80 hover:bg-rose-800 text-rose-100' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'}`}
            >
              <span>{isSubscriptionLocked ? 'Locked • Pay to Unlock' : 'Admin Dashboard'}</span>
              {isSubscriptionLocked ? <Lock className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

          {/* 2. Waiter Dashboard */}
          <div
            onClick={() => handleRoleSelect('/waiter')}
            className={`group p-6 rounded-3xl border transition-all duration-300 cursor-pointer relative flex flex-col justify-between backdrop-blur-xl shadow-xl transform hover:-translate-y-1 ${isSubscriptionLocked ? 'border-rose-900/60 bg-rose-950/20 hover:border-rose-700' : 'border-slate-800 hover:border-blue-500/60 bg-slate-900/70 hover:bg-blue-950/30 hover:shadow-blue-950/40'}`}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3.5 rounded-2xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-7 h-7" />
                </div>
                {isSubscriptionLocked && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>Locked</span>
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Waiter</h3>
              <p className="text-xs text-blue-300 font-medium mb-3">Order Taking & Tables</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Interactive floor map, select table layout, place customer orders, and send tickets to kitchen.
              </p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleRoleSelect('/waiter'); }}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center space-x-2 transition-all ${isSubscriptionLocked ? 'bg-rose-900/80 hover:bg-rose-800 text-rose-100' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'}`}
            >
              <span>{isSubscriptionLocked ? 'Locked • Pay to Unlock' : 'Waiter Dashboard'}</span>
              {isSubscriptionLocked ? <Lock className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

          {/* 3. Kitchen KDS Dashboard */}
          <div
            onClick={() => handleRoleSelect('/kitchen')}
            className={`group p-6 rounded-3xl border transition-all duration-300 cursor-pointer relative flex flex-col justify-between backdrop-blur-xl shadow-xl transform hover:-translate-y-1 ${isSubscriptionLocked ? 'border-rose-900/60 bg-rose-950/20 hover:border-rose-700' : 'border-slate-800 hover:border-amber-500/60 bg-slate-900/70 hover:bg-amber-950/30 hover:shadow-amber-950/40'}`}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                  <ChefHat className="w-7 h-7" />
                </div>
                {isSubscriptionLocked && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>Locked</span>
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Kitchen</h3>
              <p className="text-xs text-amber-300 font-medium mb-3">Live Order Display (KDS)</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Real-time kitchen order queue, cook preparation timers, update order status to ready & served.
              </p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleRoleSelect('/kitchen'); }}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center space-x-2 transition-all ${isSubscriptionLocked ? 'bg-rose-900/80 hover:bg-rose-800 text-rose-100' : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'}`}
            >
              <span>{isSubscriptionLocked ? 'Locked • Pay to Unlock' : 'Kitchen Dashboard'}</span>
              {isSubscriptionLocked ? <Lock className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

          {/* 4. Billing Cashier Dashboard */}
          <div
            onClick={() => handleRoleSelect('/billing')}
            className={`group p-6 rounded-3xl border transition-all duration-300 cursor-pointer relative flex flex-col justify-between backdrop-blur-xl shadow-xl transform hover:-translate-y-1 ${isSubscriptionLocked ? 'border-rose-900/60 bg-rose-950/20 hover:border-rose-700' : 'border-slate-800 hover:border-emerald-500/60 bg-slate-900/70 hover:bg-emerald-950/30 hover:shadow-emerald-950/40'}`}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Receipt className="w-7 h-7" />
                </div>
                {isSubscriptionLocked && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>Locked</span>
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Billing</h3>
              <p className="text-xs text-emerald-300 font-medium mb-3">POS Checkout & Settlement</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Calculate total bills, apply discounts, collect Cash or UPI payments, and generate invoices.
              </p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleRoleSelect('/billing'); }}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center space-x-2 transition-all ${isSubscriptionLocked ? 'bg-rose-900/80 hover:bg-rose-800 text-rose-100' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'}`}
            >
              <span>{isSubscriptionLocked ? 'Locked • Pay to Unlock' : 'Billing Dashboard'}</span>
              {isSubscriptionLocked ? <Lock className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto touch-scroll">
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
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="••••••••"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                    title={showAdminPassword ? "Hide password" : "Show password"}
                  >
                    {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
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
                <div className="relative">
                  <input
                    type={showAccountPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Your main login password"
                    value={accountPasswordInput}
                    onChange={(e) => setAccountPasswordInput(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccountPassword(!showAccountPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                    title={showAccountPassword ? "Hide password" : "Show password"}
                  >
                    {showAccountPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Admin Password (Optional)</label>
                <div className="relative">
                  <input
                    type={showNewAdminPassword ? 'text' : 'password'}
                    placeholder="Enter new admin passcode (or leave blank to clear)"
                    value={newAdminPasswordInput}
                    onChange={(e) => setNewAdminPasswordInput(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                    title={showNewAdminPassword ? "Hide password" : "Show password"}
                  >
                    {showNewAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
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

      {/* Subscription Payment Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto touch-scroll">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Unlock Role Dashboards</h3>
                  <p className="text-[11px] text-slate-400">Chief Admin Subscription Checkout</p>
                </div>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {payError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
                {payError}
              </div>
            )}

            {paySuccess && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{paySuccess}</span>
              </div>
            )}

            <form onSubmit={handleCompleteSubscriptionPayment} className="space-y-4">
              {/* Pricing Breakdown Card */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                  Subscription Summary
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Duration Period</span>
                  <span className="font-bold text-white">{user?.subscriptionMonths || 1} Month(s)</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Base Monthly Rate</span>
                  <span>₹{user?.monthlyFee || 1000} / mo</span>
                </div>
                {!!user?.discountAmount && (
                  <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                    <span>Chief Special Discount</span>
                    <span>- ₹{user.discountAmount}</span>
                  </div>
                )}
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200">Total Payable Amount</span>
                  <span className="text-lg font-black text-amber-400">₹{user?.totalPayable ?? 1000}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                    { id: 'CARD', label: 'Credit Card', icon: CreditCard },
                    { id: 'CASH', label: 'Cash Payment', icon: Wallet },
                  ].map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        type="button"
                        key={method.id}
                        onClick={() => setPayMethod(method.id as any)}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center space-y-1 transition-all ${payMethod === method.id ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px]">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live UPI QR for Subscription Payment */}
              {payMethod === 'UPI' && (
                <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded-2xl text-center space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" /> Platform UPI QR
                    </span>
                    <span className="text-[9px] text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded-full border border-emerald-500/30">Direct Bank Transfer</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl inline-block shadow-lg mx-auto border-2 border-slate-800">
                    <QRCodeSVG
                      value={`upi://pay?pa=smartresto@upi&pn=Smart%20Resto%20SaaS&am=${user?.totalPayable ?? 1000}&cu=INR&tn=Subscription%20Unlock%20Payment`}
                      size={135}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">
                      Scan & Pay <span className="text-amber-400 font-extrabold">₹{user?.totalPayable ?? 1000}</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      GPay • PhonePe • Paytm • BHIM • Cred
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isProcessingPayment ? 'Processing...' : `Pay ₹${user?.totalPayable ?? 1000} & Unlock`}</span>
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
