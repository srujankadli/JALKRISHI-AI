import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { FarmerSummaryBanner } from './FarmerBanner';
import { StationDetailModal } from '../station/StationDetailModal';
import type { DWLRStation } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const AppShell: React.FC = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<DWLRStation | null>(null);
  const navigate = useNavigate();
  const { isFarmer } = useAuth();

  return (
    <div className="flex min-h-screen bg-stone-50 text-stone-900">
      {/* Desktop Sidebar */}
      <Sidebar anomalyCount={4} criticalStationCount={444} />

      {/* Main Container */}
      <div className="flex flex-1 flex-col min-w-0 pb-16 lg:pb-0">
        {/* Top Header */}
        <TopBar
          onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
          isMobileNavOpen={isMobileNavOpen}
          onOpenNotifications={() => navigate(isFarmer ? '/anomalies' : '/official')}
          unreadAlertCount={4}
        />

        {/* Farmer Top Banner - strictly for farmers */}
        {isFarmer && <FarmerSummaryBanner />}

        {/* Main Content Area with consistent container padding */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* React Router Child Routes Render Here */}
          <Outlet context={{ onSelectStation: setSelectedStation, selectedStation }} />
        </main>
      </div>

      {/* Mobile Navigation Drawer & Bottom Bar */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        anomalyCount={4}
      />

      {/* Global Station Detail Modal */}
      {selectedStation && (
        <StationDetailModal
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          onNavigateToCropAdvisor={() => navigate('/crops')}
          onNavigateToForecast={(_id) => navigate('/forecast')}
        />
      )}
    </div>
  );
};
