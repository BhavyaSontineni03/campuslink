import { useQuery, useMutation, useQueryClient } from 'react-query';
import { favoriteApi } from '../services/api';
import toast from 'react-hot-toast';

// Get user's favorites
export const useFavorites = (userId: number) => {
  return useQuery(
    ['favorites', userId],
    () => favoriteApi.getUserFavorites(userId),
    {
      enabled: !!userId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
};

// Check favorite status for a session
export const useFavoriteStatus = (userId: number, sessionId: number) => {
  return useQuery(
    ['favorite-status', userId, sessionId],
    () => favoriteApi.checkFavoriteStatus(userId, sessionId),
    {
      enabled: !!userId && !!sessionId,
      staleTime: 30 * 1000, // 30 seconds
    }
  );
};

// Toggle favorite status
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ userId, sessionId }: { userId: number; sessionId: number }) =>
      favoriteApi.toggleFavorite(userId, sessionId),
    {
      onSuccess: (data, variables) => {
        // Update the favorite status query
        queryClient.setQueryData(
          ['favorite-status', variables.userId, variables.sessionId],
          data
        );
        
        // Comprehensive invalidation to ensure UI updates immediately
        queryClient.invalidateQueries(['favorites', variables.userId]);
        queryClient.invalidateQueries(['session', variables.sessionId]);
        queryClient.invalidateQueries(['sessions']);
        queryClient.invalidateQueries(['popular-sessions']);
        
        // Force refetch to ensure data is fresh
        queryClient.refetchQueries(['favorites', variables.userId]);
        queryClient.refetchQueries(['session', variables.sessionId]);
        
        toast.success(data.isFavorited ? 'Added to favorites!' : 'Removed from favorites!');
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to update favorite status';
        toast.error(message);
      },
    }
  );
};

// Add to favorites
export const useAddToFavorites = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ userId, sessionId }: { userId: number; sessionId: number }) =>
      favoriteApi.addToFavorites(userId, sessionId),
    {
      onSuccess: (_data, variables) => {
        // Update the favorite status query
        queryClient.setQueryData(
          ['favorite-status', variables.userId, variables.sessionId],
          { isFavorited: true, favoriteCount: 0 } // We don't have count from this response
        );
        
        // Invalidate favorites list
        queryClient.invalidateQueries(['favorites', variables.userId]);
        
        toast.success('Added to favorites!');
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to add to favorites';
        toast.error(message);
      },
    }
  );
};

// Remove from favorites
export const useRemoveFromFavorites = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ userId, sessionId }: { userId: number; sessionId: number }) =>
      favoriteApi.removeFromFavorites(userId, sessionId),
    {
      onSuccess: (_data, variables) => {
        // Update the favorite status query
        queryClient.setQueryData(
          ['favorite-status', variables.userId, variables.sessionId],
          { isFavorited: false, favoriteCount: 0 } // We don't have count from this response
        );
        
        // Invalidate favorites list
        queryClient.invalidateQueries(['favorites', variables.userId]);
        
        toast.success('Removed from favorites!');
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to remove from favorites';
        toast.error(message);
      },
    }
  );
};
