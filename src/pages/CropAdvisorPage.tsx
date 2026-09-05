import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Sprout, Radio, MapPin, Droplets } from 'lucide-react';
import type {
  DWLRStation,
  SoilType,
  CropSeason,
  WaterAvailabilityLevel,
  RainfallCondition,
  CropRecommendation,
} from '../types';
import { cropService } from '../services/cropService';
import type { CropRecommendationResult } from '../services/cropService';
import { stationService } from '../services/stationService';

// Crop Advisor UI Components
import { PageHeader } from '../components/common/PageHeader';
import { FarmProfileForm } from '../components/crops/FarmProfileForm';
import { FarmWaterProfileSection, type FarmWaterProfile } from '../components/crops/FarmWaterProfileSection';
import { TopCropRecommendations } from '../components/crops/TopCropRecommendations';
import { NotRecommendedCrops } from '../components/crops/NotRecommendedCrops';
import { CropComparisonTable } from '../components/crops/CropComparisonTable';
import { CropDetailModal } from '../components/crops/CropDetailModal';
import { WaterSmartFarmingAdvice } from '../components/crops/WaterSmartFarmingAdvice';
import { CropMethodologyNote } from '../components/crops/CropMethodologyNote';
import { useLanguage } from '../context/LanguageContext';
import { useFarm } from '../context/FarmContext';
import { useAuth } from '../context/AuthContext';

interface OutletContextType {
  onSelectStation: (station: DWLRStation) => void;
}

export const CropAdvisorPage: React.FC = () => {
  const { t } = useLanguage();
  const { onSelectStation } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();
  const { isFarmer } = useAuth();
  const {
    location: farmLocation,
    profile: farmWaterProfile,
    updateFarmProfile,
    setFarmLocation,
    resolvedLocation,
    nearestStation: farmNearestStation,
  } = useFarm();

  // Location & Form States
  const [statesList, setStatesList] = useState<string[]>(['All States']);
  const [districtsList, setDistrictsList] = useState<string[]>(['All Districts']);
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All Districts');
  const [soilType, setSoilType] = useState<SoilType>('Alluvial');
  const [season, setSeason] = useState<CropSeason>('Rabi');
  const [waterAvailability, setWaterAvailability] = useState<WaterAvailabilityLevel>('Moderate');
  const [rainfallCondition, setRainfallCondition] = useState<RainfallCondition>('Normal');

  // Connected Nearby Station Context
  const [nearbyStation, setNearbyStation] = useState<DWLRStation | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Recommendations & Modal States
  const [recommendations, setRecommendations] = useState<CropRecommendationResult | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropRecommendation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSaveFarmWaterProfile = (newProfile: FarmWaterProfile) => {
    updateFarmProfile(newProfile);
    if (newProfile.location && newProfile.location !== farmLocation) {
      setFarmLocation(newProfile.location);
    }
  };

  const profileSummary = [
    farmWaterProfile.crop ? `${t('Crop')}: ${farmWaterProfile.crop}` : null,
    farmWaterProfile.facilities.length ? farmWaterProfile.facilities.map((item) => item.replace(/_/g, ' ')).join(', ') : null,
    farmWaterProfile.reliability || null,
    farmWaterProfile.groundwaterDependencyRange ? `${t('Groundwater')}: ${farmWaterProfile.groundwaterDependencyRange}` : null,
    farmWaterProfile.externalWaterDependencyRange ? `${t('External water')}: ${farmWaterProfile.externalWaterDependencyRange}` : null,
    farmWaterProfile.rainfallDependency ? `${t('Rainfall')}: ${farmWaterProfile.rainfallDependency}` : null,
  ].filter(Boolean);

  // Initial Load: Populate States & evaluate plan
  useEffect(() => {
    async function init() {
      const states = await stationService.getDistinctStates();
      setStatesList(states);

      // Check if user has an active farm profile location
      const savedLoc = farmWaterProfile?.location || farmLocation;
      if (savedLoc && savedLoc.trim()) {
        const allStations = await stationService.getAllStations();
        const found = allStations.find(
          (s) =>
            s.district.toLowerCase() === savedLoc.toLowerCase().trim() ||
            s.stationName.toLowerCase().includes(savedLoc.toLowerCase().trim()) ||
            s.state.toLowerCase() === savedLoc.toLowerCase().trim()
        );
        if (found) {
          setSelectedState(found.state);
          const districts = await stationService.getDistinctDistricts(found.state);
          setDistrictsList(districts);
          setSelectedDistrict(found.district);
          setNearbyStation(found);
          const plan = await cropService.evaluateCrops({
            soilType: (found.soilType as SoilType) || 'Alluvial',
            season: 'Rabi',
            waterAvailability: found.status === 'critical' ? 'Stressed' : found.status === 'warning' ? 'Limited' : 'Moderate',
            rainfallCondition: 'Normal',
            groundwaterTrend: found.trend,
            state: found.state,
            district: found.district,
          });
          setRecommendations(plan);
          return;
        }
      }

      // Baseline plan if no location set yet
      const plan = await cropService.evaluateCrops({
        soilType: 'Alluvial',
        season: 'Rabi',
        waterAvailability: 'Moderate',
        rainfallCondition: 'Normal',
      });
      setRecommendations(plan);
    }
    init();
  }, []);

  // Update Districts and Nearby Station when selectedState changes
  useEffect(() => {
    async function updateDistricts() {
      if (selectedState && selectedState !== 'All States') {
        const districts = await stationService.getDistinctDistricts(selectedState);
        setDistrictsList(districts);
        if (districts.length > 0) {
          setSelectedDistrict(districts[0]);
        }
      }
    }
    updateDistricts();
  }, [selectedState]);

  // Update Nearby Station context when selectedDistrict changes
  useEffect(() => {
    async function updateStationContext() {
      if (selectedDistrict && selectedDistrict !== 'All Districts') {
        const allStations = await stationService.getAllStations();
        const found = allStations.find(
          (s) => s.district.toLowerCase() === selectedDistrict.toLowerCase()
        );
        if (found) {
          setNearbyStation(found);
          // Auto-adjust water availability based on station status if not manually locked
          if (found.status === 'critical') setWaterAvailability('Stressed');
          else if (found.status === 'warning') setWaterAvailability('Limited');
          else if (found.status === 'moderate') setWaterAvailability('Moderate');
          else setWaterAvailability('Abundant');
        }
      }
    }
    updateStationContext();
  }, [selectedDistrict]);

  // Generate Scored Crop Plan
  const handleGenerateCropPlan = async () => {
    setIsGenerating(true);
    const result = await cropService.evaluateCrops({
      soilType,
      season,
      waterAvailability,
      rainfallCondition,
      groundwaterTrend: nearbyStation?.trend || 'falling',
      state: selectedState,
      district: selectedDistrict,
    });
    setRecommendations(result);
    setIsGenerating(false);
  };

  // Browser Geolocation Auto-Detection
  const handleUseMyLocation = () => {
    setLocationNotice(null);
    if (!navigator.geolocation) {
      setLocationNotice('Location access is not supported by your browser. Please select your State and District manually from the dropdowns.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const nearest = await stationService.findNearest(lat, lng);
        if (nearest) {
          const st = nearest.station;
          setNearbyStation(st);
          setSelectedState(st.state);
          setSelectedDistrict(st.district);
          if (st.soilType && ['Alluvial', 'Black', 'Red', 'Laterite', 'Sandy', 'Loamy', 'Clay'].includes(st.soilType)) {
            setSoilType(st.soilType as SoilType);
          }
          if (st.status === 'critical') setWaterAvailability('Stressed');
          else if (st.status === 'warning') setWaterAvailability('Limited');
          else if (st.status === 'moderate') setWaterAvailability('Moderate');
          else setWaterAvailability('Abundant');

          // Automatically re-evaluate
          const result = await cropService.evaluateCrops({
            soilType: (st.soilType as SoilType) || soilType,
            season,
            waterAvailability: st.status === 'critical' ? 'Stressed' : 'Moderate',
            rainfallCondition,
            groundwaterTrend: st.trend,
            state: st.state,
            district: st.district,
          });
          setRecommendations(result);
          setLocationNotice(`Located station: ${st.stationName} (${st.district}, ${st.state}). Form auto-populated.`);
        }
      },
      () => {
        setLocationNotice('Location access is unavailable or denied. Please select your State and District manually from the dropdowns.');
      }
    );
  };

  // Preset Scenario Handlers
  const handleApplyPresetScenario = async (scenario: 'stressed' | 'normal' | 'high_rain' | 'dryland') => {
    if (scenario === 'stressed') {
      setSelectedState('Karnataka');
      setSelectedDistrict('Kolar');
      setSoilType('Red');
      setSeason('Kharif');
      setWaterAvailability('Stressed');
      setRainfallCondition('Low');
    } else if (scenario === 'normal') {
      setSelectedState('Uttar Pradesh');
      setSelectedDistrict('Varanasi');
      setSoilType('Alluvial');
      setSeason('Rabi');
      setWaterAvailability('Moderate');
      setRainfallCondition('Normal');
    } else if (scenario === 'high_rain') {
      setSelectedState('West Bengal');
      setSelectedDistrict('Burdwan');
      setSoilType('Clay');
      setSeason('Kharif');
      setWaterAvailability('Abundant');
      setRainfallCondition('High');
    } else if (scenario === 'dryland') {
      setSelectedState('Rajasthan');
      setSelectedDistrict('Jodhpur');
      setSoilType('Sandy');
      setSeason('Kharif');
      setWaterAvailability('Limited');
      setRainfallCondition('Low');
    }

    // Automatically generate plan for preset
    const targetState = scenario === 'stressed' ? 'Karnataka' : scenario === 'normal' ? 'Uttar Pradesh' : scenario === 'high_rain' ? 'West Bengal' : 'Rajasthan';
    const targetDist = scenario === 'stressed' ? 'Kolar' : scenario === 'normal' ? 'Varanasi' : scenario === 'high_rain' ? 'Burdwan' : 'Jodhpur';
    const targetSoil = scenario === 'stressed' ? 'Red' : scenario === 'normal' ? 'Alluvial' : scenario === 'high_rain' ? 'Clay' : 'Sandy';
    const targetSeason = scenario === 'normal' ? 'Rabi' : 'Kharif';
    const targetWater = scenario === 'stressed' ? 'Stressed' : scenario === 'normal' ? 'Moderate' : scenario === 'high_rain' ? 'Abundant' : 'Limited';
    const targetRain = scenario === 'stressed' ? 'Low' : scenario === 'normal' ? 'Normal' : scenario === 'high_rain' ? 'High' : 'Low';

    const result = await cropService.evaluateCrops({
      soilType: targetSoil as SoilType,
      season: targetSeason as CropSeason,
      waterAvailability: targetWater as WaterAvailabilityLevel,
      rainfallCondition: targetRain as RainfallCondition,
      groundwaterTrend: scenario === 'stressed' ? 'falling' : 'stable',
      state: targetState,
      district: targetDist,
    });
    setRecommendations(result);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-8">
      {/* 0. Telemetry & AI Model Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-agri-600 animate-pulse" />
          <span className="font-extrabold text-stone-900">
            {t('JalKrishi Hydro-Agronomic Decision Engine')}
          </span>
          <span className="text-stone-400">&bull;</span>
          <span className="text-stone-500 font-medium">{t('Groundwater-Aligned Crop Sowing Optimizer')}</span>
        </div>

        <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
          <Radio className="h-3 w-3 text-agri-600" />
          {t('Demo Recommendation Engine')}
        </span>
      </div>

      {/* 1. Page Header */}
      <PageHeader
        title={
          isFarmer
            ? t('Smart Crop Advisor')
            : t('Agricultural Hydrology & Crop Water Intensity Intelligence')
        }
        subtitle={
          isFarmer
            ? t('Choose crops that match your soil, season, weather forecast, and available groundwater reserves to secure your harvest.')
            : t('Simulated agro-climatic water demand, crop water intensity matrix, and regional crop water balance analysis across Indian districts.')
        }
        farmerNote={
          isFarmer
            ? t('By checking water table trends before sowing, you can avoid high-water crops that risk drying out your tube-well before harvest.')
            : undefined
        }
        badge={
          <span className="rounded-full bg-agri-100 border border-agri-300 px-3 py-1 text-xs font-bold text-agri-900 flex items-center gap-1.5 shadow-xs">
            <Sprout className="h-3.5 w-3.5 text-agri-700" />
            {isFarmer ? t('Decision-Support v2.4') : t('Regional Agronomy Model')}
          </span>
        }
      />

      {locationNotice && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900 shadow-xs flex items-center justify-between animate-fadeIn">
          <span>{locationNotice}</span>
          <button
            onClick={() => setLocationNotice(null)}
            className="text-amber-700 hover:text-amber-950 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* The crop plan reads this same FarmContext used by Dashboard and Water Advisor - Farmer Only */}
      {isFarmer && (
        <section className="rounded-2xl border border-agri-200 bg-agri-50/60 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-3">
              <div className="rounded-xl bg-white p-2 text-agri-700 shadow-sm"><MapPin className="h-5 w-5" /></div>
              <div>
                <h2 className="font-bold text-stone-900">{t('Your saved Farm Water Profile')}</h2>
                {farmLocation ? (
                  <p className="mt-1 text-sm font-medium text-stone-700">
                    {resolvedLocation?.name || farmLocation}
                    {resolvedLocation?.state ? `, ${resolvedLocation.state}` : ''}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-stone-600">{t('Add your farm location below to personalise crop advice.')}</p>
                )}
                {profileSummary.length ? (
                  <p className="mt-2 text-xs text-stone-600">{profileSummary.join(' • ')}</p>
                ) : farmLocation ? (
                  <p className="mt-2 text-xs text-stone-600">{t('Water sources and reliability are not added yet. Complete the profile below for more relevant advice.')}</p>
                ) : null}
              </div>
            </div>
            {farmNearestStation && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-stone-700 shadow-sm">
                <Droplets className="h-3.5 w-3.5 text-water-700" />
                {t('Farm-area water evidence is included')}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. Interactive Farm Profile Input Form */}
      <FarmProfileForm
        states={statesList}
        districts={districtsList}
        selectedState={selectedState}
        onStateChange={setSelectedState}
        selectedDistrict={selectedDistrict}
        onDistrictChange={setSelectedDistrict}
        soilType={soilType}
        onSoilChange={setSoilType}
        season={season}
        onSeasonChange={setSeason}
        waterAvailability={waterAvailability}
        onWaterChange={setWaterAvailability}
        rainfallCondition={rainfallCondition}
        onRainfallChange={setRainfallCondition}
        nearbyStation={nearbyStation}
        onUseMyLocation={handleUseMyLocation}
        onApplyPresetScenario={handleApplyPresetScenario}
        onGeneratePlan={handleGenerateCropPlan}
        isGenerating={isGenerating}
      />

      {/* 2b. Personalized Farm Water-Source & Irrigation Profile - Farmer Only */}
      {isFarmer && (
        <FarmWaterProfileSection
          profile={farmWaterProfile}
          onSaveProfile={handleSaveFarmWaterProfile}
          jalkrishiGroundwaterStatus={
            nearbyStation?.status === 'critical'
              ? 'Critical Deficit'
              : nearbyStation?.status === 'warning'
              ? 'Declining'
              : nearbyStation?.status === 'moderate'
              ? 'Moderately Stressed'
              : 'Stable'
          }
          isGenerating={isGenerating}
        />
      )}

      {/* 3. Top 3 Recommended Crops */}
      {recommendations && (
        <TopCropRecommendations
          crops={recommendations.top3}
          onSelectCrop={(c) => {
            setSelectedCrop(c);
            updateFarmProfile({ crop: c.name });
          }}
          profile={farmWaterProfile}
        />
      )}

      {/* 4. Crops Not Recommended Under Selected Conditions */}
      {recommendations && (
        <NotRecommendedCrops
          crops={recommendations.notRecommended}
          onSelectCrop={(c) => setSelectedCrop(c)}
        />
      )}

      {/* 5. Compare Recommended Crops Side-by-Side */}
      {recommendations && recommendations.allRecommended.length > 0 && (
        <CropComparisonTable
          crops={recommendations.allRecommended}
          onSelectCrop={(c) => setSelectedCrop(c)}
        />
      )}

      {/* 6. Practical Water-Smart Farming Tips */}
      <WaterSmartFarmingAdvice />

      {/* 7. Methodology & Demonstration Disclaimer Note */}
      <CropMethodologyNote />

      {/* 8. Deep-Dive Crop Detail Modal */}
      {selectedCrop && (
        <CropDetailModal
          crop={selectedCrop}
          onClose={() => setSelectedCrop(null)}
          onNavigateToMap={() => {
            if (nearbyStation) onSelectStation(nearbyStation);
            navigate('/map');
          }}
          onNavigateToForecast={() => {
            if (nearbyStation) {
              onSelectStation(nearbyStation);
              navigate(`/forecast?stationId=${encodeURIComponent(nearbyStation.id)}`);
            } else {
              navigate('/forecast');
            }
          }}
        />
      )}
    </div>
  );
};
