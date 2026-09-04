import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Satellite, Radio, ShieldCheck, ArrowRight, Info } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const GroundwaterCoverageCard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="rounded-3xl border border-stone-200 bg-gradient-to-br from-white via-slate-50/50 to-teal-50/30 p-6 shadow-subtle space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">
            <Satellite className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-stone-900 text-base">
                {t('Groundwater Intelligence Coverage')}
              </h3>
              <span className="rounded-full bg-teal-100 text-teal-800 text-[10px] font-extrabold px-2.5 py-0.5 border border-teal-200 font-mono">
                DUAL_LAYER
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              {t('Direct DWLR Telemetry & Satellite-Assisted Spatial Estimation')}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/map')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <span>{t('Explore Coverage Map')}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="text-xs text-stone-700 leading-relaxed font-medium">
        {t('DWLR stations provide direct well-level groundwater observations. Areas without nearby stations are evaluated using satellite-assisted environmental indicators, weather models, and nearby observation trends.')}
      </p>

      {/* Coverage Classification Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        
        {/* Direct DWLR Coverage */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-blue-600" />
              {t('DWLR Coverage')}
            </span>
            <span className="font-mono font-extrabold text-blue-700">5,260 Nodes</span>
          </div>
          <p className="text-[11px] text-stone-500 leading-snug">
            {t('Direct hydrostatic sensor measurement (≤ 15.0 km radius).')}
          </p>
        </div>

        {/* Satellite-Assisted Coverage */}
        <div className="p-3.5 rounded-2xl bg-white border border-teal-200 shadow-subtle space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-teal-900 flex items-center gap-1.5">
              <Satellite className="h-3.5 w-3.5 text-teal-600" />
              {t('Satellite-Assisted')}
            </span>
            <span className="font-mono font-extrabold text-teal-700">{t('All-India Grid')}</span>
          </div>
          <p className="text-[11px] text-stone-500 leading-snug">
            {t('Spatial estimate using thermal, NDVI & precipitation signals.')}
          </p>
        </div>

        {/* Limited-Confidence Areas */}
        <div className="p-3.5 rounded-2xl bg-white border border-amber-200 shadow-subtle space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-amber-600" />
              {t('Limited Confidence')}
            </span>
            <span className="font-mono font-extrabold text-amber-700">&gt; 50 km Gap</span>
          </div>
          <p className="text-[11px] text-stone-500 leading-snug">
            {t('Remote areas with expanded uncertainty bounds.')}
          </p>
        </div>

      </div>

      <div className="flex items-center justify-between pt-1 text-[11px] text-stone-500 border-t border-stone-100">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          {t('Honest Data Policy: Satellite signals provide spatial estimates, not direct well depth measurements.')}
        </span>
        <span className="font-mono font-semibold text-stone-600">DWLR_RADIUS_KM = 15.0</span>
      </div>
    </div>
  );
};
