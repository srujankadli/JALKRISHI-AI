import React, { useState } from 'react';
import {
  MapPin,
  Sprout,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useFarm } from '../../context/FarmContext';

export const FarmerOnboardingCard: React.FC = () => {
  const { t } = useLanguage();
  const { setFarmLocation, isLoading } = useFarm();
  const [inputVal, setInputVal] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setErrorMsg(t('Please enter your farm village, town, or district.'));
      return;
    }
    setErrorMsg(null);
    await setFarmLocation(trimmed);
  };

  const handleQuickSelect = async (locName: string) => {
    setInputVal(locName);
    setErrorMsg(null);
    await setFarmLocation(locName);
  };

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-agri-200 bg-gradient-to-br from-agri-50/80 via-white to-water-50/50 p-6 shadow-sm">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-agri-100 border border-agri-200 px-3 py-1 text-xs font-bold text-agri-800">
          <Sprout className="h-3.5 w-3.5 text-agri-700" />
          <span>{t('Personalized Farmer Experience')}</span>
        </div>

        <h1 className="mt-3 text-2xl font-black text-stone-900 sm:text-3xl">
          {t('Where is your farm located?')}
        </h1>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
          {t('Enter your village, town, taluk, district, or PIN code to see your local groundwater table depth, seasonal recharge outlook, Water Watch early warnings, and water-smart crop recommendations.')}
        </p>

        {/* Location Entry Form */}
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={t('e.g., Nashik, Pune, Kochi, Jaipur, Sangrur, Varanasi...')}
              className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-11 pr-4 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-agri-600 focus:outline-none focus:ring-2 focus:ring-agri-500/20 shadow-sm"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-agri-700 px-6 py-3 text-sm font-bold text-white hover:bg-agri-800 active:scale-98 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>{t('Locating...')}</span>
            ) : (
              <>
                <span>{t('View My Farm')}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {errorMsg && (
          <p className="mt-2 text-xs font-semibold text-rose-600">
            {errorMsg}
          </p>
        )}

        {/* Popular Quick Suggestions for easy testing / onboarding */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-500">{t('Examples:')}</span>
          {['Nashik (MH)', 'Pune (MH)', 'Jaipur (RJ)', 'Kochi (KL)', 'Guwahati (AS)', 'Sangrur (PB)'].map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => handleQuickSelect(city.split(' ')[0])}
              className="rounded-lg border border-stone-200 bg-white/80 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:border-agri-400 hover:bg-agri-50 transition-colors cursor-pointer"
            >
              {city}
            </button>
          ))}
        </div>

        {/* Benefits bullets */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-stone-200/60 pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
            <CheckCircle2 className="h-4 w-4 text-agri-600 shrink-0" />
            <span>{t('Direct & satellite water data')}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
            <CheckCircle2 className="h-4 w-4 text-agri-600 shrink-0" />
            <span>{t('Location-specific crop plans')}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
            <CheckCircle2 className="h-4 w-4 text-agri-600 shrink-0" />
            <span>{t('Proactive water shortages')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
