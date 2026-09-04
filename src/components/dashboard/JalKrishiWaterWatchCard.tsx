import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  HelpCircle, 
  Volume2, 
  ChevronRight, 
  Activity,
  Sparkles,
  Info
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { proactiveService } from '../../services/proactiveService';
import type { ProactiveAlert, ProactiveRiskState } from '../../services/proactiveService';
import type { DWLRStation } from '../../types';

interface JalKrishiWaterWatchCardProps {
  selectedStation?: DWLRStation | null;
  onAskAssistant?: (query: string) => void;
}

export const JalKrishiWaterWatchCard: React.FC<JalKrishiWaterWatchCardProps> = ({
  selectedStation,
  onAskAssistant,
}) => {
  const { t } = useLanguage();
  const [alert, setAlert] = useState<ProactiveAlert | null>(null);

  const targetStationId = selectedStation?.id || selectedStation?.stationCode;

  useEffect(() => {
    let isMounted = true;
    async function loadStationAlert() {
      if (!targetStationId) {
        return;
      }
      try {
        const res = await proactiveService.evaluateStation(targetStationId);
        if (isMounted) {
          setAlert(res);
        }
      } catch (err) {
        console.warn('Failed loading proactive alert for station:', err);
      }
    }
    loadStationAlert();
    return () => {
      isMounted = false;
    };
  }, [targetStationId]);

  const riskState: ProactiveRiskState = alert?.risk_state || (
    selectedStation?.trend === 'falling' && (selectedStation?.trendRateMetersPerMonth || 0) > 0.3
      ? 'ESCALATING_RISK'
      : selectedStation?.trend === 'rising'
      ? 'RECOVERY_SIGNAL'
      : 'STABLE'
  );

  const getStatusBadge = (state: ProactiveRiskState) => {
    switch (state) {
      case 'CRITICAL_RISK':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
          icon: ShieldAlert,
          title: t('proactive_status_critical', 'Critical Risk Notice'),
          dotColor: 'bg-red-500',
        };
      case 'ESCALATING_RISK':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
          icon: AlertTriangle,
          title: t('proactive_status_escalating', 'Escalating Depletion Risk'),
          dotColor: 'bg-amber-500',
        };
      case 'EMERGING_RISK':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
          icon: Activity,
          title: t('proactive_status_emerging', 'Emerging Risk Signal'),
          dotColor: 'bg-yellow-500',
        };
      case 'RECOVERY_SIGNAL':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
          icon: TrendingUp,
          title: t('proactive_status_recovery', 'Recharge & Recovery Signal'),
          dotColor: 'bg-emerald-500',
        };
      case 'DATA_QUALITY_WARNING':
        return {
          bg: 'bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400',
          icon: HelpCircle,
          title: t('proactive_status_data_quality', 'Data Quality Verification Required'),
          dotColor: 'bg-slate-500',
        };
      case 'STABLE':
      default:
        return {
          bg: 'bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400',
          icon: ShieldCheck,
          title: t('proactive_status_stable', 'Groundwater Conditions Stable'),
          dotColor: 'bg-teal-500',
        };
    }
  };

  const statusConfig = getStatusBadge(riskState);
  const StatusIcon = statusConfig.icon;

  const locLabel = selectedStation
    ? `${selectedStation.stationName || targetStationId} (${selectedStation.district}, ${selectedStation.state})`
    : t('default_area_label', 'Your Monitored Farm Area');

  const defaultWhatChanged =
    riskState === 'CRITICAL_RISK'
      ? t('proactive_desc_critical', 'Water level has dropped rapidly toward critical extraction limits.')
      : riskState === 'ESCALATING_RISK'
      ? t('proactive_desc_escalating', 'Sustained depletion velocity detected over the last observation window.')
      : riskState === 'EMERGING_RISK'
      ? t('proactive_desc_emerging', 'Early groundwater decline detected from predictive model and remote sensing.')
      : riskState === 'RECOVERY_SIGNAL'
      ? t('proactive_desc_recovery', 'Water table is recovering shallower due to recent seasonal recharge.')
      : t('proactive_desc_stable', 'No adverse depletion signals detected. Aquifer levels remain within safe operating thresholds.');

  const defaultWhatToDo =
    riskState === 'CRITICAL_RISK'
      ? t('proactive_todo_critical', 'Stagger tubewell pumping shifts and adopt micro-drip irrigation immediately.')
      : riskState === 'ESCALATING_RISK'
      ? t('proactive_todo_escalating', 'Optimize irrigation schedules and consider less water-intensive rotation crops.')
      : riskState === 'EMERGING_RISK'
      ? t('proactive_todo_emerging', 'Monitor well drawdown and check soil moisture before flood irrigating.')
      : riskState === 'RECOVERY_SIGNAL'
      ? t('proactive_todo_recovery', 'Maintain recharge pits to store surface runoff into aquifer storage.')
      : t('proactive_todo_stable', 'Continue scheduled irrigation and follow standard crop water management.');

  const whatChangedText = alert?.explainability?.what_changed || defaultWhatChanged;
  const whatToDoText = alert?.explainability?.what_to_do || defaultWhatToDo;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-850 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {t('water_watch_heading', 'JalKrishi Water Watch')}
              </h3>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {t('proactive_intelligence_tag', 'Proactive Intelligence')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {locLabel}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${statusConfig.bg}`}>
          <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor} animate-pulse`} />
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{statusConfig.title}</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* What Changed Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span>{t('proactive_what_changed', 'What Changed')}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {whatChangedText}
          </p>
        </div>

        {/* Recommended Action Box */}
        <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{t('proactive_what_to_do', 'Recommended Action')}</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {whatToDoText}
          </p>
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {t('provenance_water_watch', 'JalKrishi Reference Simulation Dataset • Evaluated from DWLR, Remote Sensing & Hydro-Forecasts')}
          </span>
        </div>

        {onAskAssistant && (
          <button
            onClick={() => onAskAssistant('Is there any water warning for my farm?')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-sm transition-all"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{t('ask_water_watch_voice', 'Ask Farmer AI')}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
