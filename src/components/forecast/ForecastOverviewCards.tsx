import React from 'react';
import { ShieldAlert, TrendingDown, MapPin, Clock } from 'lucide-react';
import { StatCard } from '../common/StatCard';

interface ForecastOverviewCardsProps {
  highRiskCount?: number;
  fallingCount?: number;
  nearestCriticalStationName?: string;
  avgDaysToCritical?: number;
  onNavigateToRisk?: () => void;
}

export const ForecastOverviewCards: React.FC<ForecastOverviewCardsProps> = ({
  highRiskCount = 444,
  fallingCount = 1890,
  nearestCriticalStationName = 'Sangrur, PB',
  avgDaysToCritical = 34,
  onNavigateToRisk,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Stations at Critical Risk */}
      <StatCard
        title="Stations at Critical Risk"
        value={highRiskCount.toLocaleString('en-IN')}
        subtitle="Critical depletion velocity"
        icon={ShieldAlert}
        iconBgColor="bg-rose-100"
        iconColor="text-rose-700"
        highlightColor="critical"
        trend={{ value: '8.4% of Network', direction: 'down', isPositive: false }}
        onClick={onNavigateToRisk}
      />

      {/* 2. Falling Level Trajectory */}
      <StatCard
        title="Wells with Falling Levels"
        value={fallingCount.toLocaleString('en-IN')}
        subtitle="Downward seasonal draw"
        icon={TrendingDown}
        iconBgColor="bg-amber-100"
        iconColor="text-amber-700"
        highlightColor="warning"
        trend={{ value: '35.9% of Network', direction: 'down', isPositive: false }}
      />

      {/* 3. Average Days to Critical */}
      <StatCard
        title="Avg. Days to Critical"
        value={`${avgDaysToCritical} Days`}
        subtitle="Estimated margin in stressed zones"
        icon={Clock}
        iconBgColor="bg-water-100"
        iconColor="text-water-700"
        highlightColor="water"
        trend={{ value: 'Varies by extraction', direction: 'neutral', isPositive: true }}
      />

      {/* 4. Nearest Critical Station */}
      <StatCard
        title="Top Depletion Node"
        value={nearestCriticalStationName}
        subtitle="22 days to 30m critical threshold"
        icon={MapPin}
        iconBgColor="bg-stone-100"
        iconColor="text-stone-700"
        highlightColor="default"
        trend={{ value: '28.4 mbgl Depth', direction: 'down', isPositive: false }}
        onClick={onNavigateToRisk}
      />
    </div>
  );
};
