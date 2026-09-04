import type { GroundwaterAnomaly, AnomalyCategory, AnomalySeverity, AnomalyTimelinePoint } from '../types';
import { mockAnomalies } from '../data/mockAnomalies';
import { apiClient } from './apiClient';
import type { ApiAnomalyResponse, ApiAnomalySummaryResponse } from '../types/api';

export interface AnomalyFilterParams {
  severity?: 'all' | AnomalySeverity;
  category?: 'all' | AnomalyCategory;
  state?: string;
  district?: string;
  searchQuery?: string;
  isResolved?: boolean | 'all';
}

export interface StateAnomalySummary {
  state: string;
  total: number;
  critical: number;
  high: number;
  warning: number;
  mostCommonCategory: string;
}

function mapApiAnomalyToFrontend(a: ApiAnomalyResponse): GroundwaterAnomaly {
  let cat: AnomalyCategory = 'Sudden Drop';
  const cLow = a.category.toLowerCase();
  if (cLow.includes('drop')) cat = 'Sudden Drop';
  else if (cLow.includes('rise')) cat = 'Sudden Rise';
  else if (cLow.includes('extract')) cat = 'Possible Extraction';
  else if (cLow.includes('missing') || cLow.includes('telemetry')) cat = 'Missing Data';
  else if (cLow.includes('sensor')) cat = 'Sensor Issue';

  const sev: AnomalySeverity =
    a.severity.toLowerCase() === 'critical'
      ? 'critical'
      : a.severity.toLowerCase() === 'high'
      ? 'high'
      : a.severity.toLowerCase() === 'warning'
      ? 'warning'
      : 'info';

  const timelineData: AnomalyTimelinePoint[] | undefined = a.timeline
    ? a.timeline.map((tp) => ({
        time: tp.timestamp.includes(' ') ? tp.timestamp.split(' ')[1] : tp.timestamp,
        observed: tp.observed,
        expected: tp.expected,
        isAnomaly: tp.is_anomaly,
      }))
    : undefined;

  return {
    id: a.anomaly_id,
    stationId: a.station_id,
    stationName: a.station_name,
    state: a.state,
    district: a.district,
    block: a.block || '',
    anomalyType: a.category,
    category: cat,
    severity: sev,
    detectedAt: a.detected_at,
    magnitude: a.deviation,
    observedValue: a.observed_value,
    expectedValue: a.expected_value,
    deviation: a.deviation,
    previousReading: a.expected_value,
    farmerExplanation: `${a.description} ${a.why_it_matters}`,
    technicalDetails: typeof a.evidence === 'object' ? JSON.stringify(a.evidence, null, 2) : String(a.evidence),
    suggestedAction: a.recommended_action,
    isResolved: false,
    status: a.verification_status === 'Under Review' ? 'Monitoring' : 'Under Investigation',
    timelineData,
  };
}

export const anomalyService = {
  async getAnomalies(params?: AnomalyFilterParams): Promise<GroundwaterAnomaly[]> {
    try {
      const apiParams: Record<string, any> = { limit: 200 };
      if (params?.state && params.state !== 'All States' && params.state !== 'All India') {
        apiParams.state = params.state;
      }
      if (params?.district && params.district !== 'All Districts') {
        apiParams.district = params.district;
      }
      if (params?.severity && params.severity !== 'all') {
        apiParams.severity = params.severity;
      }
      if (params?.category && params.category !== 'all') {
        apiParams.category = params.category;
      }

      const res = await apiClient.get<{ anomalies: ApiAnomalyResponse[] }>(
        '/anomalies',
        apiParams,
        { useCache: true, cacheTtlMs: 15000, timeoutMs: 3000 }
      );

      if (res && res.anomalies && res.anomalies.length > 0) {
        let list = res.anomalies.map(mapApiAnomalyToFrontend);

        if (params?.searchQuery && params.searchQuery.trim() !== '') {
          const q = params.searchQuery.toLowerCase().trim();
          list = list.filter(
            (a) =>
              a.stationName.toLowerCase().includes(q) ||
              a.district.toLowerCase().includes(q) ||
              a.state.toLowerCase().includes(q) ||
              a.anomalyType.toLowerCase().includes(q) ||
              a.category.toLowerCase().includes(q) ||
              a.stationId.toLowerCase().includes(q)
          );
        }

        return list;
      }
    } catch {
      // Backend offline -> fallback
    }

    let result = [...mockAnomalies];
    if (!params) return result;

    if (params.severity && params.severity !== 'all') {
      result = result.filter((a) => {
        if (params.severity === 'warning') {
          return a.severity === 'warning' || a.severity === 'medium';
        }
        if (params.severity === 'info') {
          return a.severity === 'info' || a.severity === 'low';
        }
        return a.severity === params.severity;
      });
    }

    if (params.category && params.category !== 'all') {
      result = result.filter((a) => a.category === params.category);
    }

    if (params.state && params.state !== 'All States' && params.state !== 'All India') {
      result = result.filter((a) => a.state.toLowerCase() === params.state?.toLowerCase());
    }

    if (params.district && params.district !== 'All Districts') {
      result = result.filter((a) => a.district.toLowerCase() === params.district?.toLowerCase());
    }

    if (params.searchQuery && params.searchQuery.trim() !== '') {
      const q = params.searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.stationName.toLowerCase().includes(q) ||
          a.district.toLowerCase().includes(q) ||
          a.state.toLowerCase().includes(q) ||
          a.anomalyType.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.stationId.toLowerCase().includes(q)
      );
    }

    return result;
  },

  async getAnomalyById(id: string): Promise<GroundwaterAnomaly | undefined> {
    const all = await this.getAnomalies();
    return all.find((a) => a.id === id || a.stationId === id);
  },

  async getCategoryCounts() {
    try {
      const sum = await apiClient.get<ApiAnomalySummaryResponse>(
        '/anomalies/summary',
        undefined,
        { useCache: true, cacheTtlMs: 20000, timeoutMs: 2500 }
      );

      if (sum) {
        return [
          {
            category: 'Sudden Drop' as const,
            name: 'Sudden Groundwater Drop',
            count: sum.sudden_drop_count,
            description: 'Groundwater level is falling faster than the expected local pattern.',
            icon: 'TrendingDown',
            color: '#dc2626',
          },
          {
            category: 'Possible Extraction' as const,
            name: 'Possible Abnormal Extraction',
            count: sum.possible_extraction_count,
            description: 'Repeated drawdown may indicate unusually high or sustained water withdrawal.',
            icon: 'ShieldAlert',
            color: '#ea580c',
          },
          {
            category: 'Missing Data' as const,
            name: 'Missing / Delayed Data',
            count: sum.missing_data_count,
            description: 'Expected observations are missing or arriving later than expected.',
            icon: 'Radio',
            color: '#d97706',
          },
          {
            category: 'Sensor Issue' as const,
            name: 'Possible Sensor Data Issue',
            count: sum.sensor_error_count,
            description: 'Readings show patterns that may require sensor or telemetry verification.',
            icon: 'Activity',
            color: '#ca8a04',
          },
          {
            category: 'Sudden Rise' as const,
            name: 'Sudden Groundwater Rise',
            count: sum.sudden_rise_count,
            description: 'Groundwater level has increased sharply, potentially following rainfall or recharge conditions.',
            icon: 'Droplets',
            color: '#16a34a',
          },
        ];
      }
    } catch {
      // Fallback
    }

    const categories: Record<AnomalyCategory, number> = {
      'Sudden Drop': 0,
      'Sudden Rise': 0,
      'Missing Data': 0,
      'Possible Extraction': 0,
      'Sensor Issue': 0,
    };

    mockAnomalies.forEach((a) => {
      if (categories[a.category] !== undefined) {
        categories[a.category]++;
      }
    });

    return [
      {
        category: 'Sudden Drop' as const,
        name: 'Sudden Groundwater Drop',
        count: categories['Sudden Drop'],
        description: 'Groundwater level is falling faster than the expected local pattern.',
        icon: 'TrendingDown',
        color: '#dc2626',
      },
      {
        category: 'Possible Extraction' as const,
        name: 'Possible Abnormal Extraction',
        count: categories['Possible Extraction'],
        description: 'Repeated drawdown may indicate unusually high or sustained water withdrawal.',
        icon: 'ShieldAlert',
        color: '#ea580c',
      },
      {
        category: 'Missing Data' as const,
        name: 'Missing / Delayed Data',
        count: categories['Missing Data'],
        description: 'Expected observations are missing or arriving later than expected.',
        icon: 'Radio',
        color: '#d97706',
      },
      {
        category: 'Sensor Issue' as const,
        name: 'Possible Sensor Data Issue',
        count: categories['Sensor Issue'],
        description: 'Readings show patterns that may require sensor or telemetry verification.',
        icon: 'Activity',
        color: '#ca8a04',
      },
      {
        category: 'Sudden Rise' as const,
        name: 'Sudden Groundwater Rise',
        count: categories['Sudden Rise'],
        description: 'Groundwater level has increased sharply, potentially following rainfall or recharge conditions.',
        icon: 'Droplets',
        color: '#16a34a',
      },
    ];
  },

  async getSeverityCounts() {
    try {
      const sum = await apiClient.get<ApiAnomalySummaryResponse>(
        '/anomalies/summary',
        undefined,
        { useCache: true, cacheTtlMs: 20000, timeoutMs: 2500 }
      );
      if (sum) {
        return {
          critical: sum.critical_count,
          high: sum.high_count,
          warning: sum.warning_count,
          info: sum.info_count,
        };
      }
    } catch {
      // Fallback
    }

    return {
      critical: mockAnomalies.filter((a) => a.severity === 'critical').length,
      high: mockAnomalies.filter((a) => a.severity === 'high').length,
      warning: mockAnomalies.filter((a) => a.severity === 'warning' || a.severity === 'medium').length,
      info: mockAnomalies.filter((a) => a.severity === 'info' || a.severity === 'low').length,
    };
  },

  async getStateAnomalyBreakdown(): Promise<StateAnomalySummary[]> {
    try {
      const statesRes = await apiClient.get<{ states: any[] }>(
        '/anomalies/states',
        undefined,
        { useCache: true, cacheTtlMs: 30000, timeoutMs: 2500 }
      );
      if (statesRes && statesRes.states && statesRes.states.length > 0) {
        return statesRes.states.map((s) => ({
          state: s.state,
          total: s.total_anomalies,
          critical: s.critical_count,
          high: s.high_count,
          warning: s.warning_count,
          mostCommonCategory: s.primary_category,
        }));
      }
    } catch {
      // Fallback
    }

    const stateMap = new Map<string, { total: number; critical: number; high: number; warning: number; categories: string[] }>();
    mockAnomalies.forEach((a) => {
      if (!stateMap.has(a.state)) {
        stateMap.set(a.state, { total: 0, critical: 0, high: 0, warning: 0, categories: [] });
      }
      const item = stateMap.get(a.state)!;
      item.total++;
      if (a.severity === 'critical') item.critical++;
      else if (a.severity === 'high') item.high++;
      else item.warning++;
      item.categories.push(a.category);
    });

    const list: StateAnomalySummary[] = [];
    stateMap.forEach((val, key) => {
      const freq: Record<string, number> = {};
      let maxCat = val.categories[0] || 'Sudden Drop';
      let maxCount = 0;
      val.categories.forEach((c) => {
        freq[c] = (freq[c] || 0) + 1;
        if (freq[c] > maxCount) {
          maxCount = freq[c];
          maxCat = c;
        }
      });

      list.push({
        state: key,
        total: val.total,
        critical: val.critical,
        high: val.high,
        warning: val.warning,
        mostCommonCategory: maxCat,
      });
    });

    return list.sort((a, b) => b.total - a.total);
  },
};
