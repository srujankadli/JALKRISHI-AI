import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Sparkles, Radio } from 'lucide-react';
import type { StationForecast, DWLRStation } from '../types';
import { forecastService } from '../services/forecastService';
import { stationService } from '../services/stationService';
import type {
  RegionalForecastOutlook,
  DaysToCriticalBreakdown,
} from '../data/mockForecasts';

// Forecasting UI Components
import { PageHeader } from '../components/common/PageHeader';
import { ForecastOverviewCards } from '../components/forecast/ForecastOverviewCards';
import { DaysToCriticalCard } from '../components/forecast/DaysToCriticalCard';
import { ForecastCurveCard } from '../components/forecast/ForecastCurveCard';
import { TopRiskStationsTable } from '../components/forecast/TopRiskStationsTable';
import { TopStableStationsTable } from '../components/forecast/TopStableStationsTable';
import { RiskComparisonCard } from '../components/forecast/RiskComparisonCard';
import { RainfallOutlookCard } from '../components/forecast/RainfallOutlookCard';
import { RegionalForecastTable } from '../components/forecast/RegionalForecastTable';
import { FarmerActionAdvice } from '../components/forecast/FarmerActionAdvice';
import { ForecastMethodologyNote } from '../components/forecast/ForecastMethodologyNote';

interface OutletContextType {
  onSelectStation: (station: DWLRStation) => void;
}

export const ForecastPage: React.FC = () => {
  const { onSelectStation } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();

  // State
  const [stations, setStations] = useState<DWLRStation[]>([]);
  const [statesList, setStatesList] = useState<string[]>(['All States']);
  const [selectedStationId, setSelectedStationId] = useState<string>('DWLR-PB-001');
  const [selectedState, setSelectedState] = useState<string>('Punjab');
  const [forecastData, setForecastData] = useState<StationForecast | null>(null);

  const [daysToCriticalBrackets, setDaysToCriticalBrackets] = useState<DaysToCriticalBreakdown[]>([]);
  const [topRiskStations, setTopRiskStations] = useState<DWLRStation[]>([]);
  const [topStableStations, setTopStableStations] = useState<DWLRStation[]>([]);
  const [regionalOutlooks, setRegionalOutlooks] = useState<RegionalForecastOutlook[]>([]);

  // Initial Load
  useEffect(() => {
    async function loadData() {
      const [
        allSt,
        states,
        brackets,
        topRisk,
        topStable,
        outlooks,
      ] = await Promise.all([
        stationService.getAllStations(),
        stationService.getDistinctStates(),
        forecastService.getDaysToCriticalBrackets(),
        forecastService.getTop10HighRiskStations(),
        forecastService.getTop10LowerRiskStations(),
        forecastService.getRegionalOutlooks(),
      ]);

      setStations(allSt);
      setStatesList(states);
      setDaysToCriticalBrackets(brackets);
      setTopRiskStations(topRisk);
      setTopStableStations(topStable);
      setRegionalOutlooks(outlooks);
    }
    loadData();
  }, []);

  // Update Station Forecast when selectedStationId changes
  useEffect(() => {
    async function loadForecast() {
      const fc = await forecastService.getForecastForStation(selectedStationId);
      setForecastData(fc);
    }
    loadForecast();
  }, [selectedStationId]);

  const handleStationTableSelect = (st: DWLRStation) => {
    setSelectedStationId(st.id);
    onSelectStation(st);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-8">
      {/* 0. Top Simulation Disclaimer & Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-water-600 animate-pulse" />
          <span className="font-extrabold text-stone-900">
            JalKrishi Predictive Intelligence Engine
          </span>
          <span className="text-stone-400">&bull;</span>
          <span className="text-stone-500 font-medium">30–90 Day Hydrological Extrapolations</span>
        </div>

        <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
          <Radio className="h-3 w-3 text-water-600" />
          Demo Simulation Model
        </span>
      </div>

      {/* 1. Page Header */}
      <PageHeader
        title="Prediction & Forecasting Intelligence"
        subtitle="Anticipate groundwater depletion trends and critical threshold margins before water stress impacts agricultural yield."
        farmerNote="Predictions estimate when your water table might reach warning or critical limits, helping you choose the right crops and calibrate irrigation early."
        badge={
          <span className="rounded-full bg-water-100 border border-water-200 px-3 py-1 text-xs font-bold text-water-800 flex items-center gap-1.5 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-water-700" />
            90-Day Projection AI Model
          </span>
        }
      />

      {/* 2. Forecast Overview 4 Metric Cards */}
      <ForecastOverviewCards
        highRiskCount={444}
        fallingCount={1890}
        nearestCriticalStationName="Sangrur Central, PB"
        avgDaysToCritical={34}
        onNavigateToRisk={() => {
          setSelectedStationId('DWLR-PB-001');
        }}
      />

      {/* 3. Days-to-Critical Prominent Visual Indicator */}
      <DaysToCriticalCard
        brackets={daysToCriticalBrackets}
        onSelectRange={(range) => {
          if (range.includes('0–7') || range.includes('8–30')) {
            setSelectedStationId('DWLR-PB-001');
          }
        }}
      />

      {/* 4. Primary Groundwater Forecast Chart (Recharts with Confidence Bounds) */}
      <ForecastCurveCard
        forecast={forecastData}
        stations={stations}
        selectedStationId={selectedStationId}
        onSelectStationId={setSelectedStationId}
        selectedState={selectedState}
        onSelectState={setSelectedState}
        statesList={statesList}
      />

      {/* 5. Top 10 High-Risk Stations */}
      <TopRiskStationsTable
        stations={topRiskStations}
        onSelectStation={handleStationTableSelect}
      />

      {/* 6. Top 10 Lower-Risk / More Stable Stations */}
      <TopStableStationsTable
        stations={topStableStations}
        onSelectStation={handleStationTableSelect}
      />

      {/* 7. Risk Comparison (Stressed vs Resilient Network Balance) */}
      <RiskComparisonCard
        totalStations={5260}
        criticalCount={444}
        warningCount={780}
        moderateCount={1624}
        healthyCount={2412}
      />

      {/* 8. Rainfall Prediction Outlook & Infiltration Flow */}
      <RainfallOutlookCard />

      {/* 9. Regional Groundwater Outlook (State-by-State 90-Day Outlook) */}
      <RegionalForecastTable
        outlooks={regionalOutlooks}
        onSelectState={(state) => {
          setSelectedState(state);
          navigate('/map');
        }}
      />

      {/* 10. Farmer Action Recommendations ("What should you do?") */}
      <FarmerActionAdvice />

      {/* 11. Transparent Methodology & Demonstration Disclaimer Note */}
      <ForecastMethodologyNote />
    </div>
  );
};
