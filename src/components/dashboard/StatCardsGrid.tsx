import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, ShieldCheck, TrendingDown, AlertTriangle } from 'lucide-react';
import { StatCard } from '../common/StatCard';
import type { DashboardSummary } from '../../types';
import { formatNumber } from '../../utils/formatters';

interface StatCardsGridProps {
  metrics: DashboardSummary | null;
}

export const StatCardsGrid: React.FC<StatCardsGridProps> = ({ metrics }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: DWLR Stations */}
      <StatCard
        title="DWLR Stations Monitored"
        value={metrics ? formatNumber(metrics.totalStationsMonitored) : '5,260'}
        subtitle="98.4% reporting online"
        icon={Radio}
        iconBgColor="bg-water-100"
        iconColor="text-water-700"
        highlightColor="water"
        trend={{ value: 'Telemetry Active', direction: 'neutral', isPositive: true }}
        onClick={() => navigate('/map')}
      />

      {/* Card 2: Healthy Stations */}
      <StatCard
        title="Healthy Stations (Safe)"
        value={metrics ? formatNumber(metrics.healthyCount) : '2,412'}
        subtitle="Safe recharge levels"
        icon={ShieldCheck}
        iconBgColor="bg-emerald-100"
        iconColor="text-emerald-700"
        highlightColor="healthy"
        trend={{ value: '+3.4% this month', direction: 'up', isPositive: true }}
        onClick={() => navigate('/map')}
      />

      {/* Card 3: Warning Stations */}
      <StatCard
        title="Warning Stations"
        value={metrics ? formatNumber(metrics.warningCount) : '780'}
        subtitle="Steady decline >15cm/mo"
        icon={TrendingDown}
        iconBgColor="bg-amber-100"
        iconColor="text-amber-700"
        highlightColor="warning"
        trend={{ value: 'Declining', direction: 'down', isPositive: false }}
        onClick={() => navigate('/map')}
      />

      {/* Card 4: Critical Extraction */}
      <StatCard
        title="Critical Extraction Zones"
        value={metrics ? formatNumber(metrics.criticalCount) : '444'}
        subtitle="Urgent conservation required"
        icon={AlertTriangle}
        iconBgColor="bg-rose-100"
        iconColor="text-rose-700"
        highlightColor="critical"
        trend={{ value: '18 high-alert blocks', direction: 'down', isPositive: false }}
        onClick={() => navigate('/map')}
      />
    </div>
  );
};
