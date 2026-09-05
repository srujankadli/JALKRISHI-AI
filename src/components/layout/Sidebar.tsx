import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Sprout,
  BarChart3,
  HelpCircle,
  Droplets,
  MessageSquare,
  LogIn,
  Landmark,
} from 'lucide-react';
import { APP_CONFIG } from '../../utils/constants';

import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  anomalyCount?: number;
  criticalStationCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  anomalyCount = 4,
}) => {
  const { t } = useLanguage();
  const { isFarmer } = useAuth();

  const farmerNavItems = [
    {
      to: '/',
      icon: LayoutDashboard,
      label: 'My Farm',
      emoji: '🌾',
    },
    {
      to: '/crops',
      icon: Sprout,
      label: 'Crop Advice',
      badge: t('AI Smart'),
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      emoji: '🌱',
    },
    {
      to: '/forecast',
      icon: TrendingUp,
      label: 'Forecast',
      emoji: '🔮',
    },
    {
      to: '/whatsapp',
      icon: MessageSquare,
      label: 'Water Watch',
      badge: t('Advisories'),
      badgeColor: 'bg-emerald-600 text-white',
      emoji: '💬',
    },
    {
      to: '/map',
      icon: MapPin,
      label: 'Nearby Monitoring',
      emoji: '🗺️',
    },
    {
      to: '/help',
      icon: HelpCircle,
      label: 'Help & Knowledge',
      emoji: '📚',
    },
    {
      to: '/login',
      icon: LogIn,
      label: 'Login / Workspace',
      emoji: '🔐',
    },
  ];

  const officialNavItems = [
    {
      to: '/official',
      icon: Landmark,
      label: 'Official Command Center',
      badge: t('Executive'),
      badgeColor: 'bg-amber-600 text-white',
      emoji: '🏛️',
    },
    {
      to: '/map',
      icon: MapPin,
      label: 'Groundwater Network',
      badge: `${APP_CONFIG.totalDwlrStationsCount}`,
      emoji: '🗺️',
    },
    {
      to: '/forecast',
      icon: TrendingUp,
      label: 'Forecast & Predictions',
      emoji: '🔮',
    },
    {
      to: '/anomalies',
      icon: AlertTriangle,
      label: 'Anomaly Detection',
      badge: anomalyCount > 0 ? `${anomalyCount}` : undefined,
      badgeColor: 'bg-rose-600 text-white',
      emoji: '⚠️',
    },
    {
      to: '/analytics',
      icon: BarChart3,
      label: 'Regional Analytics',
      emoji: '📊',
    },
    {
      to: '/crops',
      icon: Sprout,
      label: 'Crop Intelligence',
      emoji: '🌱',
    },
    {
      to: '/whatsapp',
      icon: MessageSquare,
      label: 'WhatsApp Dispatcher',
      emoji: '💬',
    },
    {
      to: '/help',
      icon: HelpCircle,
      label: 'Help & Knowledge',
      emoji: '📚',
    },
    {
      to: '/login',
      icon: LogIn,
      label: 'Officer Account Portal',
      emoji: '🔐',
    },
  ];

  const navItems = isFarmer ? farmerNavItems : officialNavItems;

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-white border-r border-stone-200 h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-stone-100 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-agri-600 to-water-600 flex items-center justify-center text-white shadow-md">
          <Droplets className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg text-stone-900 tracking-tight">
              {APP_CONFIG.appName}
            </span>
            <span className="rounded bg-agri-100 px-1.5 py-0.2 text-[10px] font-bold text-agri-800 border border-agri-200">
              AI
            </span>
          </div>
          <p className="text-[11px] font-medium text-stone-500 line-clamp-1">
            {t('know_your_water')}
          </p>
        </div>
      </div>

      {/* Telemetry Health Indicator */}
      <div className="px-4 pt-3 pb-1">
        {isFarmer ? (
          <div className="rounded-xl border border-agri-200 bg-agri-50/60 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-agri-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-agri-600"></span>
              </span>
              <span className="text-xs font-semibold text-agri-900">{t('Farmer Workspace Active')}</span>
            </div>
            <span className="text-[11px] font-bold text-agri-800">My Farm</span>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-900">{t('DWLR Telemetry Network')}</span>
            </div>
            <span className="text-[11px] font-bold font-mono text-emerald-800">5,260 {t('Nodes')}</span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400">
          {t('Navigation')}
        </p>

        {navItems.map((item) => {
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-agri-700 text-white font-semibold shadow-sm'
                    : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-base" aria-hidden="true">
                      {item.emoji}
                    </span>
                    <span className="block leading-tight font-medium">{t(item.label)}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeColor || 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Platform Product Footer */}
      <div className="p-4 border-t border-stone-200 bg-stone-50/50 space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
          <span>{APP_CONFIG.appName} {t('Platform')}</span>
          <span className="font-mono text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded">
            {APP_CONFIG.version}
          </span>
        </div>
        <p className="text-[10px] text-stone-500 leading-tight">
          {t('Real-Time DWLR Groundwater Intelligence')}
        </p>
      </div>
    </aside>
  );
};
