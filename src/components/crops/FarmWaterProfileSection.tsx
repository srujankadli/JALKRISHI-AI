import React, { useState } from 'react';
import {
  MapPin,
  Droplets,
  Sprout,
  AlertTriangle,
  Sparkles,
  Layers,
  ArrowRight,
  Edit3,
  Waves,
  CloudRain,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface FarmWaterProfile {
  location: string;
  facilities: string[];
  reliability: string;
  groundwaterDependencyRange: string;
  groundwaterPercentage?: number | null;
  externalWaterDependencyRange: string;
  externalPercentage?: number | null;
  rainfallDependency?: string | null;
  rainfallPercentage?: number | null;
}

export const IRRIGATION_FACILITIES_OPTIONS = [
  { id: 'borewell', label: 'Borewell / Tube well' },
  { id: 'open_well', label: 'Open well' },
  { id: 'canal', label: 'Canal' },
  { id: 'farm_pond', label: 'Farm pond' },
  { id: 'river_stream', label: 'River / stream' },
  { id: 'community', label: 'Community irrigation' },
  { id: 'rainwater_only', label: 'Rainwater only' },
  { id: 'purchased_tanker', label: 'Purchased / tanker water' },
  { id: 'other', label: 'Other' },
];

export const WATER_RELIABILITY_OPTIONS = [
  { id: 'year_round', label: 'Available most of the year', icon: '🟢', variant: 'stable' },
  { id: 'seasonal', label: 'Available only in some seasons', icon: '🟡', variant: 'emerging' },
  { id: 'often_limited', label: 'Often limited', icon: '🟠', variant: 'escalating' },
  { id: 'very_limited', label: 'Very limited', icon: '🔴', variant: 'critical' },
];

export const DEPENDENCY_OPTIONS = [
  { id: '0-25', label: '0–25%', category: 'Low', variant: 'stable' },
  { id: '26-50', label: '26–50%', category: 'Moderate', variant: 'emerging' },
  { id: '51-75', label: '51–75%', category: 'High', variant: 'escalating' },
  { id: '76-100', label: '76–100%', category: 'Very High', variant: 'critical' },
  { id: 'not_sure', label: 'Not sure', category: 'Not specified', variant: 'info' },
];

export const RAINFALL_OPTIONS = [
  { id: 'mostly_rainfed', label: 'Mostly rain-fed' },
  { id: 'partly_rainfed', label: 'Partly rain-fed' },
  { id: 'mostly_irrigated', label: 'Mostly irrigated' },
  { id: 'fully_irrigated', label: 'Fully irrigated' },
];

export function getDependencyClassification(
  rangeStr: string,
  exactPct?: number | null
): { label: string; category: string; variant: 'stable' | 'emerging' | 'escalating' | 'critical' | 'info' } {
  if (exactPct !== undefined && exactPct !== null) {
    if (exactPct <= 25) return { label: `${exactPct}% — Low`, category: 'Low', variant: 'stable' };
    if (exactPct <= 50) return { label: `${exactPct}% — Moderate`, category: 'Moderate', variant: 'emerging' };
    if (exactPct <= 75) return { label: `${exactPct}% — High`, category: 'High', variant: 'escalating' };
    return { label: `${exactPct}% — Very High`, category: 'Very High', variant: 'critical' };
  }

  const clean = (rangeStr || '').trim();
  if (clean === '0–25%' || clean === '0-25%' || clean === '0-25') {
    return { label: '0–25% — Low', category: 'Low', variant: 'stable' };
  }
  if (clean === '26–50%' || clean === '26-50%' || clean === '26-50') {
    return { label: '26–50% — Moderate', category: 'Moderate', variant: 'emerging' };
  }
  if (clean === '51–75%' || clean === '51-75%' || clean === '51-75') {
    return { label: '51–75% — High', category: 'High', variant: 'escalating' };
  }
  if (clean === '76–100%' || clean === '76-100%' || clean === '76-100') {
    return { label: '76–100% — Very High', category: 'Very High', variant: 'critical' };
  }

  return { label: 'Not specified', category: 'Not specified', variant: 'info' };
}

interface FarmWaterProfileSectionProps {
  profile: FarmWaterProfile | null;
  onSaveProfile: (profile: FarmWaterProfile) => void;
  jalkrishiGroundwaterStatus?: string;
  isGenerating?: boolean;
}

export const FarmWaterProfileSection: React.FC<FarmWaterProfileSectionProps> = ({
  profile,
  onSaveProfile,
  jalkrishiGroundwaterStatus = 'Stable',
  isGenerating = false,
}) => {
  const { t } = useLanguage();

  const [isEditing, setIsEditing] = useState<boolean>(!profile);
  const [location, setLocation] = useState<string>(profile?.location || 'Shivamogga');
  const [facilities, setFacilities] = useState<string[]>(profile?.facilities || ['Borewell / Tube well']);
  const [reliability, setReliability] = useState<string>(profile?.reliability || 'Available most of the year');
  const [groundwaterRange, setGroundwaterRange] = useState<string>(profile?.groundwaterDependencyRange || '51-75');
  const [groundwaterPct, setGroundwaterPct] = useState<string>(
    profile?.groundwaterPercentage !== undefined && profile?.groundwaterPercentage !== null
      ? String(profile.groundwaterPercentage)
      : ''
  );
  const [externalRange, setExternalRange] = useState<string>(profile?.externalWaterDependencyRange || '0-25');
  const [externalPct, setExternalPct] = useState<string>(
    profile?.externalPercentage !== undefined && profile?.externalPercentage !== null
      ? String(profile.externalPercentage)
      : ''
  );
  const [rainfallDep, setRainfallDep] = useState<string>(profile?.rainfallDependency || 'Partly rain-fed');
  const [rainfallPct, setRainfallPct] = useState<string>(
    profile?.rainfallPercentage !== undefined && profile?.rainfallPercentage !== null
      ? String(profile.rainfallPercentage)
      : ''
  );

  const [locationError, setLocationError] = useState<string | null>(null);

  const toggleFacility = (facilityLabel: string) => {
    setFacilities((prev) =>
      prev.includes(facilityLabel)
        ? prev.filter((f) => f !== facilityLabel)
        : [...prev, facilityLabel]
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLoc = location.trim();
    if (!trimmedLoc) {
      setLocationError(t('Please enter your farm location first.'));
      return;
    }
    setLocationError(null);

    const parsedGwPct = groundwaterPct.trim() ? parseInt(groundwaterPct, 10) : null;
    const parsedExtPct = externalPct.trim() ? parseInt(externalPct, 10) : null;
    const parsedRainPct = rainfallPct.trim() ? parseInt(rainfallPct, 10) : null;

    const newProfile: FarmWaterProfile = {
      location: trimmedLoc,
      facilities: facilities.length > 0 ? facilities : ['Borewell / Tube well'],
      reliability,
      groundwaterDependencyRange: groundwaterRange,
      groundwaterPercentage: parsedGwPct !== null && !isNaN(parsedGwPct) ? parsedGwPct : null,
      externalWaterDependencyRange: externalRange,
      externalPercentage: parsedExtPct !== null && !isNaN(parsedExtPct) ? parsedExtPct : null,
      rainfallDependency: rainfallDep,
      rainfallPercentage: parsedRainPct !== null && !isNaN(parsedRainPct) ? parsedRainPct : null,
    };

    onSaveProfile(newProfile);
    setIsEditing(false);
  };

  const getBadgeColor = (variant: 'stable' | 'emerging' | 'escalating' | 'critical' | 'info') => {
    switch (variant) {
      case 'stable':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'emerging':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'escalating':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'critical':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'info':
      default:
        return 'bg-stone-50 text-stone-800 border-stone-200';
    }
  };

  const hasNumericalBreakdown = (p: FarmWaterProfile) => {
    return (
      p.groundwaterPercentage !== null &&
      p.groundwaterPercentage !== undefined &&
      !isNaN(p.groundwaterPercentage)
    );
  };

  // If in Edit mode (or no profile yet)
  if (isEditing || !profile) {
    return (
      <div id="farm-water-profile-questionnaire" className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7 shadow-sm space-y-6">
        <div className="border-b border-stone-100 pb-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-200 text-emerald-700">
              <Sprout className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-black text-stone-900">
              🌱 {t('Crop Advisor — Farm Water Profile Questionnaire')}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 font-medium">
            {t('Tell us about your farm irrigation and water resources to receive tailored, water-smart crop recommendations.')}
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* STEP 1: Location */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              1. {t('Where is your farm?')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-stone-400" />
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  if (locationError) setLocationError(null);
                }}
                placeholder={t('Enter village, town, block, or district (e.g. Shivamogga, Bengaluru, Thanjavur)')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all outline-hidden"
              />
            </div>
            {locationError && (
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {locationError}
              </p>
            )}
          </div>

          {/* STEP 2: Irrigation Facilities (Multi-Select) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                2. {t('What irrigation facilities are available on your farm?')}
              </label>
              <span className="text-[11px] font-medium text-stone-400">{t('Select all that apply')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {IRRIGATION_FACILITIES_OPTIONS.map((fac) => {
                const checked = facilities.includes(fac.label);
                return (
                  <label
                    key={fac.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      checked
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-200 text-emerald-950 font-bold'
                        : 'border-stone-200 bg-white hover:border-emerald-300 hover:bg-stone-50/50 text-stone-700 font-medium'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFacility(fac.label)}
                      className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm">{t(fac.label)}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-stone-400 italic">
              {t('Based on the information you provided.')}
            </p>
          </div>

          {/* STEP 3: Water Availability / Reliability (Single-Select) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              3. {t('How reliable is your irrigation water?')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WATER_RELIABILITY_OPTIONS.map((rel) => {
                const selected = reliability === rel.label;
                return (
                  <label
                    key={rel.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      selected
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-200 text-emerald-950 font-bold'
                        : 'border-stone-200 bg-white hover:border-emerald-300 hover:bg-stone-50/50 text-stone-700 font-medium'
                    }`}
                  >
                    <input
                      type="radio"
                      name="water_reliability"
                      checked={selected}
                      onChange={() => setReliability(rel.label)}
                      className="h-4 w-4 border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-sm">{rel.icon}</span>
                    <span className="text-xs sm:text-sm">{t(rel.label)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* STEP 4: Groundwater Dependence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                4. {t("How much of your farm's irrigation water comes from groundwater?")}
              </label>
              <span className="text-[11px] font-medium text-stone-400">{t('Borewells, tube wells, open wells')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DEPENDENCY_OPTIONS.map((opt) => {
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setGroundwaterRange(opt.id);
                      if (opt.id === 'not_sure') setGroundwaterPct('');
                    }}
                    className={`p-2.5 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${
                      groundwaterRange === opt.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {t(opt.label)}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-stone-500 font-medium">{t('Or enter exact percentage (optional):')}</span>
              <input
                type="number"
                min="0"
                max="100"
                value={groundwaterPct}
                onChange={(e) => {
                  setGroundwaterPct(e.target.value);
                  if (e.target.value) setGroundwaterRange('custom');
                }}
                placeholder="e.g. 70"
                className="w-24 px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 text-xs font-bold text-stone-900 focus:bg-white focus:border-emerald-500 outline-hidden"
              />
              <span className="text-xs font-bold text-stone-600">%</span>
            </div>
          </div>

          {/* STEP 5: External Water Dependence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                5. {t('How much of your irrigation water comes from external sources?')}
              </label>
              <span className="text-[11px] font-medium text-stone-400">{t('Canal, river, community, purchased tanker')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DEPENDENCY_OPTIONS.map((opt) => {
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setExternalRange(opt.id);
                      if (opt.id === 'not_sure') setExternalPct('');
                    }}
                    className={`p-2.5 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${
                      externalRange === opt.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {t(opt.label)}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-stone-500 font-medium">{t('Or enter exact percentage (optional):')}</span>
              <input
                type="number"
                min="0"
                max="100"
                value={externalPct}
                onChange={(e) => {
                  setExternalPct(e.target.value);
                  if (e.target.value) setExternalRange('custom');
                }}
                placeholder="e.g. 20"
                className="w-24 px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 text-xs font-bold text-stone-900 focus:bg-white focus:border-emerald-500 outline-hidden"
              />
              <span className="text-xs font-bold text-stone-600">%</span>
            </div>
          </div>

          {/* STEP 6: Rainfall Dependence (Optional) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                6. {t('How much does your farm depend on rainfall? (Optional)')}
              </label>
              <span className="text-[11px] font-medium text-stone-400">{t('Seasonal rain-fed profile')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RAINFALL_OPTIONS.map((opt) => {
                const selected = rainfallDep === opt.label;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRainfallDep(opt.label)}
                    className={`p-2.5 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${
                      selected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {t(opt.label)}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-stone-500 font-medium">{t('Or enter rainfall share (optional):')}</span>
              <input
                type="number"
                min="0"
                max="100"
                value={rainfallPct}
                onChange={(e) => setRainfallPct(e.target.value)}
                placeholder="e.g. 10"
                className="w-24 px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 text-xs font-bold text-stone-900 focus:bg-white focus:border-emerald-500 outline-hidden"
              />
              <span className="text-xs font-bold text-stone-600">%</span>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100">
            {profile && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-bold text-stone-500 hover:text-stone-800 underline cursor-pointer"
              >
                {t('Cancel & View Existing Profile')}
              </button>
            )}
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 font-bold text-white text-sm shadow-sm transition-all cursor-pointer ml-auto"
            >
              <span>{t('Save Profile & Get Crop Recommendations')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Profile Summary View (Compact Card)
  const gwClass = getDependencyClassification(profile.groundwaterDependencyRange, profile.groundwaterPercentage);
  const extClass = getDependencyClassification(profile.externalWaterDependencyRange, profile.externalPercentage);
  const showNumericalBar = hasNumericalBreakdown(profile);

  return (
    <div id="farm-water-profile-card" className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
            <Sprout className="h-4 w-4 text-emerald-600" />
            {t('YOUR FARM WATER PROFILE')}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-700" />
            <h3 className="text-xl font-black text-stone-900">{profile.location}</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-bold text-stone-700 shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Edit3 className="h-3.5 w-3.5 text-stone-500" />
          <span>{t('Edit Water Profile')}</span>
        </button>
      </div>

      {/* Grid of Profile Attributes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Irrigation Facilities */}
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
          <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
            <Droplets className="h-3.5 w-3.5 text-emerald-600" />
            {t('Irrigation Facilities')}
          </span>
          <p className="text-xs sm:text-sm font-bold text-stone-900">
            {profile.facilities.map((f) => t(f)).join(' • ')}
          </p>
        </div>

        {/* 2. Groundwater Dependence */}
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
          <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
            <Waves className="h-3.5 w-3.5 text-amber-600" />
            {t('Groundwater Dependence')}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-extrabold border ${getBadgeColor(
                gwClass.variant
              )}`}
            >
              {gwClass.label}
            </span>
          </div>
        </div>

        {/* 3. External Water Dependence */}
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
          <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-sky-600" />
            {t('External Water Dependence')}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-extrabold border ${getBadgeColor(
                extClass.variant
              )}`}
            >
              {extClass.label}
            </span>
          </div>
        </div>

        {/* 4. Water Reliability & Rainfall */}
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
          <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
            <CloudRain className="h-3.5 w-3.5 text-stone-500" />
            {t('Water Reliability')}
          </span>
          <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
            {t(profile.reliability)}
          </p>
          {profile.rainfallDependency && (
            <p className="text-[11px] text-stone-500 font-medium">
              {t('Rainfall')}: {profile.rainfallPercentage ? `${profile.rainfallPercentage}%` : t(profile.rainfallDependency)}
            </p>
          )}
        </div>
      </div>

      {/* Visual Water Sources Balance Bar (ONLY if exact numerical values exist) */}
      {showNumericalBar && (
        <div className="space-y-2 p-4 rounded-2xl bg-stone-50/70 border border-stone-200">
          <div className="flex items-center justify-between text-xs font-bold text-stone-700">
            <span>{t('Farm Water Sources Balance')}</span>
            <span className="text-[11px] text-stone-500 font-medium">{t('Self-reported allocation')}</span>
          </div>

          <div className="flex h-3 w-full overflow-hidden rounded-full bg-stone-200">
            {profile.groundwaterPercentage && profile.groundwaterPercentage > 0 && (
              <div
                style={{ width: `${profile.groundwaterPercentage}%` }}
                className="bg-amber-500"
                title={`${t('Groundwater')}: ${profile.groundwaterPercentage}%`}
              />
            )}
            {profile.externalPercentage && profile.externalPercentage > 0 && (
              <div
                style={{ width: `${profile.externalPercentage}%` }}
                className="bg-sky-500"
                title={`${t('External sources')}: ${profile.externalPercentage}%`}
              />
            )}
            {profile.rainfallPercentage && profile.rainfallPercentage > 0 && (
              <div
                style={{ width: `${profile.rainfallPercentage}%` }}
                className="bg-emerald-500"
                title={`${t('Rainfall')}: ${profile.rainfallPercentage}%`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-stone-600 pt-1">
            {profile.groundwaterPercentage !== null && profile.groundwaterPercentage !== undefined && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                {t('Groundwater')}: {profile.groundwaterPercentage}%
              </span>
            )}
            {profile.externalPercentage !== null && profile.externalPercentage !== undefined && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                {t('External sources')}: {profile.externalPercentage}%
              </span>
            )}
            {profile.rainfallPercentage !== null && profile.rainfallPercentage !== undefined && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {t('Rainfall')}: {profile.rainfallPercentage}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* JalKrishi Assessment Fusion & Insight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        {/* Farmer Reported vs JalKrishi Assessment comparison */}
        <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <span>{t('FARMER-REPORTED')}</span>
            <span className="text-emerald-700">{t('JALKRISHI ASSESSMENT')}</span>
          </div>
          <div className="space-y-1 text-xs sm:text-sm text-stone-800 font-medium">
            <p>
              <strong>{t('Groundwater Dependence')}:</strong> {gwClass.label}
            </p>
            <p>
              <strong>{t('Groundwater Conditions')}:</strong>{' '}
              <span className="font-bold text-emerald-800">{t(jalkrishiGroundwaterStatus)}</span>
            </p>
          </div>
          <p className="text-[11px] text-stone-400 italic pt-1 border-t border-stone-200/60">
            {t('Based on information you provided.')}
          </p>
        </div>

        {/* Practical Farmer Insight */}
        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-1.5 text-emerald-950">
          <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-800 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            {t('Practical Water Insight')}
          </span>
          <p className="text-xs sm:text-sm font-semibold text-emerald-900 leading-relaxed">
            {gwClass.category === 'High' || gwClass.category === 'Very High'
              ? profile.reliability.includes('limited') || profile.reliability.includes('Limited')
                ? t(
                    'Your farm currently relies heavily on groundwater while water reliability is limited. Consider crops with lower or moderate water requirements and strengthen rainwater harvesting.'
                  )
                : t(
                    'Your farm currently relies heavily on groundwater. The available JalKrishi assessment indicates stable groundwater conditions, but continued efficient irrigation is recommended.'
                  )
              : extClass.category === 'High' || extClass.category === 'Moderate'
              ? t(
                  'Your farm has access to external irrigation sources (e.g. canal or community supply) and lower groundwater dependence, providing stronger operational resilience.'
                )
              : t(
                  'Your farm has a balanced water profile. Continue monitoring local groundwater conditions and adopt water-smart irrigation.'
                )}
          </p>
        </div>
      </div>
    </div>
  );
};
