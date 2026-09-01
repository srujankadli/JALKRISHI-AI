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
  X,
  Droplets,
  MessageSquare,
} from 'lucide-react';
import { APP_CONFIG } from '../../utils/constants';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  anomalyCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  anomalyCount = 4,
}) => {
  const mainNav = [
    { to: '/', label: 'Dashboard', emoji: '🌾' },
    { to: '/map', label: 'Map', emoji: '🗺️' },
    { to: '/forecast', label: 'Forecast', emoji: '🔮' },
    { to: '/crops', label: 'Crops', emoji: '🌱' },
    { to: '/whatsapp', label: 'Chat', emoji: '💬' },
    { to: '/anomalies', label: 'Alerts', emoji: '⚠️', badge: anomalyCount },
  ];

  const fullNav = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', sub: 'Home & summary', emoji: '🌾' },
    { to: '/map', icon: MapPin, label: 'Groundwater Map', sub: 'Interactive station map', emoji: '🗺️' },
    { to: '/forecast', icon: TrendingUp, label: 'Forecast & Predictions', sub: 'Water level projections', emoji: '🔮' },
    { to: '/anomalies', icon: AlertTriangle, label: 'Anomaly Detection', sub: 'Critical drawdowns', emoji: '⚠️', badge: anomalyCount },
    { to: '/crops', icon: Sprout, label: 'Crop Advisor', sub: 'Water-smart crop engine', emoji: '🌱' },
    { to: '/analytics', icon: BarChart3, label: 'Regional Analytics', sub: 'State & district metrics', emoji: '📊' },
    { to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp Farmer', sub: 'Conversational assistant', emoji: '💬', badge: 'Chat' },
    { to: '/help', icon: HelpCircle, label: 'Help & FAQ', sub: 'Knowledge & data sources', emoji: '📚' },
  ];

  return (
    <>
      {/* 1. Bottom Quick Bar for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-2 py-1 flex items-center justify-around shadow-elevated">
        {mainNav.map((item) => {
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all min-w-[56px] ${
                  isActive
                    ? 'text-agri-700 font-bold'
                    : 'text-stone-500 hover:text-stone-800'
                }`
              }
            >
              {({ isActive }) => (
                <div className="relative flex flex-col items-center">
                  <span className="text-lg leading-none" aria-hidden="true">
                    {item.emoji}
                  </span>
                  <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="mt-0.5 h-1 w-4 rounded-full bg-agri-600" />
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* 2. Full Drawer Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex"
          onClick={onClose}
        >
          <div
            className="w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-agri-700 flex items-center justify-center text-white">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base">{APP_CONFIG.appName}</h3>
                  <p className="text-[11px] text-stone-500">{APP_CONFIG.tagline}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-1.5">
              {fullNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-agri-700 text-white font-semibold shadow-sm'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.emoji}</span>
                        <div>
                          <span className="block leading-tight">{item.label}</span>
                          <span
                            className={`text-xs ${
                              isActive ? 'text-agri-100' : 'text-stone-400'
                            }`}
                          >
                            {item.sub}
                          </span>
                        </div>
                      </div>
                      {item.badge !== undefined && (typeof item.badge === 'number' ? item.badge > 0 : Boolean(item.badge)) && (
                        <span className="bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-stone-200 pt-4 text-xs text-stone-500">
              <p className="font-bold text-stone-700">{APP_CONFIG.teamName}</p>
              <p className="text-[11px]">{APP_CONFIG.hackathon}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
