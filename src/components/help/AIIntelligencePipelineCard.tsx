import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import { Cpu, CheckCircle2, Clock, ArrowRight, ShieldCheck } from 'lucide-react';

export const AIIntelligencePipelineCard: React.FC = () => {
  const { t } = useLanguage();
  const steps = [
    { num: 1, title: 'DWLR Telemetry Data', desc: '5,260 reference observation wells emitting groundwater depth (mbgl)' },
    { num: 2, title: 'Data Quality & Filtering', desc: '12 hydrogeological checks (range, stuck value, spike, battery voltage)' },
    { num: 3, title: 'Groundwater Analytics', desc: 'National summary, state/district rollups, and regional risk scores' },
    { num: 4, title: '30/60/90d Forecasting', desc: 'Hydrodynamic regression, confidence bands, and Days-to-Critical' },
    { num: 5, title: 'Anomaly Detection', desc: '5 anomaly categories (sudden drop, abnormal extraction, sensor issue)' },
    { num: 6, title: 'Crop Recommendation', desc: 'Multi-factor agronomic scoring matrix (water demand vs depth)' },
    { num: 7, title: 'Farmer Action Center', desc: 'WhatsApp chatbot, bilingual advice, and actionable sowing choices' },
  ];

  return (
    <div id="ai-pipeline" className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-stone-900">{t('How JalKrishi AI Works (7-Step End-to-End Pipeline)')}</h3>
            <p className="text-xs text-stone-500 font-medium">
              Deterministic hydrogeological intelligence flow from raw piezometer sensor data to farmer action.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
          <ShieldCheck className="h-3.5 w-3.5" />
          100% Deterministic Engine Matrix
        </span>
      </div>

      {/* 7-Step Horizontal / Stacked Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
        {steps.map((s) => (
          <div key={s.num} className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-black text-emerald-800">
                <span className="h-5 w-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[10px]">
                  {s.num}
                </span>
                <ArrowRight className="h-3 w-3 text-stone-300 hidden lg:block" />
              </div>
              <h4 className="text-xs font-bold text-stone-900 mt-1">{s.title}</h4>
              <p className="text-[10px] text-stone-600 leading-tight mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Implementation Transparency Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Implemented Now */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-900 uppercase tracking-wider">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>{t('Implemented & Verified Now (Phase A–L)')}</span>
          </div>
          <ul className="text-xs text-stone-700 space-y-1 font-medium list-disc list-inside">
            <li>5,260-Station Reference DWLR Network</li>
            <li>{t('FastAPI Intelligence Engines (Analytics, Forecast, Anomalies, Crops, Insights)')}</li>
            <li>{t('React + Vite Live API Bridge &amp; Offline Fallback')}</li>
            <li>{t('In-Browser WhatsApp Farmer Simulator')}</li>
            <li>{t('CSV Upload &amp; Quality Audit Sandbox')}</li>
            <li>{t('Production Hardening &amp; Health/Readiness Probes')}</li>
          </ul>
        </div>

        {/* Future Live Integrations */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-amber-900 uppercase tracking-wider">
            <Clock className="h-4 w-4 text-amber-700" />
            <span>{t('Future Live Government Integration (NOT_CONFIGURED)')}</span>
          </div>
          <ul className="text-xs text-stone-700 space-y-1 font-medium list-disc list-inside">
            <li>{t('India-WRIS Live API Gateway (`NOT_CONFIGURED`)')}</li>
            <li>{t('CGWB Monitoring Well Production Feed (`NOT_CONFIGURED`)')}</li>
            <li>{t('IMD High-Resolution Precipitation Grids (`NOT_CONFIGURED`)')}</li>
            <li>{t('Twilio / Meta Enterprise WhatsApp Business Webhook')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
