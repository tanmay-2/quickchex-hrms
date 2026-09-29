import * as Location from 'expo-location';
import api from './apiService';
import { API_ENDPOINTS } from '../config/apiConfig';

export const attendanceService = {
  // Request Device Location Permissions & Coordinates
  getCurrentLocation: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission is required to punch attendance.');
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
    };
  },

  // Punch In or Out
  punch: async (punchType, empCode) => {
    // 1. Get GPS coordinates
    const coords = await attendanceService.getCurrentLocation();

    // 2. Prepare payload
    const payload = {
      emp_code: empCode,
      punch_type: punchType.toLowerCase(), // 'in' or 'out'
      latitude: coords.latitude,
      longitude: coords.longitude,
      location: `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
      timestamp: new Date().toISOString(),
    };

    // 3. Send to backend
    const response = await api.post(API_ENDPOINTS.PUNCH, payload);
    return response.data;
  },

  // Fetch Attendance Records
  getTodayRecords: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.TODAY_ATTENDANCE);
      return response.data;
    } catch {
      return null;
    }
  },

  // Fetch Leave Balance
  getLeaveBalance: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.LEAVE_BALANCE);
      return response.data;
    } catch {
      return null;
    }
  },
};

export default attendanceService;
