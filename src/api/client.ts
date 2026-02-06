// =============================================================================
// CITYPULSE API CLIENT
// Georgia-Focused Location Intelligence using FREE Data Sources
// =============================================================================

import type { ApiResponse, ApiError, Location, LocationPulse, SavedLocation, VibeFactors, SearchIntent } from '@/types';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

// Only use localhost fallback in development to prevent local network access popup in production
const getDefaultBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production without VITE_API_URL, use relative path (same origin)
  if (import.meta.env.PROD) {
    return '/api';
  }
  // In development, use localhost
  return 'http://localhost:3001/api';
};

const config: ApiConfig = {
  baseUrl: getDefaultBaseUrl(),
  timeout: 90000,
};

export function getConfig(): ApiConfig {
  return { ...config };
}

// -----------------------------------------------------------------------------
// Token Management
// -----------------------------------------------------------------------------

const TOKEN_KEY = 'citypulse_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    console.error('Failed to store auth token');
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    console.error('Failed to clear auth token');
  }
}

// -----------------------------------------------------------------------------
// Request Helpers
// -----------------------------------------------------------------------------

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  timeout?: number;
}

function buildHeaders(options: RequestOptions): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });

  if (!options.skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return headers;
}

function buildUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${config.baseUrl}${normalizedEndpoint}`;
}

// -----------------------------------------------------------------------------
// API Error Handling
// -----------------------------------------------------------------------------

export class ApiRequestError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(error: ApiError, status: number = 500) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

// -----------------------------------------------------------------------------
// Core Request Function
// -----------------------------------------------------------------------------

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, timeout = config.timeout } = options;

  const url = buildUrl(endpoint);
  const headers = buildHeaders(options);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error: ApiError = data?.error || {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Request failed',
      };

      if (response.status === 401) {
        clearStoredToken();
      }

      return { success: false, error };
    }

    return {
      success: true,
      data: data?.data ?? data,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: { code: 'TIMEOUT', message: 'Request timed out' },
      };
    }

    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
    };
  }
}

// -----------------------------------------------------------------------------
// HTTP Method Shortcuts
// -----------------------------------------------------------------------------

export async function get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { ...options, method: 'GET' });
}

export async function post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { ...options, method: 'POST', body });
}

export async function patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { ...options, method: 'PATCH', body });
}

export async function del<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { ...options, method: 'DELETE' });
}

// -----------------------------------------------------------------------------
// Auth API
// -----------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export async function login(email: string, password: string) {
  const response = await post<AuthResponse>('/auth/login', { email, password });
  if (response.success && response.data?.token) {
    setStoredToken(response.data.token);
  }
  return response;
}

export async function register(data: { email: string; password: string; firstName?: string; lastName?: string }) {
  const response = await post<AuthResponse>('/auth/register', data);
  if (response.success && response.data?.token) {
    setStoredToken(response.data.token);
  }
  return response;
}

export async function logout() {
  clearStoredToken();
  return post('/auth/logout');
}

export async function getMe() {
  return get<AuthUser>('/auth/me');
}

// -----------------------------------------------------------------------------
// Autocomplete API (Nominatim - Free, Georgia-Only)
// -----------------------------------------------------------------------------

export interface AutocompletePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lng: number;
}

export async function autocomplete(input: string) {
  if (input.length < 2) {
    return { success: true, data: [] } as ApiResponse<AutocompletePrediction[]>;
  }
  const params = new URLSearchParams({ q: input });
  return get<AutocompletePrediction[]>(`/pulse/autocomplete?${params}`);
}

// -----------------------------------------------------------------------------
// Pulse API (Location Analysis - Free Data Sources)
// -----------------------------------------------------------------------------

export type WeightPresetName = 'balanced' | 'safety_first' | 'urban_explorer' | 'commuter' | 'foodie';

export interface PulseRequest {
  address?: string;
  lat?: number;
  lng?: number;
  weightPreset?: WeightPresetName;
  weights?: Partial<VibeFactors>;
  intent?: SearchIntent;
}

/**
 * Analyze a location by address string (Georgia only)
 * @param intent - Optional search intent for personalized AI insights
 */
export async function analyzeByAddress(address: string, weightPreset?: WeightPresetName, intent?: SearchIntent) {
  return post<LocationPulse>('/pulse/analyze-address', { address, weightPreset, intent });
}

/**
 * Analyze a location by coordinates (Georgia only)
 * @param intent - Optional search intent for personalized AI insights
 */
export async function analyzeByCoordinates(lat: number, lng: number, weightPreset?: WeightPresetName, intent?: SearchIntent) {
  return post<LocationPulse>('/pulse/analyze', { lat, lng, weightPreset, intent });
}

/**
 * Analyze a location - auto-detects whether to use address or coordinates
 */
export async function analyzePulse(request: PulseRequest) {
  if (request.address) {
    return post<LocationPulse>('/pulse/analyze-address', request);
  }
  if (request.lat !== undefined && request.lng !== undefined) {
    return post<LocationPulse>('/pulse/analyze', request);
  }
  return {
    success: false,
    error: { code: 'INVALID_REQUEST', message: 'Either address or coordinates required' },
  } as ApiResponse<LocationPulse>;
}

export interface WeightPreset {
  name: string;
  label: string;
  description: string;
  weights: VibeFactors;
}

export async function getWeightPresets() {
  return get<WeightPreset[]>('/pulse/weight-presets');
}

// -----------------------------------------------------------------------------
// Georgia Coverage Info
// -----------------------------------------------------------------------------

export interface GeorgiaCoverage {
  state: string;
  counties: number;
  countiesWithCrimeData: number;
  cities: number;
  zipCodes: number;
  dataSources: Array<{
    name: string;
    type: string;
    coverage: string;
  }>;
}

export async function getGeorgiaCoverage() {
  return get<GeorgiaCoverage>('/pulse/georgia-coverage');
}

// -----------------------------------------------------------------------------
// Compare API
// -----------------------------------------------------------------------------

export interface CompareRequest {
  addresses: string[];
}

export interface ComparisonMetric {
  name: string;
  values: number[];
  winner: number;
  difference: number;
}

export interface CompareResponse {
  locations: LocationPulse[];
  winner: {
    index: number;
    location: Location;
    margin: number;
  };
  metrics: ComparisonMetric[];
}

export async function compareLocations(request: CompareRequest) {
  return post<CompareResponse>('/compare', request);
}

// -----------------------------------------------------------------------------
// Saved Locations API
// -----------------------------------------------------------------------------

export async function getSavedLocations() {
  return get<SavedLocation[]>('/saved');
}

export async function saveLocation(data: {
  address: string;
  city: string;
  county: string;
  zipCode: string;
  lat: number;
  lng: number;
  nickname?: string;
  notes?: string;
  pulseData?: string;
}) {
  return post<SavedLocation>('/saved', data);
}

export async function updateSavedLocation(id: string, data: { nickname?: string; notes?: string }) {
  return patch<SavedLocation>(`/saved/${id}`, data);
}

export async function deleteSavedLocation(id: string) {
  return del(`/saved/${id}`);
}

// -----------------------------------------------------------------------------
// Response Helpers
// -----------------------------------------------------------------------------

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function createErrorResponse<T>(code: string, message: string, details?: Record<string, unknown>): ApiResponse<T> {
  return { success: false, error: { code, message, details } };
}

export { config as apiConfig };
