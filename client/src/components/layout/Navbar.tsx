import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { UtensilsCrossed, LogOut, Shield, ChefHat, Receipt, UserCheck, LayoutGrid } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isRoleSelectionPage = location.pathname === '/role-selection';

  const renderSubscriptionBadge = () => {
    if (!user || user.role === 'CHIEF_ADMIN') return null;

    const isTrialActive = user.isTrial === true && !!user.trialExpiresAt && new Date(user.trialExpiresAt) > new Date();
    const isPaidActive = user.isPaid === true && (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());

    if (isTrialActive && user.trialExpiresAt) {
      const msLeft = new Date(user.trialExpiresAt).getTime() - Date.now();
      const hoursLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));
      const daysLeft = Math.floor(hoursLeft / 24);
      const remainingHours = hoursLeft % 24;

      const timeText = daysLeft > 0 ? `${daysLeft}d ${remainingHours}h left` : `${hoursLeft}h left`;

      return (
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm">
          <span className="animate-pulse">🎁</span>
          <span>{user.planName || 'Basic'} Trial ({timeText})</span>
        </div>
      );
    }

    if (isPaidActive) {
      return (
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold shadow-sm">
          <span>⭐</span>
          <span>{user.planName || 'Pro'} Active</span>
        </div>
      );
    }

    return (
      <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold shadow-sm animate-pulse">
        <span>⚠️</span>
        <span>Trial Expired</span>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/role-selection')}>
          <img src="/app-logo-512.png" alt="SmartResto Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-amber-500/20 shrink-0 object-contain" />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg text-slate-100 leading-none tracking-tight font-sans">
                Smart<span className="text-amber-400">Resto</span>
              </h1>
              <span className="md:hidden px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                📱 Mobile
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">RMS Workstation</p>
          </div>
        </div>

        {/* Live Status, Subscription & Clock */}
        <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
          {renderSubscriptionBadge()}

          <div className="flex items-center space-x-2 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50">
            <span className="relative flex h-2.5 w-2.5">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              )}
            </span>
            <span className="text-xs font-medium text-slate-300">
              {isConnected ? 'Real-Time Live' : 'Reconnecting...'}
            </span>
          </div>

          <div className="text-xs font-mono font-semibold text-slate-300 bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-700/30">
            ⏰ {currentTime}
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {!isRoleSelectionPage && (
            <button
              onClick={() => {
                if (user?.id) {
                  sessionStorage.removeItem(`admin_unlocked_${user.id}`);
                }
                navigate('/role-selection');
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all shadow-sm shrink-0 min-h-[44px] min-w-[44px] cursor-pointer"
              title="Switch Role Workstation"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Role Hub</span>
            </button>
          )}

          {/* User Profile Info (Visible on Mobile & Desktop) */}
          <div className="text-right flex flex-col justify-center min-w-0 max-w-[110px] xs:max-w-[150px] sm:max-w-[220px]">
            <p className="text-[11px] sm:text-xs font-bold text-slate-100 leading-tight truncate">
              {user?.name || 'Staff User'}
            </p>
            <p className="text-[9px] sm:text-[10px] text-amber-400 font-mono leading-tight truncate">
              {user?.email}
            </p>
          </div>

          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-slate-800 active:bg-slate-700 border border-slate-700/60 transition-all duration-200 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
