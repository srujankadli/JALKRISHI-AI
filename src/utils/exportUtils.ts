import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DWLRStation, GroundwaterAnomaly } from '../types';

export interface StateComparisonRow {
  state: string;
  totalStations: number;
  avgDepth: number;
  healthyPct: number;
  warningPct: number;
  criticalPct: number;
  avgRisk: number;
  trend: string;
}

export interface DistrictAnalysisRow {
  district: string;
  state: string;
  totalStations: number;
  avgDepth: number;
  riskScore: number;
  criticalCount: number;
  warningCount: number;
  trend: string;
  avgDaysToCritical: number | string;
}

export interface AnalyticsExportData {
  filters: {
    state: string;
    district: string;
    status: string;
    risk: string;
    trend: string;
    timeframe: string;
  };
  summary: {
    totalStations: number;
    healthyCount: number;
    moderateCount: number;
    warningCount: number;
    criticalCount: number;
    avgDepth: number;
    avgRiskScore: number;
    reportingRatePct: number;
  };
  stateData: StateComparisonRow[];
  districtData: DistrictAnalysisRow[];
  stationData: DWLRStation[];
  anomaliesData: GroundwaterAnomaly[];
  generatedAt: string;
}

/**
 * Generates and downloads a multi-sheet XLSX Excel workbook on the client side.
 */
export function exportAnalyticsToXLSX(data: AnalyticsExportData) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Summary & Filter Metadata
  const summaryRows = [
    { 'JalKrishi AI — Real-Time Groundwater Analytics Report': '' },
    { 'Report Disclaimer': 'Simulated DWLR Telemetry Dataset • JalKrishi AI Groundwater Platform' },
    { 'Generated Timestamp': data.generatedAt },
    { 'Applied Filter - State': data.filters.state },
    { 'Applied Filter - District': data.filters.district },
    { 'Applied Filter - Status': data.filters.status },
    { 'Applied Filter - Risk Level': data.filters.risk },
    { 'Applied Filter - Trend': data.filters.trend },
    { 'Applied Filter - Horizon': data.filters.timeframe },
    {},
    { '--- METRIC ---': '--- VALUE ---' },
    { 'Total Observation Wells in Scope': data.summary.totalStations },
    { 'Healthy / Safe Wells': `${data.summary.healthyCount} (${Math.round((data.summary.healthyCount / (data.summary.totalStations || 1)) * 100)}%)` },
    { 'Moderate Wells': data.summary.moderateCount },
    { 'Warning Wells': data.summary.warningCount },
    { 'Critical Drawdown Wells': `${data.summary.criticalCount} (${Math.round((data.summary.criticalCount / (data.summary.totalStations || 1)) * 100)}%)` },
    { 'Average Water Table Depth (mbgl)': `${data.summary.avgDepth} m` },
    { 'Average Aquifer Risk Index (0-100)': Math.round(data.summary.avgRiskScore * 100) },
    { 'Telemetry Reporting Rate': `${data.summary.reportingRatePct}% Online` },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Network_Summary');

  // 2. Sheet 2: State Comparison
  const wsStates = XLSX.utils.json_to_sheet(
    data.stateData.map((s) => ({
      State: s.state,
      'Monitored Wells': s.totalStations,
      'Avg Water Depth (mbgl)': s.avgDepth,
      'Healthy %': `${s.healthyPct}%`,
      'Warning %': `${s.warningPct}%`,
      'Critical %': `${s.criticalPct}%`,
      'Risk Score': s.avgRisk,
      'Depletion Trend': s.trend,
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsStates, 'State_Comparison');

  // 3. Sheet 3: District Analysis
  const wsDistricts = XLSX.utils.json_to_sheet(
    data.districtData.map((d) => ({
      District: d.district,
      State: d.state,
      'Monitored Wells': d.totalStations,
      'Avg Depth (mbgl)': d.avgDepth,
      'Risk Score (0-100)': Math.round(d.riskScore * 100),
      'Critical Wells': d.criticalCount,
      'Warning Wells': d.warningCount,
      Trend: d.trend,
      'Days to Critical': d.avgDaysToCritical,
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsDistricts, 'District_Analysis');

  // 4. Sheet 4: Station Data (First 500 in scope)
  const wsStations = XLSX.utils.json_to_sheet(
    data.stationData.slice(0, 500).map((st) => ({
      'Station Code': st.stationCode,
      'Station Name': st.stationName,
      State: st.state,
      District: st.district,
      Block: st.block,
      'Water Depth (mbgl)': st.waterLevel,
      'Critical Threshold': st.criticalThreshold,
      Status: st.status.toUpperCase(),
      Trend: st.trend.toUpperCase(),
      'Risk Score': Math.round(st.riskScore * 100),
      'Days to Critical': st.daysToCritical || 'Safe / >90d',
      'Telemetry Status': st.telemetryStatus.toUpperCase(),
      'Last Updated': st.lastUpdated,
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsStations, 'Station_Observations');

  // 5. Sheet 5: Anomalies
  if (data.anomaliesData.length > 0) {
    const wsAnomalies = XLSX.utils.json_to_sheet(
      data.anomaliesData.map((a) => ({
        'Anomaly ID': a.id,
        'Station ID': a.stationId,
        'Station Name': a.stationName,
        State: a.state,
        District: a.district,
        Category: a.category,
        Severity: a.severity.toUpperCase(),
        'Detected Time': a.detectedAt,
        'Observed Reading (m)': a.observedValue,
        'Expected Baseline (m)': a.expectedValue,
        Deviation: a.deviation,
        Status: a.status,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsAnomalies, 'Active_Anomalies');
  }

  // Trigger download
  XLSX.writeFile(wb, 'jalKrishi-groundwater-analytics.xlsx');
}

/**
 * Generates and downloads a structured, printable PDF report on the client side.
 */
export function exportAnalyticsToPDF(data: AnalyticsExportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Document Header
  doc.setFillColor(22, 101, 52); // Agri-800
  doc.rect(0, 0, 210, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('JalKrishi AI — Groundwater Analytics Report', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Real-Time Groundwater Resource Evaluation Using DWLR Telemetry Data', 14, 18);
  doc.text(`Generated: ${data.generatedAt}`, 145, 18);

  // Disclaimer banner
  doc.setFillColor(254, 242, 242); // Rose-50
  doc.setDrawColor(254, 202, 202);
  doc.rect(14, 30, 182, 10, 'FD');
  doc.setTextColor(153, 27, 27); // Rose-800
  doc.setFontSize(8);
  doc.text('SIMULATION DATA REPORT • JalKrishi AI Groundwater Intelligence Platform', 18, 36.5);

  // Section 1: Applied Scope & Executive Summary
  doc.setTextColor(28, 25, 23); // Stone-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. Applied Scope & Network Health Summary', 14, 47);

  const filterSummaryText = `State: ${data.filters.state} | District: ${data.filters.district} | Status: ${data.filters.status} | Risk: ${data.filters.risk} | Horizon: ${data.filters.timeframe}`;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text(filterSummaryText, 14, 52);

  // Summary Metrics Table
  autoTable(doc, {
    startY: 55,
    head: [['Total Wells', 'Healthy (Safe)', 'Moderate', 'Warning', 'Critical', 'Avg Depth', 'Avg Risk Score']],
    body: [
      [
        data.summary.totalStations.toString(),
        `${data.summary.healthyCount} (${Math.round((data.summary.healthyCount / (data.summary.totalStations || 1)) * 100)}%)`,
        data.summary.moderateCount.toString(),
        data.summary.warningCount.toString(),
        `${data.summary.criticalCount} (${Math.round((data.summary.criticalCount / (data.summary.totalStations || 1)) * 100)}%)`,
        `${data.summary.avgDepth} mbgl`,
        `${Math.round(data.summary.avgRiskScore * 100)}/100`,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 101, 52], fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 8, halign: 'center' },
    styles: { cellPadding: 2.5 },
  });

  // Section 2: State Comparison Table
  const nextY1 = (doc as any).lastAutoTable.finalY + 8;
  doc.setTextColor(28, 25, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. State-wise Groundwater Distribution & Risk', 14, nextY1);

  const stateRows = data.stateData.slice(0, 10).map((s) => [
    s.state,
    s.totalStations.toString(),
    `${s.avgDepth} m`,
    `${s.healthyPct}%`,
    `${s.warningPct}%`,
    `${s.criticalPct}%`,
    s.avgRisk.toString(),
    s.trend === 'falling' ? 'Falling' : s.trend === 'rising' ? 'Rising' : 'Stable',
  ]);

  autoTable(doc, {
    startY: nextY1 + 3,
    head: [['State', 'Stations', 'Avg Depth', 'Healthy %', 'Warning %', 'Critical %', 'Risk', 'Trend']],
    body: stateRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    styles: { cellPadding: 2 },
  });

  // Section 3: District Priority Analysis
  const nextY2 = (doc as any).lastAutoTable.finalY + 8;
  doc.setTextColor(28, 25, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. Key Districts Under Observation', 14, nextY2);

  const districtRows = data.districtData.slice(0, 8).map((d) => [
    d.district,
    d.state,
    d.totalStations.toString(),
    `${d.avgDepth} m`,
    `${Math.round(d.riskScore * 100)}/100`,
    d.criticalCount.toString(),
    d.trend === 'falling' ? 'Falling' : 'Stable',
    d.avgDaysToCritical.toString(),
  ]);

  autoTable(doc, {
    startY: nextY2 + 3,
    head: [['District', 'State', 'Wells', 'Avg Depth', 'Risk Score', 'Critical Wells', 'Trend', 'Days to Critical']],
    body: districtRows,
    theme: 'grid',
    headStyles: { fillColor: [180, 83, 9], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    styles: { cellPadding: 2 },
  });

  // Footer Note
  const pageHeight = doc.internal.pageSize.height;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(168, 162, 158);
  doc.text(
    'JalKrishi AI • "Know Your Water. Grow Smarter." • Groundwater Intelligence Platform',
    14,
    pageHeight - 8
  );

  // Trigger download
  doc.save('jalKrishi-groundwater-report.pdf');
}
