import React, { useState, useEffect } from 'react';
import {
  Database,
  Radio,
  Upload,
  AlertCircle,
  CheckCircle2,
  Globe,
  RefreshCw,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

const getApiBaseUrl = () => apiClient.getBaseUrl();

export interface ProviderMetadata {
  provider_name: string;
  provider_type: string;
  status: 'LIVE' | 'ACTIVE' | 'AVAILABLE' | 'AVAILABLE_CAPABILITY' | 'NOT_CONFIGURED' | 'FALLBACK' | 'ACTIVE_SIMULATION' | 'ERROR';
  last_updated: string;
  coverage: string;
  capabilities: string[];
  message: string;
  data_mode: string;
}

export interface SystemProviderMatrix {
  active_provider: ProviderMetadata;
  providers: ProviderMetadata[];
  fallback_chain: string[];
  total_providers: number;
  data_mode: string;
  disclaimer: string;
}

export const DataSourcesPanel: React.FC = () => {
  const [matrix, setMatrix] = useState<SystemProviderMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviderStatus();
  }, []);

  const fetchProviderStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/providers/status`);
      if (res.ok) {
        const data = await res.json();
        setMatrix(data);
      }
    } catch {
      // Fallback matrix if backend offline
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const res = await fetch(`${getApiBaseUrl()}/providers/upload-dataset`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setUploadSuccess(result.message);
        fetchProviderStatus();
      } else {
        const err = await res.json();
        setUploadError(err.detail || 'Failed to upload dataset.');
      }
    } catch {
      setUploadError('Network error while uploading dataset.');
    } finally {
      setUploading(false);
    }
  };

  const handleClearDataset = async () => {
    setLoading(true);
    try {
      await fetch(`${getApiBaseUrl()}/providers/clear-dataset`, { method: 'POST' });
      setUploadSuccess('Custom dataset cleared. Reverted to Reference Simulation.');
      fetchProviderStatus();
    } catch {
      setUploadError('Failed to clear dataset.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">LIVE</span>;
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">ACTIVE DATASET</span>;
      case 'AVAILABLE_CAPABILITY':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">AVAILABLE CAPABILITY (NOT ACTIVE)</span>;
      case 'ACTIVE_SIMULATION':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">ACTIVE SIMULATION</span>;
      case 'NOT_CONFIGURED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-300">NOT CONFIGURED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">{status}</span>;
    }
  };

  if (loading && !matrix) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-6 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-stone-200 rounded"></div>
        <div className="h-24 bg-stone-100 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 shadow-2xs">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-stone-900">
                Data Provider Resilience &amp; Provenance Matrix
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 border border-teal-300 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                <Layers className="h-3.5 w-3.5" />
                Provider Agnostic
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">
              Real-time operational status across government APIs, uploaded datasets, and spatial simulation providers
            </p>
          </div>
        </div>

        <button
          onClick={fetchProviderStatus}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Active Resolved Provider Banner */}
      {matrix && (
        <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-teal-600 animate-pulse" />
              <span className="text-xs font-extrabold uppercase text-teal-900 tracking-wider">
                Currently Active Resolved Provider:
              </span>
              <strong className="text-sm font-black text-teal-950">
                {matrix.active_provider.provider_name}
              </strong>
            </div>
            {getStatusBadge(matrix.active_provider.status)}
          </div>
          <p className="text-xs text-teal-800 font-medium leading-relaxed">
            {matrix.active_provider.message}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-teal-700 pt-1">
            <span>Coverage: <strong>{matrix.active_provider.coverage}</strong></span>
            <span>Last Updated: <strong>{matrix.active_provider.last_updated}</strong></span>
          </div>
        </div>
      )}

      {/* Upload Custom Dataset Section */}
      <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold uppercase text-stone-800 tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
            Upload Custom DWLR Dataset (CSV)
          </h4>
          {matrix?.providers.find((p) => p.provider_type === 'DATASET_UPLOAD')?.status === 'ACTIVE' && (
            <button
              onClick={handleClearDataset}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
            >
              Clear Custom Dataset
            </button>
          )}
        </div>

        <p className="text-xs text-stone-600 font-medium">
          Upload a structured CSV containing station ID, coordinates, and groundwater depths to evaluate custom farm datasets through JalKrishi intelligence.
        </p>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer transition-all shadow-xs">
            <Upload className="h-4 w-4" />
            <span>{uploading ? 'Ingesting CSV...' : 'Select CSV File'}</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>
          <span className="text-[11px] text-stone-500 font-mono">Expected: station_id, latitude, longitude, groundwater_level</span>
        </div>

        {uploadSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {uploadError && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Complete Provider Matrix Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase text-stone-800 tracking-wider flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-stone-600" />
          Registered System Data Providers ({matrix?.providers.length || 0})
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {matrix?.providers.map((prov) => (
            <div
              key={prov.provider_name}
              className="p-3.5 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <strong className="text-stone-900 font-extrabold">{prov.provider_name}</strong>
                {getStatusBadge(prov.status)}
              </div>
              <p className="text-[11px] text-stone-600 font-medium leading-normal">
                {prov.message}
              </p>
              <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono border-t border-stone-100 pt-2">
                <span>Type: {prov.provider_type}</span>
                <span>Updated: {prov.last_updated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fallback Chain Notice */}
      {matrix && (
        <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-xs text-stone-700 space-y-1">
          <span className="font-bold block text-stone-900">🛡️ Automated Provider Resolution Chain:</span>
          <ol className="list-decimal list-inside text-[11px] space-y-0.5 font-mono text-stone-600">
            {matrix.fallback_chain.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
