import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import { AlertTriangle, ShieldAlert, Radio, Activity } from 'lucide-react';
import { StatCard } from '../common/StatCard';

interface AnomalyOverviewCardsProps {
  totalAnomalies: number;
  criticalCount: number;
  extractionCount: number;
  telemetryIssuesCount: number;
  onFilterCritical?: () => void;
  onFilterExtraction?: () => void;
  onFilterTelemetry?: () => void;
}

export const AnomalyOverviewCards: React.FC<AnomalyOverviewCardsProps> = ({
  totalAnomalies = 12,
  criticalCount = 3,
  extractionCount = 4,
  telemetryIssuesCount = 5,
  onFilterCritical,
  onFilterExtraction,
  onFilterTelemetry,
}) => {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Anomaly Signals */}
      <StatCard
        title={t('Anomaly Signals')}
        value={totalAnomalies.toLocaleString('en-IN')}
        subtitle={t('Signals requiring review')}
        icon={AlertTriangle}
        iconBgColor="bg-amber-100"
        iconColor="text-amber-700"
        highlightColor="warning"
        trend={{ value: t('Reference Analysis'), direction: 'neutral', isPositive: false }}
      />

      {/* 2. Critical Groundwater Drops */}
      <StatCard
        title={t('Critical Groundwater Drops')}
        value={criticalCount.toLocaleString('en-IN')}
        subtitle={t('Immediate attention')}
        icon={ShieldAlert}
        iconBgColor="bg-rose-100"
        iconColor="text-rose-700"
        highlightColor="critical"
        trend={{ value: t('Immediate Review'), direction: 'down', isPositive: false }}
        onClick={onFilterCritical}
      />

      {/* 3. Unusual Extraction Patterns */}
      <StatCard
        title={t('Unusual Extraction Patterns')}
        value={extractionCount.toLocaleString('en-IN')}
        subtitle={t('Review water-use pattern')}
        icon={Activity}
        iconBgColor="bg-orange-100"
        iconColor="text-orange-700"
        highlightColor="warning"
        trend={{ value: t('Sustained Drawdown'), direction: 'down', isPositive: false }}
        onClick={onFilterExtraction}
      />

      {/* 4. Data Quality Issues */}
      <StatCard
        title={t('Data Quality Issues')}
        value={telemetryIssuesCount.toLocaleString('en-IN')}
        subtitle={t('Verify observations')}
        icon={Radio}
        iconBgColor="bg-water-100"
        iconColor="text-water-700"
        highlightColor="water"
        trend={{ value: t('Verification Required'), direction: 'neutral', isPositive: true }}
        onClick={onFilterTelemetry}
      />
    </div>
  );
};
