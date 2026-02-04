// =============================================================================
// GEORGIA TRANSIT DATA (Static GTFS-based Data)
// =============================================================================
// Pre-downloaded transit stop data from Georgia transit agencies
// Primary source: MARTA (Metropolitan Atlanta Rapid Transit Authority)
// Also includes: CobbLinc, GCT (Gwinnett), GRTA Xpress, Athens Transit
// =============================================================================

export const DATA_SOURCE = 'GTFS Static Feeds (MARTA, CobbLinc, GCT, GRTA)';
export const DATA_YEAR = 2024;

export type TransitType = 'rail' | 'bus' | 'streetcar';

export interface TransitStop {
  id: string;
  name: string;
  type: TransitType;
  agency: string;
  lat: number;
  lng: number;
  routes?: string[];
}

// =============================================================================
// MARTA RAIL STATIONS (Heavy Rail - Red, Gold, Blue, Green Lines)
// =============================================================================
export const MARTA_RAIL_STATIONS: TransitStop[] = [
  // Red Line (North-South)
  { id: 'marta-n1', name: 'North Springs', type: 'rail', agency: 'MARTA', lat: 33.9455, lng: -84.3571, routes: ['Red'] },
  { id: 'marta-n2', name: 'Sandy Springs', type: 'rail', agency: 'MARTA', lat: 33.9321, lng: -84.3513, routes: ['Red'] },
  { id: 'marta-n3', name: 'Dunwoody', type: 'rail', agency: 'MARTA', lat: 33.9217, lng: -84.3446, routes: ['Red'] },
  { id: 'marta-n4', name: 'Medical Center', type: 'rail', agency: 'MARTA', lat: 33.9108, lng: -84.3513, routes: ['Red'] },
  { id: 'marta-n5', name: 'Buckhead', type: 'rail', agency: 'MARTA', lat: 33.8476, lng: -84.3676, routes: ['Red'] },
  { id: 'marta-n6', name: 'Lindbergh Center', type: 'rail', agency: 'MARTA', lat: 33.8230, lng: -84.3694, routes: ['Red', 'Gold'] },
  { id: 'marta-n7', name: 'Arts Center', type: 'rail', agency: 'MARTA', lat: 33.7893, lng: -84.3875, routes: ['Red', 'Gold'] },
  { id: 'marta-n8', name: 'Midtown', type: 'rail', agency: 'MARTA', lat: 33.7808, lng: -84.3865, routes: ['Red', 'Gold'] },
  { id: 'marta-n9', name: 'North Avenue', type: 'rail', agency: 'MARTA', lat: 33.7717, lng: -84.3867, routes: ['Red', 'Gold'] },
  { id: 'marta-n10', name: 'Civic Center', type: 'rail', agency: 'MARTA', lat: 33.7664, lng: -84.3874, routes: ['Red', 'Gold'] },
  { id: 'marta-n11', name: 'Peachtree Center', type: 'rail', agency: 'MARTA', lat: 33.7590, lng: -84.3876, routes: ['Red', 'Gold'] },
  { id: 'marta-n12', name: 'Five Points', type: 'rail', agency: 'MARTA', lat: 33.7540, lng: -84.3917, routes: ['Red', 'Gold', 'Blue', 'Green'] },
  { id: 'marta-s1', name: 'Garnett', type: 'rail', agency: 'MARTA', lat: 33.7481, lng: -84.3956, routes: ['Red', 'Gold'] },
  { id: 'marta-s2', name: 'West End', type: 'rail', agency: 'MARTA', lat: 33.7357, lng: -84.4128, routes: ['Red', 'Gold'] },
  { id: 'marta-s3', name: 'Oakland City', type: 'rail', agency: 'MARTA', lat: 33.7174, lng: -84.4252, routes: ['Red', 'Gold'] },
  { id: 'marta-s4', name: 'Lakewood/Ft. McPherson', type: 'rail', agency: 'MARTA', lat: 33.7003, lng: -84.4286, routes: ['Red', 'Gold'] },
  { id: 'marta-s5', name: 'East Point', type: 'rail', agency: 'MARTA', lat: 33.6768, lng: -84.4407, routes: ['Red', 'Gold'] },
  { id: 'marta-s6', name: 'College Park', type: 'rail', agency: 'MARTA', lat: 33.6513, lng: -84.4486, routes: ['Red', 'Gold'] },
  { id: 'marta-s7', name: 'Airport', type: 'rail', agency: 'MARTA', lat: 33.6397, lng: -84.4462, routes: ['Red', 'Gold'] },

  // Gold Line (Northeast extension)
  { id: 'marta-ne1', name: 'Lenox', type: 'rail', agency: 'MARTA', lat: 33.8450, lng: -84.3576, routes: ['Gold'] },
  { id: 'marta-ne2', name: 'Brookhaven/Oglethorpe', type: 'rail', agency: 'MARTA', lat: 33.8598, lng: -84.3390, routes: ['Gold'] },
  { id: 'marta-ne3', name: 'Chamblee', type: 'rail', agency: 'MARTA', lat: 33.8879, lng: -84.3068, routes: ['Gold'] },
  { id: 'marta-ne4', name: 'Doraville', type: 'rail', agency: 'MARTA', lat: 33.9026, lng: -84.2804, routes: ['Gold'] },

  // Blue Line (East-West)
  { id: 'marta-e1', name: 'Georgia State', type: 'rail', agency: 'MARTA', lat: 33.7490, lng: -84.3856, routes: ['Blue', 'Green'] },
  { id: 'marta-e2', name: 'King Memorial', type: 'rail', agency: 'MARTA', lat: 33.7490, lng: -84.3760, routes: ['Blue', 'Green'] },
  { id: 'marta-e3', name: 'Inman Park/Reynoldstown', type: 'rail', agency: 'MARTA', lat: 33.7570, lng: -84.3526, routes: ['Blue', 'Green'] },
  { id: 'marta-e4', name: 'Edgewood/Candler Park', type: 'rail', agency: 'MARTA', lat: 33.7617, lng: -84.3400, routes: ['Blue', 'Green'] },
  { id: 'marta-e5', name: 'East Lake', type: 'rail', agency: 'MARTA', lat: 33.7651, lng: -84.3133, routes: ['Blue'] },
  { id: 'marta-e6', name: 'Decatur', type: 'rail', agency: 'MARTA', lat: 33.7748, lng: -84.2975, routes: ['Blue'] },
  { id: 'marta-e7', name: 'Avondale', type: 'rail', agency: 'MARTA', lat: 33.7754, lng: -84.2806, routes: ['Blue'] },
  { id: 'marta-e8', name: 'Kensington', type: 'rail', agency: 'MARTA', lat: 33.7722, lng: -84.2523, routes: ['Blue'] },
  { id: 'marta-e9', name: 'Indian Creek', type: 'rail', agency: 'MARTA', lat: 33.7691, lng: -84.2292, routes: ['Blue'] },

  // Green Line (Bankhead extension)
  { id: 'marta-w1', name: 'Dome/GWCC/Philips Arena/CNN Center', type: 'rail', agency: 'MARTA', lat: 33.7580, lng: -84.3963, routes: ['Green', 'Blue'] },
  { id: 'marta-w2', name: 'Vine City', type: 'rail', agency: 'MARTA', lat: 33.7565, lng: -84.4043, routes: ['Green'] },
  { id: 'marta-w3', name: 'Ashby', type: 'rail', agency: 'MARTA', lat: 33.7560, lng: -84.4170, routes: ['Green'] },
  { id: 'marta-w4', name: 'West Lake', type: 'rail', agency: 'MARTA', lat: 33.7533, lng: -84.4451, routes: ['Green'] },
  { id: 'marta-w5', name: 'Hamilton E. Holmes', type: 'rail', agency: 'MARTA', lat: 33.7545, lng: -84.4696, routes: ['Green'] },
  { id: 'marta-w6', name: 'Bankhead', type: 'rail', agency: 'MARTA', lat: 33.7723, lng: -84.4289, routes: ['Green'] },
];

// =============================================================================
// ATLANTA STREETCAR STOPS
// =============================================================================
export const ATLANTA_STREETCAR_STOPS: TransitStop[] = [
  { id: 'atl-sc-1', name: 'Centennial Olympic Park', type: 'streetcar', agency: 'Atlanta Streetcar', lat: 33.7622, lng: -84.3926 },
  { id: 'atl-sc-2', name: 'Peachtree Center', type: 'streetcar', agency: 'Atlanta Streetcar', lat: 33.7584, lng: -84.3858 },
  { id: 'atl-sc-3', name: 'Park Place', type: 'streetcar', agency: 'Atlanta Streetcar', lat: 33.7549, lng: -84.3843 },
  { id: 'atl-sc-4', name: 'Woodruff Park', type: 'streetcar', agency: 'Atlanta Streetcar', lat: 33.7541, lng: -84.3872 },
  { id: 'atl-sc-5', name: 'Hurt Park', type: 'streetcar', agency: 'Atlanta Streetcar', lat: 33.7525, lng: -84.3829 },
  { id: 'atl-sc-6', name: 'King Historic District', type: 'streetcar', agency: 'Atlanta Streetcar', lat: 33.7512, lng: -84.3747 },
  { id: 'atl-sc-7', name: 'Edgewood-Auburn', type: 'streetcar', agency: 'Atlanta Streetcar', lat: 33.7539, lng: -84.3711 },
  { id: 'atl-sc-8', name: 'Auburn Avenue', type: 'streetcar', agency: 'Atlanta Streetcar', lat: 33.7572, lng: -84.3773 },
  { id: 'atl-sc-9', name: 'Sweet Auburn Market', type: 'streetcar', agency: 'Atlanta Streetcar', lat: 33.7535, lng: -84.3783 },
  { id: 'atl-sc-10', name: 'Georgia State', type: 'streetcar', agency: 'Atlanta Streetcar', lat: 33.7508, lng: -84.3849 },
  { id: 'atl-sc-11', name: 'Dobbs Plaza', type: 'streetcar', agency: 'Atlanta Streetcar', lat: 33.7484, lng: -84.3885 },
  { id: 'atl-sc-12', name: 'Carnegie at Spring', type: 'streetcar', agency: 'Atlanta Streetcar', lat: 33.7533, lng: -84.3910 },
];

// =============================================================================
// MAJOR BUS TRANSIT CENTERS (High-frequency hubs)
// =============================================================================
export const MAJOR_BUS_HUBS: TransitStop[] = [
  // MARTA Bus Transit Centers
  { id: 'marta-bus-1', name: 'Hamilton E. Holmes Bus Bay', type: 'bus', agency: 'MARTA', lat: 33.7545, lng: -84.4696 },
  { id: 'marta-bus-2', name: 'North Springs Bus Bay', type: 'bus', agency: 'MARTA', lat: 33.9455, lng: -84.3571 },
  { id: 'marta-bus-3', name: 'Dunwoody Bus Bay', type: 'bus', agency: 'MARTA', lat: 33.9217, lng: -84.3446 },
  { id: 'marta-bus-4', name: 'Lindbergh Bus Bay', type: 'bus', agency: 'MARTA', lat: 33.8230, lng: -84.3694 },
  { id: 'marta-bus-5', name: 'Five Points Bus Bay', type: 'bus', agency: 'MARTA', lat: 33.7540, lng: -84.3917 },
  { id: 'marta-bus-6', name: 'Indian Creek Bus Bay', type: 'bus', agency: 'MARTA', lat: 33.7691, lng: -84.2292 },
  { id: 'marta-bus-7', name: 'Decatur Bus Bay', type: 'bus', agency: 'MARTA', lat: 33.7748, lng: -84.2975 },
  { id: 'marta-bus-8', name: 'College Park Bus Bay', type: 'bus', agency: 'MARTA', lat: 33.6513, lng: -84.4486 },

  // CobbLinc Transit Centers
  { id: 'cobb-1', name: 'Marietta Transfer Center', type: 'bus', agency: 'CobbLinc', lat: 33.9526, lng: -84.5496 },
  { id: 'cobb-2', name: 'Cumberland Transfer Center', type: 'bus', agency: 'CobbLinc', lat: 33.8839, lng: -84.4673 },
  { id: 'cobb-3', name: 'Town Center at Cobb', type: 'bus', agency: 'CobbLinc', lat: 34.0186, lng: -84.5657 },
  { id: 'cobb-4', name: 'Acworth Park & Ride', type: 'bus', agency: 'CobbLinc', lat: 34.0659, lng: -84.6768 },
  { id: 'cobb-5', name: 'Smyrna Community Center', type: 'bus', agency: 'CobbLinc', lat: 33.8634, lng: -84.5144 },

  // Gwinnett County Transit (GCT)
  { id: 'gct-1', name: 'Gwinnett Place Transit Center', type: 'bus', agency: 'GCT', lat: 33.9309, lng: -84.0697 },
  { id: 'gct-2', name: 'Sugarloaf Mills Park & Ride', type: 'bus', agency: 'GCT', lat: 33.9815, lng: -84.0925 },
  { id: 'gct-3', name: 'Indian Trail Park & Ride', type: 'bus', agency: 'GCT', lat: 33.8979, lng: -84.0339 },
  { id: 'gct-4', name: 'Snellville Park & Ride', type: 'bus', agency: 'GCT', lat: 33.8573, lng: -84.0199 },
  { id: 'gct-5', name: 'Lawrenceville Transit Center', type: 'bus', agency: 'GCT', lat: 33.9562, lng: -83.9880 },
  { id: 'gct-6', name: 'Duluth Park & Ride', type: 'bus', agency: 'GCT', lat: 34.0054, lng: -84.1457 },

  // GRTA Xpress (Regional commuter buses)
  { id: 'grta-1', name: 'Downtown Connector Park & Ride', type: 'bus', agency: 'GRTA Xpress', lat: 33.7590, lng: -84.3876 },
  { id: 'grta-2', name: 'North Point Park & Ride', type: 'bus', agency: 'GRTA Xpress', lat: 34.0557, lng: -84.2199 },
  { id: 'grta-3', name: 'Discover Mills Park & Ride', type: 'bus', agency: 'GRTA Xpress', lat: 33.9815, lng: -84.0925 },

  // Athens Transit
  { id: 'athens-1', name: 'Athens Transit Hub', type: 'bus', agency: 'Athens Transit', lat: 33.9519, lng: -83.3576 },
  { id: 'athens-2', name: 'UGA Campus Transit Hub', type: 'bus', agency: 'Athens Transit', lat: 33.9480, lng: -83.3773 },

  // Augusta Transit
  { id: 'augusta-1', name: 'Augusta Transit Center', type: 'bus', agency: 'Augusta Transit', lat: 33.4735, lng: -81.9748 },

  // Savannah Transit (CAT)
  { id: 'cat-1', name: 'Savannah Intermodal Transit Center', type: 'bus', agency: 'CAT', lat: 32.0835, lng: -81.0998 },
  { id: 'cat-2', name: 'Savannah Mall Transit Center', type: 'bus', agency: 'CAT', lat: 31.9971, lng: -81.1069 },

  // Macon Transit (MTA)
  { id: 'mta-1', name: 'Macon Transit Terminal', type: 'bus', agency: 'Macon Transit', lat: 32.8407, lng: -83.6324 },

  // Columbus Transit (METRA)
  { id: 'metra-1', name: 'Columbus Transit Center', type: 'bus', agency: 'METRA', lat: 32.4609, lng: -84.9877 },
];

// =============================================================================
// ALL TRANSIT STOPS COMBINED
// =============================================================================
export const ALL_TRANSIT_STOPS: TransitStop[] = [
  ...MARTA_RAIL_STATIONS,
  ...ATLANTA_STREETCAR_STOPS,
  ...MAJOR_BUS_HUBS,
];

// =============================================================================
// LOOKUP HELPERS
// =============================================================================

/**
 * Find transit stops within a radius of given coordinates
 */
export function findTransitStopsNearby(
  lat: number,
  lng: number,
  radiusMiles: number = 1
): TransitStop[] {
  return ALL_TRANSIT_STOPS.filter(stop => {
    const distance = calculateDistance(lat, lng, stop.lat, stop.lng);
    return distance <= radiusMiles;
  }).sort((a, b) => {
    const distA = calculateDistance(lat, lng, a.lat, a.lng);
    const distB = calculateDistance(lat, lng, b.lat, b.lng);
    return distA - distB;
  });
}

/**
 * Find the nearest transit stop to given coordinates
 */
export function findNearestTransitStop(lat: number, lng: number): { stop: TransitStop; distance: number } | null {
  if (ALL_TRANSIT_STOPS.length === 0) return null;

  let nearest: TransitStop = ALL_TRANSIT_STOPS[0];
  let minDistance = calculateDistance(lat, lng, nearest.lat, nearest.lng);

  for (const stop of ALL_TRANSIT_STOPS) {
    const distance = calculateDistance(lat, lng, stop.lat, stop.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = stop;
    }
  }

  return { stop: nearest, distance: minDistance };
}

/**
 * Find nearest rail station (MARTA rail or streetcar)
 */
export function findNearestRailStation(lat: number, lng: number): { stop: TransitStop; distance: number } | null {
  const railStops = ALL_TRANSIT_STOPS.filter(s => s.type === 'rail' || s.type === 'streetcar');
  if (railStops.length === 0) return null;

  let nearest = railStops[0];
  let minDistance = calculateDistance(lat, lng, nearest.lat, nearest.lng);

  for (const stop of railStops) {
    const distance = calculateDistance(lat, lng, stop.lat, stop.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = stop;
    }
  }

  return { stop: nearest, distance: minDistance };
}

/**
 * Count transit stops by type within radius
 */
export function countTransitByType(
  lat: number,
  lng: number,
  radiusMiles: number = 1
): { rail: number; bus: number; streetcar: number; total: number } {
  const nearby = findTransitStopsNearby(lat, lng, radiusMiles);
  return {
    rail: nearby.filter(s => s.type === 'rail').length,
    bus: nearby.filter(s => s.type === 'bus').length,
    streetcar: nearby.filter(s => s.type === 'streetcar').length,
    total: nearby.length,
  };
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Distance in miles, 2 decimals
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default {
  ALL_TRANSIT_STOPS,
  MARTA_RAIL_STATIONS,
  ATLANTA_STREETCAR_STOPS,
  MAJOR_BUS_HUBS,
  findTransitStopsNearby,
  findNearestTransitStop,
  findNearestRailStation,
  countTransitByType,
  DATA_SOURCE,
  DATA_YEAR,
};
