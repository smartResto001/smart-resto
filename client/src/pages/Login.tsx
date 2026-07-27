import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import API from '../services/api';
import {
  UtensilsCrossed,
  Shield,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound,
  X,
  CheckCircle2,
} from 'lucide-react';

const GoogleIcon: React.FC = () => (
  <svg className="w-5 h-5 mr-2.5 flex-shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const Login: React.FC = () => {
  const { login, register, googleLogin, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialMode = searchParams.get('mode') === 'signup';
  const [isSignUp, setIsSignUp] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Google Account Registration Details
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [googleId, setGoogleId] = useState('');
  const [googleAvatar, setGoogleAvatar] = useState('');

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'CHIEF_ADMIN') {
        navigate('/chief-admin', { replace: true });
      } else {
        navigate('/role-selection', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsSignUp(true);
    } else if (mode === 'login') {
      setIsSignUp(false);
    }
  }, [searchParams]);

  // Google OAuth Login / Register Hook
  const handleGoogleOAuth = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setError('');
      try {
        const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const { email: gEmail, name: gName, sub: gId, picture: gAvatar } = userInfoRes.data;

        // Verify token with backend
        const response = await googleLogin({
          credential: tokenResponse.access_token,
          isRegistering: isSignUp,
          email: gEmail,
          name: gName,
          googleId: gId,
          avatar: gAvatar,
        });

        // IF USER EXISTS: Automatically log in & redirect to Role Selection
        if (response.exists && response.token) {
          if (response.user?.role === 'CHIEF_ADMIN') {
            navigate('/chief-admin');
          } else {
            navigate('/role-selection');
          }
          return;
        }

        // IF USER DOES NOT EXIST: Redirect/switch to Register page with prefilled values
        setIsSignUp(true);
        setIsGoogleUser(true);
        setEmail(gEmail || '');
        setName(gName || gEmail?.split('@')[0] || '');
        setGoogleId(gId || '');
        setGoogleAvatar(gAvatar || '');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Google Authentication failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google OAuth Login error:', error);
      setError('Google Sign-In was cancelled or encountered an error.');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignUp && !isGoogleUser && (!email || !email.trim().toLowerCase().endsWith('@gmail.com'))) {
      setError("This mail doesn't exist as a valid Gmail account (@gmail.com). Only existing Google Mail accounts can be used to create an account.");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        if (isGoogleUser) {
          // Register user with Google details (No password needed)
          const response = await googleLogin({
            email,
            name,
            googleId,
            avatar: googleAvatar,
            isRegistering: true,
          });
          if (response.user?.role === 'CHIEF_ADMIN') {
            navigate('/chief-admin');
          } else {
            navigate('/role-selection');
          }
        } else {
          // Standard Email/Password registration
          const registeredUser = await register(name, email, password, 'ADMIN');
          navigate('/role-selection');
        }
      } else {
        // Standard Email/Password login
        const loggedInUser = await login(email, password);
        if (loggedInUser.role === 'CHIEF_ADMIN') {
          navigate('/chief-admin');
        } else {
          navigate('/role-selection');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || `${isSignUp ? 'Registration' : 'Login'} failed. Please check details.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetEmail || !resetEmail.trim()) {
      setResetError('Please enter your account email address.');
      return;
    }

    if (!resetNewPassword || !resetNewPassword.trim()) {
      setResetError('Please enter a new password.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await API.post('/auth/forgot-password', {
        email: resetEmail,
        newPassword: resetNewPassword,
      });
      setResetSuccess(res.data.message || 'Password reset successfully!');
      setEmail(resetEmail);
      setPassword(resetNewPassword);
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setResetSuccess('');
      }, 1800);
    } catch (err: any) {
      setResetError(err.response?.data?.message || 'Failed to reset password. Please verify your email.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Background Ambient Lights */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 my-4">

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 shadow-xl shadow-amber-500/20 mb-3">
            <UtensilsCrossed className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">SmartResto Portal</h1>
          <p className="text-slate-400 text-xs mt-1">
            {isSignUp ? 'Enter your details to create an account' : 'Sign in to access your workstation'}
          </p>
        </div>

        {/* Auth Mode Tabs (Sign In / Create Account) */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setIsGoogleUser(false);
              setError('');
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${!isSignUp ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setIsGoogleUser(false);
              setError('');
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${isSignUp ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
          >
            Create Account
          </button>
        </div>

        {/* Google Authentication Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              setError('');
              handleGoogleOAuth();
            }}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-slate-800/90 hover:bg-slate-700/80 active:bg-slate-800 border border-slate-700/80 hover:border-slate-500 rounded-xl text-slate-100 font-semibold text-sm flex items-center justify-center transition-all shadow-md hover:shadow-lg disabled:opacity-50 group cursor-pointer"
          >
            <GoogleIcon />
            <span>{isSignUp ? 'Sign up with Google' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Divider Line */}
        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
            {isSignUp ? 'or register with email' : 'or email login'}
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Google Account Verified Badge */}
        {isSignUp && isGoogleUser && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <p className="text-emerald-400 font-bold">Google Account Verified</p>
              <p className="text-slate-300 font-medium">Enter your Full Name to complete registration.</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name *</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">Email Address *</label>
              {isSignUp && !isGoogleUser && (
                <span className="text-[10px] font-bold text-amber-400">Gmail only (@gmail.com)</span>
              )}
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="email"
                required
                readOnly={isGoogleUser}
                placeholder={isSignUp ? 'yourname@gmail.com' : 'user@gmail.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all ${
                  isGoogleUser ? 'opacity-80 cursor-not-allowed bg-slate-850' : ''
                }`}
              />
            </div>
          </div>

          {/* Hide Password fields for Google users */}
          {(!isSignUp || !isGoogleUser) && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setResetNewPassword('');
                      setResetError('');
                      setResetSuccess('');
                      setIsForgotModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!isGoogleUser}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>
              {isLoading
                ? isSignUp
                  ? 'Creating Account...'
                  : 'Signing In...'
                : isSignUp
                  ? 'Create Account'
                  : 'Sign In'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-base">Reset Account Password</h3>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter your registered account Gmail address and choose a new password to reset your login credentials.
            </p>

            {resetError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs font-semibold">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="user@gmail.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type={showResetNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                    title={showResetNewPassword ? "Hide password" : "Show password"}
                  >
                    {showResetNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !resetEmail.trim() || !resetNewPassword.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl shadow-lg"
                >
                  {isResetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
