import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Sprout, Radio, Sparkles, Droplets } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../common/Buttons';
import { useLanguage } from '../../context/LanguageContext';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-gradient-to-br from-white via-stone-50/80 to-agri-50/30 p-6 shadow-card sm:p-8 lg:p-10">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-agri-200/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-water-200/40 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
        {/* LEFT COLUMN: Messaging and CTAs */}
        <div className="space-y-5 lg:col-span-7">
          {/* Status Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-agri-300 bg-agri-100/90 px-3 py-1 text-xs font-bold text-agri-900 tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5 text-agri-700" />
              {t('groundwater_intelligence')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/90 px-2.5 py-1 text-xs font-semibold text-stone-600">
              <Radio className="h-3 w-3 text-water-600 animate-pulse" />
              {t('reference_simulation')}
            </span>
          </div>

          {/* Main Heading */}
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-stone-900 sm:text-4xl lg:text-5xl leading-[1.15]">
              {t('know_your_water')}
            </h1>
          </div>

          {/* Supporting Description */}
          <p className="max-w-xl text-sm font-normal text-stone-600 sm:text-base leading-relaxed">
            Monitor groundwater conditions, understand depletion risk, and make smarter crop decisions using groundwater, remote-sensing, weather, and hydro-agronomic intelligence.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <PrimaryButton
              size="lg"
              icon={MapPin}
              onClick={() => navigate('/map')}
              className="shadow-md hover:shadow-lg"
            >
              {t('explore_map')}
            </PrimaryButton>

            <SecondaryButton
              size="lg"
              icon={Sprout}
              onClick={() => navigate('/crops')}
              className="border-agri-300 bg-white hover:bg-agri-50/60 text-agri-900"
            >
              {t('get_crop_advice')}
            </SecondaryButton>
          </div>
        </div>

        {/* RIGHT COLUMN: Agricultural + Groundwater Hydrogeological Composition */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-4 shadow-elevated">
            {/* Top Crop & Rainfall Bar */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-2 text-xs">
              <div className="flex items-center gap-1.5 text-stone-700 font-semibold">
                <span className="text-base" aria-hidden="true">🌱</span>
                <span>{t('active_crop_canopy')}</span>
              </div>
              <span className="rounded bg-water-50 border border-water-200 px-2 py-0.5 text-[11px] font-bold text-water-800">
                {t('monsoon_infiltration')}
              </span>
            </div>

            {/* Custom SVG Cross-Section Diagram */}
            <div className="relative mt-3 h-52 w-full overflow-hidden rounded-xl bg-stone-50 border border-stone-200">
              <svg
                viewBox="0 0 320 200"
                className="h-full w-full select-none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Sky & Gentle Rain Drops */}
                <rect width="320" height="45" fill="#f0f9ff" />
                <circle cx="50" cy="18" r="2" fill="#0284c7" className="animate-pulse" />
                <circle cx="120" cy="24" r="2.5" fill="#0284c7" className="animate-pulse" />
                <circle cx="210" cy="15" r="2" fill="#0284c7" className="animate-pulse" />
                <circle cx="280" cy="22" r="2" fill="#0284c7" className="animate-pulse" />

                {/* Ground Level Surface & Grass Layer */}
                <rect y="45" width="320" height="8" fill="#15803d" />
                <text x="12" y="40" fill="#166534" fontSize="10" fontWeight="bold">
                  Surface Soil (Ground Level 0.0m)
                </text>

                {/* Topsoil Layer (Sandy Loam) */}
                <rect y="53" width="320" height="35" fill="#e7e5e4" />
                <text x="12" y="74" fill="#78716c" fontSize="9" fontWeight="600">
                  Alluvial Topsoil & Root Zone
                </text>

                {/* Subsoil / Fractured Strata */}
                <rect y="88" width="320" height="35" fill="#d6d3d1" />
                <text x="12" y="108" fill="#57534e" fontSize="9" fontWeight="600">
                  Semi-permeable Silt Strata
                </text>

                {/* Water Table Transition (Groundwater Table) */}
                <rect y="123" width="320" height="77" fill="#bae6fd" fillOpacity="0.75" />

                {/* Animated Water Table Line */}
                <line
                  x1="0"
                  y1="123"
                  x2="320"
                  y2="123"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                />
                <text x="12" y="142" fill="#0369a1" fontSize="10" fontWeight="bold">
                  Aquifer Water Table • 14.8m avg
                </text>

                {/* DWLR Monitoring Well Piezometer Pipe */}
                <rect x="235" y="25" width="10" height="155" fill="#44403c" rx="2" />
                <rect x="237" y="140" width="6" height="35" fill="#0ea5e9" />

                {/* Telemetry Sensor Node on Top */}
                <circle cx="240" cy="22" r="8" fill="#15803d" stroke="#ffffff" strokeWidth="2" />
                <circle cx="240" cy="22" r="3" fill="#ffffff" />
                <text x="200" y="16" fill="#15803d" fontSize="8" fontWeight="bold">
                  DWLR Probe
                </text>

                {/* Depth Indicator Line */}
                <line x1="225" y1="45" x2="225" y2="123" stroke="#e11d48" strokeWidth="1.5" />
                <circle cx="225" cy="45" r="2.5" fill="#e11d48" />
                <circle cx="225" cy="123" r="2.5" fill="#e11d48" />
                <text x="160" y="88" fill="#be123c" fontSize="9" fontWeight="bold">
                  Depth: 14.8m
                </text>
              </svg>
            </div>

            {/* Bottom telemetry card footer */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5 text-water-600" />
                Hydrostatic Telemetry
              </span>
              <span className="font-semibold text-agri-800">5,260 Reference Stations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
