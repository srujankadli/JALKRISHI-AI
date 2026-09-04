import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  MapPin,
  Navigation,
  Droplets,
  CloudRain,
  Sprout,
  Sun,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import type {
  SoilType,
  CropSeason,
  WaterAvailabilityLevel,
  RainfallCondition,
} from '../../types';
import type { DWLRStation } from '../../types';

interface FarmProfileFormProps {
  states: string[];
  districts: string[];
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  soilType: SoilType;
  onSoilChange: (soil: SoilType) => void;
  season: CropSeason;
  onSeasonChange: (season: CropSeason) => void;
  waterAvailability: WaterAvailabilityLevel;
  onWaterChange: (water: WaterAvailabilityLevel) => void;
  rainfallCondition: RainfallCondition;
  onRainfallChange: (rain: RainfallCondition) => void;
  nearbyStation: DWLRStation | null;
  onUseMyLocation: () => void;
  onApplyPresetScenario: (scenario: 'stressed' | 'normal' | 'high_rain' | 'dryland') => void;
  onGeneratePlan: () => void;
  isGenerating?: boolean;
}

export const FarmProfileForm: React.FC<FarmProfileFormProps> = ({
  states,
districts,
  selectedState,
  onStateChange,
  selectedDistrict,
  onDistrictChange,
  soilType,
  onSoilChange,
  season,
  onSeasonChange,
  waterAvailability,
  onWaterChange,
  rainfallCondition,
  onRainfallChange,
  nearbyStation,
  onUseMyLocation,
  onApplyPresetScenario,
  onGeneratePlan,
  isGenerating = false,
}) => {
  const { t } = useLanguage();
  const soilOptions: { id: SoilType; label: string; desc: string }[] = [
    { id: 'Alluvial', label: t('Alluvial Soil'), desc: t('Highly fertile river plains with excellent moisture holding.') },
    { id: 'Black', label: t('Black / Regur Soil'), desc: t('High clay content; excellent water retention for cotton & pulses.') },
    { id: 'Red', label: t('Red & Loamy Soil'), desc: t('Permeable and well-drained; ideal for millets, groundnut & pulses.') },
    { id: 'Sandy', label: t('Sandy / Arid Soil'), desc: t('Light, fast drainage; requires drought-hardy millets & bajra.') },
    { id: 'Loamy', label: t('Loamy Garden Soil'), desc: t('Balanced sand, silt, and clay; universally versatile.') },
    { id: 'Clay', label: t('Clay Heavy Soil'), desc: t('Dense retention; suitable for paddy and intensive crops.') },
  ];

  const waterOptions: {
    id: WaterAvailabilityLevel;
    label: string;
    desc: string;
    icon: any;
    color: string;
  }[] = [
    {
      id: 'Abundant',
      label: t('Abundant Water'),
      desc: t('Shallow water table (<10m) or reliable canal access.'),
      icon: Droplets,
      color: 'text-sky-600 bg-sky-50 border-sky-200',
    },
    {
      id: 'Moderate',
      label: t('Moderate Water'),
      desc: t('Adequate seasonal reserve; standard tube-well depth.'),
      icon: Droplets,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'Limited',
      label: t('Limited Water'),
      desc: t('Deep water table (>25m); pumping rate declining.'),
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      id: 'Stressed',
      label: 'Critical / Stressed',
      desc: 'Severe aquifer depletion (<30 days to critical limit).',
      icon: AlertTriangle,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
    },
  ];

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-subtle sm:p-7 space-y-6">
      {/* Header & Preset Scenarios Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-agri-700 flex items-center gap-1.5">
            <Sprout className="h-4 w-4 text-agri-600" />
            Interactive Farm Conditions Input
          </span>
          <h2 className="mt-1 text-xl sm:text-2xl font-black text-stone-900">
            Tell us about your farm & available water
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Configure your location, soil type, and groundwater availability to receive tailored crop recommendations.
          </p>
        </div>

        {/* Quick Demo Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-400">Try Scenario:</span>
          <button
            onClick={() => onApplyPresetScenario('stressed')}
            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-all cursor-pointer"
          >
            ⚠️ Stressed Farm
          </button>
          <button
            onClick={() => onApplyPresetScenario('normal')}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer"
          >
            🌱 Normal Monsoon
          </button>
          <button
            onClick={() => onApplyPresetScenario('dryland')}
            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-all cursor-pointer"
          >
            🏜️ Dryland / Arid
          </button>
        </div>
      </div>

      {/* STEP 1: Location & Geolocation */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-agri-700" />
            Step 1 &bull; Farm Location & Nearby Observation Well
          </label>
          <button
            type="button"
            onClick={onUseMyLocation}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3 py-1 text-xs font-bold text-stone-700 hover:bg-stone-100 hover:border-agri-600 transition-all cursor-pointer"
          >
            <Navigation className="h-3 w-3 text-agri-700" />
            <span>{t('Use My Location (Auto-Detect)')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="text-[11px] font-bold text-stone-500 block mb-1">State:</span>
            <select
              value={selectedState}
              onChange={(e) => onStateChange(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-stone-50/80 px-3 py-2.5 text-xs font-semibold text-stone-900 focus:border-agri-600 focus:bg-white focus:outline-none"
            >
              {states.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-[11px] font-bold text-stone-500 block mb-1">District:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => onDistrictChange(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-stone-50/80 px-3 py-2.5 text-xs font-semibold text-stone-900 focus:border-agri-600 focus:bg-white focus:outline-none"
            >
              {districts.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Connected Nearby DWLR Groundwater Context Card */}
        {nearbyStation && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-agri-200 bg-agri-50/60 p-3.5 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-agri-700 p-2 text-white shadow-xs">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-agri-800 uppercase block">
                  Groundwater Telemetry Context ({nearbyStation.stationName})
                </span>
                <p className="font-extrabold text-stone-900 text-xs sm:text-sm">
                  Depth: {nearbyStation.waterLevel} mbgl &bull; Status:{' '}
                  <span className="capitalize">{nearbyStation.status}</span> &bull; Trend:{' '}
                  <span className="font-bold text-rose-700">
                    {nearbyStation.trend === 'falling' ? '↓ Falling' : '→ Stable'}
                  </span>
                </p>
              </div>
            </div>

            {nearbyStation.daysToCritical && (
              <span className="rounded-lg bg-rose-100 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-800">
                ⏳ ~{nearbyStation.daysToCritical} Days to Critical
              </span>
            )}
          </div>
        )}
      </div>

      {/* STEP 2: Soil Type Selection */}
      <div className="space-y-2.5 pt-2 border-t border-stone-100">
        <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <Sprout className="h-3.5 w-3.5 text-amber-700" />
          Step 2 &bull; Select Your Soil Type
        </label>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {soilOptions.map((opt) => {
            const isSelected = soilType === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => onSoilChange(opt.id)}
                className={`rounded-xl border p-3 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-agri-600 bg-agri-50 shadow-xs ring-2 ring-agri-500/20'
                    : 'border-stone-200 bg-stone-50/50 hover:bg-white hover:border-stone-300'
                }`}
              >
                <div>
                  <h4 className="text-xs font-extrabold text-stone-900">{opt.label}</h4>
                  <p className="mt-1 text-[10px] text-stone-500 leading-snug line-clamp-2">
                    {opt.desc}
                  </p>
                </div>
                {isSelected && (
                  <span className="mt-2 text-[10px] font-bold text-agri-700 flex items-center gap-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Selected
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 3 & STEP 4: Season, Weather & Water Availability */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 pt-2 border-t border-stone-100">
        {/* Season Selector */}
        <div className="lg:col-span-4 space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Sun className="h-3.5 w-3.5 text-amber-600" />
            Step 3 &bull; Cropping Season
          </label>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'Kharif', label: 'Kharif', desc: 'Monsoon (Jun-Oct)' },
                { id: 'Rabi', label: 'Rabi', desc: 'Winter (Nov-Apr)' },
                { id: 'Zaid', label: 'Zaid', desc: 'Summer (Apr-Jun)' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSeasonChange(s.id)}
                className={`rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                  season === s.id
                    ? 'border-agri-600 bg-agri-700 text-white font-bold shadow-xs'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="text-xs font-extrabold">{s.label}</div>
                <div
                  className={`text-[10px] leading-tight ${
                    season === s.id ? 'text-agri-100' : 'text-stone-400'
                  }`}
                >
                  {s.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Rainfall Condition */}
        <div className="lg:col-span-3 space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <CloudRain className="h-3.5 w-3.5 text-sky-600" />
            Step 4A &bull; Rainfall
          </label>

          <div className="grid grid-cols-3 gap-1.5">
            {(['Low', 'Normal', 'High'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRainfallChange(r)}
                className={`rounded-xl border py-2 px-1 text-center transition-all cursor-pointer text-xs font-bold ${
                  rainfallCondition === r
                    ? 'border-sky-600 bg-sky-700 text-white shadow-xs'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {r} Rain
              </button>
            ))}
          </div>
        </div>

        {/* Water Availability Level */}
        <div className="lg:col-span-5 space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-water-700" />
            Step 4B &bull; Water Availability
          </label>

          <div className="grid grid-cols-2 gap-2">
            {waterOptions.map((w) => {
              const isSelected = waterAvailability === w.id;
              const Icon = w.icon;
              return (
                <div
                  key={w.id}
                  onClick={() => onWaterChange(w.id)}
                  className={`rounded-xl border p-2 transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? `${w.color} font-bold ring-2 ring-agri-500/20 shadow-xs`
                      : 'border-stone-200 bg-stone-50/50 hover:bg-white text-stone-700'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="overflow-hidden">
                    <span className="text-xs font-extrabold block truncate">{w.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STEP 5: Generate Action CTA */}
      <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <HelpCircle className="h-4 w-4 text-stone-400 shrink-0" />
          <span>
            Scoring evaluates soil compatibility, water stress margins, and seasonal crop thermal requirements.
          </span>
        </div>

        <button
          onClick={onGeneratePlan}
          disabled={isGenerating}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-agri-700 px-8 py-3.5 text-sm font-black text-white shadow-elevated hover:bg-agri-800 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span>{isGenerating ? 'Analyzing Crop Plan...' : 'Generate Crop Plan'}</span>
        </button>
      </div>
    </div>
  );
};
