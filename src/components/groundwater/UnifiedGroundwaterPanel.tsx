import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Satellite,
  MapPin,
  TrendingDown,
  TrendingUp,
  Minus,
  ShieldCheck,
  AlertTriangle,
  Info,
  Sprout,
  Droplets,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { farmerIntelligenceService } from '../../services/farmerIntelligenceService';
import type { GroundwaterIntelligence } from '../../services/farmerIntelligenceService';
import { LoadingState } from '../common/States';

interface UnifiedGroundwaterPanelProps {
  latitude: number;
  longitude: number;
  onClose: () => void;
}

export const UnifiedGroundwaterPanel: React.FC<UnifiedGroundwaterPanelProps> = ({
  latitude,
  longitude,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GroundwaterIntelligence | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'crops' | 'irrigation' | 'sources'>('overview');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await farmerIntelligenceService.getUnifiedIntelligence(latitude, longitude);
      setData(res);
      setLoading(false);
    }
    load();
  }, [latitude, longitude]);

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
        <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl border border-stone-200">
          <LoadingState message="Synthesizing Unified Groundwater &amp; Farmer Intelligence..." />
        </div>
      </div>
    );
  }

  const isDirect = data.estimation_mode === 'DIRECT_DWLR';

  const conditionColors: Record<string, { bg: string; text: string; border: string }> = {
    HEALTHY: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    LOW_STRESS: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    MODERATE_STRESS: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    HIGH_STRESS: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
    CRITICAL_STRESS: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  };

  const condStyle = conditionColors[data.groundwater_condition] || conditionColors.MODERATE_STRESS;

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Header Banner */}
        <div
          className={`p-6 border-b text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isDirect
              ? 'bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-900 border-blue-800'
              : 'bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 border-teal-800'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold tracking-wide uppercase text-[11px] text-teal-300 flex items-center gap-1.5">
                {isDirect ? <Radio className="h-4 w-4 text-blue-400" /> : <Satellite className="h-4 w-4 text-teal-400" />}
                GROUNDWATER INTELLIGENCE
              </span>

              {/* Coverage Badge */}
              <span
                className={`rounded-full text-[11px] font-extrabold px-3 py-0.5 border font-mono ${
                  isDirect
                    ? 'bg-blue-500/20 text-blue-200 border-blue-400/40'
                    : 'bg-teal-500/20 text-teal-200 border-teal-400/40'
                }`}
              >
                {data.coverage_type}
              </span>
            </div>

            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-stone-300" />
              <span>Location: {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E</span>
            </h2>

            <p className="text-xs text-stone-300 font-medium">
              {isDirect
                ? `Direct telemetry node ${data.nearest_station_name} (${data.nearest_station_id}) • ${data.nearest_station_distance_km} km away`
                : `No direct station within 15 km (nearest DWLR well is ${data.nearest_station_distance_km} km away). Operating in Satellite-Assisted Mode.`}
            </p>
          </div>

          <button
            onClick={onClose}
            className="self-start sm:self-auto rounded-full bg-white/10 hover:bg-white/20 p-2 text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 text-xs font-bold text-stone-600 gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'overview' ? 'border-teal-600 text-teal-900 font-extrabold' : 'border-transparent hover:text-stone-900'
            }`}
          >
            Spatial Overview &amp; Forecast
          </button>
          <button
            onClick={() => setActiveTab('crops')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'crops' ? 'border-teal-600 text-teal-900 font-extrabold' : 'border-transparent hover:text-stone-900'
            }`}
          >
            Water-Smart Crop Advice
          </button>
          <button
            onClick={() => setActiveTab('irrigation')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'irrigation' ? 'border-teal-600 text-teal-900 font-extrabold' : 'border-transparent hover:text-stone-900'
            }`}
          >
            Irrigation &amp; Conservation
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'sources' ? 'border-teal-600 text-teal-900 font-extrabold' : 'border-transparent hover:text-stone-900'
            }`}
          >
            Data Sources &amp; Confidence
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: OVERVIEW & FORECAST */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Top Condition & Signal Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* 1. Condition Badge */}
                <div className={`p-4 rounded-2xl border ${condStyle.bg} ${condStyle.border} space-y-1`}>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                    Groundwater Condition
                  </span>
                  <div className="flex items-center justify-between">
                    <span className={`text-base font-black ${condStyle.text}`}>
                      {data.groundwater_condition.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono font-bold">
                      {(data.stress_score * 100).toFixed(0)}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 font-medium">
                    Stress Score: <strong>{data.stress_score.toFixed(2)}</strong>
                  </p>
                </div>

                {/* 2. Trajectory Trend */}
                <div className="p-4 rounded-2xl border border-stone-200 bg-white space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                    Trajectory Trend
                  </span>
                  <div className="flex items-center gap-2">
                    {data.trend === 'RISING' ? (
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    ) : data.trend === 'FALLING' ? (
                      <TrendingDown className="h-5 w-5 text-rose-600" />
                    ) : (
                      <Minus className="h-5 w-5 text-amber-600" />
                    )}
                    <span className="text-base font-black text-stone-900">{data.trend}</span>
                  </div>
                  <p className="text-[11px] text-stone-500 font-medium">
                    30-Day Seasonal Trajectory
                  </p>
                </div>

                {/* 3. Recharge Outlook */}
                <div className="p-4 rounded-2xl border border-stone-200 bg-white space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                    Recharge Outlook
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-teal-800">{data.recharge_outlook}</span>
                    <span className="text-xs font-mono font-extrabold text-teal-700">
                      Score: {data.recharge_score}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 font-medium">
                    Infiltration &amp; Rainfall Signal
                  </p>
                </div>

              </div>

              {/* Forecast & 30-Day Outlook Card */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                    <span>🔮 {isDirect ? 'Direct Hydrodynamic 30-Day Forecast' : 'Satellite-Assisted Groundwater Outlook'}</span>
                  </h4>
                  <span className={`text-[10px] font-extrabold font-mono px-2.5 py-0.5 rounded-full border ${
                    data.forecast_confidence === 'HIGH'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : data.forecast_confidence === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}>
                    CONFIDENCE: {data.forecast_confidence}
                  </span>
                </div>

                <p className="text-xs text-stone-700 font-medium leading-relaxed">
                  {data.forecast_summary}
                </p>

                <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">
                      {isDirect ? 'Direct Observation Depth' : 'Model-Derived Depth Estimate'}
                    </span>
                    <strong className="text-sm text-slate-900 font-extrabold">
                      {isDirect
                        ? `${data.forecast_30d_water_level} m mbgl`
                        : (data.estimated_depth_range || 'Model-derived range estimate')}
                    </strong>
                    {!isDirect && (
                      <span className="block text-[10px] text-amber-700 font-medium">
                        Model-derived spatial estimate; not a direct well measurement.
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Precipitation Signal</span>
                    <strong className="text-sm text-slate-900 font-bold">{data.rainfall_signal}</strong>
                  </div>
                </div>
              </div>

              {/* Risk Signals & Alerts */}
              <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
                <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  {isDirect ? 'DWLR Telemetry Alerts' : 'Satellite-Assisted Risk Signals'}
                </h4>
                <ul className="space-y-1.5 text-xs text-amber-900 font-medium">
                  {data.risk_alerts.map((alert, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{alert}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Farmer Action Plan */}
              <div className="p-5 rounded-2xl border border-teal-200 bg-teal-50/30 space-y-3">
                <h4 className="font-extrabold text-teal-950 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  Actionable Farmer Recommendations
                </h4>
                <div className="space-y-2 text-xs text-stone-800 font-medium">
                  {data.farmer_recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-teal-100">
                      <span className="h-5 w-5 rounded-full bg-teal-700 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="leading-snug pt-0.5">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: WATER-SMART CROP ADVICE */}
          {activeTab === 'crops' && (
            <div className="space-y-6">
              
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-emerald-700" />
                  <h4 className="font-extrabold text-emerald-950 text-sm">
                    Agronomic Water Availability Assessment
                  </h4>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed font-medium">
                  {data.crop_implications}
                </p>
              </div>

              {/* Recommended Crops Grid */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
                  Recommended Water-Smart Crops for Current Stress Level ({data.groundwater_condition})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {data.recommended_crops.map((crop, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-stone-200 bg-white space-y-1 shadow-subtle">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-stone-900 text-sm">{crop}</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-mono">
                          Rank #{idx + 1}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        Optimized for {data.groundwater_condition.replace('_', ' ').toLowerCase()} conditions.
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-600 flex items-center gap-2 font-medium">
                <Info className="h-4 w-4 text-stone-400 shrink-0" />
                <span>Recommendations powered by Phase F Hydro-Agronomic Crop Engine. No arbitrary agronomic rules added outside core recommender.</span>
              </div>

            </div>
          )}

          {/* TAB 3: IRRIGATION & CONSERVATION */}
          {activeTab === 'irrigation' && (
            <div className="space-y-6">
              
              <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-blue-700" />
                  <h4 className="font-extrabold text-blue-950 text-sm">
                    Irrigation Guidance &amp; Water Conservation
                  </h4>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed font-medium">
                  {data.irrigation_implications}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-stone-200 bg-white space-y-2">
                  <h5 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                    Rainfall Signal Integration
                  </h5>
                  <p className="text-stone-600 leading-relaxed">
                    Current 30-Day Signal: <strong>{data.rainfall_signal}</strong>. Schedule supplemental irrigation only when soil tensiometer thresholds indicate active root-zone depletion.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-stone-200 bg-white space-y-2">
                  <h5 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                    Aquifer Conservation Rule
                  </h5>
                  <p className="text-stone-600 leading-relaxed">
                    Current Stress Index is <strong>{data.stress_score.toFixed(2)}</strong>. Avoid continuous daytime tube-well operation to limit thermal evaporation losses.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: DATA SOURCES & PROVENANCE */}
          {activeTab === 'sources' && (
            <div className="space-y-6">
              
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Overall Data Confidence</span>
                  <span className={`font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-full ${
                    data.confidence === 'HIGH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {data.confidence} ({(data.confidence_score * 100).toFixed(0)}%)
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-snug">
                  Uncertainty bounds automatically propagate through 30-day forecast trajectories and crop recommendation confidence tiers.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-stone-900 uppercase text-[11px] tracking-wider">Data Provenance Pipeline</h4>
                <div className="space-y-2">
                  {data.data_sources.map((src, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-stone-200 bg-white flex items-center justify-between">
                      <span className="font-mono font-bold text-stone-800">{src}</span>
                      <span className="text-[10px] text-stone-500 font-mono">Simulated Signal</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Honesty Disclaimer */}
              <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="h-4 w-4 text-amber-700" />
                  <span>Data Honesty &amp; Scientific Transparency Disclaimer</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  {data.disclaimer}
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Footer Bar */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-500 gap-2">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-stone-400" />
            <span>Mode: <strong>{data.data_mode}</strong></span>
            <span>&bull;</span>
            <span>Sync: {new Date(data.timestamp).toLocaleTimeString()}</span>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-xs transition-colors cursor-pointer self-end sm:self-auto"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
};
