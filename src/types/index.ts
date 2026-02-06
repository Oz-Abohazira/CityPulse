// =============================================================================
// CITYPULSE - LOCATION INTELLIGENCE TYPE DEFINITIONS
// Neighborhood Safety & Walkability Analysis
// =============================================================================

// -----------------------------------------------------------------------------
// Core Location Types
// -----------------------------------------------------------------------------

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

export interface SearchQuery {
  query: string;
  location?: Location;
  timestamp: Date;
}

// -----------------------------------------------------------------------------
// Safety & Crime Data (CrimeOMeter / ATTOM)
// -----------------------------------------------------------------------------

export type CrimeCategory =
  | 'violent'      // Murder, assault, robbery
  | 'property'     // Burglary, theft, vandalism
  | 'drugs'        // Drug-related offenses
  | 'other';       // Other offenses

export type SafetyGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export interface CrimeIncident {
  id: string;
  category: CrimeCategory;
  description: string;
  date: string;
  location: Coordinates;
  distance?: number; // meters from search point
}

export interface CrimeStats {
  totalIncidents: number;
  violentCrimeCount: number;
  propertyCrimeCount: number;
  drugCrimeCount: number;
  otherCrimeCount: number;
  crimeRatePer1000: number;
  nationalAverageComparison: number; // percentage vs national avg (100 = average)
  yearOverYearChange: number; // percentage change
  recentIncidents: CrimeIncident[];
}

export interface SafetyScore {
  overall: number; // 0-100 score
  grade: SafetyGrade;
  riskLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  trend: 'improving' | 'stable' | 'declining';
  vsNational: number; // Percentage vs national average
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

// -----------------------------------------------------------------------------
// Walkability & Transit (Walk Score API)
// -----------------------------------------------------------------------------

export type WalkabilityCategory =
  | 'walkers_paradise'     // 90-100
  | 'very_walkable'        // 70-89
  | 'somewhat_walkable'    // 50-69
  | 'car_dependent'        // 25-49
  | 'almost_all_errands';  // 0-24

export type TransitCategory =
  | 'excellent_transit'    // 90-100
  | 'riders_paradise'      // 70-89
  | 'good_transit'         // 50-69
  | 'some_transit'         // 25-49
  | 'minimal_transit';     // 0-24

export type BikeCategory =
  | 'bikers_paradise'      // 90-100
  | 'very_bikeable'        // 70-89
  | 'bikeable'             // 50-69
  | 'somewhat_bikeable';   // 0-24

export interface WalkScore {
  score: number; // 0-100
  category: WalkabilityCategory;
  description: string;
}

export interface TransitScore {
  score: number; // 0-100
  category: TransitCategory;
  description: string;
  nearestTransit?: TransitStop[];
}

export interface BikeScore {
  score: number; // 0-100
  category: BikeCategory;
  description: string;
  bikeInfrastructure: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface TransitStop {
  name: string;
  type: 'subway' | 'bus' | 'rail' | 'ferry' | 'tram';
  distance: number; // meters
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

// -----------------------------------------------------------------------------
// Amenities & Points of Interest (Google Places / FourSquare)
// -----------------------------------------------------------------------------

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
  distance: number; // meters from search point
  walkingTime: number; // minutes
  rating?: number; // 0-5
  reviewCount?: number;
  priceLevel?: 1 | 2 | 3 | 4; // $ to $$$$
  isOpen?: boolean;
  openingHours?: string[];
  photoUrl?: string;
}

// Type alias for backward compatibility
export type POI = PointOfInterest;

export interface AmenityDensity {
  category: POICategory;
  count: number;
  nearest?: PointOfInterest;
  averageDistance: number; // meters
  within10MinWalk: number; // count within 800m
}

export interface AmenitiesScore {
  overall: number; // 0-100
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
  dataSource: string;
  lastUpdated: string;
}

// -----------------------------------------------------------------------------
// The "Vibe" Algorithm - Weighted Composite Score
// -----------------------------------------------------------------------------

export type VibeLabel =
  | 'urban_oasis'           // High walkability, low crime, many amenities
  | 'suburban_comfort'      // Moderate walkability, low crime, decent amenities
  | 'up_and_coming'         // Improving area, mixed scores
  | 'car_country'           // Low walkability but safe with some amenities
  | 'hidden_gem'            // High safety, moderate other scores
  | 'food_desert'           // Low grocery access
  | 'transit_hub'           // Excellent transit but mixed other scores
  | 'needs_attention'       // Multiple low scores
  | 'balanced';             // All scores moderate

export type VibeConfidence = 'high' | 'medium' | 'low';

export interface VibeFactors {
  safetyWeight: number;
  walkabilityWeight: number;
  transitWeight: number;
  amenitiesWeight: number;
}

// -----------------------------------------------------------------------------
// Search Intent (for personalized AI insights)
// -----------------------------------------------------------------------------

export type SearchIntent =
  | 'moving_family'      // Family considering moving (schools, safety, parks)
  | 'moving_single'      // Single/professional moving (nightlife, transit, dining)
  | 'visiting'           // Tourist/visitor (restaurants, entertainment, hotels)
  | 'driving_through'    // Just passing through (gas, food, rest stops)
  | 'investment'         // Investment property (safety trends, schools, growth)
  | 'curious';           // Just curious (balanced overview)

export interface VibeScore {
  overall: number; // 0-100 weighted composite
  label: VibeLabel;
  confidence: VibeConfidence;
  factors: VibeFactors;
  breakdown: {
    safety: number;
    walkability: number;
    transit: number;
    amenities: number;
  };
  summary: string; // Human-readable summary
  pros: string[];
  cons: string[];
}

// -----------------------------------------------------------------------------
// Complete Location Analysis (The "Pulse")
// -----------------------------------------------------------------------------

export interface LocationPulse {
  id: string;
  location: Location;
  analyzedAt: Date;

  // Core Scores
  safetyScore: SafetyScore;
  mobilityScores: MobilityScores;
  amenitiesScore: AmenitiesScore;

  // Composite
  vibeScore: VibeScore;

  // Metadata
  dataQuality: 'complete' | 'partial' | 'limited';
  dataSources: DataSource[];
}

export interface DataSource {
  name: string;
  lastUpdated: Date;
  coverage: 'full' | 'partial' | 'none';
}

// -----------------------------------------------------------------------------
// Comparison View
// -----------------------------------------------------------------------------

export interface LocationComparison {
  id: string;
  locations: LocationPulse[];
  createdAt: Date;
  winner?: {
    locationIndex: number;
    category: 'overall' | 'safety' | 'walkability' | 'transit' | 'amenities';
  };
}

export interface ComparisonMetric {
  name: string;
  values: number[];
  winner: number; // index of winning location
  difference: number; // percentage difference
}

// -----------------------------------------------------------------------------
// User & Search History
// -----------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  defaultWeights: VibeFactors;
  savedLocations: SavedLocation[];
  recentSearches: SearchQuery[];
}

export interface SavedLocation {
  id: string;
  location: Location;
  nickname?: string;
  notes?: string;
  savedAt: Date;
  lastViewed?: Date;
  pulse?: LocationPulse; // Cached analysis
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// -----------------------------------------------------------------------------
// API Provider Configurations
// -----------------------------------------------------------------------------

export interface ApiProviderStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency?: number;
  lastChecked: Date;
}

export type ApiProvider =
  | 'google_places'
  | 'walkscore'
  | 'crimeometer'
  | 'mapbox'
  | 'foursquare'
  | 'attom';

// -----------------------------------------------------------------------------
// Map & Visualization Types
// -----------------------------------------------------------------------------

export type MapLayer =
  | 'crime_heatmap'
  | 'poi_markers'
  | 'transit_lines'
  | 'bike_lanes'
  | 'walkability_zones';

export interface MapViewport {
  center: Coordinates;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface MapConfig {
  viewport: MapViewport;
  activeLayers: MapLayer[];
  showLegend: boolean;
}

// -----------------------------------------------------------------------------
// Auth Types
// -----------------------------------------------------------------------------

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}
