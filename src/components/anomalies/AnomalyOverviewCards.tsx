import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import { AlertTriangle, ShieldAlert, Radio, Wrench } from 'lucide-react';
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
      {/* 1. Total Active Anomalies */}
      <StatCard
        title={t('Active Anomaly Alerts')}
        value={totalAnomalies.toLocaleString('en-IN')}
        subtitle={t('Across 5,260 DWLR network')}
        icon={AlertTriangle}
        iconBgColor="bg-amber-100"
        iconColor="text-amber-700"
        highlightColor="warning"
        trend={{ value: 'Real-time Quality Flag', direction: 'neutral', isPositive: false }}
      />

      {/* 2. Critical Depletion Anomalies */}
      <StatCard
        title={t('Critical Drawdown Alerts')}
        value={criticalCount.toLocaleString('en-IN')}
        subtitle={t('Urgent investigation required')}
        icon={ShieldAlert}
        iconBgColor="bg-rose-100"
        iconColor="text-rose-700"
        highlightColor="critical"
        trend={{ value: 'Immediate Action', direction: 'down', isPositive: false }}
        onClick={onFilterCritical}
      />

      {/* 3. Possible Abnormal Extraction */}
      <StatCard
        title={t('Possible Extraction Events')}
        value={extractionCount.toLocaleString('en-IN')}
        subtitle={t('Zero recovery lag detected')}
        icon={Wrench}
        iconBgColor="bg-orange-100"
        iconColor="text-orange-700"
        highlightColor="warning"
        trend={{ value: 'High Diurnal Draw', direction: 'down', isPositive: false }}
        onClick={onFilterExtraction}
      />

      {/* 4. Telemetry & Sensor Issues */}
      <StatCard
        title={t('Telemetry & Sensor Issues')}
        value={telemetryIssuesCount.toLocaleString('en-IN')}
        subtitle={t('Missing packets or flatlines')}
        icon={Radio}
        iconBgColor="bg-water-100"
        iconColor="text-water-700"
        highlightColor="water"
        trend={{ value: 'Requires Verification', direction: 'neutral', isPositive: true }}
        onClick={onFilterTelemetry}
      />
    </div>
  );
};
