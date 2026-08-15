import { motion } from 'framer-motion';
import { Clock, MapPin, Users, CheckCircle, Clock as ClockIcon } from 'lucide-react';
import { SessionWithCapacity } from '../types';
import { useUserReservations } from '../hooks/useSessions';
import { memo } from 'react';
import { 
  getSessionColor, 
  getSessionIcon, 
  getSessionStatus, 
  getSessionStatusColor, 
  getSessionStatusText,
  getCapacityPercentage,
  getCapacityColor,
  getSessionPopularity, 
  getPopularityText,
  getPopularityColor
} from '../utils/sessionUtils';
import { formatDateTime, formatDuration } from '../utils/dateUtils';
import { cn } from '../utils/cn';

interface SessionCardProps {
  session: SessionWithCapacity;
  currentUserId?: number;
  onReserve?: (sessionId: number) => void;
  onViewDetails?: (sessionId: number) => void;
}

const SessionCard = memo(({ 
  session, 
  currentUserId, 
  onReserve, 
  onViewDetails 
}: SessionCardProps) => {
  const color = getSessionColor(session.category);
  const icon = getSessionIcon(session.category);
  const status = getSessionStatus(session);
  const statusColor = getSessionStatusColor(status);
  const statusText = getSessionStatusText(status);
  const capacityPercentage = getCapacityPercentage(session);
  const capacityColor = getCapacityColor(capacityPercentage);
  const popularity = getSessionPopularity(session);
  const popularityText = getPopularityText(popularity);
  const popularityColor = getPopularityColor(popularity);

  // Check if user has already reserved this session
  const { data: userReservations = [] } = useUserReservations(currentUserId || 0);
  const userReservation = userReservations.find(r => r.session_id === session.id);
  const reservationStatus = userReservation?.status;

  // Smart user-centric status display
  const getUserStatusInfo = () => {
    if (!currentUserId || !reservationStatus) {
      return { text: statusText, color: statusColor, icon: null };
    }

    // User has a reservation - show their personal status
    if (reservationStatus === 'approved') {
      return { 
        text: 'Confirmed', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        icon: <CheckCircle className="h-3 w-3 mr-1" />
      };
    }
    
    if (reservationStatus === 'waitlisted') {
      return { 
        text: 'Waitlisted', 
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        icon: <ClockIcon className="h-3 w-3 mr-1" />
      };
    }

    if (reservationStatus === 'cancelled') {
      return { 
        text: 'Cancelled', 
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        icon: <ClockIcon className="h-3 w-3 mr-1" />
      };
    }

    // No reservation - show session availability
    return { text: statusText, color: statusColor, icon: null };
  };

  const userStatus = getUserStatusInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative glass-card-hover overflow-hidden cursor-pointer"
      onClick={() => onViewDetails?.(session.id)}
    >
      {/* Gradient header */}
      <div className={cn('h-2 w-full', color)} />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg', color)}>
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink group-hover:text-primary-600 transition-colors duration-150">
                {session.title}
              </h3>
              <p className="text-sm text-ink-muted">
                {session.category}
              </p>
            </div>
          </div>
          
          {/* Status badge */}
          <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', userStatus.color)}>
            {userStatus.icon}
            {userStatus.text}
          </span>
        </div>

        {/* Description */}
        {session.description && (
          <p className="text-ink-muted text-sm mb-4 line-clamp-2">
            {session.description}
          </p>
        )}

        {/* Details */}
        <div className="space-y-3 mb-4">
          {/* Time */}
          <div className="flex items-center text-sm text-ink-muted">
            <Clock className="h-4 w-4 mr-2 text-ink-soft" />
            <span>{formatDateTime(session.start_time)}</span>
            <span className="mx-2">&middot;</span>
            <span>{formatDuration(session.start_time, session.end_time)}</span>
          </div>

          {/* Location */}
          {session.location && (
            <div className="flex items-center text-sm text-ink-muted">
              <MapPin className="h-4 w-4 mr-2 text-ink-soft" />
              <span>{session.location}</span>
            </div>
          )}

          {/* Capacity */}
          <div className="flex items-center text-sm text-ink-muted">
            <Users className="h-4 w-4 mr-2 text-ink-soft" />
            <span>{session.approved_count} / {session.capacity} seats</span>
            <span className="mx-2">&middot;</span>
            <span>{session.remaining_seats} remaining</span>
          </div>

          {/* Friends attending */}
          {session.friends_attending_count !== undefined && session.friends_attending_count > 0 && (
            <div className="flex items-center text-sm text-primary-600">
              <Users className="h-4 w-4 mr-2 text-primary-500" />
              <span>
                {session.friends_attending_count === 1 
                  ? '1 friend attending' 
                  : `${session.friends_attending_count} friends attending`
                }
              </span>
            </div>
          )}
        </div>

        {/* Capacity bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-ink-muted mb-1">
            <span>Capacity</span>
            <span>{capacityPercentage}%</span>
          </div>
          <div className="w-full bg-primary-100/60 rounded-full h-2">
            <div 
              className={cn('h-2 rounded-full transition-all duration-300', capacityColor)}
              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Popularity badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', popularityColor)}>
            {popularityText}
          </span>
          
          {session.waitlisted_count > 0 && (
            <span className="text-sm text-warning-600">
              {session.waitlisted_count} on waitlist
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-center">
          {currentUserId && (
            <button
              className={cn(
                'w-full flex items-center justify-center gap-2',
                reservationStatus === 'approved'
                  ? 'btn-mint'
                  : reservationStatus === 'waitlisted'
                    ? 'btn-secondary'
                    : status === 'available'
                      ? 'btn-primary'
                      : 'btn-secondary'
              )}
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click when clicking button
                onReserve?.(session.id);
              }}
              disabled={status === 'full' || reservationStatus === 'approved' || reservationStatus === 'waitlisted'}
            >
              {reservationStatus === 'approved' ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Reserved
                </>
              ) : reservationStatus === 'waitlisted' ? (
                <>
                  <ClockIcon className="h-4 w-4" />
                  Waitlisted
                </>
              ) : status === 'available' ? 'Reserve' : 
                 status === 'waitlisted' ? 'Join Waitlist' : 
                 'Full'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

SessionCard.displayName = 'SessionCard';

export default SessionCard;
