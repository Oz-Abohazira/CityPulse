// =============================================================================
// CITYPULSE SERVER - SHARED TYPE DEFINITIONS
// Re-export from main types + server-specific types
// =============================================================================

// Re-export all types (these match the frontend types)
export type {
  Coordinates,
  Location,
  SearchQuery,
  CrimeCategory,
  SafetyGrade,
  CrimeIncident,
  CrimeStats,
  SafetyScore,
  WalkabilityCategory,
  TransitCategory,
  BikeCategory,
  WalkScore,
  TransitScore,
  BikeScore,
  TransitStop,
  MobilityScores,
  POICategory,
  PointOfInterest,
  AmenityDensity,
  AmenitiesScore,
  VibeLabel,
  VibeConfidence,
  VibeFactors,
  VibeScore,
  LocationPulse,
  DataSource,
  LocationComparison,
  ComparisonMetric,
  User,
  UserPreferences,
  SavedLocation,
  ApiResponse,
  ApiError,
  PaginatedResponse,
  ApiProviderStatus,
  ApiProvider,
  MapLayer,
  MapViewport,
  MapConfig,
  AuthState,
  LoginCredentials,
  RegisterData,
} from '../src/types/index.js';

// Note: The path above assumes types are shared. In practice, you'd either:
// 1. Copy types to server/src/types.ts
// 2. Use a shared package in the monorepo
// 3. Generate types from a schema

// For now, let's define the types directly here for the server:

// =============================================================================
// Core Location Types
// =============================================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location {
  placeId: string;
  formattedAddress: string;
  coordinates: Coordinates;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// =============================================================================
// Safety & Crime Data
// =============================================================================

export type CrimeCategory = 'violent' | 'property' | 'drugs' | 'other';
export type SafetyGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export interface CrimeIncident {
  id: string;
  category: CrimeCategory;
  description: string;
  date: string;
  location: Coordinates;
  distance?: number;
}

export interface CrimeStats {
  totalIncidents: number;
  violentCrimeCount: number;
  propertyCrimeCount: number;
  drugCrimeCount: number;
  otherCrimeCount: number;
  crimeRatePer1000: number;
  nationalAverageComparison: number;
  yearOverYearChange: number;
  recentIncidents: CrimeIncident[];
}

export interface SafetyScore {
  overall: number;  // 0-100 score
  grade: SafetyGrade;
  riskLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  trend: 'improving' | 'stable' | 'declining';
  vsNational: number;  // Percentage vs national average
  crimeRates: {
    violent: number;
    property: number;
    total: number;
  };
  breakdown: {
    murder: number;
    robbery: number;
    assault: number;
    burglary: number;
    theft: number;
    vehicleTheft: number;
  };
  dataSource: string;
  lastUpdated: string;
}

// =============================================================================
// Walkability & Transit
// =============================================================================

export type WalkabilityCategory =
  | 'walkers_paradise'
  | 'very_walkable'
  | 'somewhat_walkable'
  | 'car_dependent'
  | 'almost_all_errands';

export type TransitCategory =
  | 'excellent_transit'
  | 'riders_paradise'
  | 'good_transit'
  | 'some_transit'
  | 'minimal_transit';

export type BikeCategory =
  | 'bikers_paradise'
  | 'very_bikeable'
  | 'bikeable'
  | 'somewhat_bikeable';

export interface WalkScore {
  score: number;
  category: WalkabilityCategory;
  description: string;
}

export interface TransitScore {
  score: number;
  category: TransitCategory;
  description: string;
  nearestTransit?: TransitStop[];
}

export interface BikeScore {
  score: number;
  category: BikeCategory;
  description: string;
  bikeInfrastructure: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface TransitStop {
  name: string;
  type: 'subway' | 'bus' | 'rail' | 'ferry' | 'tram';
  distance: number;
  routes?: string[];
}

export interface MobilityScores {
  walkScore: {
    score: number;
    description: string;
  };
  transitScore: {
    score: number;
    description: string;
  };
  bikeScore: {
    score: number;
    description: string;
  };
  dataSource: string;
  lastUpdated: string;
}

// =============================================================================
// Amenities & POIs
// =============================================================================

export type POICategory =
  | 'grocery'
  | 'pharmacy'
  | 'restaurant'
  | 'cafe'
  | 'gym'
  | 'hospital'
  | 'police'
  | 'fire_station'
  | 'school'
  | 'park'
  | 'bank'
  | 'gas_station'
  | 'shopping'
  | 'entertainment';

export interface PointOfInterest {
  id: string;
  name: string;
  category: POICategory;
  address: string;
  coordinates: Coordinates;
  distance: number;
  walkingTime: number;
  rating?: number;
  reviewCount?: number;
  priceLevel?: 1 | 2 | 3 | 4;
  isOpen?: boolean;
  openingHours?: string[];
  photoUrl?: string;
}

export interface AmenityDensity {
  category: POICategory;
  count: number;
  nearest?: PointOfInterest;
  averageDistance: number;
  within10MinWalk: number;
}

export interface AmenitiesScore {
  overall: number;
  overallScore?: number; // Alias for backward compatibility
  categories: {
    grocery: number;
    dining: number;
    healthcare: number;
    entertainment: number;
    shopping: number;
  };
  highlights: {
    totalPOIs: number;
    groceryStores: number;
    restaurants: number;
    healthcare: number;
    parks: number;
    gyms: number;
  };
  isFoodDesert: boolean;
  nearestByCategory: Record<string, POI>;
  nearby?: Array<{ name: string; category: string; distance: number; rating: number | null }>;
  dataSource: string;
  lastUpdated: string;
}

// =============================================================================
// Vibe Algorithm
// =============================================================================

export type VibeLabel =
  | 'urban_oasis'
  | 'suburban_comfort'
  | 'up_and_coming'
  | 'car_country'
  | 'hidden_gem'
  | 'food_desert'
  | 'transit_hub'
  | 'needs_attention'
  | 'balanced';

export type VibeConfidence = 'high' | 'medium' | 'low';

export interface VibeFactors {
  safetyWeight: number;
  walkabilityWeight: number;
  transitWeight: number;
  amenitiesWeight: number;
}

export interface VibeScore {
  overall: number;
  label: VibeLabel;
  confidence: VibeConfidence;
  factors: VibeFactors;
  breakdown: {
    safety: number;
    walkability: number;
    transit: number;
    amenities: number;
  };
  summary: string;
  pros: string[];
  cons: string[];
}

// =============================================================================
// Location Pulse (Complete Analysis)
// =============================================================================

export interface DataSource {
  name: string;
  lastUpdated: Date;
  coverage: 'full' | 'partial' | 'none';
}

export interface LocationPulse {
  id: string;
  location: Location;
  analyzedAt: Date;
  safetyScore: SafetyScore;
  mobilityScores: MobilityScores;
  amenitiesScore: AmenitiesScore;
  vibeScore: VibeScore;
  dataQuality: 'complete' | 'partial' | 'limited';
  dataSources: DataSource[];
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
