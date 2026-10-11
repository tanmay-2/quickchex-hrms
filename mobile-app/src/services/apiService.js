import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/apiConfig';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach JWT Token & Employee ID headers exactly like website frontend
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const empCode = await SecureStore.getItemAsync('emp_code');
      const email = await SecureStore.getItemAsync('email');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (empCode) {
        config.headers['x-emp-code'] = empCode;
        config.headers['x-employee-id'] = empCode;
      }
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

// Response Interceptor: Clean error handling
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
