// ==============================================================================
// QUICKCHEX MOBILE APP - AXIOS HTTP CLIENT & INTERCEPTORS (apiService.js)
// ==============================================================================
// Configures the central Axios HTTP client for mobile app network requests:
// 1. Sets base backend URL and request timeout (30 seconds).
// 2. Request Interceptor: Automatically retrieves JWT and employee identity
//    from encrypted Expo SecureStore and attaches them to HTTP headers.
// 3. Response Interceptor: Normalizes error messages from backend responses.
// ==============================================================================

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/apiConfig';

// Create configured Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout for mobile network connections
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ------------------------------------------------------------------------------
// REQUEST INTERCEPTOR: Inject Authentication Headers
// ------------------------------------------------------------------------------
// Runs before every outgoing HTTP request.
// Reads encrypted authentication tokens and identifiers from hardware-backed
// storage (Keychain on iOS, Keystore on Android via Expo SecureStore).
// ------------------------------------------------------------------------------
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const empCode = await SecureStore.getItemAsync('emp_code');
      const email = await SecureStore.getItemAsync('email');

      // Attach standard JWT Bearer token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Attach employee code headers for legacy backend compatibility
      if (empCode) {
        config.headers['x-emp-code'] = empCode;
        config.headers['x-employee-id'] = empCode;
      }
      // Attach user email headers
      if (email) {
        config.headers['x-user-email'] = email;
        config.headers['x-login-email'] = email;
      }
    } catch (e) {
      console.warn('SecureStore retrieval error in apiService:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ------------------------------------------------------------------------------
// RESPONSE INTERCEPTOR: Uniform Error Extraction
// ------------------------------------------------------------------------------
// Extracts the most descriptive error message returned from FastAPI
// (e.g. detail, message, error) so screens can display readable alerts to users.
// ------------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMsg =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Network request failed';
    return Promise.reject(new Error(errorMsg));
  }
);

export default api;
