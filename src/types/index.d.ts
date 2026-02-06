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
    overall: number;
    grade: SafetyGrade;
    riskLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
    trend: 'improving' | 'stable' | 'declining';
    vsNational: number;
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
export type WalkabilityCategory = 'walkers_paradise' | 'very_walkable' | 'somewhat_walkable' | 'car_dependent' | 'almost_all_errands';
export type TransitCategory = 'excellent_transit' | 'riders_paradise' | 'good_transit' | 'some_transit' | 'minimal_transit';
export type BikeCategory = 'bikers_paradise' | 'very_bikeable' | 'bikeable' | 'somewhat_bikeable';
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
export type POICategory = 'grocery' | 'pharmacy' | 'restaurant' | 'cafe' | 'gym' | 'hospital' | 'police' | 'fire_station' | 'school' | 'park' | 'bank' | 'gas_station' | 'shopping' | 'entertainment';
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
export type POI = PointOfInterest;
export interface AmenityDensity {
    category: POICategory;
    count: number;
    nearest?: PointOfInterest;
    averageDistance: number;
    within10MinWalk: number;
}
export interface AmenitiesScore {
    overall: number;
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
export type VibeLabel = 'urban_oasis' | 'suburban_comfort' | 'up_and_coming' | 'car_country' | 'hidden_gem' | 'food_desert' | 'transit_hub' | 'needs_attention' | 'balanced';
export type VibeConfidence = 'high' | 'medium' | 'low';
export interface VibeFactors {
    safetyWeight: number;
    walkabilityWeight: number;
    transitWeight: number;
    amenitiesWeight: number;
}
export type SearchIntent = 'moving_family' | 'moving_single' | 'visiting' | 'driving_through' | 'investment' | 'curious';
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
export interface DataSource {
    name: string;
    lastUpdated: Date;
    coverage: 'full' | 'partial' | 'none';
}
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
    winner: number;
    difference: number;
}
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
    pulse?: LocationPulse;
}
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
export interface ApiProviderStatus {
    name: string;
    status: 'operational' | 'degraded' | 'down';
    latency?: number;
    lastChecked: Date;
}
export type ApiProvider = 'google_places' | 'walkscore' | 'crimeometer' | 'mapbox' | 'foursquare' | 'attom';
export type MapLayer = 'crime_heatmap' | 'poi_markers' | 'transit_lines' | 'bike_lanes' | 'walkability_zones';
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
