import type {
  CropRecommendation,
  SoilType,
  CropSeason,
  WaterAvailabilityLevel,
  RainfallCondition,
  TrendDirection,
} from '../types';
import { mockCropDatabase } from '../data/mockCrops';
import { apiClient } from './apiClient';
import type { ApiCropRecommendationResponse } from '../types/api';

export interface CropEvaluationCriteria {
  soilType: SoilType;
  season: CropSeason;
  waterAvailability: WaterAvailabilityLevel;
  rainfallCondition: RainfallCondition;
  groundwaterTrend?: TrendDirection;
  state?: string;
  district?: string;
  stationId?: string;
  farmAreaAcres?: number;
  irrigationMethod?: string;
}

export interface CropRecommendationResult {
  top3: CropRecommendation[];
  allRecommended: CropRecommendation[];
  notRecommended: CropRecommendation[];
  criteria: CropEvaluationCriteria;
  scoringModelSummary: string;
  groundwaterContext?: {
    averageDepthMbgl: number;
    averageRiskScore: number;
    dominantTrend: string;
    criticalStationPercentage: number;
    forecastContext: string;
  };
}

export const cropService = {
  /**
   * Evaluates and scores all crops against given farm conditions.
   */
  async evaluateCrops(criteria: CropEvaluationCriteria): Promise<CropRecommendationResult> {
    try {
      const payload = {
        state: criteria.state || undefined,
        district: criteria.district || undefined,
        station_id: criteria.stationId || undefined,
        soil_type: criteria.soilType,
        season: criteria.season,
        rainfall_condition: criteria.rainfallCondition,
        water_availability: criteria.waterAvailability,
        farm_area_acres: criteria.farmAreaAcres && criteria.farmAreaAcres > 0 ? criteria.farmAreaAcres : undefined,
        irrigation_method: criteria.irrigationMethod || undefined,
      };

      const res = await apiClient.post<ApiCropRecommendationResponse>(
        '/crops/recommend',
        payload,
        { timeoutMs: 3500 }
      );

      if (res && res.top_recommendations && res.top_recommendations.length > 0) {
        const top3: CropRecommendation[] = res.top_recommendations.map((r) => {
          const base = mockCropDatabase.find((c) => c.id === r.crop_id) || mockCropDatabase[0];
          return {
            ...base,
            id: r.crop_id,
            name: r.crop_name,
            hindiName: r.local_name || base.hindiName,
            suitabilityScore: Math.round(r.overall_score),
            isRecommended: true,
            statusLabel: r.overall_score >= 80 ? 'Highly Recommended' : 'Moderately Suitable',
            waterRequirementMm: r.water_requirement_mm,
            bulletReasons: r.reasons && r.reasons.length > 0 ? r.reasons : base.bulletReasons,
            irrigationStrategy: r.farmer_advice || base.irrigationStrategy,
            groundwaterImpact: (r.aquifer_impact as any) || base.groundwaterImpact,
          };
        });

        const notRecommended: CropRecommendation[] = res.not_recommended.map((nr) => {
          const base = mockCropDatabase.find((c) => c.id === nr.crop_id) || mockCropDatabase[0];
          return {
            ...base,
            id: nr.crop_id,
            name: nr.crop_name,
            hindiName: nr.local_name || base.hindiName,
            suitabilityScore: Math.round(nr.overall_score),
            isRecommended: false,
            statusLabel: 'Not Recommended',
            waterRequirementMm: nr.water_requirement_mm,
            reason: nr.reason,
            warnings: [nr.farmer_warning],
            groundwaterImpact: (nr.aquifer_impact as any) || base.groundwaterImpact,
          };
        });

        return {
          top3,
          allRecommended: top3,
          notRecommended,
          criteria,
          scoringModelSummary: res.methodology,
          groundwaterContext: {
            averageDepthMbgl: res.groundwater_context.average_depth_mbgl,
            averageRiskScore: res.groundwater_context.average_risk_score,
            dominantTrend: res.groundwater_context.dominant_trend,
            criticalStationPercentage: res.groundwater_context.critical_station_percentage,
            forecastContext: res.groundwater_context.forecast_context,
          },
        };
      }
    } catch {
      // Backend offline -> fallback
    }

    // Local deterministic fallback logic
    const scoredCrops = mockCropDatabase.map((crop) => {
      let score = 0;
      const dynamicBulletReasons: string[] = [];
      const dynamicWarnings: string[] = [];

      // 1. Soil Suitability (25 points)
      if (crop.suitableSoils && crop.suitableSoils.includes(criteria.soilType)) {
        score += 25;
        dynamicBulletReasons.push(`Good match for ${criteria.soilType} soil conditions.`);
      } else if (criteria.soilType === 'Loamy' || criteria.soilType === 'Alluvial') {
        score += 18;
        dynamicBulletReasons.push(`Adaptable to fertile ${criteria.soilType} soil.`);
      } else {
        score += 8;
        dynamicWarnings.push(`Selected ${criteria.soilType} soil has lower natural suitability.`);
      }

      // 2. Water Availability Match (25 points)
      if (criteria.waterAvailability === 'Stressed') {
        if (crop.waterRequirement === 'Low') {
          score += 25;
          dynamicBulletReasons.push('Low water footprint protects stressed aquifer reserves.');
        } else if (crop.waterRequirement === 'Medium') {
          score += 12;
          dynamicWarnings.push('Moderate water demand requires careful deficit irrigation.');
        } else {
          score += 2;
          dynamicWarnings.push('High water requirement is not well matched with current water stress.');
        }
      } else if (criteria.waterAvailability === 'Limited') {
        if (crop.waterRequirement === 'Low') {
          score += 25;
          dynamicBulletReasons.push('Ideal fit for limited groundwater availability.');
        } else if (crop.waterRequirement === 'Medium') {
          score += 18;
          dynamicBulletReasons.push('Manageable water demand under sprinkler/drip irrigation.');
        } else {
          score += 6;
          dynamicWarnings.push('Heavy irrigation demand risks borewell failure before harvest.');
        }
      } else if (criteria.waterAvailability === 'Moderate') {
        if (crop.waterRequirement === 'Low' || crop.waterRequirement === 'Medium') {
          score += 25;
          dynamicBulletReasons.push('Optimal balance with moderate groundwater reserves.');
        } else if (crop.waterRequirement === 'High') {
          score += 14;
        } else {
          score += 8;
          dynamicWarnings.push('High water requirement increases local depletion pressure.');
        }
      } else {
        if (crop.waterRequirement === 'Low' || crop.waterRequirement === 'Medium') {
          score += 22;
        } else if (crop.waterRequirement === 'High') {
          score += 25;
          dynamicBulletReasons.push('Ample groundwater supports high-yield potential.');
        } else {
          score += 20;
        }
      }

      // 3. Season Suitability (15 points)
      if (crop.suitableSeasons && crop.suitableSeasons.includes(criteria.season)) {
        score += 15;
        dynamicBulletReasons.push(`Favorable ${criteria.season} sowing and growth temperature window.`);
      } else if (crop.season === 'Year-round') {
        score += 12;
      } else {
        score += 4;
        dynamicWarnings.push(`Selected ${criteria.season} season is outside standard sowing window.`);
      }

      // 4. Rainfall / Weather (15 points)
      if (criteria.rainfallCondition === 'Low') {
        if (crop.waterRequirement === 'Low') {
          score += 15;
          dynamicBulletReasons.push('Drought-resilient root system tolerates low rainfall.');
        } else {
          score += 5;
          dynamicWarnings.push('Expected rainfall is below crop preferred threshold.');
        }
      } else if (criteria.rainfallCondition === 'High') {
        if (crop.waterRequirement === 'Very High' || crop.waterRequirement === 'High') {
          score += 15;
          dynamicBulletReasons.push('High monsoon precipitation supports heavy water demand.');
        } else if (crop.id === 'crop-chickpea') {
          score += 8;
          dynamicWarnings.push('Excess monsoon humidity may induce root rot; ensure drainage.');
        } else {
          score += 14;
        }
      } else {
        score += 14;
        dynamicBulletReasons.push('Normal rainfall outlook supports healthy vegetative growth.');
      }

      // 5. Groundwater Depth & Trend (20 points)
      if (criteria.groundwaterTrend === 'falling') {
        if (crop.waterRequirement === 'Low') {
          score += 20;
          dynamicBulletReasons.push('Falling water table makes water-smart low extraction essential.');
        } else if (crop.waterRequirement === 'Medium') {
          score += 12;
        } else {
          score += 2;
          dynamicWarnings.push('Falling groundwater trend increases pumping failure risk.');
        }
      } else if (criteria.groundwaterTrend === 'rising') {
        score += 18;
        dynamicBulletReasons.push('Recharging aquifer provides favorable moisture buffer.');
      } else {
        score += 16;
      }

      const finalScore = Math.min(Math.max(score, 12), 98);
      const isRec = finalScore >= 60;

      let statusLabel: CropRecommendation['statusLabel'] = 'Moderately Suitable';
      if (finalScore >= 80) statusLabel = 'Highly Recommended';
      else if (finalScore >= 60) statusLabel = 'Moderately Suitable';
      else if (finalScore >= 40) statusLabel = 'High Risk';
      else statusLabel = 'Not Recommended';

      return {
        ...crop,
        suitabilityScore: finalScore,
        isRecommended: isRec,
        statusLabel,
        bulletReasons: dynamicBulletReasons.length > 0 ? dynamicBulletReasons : crop.bulletReasons,
        warnings: dynamicWarnings.length > 0 ? dynamicWarnings : crop.warnings,
      };
    });

    const sorted = [...scoredCrops].sort((a, b) => b.suitabilityScore - a.suitabilityScore);
    const allRecommended = sorted.filter((c) => c.isRecommended);
    const notRecommended = sorted.filter((c) => !c.isRecommended);
    const top3 = allRecommended.slice(0, 3);

    return {
      top3,
      allRecommended,
      notRecommended,
      criteria,
      scoringModelSummary:
        'Weighted Multi-Factor Model: Soil (25%), Water Availability (25%), Season (15%), Rainfall (15%), Groundwater Level & Trend (20%).',
    };
  },

  async getCropDetails(cropId: string): Promise<CropRecommendation | undefined> {
    const crop = mockCropDatabase.find((c) => c.id === cropId);
    return crop;
  },
};
