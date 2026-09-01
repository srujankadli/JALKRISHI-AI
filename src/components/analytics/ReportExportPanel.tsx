import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import {
  exportAnalyticsToXLSX,
  exportAnalyticsToPDF,
} from '../../utils/exportUtils';
import type { AnalyticsExportData } from '../../utils/exportUtils';

interface ReportExportPanelProps {
  exportData: AnalyticsExportData;
}

export const ReportExportPanel: React.FC<ReportExportPanelProps> = ({
  exportData,
}) => {
  const [isExportingXLSX, setIsExportingXLSX] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDownloadXLSX = async () => {
    try {
      setIsExportingXLSX(true);
      exportAnalyticsToXLSX(exportData);
      setSuccessMessage('XLSX Excel report generated & downloaded successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to generate XLSX report.');
    } finally {
      setIsExportingXLSX(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsExportingPDF(true);
      exportAnalyticsToPDF(exportData);
      setSuccessMessage('Printable PDF report generated & downloaded successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF report.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Export Regional Groundwater Decision Reports"
        subtitle="Generate client-side analytical reports in multi-sheet Excel (XLSX) or printable PDF format"
        icon={<Download className="h-5 w-5 text-agri-700" />}
      />

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Metadata & Scope Summary */}
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 uppercase tracking-wider">
              Active Export Scope
            </span>
            <span className="text-xs font-semibold text-stone-500 font-mono">
              {exportData.summary.totalStations.toLocaleString('en-IN')} Monitored Wells
            </span>
          </div>

          <h3 className="text-lg font-black text-stone-900">
            Export Filtered Groundwater Intelligence
          </h3>

          <p className="text-xs text-stone-600 leading-relaxed">
            Report includes complete state matrices, district vulnerability scores, critical well tallies, active anomaly flags, and timestamped hydrogeological baselines matching your active filters.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-stone-500 font-medium">
            <span>&bull; State: <strong>{exportData.filters.state}</strong></span>
            <span>&bull; District: <strong>{exportData.filters.district}</strong></span>
            <span>&bull; Status: <strong>{exportData.filters.status}</strong></span>
            <span>&bull; Horizon: <strong>{exportData.filters.timeframe}</strong></span>
          </div>
        </div>

        {/* Right: Export Buttons & Success Toast */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* XLSX Button */}
          <button
            onClick={handleDownloadXLSX}
            disabled={isExportingXLSX}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-xs font-black text-emerald-900 shadow-xs hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <span>{isExportingXLSX ? 'Generating XLSX...' : 'Download XLSX (Excel)'}</span>
          </button>

          {/* PDF Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-3 text-xs font-black text-white shadow-elevated hover:bg-stone-800 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <FileText className="h-4 w-4 text-amber-300" />
            <span>{isExportingPDF ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>
        </div>
      </div>

      {/* Success Feedback Toast */}
      {successMessage && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-900 font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};
