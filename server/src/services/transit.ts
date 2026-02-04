// =============================================================================
// TRANSIT SERVICE (Static Data - No API Dependencies)
// =============================================================================
// Provides transit stop data and transit score calculations using static
// pre-downloaded GTFS data from Georgia transit agencies
// =============================================================================

import type { MobilityScores } from '../../../src/types/index.js';
import {
  findTransitStopsNearby,
  findNearestTransitStop,
  findNearestRailStation,
  countTransitByType,
  DATA_SOURCE,
  DATA_YEAR,
  type TransitStop,
} from '../data/georgia-transit-data.js';

export interface TransitAnalysis {
  score: number;
  description: string;
  nearestStop: {
    name: string;
    type: string;
    agency: string;
    distance: number;
    routes?: string[];
  } | null;
  nearestRail: {
    name: string;
    type: string;
    agency: string;
    distance: number;
    routes?: string[];
  } | null;
  stopsWithin1Mile: {
    rail: number;
    bus: number;
    streetcar: number;
    total: number;
  };
  dataSource: string;
  dataYear: number;
}

/**
 * Calculate transit score based on proximity to transit stops
 * Score 0-100, higher is better
 */
export function calculateTransitScore(lat: number, lng: number): TransitAnalysis {
  // Get nearby transit data
  const nearestStop = findNearestTransitStop(lat, lng);
  const nearestRail = findNearestRailStation(lat, lng);
  const stopsWithin1Mile = countTransitByType(lat, lng, 1);
  const stopsWithin3Miles = countTransitByType(lat, lng, 3);

  // Calculate base score
  let score = 0;

  // Points for nearest stop proximity (max 40 points)
  if (nearestStop) {
    if (nearestStop.distance <= 0.25) {
      score += 40; // Excellent - within quarter mile
    } else if (nearestStop.distance <= 0.5) {
      score += 35;
    } else if (nearestStop.distance <= 1) {
      score += 25;
    } else if (nearestStop.distance <= 2) {
      score += 15;
    } else if (nearestStop.distance <= 5) {
      score += 5;
    }
  }

  // Points for rail access (max 30 points)
  if (nearestRail) {
    if (nearestRail.distance <= 0.5) {
      score += 30; // Excellent rail access
    } else if (nearestRail.distance <= 1) {
      score += 25;
    } else if (nearestRail.distance <= 2) {
      score += 18;
    } else if (nearestRail.distance <= 3) {
      score += 12;
    } else if (nearestRail.distance <= 5) {
      score += 6;
    }
  }

  // Points for transit density (max 30 points)
  const densityScore = Math.min(30, stopsWithin1Mile.total * 3);
  score += densityScore;

  // Bonus for having multiple transit types nearby
  const typesNearby = [
    stopsWithin3Miles.rail > 0,
    stopsWithin3Miles.bus > 0,
    stopsWithin3Miles.streetcar > 0,
  ].filter(Boolean).length;

  if (typesNearby >= 2) {
    score = Math.min(100, score + 5);
  }

  // Ensure score is 0-100
  score = Math.max(0, Math.min(100, score));

  // Generate description
  const description = getTransitDescription(score, nearestStop?.distance, nearestRail?.distance);

  return {
    score,
    description,
    nearestStop: nearestStop
      ? {
          name: nearestStop.stop.name,
          type: nearestStop.stop.type,
          agency: nearestStop.stop.agency,
          distance: nearestStop.distance,
          routes: nearestStop.stop.routes,
        }
      : null,
    nearestRail: nearestRail
      ? {
          name: nearestRail.stop.name,
          type: nearestRail.stop.type,
          agency: nearestRail.stop.agency,
          distance: nearestRail.distance,
          routes: nearestRail.stop.routes,
        }
      : null,
    stopsWithin1Mile,
    dataSource: DATA_SOURCE,
    dataYear: DATA_YEAR,
  };
}

/**
 * Get transit description based on score and distances
 */
function getTransitDescription(
  score: number,
  nearestStopDistance?: number,
  nearestRailDistance?: number
): string {
  if (score >= 90) {
    return "Rider's Paradise - World-class public transit with excellent rail and bus access";
  } else if (score >= 70) {
    return 'Excellent Transit - Many nearby transit options, daily errands do not require a car';
  } else if (score >= 50) {
    return 'Good Transit - Many nearby public transportation options';
  } else if (score >= 25) {
    return 'Some Transit - A few public transportation options';
  } else if (nearestStopDistance && nearestStopDistance <= 5) {
    return 'Minimal Transit - Limited public transportation nearby';
  } else {
    return 'Minimal Transit - Few or no public transportation options';
  }
}

/**
 * Get simplified mobility scores for the pulse response
 */
export function getTransitMobilityScores(lat: number, lng: number): MobilityScores['transitScore'] {
  const analysis = calculateTransitScore(lat, lng);
  return {
    score: analysis.score,
    description: analysis.description,
  };
}

/**
 * Get detailed transit info for a location
 */
export function getTransitDetails(lat: number, lng: number) {
  const analysis = calculateTransitScore(lat, lng);
  const stopsNearby = findTransitStopsNearby(lat, lng, 1);

  return {
    ...analysis,
    allStopsWithin1Mile: stopsNearby.map(stop => ({
      name: stop.name,
      type: stop.type,
      agency: stop.agency,
      routes: stop.routes,
    })),
  };
}

export default {
  calculateTransitScore,
  getTransitMobilityScores,
  getTransitDetails,
};
