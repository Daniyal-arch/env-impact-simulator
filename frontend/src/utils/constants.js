export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  SIMULATE: '/simulate/',
  NL_SIMULATE: '/nl/',
  COUNTRIES: '/simulate/countries',
  HEALTH: '/simulate/health'
};

export const COUNTRY_EXAMPLES = [
  { name: 'Brazil', code: 'BRA' },
  { name: 'Pakistan', code: 'PAK' },
  { name: 'Indonesia', code: 'IDN' },
  { name: 'United Kingdom', code: 'GBR' },
  { name: 'India', code: 'IND' }
];

export const SCENARIO_TYPES = {
  PLAUSIBLE: 'plausible',
  AGGRESSIVE: 'aggressive', 
  HYPOTHETICAL: 'hypothetical'
};