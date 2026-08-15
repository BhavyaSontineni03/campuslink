import { useQuery, useMutation, useQueryClient } from 'react-query';
import { sessionApi, reservationApi, attendanceApi, feedApi } from '../services/api';
import { CreateReservationRequest } from '../types';
import toast from 'react-hot-toast';

// Get all sessions
export const useSessions = (params?: { category?: string; from?: string; to?: string }) => {
  return useQuery(
    ['sessions', params],
    () => sessionApi.getAll(params),
    {
      staleTime: 15 * 1000, // 15 seconds - more responsive
      cacheTime: 2 * 60 * 1000, // 2 minutes
    }
  );
};

// Get session by ID
export const useSession = (id: number, userId?: number) => {
  return useQuery(
    ['session', id, userId],
    () => sessionApi.getById(id, userId),
    {
      enabled: !!id,
      staleTime: 15 * 1000, // 15 seconds - more responsive
      cacheTime: 2 * 60 * 1000, // 2 minutes
    }
  );
};

// Get popular sessions
export const usePopularSessions = (limit = 10) => {
  return useQuery(
    ['sessions', 'popular', limit],
    () => sessionApi.getPopular(limit),
    {
      staleTime: 30 * 1000, // 30 seconds - more responsive
      cacheTime: 2 * 60 * 1000, // 2 minutes
    }
  );
};

// Get session categories
export const useSessionCategories = () => {
  return useQuery(
    ['sessions', 'categories'],
    sessionApi.getCategories,
    {
      staleTime: 30 * 60 * 1000, // 30 minutes
    }
  );
};

// Get session utilization stats
export const useSessionUtilization = () => {
  return useQuery(
    ['sessions', 'utilization'],
    sessionApi.getUtilization,
    {
      staleTime: 15 * 60 * 1000, // 15 minutes
    }
  );
};

// Search sessions by relevance (debounced by the caller)
export const useSessionSearch = (query: string) => {
  const trimmed = query.trim();
  return useQuery(
    ['sessions', 'search', trimmed],
    () => sessionApi.search(trimmed),
    {
      enabled: trimmed.length > 0,
      staleTime: 15 * 1000,
      keepPreviousData: true,
    }
  );
};

// Personalized recommended feed for signed-in users
export const useRecommendedFeed = (enabled: boolean) => {
  return useQuery(
    ['feed', 'recommended'],
    feedApi.getRecommended,
    {
      enabled,
      staleTime: 30 * 1000,
      retry: 0,
    }
  );
};

// Request reservation mutation
export const useRequestReservation = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data: CreateReservationRequest) => reservationApi.request(data),
    {
      onSuccess: (data, variables) => {
        toast.success(
          data.status === 'approved'
            ? 'Reservation confirmed.'
            : 'Added to waitlist. You will be notified when a spot opens up.'
        );
        
        // Comprehensive invalidation to ensure UI updates immediately
        queryClient.invalidateQueries(['sessions']);
        queryClient.invalidateQueries(['user-reservations', variables.user_id]);
        queryClient.invalidateQueries(['session']);
        queryClient.invalidateQueries(['notifications', variables.user_id]);
        queryClient.invalidateQueries(['notifications', 'unread-count', variables.user_id]);
        
        // Force refetch of user reservations to get updated status
        queryClient.refetchQueries(['user-reservations', variables.user_id]);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to request reservation';
        toast.error(message);
      },
    }
  );
};

// Cancel reservation mutation
export const useCancelReservation = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, userId }: { id: number; userId: number }) => reservationApi.cancel(id, userId),
    {
      onSuccess: (_data, variables) => {
        toast.success('Reservation cancelled successfully');
        
        // Comprehensive invalidation to ensure UI updates immediately
        queryClient.invalidateQueries(['sessions']);
        queryClient.invalidateQueries(['user-reservations', variables.userId]);
        queryClient.invalidateQueries(['session']);
        queryClient.invalidateQueries(['notifications', variables.userId]);
        queryClient.invalidateQueries(['notifications', 'unread-count', variables.userId]);
        
        // Force refetch of user reservations to get updated status
        queryClient.refetchQueries(['user-reservations', variables.userId]);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to cancel reservation';
        toast.error(message);
      },
    }
  );
};

// Get user reservations
export const useUserReservations = (userId: number, status?: string) => {
  return useQuery(
    ['user-reservations', userId, status],
    () => reservationApi.getByUserId(userId, status),
    {
      enabled: !!userId,
      staleTime: 10 * 1000, // 10 seconds - more responsive
      cacheTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
      refetchIntervalInBackground: false, // Don't refetch when tab is not active
    }
  );
};

// Get waitlist position
export const useWaitlistPosition = (reservationId: number, options?: { enabled?: boolean }) => {
  return useQuery(
    ['waitlist-position', reservationId],
    () => reservationApi.getWaitlistPosition(reservationId),
    {
      enabled: options?.enabled !== false && !!reservationId,
      staleTime: 1 * 60 * 1000, // 1 minute
    }
  );
};

// Get session waitlist
export const useSessionWaitlist = (sessionId: number) => {
  return useQuery(
    ['session-waitlist', sessionId],
    () => reservationApi.getSessionWaitlist(sessionId),
    {
      enabled: !!sessionId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
};


// Get recent activity
export const useRecentActivity = (limit = 10) => {
  return useQuery(
    ['recent-activity', limit],
    () => attendanceApi.getRecentActivity(limit),
    {
      staleTime: 1 * 60 * 1000, // 1 minute
    }
  );
};
