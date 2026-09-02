import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Droplets,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Radio,
  ArrowRight,
  Sparkles,
  UserCheck,
  Building2,
  Sprout,
  HelpCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_CONFIG } from '../utils/constants';

type UserRole = 'hydrogeologist' | 'officer' | 'kvk' | 'farmer';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, quickLogin, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('hydrogeologist');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const fromPath = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your official email address or username.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }
    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    const success = await login(email, password, role);
    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        navigate(fromPath, { replace: true });
      }, 700);
    } else {
      setErrorMsg('Authentication failed. Please verify credentials or select a Quick Demo Account.');
    }
  };

  const handleQuickAccount = async (targetEmail: string, targetRole: UserRole) => {
    setErrorMsg('');
    setEmail(targetEmail);
    setPassword('jalkrishi2026');
    setRole(targetRole);

    const success = await quickLogin(targetEmail);
    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        navigate(fromPath, { replace: true });
      }, 600);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotEmail.trim()) {
      setForgotSubmitted(true);
      setTimeout(() => {
        setShowForgotPasswordModal(false);
        setForgotSubmitted(false);
        setForgotEmail('');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Background Animated Water Aquifer Gradients & Light Orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(13,148,136,0.25),rgba(2,6,23,0.95))]" />
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 -right-20 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      
      {/* Subtle Vector Aquifer Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

      {/* Top Bar Navigation */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/20">
            <Droplets className="h-6 w-6 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <span className="font-extrabold text-white text-lg tracking-tight flex items-center gap-2">
              {APP_CONFIG.appName}
              <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                v2.0 Enterprise
              </span>
            </span>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              {APP_CONFIG.tagline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-300">
            <Radio className="h-3.5 w-3.5 text-teal-400 animate-pulse" />
            <span>DWLR Network: <strong>5,260 Stations</strong></span>
          </div>

          <button
            onClick={() => navigate('/demo')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Judge Demo Mode &rarr;</span>
          </button>
        </div>
      </header>

      {/* Main Content Split Screen Container */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8 flex-1 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          
          {/* Left Column: Environmental Platform Hero Presentation */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Smart Horizon 2026 Hackathon (SH-AGR-005)</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
              Real-Time <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">Groundwater</span> Evaluation Platform
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-normal">
              Empowering government hydrogeologists, water resource planners, and farmers with automated DWLR piezometer quality control, 30-day hydrodynamic forecasts, statistical anomaly triage, and crop sowing intelligence.
            </p>

            {/* Platform Stats Grid */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
                <span className="text-xl sm:text-2xl font-black text-teal-400 block font-mono">5,260</span>
                <span className="text-[11px] text-slate-400 font-medium">Observation Wells</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
                <span className="text-xl sm:text-2xl font-black text-emerald-400 block font-mono">100%</span>
                <span className="text-[11px] text-slate-400 font-medium">Quality Score</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
                <span className="text-xl sm:text-2xl font-black text-cyan-400 block font-mono">37</span>
                <span className="text-[11px] text-slate-400 font-medium">States &amp; UTs</span>
              </div>
            </div>

            {/* Key Capabilities Checklist */}
            <div className="space-y-2 pt-1 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
                <span>Automated 12-rule DWLR telemetry quality audit &amp; spike filtering</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Hydrodynamic 30/60/90-day depletion forecasting with Days-to-Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                <span>Farmer-first WhatsApp chatbot &amp; groundwater-aware crop advisor</span>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Interactive Glassmorphism Login Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-slate-900/85 backdrop-blur-2xl border border-teal-500/25 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-teal-950/50 space-y-6 relative overflow-hidden">
              
              {/* Card Top Ambient Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Login Card Header */}
              <div className="text-center space-y-1 relative z-10">
                <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-slate-950 items-center justify-center shadow-lg shadow-teal-500/30 mb-2">
                  <Droplets className="h-7 w-7 text-slate-950 fill-slate-950" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Groundwater Intelligence Login
                </h2>
                <p className="text-xs text-slate-400">
                  Sign in to access DWLR telemetry, forecasts &amp; risk models
                </p>
              </div>

              {/* Role Selection Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setRole('hydrogeologist')}
                  className={`py-2 px-2 rounded-lg font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    role === 'hydrogeologist'
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span className="text-[10px]">Hydrogeologist</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('officer')}
                  className={`py-2 px-2 rounded-lg font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    role === 'officer'
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-[10px]">Jal Officer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('farmer')}
                  className={`py-2 px-2 rounded-lg font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    role === 'farmer'
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sprout className="h-3.5 w-3.5" />
                  <span className="text-[10px]">KVK / Farmer</span>
                </button>
              </div>

              {/* Error Message Box */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold animate-shake">
                  {errorMsg}
                </div>
              )}

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Email / Username Input */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Official Email / Username</span>
                    <span className="text-[10px] text-teal-400">Required</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. admin@jalkrishi.gov.in"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 rounded-xl text-xs font-medium text-white placeholder-slate-500 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(true)}
                      className="text-[11px] text-teal-400 hover:text-teal-300 hover:underline cursor-pointer font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password (min 4 chars)"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 rounded-xl text-xs font-medium text-white placeholder-slate-500 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Option */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-400/20 h-4 w-4 cursor-pointer"
                    />
                    <span>Remember my session</span>
                  </label>
                </div>

                {/* Submit Login Button */}
                <button
                  type="submit"
                  disabled={isLoading || isSuccess}
                  className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-teal-500/25 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSuccess ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Authenticated! Redirecting...</span>
                    </>
                  ) : isLoading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Access Groundwater Intelligence</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* 1-Click Quick Demo Accounts Launcher */}
              <div className="space-y-2 pt-2 border-t border-slate-800 text-left">
                <span className="text-[11px] font-bold text-slate-400 block">
                  ⚡ 1-Click Quick Demo Accounts (Hackathon / Judge Testing):
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickAccount('admin@jalkrishi.gov.in', 'hydrogeologist')}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-[11px] font-bold text-teal-300 block group-hover:text-teal-200">
                      Chief Hydrogeologist
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">admin@jalkrishi.gov.in</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickAccount('officer@jalkrishi.gov.in', 'officer')}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-[11px] font-bold text-emerald-300 block group-hover:text-emerald-200">
                      Senior Water Officer
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">officer@jalkrishi.gov.in</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickAccount('kvk@jalkrishi.gov.in', 'kvk')}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-[11px] font-bold text-cyan-300 block group-hover:text-cyan-200">
                      KVK Scientist
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">kvk@jalkrishi.gov.in</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickAccount('farmer@jalkrishi.in', 'farmer')}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-[11px] font-bold text-amber-300 block group-hover:text-amber-200">
                      Progressive Farmer
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">farmer@jalkrishi.in</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer Branding & Disclaimer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-900 text-xs text-slate-500">
        <div>
          <span>&copy; 2026 {APP_CONFIG.teamName} &bull; {APP_CONFIG.appName}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>Data Mode: <strong className="text-teal-400">DEMO_SIMULATION</strong></span>
          <span>&bull;</span>
          <span>5,260 Active Observation Wells</span>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowForgotPasswordModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <div className="h-10 w-10 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center mb-2">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black text-white">Reset Official Password</h3>
              <p className="text-xs text-slate-400">
                Enter your registered government email address to receive password reset instructions.
              </p>
            </div>

            {forgotSubmitted ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center">
                Password reset instructions dispatched to your email!
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 focus:border-teal-400 rounded-xl text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Send Reset Instructions
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
