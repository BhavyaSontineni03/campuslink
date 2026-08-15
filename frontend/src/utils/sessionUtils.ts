import { SessionWithCapacity } from '../types';

export const getSessionColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Fitness': 'bg-purple-600/80',
    'Sports': 'bg-orange-600/80',
    'Academic': 'bg-blue-600/80',
    'Cooking': 'bg-pink-600/80',
    'Arts': 'bg-teal-600/80',
    'Games': 'bg-yellow-600/80',
    'Literature': 'bg-indigo-600/80',
    'Dance': 'bg-green-600/80',
    'Technology': 'bg-blue-600/80',
    'Entertainment': 'bg-pink-600/80',
  };
  
  return colors[category] || 'bg-blue-600/80';
};

export const getSessionIcon = (category: string): string => {
  const icons: Record<string, string> = {
    'Fitness': '💪',
    'Sports': '⚽',
    'Academic': '📚',
    'Cooking': '👨‍🍳',
    'Arts': '🎨',
    'Games': '🎮',
    'Literature': '📖',
    'Dance': '💃',
    'Technology': '💻',
    'Entertainment': '🎬',
  };
  
  return icons[category] || '📅';
};

export const getSessionStatus = (session: SessionWithCapacity): 'available' | 'full' | 'waitlisted' => {
  if (session.remaining_seats > 0) {
    return 'available';
  }
  
  // When session is full, always show as 'waitlisted' so people can join waitlist
  return 'waitlisted';
};

export const getSessionStatusColor = (status: 'available' | 'full' | 'waitlisted'): string => {
  const colors: Record<string, string> = {
    'available': 'text-success-600 bg-success-50',
    'full': 'text-danger-600 bg-danger-50',
    'waitlisted': 'text-warning-600 bg-warning-50',
  };
  
  return colors[status] || 'text-gray-600 bg-gray-50';
};

export const getSessionStatusText = (status: 'available' | 'full' | 'waitlisted'): string => {
  const texts: Record<string, string> = {
    'available': 'Available',
    'full': 'Full',
    'waitlisted': 'Waitlist',
  };
  
  return texts[status] || 'Unknown';
};

export const getCapacityPercentage = (session: SessionWithCapacity): number => {
  return Math.round((session.approved_count / session.capacity) * 100);
};

export const getCapacityColor = (percentage: number): string => {
  if (percentage < 50) return 'bg-success-500';
  if (percentage < 80) return 'bg-warning-500';
  return 'bg-danger-500';
};

export const getSessionPopularity = (session: SessionWithCapacity): 'low' | 'medium' | 'high' => {
  const totalReservations = session.approved_count + session.waitlisted_count;
  const popularityRatio = totalReservations / session.capacity;
  
  if (popularityRatio >= 1.5) return 'high';
  if (popularityRatio >= 1.0) return 'medium';
  return 'low';
};

export const getPopularityBadge = (popularity: 'low' | 'medium' | 'high'): string => {
  const badges: Record<string, string> = {
    'low': '🟢',
    'medium': '🟡',
    'high': '🔥',
  };
  
  return badges[popularity] || '🟢';
};

export const getPopularityText = (popularity: 'low' | 'medium' | 'high'): string => {
  const texts: Record<string, string> = {
    'low': 'Low Demand',
    'medium': 'Popular',
    'high': 'Very Popular',
  };
  
  return texts[popularity] || 'Low Demand';
};

export const getPopularityColor = (popularity: 'low' | 'medium' | 'high'): string => {
  const colors: Record<string, string> = {
    'low': 'text-success-600 bg-success-50 dark:text-mint-200 dark:bg-mint-500/20',
    'medium': 'text-warning-600 bg-warning-50 dark:text-warning-500 dark:bg-warning-500/20',
    'high': 'text-danger-600 bg-danger-50 dark:text-red-200 dark:bg-danger-500/20',
  };
  
  return colors[popularity] || 'text-success-600 bg-success-50 dark:text-mint-200 dark:bg-mint-500/20';
};
