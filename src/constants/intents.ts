// =============================================================================
// SEARCH INTENT OPTIONS
// Used to personalize AI-generated insights based on user's purpose
// =============================================================================

import type { SearchIntent } from '@/types';

export interface IntentOption {
  value: SearchIntent;
  label: string;
  description: string;
  focusAreas: string[];
}

export const INTENT_OPTIONS: IntentOption[] = [
  {
    value: 'curious',
    label: 'Just curious',
    description: 'Balanced, general overview',
    focusAreas: ['overall', 'safety', 'amenities', 'walkability'],
  },
  {
    value: 'moving_family',
    label: 'Considering moving here',
    description: 'Family focus: schools, safety, parks',
    focusAreas: ['safety', 'schools', 'parks', 'healthcare', 'grocery'],
  },
  {
    value: 'moving_single',
    label: 'Moving here (single/professional)',
    description: 'Nightlife, dining, walkability, transit',
    focusAreas: ['nightlife', 'dining', 'transit', 'walkability', 'gyms'],
  },
  {
    value: 'visiting',
    label: 'Planning to visit/travel',
    description: 'Restaurants, entertainment, attractions',
    focusAreas: ['restaurants', 'entertainment', 'hotels', 'attractions', 'nightlife'],
  },
  {
    value: 'driving_through',
    label: 'Driving through',
    description: 'Gas stations, rest stops, quick food',
    focusAreas: ['gas_station', 'fast_food', 'safety', 'highway_access'],
  },
  {
    value: 'investment',
    label: 'Looking for investment property',
    description: 'Safety, schools, amenities, growth',
    focusAreas: ['safety', 'schools', 'amenities', 'growth_potential', 'transit'],
  },
];

export const DEFAULT_INTENT: SearchIntent = 'curious';

// Helper to get intent by value
export function getIntentOption(value: SearchIntent): IntentOption | undefined {
  return INTENT_OPTIONS.find(opt => opt.value === value);
}
