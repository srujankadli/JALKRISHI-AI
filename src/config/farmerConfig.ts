/**
 * JalKrishi AI — Farmer Experience & Hydrogeological Spatial Configuration
 * ------------------------------------------------------------------------
 * Scientifically grounded spatial thresholds and farmer experience configuration.
 *
 * Hydrogeological Grounding:
 * - Direct DWLR observation threshold is set at <= 15.0 km, matching the hydrogeological
 *   correlation radius for local alluvial and fractured hard-rock aquifer formations.
 * - Nearby evidence radius is configurable (default 35.0 km). Telemetry wells within
 *   this radius are presented as "Nearby Evidence" (with exact geodesic distance in km),
 *   not as direct borehole measurements of the farmer's own property.
 * - Beyond this radius, the platform transparently activates Satellite-Assisted
 *   Regional Estimation with explicit provenance disclosures.
 */

export const FARMER_CONFIG = {
  /**
   * Scientifically justified maximum radius (in km) for direct DWLR observation confidence.
   * Based on CGWB telemetry correlation radius.
   */
  DIRECT_DWLR_RADIUS_KM: 15.0,

  /**
   * Configurable upper distance threshold (in km) for displaying nearby telemetry stations
   * as regional groundwater evidence.
   */
  NEARBY_EVIDENCE_RADIUS_KM: 35.0,

  /**
   * Maximum number of nearby monitoring wells shown to the farmer in "My Farm" view
   * to avoid information overload while maintaining local spatial context.
   */
  MAX_NEARBY_STATIONS_DISPLAY: 3,

  /**
   * Unified localStorage storage keys across the application to maintain a single source of truth.
   */
  STORAGE_KEYS: {
    FARM_LOCATION: 'jalkrishi_selected_location',
    FARM_PROFILE: 'jalkrishi_crop_farm_water_profile',
    EXPERIENCE_MODE: 'jalkrishi_experience_mode',
  },
} as const;
