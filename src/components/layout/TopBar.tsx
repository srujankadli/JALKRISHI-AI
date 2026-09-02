import React, { useState } from 'react';
import {
  Menu,
  X,
  Bell,
  Droplets,
  Radio,
} from 'lucide-react';
import { APP_CONFIG } from '../../utils/constants';
import { BackendStatusBadge } from '../common/BackendStatusBadge';
import { UserMenu } from './UserMenu';

interface TopBarProps {
  onToggleMobileNav: () => void;
  isMobileNavOpen: boolean;
  onOpenNotifications?: () => void;
  unreadAlertCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleMobileNav,
  isMobileNavOpen,
  onOpenNotifications,
  unreadAlertCount = 4,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<'EN' | 'HI' | 'PA' | 'MR'>('EN');

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Mobile Menu Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900 lg:hidden"
          aria-label={isMobileNavOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Mobile-only logo */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="h-8 w-8 rounded-lg bg-agri-700 flex items-center justify-center text-white">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold text-stone-900 text-base">{APP_CONFIG.appName}</span>
          </div>
        </div>

        {/* Desktop Quick Header Context */}
        <div className="hidden lg:flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-water-50 border border-water-200 px-3 py-1 text-xs font-semibold text-water-800">
            <Radio className="h-3.5 w-3.5 text-water-600 animate-pulse" />
            National DWLR Network Live: 5,260 Stations
          </span>
          <BackendStatusBadge showDetails={true} />
        </div>
      </div>

      {/* Right Side Header Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile status badge */}
        <div className="lg:hidden">
          <BackendStatusBadge />
        </div>

        {/* Language Selector */}
        <div className="relative">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value as any)}
            className="rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-2.5 pr-7 text-xs font-semibold text-stone-700 hover:bg-stone-100 focus:border-agri-600 focus:outline-none cursor-pointer"
            aria-label="Select interface language"
          >
            <option value="EN">English</option>
            <option value="HI">हिन्दी (Hindi)</option>
            <option value="PA">ਪੰਜਾਬੀ (Punjabi)</option>
            <option value="MR">मराठी (Marathi)</option>
          </select>
        </div>

        {/* Alert Bell Button */}
        <button
          onClick={onOpenNotifications}
          className="relative rounded-xl border border-stone-200 bg-stone-50 p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
          aria-label={`View notifications (${unreadAlertCount} critical warnings)`}
        >
          <Bell className="h-5 w-5" />
          {unreadAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadAlertCount}
            </span>
          )}
        </button>

        {/* User Profile & Sign In / Out Menu */}
        <UserMenu />

        {/* Problem ID Tag */}
        <div className="hidden md:flex items-center rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 border border-stone-200">
          <span>{APP_CONFIG.problemId}</span>
        </div>
      </div>
    </header>
  );
};
