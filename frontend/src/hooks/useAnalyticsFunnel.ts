import { useQuery } from 'react-query';
import { analyticsApi } from '../services/api';

// Conversion funnel: viewed -> opened -> started_registration -> completed_registration -> attended
// Restricted server-side to organizers/admins, so callers should gate `enabled` on role.
export const useFunnelAnalytics = (enabled: boolean) => {
  return useQuery(['analytics', 'funnel'], analyticsApi.getFunnel, {
    enabled,
    staleTime: 60 * 1000,
    retry: 0,
  });
};

// Snapshot of bandit arm performance behind reminder-timing personalization
export const useBanditSnapshot = (enabled: boolean) => {
  return useQuery(['analytics', 'bandit'], analyticsApi.getBandit, {
    enabled,
    staleTime: 60 * 1000,
    retry: 0,
  });
};
