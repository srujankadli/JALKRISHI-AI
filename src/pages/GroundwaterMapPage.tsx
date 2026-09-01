import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import type { DWLRStation, StationStatus, TrendDirection } from '../types';
import { stationService } from '../services/stationService';
import type { StateStationSummary } from '../services/stationService';
import { GroundwaterMap } from '../components/map/GroundwaterMap';
import { MapSummaryBar } from '../components/map/MapSummaryBar';
import { MapSearchDropdown } from '../components/map/MapSearchDropdown';
import { MapFilterPanel } from '../components/map/MapFilterPanel';
import { NearestStationCard } from '../components/map/NearestStationCard';
import { StateInsightCard } from '../components/map/StateInsightCard';
import { StationCard } from '../components/station/StationCard';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState, LoadingState } from '../components/common/States';
import { STATE_CENTERS } from '../utils/geoUtils';

interface OutletContextType {
  onSelectStation: (station: DWLRStation) => void;
}

export const GroundwaterMapPage: React.FC = () => {
  const { onSelectStation } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();

  // All 5,260 stations loaded into memory
  const [allStations, setAllStations] = useState<DWLRStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<DWLRStation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [statesList, setStatesList] = useState<string[]>(['All States']);
  const [districtsList, setDistrictsList] = useState<string[]>(['All Districts']);
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All Districts');
  const [selectedStatus, setSelectedStatus] = useState<StationStatus | 'all'>('all');
  const [selectedTrend, setSelectedTrend] = useState<TrendDirection | 'all'>('all');
  const [selectedRisk, setSelectedRisk] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map & Station Interaction States
  const [activeStation, setActiveStation] = useState<DWLRStation | null>(null);
  const [panToCoords, setPanToCoords] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [nearestStationData, setNearestStationData] = useState<{ station: DWLRStation; distanceKm: number } | null>(null);
  const [stateSummary, setStateSummary] = useState<StateStationSummary | null>(null);

  // Initial Load: Fetch all 5,260 stations and populate dropdowns
  useEffect(() => {
    async function init() {
      setLoading(true);
      const [stations, states] = await Promise.all([
        stationService.getAllStations(),
        stationService.getDistinctStates(),
      ]);
      setAllStations(stations);
      setFilteredStations(stations);
      setStatesList(states);
      setLoading(false);
    }
    init();
  }, []);

  // Update Districts and State Summary when selectedState changes
  useEffect(() => {
    async function updateStateDetails() {
      const districts = await stationService.getDistinctDistricts(selectedState);
      setDistrictsList(districts);
      setSelectedDistrict('All Districts');

      if (selectedState && selectedState !== 'All States' && selectedState !== 'All India') {
        const summary = await stationService.getStateSummary(selectedState);
        setStateSummary(summary);

        // Smooth pan to state center coordinates
        if (STATE_CENTERS[selectedState]) {
          setPanToCoords(STATE_CENTERS[selectedState]);
        }
      } else {
        setStateSummary(null);
      }
    }
    updateStateDetails();
  }, [selectedState]);

  // Reactive filtering of all 5,260 stations based on criteria
  useEffect(() => {
    let result = allStations;

    if (selectedState && selectedState !== 'All States' && selectedState !== 'All India') {
      const st = selectedState.toLowerCase();
      result = result.filter((s) => s.state.toLowerCase() === st);
    }

    if (selectedDistrict && selectedDistrict !== 'All Districts') {
      const dist = selectedDistrict.toLowerCase();
      result = result.filter((s) => s.district.toLowerCase() === dist);
    }

    if (selectedStatus !== 'all') {
      result = result.filter((s) => s.status === selectedStatus);
    }

    if (selectedTrend !== 'all') {
      result = result.filter((s) => s.trend === selectedTrend);
    }

    if (selectedRisk !== 'all') {
      if (selectedRisk === 'low') {
        result = result.filter((s) => s.riskScore < 0.4);
      } else if (selectedRisk === 'medium') {
        result = result.filter((s) => s.riskScore >= 0.4 && s.riskScore < 0.7);
      } else if (selectedRisk === 'high') {
        result = result.filter((s) => s.riskScore >= 0.7 && s.riskScore < 0.85);
      } else if (selectedRisk === 'critical') {
        result = result.filter((s) => s.riskScore >= 0.85);
      }
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.stationName.toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q) ||
          s.state.toLowerCase().includes(q) ||
          s.block.toLowerCase().includes(q) ||
          s.stationCode.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      );
    }

    setFilteredStations(result);
  }, [
    allStations,
    selectedState,
    selectedDistrict,
    selectedStatus,
    selectedTrend,
    selectedRisk,
    searchQuery,
  ]);

  // Geolocation Nearest Station Handler
  const handleUserLocationFound = async (lat: number, lng: number) => {
    const nearest = await stationService.findNearest(lat, lng);
    if (nearest) {
      setNearestStationData(nearest);
      setPanToCoords({ lat: nearest.station.latitude, lng: nearest.station.longitude, zoom: 11 });
      setActiveStation(nearest.station);
    }
  };

  const handleSelectStationFromSearch = (station: DWLRStation) => {
    setActiveStation(station);
    setPanToCoords({ lat: station.latitude, lng: station.longitude, zoom: 11 });
    onSelectStation(station);
  };

  const handleResetFilters = () => {
    setSelectedState('All States');
    setSelectedDistrict('All Districts');
    setSelectedStatus('all');
    setSelectedTrend('all');
    setSelectedRisk('all');
    setSearchQuery('');
    setStateSummary(null);
    setPanToCoords(STATE_CENTERS['All India']);
  };

  // Preview slice for the sidebar list (first 30 matching stations for instant DOM rendering)
  const stationListPreview = useMemo(() => {
    return filteredStations.slice(0, 40);
  }, [filteredStations]);

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* 1. Page Header */}
      <PageHeader
        title="Interactive Groundwater Map"
        subtitle="Explore 5,260 simulated DWLR observation wells across India with cluster aggregation, telemetry depth gauges, and depletion alerts."
        farmerNote="Click any colored cluster or pin (🟢 Healthy, 🟡 Moderate, 🟠 Warning, 🔴 Critical) to check local water depth and actionable irrigation advice."
        badge={
          <span className="rounded-full bg-water-100 border border-water-200 px-3 py-1 text-xs font-bold text-water-800">
            5,260 DWLR Stations
          </span>
        }
      />

      {/* 2. Map Summary Stats Bar (Derived from filtered dataset) */}
      <MapSummaryBar
        filteredStations={filteredStations}
        totalStationCount={allStations.length || 5260}
      />

      {/* 3. Search and Multi-Criteria Filter Toolbar */}
      <div className="space-y-3">
        <MapSearchDropdown
          stations={allStations}
          onSelectStation={handleSelectStationFromSearch}
        />

        <MapFilterPanel
          states={statesList}
          districts={districtsList}
          selectedState={selectedState}
          onStateChange={setSelectedState}
          selectedDistrict={selectedDistrict}
          onDistrictChange={setSelectedDistrict}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedTrend={selectedTrend}
          onTrendChange={setSelectedTrend}
          selectedRisk={selectedRisk}
          onRiskChange={setSelectedRisk}
          onResetFilters={handleResetFilters}
          totalFilteredCount={filteredStations.length}
          totalStationCount={allStations.length || 5260}
        />
      </div>

      {/* 4. Contextual Nearest Station or State Insight Cards */}
      {nearestStationData && (
        <NearestStationCard
          nearest={nearestStationData}
          onClose={() => setNearestStationData(null)}
          onViewStation={(st) => onSelectStation(st)}
          onPanToStation={(st) =>
            setPanToCoords({ lat: st.latitude, lng: st.longitude, zoom: 11 })
          }
          onNavigateToCropAdvisor={() => navigate('/crops')}
        />
      )}

      {stateSummary && (
        <StateInsightCard
          summary={stateSummary}
          onClearState={() => setSelectedState('All States')}
        />
      )}

      {/* 5. Main Map & Station List Split Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left / Main Map Area */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <GroundwaterMap
            stations={filteredStations}
            selectedStation={activeStation}
            onSelectStation={(st) => setActiveStation(st)}
            onViewStationDetails={(st) => onSelectStation(st)}
            onUserLocationFound={handleUserLocationFound}
            panToCoords={panToCoords}
            height="620px"
          />
        </div>

        {/* Right / Station Browse Sidebar */}
        <div className="lg:col-span-4 flex flex-col h-[620px] rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">
                Observation Wells
              </h3>
              <p className="text-[11px] text-stone-500">
                Showing top {stationListPreview.length} of {filteredStations.length.toLocaleString('en-IN')}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-agri-700 bg-agri-50 px-2 py-0.5 rounded">
              Click to Inspect
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
            {loading ? (
              <LoadingState message="Loading 5,260 DWLR telemetry nodes..." />
            ) : filteredStations.length === 0 ? (
              <EmptyState
                title="No Stations Found"
                description="No observation wells match your current search or filter combination. Try clearing some filters."
                actionText="Clear All Filters"
                onAction={handleResetFilters}
              />
            ) : (
              stationListPreview.map((st) => (
                <StationCard
                  key={st.id}
                  station={st}
                  isSelected={activeStation?.id === st.id}
                  onSelect={(station) => {
                    setActiveStation(station);
                    setPanToCoords({ lat: station.latitude, lng: station.longitude, zoom: 11 });
                    onSelectStation(station);
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
