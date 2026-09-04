import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import { Cpu, ArrowDown, Smartphone, Globe, ShieldCheck } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';

export const SystemArchitectureCard: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('JalKrishi AI System Architecture & Engineering Flow')}
        subtitle={t('End-to-end data pipeline from physical borehole pressure transducers to farmer decision-support')}
        icon={<Cpu className="h-5 w-5 text-stone-800" />}
      />

      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-subtle space-y-6">
        {/* Visual Pipeline Stack */}
        <div className="flex flex-col items-center space-y-3 max-w-2xl mx-auto">
          {/* Layer 1: Ingestion */}
          <div className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-center space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800">
              Layer 1 &bull; Telemetry Ingestion & Piezometer Network
            </span>
            <h4 className="text-sm font-black text-stone-900">
              5,260 Digital Water Level Recorders (DWLR) &bull; GSM / GPRS Cellular Telemetry
            </h4>
            <p className="text-[11px] text-stone-600">
              Submersible hydrostatic pressure sensors record water table depth (mbgl) and transmission packets at scheduled intervals.
            </p>
          </div>

          <ArrowDown className="h-4 w-4 text-stone-400" />

          {/* Layer 2: Processing & QC */}
          <div className="w-full rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
              Layer 2 &bull; Hydrogeological Processing &amp; Statistical QC
            </span>
            <h4 className="text-sm font-black text-stone-900">
              Z-Score Anomaly Filtering &bull; Multi-Horizon Drawdown &amp; Recharge Lag Modeling
            </h4>
            <p className="text-[11px] text-stone-600">
              Filters flatlines, impossible jumps, and battery noise while calculating 7d/30d/60d/90d depletion projections.
            </p>
          </div>

          <ArrowDown className="h-4 w-4 text-stone-400" />

          {/* Layer 3: Decision Engine */}
          <div className="w-full rounded-2xl border border-agri-200 bg-agri-50/70 p-4 text-center space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-agri-800">
              Layer 3 &bull; Hydro-Agronomic Decision Engine
            </span>
            <h4 className="text-sm font-black text-stone-900">
              Multi-Factor Crop Sowing Scorer &bull; Days-to-Critical Depletion Calculator
            </h4>
            <p className="text-[11px] text-stone-600">
              Matches soil type, season, rainfall, and water stress to rank low-water crops and flag high-risk agricultural choices.
            </p>
          </div>

          <ArrowDown className="h-4 w-4 text-stone-400" />

          {/* Layer 4: Multi-Channel Delivery */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border-2 border-agri-600 bg-white p-4 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-agri-900 uppercase">
                <Globe className="h-4 w-4 text-agri-700" />
                <span>{t('Web Platform (Implemented)')}</span>
              </div>
              <p className="text-[11px] text-stone-600 font-medium">
                React 18 + TypeScript + Tailwind + Leaflet + Recharts + Client-Side XLSX/PDF Reporting.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                <ShieldCheck className="h-3 w-3" /> Fully Verified &amp; Active
              </span>
            </div>

            <div className="rounded-2xl border border-stone-300 bg-stone-50 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase">
                <Smartphone className="h-4 w-4 text-stone-500" />
                <span>{t('Farmer WhatsApp Bot (Planned)')}</span>
              </div>
              <p className="text-[11px] text-stone-600 font-medium">
                Twilio / Meta Cloud API conversational bot for instant village-level water queries in regional languages.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-200/80 px-2 py-0.5 rounded">
                Planned Backend Integration
              </span>
            </div>
          </div>
        </div>

        {/* Tech Stack Footer Badges */}
        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-bold text-stone-600">{t('Core Technologies:')}</span>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono font-bold text-stone-700">
            <span className="rounded-md bg-stone-100 px-2 py-1">{t('React 18')}</span>
            <span className="rounded-md bg-stone-100 px-2 py-1">{t('TypeScript')}</span>
            <span className="rounded-md bg-stone-100 px-2 py-1">{t('Tailwind CSS')}</span>
            <span className="rounded-md bg-stone-100 px-2 py-1">{t('Leaflet.js')}</span>
            <span className="rounded-md bg-stone-100 px-2 py-1">{t('Recharts')}</span>
            <span className="rounded-md bg-stone-100 px-2 py-1">{t('SheetJS (XLSX)')}</span>
            <span className="rounded-md bg-stone-100 px-2 py-1">{t('jsPDF')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
