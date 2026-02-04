// =============================================================================
// INTERSTATE ACCESS SERVICE (Static Data - No API Dependencies)
// =============================================================================
// Calculates distance to nearest interstate highway using pre-compiled
// coordinate data for Georgia interstates
// =============================================================================

import {
  findNearestInterstate,
  findDistancesToAllInterstates,
  isNearInterstate,
  getInterstateAccessRating,
  DATA_SOURCE,
  DATA_YEAR,
} from '../data/georgia-interstate-data.js';

export interface InterstateAccess {
  nearestInterstate: {
    name: string;
    displayName: string;
    distance: number;
  };
  accessRating: {
    rating: 'excellent' | 'good' | 'moderate' | 'limited' | 'remote';
    score: number;
    description: string;
  };
  isNearInterstate: boolean;
  allInterstates: Array<{
    interstate: string;
    displayName: string;
    distance: number;
  }>;
  dataSource: string;
  dataYear: number;
}

/**
 * Get complete interstate access analysis for a location
 */
export function getInterstateAccess(lat: number, lng: number): InterstateAccess {
  const nearest = findNearestInterstate(lat, lng);
  const accessRating = getInterstateAccessRating(nearest.distance);
  const nearInterstate = isNearInterstate(lat, lng, 2);
  const allInterstates = findDistancesToAllInterstates(lat, lng);

  return {
    nearestInterstate: {
      name: nearest.interstate,
      displayName: nearest.displayName,
      distance: nearest.distance,
    },
    accessRating,
    isNearInterstate: nearInterstate,
    allInterstates: allInterstates.slice(0, 5), // Top 5 closest
    dataSource: DATA_SOURCE,
    dataYear: DATA_YEAR,
  };
}

/**
 * Get simple interstate distance (for quick lookups)
 */
export function getDistanceToNearestInterstate(lat: number, lng: number): {
  interstate: string;
  distance: number;
} {
  const nearest = findNearestInterstate(lat, lng);
  return {
    interstate: nearest.interstate,
    distance: nearest.distance,
  };
}

/**
 * Calculate commuter score based on interstate access
 * Combined with transit score for overall commute-ability
 */
export function calculateCommuterScore(
  interstateDistance: number,
  transitScore: number
): {
  score: number;
  description: string;
} {
  // Interstate component (max 50 points)
  let interstatePoints = 0;
  if (interstateDistance <= 1) {
    interstatePoints = 50;
  } else if (interstateDistance <= 2) {
    interstatePoints = 45;
  } else if (interstateDistance <= 3) {
    interstatePoints = 35;
  } else if (interstateDistance <= 5) {
    interstatePoints = 25;
  } else if (interstateDistance <= 10) {
    interstatePoints = 15;
  } else {
    interstatePoints = 5;
  }

  // Transit component (max 50 points)
  const transitPoints = Math.round(transitScore * 0.5);

  const totalScore = interstatePoints + transitPoints;

  let description: string;
  if (totalScore >= 90) {
    description = 'Excellent for commuters - great highway and transit access';
  } else if (totalScore >= 70) {
    description = 'Very good for commuters - solid transportation options';
  } else if (totalScore >= 50) {
    description = 'Good for commuters - reasonable access to highways/transit';
  } else if (totalScore >= 30) {
    description = 'Moderate commute options - may require longer drive times';
  } else {
    description = 'Limited commute options - remote from major highways/transit';
  }

  return {
    score: totalScore,
    description,
  };
}

export default {
  getInterstateAccess,
  getDistanceToNearestInterstate,
  calculateCommuterScore,
};
