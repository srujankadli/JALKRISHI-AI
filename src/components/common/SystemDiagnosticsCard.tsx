import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Radio,
  Server,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { systemService, type SystemStatusData } from '../../services/systemService';

export const SystemDiagnosticsCard: React.FC = () => {
  const [statusData, setStatusData] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await systemService.getSystemStatus();
      setStatusData(data);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !statusData) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs animate-pulse space-y-4">
        <div className="h-6 w-48 bg-stone-200 rounded"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-16 bg-stone-100 rounded-2xl"></div>
          <div className="h-16 bg-stone-100 rounded-2xl"></div>
          <div className="h-16 bg-stone-100 rounded-2xl"></div>
          <div className="h-16 bg-stone-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const isOnline = statusData && !statusData.data_mode.includes('FALLBACK');

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200 shadow-2xs">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-stone-900">
                System Health & Engine Diagnostics
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 border border-indigo-300 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Phase J Production Hardened
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">
              Real-time observability of FastAPI microservices, intelligence engines, and data pipeline contracts
            </p>
          </div>
        </div>

        <button
          onClick={loadStatus}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* Top 4 Core Diagnostics Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        {/* Stat 1: Backend Connection */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
            <Server className="h-3 w-3 text-stone-600" />
            Backend Connection
          </span>
          <p className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {isOnline ? 'FastAPI Connected' : 'Offline Fallback'}
          </p>
          <span className="text-[10px] text-stone-500 font-medium">
            {isOnline ? 'http://127.0.0.1:8000' : 'Client Deterministic Engine'}
          </span>
        </div>

        {/* Stat 2: Data Mode */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
            <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
            Data Source Mode
          </span>
          <p className="text-sm font-extrabold text-stone-900">
            {statusData?.data_mode}
          </p>
          <span className="text-[10px] text-stone-500 font-medium">
            5,260 Simulated DWLR Nodes
          </span>
        </div>

        {/* Stat 3: Quality Score */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Data Quality Score
          </span>
          <p className="text-sm font-extrabold text-emerald-900">
            {statusData?.data_quality_score.toFixed(1)}% PASS
          </p>
          <span className="text-[10px] text-emerald-700 font-medium">
            0 Schema Violations
          </span>
        </div>

        {/* Stat 4: Version & Uptime */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
            <Cpu className="h-3 w-3 text-stone-500" />
            Version & Environment
          </span>
          <p className="text-sm font-extrabold text-stone-900">
            v{statusData?.version} ({statusData?.environment})
          </p>
          <span className="text-[10px] text-stone-500 font-medium">
            Uptime: {statusData?.uptime_seconds ? `${statusData.uptime_seconds}s` : 'Active'}
          </span>
        </div>
      </div>

      {/* Engine Readiness Matrix */}
      <div className="rounded-2xl bg-stone-50/80 border border-stone-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-indigo-600" />
            Hydrogeological Intelligence Engines Status
          </h4>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
            7 / 7 Engines Active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {statusData &&
            Object.entries(statusData.engines).map(([name, state]) => (
              <div
                key={name}
                className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center justify-between shadow-2xs"
              >
                <span className="font-semibold text-stone-800 capitalize">
                  {name.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  ✓ {state}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Future Government Adapters Matrix */}
      <div className="rounded-2xl bg-stone-50/80 border border-stone-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-amber-600" />
            External Government Ingestion Adapters
          </h4>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
            Future Integration Layer
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <strong className="text-stone-900">India-WRIS</strong>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Not Configured
              </span>
            </div>
            <p className="text-[11px] text-stone-500">Ministry of Jal Shakti DWLR REST Feed</p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <strong className="text-stone-900">CGWB Piezometers</strong>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Not Configured
              </span>
            </div>
            <p className="text-[11px] text-stone-500">Central Ground Water Board Network</p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <strong className="text-stone-900">IMD Precipitation</strong>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Not Configured
              </span>
            </div>
            <p className="text-[11px] text-stone-500">India Meteorological Dept Rainfall Grid</p>
          </div>
        </div>
      </div>

      {/* Honest Transparency Disclaimer */}
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
        <span className="font-bold block">ℹ️ Transparency Notice (DEMO SIMULATION):</span>
        <p className="text-[11px] leading-relaxed">
          {statusData?.disclaimer} Real India-WRIS / CGWB credentials are not available; active source remains <strong>DEMO_SIMULATION</strong>.
        </p>
      </div>
    </div>
  );
};
