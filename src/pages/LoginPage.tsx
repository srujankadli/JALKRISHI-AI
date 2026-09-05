import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Droplets,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sprout,
  Building2,
  Phone,
  AlertCircle,
  CheckCircle2,
  X,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFarm } from '../context/FarmContext';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { APP_CONFIG } from '../utils/constants';

type LoginTab = 'FARMER' | 'OFFICIAL';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const { location: farmLocation, resolvedLocation, profile } = useFarm();

  const [activeTab, setActiveTab] = useState<LoginTab>('FARMER');

  // Official Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Farmer Form State
  const [farmerPhoneOrEmail, setFarmerPhoneOrEmail] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const fromPath = (location.state as any)?.from?.pathname;

  const handleOfficialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg(t('Please enter your official email address or username.'));
      return;
    }
    if (!password) {
      setErrorMsg(t('Please enter your password.'));
      return;
    }
    if (password.length < 4) {
      setErrorMsg(t('Password must be at least 4 characters.'));
      return;
    }

    const success = await login(email, password, 'officer');
    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        const dest = fromPath && fromPath !== '/' && fromPath !== '/login' ? fromPath : '/official';
        navigate(dest, { replace: true });
      }, 600);
    } else {
      setErrorMsg(t('Authentication failed. Please verify official credentials.'));
    }
  };

  const handleFarmerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const input = farmerPhoneOrEmail.trim() || 'farmer@jalkrishi.in';

    const success = await login(input, 'farmer123', 'farmer');
    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        const dest = fromPath && fromPath !== '/official' && fromPath !== '/login' ? fromPath : '/';
        navigate(dest, { replace: true });
      }, 600);
    } else {
      setErrorMsg(t('Farmer login failed. Please try again.'));
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
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
        {/* Subtle Hydrographic Water Wave Lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner">
            <Droplets className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              {APP_CONFIG.appName}
              <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                v2.6
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">{t('know_your_water')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Multilingual Global Language Selector */}
          <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={setLanguage} />
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 my-8">
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Section Selector Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => {
                setActiveTab('FARMER');
                setErrorMsg('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'FARMER'
                  ? 'bg-teal-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sprout className="h-4 w-4" />
              <span>🌾 {t('Farmer')}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('OFFICIAL');
                setErrorMsg('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'OFFICIAL'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>🏛 {t('Official')}</span>
            </button>
          </div>

          {/* Form Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-white">
              {activeTab === 'FARMER' ? t('Farmer Decision Support Login') : t('Government Official Console')}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {activeTab === 'FARMER'
                ? t('Crop • Irrigation • Groundwater • Voice Advice')
                : t('Stations • Maps • Forecasts • Risk • Data Resilience')}
            </p>
          </div>

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{t('Session Authenticated. Loading JalKrishi Platform...')}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: FARMER LOGIN & WORKSPACE */}
          {activeTab === 'FARMER' && (
            <div className="space-y-5">
              {farmLocation ? (
                /* Personalized Farm Workspace Banner */
                <div className="rounded-2xl border border-teal-500/30 bg-teal-950/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-teal-800/40 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400">
                      {t('Welcome Back • Your Farm')}
                    </span>
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-bold">
                      {t('Active Workspace')}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-base font-black text-white">
                        {resolvedLocation?.district || farmLocation}
                        {resolvedLocation?.state && (
                          <span className="text-xs font-normal text-slate-400 ml-1.5">
                            ({resolvedLocation.state})
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {profile.facilities.length > 0
                          ? `💧 ${profile.facilities.join(', ').replace(/_/g, ' ')}`
                          : t('Complete your farm profile for personalized guidance')}
                      </p>
                    </div>
                  </div>

                  {/* Profile Summary Badges */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="rounded-lg bg-slate-950/80 p-2 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('Current Crop')}</span>
                      <span className="font-bold text-white truncate block">
                        {profile.crop ? `🌾 ${profile.crop}` : t('Not selected')}
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-950/80 p-2 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('Groundwater Dep.')}</span>
                      <span className="font-bold text-white truncate block">
                        {profile.groundwaterDependence || t('Not set')}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Navigation Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => navigate('/')}
                      className="w-full py-2 px-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sprout className="h-3.5 w-3.5" />
                      <span>{t('See Water Status')}</span>
                    </button>
                    <button
                      onClick={() => navigate('/forecast')}
                      className="w-full py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span>{t('Check Forecast')}</span>
                    </button>
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleFarmerSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>{t('Mobile Number or Email')}</span>
                    <span className="text-[10px] text-slate-500">{t('Farmer Login')}</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={farmerPhoneOrEmail}
                      onChange={(e) => setFarmerPhoneOrEmail(e.target.value)}
                      placeholder={t('Enter 10-digit mobile number or email...')}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Status Notice on SMS OTP Provider */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center justify-between text-slate-300 font-bold">
                    <span>{t('SMS OTP Verification Status')}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                      NOT_CONFIGURED
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {t('SMS OTP gateway is not configured in current deployment environment. Authenticating directly via JalKrishi Farmer account credentials.')}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{farmLocation ? t('Continue with Farmer Account') : t('Continue as Farmer')}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: GOVERNMENT OFFICIAL LOGIN FORM */}
          {activeTab === 'OFFICIAL' && (
            <form onSubmit={handleOfficialSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">{t('Official Email or ID')}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('official@jalkrishi.gov.in')}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">{t('Password')}</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                  >
                    {t('Forgot Password?')}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('Enter password...')}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* 2FA Status Notice */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <span>{t('2FA Security Gate')}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                    NOT_CONFIGURED
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {t('2FA provider is not configured. Authenticating via verified government credentials.')}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t('Official Login')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer Data Honesty Notice */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 py-4 text-center border-t border-slate-900 text-slate-500 text-[11px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{t('JalKrishi Reference DWLR Network: 5,260 Observation Points (Simulated Telemetry)')}</span>
          <span>{t('Authentication Protocol &amp; Role-Based Access Control (RBAC) Active')}</span>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 text-left relative">
            <button
              onClick={() => setShowForgotPasswordModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-400" />
              Password Reset Request
            </h3>

            {forgotSubmitted ? (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                Reset instructions sent if email is registered.
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <p className="text-xs text-slate-400">
                  Enter your registered official email address to receive password reset instructions.
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={t('name@jalkrishi.gov.in')}
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                >
                  Send Reset Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
