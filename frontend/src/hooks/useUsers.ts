import { useQuery, useMutation, useQueryClient } from 'react-query';
import { userApi, attendanceApi } from '../services/api';
import { FollowUserRequest } from '../types';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/useAppStore';

// Get all users
export const useUsers = (limit = 50, offset = 0) => {
  return useQuery(
    ['users', limit, offset],
    () => userApi.getAll(limit, offset),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};

// Get user by ID
export const useUser = (id: number) => {
  return useQuery(
    ['user', id],
    () => userApi.getById(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Get user with stats
export const useUserWithStats = (id: number) => {
  return useQuery(
    ['user-stats', id],
    () => userApi.getWithStats(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Get user friends
export const useUserFriends = (id: number) => {
  return useQuery(
    ['user-friends', id],
    () => userApi.getFriends(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Get friends attending session
export const useFriendsAttendingSession = (userId: number, sessionId: number) => {
  return useQuery(
    ['friends-attending', userId, sessionId],
    () => userApi.getFriendsAttending(userId, sessionId),
    {
      enabled: !!userId && !!sessionId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
};

// Create user mutation
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (userData: { email: string; name: string; avatar_url?: string }) => userApi.create(userData),
    {
      onSuccess: (_data) => {
        toast.success('User created successfully!');
        
        // Invalidate users list
        queryClient.invalidateQueries(['users']);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to create user';
        toast.error(message);
      },
    }
  );
};

// Follow user mutation
export const useFollowUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ userId, data }: { userId: number; data: FollowUserRequest }) => userApi.follow(userId, data),
    {
      onSuccess: (_data, variables) => {
        toast.success('User followed successfully!');
        
        // Invalidate related queries
        queryClient.invalidateQueries(['user-friends', variables.userId]);
        queryClient.invalidateQueries(['friends-attending', variables.userId]);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to follow user';
        toast.error(message);
      },
    }
  );
};

// Unfollow user mutation
export const useUnfollowUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ userId, data }: { userId: number; data: FollowUserRequest }) => userApi.unfollow(userId, data),
    {
      onSuccess: (_data, variables) => {
        toast.success('User unfollowed successfully!');
        
        // Invalidate related queries
        queryClient.invalidateQueries(['user-friends', variables.userId]);
        queryClient.invalidateQueries(['friends-attending', variables.userId]);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to unfollow user';
        toast.error(message);
      },
    }
  );
};

// Get user attendance stats
export const useUserAttendanceStats = (userId: number) => {
  return useQuery(
    ['user-attendance-stats', userId],
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
    ['user-current-streak', userId],
    () => attendanceApi.getCurrentStreak(userId),
    {
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Update user profile
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ userId, profileData }: { userId: number; profileData: { name?: string; email?: string } }) =>
      userApi.updateProfile(userId, profileData),
    {
      onSuccess: (_data, variables) => {
        toast.success('Profile updated successfully');
        
        // Update the current user in the store
        const currentUser = useAppStore.getState().currentUser;
        if (currentUser && currentUser.id === variables.userId) {
          useAppStore.getState().setCurrentUser({
            ...currentUser,
            name: variables.profileData.name || currentUser.name,
            email: variables.profileData.email || currentUser.email,
          });
        }
        
        // Comprehensive invalidation to ensure UI updates immediately
        queryClient.invalidateQueries(['user', variables.userId]);
        queryClient.invalidateQueries(['admin', 'users']);
        queryClient.invalidateQueries(['users']);
        queryClient.invalidateQueries(['user-stats', variables.userId]);
        queryClient.invalidateQueries(['attendance-stats', variables.userId]);
        
        // Force refetch to ensure data is fresh
        queryClient.refetchQueries(['user', variables.userId]);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to update profile';
        toast.error(message);
      },
    }
  );
};

