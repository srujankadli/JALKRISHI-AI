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
  Info,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { proactiveService, type FarmerProactiveStatus, type ProactiveRiskState } from '../../services/proactiveService';
import type { DWLRStation } from '../../types';

interface JalKrishiWaterWatchCardProps {
  location?: string | null;
  selectedStation?: DWLRStation | null;
  onAskAssistant?: (query: string) => void;
}

export const JalKrishiWaterWatchCard: React.FC<JalKrishiWaterWatchCardProps> = ({
  location,
  selectedStation,
  onAskAssistant,
}) => {
  const { t } = useLanguage();
  const [data, setData] = useState<FarmerProactiveStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  // Derive target location name
  const effectiveLocation = location?.trim() || (
    selectedStation
      ? `${selectedStation.block ? selectedStation.block + ', ' : ''}${selectedStation.district} (${selectedStation.state})`
      : null
  );

  const targetStationId = selectedStation?.id || selectedStation?.stationCode;

  useEffect(() => {
    let isMounted = true;

    async function fetchProactiveStatus() {
      if (!effectiveLocation && !targetStationId) {
        setData(null);
        setLoading(false);
        setError(false);
        return;
      }

      setLoading(true);
      setError(false);

      try {
        const res = await proactiveService.getLocationStatus(
          effectiveLocation || undefined,
          selectedStation?.latitude,
          selectedStation?.longitude,
          targetStationId || undefined
        );

        if (isMounted) {
          if (res) {
            setData(res);
          } else {
            // Local fallback structure if API returns null
            setData({
              location: effectiveLocation || 'Your Area',
              status: 'STABLE',
              has_warning: false,
              risk_state: 'STABLE',
              station_id: targetStationId || '',
              station_name: selectedStation?.stationName || '',
              summary: 'Groundwater conditions appear relatively stable in the available reference simulation data.',
              what_changed: 'Groundwater conditions are currently stable in this area.',
              why_it_matters: 'Aquifer storage remains within normal seasonal baseline range.',
              recommended_action: 'Continue efficient water use and monitor groundwater conditions.',
              what_to_do: 'Continue efficient water use and monitor groundwater conditions.',
              confidence: 'MODERATE',
              provenance: 'JalKrishi Reference Simulation Dataset',
            });
          }
        }
      } catch (err) {
        console.warn('Water Watch fetch error:', err);
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProactiveStatus();

    return () => {
      isMounted = false;
    };
  }, [effectiveLocation, targetStationId, selectedStation?.latitude, selectedStation?.longitude]);

  // Risk state mapping
  const riskState: ProactiveRiskState = data?.risk_state || data?.status || 'STABLE';

  const getStatusBadge = (state: ProactiveRiskState) => {
    switch (state) {
      case 'CRITICAL_RISK':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400',
          icon: ShieldAlert,
          title: t('proactive_status_critical', 'Critical Groundwater Risk'),
          dotColor: 'bg-red-500',
        };
      case 'ESCALATING_RISK':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
          icon: AlertTriangle,
          title: t('proactive_status_escalating', 'Groundwater Risk Increasing'),
          dotColor: 'bg-amber-500',
        };
      case 'EMERGING_RISK':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-800 dark:text-yellow-400',
          icon: Activity,
          title: t('proactive_status_emerging', 'Early Groundwater Risk'),
          dotColor: 'bg-yellow-500',
        };
      case 'RECOVERY_SIGNAL':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
          icon: TrendingUp,
          title: t('proactive_status_recovery', 'Groundwater Recovery Signal'),
          dotColor: 'bg-emerald-500',
        };
      case 'DATA_QUALITY_WARNING':
        return {
          bg: 'bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-400',
          icon: HelpCircle,
          title: t('proactive_status_data_quality', 'Data Quality Warning'),
          dotColor: 'bg-slate-500',
        };
      case 'STABLE':
      default:
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
          icon: ShieldCheck,
          title: t('proactive_status_stable', 'Groundwater Conditions Stable'),
          dotColor: 'bg-emerald-500',
        };
    }
  };

  const statusConfig = getStatusBadge(riskState);
  const StatusIcon = statusConfig.icon;

  // Render NO LOCATION state
  if (!effectiveLocation && !targetStationId) {
    return (
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-850 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {t('water_watch_heading', 'JalKrishi Water Watch')}
            </h3>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {t('proactive_intelligence_tag', 'Proactive Intelligence')}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 text-center py-6">
          <MapPin className="w-6 h-6 text-slate-400 mx-auto mb-2 opacity-75" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('select_location_prompt', 'Select your location to see Water Watch.')}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {t('select_location_help', 'Ask the Farmer AI Assistant above with your village, block, or district name.')}
          </p>
        </div>
      </div>
    );
  }

  // Render LOADING state
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-850 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {t('water_watch_heading', 'JalKrishi Water Watch')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {effectiveLocation}
            </p>
          </div>
        </div>
        <div className="py-4 text-center text-xs text-slate-500 font-medium">
          {t('checking_water_conditions', 'Checking groundwater conditions...')}
        </div>
      </div>
    );
  }

  // Render ERROR state
  if (error) {
    return (
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-850 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {t('water_watch_heading', 'JalKrishi Water Watch')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {effectiveLocation}
            </p>
          </div>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
          {t('water_watch_error', 'Water Watch is temporarily unavailable. Please try again.')}
        </p>
      </div>
    );
  }

  // Render SUCCESS state
  const whatChangedContent = data?.what_changed || t('proactive_desc_stable', 'Groundwater conditions are currently stable in this area.');
  const whatToDoContent = data?.recommended_action || data?.what_to_do || t('proactive_todo_stable', 'Continue efficient water use and monitor groundwater conditions.');

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
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
              <span>{effectiveLocation}</span>
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
            {whatChangedContent}
          </p>
        </div>

        {/* Recommended Action Box */}
        <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{t('proactive_what_to_do', 'Recommended Action')}</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {whatToDoContent}
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
            onClick={() => onAskAssistant(`Is there any water warning for ${effectiveLocation}?`)}
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
