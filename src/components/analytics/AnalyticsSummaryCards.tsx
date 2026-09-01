import React from 'react';
import {
  Radio,
  ShieldCheck,
  Eye,
  ShieldAlert,
  Droplets,
  Activity,
} from 'lucide-react';
import { StatCard } from '../common/StatCard';

interface AnalyticsSummaryCardsProps {
  totalStations: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  avgDepth: number;
  avgRiskScore: number;
  onFilterCritical?: () => void;
  onFilterWarning?: () => void;
  onFilterHealthy?: () => void;
}

export const AnalyticsSummaryCards: React.FC<AnalyticsSummaryCardsProps> = ({
  totalStations,
  healthyCount,
  warningCount,
  criticalCount,
  avgDepth,
  avgRiskScore,
  onFilterCritical,
  onFilterWarning,
  onFilterHealthy,
}) => {
  const healthyPct = Math.round((healthyCount / (totalStations || 1)) * 100);
  const warningPct = Math.round((warningCount / (totalStations || 1)) * 100);
  const criticalPct = Math.round((criticalCount / (totalStations || 1)) * 100);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {/* 1. Total Wells in Scope */}
      <StatCard
        title="Wells in Scope"
        value={totalStations.toLocaleString('en-IN')}
        subtitle="DWLR Telemetry Nodes"
        icon={Radio}
        iconBgColor="bg-stone-100"
        iconColor="text-stone-700"
        highlightColor="default"
      />

      {/* 2. Healthy Safe Wells */}
      <StatCard
        title="Healthy (Safe)"
        value={healthyCount.toLocaleString('en-IN')}
        subtitle={`${healthyPct}% of active view`}
        icon={ShieldCheck}
        iconBgColor="bg-emerald-100"
        iconColor="text-emerald-700"
        highlightColor="healthy"
        trend={{ value: 'Stable Buffer', direction: 'up', isPositive: true }}
        onClick={onFilterHealthy}
      />

      {/* 3. Warning Watch Wells */}
      <StatCard
        title="Warning / Watch"
        value={warningCount.toLocaleString('en-IN')}
        subtitle={`${warningPct}% of active view`}
        icon={Eye}
        iconBgColor="bg-orange-100"
        iconColor="text-orange-700"
        highlightColor="warning"
        trend={{ value: 'Elevated Draw', direction: 'down', isPositive: false }}
        onClick={onFilterWarning}
      />

      {/* 4. Critical Drawdown Wells */}
      <StatCard
        title="Critical Drawdown"
        value={criticalCount.toLocaleString('en-IN')}
        subtitle={`${criticalPct}% of active view`}
        icon={ShieldAlert}
        iconBgColor="bg-rose-100"
        iconColor="text-rose-700"
        highlightColor="critical"
        trend={{ value: 'Urgent Action', direction: 'down', isPositive: false }}
        onClick={onFilterCritical}
      />

      {/* 5. Average Water Table Depth */}
      <StatCard
        title="Avg. Depth (mbgl)"
        value={`${avgDepth} m`}
        subtitle="Hydrostatic head mean"
        icon={Droplets}
        iconBgColor="bg-water-100"
        iconColor="text-water-700"
        highlightColor="water"
      />

      {/* 6. Network Risk Index */}
      <StatCard
        title="Aquifer Risk Index"
        value={`${Math.round(avgRiskScore * 100)}/100`}
        subtitle={avgRiskScore > 0.6 ? 'High Regional Stress' : avgRiskScore > 0.4 ? 'Moderate Vulnerability' : 'Low Vulnerability'}
        icon={Activity}
        iconBgColor="bg-amber-100"
        iconColor="text-amber-700"
        highlightColor="warning"
      />
    </div>
  );
};
