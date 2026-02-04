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
} from '../types.js';

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
// Pros/Cons Generation
// -----------------------------------------------------------------------------

function generatePros(breakdown: VibeScore['breakdown'], amenities: AmenitiesScore): string[] {
  const pros: string[] = [];

  if (breakdown.safety >= 80) pros.push("Excellent safety record");
  else if (breakdown.safety >= 65) pros.push("Above-average safety");
  else if (breakdown.safety >= 50) pros.push("Safety is at a moderate level");

  if (breakdown.walkability >= 85) pros.push("Walker's paradise - no car needed");
  else if (breakdown.walkability >= 70) pros.push("Very walkable for daily errands");
  else if (breakdown.walkability >= 45) pros.push("Some destinations are reachable on foot");

  if (breakdown.transit >= 80) pros.push("World-class public transit");
  else if (breakdown.transit >= 65) pros.push("Good public transit options");
  else if (breakdown.transit >= 30) pros.push("Public transit is available nearby");

  if (breakdown.amenities >= 80) pros.push("Abundant shops, restaurants, and services");
  else if (breakdown.amenities >= 65) pros.push("Good variety of local amenities");
  else if (breakdown.amenities >= 35) pros.push("Basic amenities are accessible in the area");

  // Check essentials (grocery + healthcare)
  const essentialsScore = ((amenities.categories?.grocery || 0) + (amenities.categories?.healthcare || 0)) / 2;
  if (essentialsScore >= 80) pros.push("Essential services within walking distance");
  else if (essentialsScore >= 40) pros.push("Key essentials are reachable");

  // Check lifestyle (dining + entertainment)
  const lifestyleScore = ((amenities.categories?.dining || 0) + (amenities.categories?.entertainment || 0)) / 2;
  if (lifestyleScore >= 80) pros.push("Vibrant dining and entertainment scene");
  else if (lifestyleScore >= 30) pros.push("Some dining and entertainment options nearby");

  // Guarantee at least 2 highlights
  if (pros.length < 2) pros.push("Residential area with community services");
  if (pros.length < 2) pros.push("Connected to surrounding neighborhoods");

  return pros.slice(0, 4);
}

function generateCons(breakdown: VibeScore['breakdown'], amenities: AmenitiesScore): string[] {
  const cons: string[] = [];

  if (breakdown.safety < 50) cons.push("Higher than average crime rates");
  else if (breakdown.safety < 65) cons.push("Safety could be a concern");
  else if (breakdown.safety < 80) cons.push("Verify safety for specific blocks in the area");

  if (breakdown.walkability < 40) cons.push("Car required for most errands");
  else if (breakdown.walkability < 55) cons.push("Limited walkability");
  else if (breakdown.walkability < 75) cons.push("A car is useful for some errands");

  if (breakdown.transit < 30) cons.push("Very limited public transit");
  else if (breakdown.transit < 50) cons.push("Public transit options are sparse");
  else if (breakdown.transit < 70) cons.push("Transit frequency may be limited");

  if (amenities.isFoodDesert) cons.push("Limited grocery store access (food desert)");
  else if (breakdown.amenities < 40) cons.push("Few nearby amenities");
  else if (breakdown.amenities < 65) cons.push("Fewer options than nearby urban areas");

  // Check essentials (grocery + healthcare)
  const essentialsScore = ((amenities.categories?.grocery || 0) + (amenities.categories?.healthcare || 0)) / 2;
  if (essentialsScore < 50) cons.push("Essential services may require driving");
  else if (essentialsScore < 70) cons.push("Some essential services are a short drive away");

  // Guarantee at least 2 considerations
  if (cons.length < 2) cons.push("Consider visiting the area at different times of day");
  if (cons.length < 2) cons.push("Compare with nearby neighborhoods for best value");

  return cons.slice(0, 4);
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

export function calculateVibeScore(
  safety: SafetyScore,
  mobility: MobilityScores,
  amenities: AmenitiesScore,
  customWeights?: Partial<VibeFactors>
): VibeScore {
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
  const summary = LABEL_SUMMARIES[label];
  const pros = generatePros(breakdown, amenities);
  const cons = generateCons(breakdown, amenities);

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
