import React from 'react';
import { Database, Cpu, Server, Monitor, CheckCircle2, Clock } from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
      <div className="border-b border-stone-100 pb-3">
        <h3 className="text-base font-black text-stone-900">
          JalKrishi AI — Full-Stack Technical Architecture
        </h3>
        <p className="text-xs text-stone-500 font-medium">
          Deterministic 4-tier microservice flow with transparent production fallback.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        {/* Tier 1: Data Sources */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-stone-900 border-b border-stone-200 pb-2">
              <Database className="h-4 w-4 text-emerald-700" />
              <span>1. DATA LAYER</span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-stone-600 font-medium">
              <li className="flex items-center gap-1 text-emerald-800 font-bold">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> 5,260 DWLR Well Repo
              </li>
              <li className="flex items-center gap-1 text-emerald-800 font-bold">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> CSV Validation Sandbox
              </li>
              <li className="flex items-center gap-1 text-stone-400">
                <Clock className="h-3 w-3" /> India-WRIS (Future)
              </li>
              <li className="flex items-center gap-1 text-stone-400">
                <Clock className="h-3 w-3" /> CGWB / IMD (Future)
              </li>
            </ul>
          </div>
          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block text-center mt-2">
            Mode: DEMO_SIMULATION
          </span>
        </div>

        {/* Tier 2: Python Ingestion & Quality Pipeline */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-stone-900 border-b border-stone-200 pb-2">
              <Cpu className="h-4 w-4 text-water-700" />
              <span>2. QUALITY PIPELINE</span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-stone-600 font-medium">
              <li>&bull; 12 Hydrogeological Checks</li>
              <li>&bull; Outlier &amp; Spike Filtering</li>
              <li>&bull; Battery Voltage Audits</li>
              <li>&bull; Schema Normalization</li>
            </ul>
          </div>
          <span className="text-[10px] font-mono text-water-800 bg-water-50 px-2 py-0.5 rounded border border-water-200 block text-center mt-2">
            100% Quality Score
          </span>
        </div>

        {/* Tier 3: FastAPI Intelligence Engines */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-stone-900 border-b border-stone-200 pb-2">
              <Server className="h-4 w-4 text-amber-700" />
              <span>3. FASTAPI ENGINES</span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-stone-600 font-medium">
              <li>&bull; Analytics &amp; Risk Scoring</li>
              <li>&bull; 30/60/90d Forecasting</li>
              <li>&bull; 5-Category Anomaly Triage</li>
              <li>&bull; Agronomic Crop Recommender</li>
              <li>&bull; AI Executive Brief Engine</li>
            </ul>
          </div>
          <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 block text-center mt-2">
            FastAPI v2.0.0
          </span>
        </div>

        {/* Tier 4: React UI Delivery Layer */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-stone-900 border-b border-stone-200 pb-2">
              <Monitor className="h-4 w-4 text-agri-700" />
              <span>4. REACT DELIVERY</span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-stone-600 font-medium">
              <li>&bull; Interactive Map (Leaflet)</li>
              <li>&bull; Recharts Visualizations</li>
              <li>&bull; WhatsApp Simulator</li>
              <li>&bull; Client Offline Fallback</li>
            </ul>
          </div>
          <span className="text-[10px] font-mono text-agri-800 bg-agri-50 px-2 py-0.5 rounded border border-agri-200 block text-center mt-2">
            Vite + TypeScript
          </span>
        </div>
      </div>
    </div>
  );
};
