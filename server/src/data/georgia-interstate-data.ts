// =============================================================================
// GEORGIA INTERSTATE HIGHWAY DATA (Static Coordinates)
// =============================================================================
// Pre-compiled coordinate points along major Georgia interstates
// Used for calculating distance to nearest interstate access
// Source: GDOT, Census TIGER/Line
// =============================================================================

export const DATA_SOURCE = 'GDOT / Census TIGER/Line';
export const DATA_YEAR = 2024;

export interface InterstatePoint {
  lat: number;
  lng: number;
}

export interface Interstate {
  name: string;
  displayName: string;
  description: string;
  points: InterstatePoint[];
}

// =============================================================================
// INTERSTATE ROUTE DATA
// Key coordinate points sampled along each interstate for distance calculation
// =============================================================================

export const GEORGIA_INTERSTATES: Interstate[] = [
  // -------------------------------------------------------------------------
  // I-75: Major North-South Interstate (Florida border to Tennessee border)
  // -------------------------------------------------------------------------
  {
    name: 'I-75',
    displayName: 'Interstate 75',
    description: 'Major north-south interstate through Atlanta to Florida/Tennessee',
    points: [
      // Florida border north
      { lat: 30.7108, lng: -83.5975 }, // Valdosta
      { lat: 31.0387, lng: -83.5080 },
      { lat: 31.2154, lng: -83.4366 }, // Tifton
      { lat: 31.5339, lng: -83.4016 },
      { lat: 31.8466, lng: -83.5597 }, // Cordele
      { lat: 32.0709, lng: -83.6466 },
      { lat: 32.3095, lng: -83.7153 }, // Perry
      { lat: 32.5604, lng: -83.7084 },
      { lat: 32.8407, lng: -83.6324 }, // Macon
      { lat: 33.0454, lng: -83.6753 },
      { lat: 33.2412, lng: -83.8248 }, // Forsyth
      { lat: 33.4018, lng: -84.1233 }, // Locust Grove
      { lat: 33.5021, lng: -84.2396 }, // McDonough
      { lat: 33.6045, lng: -84.3330 },
      { lat: 33.6468, lng: -84.3918 }, // Forest Park
      { lat: 33.7490, lng: -84.3880 }, // Downtown Atlanta
      { lat: 33.8476, lng: -84.3676 }, // Buckhead
      { lat: 33.9321, lng: -84.3513 }, // Sandy Springs
      { lat: 33.9762, lng: -84.3500 },
      { lat: 34.0555, lng: -84.4546 }, // Marietta
      { lat: 34.1542, lng: -84.5110 }, // Kennesaw
      { lat: 34.2554, lng: -84.5037 }, // Cartersville
      { lat: 34.3824, lng: -84.7933 }, // Adairsville
      { lat: 34.4740, lng: -84.9296 }, // Calhoun
      { lat: 34.6136, lng: -85.0058 }, // Resaca
      { lat: 34.7879, lng: -84.9697 }, // Dalton
      { lat: 34.8784, lng: -85.0525 },
      { lat: 34.9728, lng: -85.1368 }, // Ringgold (TN border)
    ],
  },

  // -------------------------------------------------------------------------
  // I-85: Northeast-Southwest Interstate (Alabama border to South Carolina border)
  // -------------------------------------------------------------------------
  {
    name: 'I-85',
    displayName: 'Interstate 85',
    description: 'Northeast-southwest interstate through Atlanta to Alabama/South Carolina',
    points: [
      // Alabama border northeast
      { lat: 32.8468, lng: -85.1844 }, // West Point
      { lat: 32.9618, lng: -85.0363 }, // LaGrange
      { lat: 33.1207, lng: -84.8387 },
      { lat: 33.2428, lng: -84.7243 }, // Newnan area
      { lat: 33.3539, lng: -84.6070 },
      { lat: 33.4466, lng: -84.5086 }, // Fairburn
      { lat: 33.5563, lng: -84.3695 }, // Union City
      { lat: 33.6468, lng: -84.3918 }, // Airport area (merge with I-75)
      { lat: 33.7490, lng: -84.3880 }, // Downtown Atlanta
      { lat: 33.7935, lng: -84.3863 },
      { lat: 33.8476, lng: -84.3676 }, // Buckhead
      { lat: 33.8879, lng: -84.3068 }, // Chamblee
      { lat: 33.9261, lng: -84.2066 }, // Norcross
      { lat: 33.9680, lng: -84.1093 }, // Jimmy Carter Blvd
      { lat: 34.0054, lng: -84.0046 }, // Suwanee
      { lat: 34.0591, lng: -83.9150 }, // Buford
      { lat: 34.1147, lng: -83.7746 }, // Flowery Branch
      { lat: 34.1842, lng: -83.6449 }, // Gainesville
      { lat: 34.2617, lng: -83.5084 },
      { lat: 34.3432, lng: -83.3624 }, // Commerce
      { lat: 34.4239, lng: -83.2104 },
      { lat: 34.5021, lng: -83.0578 }, // Lavonia
      { lat: 34.5668, lng: -82.9482 }, // SC border
    ],
  },

  // -------------------------------------------------------------------------
  // I-20: East-West Interstate (Alabama border to South Carolina border)
  // -------------------------------------------------------------------------
  {
    name: 'I-20',
    displayName: 'Interstate 20',
    description: 'East-west interstate through Atlanta to Alabama/South Carolina',
    points: [
      // Alabama border east
      { lat: 33.5866, lng: -85.0766 }, // AL border
      { lat: 33.5762, lng: -84.9422 },
      { lat: 33.5630, lng: -84.7847 }, // Carrollton area
      { lat: 33.5763, lng: -84.6144 },
      { lat: 33.6149, lng: -84.4943 }, // Austell
      { lat: 33.7037, lng: -84.4446 },
      { lat: 33.7490, lng: -84.3880 }, // Downtown Atlanta
      { lat: 33.7570, lng: -84.3526 }, // Inman Park
      { lat: 33.7748, lng: -84.2975 }, // Decatur
      { lat: 33.7905, lng: -84.2128 }, // Lithonia
      { lat: 33.7878, lng: -84.0667 }, // Conyers
      { lat: 33.7789, lng: -83.9058 },
      { lat: 33.7540, lng: -83.7461 }, // Social Circle
      { lat: 33.7119, lng: -83.5581 }, // Madison
      { lat: 33.6143, lng: -83.2988 },
      { lat: 33.5710, lng: -83.0929 }, // Greensboro
      { lat: 33.4773, lng: -82.7873 },
      { lat: 33.4735, lng: -82.5350 }, // Thomson
      { lat: 33.4735, lng: -82.2396 },
      { lat: 33.4735, lng: -81.9748 }, // Augusta
      { lat: 33.5010, lng: -81.8500 }, // SC border
    ],
  },

  // -------------------------------------------------------------------------
  // I-285: Atlanta Perimeter Highway
  // -------------------------------------------------------------------------
  {
    name: 'I-285',
    displayName: 'Interstate 285 (Perimeter)',
    description: 'Atlanta perimeter beltway',
    points: [
      // Clockwise from north (I-85 interchange)
      { lat: 33.9152, lng: -84.2563 },
      { lat: 33.9044, lng: -84.1767 },
      { lat: 33.8772, lng: -84.1128 },
      { lat: 33.8407, lng: -84.0687 },
      { lat: 33.7892, lng: -84.0625 },
      { lat: 33.7354, lng: -84.0892 },
      { lat: 33.6878, lng: -84.1356 },
      { lat: 33.6513, lng: -84.2042 },
      { lat: 33.6287, lng: -84.2858 },
      { lat: 33.6287, lng: -84.3683 },
      { lat: 33.6390, lng: -84.4394 },
      { lat: 33.6748, lng: -84.4953 },
      { lat: 33.7309, lng: -84.5355 },
      { lat: 33.7892, lng: -84.5519 },
      { lat: 33.8455, lng: -84.5355 },
      { lat: 33.8958, lng: -84.4788 },
      { lat: 33.9321, lng: -84.4066 },
      { lat: 33.9455, lng: -84.3241 },
      { lat: 33.9321, lng: -84.2728 },
    ],
  },

  // -------------------------------------------------------------------------
  // I-95: Coastal Interstate (Florida border to South Carolina border)
  // -------------------------------------------------------------------------
  {
    name: 'I-95',
    displayName: 'Interstate 95',
    description: 'Coastal interstate through Savannah to Florida/South Carolina',
    points: [
      // Florida border north
      { lat: 30.7134, lng: -81.8005 }, // FL border
      { lat: 30.8020, lng: -81.7175 },
      { lat: 30.9044, lng: -81.6413 }, // Kingsland
      { lat: 31.0387, lng: -81.5992 },
      { lat: 31.1715, lng: -81.4919 }, // Brunswick area
      { lat: 31.3132, lng: -81.4164 },
      { lat: 31.4693, lng: -81.3760 },
      { lat: 31.6254, lng: -81.3357 },
      { lat: 31.7815, lng: -81.2505 }, // Midway
      { lat: 31.9376, lng: -81.1654 },
      { lat: 32.0835, lng: -81.0998 }, // Savannah
      { lat: 32.2396, lng: -81.1654 },
      { lat: 32.3173, lng: -81.1490 }, // SC border
    ],
  },

  // -------------------------------------------------------------------------
  // I-185: Columbus Spur
  // -------------------------------------------------------------------------
  {
    name: 'I-185',
    displayName: 'Interstate 185',
    description: 'Columbus spur from I-85',
    points: [
      { lat: 32.8468, lng: -85.1844 }, // I-85 junction
      { lat: 32.7287, lng: -85.0566 },
      { lat: 32.6107, lng: -84.9677 },
      { lat: 32.4609, lng: -84.9877 }, // Columbus
    ],
  },

  // -------------------------------------------------------------------------
  // I-475: Macon Bypass
  // -------------------------------------------------------------------------
  {
    name: 'I-475',
    displayName: 'Interstate 475',
    description: 'Macon bypass',
    points: [
      { lat: 32.6793, lng: -83.6990 }, // North junction
      { lat: 32.7604, lng: -83.7246 },
      { lat: 32.8407, lng: -83.7502 }, // West Macon
      { lat: 32.9210, lng: -83.6753 },
      { lat: 33.0013, lng: -83.6503 }, // South junction
    ],
  },

  // -------------------------------------------------------------------------
  // I-575: Northwest Metro Atlanta
  // -------------------------------------------------------------------------
  {
    name: 'I-575',
    displayName: 'Interstate 575',
    description: 'Northwest Atlanta to North Georgia mountains',
    points: [
      { lat: 34.0555, lng: -84.4546 }, // I-75 junction (Marietta)
      { lat: 34.1042, lng: -84.4764 },
      { lat: 34.1542, lng: -84.4910 }, // Kennesaw
      { lat: 34.2127, lng: -84.4983 },
      { lat: 34.2370, lng: -84.4910 }, // Canton
      { lat: 34.3157, lng: -84.4546 },
      { lat: 34.3945, lng: -84.4182 },
      { lat: 34.4732, lng: -84.3818 }, // Ball Ground
      { lat: 34.5120, lng: -84.3454 }, // End near Nelson
    ],
  },

  // -------------------------------------------------------------------------
  // I-675: Southeast Metro Atlanta
  // -------------------------------------------------------------------------
  {
    name: 'I-675',
    displayName: 'Interstate 675',
    description: 'Southeast Atlanta bypass connecting I-75 and I-285',
    points: [
      { lat: 33.6045, lng: -84.3330 }, // I-75 junction
      { lat: 33.6287, lng: -84.2858 },
      { lat: 33.6513, lng: -84.2042 },
      { lat: 33.6695, lng: -84.1574 }, // I-285 junction
    ],
  },

  // -------------------------------------------------------------------------
  // I-516: Savannah Spur
  // -------------------------------------------------------------------------
  {
    name: 'I-516',
    displayName: 'Interstate 516',
    description: 'Savannah downtown connector from I-16',
    points: [
      { lat: 32.0357, lng: -81.1654 }, // I-16 junction
      { lat: 32.0596, lng: -81.1326 },
      { lat: 32.0835, lng: -81.0998 }, // Downtown Savannah
    ],
  },

  // -------------------------------------------------------------------------
  // I-16: Macon to Savannah
  // -------------------------------------------------------------------------
  {
    name: 'I-16',
    displayName: 'Interstate 16',
    description: 'Macon to Savannah corridor',
    points: [
      { lat: 32.8407, lng: -83.6324 }, // Macon (I-75 junction)
      { lat: 32.7813, lng: -83.4472 },
      { lat: 32.7219, lng: -83.2620 }, // Dublin area
      { lat: 32.6625, lng: -83.0768 },
      { lat: 32.6031, lng: -82.8916 },
      { lat: 32.5437, lng: -82.7064 }, // Soperton area
      { lat: 32.4843, lng: -82.5212 },
      { lat: 32.4249, lng: -82.3360 },
      { lat: 32.3655, lng: -82.1508 }, // Metter area
      { lat: 32.3061, lng: -81.9656 },
      { lat: 32.2467, lng: -81.7804 }, // Statesboro area
      { lat: 32.1873, lng: -81.5952 },
      { lat: 32.1279, lng: -81.4100 },
      { lat: 32.0835, lng: -81.0998 }, // Savannah (I-95 junction)
    ],
  },
];

// =============================================================================
// LOOKUP HELPERS
// =============================================================================

/**
 * Find the nearest point on any interstate to given coordinates
 * Returns the interstate name and distance in miles
 */
export function findNearestInterstate(
  lat: number,
  lng: number
): { interstate: string; displayName: string; distance: number; nearestPoint: InterstatePoint } {
  let nearestInterstate = GEORGIA_INTERSTATES[0];
  let nearestPoint = GEORGIA_INTERSTATES[0].points[0];
  let minDistance = calculateDistance(lat, lng, nearestPoint.lat, nearestPoint.lng);

  for (const interstate of GEORGIA_INTERSTATES) {
    for (const point of interstate.points) {
      const distance = calculateDistance(lat, lng, point.lat, point.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestInterstate = interstate;
        nearestPoint = point;
      }
    }
  }

  return {
    interstate: nearestInterstate.name,
    displayName: nearestInterstate.displayName,
    distance: minDistance,
    nearestPoint,
  };
}

/**
 * Find distances to all major interstates from given coordinates
 */
export function findDistancesToAllInterstates(
  lat: number,
  lng: number
): Array<{ interstate: string; displayName: string; distance: number }> {
  const results: Array<{ interstate: string; displayName: string; distance: number }> = [];

  for (const interstate of GEORGIA_INTERSTATES) {
    let minDistance = Infinity;

    for (const point of interstate.points) {
      const distance = calculateDistance(lat, lng, point.lat, point.lng);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    results.push({
      interstate: interstate.name,
      displayName: interstate.displayName,
      distance: Math.round(minDistance * 100) / 100,
    });
  }

  return results.sort((a, b) => a.distance - b.distance);
}

/**
 * Check if location is within X miles of any interstate
 */
export function isNearInterstate(lat: number, lng: number, thresholdMiles: number = 2): boolean {
  const nearest = findNearestInterstate(lat, lng);
  return nearest.distance <= thresholdMiles;
}

/**
 * Get interstate access rating based on distance
 */
export function getInterstateAccessRating(distanceMiles: number): {
  rating: 'excellent' | 'good' | 'moderate' | 'limited' | 'remote';
  score: number;
  description: string;
} {
  if (distanceMiles <= 1) {
    return {
      rating: 'excellent',
      score: 100,
      description: 'Less than 1 mile to interstate access',
    };
  } else if (distanceMiles <= 3) {
    return {
      rating: 'good',
      score: 80,
      description: '1-3 miles to interstate access',
    };
  } else if (distanceMiles <= 5) {
    return {
      rating: 'moderate',
      score: 60,
      description: '3-5 miles to interstate access',
    };
  } else if (distanceMiles <= 10) {
    return {
      rating: 'limited',
      score: 40,
      description: '5-10 miles to interstate access',
    };
  } else {
    return {
      rating: 'remote',
      score: 20,
      description: 'More than 10 miles to interstate access',
    };
  }
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
  GEORGIA_INTERSTATES,
  findNearestInterstate,
  findDistancesToAllInterstates,
  isNearInterstate,
  getInterstateAccessRating,
  DATA_SOURCE,
  DATA_YEAR,
};
