import React, { useState } from 'react';
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  HelpCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  dataPipelineService,
  type CSVValidationResult,
} from '../../services/dataPipelineService';

const SAMPLE_VALID_CSV = `station_id,station_name,state,district,latitude,longitude,water_depth_mbgl,status,trend,risk_score
DWLR-PB-099,Jalandhar Agri Monitoring,Punjab,Jalandhar,31.3260,75.5762,21.4,moderate,falling,0.58
DWLR-KA-088,Kolar Gold Fields Well,Karnataka,Kolar,12.9600,78.2700,29.1,critical,falling,0.86
DWLR-RJ-077,Jaipur East Observation,Rajasthan,Jaipur,26.9124,75.7873,34.8,critical,falling,0.91
DWLR-MH-055,Baramati Research Well,Maharashtra,Pune,18.1510,74.5770,16.5,healthy,stable,0.22`;

const SAMPLE_INVALID_CSV = `station_id,station_name,state,district,latitude,longitude,water_depth_mbgl,status,trend,risk_score
DWLR-BAD-001,Corrupted Depth Well,Punjab,Sangrur,30.25,75.84,-8.4,moderate,falling,0.55
DWLR-BAD-002,Out of Bounds Coordinates,Karnataka,Kolar,98.50,140.20,18.2,healthy,stable,0.25
DWLR-BAD-001,Duplicate ID Row,Rajasthan,Jaipur,26.91,75.78,32.4,critical,falling,0.85
,Missing Station ID and Metadata,,,,,15.0,moderate,stable,0.5`;

export const CSVValidatorPanel: React.FC = () => {
  const [csvText, setCsvText] = useState(SAMPLE_VALID_CSV);
  const [validationResult, setValidationResult] = useState<CSVValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    if (!csvText.trim()) return;
    setIsValidating(true);
    try {
      const res = await dataPipelineService.validateCsv(csvText);
      setValidationResult(res);
    } finally {
      setIsValidating(false);
    }
  };

  const handleLoadValidSample = () => {
    setCsvText(SAMPLE_VALID_CSV);
    setValidationResult(null);
  };

  const handleLoadInvalidSample = () => {
    setCsvText(SAMPLE_INVALID_CSV);
    setValidationResult(null);
  };

  const handleClear = () => {
    setCsvText('');
    setValidationResult(null);
  };

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-water-50 text-water-700 flex items-center justify-center border border-water-200 shadow-2xs">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-stone-900">
              CSV Telemetry Ingestion & Quality Sandbox
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              Upload or paste batch DWLR telemetry to test schema normalization and quality rules
            </p>
          </div>
        </div>

        {/* Sample Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLoadValidSample}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all cursor-pointer"
          >
            Load Valid Sample
          </button>
          <button
            onClick={handleLoadInvalidSample}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold transition-all cursor-pointer"
          >
            Load Corrupted Sample
          </button>
          <button
            onClick={handleClear}
            title="Clear Text"
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CSV Input Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span className="font-semibold text-stone-700 flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-stone-500" />
            Raw CSV Telemetry Input:
          </span>
          <span>Supports UTF-8 &bull; Comma Delimited</span>
        </div>

        <textarea
          rows={6}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="Paste CSV rows with headers (station_id, station_name, state, district, latitude, longitude, water_depth_mbgl)..."
          className="w-full rounded-2xl bg-stone-50 border border-stone-200 p-3 font-mono text-xs text-stone-800 focus:bg-white focus:border-water-600 focus:outline-none shadow-2xs"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-stone-400 flex items-center gap-1">
            <HelpCircle className="h-3 w-3" />
            Columns auto-normalized (id, name, lat, lon, water_depth, state, district)
          </span>

          <button
            onClick={handleValidate}
            disabled={isValidating || !csvText.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-water-700 hover:bg-water-800 text-white font-bold text-xs transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Play className={`h-3.5 w-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            <span>{isValidating ? 'Validating...' : 'Validate CSV Schema'}</span>
          </button>
        </div>
      </div>

      {/* Validation Results Report */}
      {validationResult && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 space-y-4 animate-fadeIn">
          {/* Result Header Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              {validationResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              )}
              <h4 className="font-extrabold text-sm text-stone-900">
                Validation Status: {validationResult.success ? 'PASSED' : 'SCHEMA VIOLATIONS DETECTED'}
              </h4>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-black border ${
                validationResult.quality_report.quality_score >= 90
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              Quality Score: {validationResult.quality_report.quality_score.toFixed(1)}%
            </span>
          </div>

          {/* Counts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-stone-200">
              <span className="text-stone-500 font-bold">Records Parsed</span>
              <p className="text-base font-black text-stone-900">{validationResult.records_parsed}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-stone-200">
              <span className="text-emerald-700 font-bold">Valid Records</span>
              <p className="text-base font-black text-emerald-800">{validationResult.valid_records}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-stone-200">
              <span className="text-rose-700 font-bold">Invalid Records</span>
              <p className="text-base font-black text-rose-800">{validationResult.invalid_records}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-stone-200">
              <span className="text-amber-700 font-bold">Total Issues</span>
              <p className="text-base font-black text-amber-800">{validationResult.quality_report.errors_count + validationResult.quality_report.warnings_count}</p>
            </div>
          </div>

          {/* Issues List (if any) */}
          {validationResult.quality_report.issues_list.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
              <span className="text-xs font-bold text-rose-900 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-700" />
                Detected Quality Violations:
              </span>
              <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-0.5 font-mono">
                {validationResult.quality_report.issues_list.map((iss, i) => (
                  <li key={i}>{iss}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sandbox Notice */}
          <div className="text-[11px] text-stone-500 pt-1 flex items-center justify-between border-t border-stone-200">
            <span>🔒 Sandbox Preview Mode &mdash; Active 5,260-well dataset remains untouched.</span>
            <span className="font-semibold text-stone-700">Source: CSV_IMPORT</span>
          </div>
        </div>
      )}
    </div>
  );
};
