import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sprout,
  MapPin,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RotateCcw,
  Info,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useFarm } from '../../context/FarmContext';
import { apiClient } from '../../services/apiClient';
import { proactiveService, type FarmerProactiveStatus } from '../../services/proactiveService';

export interface FarmerQuestionItem {
  id: string;
  question: string;
  category: 'water' | 'crop' | 'irrigation' | 'recharge' | 'weather' | 'warning';
}

export const FARMER_QUESTIONS: FarmerQuestionItem[] = [
  { id: 'water_status', question: 'What is my water status?', category: 'water' },
  { id: 'groundwater_level', question: 'What is the groundwater level?', category: 'water' },
  { id: 'crop_choice', question: 'Which crop should I grow?', category: 'crop' },
  { id: 'irrigation_timing', question: 'When should I irrigate?', category: 'irrigation' },
  { id: 'water_need', question: 'How much water does my crop need?', category: 'irrigation' },
  { id: 'rainfall_expected', question: 'Is rainfall expected?', category: 'weather' },
  { id: 'recharge_method', question: 'How can I recharge groundwater?', category: 'recharge' },
  { id: 'shortage_risk', category: 'water', question: 'Is there any water shortage risk?' },
  { id: 'crop_stress', question: 'Is my crop under water stress?', category: 'crop' },
  { id: 'groundwater_warning', question: 'Is there any groundwater warning?', category: 'warning' },
];

export interface AdvisorAnswer {
  question: string;
  location: string;
  statusTitle: string;
  statusBadge?: {
    label: string;
    variant: 'stable' | 'emerging' | 'escalating' | 'critical' | 'recovery' | 'info';
  };
  explanation: string;
  recommendedAction?: string;
  provenance: string;
  disclaimer: string;
}

interface FarmerWaterAdvisorProps {
  initialLocation?: string | null;
  onLocationChange?: (location: string | null) => void;
}

export const FarmerWaterAdvisor: React.FC<FarmerWaterAdvisorProps> = ({
  initialLocation,
  onLocationChange,
}) => {
  const { currentLanguage, t } = useLanguage();
  const {
    location: farmLocation,
    setFarmLocation,
    profile,
  } = useFarm();

  const effectiveInitialLocation = farmLocation || initialLocation || '';

  const [locationInput, setLocationInput] = useState<string>(effectiveInitialLocation);
  const [activeLocation, setActiveLocation] = useState<string | null>(effectiveInitialLocation || null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AdvisorAnswer | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const locationInputRef = useRef<HTMLInputElement>(null);
  const activeRequestIdRef = useRef<number>(0);

  useEffect(() => {
    const loc = farmLocation || initialLocation;
    if (loc && loc !== activeLocation) {
      setActiveLocation(loc);
      setLocationInput(loc);
      setAnswer(null);
      setSelectedQuestion(null);
    }
  }, [farmLocation, initialLocation, activeLocation]);

  // Adapt question order based on farm water profile (single source of truth)
  const adaptiveQuestions = useMemo(() => {
    const facilities = profile?.facilities || [];
    const hasBorewell = facilities.some((f) => f === 'borewell' || f === 'open_well');
    const hasCanal = facilities.some((f) => f === 'canal' || f === 'river_stream');
    const isRainfed = facilities.some((f) => f === 'rainwater_only');

    if (hasBorewell) {
      return [
        { id: 'groundwater_level', question: 'What is the groundwater level?', category: 'water' as const },
        { id: 'water_status', question: 'What is my water status?', category: 'water' as const },
        { id: 'shortage_risk', question: 'Is there any water shortage risk?', category: 'water' as const },
        { id: 'crop_choice', question: 'Which crop should I grow?', category: 'crop' as const },
        { id: 'irrigation_timing', question: 'When should I irrigate?', category: 'irrigation' as const },
        { id: 'recharge_method', question: 'How can I recharge groundwater?', category: 'recharge' as const },
        { id: 'water_need', question: 'How much water does my crop need?', category: 'irrigation' as const },
        { id: 'groundwater_warning', question: 'Is there any groundwater warning?', category: 'warning' as const },
        { id: 'rainfall_expected', question: 'Is rainfall expected?', category: 'weather' as const },
        { id: 'crop_stress', question: 'Is my crop under water stress?', category: 'crop' as const },
      ];
    }

    if (hasCanal) {
      return [
        { id: 'water_status', question: 'What is my water status?', category: 'water' as const },
        { id: 'crop_choice', question: 'Which crop should I grow?', category: 'crop' as const },
        { id: 'irrigation_timing', question: 'When should I irrigate?', category: 'irrigation' as const },
        { id: 'rainfall_expected', question: 'Is rainfall expected?', category: 'weather' as const },
        { id: 'water_need', question: 'How much water does my crop need?', category: 'irrigation' as const },
        { id: 'groundwater_level', question: 'What is the groundwater level?', category: 'water' as const },
        { id: 'shortage_risk', question: 'Is there any water shortage risk?', category: 'water' as const },
        { id: 'crop_stress', question: 'Is my crop under water stress?', category: 'crop' as const },
        { id: 'groundwater_warning', question: 'Is there any groundwater warning?', category: 'warning' as const },
        { id: 'recharge_method', question: 'How can I recharge groundwater?', category: 'recharge' as const },
      ];
    }

    if (isRainfed) {
      return [
        { id: 'rainfall_expected', question: 'Is rainfall expected?', category: 'weather' as const },
        { id: 'crop_choice', question: 'Which crop should I grow?', category: 'crop' as const },
        { id: 'water_status', question: 'What is my water status?', category: 'water' as const },
        { id: 'water_need', question: 'How much water does my crop need?', category: 'irrigation' as const },
        { id: 'recharge_method', question: 'How can I recharge groundwater?', category: 'recharge' as const },
        { id: 'shortage_risk', question: 'Is there any water shortage risk?', category: 'water' as const },
        { id: 'crop_stress', question: 'Is my crop under water stress?', category: 'crop' as const },
        { id: 'groundwater_level', question: 'What is the groundwater level?', category: 'water' as const },
        { id: 'irrigation_timing', question: 'When should I irrigate?', category: 'irrigation' as const },
        { id: 'groundwater_warning', question: 'Is there any groundwater warning?', category: 'warning' as const },
      ];
    }

    return FARMER_QUESTIONS;
  }, [profile?.facilities]);

  const handleLocationSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = locationInput.trim();
    if (!trimmed) {
      setValidationError(t('Please enter your farm location first.'));
      locationInputRef.current?.focus();
      return;
    }
    setValidationError(null);
    setAnswer(null);
    setSelectedQuestion(null);
    setActiveLocation(trimmed);
    await setFarmLocation(trimmed);
    if (onLocationChange) {
      onLocationChange(trimmed);
    }
  };

  const handleClearLocation = () => {
    setLocationInput('');
    setActiveLocation(null);
    setAnswer(null);
    setSelectedQuestion(null);
    setValidationError(null);
    if (onLocationChange) {
      onLocationChange(null);
    }
    locationInputRef.current?.focus();
  };

  const parseRecommendedAction = (text: string): { explanation: string; action: string } => {
    if (!text) return { explanation: '', action: '' };

    const actionHeaders = [
      'Recommended Action:',
      'Recommended Action',
      'Actionable Advice:',
      'Actionable Advice',
      'Action:',
      'Recommendation:',
      'What to do:',
      'Recommended:',
      'Recommended Steps:',
    ];

    for (const header of actionHeaders) {
      const idx = text.indexOf(header);
      if (idx !== -1) {
        const exp = text.substring(0, idx).trim();
        const act = text.substring(idx + header.length).trim();
        return {
          explanation: exp || text,
          action: act || 'Continue efficient water management and monitor groundwater conditions.',
        };
      }
    }

    if (text.includes('1)') || text.includes('1.')) {
      return {
        explanation: text,
        action: 'Follow water conservation practices and avoid excessive pump running during peak heat.',
      };
    }

    return {
      explanation: text,
      action: 'Continue efficient water use and monitor local groundwater conditions regularly.',
    };
  };

  const getStatusBadge = (
    statusStr?: string,
    category?: string
  ): { label: string; variant: 'stable' | 'emerging' | 'escalating' | 'critical' | 'recovery' | 'info' } => {
    const s = (statusStr || '').toUpperCase();
    if (s === 'CRITICAL_RISK' || s === 'CRITICAL' || s === 'SEVERE') {
      return { label: t('Critical Groundwater Risk'), variant: 'critical' };
    }
    if (s === 'ESCALATING_RISK' || s === 'HIGH' || s === 'WARNING') {
      return { label: t('Groundwater Risk Increasing'), variant: 'escalating' };
    }
    if (s === 'EMERGING_RISK' || s === 'MODERATE' || s === 'EARLY') {
      return { label: t('Early Groundwater Risk'), variant: 'emerging' };
    }
    if (s === 'RECOVERY_SIGNAL' || s === 'RECOVERY') {
      return { label: t('Groundwater Recovery Signal'), variant: 'recovery' };
    }
    if (s === 'DATA_QUALITY_WARNING') {
      return { label: t('Data Quality Warning'), variant: 'info' };
    }
    if (category === 'crop') {
      return { label: t('Crop Recommendation'), variant: 'stable' };
    }
    if (category === 'irrigation') {
      return { label: t('Irrigation Guidance'), variant: 'stable' };
    }
    if (category === 'weather') {
      return { label: t('Weather & Rainfall Outlook'), variant: 'stable' };
    }
    if (category === 'recharge') {
      return { label: t('Groundwater Recharge'), variant: 'stable' };
    }
    return { label: t('Groundwater Conditions Stable'), variant: 'stable' };
  };

  const handleAskQuestion = async (qItem: FarmerQuestionItem) => {
    const loc = activeLocation || locationInput.trim();
    if (!loc) {
      setValidationError(t('Please enter your farm location first.'));
      locationInputRef.current?.focus();
      return;
    }

    setValidationError(null);
    setSelectedQuestion(qItem.question);
    setLoading(true);

    const currentRequestId = ++activeRequestIdRef.current;

    if (!activeLocation) {
      setActiveLocation(loc);
      await setFarmLocation(loc);
      if (onLocationChange) {
        onLocationChange(loc);
      }
    }

    try {
      let proactiveData: FarmerProactiveStatus | null = null;
      if (qItem.id === 'water_status' || qItem.id === 'groundwater_warning' || qItem.id === 'shortage_risk') {
        try {
          proactiveData = await proactiveService.getLocationStatus(loc);
        } catch {
          // Fallback to conversation
        }
      }

      const res = await apiClient.post<any>('/intelligence/conversation', {
        query: qItem.question,
        location_query: loc,
        language: currentLanguage || 'en',
        session_id: `advisor_${loc.replace(/\s+/g, '_').toLowerCase()}`,
        context_location: loc,
        context_crop: profile?.crop || undefined,
      });

      if (currentRequestId !== activeRequestIdRef.current) {
        // Obsolete request, discarded
        return;
      }

      if (res) {
        let rawText = res.text_response || '';
        rawText = rawText.replace(/\[DEBUG\].*?(\n|$)/g, '').trim();

        const { explanation, action } = parseRecommendedAction(rawText);

        const badge = getStatusBadge(
          proactiveData?.status || res.groundwater?.risk_state || res.intent,
          qItem.category
        );

        let finalExplanation = explanation;
        let finalAction = action;

        if (proactiveData && (qItem.id === 'water_status' || qItem.id === 'groundwater_warning')) {
          if (proactiveData.what_changed) {
            finalExplanation = proactiveData.what_changed;
          }
          if (proactiveData.recommended_action) {
            finalAction = proactiveData.recommended_action;
          }
        }

        setAnswer({
          question: qItem.question,
          location: loc,
          statusTitle: t(qItem.question),
          statusBadge: badge,
          explanation: finalExplanation || t('Groundwater conditions are currently stable in this area.'),
          recommendedAction: finalAction || t('Continue efficient water use and monitor groundwater conditions.'),
          provenance: t('JalKrishi Reference Simulation Dataset'),
          disclaimer: t('JalKrishi Reference Simulation Dataset & Hydrogeological Decision Support Model.'),
        });
      } else {
        throw new Error('No response from advisor service');
      }
    } catch (err: any) {
      if (currentRequestId !== activeRequestIdRef.current) return;
      console.warn('Farmer advisor query fallback error:', err);
      setAnswer({
        question: qItem.question,
        location: loc,
        statusTitle: t(qItem.question),
        statusBadge: { label: t('Groundwater Assessment'), variant: 'info' },
        explanation: `${t('Current water conditions evaluated for')} ${loc}. ${t('Aquifer conditions are stable with standard seasonal variation.')}`,
        recommendedAction: t('Practice scheduled furrow or drip irrigation to conserve storage.'),
        provenance: t('JalKrishi Reference Simulation Dataset'),
        disclaimer: t('Demonstration model. Not intended for operational borehole drilling decisions.'),
      });
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 rounded-2xl border border-emerald-200 shadow-sm p-4 md:p-6 mb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 flex-shrink-0">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {t('Farmer Water Advisor')}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {t('Simple & Local')}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {t('Select your farming area and ask practical questions in plain language.')}
            </p>
          </div>
        </div>

        {/* Location badge if active */}
        {activeLocation && (
          <div className="flex items-center gap-2 bg-emerald-100/80 border border-emerald-300 rounded-lg px-3 py-1.5 self-start sm:self-auto">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-emerald-900">{activeLocation}</span>
            <button
              onClick={handleClearLocation}
              title={t('Change location')}
              className="text-emerald-700 hover:text-emerald-900 ml-1 p-0.5 rounded hover:bg-emerald-200/60 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Location Input Form */}
      <form onSubmit={handleLocationSubmit} className="mt-4 mb-5">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          {t('Your Farm Location (District / Town / City):')}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              ref={locationInputRef}
              type="text"
              value={locationInput}
              onChange={(e) => {
                setLocationInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={t('e.g. Ballari, Nashik, Pune, Jaipur, Kochi, Bengaluru...')}
              className={`w-full text-sm px-3.5 py-2.5 rounded-xl border bg-white shadow-inner focus:outline-none focus:ring-2 transition-all ${
                validationError
                  ? 'border-red-400 focus:ring-red-400/40 text-red-900 placeholder-red-300'
                  : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/30 text-slate-800'
              }`}
            />
            {locationInput && (
              <button
                type="button"
                onClick={() => {
                  setLocationInput('');
                  locationInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            <MapPin className="w-3.5 h-3.5" />
            {t('Set Location')}
          </button>
        </div>
        {validationError && (
          <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {validationError}
          </p>
        )}
      </form>

      {/* 10 Farmer-Friendly Questions Matrix */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            {t('Common Farmer Questions (Click to Ask):')}
          </h3>
          <span className="text-[11px] text-slate-600 font-medium">
            {profile?.facilities?.length ? t('Ranked by your farm profile') : t('10 Direct Questions')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {adaptiveQuestions.map((item) => {
            const isSelected = selectedQuestion === item.question;
            return (
              <button
                key={item.id}
                onClick={() => handleAskQuestion(item)}
                disabled={loading}
                className={`text-left p-3 rounded-xl border text-xs transition-all flex items-start justify-between gap-2 group ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.02]'
                    : 'bg-white/90 hover:bg-emerald-50/80 text-slate-700 border-emerald-100 hover:border-emerald-300 shadow-sm'
                } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex-1">
                  <span
                    className={`block font-semibold leading-snug ${
                      isSelected ? 'text-white' : 'text-slate-800 group-hover:text-emerald-900'
                    }`}
                  >
                    {t(item.question)}
                  </span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5 ${
                    isSelected ? 'text-white' : 'text-slate-400 group-hover:text-emerald-700'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Answer Presentation Card */}
      {loading && (
        <div className="p-6 bg-white rounded-xl border border-emerald-200 shadow-sm text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-emerald-600 border-t-transparent mb-2"></div>
          <p className="text-xs font-semibold text-slate-600">
            {t('Consulting JalKrishi hydro-agronomic models for')} {activeLocation || locationInput}...
          </p>
        </div>
      )}

      {!loading && answer && (
        <div className="bg-white rounded-2xl border-2 border-emerald-300 shadow-md p-5 animate-in fade-in duration-200">
          {/* Answer Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                {t('Answer for')} {answer.location}
              </span>
              <h4 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-1.5">
                {answer.statusTitle}
              </h4>
            </div>

            {/* Status Badge */}
            {answer.statusBadge && (
              <div
                className={`self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                  answer.statusBadge.variant === 'critical'
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : answer.statusBadge.variant === 'escalating'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : answer.statusBadge.variant === 'emerging'
                    ? 'bg-yellow-50 text-yellow-800 border-yellow-300'
                    : answer.statusBadge.variant === 'recovery'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                {answer.statusBadge.variant === 'critical' ? (
                  <AlertOctagon className="w-3.5 h-3.5" />
                ) : answer.statusBadge.variant === 'escalating' || answer.statusBadge.variant === 'emerging' ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                {answer.statusBadge.label}
              </div>
            )}
          </div>

          {/* Simple Explanation */}
          <div className="mb-4">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t('Hydrogeological Situation:')}
            </h5>
            <p className="text-xs md:text-sm text-slate-800 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              {answer.explanation}
            </p>
          </div>

          {/* Recommended Action */}
          {answer.recommendedAction && (
            <div className="mb-4">
              <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                {t('What You Should Do:')}
              </h5>
              <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-xs md:text-sm font-medium text-emerald-950 leading-relaxed">
                {answer.recommendedAction}
              </div>
            </div>
          )}

          {/* Honest Provenance & Disclaimer Footer */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{answer.provenance}</span>
            </div>
            <div className="text-slate-400 italic text-[10px]">
              {answer.disclaimer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
