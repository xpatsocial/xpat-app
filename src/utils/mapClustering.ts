import { Region } from 'react-native-maps';
import { Spot } from '../types';

export interface Cluster {
  id: string;
  coordinate: { latitude: number; longitude: number };
  spots: Spot[];
}

/**
 * Simple grid-based map clustering.
 * Divides the visible region into grid cells and groups spots that fall
 * into the same cell. When a cell has only one spot, it passes through
 * as a single marker. Runs in O(n) time.
 *
 * @param spots - array of spots with lat/lng
 * @param region - the current visible map region
 * @param gridSize - number of grid divisions along each axis (default 8)
 */
export function clusterSpots(
  spots: Spot[],
  region: Region,
  gridSize: number = 12,
): Cluster[] {
  if (!region || spots.length === 0) return [];

  const cellWidth = region.longitudeDelta / gridSize;
  const cellHeight = region.latitudeDelta / gridSize;

  // Avoid division by zero at extreme zoom
  if (cellWidth === 0 || cellHeight === 0) {
    return spots.map((s) => ({
      id: `single-${s.id}`,
      coordinate: { latitude: s.lat, longitude: s.lng },
      spots: [s],
    }));
  }

  const minLat = region.latitude - region.latitudeDelta / 2;
  const minLng = region.longitude - region.longitudeDelta / 2;

  const buckets: Record<string, Spot[]> = {};

  for (const spot of spots) {
    const col = Math.floor((spot.lng - minLng) / cellWidth);
    const row = Math.floor((spot.lat - minLat) / cellHeight);
    const key = `${row}_${col}`;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(spot);
  }

  return Object.entries(buckets).map(([key, group]) => {
    const avgLat = group.reduce((sum, s) => sum + s.lat, 0) / group.length;
    const avgLng = group.reduce((sum, s) => sum + s.lng, 0) / group.length;
    return {
      id: `cluster-${key}`,
      coordinate: { latitude: avgLat, longitude: avgLng },
      spots: group,
    };
  });
}
