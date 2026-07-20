import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Shield, ChefHat, Receipt, UserCheck, Lock, Mail, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await login(email, password);
      redirectUser(user.role);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, role: string) => {
    setEmail(quickEmail);
    setPassword('password123');
    setError('');
    setIsLoading(true);

    try {
      const user = await login(quickEmail, 'password123');
      redirectUser(user.role);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const redirectUser = (role: string) => {
    switch (role) {
      case 'ADMIN':
        navigate('/admin');
        break;
      case 'WAITER':
        navigate('/waiter');
        break;
      case 'KITCHEN':
        navigate('/kitchen');
        break;
      case 'CASHIER':
        navigate('/billing');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 shadow-xl shadow-amber-500/20 mb-3">
            <UtensilsCrossed className="w-8 h-8 text-slate-950" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">SmartResto Portal</h2>
          <p className="text-slate-400 text-xs mt-1">Sign in to your role dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="staff@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Test Logins */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
            ⚡ 1-Click Role Login Demo
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickLogin('admin@restaurant.com', 'ADMIN')}
              className="flex items-center space-x-2 p-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-950/70 border border-purple-800/40 text-purple-300 text-xs font-medium transition-all"
            >
              <Shield className="w-4 h-4 text-purple-400 shrink-0" />
              <div className="text-left leading-tight">
                <div className="font-bold">Admin</div>
                <div className="text-[10px] text-purple-400/80">Management</div>
              </div>
            </button>

            <button
              onClick={() => handleQuickLogin('waiter@restaurant.com', 'WAITER')}
              className="flex items-center space-x-2 p-2.5 rounded-xl bg-blue-950/40 hover:bg-blue-950/70 border border-blue-800/40 text-blue-300 text-xs font-medium transition-all"
            >
              <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="text-left leading-tight">
                <div className="font-bold">Waiter</div>
                <div className="text-[10px] text-blue-400/80">Order Taking</div>
              </div>
            </button>

            <button
              onClick={() => handleQuickLogin('kitchen@restaurant.com', 'KITCHEN')}
              className="flex items-center space-x-2 p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/40 text-amber-300 text-xs font-medium transition-all"
            >
              <ChefHat className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-left leading-tight">
                <div className="font-bold">Kitchen KDS</div>
                <div className="text-[10px] text-amber-400/80">Preparation</div>
              </div>
            </button>

            <button
              onClick={() => handleQuickLogin('cashier@restaurant.com', 'CASHIER')}
              className="flex items-center space-x-2 p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/40 text-emerald-300 text-xs font-medium transition-all"
            >
              <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left leading-tight">
                <div className="font-bold">Billing</div>
                <div className="text-[10px] text-emerald-400/80">Cashier Counter</div>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
