import { format, formatDistance, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';

export const formatDate = (date: string | Date, formatStr = 'MMM dd, yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
};

export const formatTime = (date: string | Date, formatStr = 'h:mm a'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
};

export const formatDateTime = (date: string | Date, formatStr = 'MMM dd, yyyy h:mm a'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
};

export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(dateObj)) {
    return `Today at ${formatTime(dateObj)}`;
  }
  
  if (isTomorrow(dateObj)) {
    return `Tomorrow at ${formatTime(dateObj)}`;
  }
  
  if (isYesterday(dateObj)) {
    return `Yesterday at ${formatTime(dateObj)}`;
  }
  
  return formatDistance(dateObj, new Date(), { addSuffix: true });
};

export const isSessionUpcoming = (startTime: string | Date): boolean => {
  const dateObj = typeof startTime === 'string' ? parseISO(startTime) : startTime;
  return dateObj > new Date();
};

export const isSessionOngoing = (startTime: string | Date, endTime: string | Date): boolean => {
  const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
  const end = typeof endTime === 'string' ? parseISO(endTime) : endTime;
  const now = new Date();
  return now >= start && now <= end;
};

export const isSessionPast = (endTime: string | Date): boolean => {
  const dateObj = typeof endTime === 'string' ? parseISO(endTime) : endTime;
  return dateObj < new Date();
};

export const getSessionStatus = (startTime: string | Date, endTime: string | Date): 'upcoming' | 'ongoing' | 'past' => {
  if (isSessionPast(endTime)) return 'past';
  if (isSessionOngoing(startTime, endTime)) return 'ongoing';
  return 'upcoming';
};

export const formatDuration = (startTime: string | Date, endTime: string | Date): string => {
  const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
  const end = typeof endTime === 'string' ? parseISO(endTime) : endTime;
  
  const diffInMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }
  
  const hours = Math.floor(diffInMinutes / 60);
  const minutes = diffInMinutes % 60;
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}m`;
};
