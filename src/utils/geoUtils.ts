import type { DWLRStation } from '../types';

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @returns Distance in kilometers (km)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Finds the closest DWLR monitoring well to a given geographic coordinate.
 */
export function findNearestStation(
  userLat: number,
  userLon: number,
  stations: DWLRStation[]
): { station: DWLRStation; distanceKm: number } | null {
  if (!stations || stations.length === 0) return null;

  let closestStation: DWLRStation = stations[0];
  let minDistance = calculateDistanceKm(userLat, userLon, stations[0].latitude, stations[0].longitude);

  for (let i = 1; i < stations.length; i++) {
    const dist = calculateDistanceKm(userLat, userLon, stations[i].latitude, stations[i].longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closestStation = stations[i];
    }
  }

  return {
    station: closestStation,
    distanceKm: minDistance,
  };
}

/**
 * State boundaries and center points for smooth pan-to-state animations.
 */
export const STATE_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  'All India': { lat: 22.5937, lng: 78.9629, zoom: 5 },
  'Punjab': { lat: 31.1471, lng: 75.3412, zoom: 8 },
  'Rajasthan': { lat: 27.0238, lng: 74.2179, zoom: 7 },
  'Maharashtra': { lat: 19.7515, lng: 75.7139, zoom: 7 },
  'Karnataka': { lat: 15.3173, lng: 75.7139, zoom: 7 },
  'Uttar Pradesh': { lat: 26.8467, lng: 80.9462, zoom: 7 },
  'Gujarat': { lat: 22.2587, lng: 71.1924, zoom: 7 },
  'Haryana': { lat: 29.0588, lng: 76.0856, zoom: 8 },
  'Tamil Nadu': { lat: 11.1271, lng: 78.6569, zoom: 7 },
  'Madhya Pradesh': { lat: 22.9734, lng: 78.6569, zoom: 7 },
  'Andhra Pradesh': { lat: 15.9129, lng: 79.7400, zoom: 7 },
  'Telangana': { lat: 18.1124, lng: 79.0193, zoom: 8 },
  'Bihar': { lat: 25.0961, lng: 85.3131, zoom: 8 },
  'West Bengal': { lat: 22.9868, lng: 87.8550, zoom: 8 },
  'Odisha': { lat: 20.9517, lng: 85.0985, zoom: 7 },
  'Kerala': { lat: 10.8505, lng: 76.2711, zoom: 8 },
  'Assam': { lat: 26.2006, lng: 92.9376, zoom: 7 },
  'Jharkhand': { lat: 23.6102, lng: 85.2799, zoom: 8 },
  'Chhattisgarh': { lat: 21.2787, lng: 81.8661, zoom: 7 },
};
