import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminApi } from '../services/adminApi';
import toast from 'react-hot-toast';

// Admin overview hook
export const useAdminOverview = () => {
  return useQuery(
    ['admin', 'overview'],
    async () => {
      const response = await adminApi.getOverview();
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};

// Admin users hook
export const useAdminUsers = (page: number = 1, limit: number = 20, filters?: any) => {
  return useQuery(
    ['admin', 'users', page, limit, filters],
    async () => {
      const response = await adminApi.getUsers(page, limit, filters);
      return response.data;
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Admin sessions hook
export const useAdminSessions = (page: number = 1, limit: number = 20, filters?: any) => {
  return useQuery(
    ['admin', 'sessions', page, limit, filters],
    async () => {
      const response = await adminApi.getSessions(page, limit, filters);
      return response.data;
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Admin reservations hook
export const useAdminReservations = (page: number = 1, limit: number = 20, filters?: any) => {
  return useQuery(
    ['admin', 'reservations', page, limit, filters],
    async () => {
      const response = await adminApi.getReservations(page, limit, filters);
      return response.data;
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Admin analytics hook
export const useAdminAnalytics = (period: number = 30) => {
  return useQuery(
    ['admin', 'analytics', period],
    async () => {
      const response = await adminApi.getAnalytics(period);
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};

// Update user role mutation
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ userId, role }: { userId: number; role: string }) => 
      adminApi.updateUserRole(userId, role),
    {
      onSuccess: () => {
        toast.success('User role updated successfully');
        queryClient.invalidateQueries(['admin', 'users']);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to update user role';
        toast.error(message);
      },
    }
  );
};

// Toggle user status mutation
export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ userId, isActive }: { userId: number; isActive: boolean }) => 
      adminApi.toggleUserStatus(userId, isActive),
    {
      onSuccess: () => {
        toast.success('User status updated successfully');
        queryClient.invalidateQueries(['admin', 'users']);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to update user status';
        toast.error(message);
      },
    }
  );
};

// Delete user mutation
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (userId: number) => adminApi.deleteUser(userId),
    {
      onSuccess: () => {
        toast.success('User deleted successfully');
        queryClient.invalidateQueries(['admin', 'users']);
        queryClient.invalidateQueries(['admin', 'overview']);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to delete user';
        toast.error(message);
      },
    }
  );
};

// Delete session mutation
export const useDeleteSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (sessionId: number) => adminApi.deleteSession(sessionId),
    {
      onSuccess: () => {
        toast.success('Session deleted successfully');
        queryClient.invalidateQueries(['admin', 'sessions']);
        queryClient.invalidateQueries(['sessions']);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to delete session';
        toast.error(message);
      },
    }
  );
};

// Update reservation status mutation
export const useUpdateReservationStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ reservationId, status }: { reservationId: number; status: string }) => 
      adminApi.updateReservationStatus(reservationId, status),
    {
      onSuccess: () => {
        toast.success('Reservation status updated successfully');
        queryClient.invalidateQueries(['admin', 'reservations']);
        queryClient.invalidateQueries(['reservations']);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to update reservation status';
        toast.error(message);
      },
    }
  );
};
