import type { StationForecast } from '../types';
import { generate5260Stations } from './stationGenerator';

export interface RegionalForecastOutlook {
  state: string;
  totalStations: number;
  currentAvgDepth: number;
  trend: 'falling' | 'stable' | 'rising';
  riskLevel: 'Critical' | 'High' | 'Moderate' | 'Lower';
  forecast90d: string;
  expectedRainfallMm: number;
  priorityAction: string;
}

export interface DaysToCriticalBreakdown {
  range: string;
  label: string;
  count: number;
  percentage: number;
  severity: 'critical' | 'high' | 'watch' | 'safe';
  farmerDescription: string;
  actionRequired: string;
}

export const mockDaysToCriticalBrackets: DaysToCriticalBreakdown[] = [
  {
    range: '0–7 Days',
    label: 'Critical Alert',
    count: 68,
    percentage: 1.3,
    severity: 'critical',
    farmerDescription: 'Aquifer table is within centimeters of pump suction depth. Emergency water scarcity.',
    actionRequired: 'Immediately restrict continuous tube-well pumping. Alternate hours across neighboring plots.',
  },
  {
    range: '8–30 Days',
    label: 'High Attention',
    count: 376,
    percentage: 7.1,
    severity: 'high',
    farmerDescription: 'Fast depletion velocity indicates critical water stress within the current crop cycle.',
    actionRequired: 'Transition upcoming rabi/kharif sowing to pulses/millets. Implement drip or furrow irrigation.',
  },
  {
    range: '31–60 Days',
    label: 'Watch Zone',
    count: 780,
    percentage: 14.8,
    severity: 'watch',
    farmerDescription: 'Manageable seasonal draw, but requires monitoring if monsoon rainfall is delayed.',
    actionRequired: 'Calibrate pumping schedules to night hours. Check soil moisture before irrigating.',
  },
  {
    range: '60+ Days / Safe',
    label: 'Lower Immediate Risk',
    count: 4036,
    percentage: 76.8,
    severity: 'safe',
    farmerDescription: 'Adequate groundwater reserve. Recharge rates balance seasonal extraction demand.',
    actionRequired: 'Maintain good agronomic water management. Practice farm-pond rainwater harvesting.',
  },
];

export const mockRainfallForecastSeries = [
  {
    period: 'Day 1–3',
    expectedRainfall: 14,
    historicalAvg: 18,
    potentialRechargeIndex: 22,
    groundwaterResponse: 'Minimal infiltration; topsoil moisture replenishment only.',
  },
  {
    period: 'Day 4–7',
    expectedRainfall: 38,
    historicalAvg: 30,
    potentialRechargeIndex: 65,
    groundwaterResponse: 'Shallow aquifer infiltration begins in sandy alluvial zones.',
  },
  {
    period: 'Day 8–15',
    expectedRainfall: 62,
    historicalAvg: 55,
    potentialRechargeIndex: 110,
    groundwaterResponse: 'Significant recharge pulse expected across Gangetic and Narmada basins.',
  },
  {
    period: 'Day 16–30',
    expectedRainfall: 95,
    historicalAvg: 85,
    potentialRechargeIndex: 175,
    groundwaterResponse: 'Widespread water table rebound projected (+0.25m to +0.45m).',
  },
];

export const mockRegionalOutlooks: RegionalForecastOutlook[] = [
  {
    state: 'Punjab',
    totalStations: 420,
    currentAvgDepth: 22.4,
    trend: 'falling',
    riskLevel: 'Critical',
    forecast90d: 'Decline -0.85 mbgl',
    expectedRainfallMm: 65,
    priorityAction: 'High urgency: Shift paddy rotations to short-duration pulses; prohibit unauthorized deep borewells.',
  },
  {
    state: 'Rajasthan',
    totalStations: 680,
    currentAvgDepth: 34.2,
    trend: 'falling',
    riskLevel: 'Critical',
    forecast90d: 'Decline -0.68 mbgl',
    expectedRainfallMm: 45,
    priorityAction: 'Strict deficit irrigation required; promote bajra/guar millets and solar drip micro-irrigation.',
  },
  {
    state: 'Haryana',
    totalStations: 380,
    currentAvgDepth: 19.5,
    trend: 'falling',
    riskLevel: 'High',
    forecast90d: 'Decline -0.52 mbgl',
    expectedRainfallMm: 72,
    priorityAction: 'Adopt direct seeded rice (DSR) and schedule night-time sprinkler operations.',
  },
  {
    state: 'Gujarat',
    totalStations: 460,
    currentAvgDepth: 21.8,
    trend: 'falling',
    riskLevel: 'High',
    forecast90d: 'Decline -0.45 mbgl',
    expectedRainfallMm: 95,
    priorityAction: 'Stagger irrigation shifts across Kadi and Mehsana blocks to prevent localized pumping cones.',
  },
  {
    state: 'Karnataka',
    totalStations: 540,
    currentAvgDepth: 18.2,
    trend: 'falling',
    riskLevel: 'High',
    forecast90d: 'Decline -0.38 mbgl',
    expectedRainfallMm: 110,
    priorityAction: 'Recharge hard-rock borewells with check-dams; restrict sugarcane in Kolar and Chitradurga.',
  },
  {
    state: 'Maharashtra',
    totalStations: 720,
    currentAvgDepth: 15.6,
    trend: 'stable',
    riskLevel: 'Moderate',
    forecast90d: 'Rebound +0.15 mbgl',
    expectedRainfallMm: 165,
    priorityAction: 'Monsoon infiltration active in Deccan basalt; maintain contour bunds and farm ponds.',
  },
  {
    state: 'Tamil Nadu',
    totalStations: 510,
    currentAvgDepth: 9.8,
    trend: 'stable',
    riskLevel: 'Moderate',
    forecast90d: 'Stable +/-0.05 mbgl',
    expectedRainfallMm: 135,
    priorityAction: 'Cauvery delta storage stable; monitor northeast monsoon pre-sowing window.',
  },
  {
    state: 'Telangana',
    totalStations: 280,
    currentAvgDepth: 14.5,
    trend: 'stable',
    riskLevel: 'Moderate',
    forecast90d: 'Rebound +0.20 mbgl',
    expectedRainfallMm: 150,
    priorityAction: 'Maintain tank-cascade recharge network; promote cotton-pulse crop diversification.',
  },
  {
    state: 'Andhra Pradesh',
    totalStations: 350,
    currentAvgDepth: 16.2,
    trend: 'falling',
    riskLevel: 'Moderate',
    forecast90d: 'Decline -0.22 mbgl',
    expectedRainfallMm: 120,
    priorityAction: 'Rayalaseema crystalline aquifers require managed artificial recharge and micro-irrigation.',
  },
  {
    state: 'Madhya Pradesh',
    totalStations: 490,
    currentAvgDepth: 11.2,
    trend: 'rising',
    riskLevel: 'Lower',
    forecast90d: 'Rebound +0.42 mbgl',
    expectedRainfallMm: 210,
    priorityAction: 'Robust Narmada basin recovery; favorable conditions for normal kharif sowing.',
  },
  {
    state: 'Uttar Pradesh',
    totalStations: 850,
    currentAvgDepth: 10.4,
    trend: 'rising',
    riskLevel: 'Lower',
    forecast90d: 'Rebound +0.35 mbgl',
    expectedRainfallMm: 185,
    priorityAction: 'Gangetic alluvium storage healthy; high potential for multi-crop rotations.',
  },
  {
    state: 'Bihar',
    totalStations: 210,
    currentAvgDepth: 7.2,
    trend: 'rising',
    riskLevel: 'Lower',
    forecast90d: 'Rebound +0.48 mbgl',
    expectedRainfallMm: 230,
    priorityAction: 'Shallow water table fully recharged; ensure proper field drainage for kharif crops.',
  },
  {
    state: 'West Bengal',
    totalStations: 180,
    currentAvgDepth: 6.8,
    trend: 'rising',
    riskLevel: 'Lower',
    forecast90d: 'Rebound +0.55 mbgl',
    expectedRainfallMm: 260,
    priorityAction: 'Ample surface and groundwater reserves; practice optimal fertilizer timing during monsoon.',
  },
];

/**
 * Dynamically builds a forecast model for any station ID with time-series points.
 */
export function generateForecastForStation(stationId: string): StationForecast {
  const allStations = generate5260Stations();
  const station = allStations.find((s) => s.id === stationId) || allStations[0];

  const currentLevel = station.waterLevel;
  const isFalling = station.trend === 'falling';
  const isRising = station.trend === 'rising';
  const slope = isFalling ? 0.25 : isRising ? -0.15 : 0.02;

  const points = [
    {
      date: 'Today',
      historical: currentLevel,
      predictedLevel: currentLevel,
      upperConfidence: currentLevel,
      lowerConfidence: currentLevel,
      expectedRainfallMm: 5,
      change: 'Baseline',
    },
    {
      date: '+7 Days',
      predictedLevel: Math.round((currentLevel + slope * 0.25) * 100) / 100,
      upperConfidence: Math.round((currentLevel + slope * 0.25 + 0.15) * 100) / 100,
      lowerConfidence: Math.round((currentLevel + slope * 0.25 - 0.15) * 100) / 100,
      expectedRainfallMm: 12,
      change: `${slope > 0 ? '-' : '+'}${Math.abs(slope * 0.25).toFixed(2)}m`,
    },
    {
      date: '+15 Days',
      predictedLevel: Math.round((currentLevel + slope * 0.5) * 100) / 100,
      upperConfidence: Math.round((currentLevel + slope * 0.5 + 0.3) * 100) / 100,
      lowerConfidence: Math.round((currentLevel + slope * 0.5 - 0.3) * 100) / 100,
      expectedRainfallMm: 25,
      change: `${slope > 0 ? '-' : '+'}${Math.abs(slope * 0.5).toFixed(2)}m`,
    },
    {
      date: '+30 Days',
      predictedLevel: Math.round((currentLevel + slope * 1.0) * 100) / 100,
      upperConfidence: Math.round((currentLevel + slope * 1.0 + 0.5) * 100) / 100,
      lowerConfidence: Math.round((currentLevel + slope * 1.0 - 0.5) * 100) / 100,
      expectedRainfallMm: 45,
      change: `${slope > 0 ? '-' : '+'}${Math.abs(slope * 1.0).toFixed(2)}m`,
    },
    {
      date: '+60 Days',
      predictedLevel: Math.round((currentLevel + slope * 1.8) * 100) / 100,
      upperConfidence: Math.round((currentLevel + slope * 1.8 + 0.8) * 100) / 100,
      lowerConfidence: Math.round((currentLevel + slope * 1.8 - 0.8) * 100) / 100,
      expectedRainfallMm: 80,
      change: `${slope > 0 ? '-' : '+'}${Math.abs(slope * 1.8).toFixed(2)}m`,
    },
    {
      date: '+90 Days',
      predictedLevel: Math.round((currentLevel + slope * 2.5) * 100) / 100,
      upperConfidence: Math.round((currentLevel + slope * 2.5 + 1.2) * 100) / 100,
      lowerConfidence: Math.round((currentLevel + slope * 2.5 - 1.2) * 100) / 100,
      expectedRainfallMm: 110,
      change: `${slope > 0 ? '-' : '+'}${Math.abs(slope * 2.5).toFixed(2)}m`,
    },
  ];

  let farmerGuidance = '';
  if (station.status === 'critical') {
    farmerGuidance = `High risk alert: Water table is projected to decline to ${(currentLevel + 0.8).toFixed(1)}m depth within 30 days. Pumping restrictions strongly advised.`;
  } else if (station.status === 'warning') {
    farmerGuidance = `Warning: Steady downward trajectory. Water table is projected to drop ${(slope * 1.0).toFixed(2)}m over the next 30 days without significant recharge.`;
  } else if (station.status === 'moderate') {
    farmerGuidance = `Moderate outlook: Water levels are expected to remain manageable. Standard seasonal crop planning suitable.`;
  } else {
    farmerGuidance = `Favorable outlook: Water table is healthy with expected recharge surplus over the next 60–90 days.`;
  }

  return {
    stationId: station.id,
    stationName: station.stationName,
    district: station.district,
    state: station.state,
    currentLevel,
    projectedLevel30d: Math.round((currentLevel + slope * 1.0) * 10) / 10,
    projectedDaysToCritical: station.daysToCritical,
    confidenceScore: Math.round((0.85 + Math.random() * 0.1) * 100) / 100,
    farmerGuidance,
    forecastPoints: points,
  };
}
