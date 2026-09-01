import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  TrendingDown,
  AlertTriangle,
  Sprout,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import {
  insightService,
  type ExecutiveInsightSummaryData,
} from '../../services/insightService';

export const ExecutiveWaterBrief: React.FC = () => {
  const navigate = useNavigate();
  const [insight, setInsight] = useState<ExecutiveInsightSummaryData | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    loadInsight();
  }, []);

  const loadInsight = async () => {
    const data = await insightService.getExecutiveSummary();
    setInsight(data);
  };

  if (!insight) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-6 w-64 bg-emerald-100 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-28 bg-stone-100 rounded-2xl"></div>
          <div className="h-28 bg-stone-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-stone-50/50 p-6 shadow-md space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-stone-900 tracking-tight">
                JalKrishi AI — Executive Water Intelligence Brief
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                <ShieldCheck className="h-3 w-3" />
                Confidence: {insight.confidence_level}
              </span>
            </div>
            <p className="text-xs text-stone-600 font-medium mt-0.5">
              {insight.headline}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>{showTechnicalDetails ? 'Hide Evidence' : 'View Technical Evidence'}</span>
        </button>
      </div>

      {/* 4 Quadrants of Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quadrant 1: Today's Water Situation */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              <span>1. Current Situation</span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed font-medium">
              {insight.current_situation}
            </p>
          </div>
          <button
            onClick={() => navigate('/map')}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer pt-1 border-t border-stone-100"
          >
            <MapPin className="h-3 w-3" />
            <span>Inspect 5,260 Map Stations &rarr;</span>
          </button>
        </div>

        {/* Quadrant 2: Top Priority Region */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>2. Priority Risk Belt</span>
            </div>
            <p className="text-xs font-bold text-stone-900">{insight.top_priority_region}</p>
            <p className="text-[11px] text-stone-600 leading-relaxed font-medium">
              {insight.why_it_matters}
            </p>
          </div>
          <button
            onClick={() => navigate('/analytics')}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900 cursor-pointer pt-1 border-t border-stone-100"
          >
            <span>View Regional Analytics &rarr;</span>
          </button>
        </div>

        {/* Quadrant 3: 30-Day Forecast Outlook */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-water-800">
              <TrendingDown className="h-3.5 w-3.5 text-water-600" />
              <span>3. 30-Day Forecast</span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed font-medium">
              {insight.forecast_outlook}
            </p>
          </div>
          <button
            onClick={() => navigate('/forecast')}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-water-700 hover:text-water-900 cursor-pointer pt-1 border-t border-stone-100"
          >
            <span>Open Forecast Model &rarr;</span>
          </button>
        </div>

        {/* Quadrant 4: Recommended Farmer Action */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-agri-800">
              <Sprout className="h-3.5 w-3.5 text-agri-600" />
              <span>4. Recommended Action</span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed font-medium">
              {insight.recommended_farmer_action}
            </p>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-stone-100">
            <button
              onClick={() => navigate('/crops')}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-agri-800 hover:text-agri-900 cursor-pointer"
            >
              <span>Crop Advisor</span>
            </button>
            <button
              onClick={() => navigate('/whatsapp')}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <MessageSquare className="h-3 w-3" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progressive Disclosure Level 3: Technical Evidence (Toggleable) */}
      {showTechnicalDetails && (
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 space-y-3 animate-fadeIn text-xs text-stone-700">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Level 3: Technical Synthesis & Model Confidence
            </h4>
            <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Data Mode: DEMO_SIMULATION
            </span>
          </div>

          <p className="leading-relaxed font-medium">
            {insight.confidence_explanation}
          </p>

          {/* Top Priority Region Breakdown Table */}
          <div className="space-y-1.5">
            <span className="font-bold text-stone-800 block text-[11px]">
              Top Priority Agricultural Risk Belts:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {insight.top_priority_regions.map((reg, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-stone-900 text-[11px]">
                    <span>{reg.district}</span>
                    <span className="text-rose-700 font-mono">{(reg.risk_score * 100).toFixed(0)}</span>
                  </div>
                  <span className="text-[10px] text-stone-500 block">{reg.state} &bull; {reg.status}</span>
                  <p className="text-[10px] text-stone-600 leading-tight">{reg.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cross-Module Navigation Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/60 text-xs">
        <span className="font-bold text-stone-600 text-[11px] flex items-center gap-1">
          <span>Cross-Module Intelligence CTAs:</span>
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {insight.cross_system_links.map((link, idx) => (
            <button
              key={idx}
              onClick={() => navigate(link.path)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-stone-800 hover:text-emerald-900 border border-stone-200 hover:border-emerald-300 font-bold text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <span>{link.label}</span>
              <ArrowRight className="h-3 w-3 text-stone-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
