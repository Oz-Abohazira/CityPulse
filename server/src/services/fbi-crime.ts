// =============================================================================
// FBI CRIME DATA SERVICE (Static Data)
// =============================================================================
// Uses pre-downloaded FBI Crime Data Explorer statistics
// Data is at county level for Georgia, updated annually
// Source: https://cde.ucr.cjis.gov/
// =============================================================================

import type { SafetyScore } from '../../../src/types/index.js';
import {
  GEORGIA_CRIME_DATA,
  CRIME_DATA_BY_FIPS,
  CRIME_DATA_BY_NAME,
  NATIONAL_AVERAGES,
  DATA_YEAR,
} from '../data/georgia-crime-data.js';

// Re-export for use in other modules
export { NATIONAL_AVERAGES, DATA_YEAR };

interface CountyCrimeRates {
  countyFips: string;
  countyName: string;
  year: number;
  population: number;
  rates: {
    violentCrime: number;
    propertyCrime: number;
    murder: number;
    robbery: number;
    assault: number;
    burglary: number;
    larceny: number;
    vehicleTheft: number;
  };
}

/**
 * Get crime data for a Georgia county by FIPS code
 * Uses static pre-downloaded data instead of API
 */
export function getCountyCrimeData(countyFips: string): CountyCrimeRates | null {
  const data = CRIME_DATA_BY_FIPS.get(countyFips);

  if (!data) {
    return null;
  }

  return {
    countyFips: data.fips,
    countyName: data.name,
    year: DATA_YEAR,
    population: data.population,
    rates: {
      violentCrime: data.violentCrimeRate,
      propertyCrime: data.propertyCrimeRate,
      murder: data.murderRate,
      robbery: data.robberyRate,
      assault: data.assaultRate,
      burglary: data.burglaryRate,
      larceny: data.larcenyRate,
      vehicleTheft: data.vehicleTheftRate,
    },
  };
}

/**
 * Get crime data for a Georgia county by name
 */
export function getCountyCrimeDataByName(countyName: string): CountyCrimeRates | null {
  const cleanName = countyName.replace(' County', '').trim().toLowerCase();
  const data = CRIME_DATA_BY_NAME.get(cleanName);

  if (!data) {
    return null;
  }

  return {
    countyFips: data.fips,
    countyName: data.name,
    year: DATA_YEAR,
    population: data.population,
    rates: {
      violentCrime: data.violentCrimeRate,
      propertyCrime: data.propertyCrimeRate,
      murder: data.murderRate,
      robbery: data.robberyRate,
      assault: data.assaultRate,
      burglary: data.burglaryRate,
      larceny: data.larcenyRate,
      vehicleTheft: data.vehicleTheftRate,
    },
  };
}

/**
 * Legacy function - kept for backward compatibility
 * Now returns data from static dataset instead of API
 */
export async function fetchCountyCrimeData(
  countyFips: string,
  _year: number = DATA_YEAR
): Promise<CountyCrimeRates | null> {
  return getCountyCrimeData(countyFips);
}

/**
 * Get all Georgia counties crime data
 * Returns static pre-downloaded data
 */
export function getAllGeorgiaCounties(): CountyCrimeRates[] {
  return GEORGIA_CRIME_DATA.map(data => ({
    countyFips: data.fips,
    countyName: data.name,
    year: DATA_YEAR,
    population: data.population,
    rates: {
      violentCrime: data.violentCrimeRate,
      propertyCrime: data.propertyCrimeRate,
      murder: data.murderRate,
      robbery: data.robberyRate,
      assault: data.assaultRate,
      burglary: data.burglaryRate,
      larceny: data.larcenyRate,
      vehicleTheft: data.vehicleTheftRate,
    },
  }));
}

/**
 * Legacy function - kept for backward compatibility
 * Now returns data from static dataset instead of API
 */
export async function fetchAllGeorgiaCounties(
  _year: number = DATA_YEAR
): Promise<CountyCrimeRates[]> {
  return getAllGeorgiaCounties();
}

/**
 * Calculate safety score from crime rates (0-100, higher is safer)
 */
export function calculateSafetyScore(rates: CountyCrimeRates['rates']): SafetyScore {
  // Weight violent crime more heavily than property crime
  const weights = {
    murder: 0.20,
    robbery: 0.15,
    assault: 0.15,
    burglary: 0.15,
    larceny: 0.10,
    vehicleTheft: 0.10,
    violentCrime: 0.10,
    propertyCrime: 0.05,
  };

  // Calculate how much better/worse than national average
  let weightedScore = 0;

  for (const [crime, weight] of Object.entries(weights)) {
    const rate = rates[crime as keyof typeof rates] || 0;
    const national = NATIONAL_AVERAGES[crime as keyof typeof NATIONAL_AVERAGES] || 1;

    // If rate is 0 or below, perfect score for this metric
    // If rate equals national, 50 points
    // If rate is double national, 0 points
    let metricScore: number;
    if (rate <= 0) {
      metricScore = 100;
    } else {
      // Score = 100 - (rate / national * 50), clamped to 0-100
      metricScore = Math.max(0, Math.min(100, 100 - (rate / national) * 50));
    }

    weightedScore += metricScore * weight;
  }

  const score = Math.round(weightedScore);
  const grade = scoreToGrade(score);
  const riskLevel = scoreToRiskLevel(score);

  // Generate trend (would need historical data for real trend)
  const trend = 'stable' as const;

  // Compare to national
  const totalCrimeRate = rates.violentCrime + rates.propertyCrime;
  const nationalTotal = NATIONAL_AVERAGES.violentCrime + NATIONAL_AVERAGES.propertyCrime;
  const vsNational = Math.round(((totalCrimeRate - nationalTotal) / nationalTotal) * 100);

  return {
    overall: score,
    grade,
    riskLevel,
    trend,
    vsNational,
    crimeRates: {
      violent: rates.violentCrime,
      property: rates.propertyCrime,
      total: totalCrimeRate,
    },
    breakdown: {
      murder: rateToScore(rates.murder, NATIONAL_AVERAGES.murder),
      robbery: rateToScore(rates.robbery, NATIONAL_AVERAGES.robbery),
      assault: rateToScore(rates.assault, NATIONAL_AVERAGES.assault),
      burglary: rateToScore(rates.burglary, NATIONAL_AVERAGES.burglary),
      theft: rateToScore(rates.larceny, NATIONAL_AVERAGES.larceny),
      vehicleTheft: rateToScore(rates.vehicleTheft, NATIONAL_AVERAGES.vehicleTheft),
    },
    dataSource: `FBI Crime Data Explorer (${DATA_YEAR})`,
    lastUpdated: new Date().toISOString(),
  };
}

function rateToScore(rate: number, national: number): number {
  if (rate <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(100 - (rate / national) * 50)));
}

function scoreToGrade(score: number): 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F' {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 40) return 'D';
  return 'F';
}

function scoreToRiskLevel(score: number): 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' {
  if (score >= 80) return 'very_low';
  if (score >= 65) return 'low';
  if (score >= 45) return 'moderate';
  if (score >= 25) return 'high';
  return 'very_high';
}

/**
 * Georgia county FIPS codes mapping
 */
export const GEORGIA_COUNTIES: Record<string, string> = Object.fromEntries(
  GEORGIA_CRIME_DATA.map(county => [county.name, county.fips])
);

export default {
  getCountyCrimeData,
  getCountyCrimeDataByName,
  fetchCountyCrimeData,
  getAllGeorgiaCounties,
  fetchAllGeorgiaCounties,
  calculateSafetyScore,
  GEORGIA_COUNTIES,
  NATIONAL_AVERAGES,
  DATA_YEAR,
};
