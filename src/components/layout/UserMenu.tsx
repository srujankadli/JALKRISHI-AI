import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, LogIn, ChevronDown, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user || !isAuthenticated) {
    return (
      <button
        onClick={() => navigate('/login')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
      >
        <LogIn className="h-3.5 w-3.5" />
        <span>{t('login')}</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 p-1.5 pr-2.5 transition-all cursor-pointer text-left"
      >
        <div className="h-7 w-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
          {user.avatar_initials || 'JA'}
        </div>
        <div className="hidden xl:block">
          <span className="text-xs font-bold text-stone-900 block leading-none">{user.name}</span>
          <span className="text-[10px] text-stone-500 block leading-tight">{user.role}</span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-stone-500 hidden xl:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-stone-200 shadow-xl p-3 z-50 animate-fadeIn space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900">{user.name}</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-[11px] text-stone-600">{user.role}</p>
            <p className="text-[10px] text-stone-500 font-mono">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {user.organization}
            </span>
          </div>

          <div className="pt-1 space-y-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/login');
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 font-semibold text-stone-700 flex items-center gap-2 cursor-pointer"
            >
              <UserCheck className="h-3.5 w-3.5 text-teal-600" />
              <span>{t('Switch Account / Role')}</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
                navigate('/login');
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700 font-semibold flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-rose-600" />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
