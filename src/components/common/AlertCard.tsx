import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, ArrowRight, Eye } from 'lucide-react';
import type { GroundwaterAnomaly, AnomalySeverity } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AlertCardProps {
  anomaly: GroundwaterAnomaly;
  onViewDetails?: (anomaly: GroundwaterAnomaly) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ anomaly, onViewDetails }) => {
  const { t } = useLanguage();

  const getSeverityStyle = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'critical':
        return {
          border: 'border-rose-300 bg-rose-50/40',
          badge: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: AlertTriangle,
          iconColor: 'text-rose-600',
        };
      case 'high':
        return {
          border: 'border-orange-300 bg-orange-50/40',
          badge: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: AlertCircle,
          iconColor: 'text-orange-600',
        };
      case 'warning':
      case 'medium':
        return {
          border: 'border-amber-300 bg-amber-50/40',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: Eye,
          iconColor: 'text-amber-600',
        };
      case 'info':
      case 'low':
      default:
        return {
          border: 'border-stone-200 bg-stone-50',
          badge: 'bg-stone-100 text-stone-700 border-stone-200',
          icon: CheckCircle2,
          iconColor: 'text-stone-500',
        };
    }
  };

  const style = getSeverityStyle(anomaly.severity);
  const Icon = style.icon;

  return (
    <div
      className={`relative rounded-xl border p-4.5 transition-all duration-200 hover:shadow-subtle ${style.border}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 rounded-lg bg-white p-2 shadow-xs">
          <Icon className={`h-5 w-5 ${style.iconColor}`} />
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`rounded-md border px-2 py-0.5 text-xs font-bold uppercase ${style.badge}`}>
                {t(anomaly.severity)}
              </span>
              <span className="text-xs font-semibold text-stone-500">
                {t(anomaly.anomalyType)}
              </span>
            </div>
            <span className="text-xs text-stone-500">{anomaly.detectedAt}</span>
          </div>

          <h3 className="mt-1.5 text-sm font-bold text-stone-900 sm:text-base">
            {anomaly.stationName} <span className="font-normal text-stone-500">({anomaly.district}, {anomaly.state})</span>
          </h3>

          <p className="mt-1.5 text-xs text-stone-800 sm:text-sm">
            <span className="font-semibold text-agri-900">{t('What happened:')} </span>
            {t(anomaly.farmerExplanation)}
          </p>

          <div className="mt-2.5 rounded-lg border border-stone-200/70 bg-white/80 p-2.5 text-xs text-stone-700">
            <span className="font-semibold text-agri-800">🌱 {t('Farmer Action:')} </span>
            {t(anomaly.suggestedAction)}
          </div>

          {onViewDetails && (
            <div className="mt-3 flex items-center justify-end">
              <button
                onClick={() => onViewDetails(anomaly)}
                className="inline-flex items-center gap-1 text-xs font-bold text-agri-700 hover:text-agri-900 hover:underline"
              >
                {t('View Technical Analysis')}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
