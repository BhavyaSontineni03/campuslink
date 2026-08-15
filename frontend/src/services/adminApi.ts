import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const adminApi = {
  // Get system overview
  getOverview: () => api.get('/admin/overview'),

  // Get all users with pagination and filters
  getUsers: (page: number = 1, limit: number = 20, filters?: any) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return api.get(`/admin/users?${params}`);
  },

  // Update user role
  updateUserRole: (userId: number, role: string) => 
    api.patch(`/admin/users/${userId}/role`, { role }),

  // Toggle user status
  toggleUserStatus: (userId: number, isActive: boolean) => 
    api.patch(`/admin/users/${userId}/status`, { isActive }),

  // Delete user
  deleteUser: (userId: number) => 
    api.delete(`/admin/users/${userId}`),

  // Get all sessions with pagination and filters
  getSessions: (page: number = 1, limit: number = 20, filters?: any) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return api.get(`/admin/sessions?${params}`);
  },

  // Delete session
  deleteSession: (sessionId: number) => 
    api.delete(`/admin/sessions/${sessionId}`),

  // Get all reservations with pagination and filters
  getReservations: (page: number = 1, limit: number = 20, filters?: any) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return api.get(`/admin/reservations?${params}`);
  },

  // Update reservation status
  updateReservationStatus: (reservationId: number, status: string) => 
    api.patch(`/admin/reservations/${reservationId}/status`, { status }),

  // Get system analytics
  getAnalytics: (period: number = 30) => 
    api.get(`/admin/analytics?period=${period}`),
};
