import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

// Capture beforeinstallprompt globally as early as possible
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredPWAInstallPrompt = e;
  });
}

const isStandaloneApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isStandaloneMedia =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;
  const isNavigatorStandalone = (navigator as any).standalone === true;
  const isAndroidAppReferrer = document.referrer.includes('android-app://');
  return isStandaloneMedia || isNavigatorStandalone || isAndroidAppReferrer;
};

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    typeof window !== 'undefined' ? (window as any).deferredPWAInstallPrompt : null
  );
  const [showPrompt, setShowPrompt] = useState<boolean>(true);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    // 1. Hide inside installed standalone app window (Desktop app or Mobile installed app)
    if (isStandaloneApp()) {
      setShowPrompt(false);
      return;
    }

    // 2. Check if user dismissed it in current session
    if (sessionStorage.getItem('pwa_banner_dismissed') === 'true') {
      setShowPrompt(false);
      return;
    }

    const checkIfDesktop = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsDesktop(!isMobileDevice && window.innerWidth >= 768);
    };

    checkIfDesktop();
    window.addEventListener('resize', checkIfDesktop);

    if ((window as any).deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPWAInstallPrompt = e;
      setDeferredPrompt(e);
      if (!isStandaloneApp() && sessionStorage.getItem('pwa_banner_dismissed') !== 'true') {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      (window as any).deferredPWAInstallPrompt = null;
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('resize', checkIfDesktop);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
    setShowPrompt(false);
  };

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPWAInstallPrompt;

    if (promptEvent) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setShowPrompt(false);
        }
        setDeferredPrompt(null);
        (window as any).deferredPWAInstallPrompt = null;
      } catch (err) {
        console.error('PWA install error:', err);
      }
    } else {
      alert(
        isDesktop
          ? 'To add SmartResto app icon to your Desktop:\n1. Click the Install icon (⊕ or 💻) in your browser address bar at top right.\nOR\n2. Open browser menu (⋮) -> Cast, save & share -> Install SmartResto.'
          : 'To install SmartResto Mobile App:\nOpen browser menu (⋮ or Share icon) and select "Add to Home Screen" or "Install App".'
      );
    }
  };

  if (!showPrompt || isStandaloneApp()) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between animate-bounce">
      <div className="flex items-center space-x-3">
        <img
          src="/logo.png"
          alt="SmartResto App Icon"
          className="w-10 h-10 rounded-xl shadow-md shrink-0 object-contain"
        />
        <div>
          <h4 className="font-extrabold text-xs">
            {isDesktop ? 'Add SmartResto to Desktop' : 'Install SmartResto Mobile App'}
          </h4>
          <p className="text-[10px] font-medium opacity-90">
            {isDesktop
              ? 'Add 1-tap workstation app icon to system desktop'
              : 'Add to home screen for 1-tap workstation access'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 bg-slate-950 text-amber-400 font-extrabold text-xs rounded-xl flex items-center space-x-1 shadow-md hover:bg-slate-900 transition-all cursor-pointer whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isDesktop ? 'Add to Desktop' : 'Install'}</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-slate-950 hover:opacity-75 cursor-pointer"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
