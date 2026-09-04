import { useLanguage } from '../../context/LanguageContext';
import React, { useState, useEffect } from 'react';
import {
  X,
  Satellite,
  Radio,
  MapPin,
  TrendingDown,
  TrendingUp,
  Minus,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  satelliteGroundwaterService,
  type SatelliteGroundwaterEstimate,
} from '../../services/satelliteGroundwaterService';
import { SatelliteIndicatorCard } from './SatelliteIndicatorCard';

interface SatelliteGroundwaterPanelProps {
  latitude: number;
  longitude: number;
  onClose: () => void;
}

export const SatelliteGroundwaterPanel: React.FC<SatelliteGroundwaterPanelProps> = ({
  latitude,
  longitude,
  onClose,
}) => {
  const { t } = useLanguage();
  const [estimate, setEstimate] = useState<SatelliteGroundwaterEstimate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'indicators' | 'sources'>('overview');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    satelliteGroundwaterService
      .getGroundwaterEstimate(latitude, longitude)
      .then((data) => {
        if (isMounted) {
          setEstimate(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load satellite estimate:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude]);

  const getConditionColor = (cond?: string) => {
    switch (cond) {
      case 'LOW_STRESS':
        return 'bg-emerald-50 text-emerald-900 border-emerald-300';
      case 'MODERATE_STRESS':
        return 'bg-amber-50 text-amber-900 border-amber-300';
      case 'HIGH_STRESS':
        return 'bg-orange-50 text-orange-900 border-orange-300';
      case 'CRITICAL_STRESS':
        return 'bg-rose-50 text-rose-900 border-rose-300';
      default:
        return 'bg-stone-50 text-stone-900 border-stone-300';
    }
  };

  const getTrendBadge = (trend?: string) => {
    if (trend === 'FALLING') {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 text-xs font-bold">
          <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
          FALLING
        </span>
      );
    }
    if (trend === 'RISING') {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          RISING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 text-xs font-bold">
        <Minus className="h-3.5 w-3.5 text-slate-600" />
        STABLE
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn select-none">
      <div className="w-full max-w-4xl bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center shadow-lg">
              <Satellite className="h-6 w-6 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Satellite-Assisted Groundwater Intelligence
                </h3>
                <span className="rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 text-[10px] font-bold font-mono">
                  SATELLITE_ESTIMATE
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-teal-400" />
                <span>{t('Target Coordinates:')} <strong>{latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E</strong></span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t('Close satellite intelligence modal')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Data Honest Disclaimer Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 font-medium">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-700 flex-shrink-0" />
            <span>
              <strong>{t('Satellite-Assisted Estimate:')}</strong> This spatial estimate combines remote sensing signals, weather models, and nearby DWLR wells. It is <em>{t('not')}</em> a direct well-level measurement.
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-950 font-mono">
            SIMULATED_DATA
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-2 flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-agri-700 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t('Spatial Overview')}</span>
          </button>

          <button
            onClick={() => setActiveTab('indicators')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'indicators'
                ? 'bg-agri-700 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Remote Sensing Indicators ({estimate ? Object.keys(estimate.indicators).length : 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sources'
                ? 'bg-agri-700 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>{t('Data Sources &amp; Providers')}</span>
          </button>
        </div>

        {/* Panel Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="h-10 w-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-stone-700">{t('Computing spatial satellite-assisted groundwater estimate...')}</p>
              <p className="text-xs text-stone-500">{t('Evaluating remote sensing moisture signals and nearby DWLR drawdown')}</p>
            </div>
          ) : estimate ? (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Coverage Mode Distinction Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Coverage Status Card */}
                    <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">
                          Coverage Classification
                        </span>
                        {estimate.dwlr_available ? (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                            <Radio className="h-3 w-3 text-blue-600" />
                            Direct DWLR Coverage
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-teal-100 text-teal-800 px-2 py-0.5 text-[10px] font-bold">
                            <Satellite className="h-3 w-3 text-teal-600" />
                            Satellite-Assisted Coverage
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-stone-900 font-mono">
                          {estimate.nearest_station_distance_km} km
                        </span>
                        <span className="text-xs text-stone-500 font-medium">
                          to nearest DWLR well ({estimate.nearest_station_id || 'N/A'})
                        </span>
                      </div>

                      <p className="text-xs text-stone-600">
                        {estimate.dwlr_available
                          ? 'This location is within the 15.0 km direct DWLR observation radius.'
                          : 'No DWLR well exists within 15.0 km. Utilizing remote sensing & spatial estimation model.'}
                      </p>
                    </div>

                    {/* Confidence & Stress Card */}
                    <div className={`rounded-2xl border p-4 space-y-2 ${getConditionColor(estimate.groundwater_condition)}`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold uppercase tracking-wider text-[10px]">
                          Groundwater Condition
                        </span>
                        <span className="font-mono text-xs font-black">
                          Score: {estimate.groundwater_stress_score} / 1.0
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xl font-black tracking-tight">
                          {estimate.groundwater_condition.replace('_', ' ')}
                        </span>
                        {getTrendBadge(estimate.estimated_trend)}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs border-t border-current/20">
                        <span>{t('Model Confidence:')} <strong>{estimate.confidence}</strong> ({Math.round(estimate.confidence_score * 100)}%)</span>
                        <span>{t('Recharge:')} <strong>{estimate.recharge_outlook}</strong></span>
                      </div>
                    </div>

                  </div>

                  {/* Summary Metric Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-subtle space-y-1">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">{t('Estimated Trend')}</span>
                      <span className="text-base font-black text-stone-900 block">{estimate.estimated_trend}</span>
                      <span className="text-[10px] text-stone-500">{t('Hydrodynamic trajectory')}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-subtle space-y-1">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">30d Rainfall Signal</span>
                      <span className="text-base font-black text-stone-900 block">{estimate.rainfall_mm_estimate} mm</span>
                      <span className="text-[10px] text-stone-500">Status: {estimate.rainfall_condition}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-subtle space-y-1">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">{t('Recharge Outlook')}</span>
                      <span className="text-base font-black text-teal-700 block">{estimate.recharge_outlook}</span>
                      <span className="text-[10px] text-stone-500">{t('Infiltration potential')}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-subtle space-y-1">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">{t('Nearest Well')}</span>
                      <span className="text-base font-black text-stone-900 font-mono block truncate">{estimate.nearest_station_id || 'N/A'}</span>
                      <span className="text-[10px] text-stone-500">{estimate.nearest_station_distance_km} km away</span>
                    </div>
                  </div>

                  {/* Key Indicators Preview Grid */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                      Key Remote Sensing Indicators
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(estimate.indicators)
                        .slice(0, 4)
                        .map(([key, item]) => (
                          <SatelliteIndicatorCard key={key} indicatorKey={key} indicator={item} />
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'indicators' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                      All Environmental &amp; Remote Sensing Indicators
                    </h4>
                    <span className="text-xs text-stone-500">
                      Evaluated for ({latitude.toFixed(3)}°, {longitude.toFixed(3)}°)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(estimate.indicators).map(([key, item]) => (
                      <SatelliteIndicatorCard key={key} indicatorKey={key} indicator={item} />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'sources' && (
                <div className="space-y-4 text-xs">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                    <h4 className="font-extrabold text-stone-900 text-sm">
                      Data Sources &amp; Adapter Architecture Status
                    </h4>
                    <p className="text-stone-600 leading-relaxed text-xs">
                      The satellite-assisted engine uses an adapter architecture designed for live production integration. Unconfigured adapters honestly report <strong>{t('NOT_CONFIGURED')}</strong> status.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {estimate.data_sources.map((src, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Radio className="h-4 w-4 text-teal-600" />
                          <span className="font-bold text-stone-800 font-mono text-xs">{src}</span>
                        </div>
                        {src.includes('NOT_CONFIGURED') ? (
                          <span className="rounded bg-stone-200 text-stone-700 px-2 py-0.5 text-[10px] font-bold font-mono">
                            NOT_CONFIGURED
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                            SIMULATED_FEED
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-6 py-3 flex items-center justify-between text-xs text-stone-500">
          <span>{t('JalKrishi AI • Satellite-Assisted Groundwater Engine')}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl transition-all cursor-pointer"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
};
