import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutGrid, ChefHat, Receipt, Shield, UserCheck } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const currentPath = location.pathname;

  const navItems = [
    {
      name: 'Role Hub',
      path: '/role-selection',
      icon: LayoutGrid,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    },
    {
      name: 'Waiter',
      path: '/waiter',
      icon: UserCheck,
      color: 'text-blue-400',
      activeBg: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
    },
    {
      name: 'Kitchen',
      path: '/kitchen',
      icon: ChefHat,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    },
    {
      name: 'Billing',
      path: '/billing',
      icon: Receipt,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    },
    {
      name: 'Admin',
      path: '/admin',
      icon: Shield,
      color: 'text-purple-400',
      activeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
    },
  ];

  const handleNavClick = (path: string) => {
    if (path === '/admin') {
      if (user?.id) {
        const isUnlocked = sessionStorage.getItem(`admin_unlocked_${user.id}`) === 'true';
        if (!isUnlocked) {
          navigate('/role-selection?unlockAdmin=true');
          return;
        }
      }
    }
    navigate(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-2xl border-t border-slate-800/90 px-2 py-2 shadow-2xl safe-area-bottom">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? `${item.activeBg} border font-bold scale-105 shadow-lg`
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? '' : 'opacity-80'}`} />
              <span className="text-[10px] tracking-tight mt-0.5">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
