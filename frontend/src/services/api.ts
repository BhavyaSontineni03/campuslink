import axios from 'axios';
import { ApiResponse, SessionWithCapacity, SessionWithFriends, ReservationWithSession, User, CreateReservationRequest, CheckinRequest, CheckoutRequest, FollowUserRequest, Notification, Favorite, FunnelAnalytics, BanditSnapshot, FunnelStageKey, InteractionType } from '../types';

// Dev default uses Vite proxy (/api -> backend). Production sets VITE_API_URL.
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

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// Session API
export const sessionApi = {
  getAll: async (params?: { category?: string; from?: string; to?: string }): Promise<SessionWithCapacity[]> => {
    const response = await api.get<ApiResponse<SessionWithCapacity[]>>('/sessions', { params });
    return response.data.data || [];
  },

  getById: async (id: number, userId?: number): Promise<SessionWithFriends> => {
    const response = await api.get<ApiResponse<SessionWithFriends>>(`/sessions/${id}`, {
      params: userId ? { userId } : {}
    });
    return response.data.data!;
  },

  getPopular: async (limit = 10): Promise<SessionWithCapacity[]> => {
    const response = await api.get<ApiResponse<SessionWithCapacity[]>>('/sessions/popular', {
      params: { limit }
    });
    return response.data.data || [];
  },

  getUtilization: async () => {
    const response = await api.get<ApiResponse>('/sessions/utilization');
    return response.data.data || [];
  },

  getCategories: async () => {
    const response = await api.get<ApiResponse>('/sessions/categories');
    return response.data.data || [];
  },

  search: async (q: string): Promise<SessionWithCapacity[]> => {
    try {
      const response = await api.get<ApiResponse<SessionWithCapacity[]>>('/sessions/search', {
        params: { q }
      });
      return response.data.data || [];
    } catch {
      return [];
    }
  },

  create: async (sessionData: any) => {
    const response = await api.post<ApiResponse>('/sessions', sessionData);
    return response.data.data;
  },

  delete: async (id: number) => {
    const response = await api.delete<ApiResponse>(`/sessions/${id}`);
    return response.data;
  }
};

// Reservation API
export const reservationApi = {
  request: async (data: CreateReservationRequest) => {
    const response = await api.post<ApiResponse>('/reservations', data);
    return response.data.data;
  },

  cancel: async (id: number, userId: number) => {
    const response = await api.patch<ApiResponse>(`/reservations/${id}/cancel`, { user_id: userId });
    return response.data;
  },

  getById: async (id: number): Promise<ReservationWithSession> => {
    const response = await api.get<ApiResponse<ReservationWithSession>>(`/reservations/${id}`);
    return response.data.data!;
  },

  getByUserId: async (userId: number, status?: string): Promise<ReservationWithSession[]> => {
    const response = await api.get<ApiResponse<ReservationWithSession[]>>(`/users/${userId}/reservations`, {
      params: status ? { status } : {}
    });
    return response.data.data || [];
  },

  getWaitlistPosition: async (id: number) => {
    const response = await api.get<ApiResponse>(`/reservations/${id}/waitlist-position`);
    return response.data.data;
  },

  getSessionWaitlist: async (sessionId: number) => {
    const response = await api.get<ApiResponse>(`/sessions/${sessionId}/waitlist`);
    return response.data.data || [];
  },

  getAttendanceHistory: async (userId: number) => {
    const response = await api.get<ApiResponse>(`/users/${userId}/attendance-history`);
    return response.data.data || [];
  }
};

// Attendance API
export const attendanceApi = {
  checkIn: async (data: CheckinRequest) => {
    const response = await api.post<ApiResponse>('/attendance/checkin', data);
    return response.data.data;
  },

  checkOut: async (data: CheckoutRequest) => {
    const response = await api.post<ApiResponse>('/attendance/checkout', data);
    return response.data.data;
  },

  getByReservation: async (reservationId: number) => {
    try {
      const response = await api.get<ApiResponse>(`/attendance/${reservationId}`);
      return response.data.data;
    } catch (error: any) {
      // Return null for 404 errors (no attendance record exists)
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  getUserStats: async (userId: number) => {
    const response = await api.get<ApiResponse>(`/users/${userId}/attendance-stats`);
    return response.data.data;
  },

  getCurrentStreak: async (userId: number) => {
    const response = await api.get<ApiResponse>(`/users/${userId}/current-streak`);
    return response.data.data;
  },

  getLongestStreak: async (userId: number) => {
    const response = await api.get<ApiResponse>(`/users/${userId}/longest-streak`);
    return response.data.data;
  },

  getSessionAttendance: async (sessionId: number) => {
    const response = await api.get<ApiResponse>(`/sessions/${sessionId}/attendance`);
    return response.data.data || [];
  },

  getRecentActivity: async (limit = 10) => {
    const response = await api.get<ApiResponse>('/attendance/recent', {
      params: { limit }
    });
    return response.data.data || [];
  }
};

// User API
export const userApi = {
  getAll: async (limit = 50, offset = 0) => {
    const response = await api.get<ApiResponse<User[]>>('/users', {
      params: { limit, offset }
    });
    return response.data.data || [];
  },

  getById: async (id: number): Promise<User> => {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data!;
  },

  getWithStats: async (id: number) => {
    const response = await api.get<ApiResponse>(`/users/${id}/stats`);
    return response.data.data;
  },

  getFriends: async (id: number): Promise<User[]> => {
    const response = await api.get<ApiResponse<User[]>>(`/users/${id}/friends`);
    return response.data.data || [];
  },

  getFriendsAttending: async (userId: number, sessionId: number): Promise<User[]> => {
    const response = await api.get<ApiResponse<User[]>>(`/users/${userId}/friends-attending`, {
      params: { sessionId }
    });
    return response.data.data || [];
  },

  create: async (userData: { email: string; name: string; avatar_url?: string }) => {
    const response = await api.post<ApiResponse<User>>('/users', userData);
    return response.data.data!;
  },

  follow: async (userId: number, data: FollowUserRequest) => {
    const response = await api.post<ApiResponse>(`/users/${userId}/follow`, data);
    return response.data;
  },

  unfollow: async (userId: number, data: FollowUserRequest) => {
    const response = await api.delete<ApiResponse>(`/users/${userId}/follow`, { data });
    return response.data;
  },

  followUser: async (userId: number, targetUserId: number) => {
    const response = await api.post<ApiResponse>(`/users/${userId}/follow`, { target_user_id: targetUserId });
    return response.data;
  },

  unfollowUser: async (userId: number, targetUserId: number) => {
    const response = await api.delete<ApiResponse>(`/users/${userId}/follow`, { data: { target_user_id: targetUserId } });
    return response.data;
  },

  updateProfile: async (userId: number, profileData: { name?: string; email?: string }) => {
    const response = await api.patch<ApiResponse<User>>(`/users/${userId}/profile`, profileData);
    return response.data.data!;
  }
};

// Notification API
export const notificationApi = {
  getAll: async (userId: number, page = 1, limit = 20) => {
    const response = await api.get<ApiResponse<{ notifications: Notification[]; total: number }>>(`/users/${userId}/notifications`, {
      params: { page, limit }
    });
    return response.data.data!;
  },

  getUnreadCount: async (userId: number) => {
    const response = await api.get<ApiResponse<{ unread_count: number }>>(`/users/${userId}/notifications/unread-count`);
    return response.data.data!;
  },

  markAsRead: async (userId: number, notificationId: number) => {
    const response = await api.patch<ApiResponse>(`/users/${userId}/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async (userId: number) => {
    const response = await api.patch<ApiResponse>(`/users/${userId}/notifications/read-all`);
    return response.data;
  },

  delete: async (userId: number, notificationId: number) => {
    const response = await api.delete<ApiResponse>(`/users/${userId}/notifications/${notificationId}`);
    return response.data;
  },

  create: async (notificationData: { user_id: number; type: string; title: string; message: string; data?: any }) => {
    const response = await api.post<ApiResponse<Notification>>('/notifications', notificationData);
    return response.data.data!;
  }
};

// Health check
export const healthApi = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

// Favorites API
export const favoriteApi = {
  addToFavorites: async (userId: number, sessionId: number) => {
    const response = await api.post<ApiResponse<Favorite>>(`/users/${userId}/favorites/${sessionId}`);
    return response.data.data!;
  },

  removeFromFavorites: async (userId: number, sessionId: number) => {
    const response = await api.delete<ApiResponse>(`/users/${userId}/favorites/${sessionId}`);
    return response.data;
  },

  toggleFavorite: async (userId: number, sessionId: number) => {
    const response = await api.patch<ApiResponse<{ isFavorited: boolean; favorite?: Favorite }>>(`/users/${userId}/favorites/${sessionId}/toggle`);
    return response.data.data!;
  },

  getUserFavorites: async (userId: number) => {
    const response = await api.get<ApiResponse<Favorite[]>>(`/users/${userId}/favorites`);
    return response.data.data!;
  },

  checkFavoriteStatus: async (userId: number, sessionId: number) => {
    const response = await api.get<ApiResponse<{ isFavorited: boolean; favoriteCount: number }>>(`/users/${userId}/favorites/${sessionId}/status`);
    return response.data.data!;
  }
};

// Organizer API
export const organizerApi = {
  getSessions: async () => {
    const response = await api.get<ApiResponse<SessionWithCapacity[]>>('/organizer/sessions');
    return response.data.data || [];
  },

  getSessionById: async (id: number) => {
    const response = await api.get<ApiResponse<SessionWithCapacity>>(`/organizer/sessions/${id}`);
    return response.data.data!;
  },

  createSession: async (sessionData: any) => {
    const response = await api.post<ApiResponse>('/organizer/sessions', sessionData);
    return response.data.data;
  },

  updateSession: async (id: number, sessionData: any) => {
    const response = await api.put<ApiResponse>(`/organizer/sessions/${id}`, sessionData);
    return response.data.data;
  },

  deleteSession: async (id: number) => {
    const response = await api.delete<ApiResponse>(`/organizer/sessions/${id}`);
    return response.data;
  }
};

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', {
      email,
      password,
    });
    return response.data.data!;
  },

  register: async (data: {
    email: string;
    name: string;
    password: string;
    role?: 'student' | 'organizer';
  }): Promise<{ user: User; token: string }> => {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', data);
    return response.data.data!;
  },
};

// Recommended feed API
export const feedApi = {
  getRecommended: async (): Promise<SessionWithCapacity[]> => {
    try {
      const response = await api.get<ApiResponse<SessionWithCapacity[]>>('/feed/recommended');
      return response.data.data || [];
    } catch {
      return [];
    }
  }
};

// Funnel + bandit analytics API
export const analyticsApi = {
  getFunnel: async (): Promise<FunnelAnalytics | null> => {
    try {
      const response = await api.get<ApiResponse<FunnelAnalytics>>('/analytics/funnel');
      return response.data.data || null;
    } catch {
      return null;
    }
  },

  getBandit: async (): Promise<BanditSnapshot | null> => {
    try {
      const response = await api.get<ApiResponse<BanditSnapshot>>('/analytics/bandit');
      return response.data.data || null;
    } catch {
      return null;
    }
  }
};

// Funnel event tracking API (fire-and-forget, tolerant of a backend that hasn't caught up yet)
// The backend derives the user from the auth token, so only session_id + stage are sent.
export const funnelApi = {
  logEvent: async (data: { session_id: number; stage: FunnelStageKey }): Promise<void> => {
    try {
      await api.post('/funnel/events', data);
    } catch {
      // Tracking is best-effort; ignore failures so it never blocks the user flow.
    }
  }
};

// Interaction tracking API (fire-and-forget). Requires an authenticated user.
export const interactionApi = {
  logInteraction: async (data: { session_id: number; interaction_type: InteractionType }): Promise<void> => {
    try {
      await api.post('/interactions', data);
    } catch {
      // Tracking is best-effort; ignore failures so it never blocks the user flow.
    }
  }
};

export default api;
