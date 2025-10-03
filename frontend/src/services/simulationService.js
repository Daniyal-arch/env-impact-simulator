import api from './api';
import { API_ENDPOINTS } from '../utils/constants';

export const simulationService = {
  // Run structured simulation
  runSimulation: async (data) => {
    const response = await api.post(API_ENDPOINTS.SIMULATE, data);
    return response.data;
  },

  // Run natural language simulation
  runNLSimulation: async (query) => {
    const response = await api.post(API_ENDPOINTS.NL_SIMULATE, { query });
    return response.data;
  },

  // Get supported countries
  getCountries: async () => {
    const response = await api.get(API_ENDPOINTS.COUNTRIES);
    return response.data;
  },

  // Health check
  checkHealth: async () => {
    const response = await api.get(API_ENDPOINTS.HEALTH);
    return response.data;
  }
};

export default simulationService;