import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { UtensilsCrossed, LogOut, Shield, ChefHat, Receipt, UserCheck } from 'lucide-react';
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

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-purple-400" />;
      case 'KITCHEN':
        return <ChefHat className="w-4 h-4 text-amber-400" />;
      case 'CASHIER':
        return <Receipt className="w-4 h-4 text-emerald-400" />;
      default:
        return <UserCheck className="w-4 h-4 text-blue-400" />;
    }
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'ADMIN':
        return 'bg-purple-950/70 text-purple-300 border-purple-800/50';
      case 'KITCHEN':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/50';
      case 'CASHIER':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50';
      default:
        return 'bg-blue-950/70 text-blue-300 border-blue-800/50';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <UtensilsCrossed className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-100 leading-none tracking-tight font-sans">
              Smart<span className="text-amber-400">Resto</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">RMS Portal</p>
          </div>
        </div>

        {/* Live Status & Clock */}
        <div className="hidden md:flex items-center space-x-6">
          {/* Socket Connection Live Indicator */}
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

          {/* Clock */}
          <div className="text-xs font-mono font-semibold text-slate-300 bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-700/30">
            ⏰ {currentTime}
          </div>
        </div>

        {/* User Role Badge & Profile & Logout */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className={`hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${getRoleBadgeColor()}`}>
              {getRoleIcon()}
              <span>{user?.role}</span>
            </div>

            <div className="text-right hidden lg:block">
              <p className="text-xs font-semibold text-slate-200">{user?.name}</p>
              <p className="text-[10px] text-slate-400">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-slate-700/60 transition-all duration-200"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
