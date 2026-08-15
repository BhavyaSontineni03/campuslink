import { useQuery, useMutation, useQueryClient } from 'react-query';
import { notificationApi } from '../services/api';
import toast from 'react-hot-toast';

// Get notifications for a user
export const useNotifications = (userId: number, page = 1, limit = 20) => {
  return useQuery(
    ['notifications', userId, page, limit],
    () => notificationApi.getAll(userId, page, limit),
    {
      enabled: !!userId,
      staleTime: 15 * 1000, // 15 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
    }
  );
};

// Get unread notifications count
export const useUnreadCount = (userId: number) => {
  return useQuery(
    ['notifications', 'unread-count', userId],
    () => notificationApi.getUnreadCount(userId),
    {
      enabled: !!userId,
      staleTime: 5 * 1000, // 5 seconds
      cacheTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 15 * 1000, // Refetch every 15 seconds for faster updates
    }
  );
};

// Mark notification as read
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ userId, notificationId }: { userId: number; notificationId: number }) =>
      notificationApi.markAsRead(userId, notificationId),
    {
      onSuccess: (_data, variables) => {
        // Invalidate and refetch notifications
        queryClient.invalidateQueries(['notifications', variables.userId]);
        queryClient.invalidateQueries(['notifications', 'unread-count', variables.userId]);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to mark notification as read';
        toast.error(message);
      },
    }
  );
};

// Mark all notifications as read
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (userId: number) => notificationApi.markAllAsRead(userId),
    {
      onSuccess: (_data, userId) => {
        toast.success('All notifications marked as read');
        
        // Invalidate and refetch notifications
        queryClient.invalidateQueries(['notifications', userId]);
        queryClient.invalidateQueries(['notifications', 'unread-count', userId]);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to mark all notifications as read';
        toast.error(message);
      },
    }
  );
};

// Delete notification
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ userId, notificationId }: { userId: number; notificationId: number }) =>
      notificationApi.delete(userId, notificationId),
    {
      onSuccess: (_data, variables) => {
        toast.success('Notification deleted');
        
        // Invalidate and refetch notifications
        queryClient.invalidateQueries(['notifications', variables.userId]);
        queryClient.invalidateQueries(['notifications', 'unread-count', variables.userId]);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to delete notification';
        toast.error(message);
      },
    }
  );
};

// Create notification (for testing or admin use)
export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (notificationData: { user_id: number; type: string; title: string; message: string; data?: any }) =>
      notificationApi.create(notificationData),
    {
      onSuccess: (_data, variables) => {
        toast.success('Notification created');
        
        // Invalidate and refetch notifications for the target user
        queryClient.invalidateQueries(['notifications', variables.user_id]);
        queryClient.invalidateQueries(['notifications', 'unread-count', variables.user_id]);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to create notification';
        toast.error(message);
      },
    }
  );
};
