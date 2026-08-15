import { useQuery, useMutation, useQueryClient } from 'react-query';
import { attendanceApi } from '../services/api';
import { CheckinRequest, CheckoutRequest } from '../types';
import toast from 'react-hot-toast';

// Check in mutation
export const useCheckIn = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data: CheckinRequest) => attendanceApi.checkIn(data),
    {
      onSuccess: (_data, variables) => {
        toast.success('Checked in successfully! 🎉');
        
        // Comprehensive invalidation to ensure UI updates immediately
        queryClient.invalidateQueries(['attendance']);
        queryClient.invalidateQueries(['reservations']);
        queryClient.invalidateQueries(['user-stats']);
        queryClient.invalidateQueries(['attendance-stats', variables.user_id]);
        queryClient.invalidateQueries(['user-reservations', variables.user_id]);
        queryClient.invalidateQueries(['sessions']);
        
        // Force refetch to ensure data is fresh
        queryClient.refetchQueries(['attendance-stats', variables.user_id]);
        queryClient.refetchQueries(['user-reservations', variables.user_id]);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to check in';
        toast.error(message);
      },
    }
  );
};

// Check out mutation
export const useCheckOut = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data: CheckoutRequest) => attendanceApi.checkOut(data),
    {
      onSuccess: (_data, variables) => {
        toast.success('Checked out successfully! 👋');
        
        // Comprehensive invalidation to ensure UI updates immediately
        queryClient.invalidateQueries(['attendance']);
        queryClient.invalidateQueries(['reservations']);
        queryClient.invalidateQueries(['user-stats']);
        queryClient.invalidateQueries(['attendance-stats', variables.user_id]);
        queryClient.invalidateQueries(['user-reservations', variables.user_id]);
        queryClient.invalidateQueries(['sessions']);
        
        // Force refetch to ensure data is fresh
        queryClient.refetchQueries(['attendance-stats', variables.user_id]);
        queryClient.refetchQueries(['user-reservations', variables.user_id]);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to check out';
        toast.error(message);
      },
    }
  );
};

// Get attendance by reservation
export const useAttendanceByReservation = (reservationId: number, options?: { enabled?: boolean }) => {
  return useQuery(
    ['attendance', reservationId],
    () => attendanceApi.getByReservation(reservationId),
    {
      enabled: options?.enabled !== false && !!reservationId,
      staleTime: 1 * 60 * 1000, // 1 minute
      retry: (failureCount, error: any) => {
        // Don't retry on 404 errors (no attendance record exists)
        if (error?.response?.status === 404) {
          return false;
        }
        // Retry other errors up to 3 times
        return failureCount < 3;
      },
      onError: (error: any) => {
        // Don't log 404 errors as they're expected when no attendance record exists
        if (error?.response?.status !== 404) {
          console.error('Error fetching attendance record:', error);
        }
      }
    }
  );
};

// Get user attendance stats
export const useUserAttendanceStats = (userId: number) => {
  return useQuery(
    ['user-stats', userId],
    () => attendanceApi.getUserStats(userId),
    {
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Get user current streak
export const useUserCurrentStreak = (userId: number) => {
  return useQuery(
    ['user-streak', userId],
    () => attendanceApi.getCurrentStreak(userId),
    {
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Get user longest streak
export const useUserLongestStreak = (userId: number) => {
  return useQuery(
    ['user-longest-streak', userId],
    () => attendanceApi.getLongestStreak(userId),
    {
      enabled: !!userId,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};

// Get session attendance
export const useSessionAttendance = (sessionId: number) => {
  return useQuery(
    ['session-attendance', sessionId],
    () => attendanceApi.getSessionAttendance(sessionId),
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
