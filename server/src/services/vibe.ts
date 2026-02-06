// =============================================================================
// VIBE ALGORITHM SERVICE
// The Core Scoring & Label Assignment Logic
// =============================================================================

import type {
  VibeScore,
  VibeLabel,
  VibeFactors,
  VibeConfidence,
  SafetyScore,
  MobilityScores,
  AmenitiesScore,
  SearchIntent,
} from '../types.js';
import { generateAIInsights, type LocationContext } from './groq.js';

// -----------------------------------------------------------------------------
// Default Weights
// -----------------------------------------------------------------------------

const DEFAULT_WEIGHTS: VibeFactors = {
  safetyWeight: 0.35,       // Safety is most important
  walkabilityWeight: 0.25,  // Walkability second
  transitWeight: 0.15,      // Transit third
  amenitiesWeight: 0.25,    // Amenities tied with walkability
};

// -----------------------------------------------------------------------------
// Label Determination Rules
// -----------------------------------------------------------------------------

interface LabelRule {
  label: VibeLabel;
  check: (breakdown: VibeScore['breakdown'], amenities: AmenitiesScore) => boolean;
  priority: number;
}

const LABEL_RULES: LabelRule[] = [
  // Food Desert - highest priority critical flag
  {
    label: 'food_desert',
    check: (_breakdown, amenities) => amenities.isFoodDesert,
    priority: 100,
  },
  // Urban Oasis - high walkability, low crime, many amenities
  {
    label: 'urban_oasis',
    check: (b, _a) => b.walkability >= 85 && b.safety >= 75 && b.amenities >= 80,
    priority: 90,
  },
  // Needs Attention - multiple low scores
  {
    label: 'needs_attention',
    check: (b, _a) => {
      const lowScores = [b.safety, b.walkability, b.transit, b.amenities].filter(s => s < 40);
      return lowScores.length >= 2;
    },
    priority: 85,
  },
  // Transit Hub - excellent transit but mixed other scores
  {
    label: 'transit_hub',
    check: (b, _a) => b.transit >= 80 && b.walkability < 70,
    priority: 70,
  },
  // Hidden Gem - high safety, moderate other scores
  {
    label: 'hidden_gem',
    check: (b, _a) => b.safety >= 85 && b.walkability >= 50 && b.walkability < 75,
    priority: 65,
  },
  // Suburban Comfort - moderate walkability, low crime, decent amenities
  {
    label: 'suburban_comfort',
    check: (b, _a) => b.safety >= 70 && b.walkability >= 30 && b.walkability < 70 && b.amenities >= 50,
    priority: 60,
  },
  // Car Country - low walkability but safe with some amenities
  {
    label: 'car_country',
    check: (b, _a) => b.walkability < 40 && b.safety >= 60 && b.amenities >= 40,
    priority: 55,
  },
  // Up and Coming - improving area, mixed scores
  {
    label: 'up_and_coming',
    check: (b, _a) => {
      const avgScore = (b.safety + b.walkability + b.transit + b.amenities) / 4;
      return avgScore >= 50 && avgScore < 70 && b.safety >= 55;
    },
    priority: 50,
  },
  // Balanced - all scores moderate (default fallback)
  {
    label: 'balanced',
    check: () => true,
    priority: 0,
  },
];

// -----------------------------------------------------------------------------
// Summary Generation
// -----------------------------------------------------------------------------

const LABEL_SUMMARIES: Record<VibeLabel, string> = {
  urban_oasis: "An exceptional urban neighborhood with excellent walkability, low crime, and abundant amenities. Perfect for those who want to live car-free.",
  suburban_comfort: "A safe, family-friendly area with decent access to essentials. You'll need a car for some errands but enjoy lower crime rates.",
  up_and_coming: "A neighborhood on the rise with improving amenities and moderate safety. Good value potential but do your research.",
  car_country: "A car-dependent area that's safe and has basic amenities. Best for those who prefer driving and value space over walkability.",
  hidden_gem: "A surprisingly safe area that flies under the radar. Moderate walkability but excellent safety scores.",
  food_desert: "Limited grocery access in this area. Consider proximity to food stores when planning your move.",
  transit_hub: "Excellent public transit access makes this a commuter's dream, though local walkability varies.",
  needs_attention: "Multiple factors suggest caution. Review individual scores carefully before deciding.",
  balanced: "A well-rounded neighborhood with moderate scores across all categories. No major red flags or standout features.",
};

// -----------------------------------------------------------------------------
// Pros/Cons Generation (Data-Driven with Real POI Details)
// -----------------------------------------------------------------------------

function generatePros(breakdown: VibeScore['breakdown'], amenities: AmenitiesScore, pois?: any[]): string[] {
  const pros: string[] = [];

  // Safety - always lead with this if it's good
  if (breakdown.safety >= 80) pros.push("Excellent safety record with very low crime rates");
  else if (breakdown.safety >= 65) pros.push("Above-average safety compared to metro area");

  const highlights = amenities.highlights || {};
  const poisByCategory = (pois || []).reduce((acc: Record<string, any[]>, poi) => {
    if (!acc[poi.category]) acc[poi.category] = [];
    acc[poi.category].push(poi);
    return acc;
  }, {});

  // Grocery - critical for livability (show specific stores)
  if (highlights.groceryStores >= 3) {
    const stores = (poisByCategory.grocery || []).slice(0, 3).map(p => p.name).filter(n => n);
    const storeList = stores.length > 0 ? ` (${stores.join(', ')})` : '';
    pros.push(`${highlights.groceryStores} grocery stores nearby${storeList}`);
  } else if (highlights.groceryStores >= 1) {
    const nearestGrocery = amenities.nearestByCategory?.grocery;
    if (nearestGrocery) {
      const dist = nearestGrocery.distance ? ` ${nearestGrocery.distance}mi away` : '';
      pros.push(`Grocery access: ${nearestGrocery.name}${dist}`);
    }
  }

  // Dining - show count and variety
  if (highlights.restaurants >= 20) {
    pros.push(`Exceptional dining scene with ${highlights.restaurants}+ restaurants`);
  } else if (highlights.restaurants >= 10) {
    pros.push(`Great restaurant variety (${highlights.restaurants} nearby options)`);
  } else if (highlights.restaurants >= 5) {
    pros.push(`${highlights.restaurants} restaurants within walking distance`);
  }

  // Gyms/fitness (show specific names)
  const gyms = poisByCategory.gym || [];
  if (gyms.length >= 3) {
    const gymNames = gyms.slice(0, 2).map(p => p.name).filter(n => n).join(', ');
    pros.push(`${gyms.length} fitness centers including ${gymNames}`);
  } else if (gyms.length >= 1) {
    pros.push(`Fitness access: ${gyms[0].name} nearby`);
  }

  // Healthcare & Pharmacy combined
  const pharmacies = poisByCategory.pharmacy || [];
  const healthcare = poisByCategory.healthcare || [];
  const totalHealth = pharmacies.length + healthcare.length;
  if (totalHealth >= 5) {
    const names = [...pharmacies, ...healthcare].slice(0, 2).map(p => p.name).filter(n => n);
    pros.push(`${totalHealth} healthcare facilities (${names.join(', ')})`);
  } else if (pharmacies.length >= 1) {
    pros.push(`Pharmacy nearby: ${pharmacies[0].name}`);
  }

  // Walkability
  if (breakdown.walkability >= 85) pros.push("Walker's paradise - daily errands do not require a car");
  else if (breakdown.walkability >= 70) pros.push("Very walkable - most errands accomplished on foot");

  // Transit
  if (breakdown.transit >= 80) pros.push("Excellent public transit with frequent service");
  else if (breakdown.transit >= 60) pros.push("Good public transit connections");

  // Parks
  const parks = poisByCategory.park || [];
  if (parks.length >= 3) {
    const parkNames = parks.slice(0, 2).map(p => p.name).filter(n => n && n !== 'Park');
    const namesList = parkNames.length > 0 ? ` (${parkNames.join(', ')})` : '';
    pros.push(`${parks.length} parks and green spaces${namesList}`);
  }

  // Banking
  const banks = poisByCategory.bank || [];
  if (banks.length >= 5) {
    pros.push(`Convenient banking with ${banks.length} locations nearby`);
  }

  // Cafes/coffee culture
  const cafes = poisByCategory.cafe || [];
  if (cafes.length >= 5) {
    pros.push(`Vibrant coffee culture with ${cafes.length} cafes`);
  }

  // Bars/nightlife
  const bars = poisByCategory.bar || [];
  if (bars.length >= 5 && breakdown.safety >= 60) {
    pros.push(`Active nightlife scene with ${bars.length} bars and venues`);
  }

  // Guarantee at least 3 highlights
  if (pros.length < 3 && breakdown.safety >= 50) pros.push("Moderate safety with standard precautions recommended");
  if (pros.length < 3) pros.push("Established residential area");
  if (pros.length < 3) pros.push("Connected to surrounding neighborhoods");

  return pros.slice(0, 5);
}

function generateCons(breakdown: VibeScore['breakdown'], amenities: AmenitiesScore, pois?: any[]): string[] {
  const cons: string[] = [];

  const highlights = amenities.highlights || {};
  const poisByCategory = (pois || []).reduce((acc: Record<string, any[]>, poi) => {
    if (!acc[poi.category]) acc[poi.category] = [];
    acc[poi.category].push(poi);
    return acc;
  }, {});

  // Safety concerns with specificity
  if (breakdown.safety < 50) cons.push("Higher than average crime rates - extra caution advised");
  else if (breakdown.safety < 65) cons.push("Safety scores below metro average");
  else if (breakdown.safety < 80) cons.push("Verify safety for specific streets before committing");

  // Food desert is critical
  if (amenities.isFoodDesert) {
    const nearestGrocery = amenities.nearestByCategory?.grocery;
    if (nearestGrocery && nearestGrocery.distance) {
      cons.push(`Food desert - nearest grocery (${nearestGrocery.name}) is ${nearestGrocery.distance}mi away`);
    } else {
      cons.push("Food desert - no grocery stores within 1 mile");
    }
  }

  // Walkability
  if (breakdown.walkability < 40) cons.push("Car required for most errands - very car-dependent");
  else if (breakdown.walkability < 55) cons.push("Limited walkability - car needed for daily activities");
  else if (breakdown.walkability < 75) cons.push("A car is useful for many errands");

  // Transit
  if (breakdown.transit < 30) cons.push("Very limited public transit - car ownership essential");
  else if (breakdown.transit < 50) cons.push("Public transit options are sparse");
  else if (breakdown.transit < 70) cons.push("Transit frequency may require schedule planning");

  // Specific amenity gaps
  const gyms = poisByCategory.gym || [];
  const pharmacies = poisByCategory.pharmacy || [];
  const healthcare = poisByCategory.healthcare || [];

  if (gyms.length === 0 && breakdown.amenities < 70) {
    cons.push("No fitness centers within immediate vicinity");
  }

  if (pharmacies.length === 0 && highlights.groceryStores < 2) {
    const nearest = amenities.nearestByCategory?.pharmacy;
    if (nearest && nearest.distance && nearest.distance > 1) {
      cons.push(`Limited pharmacy access - nearest is ${nearest.distance}mi away`);
    }
  }

  if (healthcare.length === 0 && pharmacies.length === 0) {
    cons.push("Healthcare facilities require travel - plan accordingly");
  }

  // General amenity scarcity
  if (breakdown.amenities < 40 && !amenities.isFoodDesert) {
    cons.push(`Limited amenities overall - only ${highlights.totalPOIs || 0} services nearby`);
  } else if (breakdown.amenities < 65 && highlights.restaurants < 5) {
    cons.push("Dining options are limited - fewer restaurants than urban areas");
  }

  // Guarantee at least 2 considerations
  if (cons.length < 2) cons.push("Visit the area at different times to assess noise and activity levels");
  if (cons.length < 2) cons.push("Compare with nearby neighborhoods for best value");

  return cons.slice(0, 5);
}

// -----------------------------------------------------------------------------
// Confidence Calculation
// -----------------------------------------------------------------------------

function calculateConfidence(
  safety: SafetyScore,
  mobility: MobilityScores,
  amenities: AmenitiesScore
): VibeConfidence {
  let dataPoints = 0;
  let quality = 0;

  // Safety data quality - check if we have crime rate data
  if (safety.overall > 0) {
    dataPoints++;
    // Higher quality if we have detailed breakdown
    quality += safety.crimeRates?.total > 0 ? 1 : 0.7;
  }

  // Mobility data quality
  if (mobility.walkScore?.score > 0) {
    dataPoints++;
    quality += 1;
  }
  if (mobility.transitScore?.score > 0) {
    dataPoints++;
    quality += 1;
  }

  // Amenities data quality - check total POIs
  const poiCount = amenities.highlights?.totalPOIs || 0;
  if (poiCount > 0) {
    dataPoints++;
    quality += poiCount >= 10 ? 1 : 0.5;
  }

  const confidenceScore = dataPoints >= 4 ? quality / dataPoints : quality / 4;

  if (confidenceScore >= 0.8) return 'high';
  if (confidenceScore >= 0.5) return 'medium';
  return 'low';
}

// -----------------------------------------------------------------------------
// Main Vibe Calculation Function
// -----------------------------------------------------------------------------

export async function calculateVibeScore(
  safety: SafetyScore,
  mobility: MobilityScores,
  amenities: AmenitiesScore,
  customWeights?: Partial<VibeFactors>,
  pois?: any[],
  intent?: SearchIntent,
  location?: LocationContext
): Promise<VibeScore> {
  // Merge custom weights with defaults
  const weights: VibeFactors = {
    ...DEFAULT_WEIGHTS,
    ...customWeights,
  };

  // Normalize weights to sum to 1
  const totalWeight = weights.safetyWeight + weights.walkabilityWeight +
                      weights.transitWeight + weights.amenitiesWeight;

  const normalizedWeights: VibeFactors = {
    safetyWeight: weights.safetyWeight / totalWeight,
    walkabilityWeight: weights.walkabilityWeight / totalWeight,
    transitWeight: weights.transitWeight / totalWeight,
    amenitiesWeight: weights.amenitiesWeight / totalWeight,
  };

  // Extract individual scores
  const breakdown = {
    safety: safety.overall,
    walkability: mobility.walkScore.score,
    transit: mobility.transitScore.score,
    amenities: amenities.overall,
  };

  // Calculate weighted overall score
  const overall = Math.round(
    breakdown.safety * normalizedWeights.safetyWeight +
    breakdown.walkability * normalizedWeights.walkabilityWeight +
    breakdown.transit * normalizedWeights.transitWeight +
    breakdown.amenities * normalizedWeights.amenitiesWeight
  );

  // Determine label using rules (sorted by priority, highest first)
  const sortedRules = [...LABEL_RULES].sort((a, b) => b.priority - a.priority);
  let label: VibeLabel = 'balanced';

  for (const rule of sortedRules) {
    if (rule.check(breakdown, amenities)) {
      label = rule.label;
      break;
    }
  }

  // Calculate confidence
  const confidence = calculateConfidence(safety, mobility, amenities);

  // Generate summary, pros, and cons
  let summary = LABEL_SUMMARIES[label];
  let pros = generatePros(breakdown, amenities, pois);
  let cons = generateCons(breakdown, amenities, pois);

  // If intent is provided (and not 'curious'), try AI-powered insights
  if (intent && intent !== 'curious' && location) {
    const aiInsights = await generateAIInsights(
      intent,
      safety,
      mobility,
      amenities,
      pois || [],
      location
    );

    if (aiInsights) {
      pros = aiInsights.pros;
      cons = aiInsights.cons;
      if (aiInsights.summary) {
        summary = aiInsights.summary;
      }
    }
    // If AI fails, we already have rule-based pros/cons as fallback
  }

  return {
    overall,
    label,
    confidence,
    factors: normalizedWeights,
    breakdown,
    summary,
    pros,
    cons,
  };
}

// -----------------------------------------------------------------------------
// Comparison Helpers
// -----------------------------------------------------------------------------

export function compareVibeScores(
  scores: VibeScore[]
): { winner: number; margin: number; category: string } {
  if (scores.length < 2) {
    return { winner: 0, margin: 0, category: 'overall' };
  }

  let maxScore = scores[0].overall;
  let winner = 0;

  for (let i = 1; i < scores.length; i++) {
    if (scores[i].overall > maxScore) {
      maxScore = scores[i].overall;
      winner = i;
    }
  }

  // Calculate margin of victory
  const sortedScores = [...scores.map(s => s.overall)].sort((a, b) => b - a);
  const margin = sortedScores.length > 1 ? sortedScores[0] - sortedScores[1] : 0;

  return { winner, margin, category: 'overall' };
}

// -----------------------------------------------------------------------------
// Weight Presets
// -----------------------------------------------------------------------------

export const WEIGHT_PRESETS: Record<string, VibeFactors> = {
  balanced: DEFAULT_WEIGHTS,
  safety_first: {
    safetyWeight: 0.50,
    walkabilityWeight: 0.20,
    transitWeight: 0.10,
    amenitiesWeight: 0.20,
  },
  urban_explorer: {
    safetyWeight: 0.20,
    walkabilityWeight: 0.35,
    transitWeight: 0.25,
    amenitiesWeight: 0.20,
  },
  commuter: {
    safetyWeight: 0.25,
    walkabilityWeight: 0.15,
    transitWeight: 0.40,
    amenitiesWeight: 0.20,
  },
  foodie: {
    safetyWeight: 0.25,
    walkabilityWeight: 0.20,
    transitWeight: 0.10,
    amenitiesWeight: 0.45,
  },
};

export { DEFAULT_WEIGHTS };
