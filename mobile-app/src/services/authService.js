import * as SecureStore from 'expo-secure-store';
import api from './apiService';
import { API_ENDPOINTS, API_BASE_URL } from '../config/apiConfig';

export const authService = {
  login: async (email, password) => {
    const cleanEmail = email.trim();

    const tryLogin = async (body, headers) => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { Accept: 'application/json', ...headers },
        body,
      });
      const text = await response.text();
      let data = {};
      try { data = JSON.parse(text); } catch {}
      return { response, data };
    };

    // 1. Try JSON login first
    let { response, data } = await tryLogin(
      JSON.stringify({ email: cleanEmail, password }),
      { 'Content-Type': 'application/json' }
    );

    // 2. Fallback to form-encoded if 422
    if (response.status === 422) {
      const params = new URLSearchParams();
      params.append('username', cleanEmail);
      params.append('password', password);
      ({ response, data } = await tryLogin(
        params.toString(),
        { 'Content-Type': 'application/x-www-form-urlencoded' }
      ));
    }

    if (!response.ok) {
      const msg = data?.detail || data?.message || data?.error || `Login failed (${response.status})`;
      throw new Error(msg);
    }

    // Check if backend is asking for OTP (no token in response)
    const token = data?.access_token || data?.accessToken || data?.token || data?.authToken || data?.data?.access_token;
    if (!token) {
      // OTP flow: backend sent OTP to email, we need to show OTP screen
      return { needs_otp: true, email: cleanEmail, data };
    }

    // Direct login: save session and return
    await authService.saveSession(data);
    return { needs_otp: false, email: cleanEmail, data };
  },

  saveSession: async (data) => {
    const token = data.access_token || data.token || '';
    const user = data.user || data;
    const empCode = user.emp_code || user.employeeId || user.employee_id || user.id || '';
    const email = user.email || '';
    const name = user.name || user.full_name || email.split('@')[0] || 'Employee';
    const role = user.role || 'employee';

    if (token) await SecureStore.setItemAsync('token', token);
    if (empCode) await SecureStore.setItemAsync('emp_code', String(empCode));
    if (email) await SecureStore.setItemAsync('email', email);
    await SecureStore.setItemAsync('user_name', name);
    await SecureStore.setItemAsync('user_role', role);
    await SecureStore.setItemAsync('user_data', JSON.stringify(user));
  },

  getSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return null;

      const empCode = await SecureStore.getItemAsync('emp_code');
      const email = await SecureStore.getItemAsync('email');
      const name = await SecureStore.getItemAsync('user_name');
      const role = await SecureStore.getItemAsync('user_role');
      const rawUser = await SecureStore.getItemAsync('user_data');

      return {
        token,
        empCode,
        email,
        name: name || 'Employee',
        role: role || 'employee',
        user: rawUser ? JSON.parse(rawUser) : null,
      };
    } catch (e) {
      console.warn('Error reading session:', e);
      return null;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('emp_code');
      await SecureStore.deleteItemAsync('email');
      await SecureStore.deleteItemAsync('user_name');
      await SecureStore.deleteItemAsync('user_role');
      await SecureStore.deleteItemAsync('user_data');
    } catch (e) {
      console.warn('Error during logout:', e);
    }
  },
};

export default authService;
