import React from 'react';
import {
  MessageSquare,
  Sparkles,
  Smartphone,
  CheckCircle2,
  HelpCircle,
  Radio,
  QrCode,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { WhatsAppSimulator } from '../components/whatsapp/WhatsAppSimulator';
import { BackendStatusBadge } from '../components/common/BackendStatusBadge';
import { useLanguage } from '../context/LanguageContext';

export const WhatsAppPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title={t('WhatsApp Farmer Interface')}
        subtitle={t('Accessible, low-bandwidth conversational AI for Indian farmers. Delivers localized DWLR groundwater telemetry, forecasts, and crop advice in regional Indian languages.')}
        farmerNote={t("Farmers don't need complex apps. A simple WhatsApp message like 'Kolar water' or 'crop advice' delivers actionable groundwater guidance in seconds.")}
        badge={
          <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white flex items-center gap-1.5 shadow-xs">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-300" />
            {t('Conversational Engine v2.6')}
          </span>
        }
      />

      {/* 2. Top Status / Context Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-stone-900 text-sm">
              {t('Live In-Browser WhatsApp Simulator')}
            </h4>
            <p className="text-xs text-stone-500">
              {t('Connected directly to FastAPI `/api/v1/whatsapp/webhook` with local offline fallback')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BackendStatusBadge showDetails={true} />
          <span className="inline-flex items-center gap-1 rounded-full bg-water-50 border border-water-200 px-2.5 py-1 text-xs font-bold text-water-800">
            <Radio className="h-3 w-3 text-water-600 animate-pulse" />
            5,260 Nodes
          </span>
        </div>
      </div>

      {/* 3. Main Grid: WhatsApp Simulator + Guidance Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive WhatsApp Simulator (lg:col-span-7) */}
        <div className="lg:col-span-7">
          <WhatsAppSimulator initialDistrict="Kolar" />
        </div>

        {/* Right Column: Farmer Voice & Conversational Guide (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card A: Common Farmer Queries */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <h3 className="font-extrabold text-stone-900 text-base">
                Try These Farmer Queries
              </h3>
            </div>

            <div className="space-y-2.5 text-xs text-stone-700">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="font-bold text-emerald-800">💧 Water Level & Risk:</span>
                <p className="text-stone-600 font-mono text-[11px]">“Kolar water” or “Water level status”</p>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="font-bold text-water-800">🔮 30-Day Forward Forecast:</span>
                <p className="text-stone-600 font-mono text-[11px]">“Kolar forecast” or “Future groundwater outlook”</p>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="font-bold text-agri-800">🌱 Water-Smart Crop Advice:</span>
                <p className="text-stone-600 font-mono text-[11px]">“What crop should I grow?” or “Crop advice”</p>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="font-bold text-rose-800">⚠️ Depletion & Critical Alerts:</span>
                <p className="text-stone-600 font-mono text-[11px]">“Any warnings or alerts?” or “Critical alert check”</p>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="font-bold text-stone-800">⚡ Single-Digit Shortcuts:</span>
                <p className="text-stone-600 text-[11px]">
                  Type <strong className="font-mono bg-stone-200 px-1 rounded text-stone-900">1</strong> for Water, <strong className="font-mono bg-stone-200 px-1 rounded text-stone-900">2</strong> for Forecast, <strong className="font-mono bg-stone-200 px-1 rounded text-stone-900">3</strong> for Crops, <strong className="font-mono bg-stone-200 px-1 rounded text-stone-900">4</strong> for Alerts.
                </p>
              </div>
            </div>
          </div>

          {/* Card B: Architecture & Farmer Benefits */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-water-600" />
              <h3 className="font-extrabold text-stone-900 text-base">
                Why WhatsApp First?
              </h3>
            </div>

            <ul className="space-y-2.5 text-xs text-stone-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Zero App Installation:</strong> Works directly on existing farmer smartphones and 2G/3G connections.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Native Multi-Lingual:</strong> Supports English and Devanagari Hindi text seamlessly with deterministic understanding.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Powered by 5 Engines:</strong> Reuses the exact same DWLR station repository, forecasting hydrodynamic model, and crop scoring matrix.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Explainable Recommendations:</strong> Never tells a farmer what not to do without explaining <em>why</em> (e.g. low aquifer recharge vs root rot).</span>
              </li>
            </ul>
          </div>

          {/* Card C: Production Meta / Twilio Integration Preview */}
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-agri-50/40 p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-700" />
                <h4 className="font-extrabold text-stone-900 text-sm">
                  Production Deployment Architecture
                </h4>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                Phase H Target
              </span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              The FastAPI endpoint <code className="bg-white px-1.5 py-0.5 rounded font-mono text-emerald-900 border border-emerald-200 text-[11px]">POST /api/v1/whatsapp/webhook</code> is structurally formatted to bind directly to the Meta Cloud API / Twilio WhatsApp Sandbox without altering core intelligence logic.
            </p>

            <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-stone-500 font-medium">
              <span>Simulation Sandbox Active</span>
              <span className="font-mono text-emerald-800 font-bold">+91 1800-JALKRISHI (Demo)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
