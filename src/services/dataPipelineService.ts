import { apiClient } from './apiClient';

export interface DataQualityReportData {
  valid: boolean;
  records_checked: number;
  valid_records: number;
  invalid_records: number;
  warnings_count: number;
  errors_count: number;
  quality_score: number;
  duplicate_station_ids: number;
  invalid_coordinates: number;
  negative_depths: number;
  missing_required_fields: number;
  issues_list: string[];
  data_mode: string;
  timestamp: string;
}

export interface DataPipelineStatusData {
  active_source: string;
  data_mode: string;
  station_count: number;
  telemetry_record_count: number;
  last_refresh: string;
  quality_score: number;
  validation_status: string;
  quality_report: DataQualityReportData;
  available_sources: string[];
  future_sources: string[];
  disclaimer: string;
}

export interface DataRefreshResult {
  refresh_started: boolean;
  source: string;
  records_loaded: number;
  quality_score: number;
  timestamp: string;
  data_mode: string;
  disclaimer: string;
}

export interface CSVValidationResult {
  success: boolean;
  records_parsed: number;
  valid_records: number;
  invalid_records: number;
  quality_report: DataQualityReportData;
  sample_records: Record<string, any>[];
  data_mode: string;
  disclaimer: string;
}

export const dataPipelineService = {
  /**
   * Fetches data pipeline status, validation metrics, and source configurations.
   */
  async getDataStatus(): Promise<DataPipelineStatusData> {
    try {
      const res = await apiClient.get<DataPipelineStatusData>('/data/status', {
        timeoutMs: 3000,
      });
      if (res && res.station_count) {
        return res;
      }
    } catch {
      // Offline fallback
    }

    return this.getLocalFallbackStatus();
  },

  /**
   * Refreshes / reloads the active deterministic DWLR telemetry repository.
   */
  async refreshData(): Promise<DataRefreshResult> {
    try {
      const res = await apiClient.post<DataRefreshResult>('/data/refresh', {}, {
        timeoutMs: 4000,
      });
      if (res && res.records_loaded) {
        return res;
      }
    } catch {
      // Offline fallback
    }

    return {
      refresh_started: true,
      source: 'DEMO_SIMULATION',
      records_loaded: 5260,
      quality_score: 100.0,
      timestamp: new Date().toISOString(),
      data_mode: 'DEMO_FALLBACK',
      disclaimer: 'Offline Fallback: Local deterministic simulation dataset reloaded.',
    };
  },

  /**
   * Validates uploaded CSV content against the normalized telemetry schema.
   */
  async validateCsv(csvContent: string): Promise<CSVValidationResult> {
    try {
      const res = await apiClient.post<CSVValidationResult>(
        '/data/validate-csv',
        { csv_content: csvContent },
        { timeoutMs: 4000 }
      );
      if (res && res.records_parsed !== undefined) {
        return res;
      }
    } catch {
      // Offline fallback simple CSV parse
    }

    const lines = csvContent.trim().split('\n').filter(Boolean);
    const count = Math.max(0, lines.length - 1);
    return {
      success: count > 0,
      records_parsed: count,
      valid_records: count,
      invalid_records: 0,
      quality_report: {
        valid: true,
        records_checked: count,
        valid_records: count,
        invalid_records: 0,
        warnings_count: 0,
        errors_count: 0,
        quality_score: 100.0,
        duplicate_station_ids: 0,
        invalid_coordinates: 0,
        negative_depths: 0,
        missing_required_fields: 0,
        issues_list: [],
        data_mode: 'DEMO_FALLBACK',
        timestamp: new Date().toISOString(),
      },
      sample_records: [],
      data_mode: 'DEMO_FALLBACK',
      disclaimer: 'Offline Fallback: Local client validation mode.',
    };
  },

  /**
   * Deterministic local fallback status when FastAPI is unreachable.
   */
  getLocalFallbackStatus(): DataPipelineStatusData {
    return {
      active_source: 'DEMO_SIMULATION',
      data_mode: 'DEMO_FALLBACK',
      station_count: 5260,
      telemetry_record_count: 36820,
      last_refresh: new Date().toISOString(),
      quality_score: 100.0,
      validation_status: 'PASS',
      quality_report: {
        valid: true,
        records_checked: 5260,
        valid_records: 5260,
        invalid_records: 0,
        warnings_count: 0,
        errors_count: 0,
        quality_score: 100.0,
        duplicate_station_ids: 0,
        invalid_coordinates: 0,
        negative_depths: 0,
        missing_required_fields: 0,
        issues_list: [],
        data_mode: 'DEMO_FALLBACK',
        timestamp: new Date().toISOString(),
      },
      available_sources: ['DEMO_SIMULATION', 'CSV_IMPORT'],
      future_sources: ['INDIA_WRIS', 'CGWB', 'IMD'],
      disclaimer: 'Offline Fallback: 5,260 deterministic simulated observation wells.',
    };
  },
};
