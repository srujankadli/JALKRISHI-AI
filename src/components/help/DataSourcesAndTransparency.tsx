import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import { Database, ExternalLink, ShieldCheck } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import { DATA_SOURCE_REFERENCES } from '../../data/helpContent';

export const DataSourcesAndTransparency: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div id="sources-transparency" className="space-y-6">
      {/* 1. Official Data Sources & References */}
      <div className="space-y-3">
        <SectionHeader
          title={t('Data Sources & Hydrogeological References')}
          subtitle={t('Government standards and telemetry frameworks utilized in the JalKrishi AI architecture')}
          icon={<Database className="h-5 w-5 text-agri-700" />}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DATA_SOURCE_REFERENCES.map((src) => (
            <div
              key={src.name}
              className="rounded-3xl border border-stone-200 bg-white p-5 shadow-subtle flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-stone-600">
                  {src.type}
                </span>

                <h4 className="text-sm font-black text-stone-900 leading-snug">
                  {src.name}
                </h4>

                <span className="text-[11px] font-bold text-agri-800 block">
                  {src.organization}
                </span>

                <p className="text-xs text-stone-600 leading-relaxed font-medium">
                  {src.description}
                </p>
              </div>

              {src.url && (
                <div className="pt-2 border-t border-stone-100">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-agri-700 hover:text-agri-900 hover:underline cursor-pointer"
                  >
                    <span>{t('Visit Reference Portal')}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Demo Mode Transparency Banner */}
      <div className="rounded-3xl border border-agri-300 bg-gradient-to-br from-agri-50/60 via-white to-white p-6 shadow-subtle space-y-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-agri-700 p-1 text-white shadow-xs">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <h4 className="text-base font-black text-stone-900">
            Simulation Data &amp; Telemetry Transparency
          </h4>
        </div>

        <p className="text-xs text-stone-700 leading-relaxed font-medium">
          The current JalKrishi AI interface utilizes <strong>5,260 deterministic simulated DWLR stations</strong> across 28 Indian states to demonstrate the complete product lifecycle: geospatial clustering, forecast confidence intervals, automated statistical anomaly triage, rule-based crop scoring, and client-side PDF/Excel export.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-stone-600 border-t border-stone-200">
          <div>
            <strong className="text-stone-900 block font-bold">1. Station Geometry:</strong>
            Modeled on real CGWB piezometer block densities across 28 states &amp; UTs.
          </div>
          <div>
            <strong className="text-stone-900 block font-bold">2. Forecasting &amp; Anomalies:</strong>
            Simulated hydrogeological algorithms for model validation.
          </div>
          <div>
            <strong className="text-stone-900 block font-bold">3. Production Path:</strong>
            Seamless ingestion APIs will connect directly to India-WRIS live feeds in future deployment.
          </div>
        </div>
      </div>
    </div>
  );
};
