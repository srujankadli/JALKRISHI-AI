import React, { useState, useRef, useEffect } from 'react';
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

  const [locationInput, setLocationInput] = useState<string>(initialLocation || '');
  const [activeLocation, setActiveLocation] = useState<string | null>(initialLocation || null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AdvisorAnswer | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const locationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialLocation && initialLocation !== activeLocation) {
      setActiveLocation(initialLocation);
      setLocationInput(initialLocation);
    }
  }, [initialLocation]);

  const handleLocationSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = locationInput.trim();
    if (!trimmed) {
      setValidationError(t('Please enter your farm location first.'));
      locationInputRef.current?.focus();
      return;
    }
    setValidationError(null);
    setActiveLocation(trimmed);
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
    setGeneralError(null);
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
    setGeneralError(null);
    setSelectedQuestion(qItem.question);
    setLoading(true);

    if (!activeLocation) {
      setActiveLocation(loc);
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
      });

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
        throw new Error('Empty response');
      }
    } catch {
      setGeneralError(t('JalKrishi could not get the latest assessment. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const getBadgeColor = (variant: 'stable' | 'emerging' | 'escalating' | 'critical' | 'recovery' | 'info') => {
    switch (variant) {
      case 'stable':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'emerging':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'escalating':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'critical':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'recovery':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'info':
      default:
        return 'bg-stone-50 text-stone-800 border-stone-200';
    }
  };

  const getBadgeDot = (variant: 'stable' | 'emerging' | 'escalating' | 'critical' | 'recovery' | 'info') => {
    switch (variant) {
      case 'stable':
        return 'bg-emerald-500';
      case 'emerging':
        return 'bg-amber-500';
      case 'escalating':
        return 'bg-orange-500';
      case 'critical':
        return 'bg-rose-500 animate-pulse';
      case 'recovery':
        return 'bg-sky-500';
      case 'info':
      default:
        return 'bg-stone-500';
    }
  };

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7 shadow-sm space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-200/60 shadow-xs">
              <Sprout className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              🌱 {t('JalKrishi Farmer Water Advisor')}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 font-medium ml-0.5">
            {t('Ask a simple question about your farm, water, crops, or irrigation.')}
          </p>
        </div>

        {activeLocation && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5">
            <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-stone-900">{activeLocation}</span>
            <button
              type="button"
              onClick={handleClearLocation}
              className="ml-1 text-[11px] font-bold text-stone-400 hover:text-stone-700 underline cursor-pointer"
              title={t('Change Location')}
            >
              {t('Change')}
            </button>
          </div>
        )}
      </div>

      {/* 2. Farm Location Input */}
      <div className="space-y-2">
        <label htmlFor="farm-location-input" className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
          {t('Your farm location')}
        </label>
        <form onSubmit={handleLocationSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <MapPin className="h-4 w-4 text-stone-400" />
            </div>
            <input
              ref={locationInputRef}
              id="farm-location-input"
              type="text"
              value={locationInput}
              onChange={(e) => {
                setLocationInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={t('Enter village, town, block, district, or PIN code (e.g. Nashik, Patiala, Kochi)')}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 font-bold text-white text-xs sm:text-sm shadow-xs transition-all cursor-pointer shrink-0"
          >
            <span>{activeLocation ? t('Update Location') : t('Set Location')}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {validationError && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 mt-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* 3. Question Selection Chips */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {t('Common Farm & Water Questions')}
          </span>
          <span className="text-[11px] font-medium text-stone-400">
            {t('Click any question below')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {FARMER_QUESTIONS.map((q) => {
            const isSelected = selectedQuestion === q.question;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => handleAskQuestion(q)}
                disabled={loading}
                className={`flex items-center justify-between gap-3 text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200 text-emerald-950 font-bold'
                    : 'border-stone-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20 text-stone-800 font-semibold'
                } ${loading ? 'opacity-60 cursor-not-allowed' : 'active:scale-99'}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-stone-50 text-stone-500 border-stone-200'
                    }`}
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm truncate">
                    {t(q.question)}
                  </span>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? 'text-emerald-700 translate-x-0.5' : 'text-stone-300'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Loading State */}
      {loading && (
        <div className="p-6 rounded-2xl border border-stone-200 bg-stone-50/60 flex flex-col items-center justify-center text-center space-y-2 animate-pulse">
          <RotateCcw className="h-6 w-6 text-emerald-600 animate-spin" />
          <p className="text-xs font-bold text-stone-700">
            {t('Retrieving local groundwater and agronomic assessment...')}
          </p>
        </div>
      )}

      {/* 5. General Error Notice */}
      {generalError && !loading && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60 flex items-start gap-3 text-rose-900">
          <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-bold">{generalError}</p>
            <p className="text-[11px] text-rose-700 font-medium">
              {t('Please check your network connection or try a nearby district name.')}
            </p>
          </div>
        </div>
      )}

      {/* 6. Clean Structured Answer Card */}
      {answer && !loading && (
        <div className="rounded-2xl border border-emerald-200/80 bg-linear-to-b from-emerald-50/40 via-white to-white p-5 sm:p-6 shadow-xs space-y-5">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wide">
                <span>🌱 {t('Farmer Water Advisor')}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold">
                  <MapPin className="h-3.5 w-3.5" />
                  {answer.location}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-stone-900">
                {t(answer.question)}
              </h3>
            </div>

            {answer.statusBadge && (
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold border ${getBadgeColor(
                  answer.statusBadge.variant
                )} self-start sm:self-auto`}
              >
                <span className={`h-2 w-2 rounded-full ${getBadgeDot(answer.statusBadge.variant)}`} />
                <span>{answer.statusBadge.label}</span>
              </div>
            )}
          </div>

          {/* Main Plain-Language Explanation */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium text-stone-800 leading-relaxed whitespace-pre-line">
              {answer.explanation}
            </p>
          </div>

          {/* Recommended Action Callout */}
          {answer.recommendedAction && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1 text-emerald-950">
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('Recommended Action')}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-emerald-900 leading-relaxed">
                {answer.recommendedAction}
              </p>
            </div>
          )}

          {/* Data Provenance & Footer */}
          <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-stone-600">{t('Data Source')}:</span>
              <span>{answer.provenance}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedQuestion(null);
                setAnswer(null);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline self-start sm:self-auto cursor-pointer"
            >
              <span>{t('Ask another question')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 7. Initial Prompt when no location / no answer */}
      {!activeLocation && !answer && !loading && (
        <div className="p-4 rounded-xl border border-stone-100 bg-stone-50/50 flex items-center gap-3 text-stone-600">
          <Info className="h-4 w-4 text-stone-400 shrink-0" />
          <p className="text-xs font-medium">
            {t('Enter your farm location to get water and crop advice.')}
          </p>
        </div>
      )}
    </div>
  );
};
