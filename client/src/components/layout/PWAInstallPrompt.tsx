import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between animate-bounce">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-slate-950/20 rounded-xl">
          <Smartphone className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <h4 className="font-extrabold text-xs">Install SmartResto Mobile App</h4>
          <p className="text-[10px] font-medium opacity-90">Add to home screen for 1-tap workstation access</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 bg-slate-950 text-amber-400 font-extrabold text-xs rounded-xl flex items-center space-x-1 shadow-md hover:bg-slate-900 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-1 text-slate-950 hover:opacity-75"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
