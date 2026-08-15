import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { 
  Clock, 
  MapPin, 
  Users, 
  Calendar, 
  ArrowLeft,
  Heart,
  MessageCircle,
  CheckCircle,
  Edit,
  Trash2,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession, useRequestReservation, useUserReservations } from '../hooks/useSessions';
import { sessionApi } from '../services/api';
import { useFriendsAttendingSession } from '../hooks/useUsers';
import { useFavoriteStatus, useToggleFavorite } from '../hooks/useFavorites';
import { useAppStore } from '../store/useAppStore';
import { useLogFunnelEvent, useLogInteraction } from '../hooks/useTracking';
import { 
  getSessionColor, 
  getSessionIcon, 
  getSessionStatus, 
  getSessionStatusColor, 
  getSessionStatusText,
  getCapacityPercentage,
  getCapacityColor,
  getSessionPopularity,
  getPopularityBadge,
  getPopularityText,
  getPopularityColor
} from '../utils/sessionUtils';
import { formatDateTime, formatDuration } from '../utils/dateUtils';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

const SessionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAppStore();
  const sessionId = parseInt(id!);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Determine where to go back based on referrer
  const getBackNavigation = () => {
    const referrer = location.state?.from;
    
    if (referrer === '/my-favorites') {
      return { path: '/my-favorites', text: 'Back to My Favorites' };
    } else if (referrer === '/my-bookings') {
      return { path: '/my-bookings', text: 'Back to My Bookings' };
    } else if (referrer === '/sessions') {
      return { path: '/sessions', text: 'Back to Sessions' };
    } else if (referrer === '/') {
      return { path: '/', text: 'Back to Home' };
    } else {
      // Default fallback - try to determine from current path or go to sessions
      return { path: '/sessions', text: 'Back to Sessions' };
    }
  };

  const backNavigation = getBackNavigation();

  // Fetch data
  const { data: session, isLoading } = useSession(sessionId, currentUser?.id);
  const { data: friendsAttending = [] } = useFriendsAttendingSession(
    currentUser?.id || 0, 
    sessionId
  );

  // Auto-refresh session detail data

  // Mutations
  const requestReservation = useRequestReservation();
  const toggleFavorite = useToggleFavorite();
  const logFunnelEvent = useLogFunnelEvent();
  const logInteraction = useLogInteraction();

  // Log a funnel "opened" event and a view interaction once per session visit
  const loggedOpenRef = useRef<number | null>(null);
  useEffect(() => {
    if (!sessionId || loggedOpenRef.current === sessionId) return;
    loggedOpenRef.current = sessionId;

    logFunnelEvent.mutate({ session_id: sessionId, stage: 'opened' });
    if (currentUser) {
      logInteraction.mutate({ session_id: sessionId, interaction_type: 'view' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Favorite status
  const { data: favoriteStatus } = useFavoriteStatus(
    currentUser?.id || 0, 
    sessionId
  );

  // Check if user has already reserved this session
  const { data: userReservations = [] } = useUserReservations(currentUser?.id || 0);
  const userReservation = userReservations.find(r => r.session_id === sessionId);
  const reservationStatus = userReservation?.status;

  const handleReserve = async () => {
    if (!currentUser || !session) return;

    logFunnelEvent.mutate({ session_id: session.id, stage: 'started_registration' });

    try {
      await requestReservation.mutateAsync({
        user_id: currentUser.id,
        session_id: session.id
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentUser || !session) return;
    
    try {
      await toggleFavorite.mutateAsync({
        userId: currentUser.id,
        sessionId: session.id
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleEditSession = () => {
    if (!session) return;
    navigate(`/organizer/sessions/${session.id}/edit`);
  };

  const handleDeleteSession = async () => {
    if (!currentUser || !session || isDeleting) return;
    
    if (window.confirm(`Are you sure you want to delete "${session.title}"? This action cannot be undone.`)) {
      setIsDeleting(true);
      try {
        const data = await sessionApi.delete(session.id);

        // Comprehensive invalidation to ensure UI updates immediately
        queryClient.invalidateQueries(['sessions']);
        queryClient.invalidateQueries(['popular-sessions']);
        queryClient.invalidateQueries(['organizer-sessions']);
        queryClient.invalidateQueries(['sessions', 'utilization']);
        queryClient.invalidateQueries(['recent-activity']);

        // Force refetch to ensure data is fresh
        await queryClient.refetchQueries(['sessions']);

        toast.success(data.message || 'Session deleted successfully!');
        navigate('/sessions');
      } catch (error: any) {
        console.error('Error deleting session:', error);
        toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Failed to delete session');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Session not found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          The session you're looking for doesn't exist or has been removed.
        </p>
        <Link
          to="/"
          className="btn btn-primary btn-md"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const color = getSessionColor(session.category);
  const icon = getSessionIcon(session.category);
  const status = getSessionStatus(session);
  const statusColor = getSessionStatusColor(status);
  const statusText = getSessionStatusText(status);

  // Smart user-centric status display
  const getUserStatusInfo = () => {
    if (!currentUser) {
      return { text: statusText, color: statusColor, icon: null };
    }

    // User has a reservation - show their personal status
    if (reservationStatus === 'approved') {
      return { 
        text: 'Confirmed', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        icon: <CheckCircle className="h-4 w-4 mr-1" />
      };
    }
    
    if (reservationStatus === 'waitlisted') {
      return { 
        text: 'Waitlisted', 
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        icon: <Clock className="h-4 w-4 mr-1" />
      };
    }

    if (reservationStatus === 'cancelled') {
      return { 
        text: 'Cancelled', 
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        icon: <XCircle className="h-4 w-4 mr-1" />
      };
    }

    // No reservation - show session availability
    return { text: statusText, color: statusColor, icon: null };
  };

  const userStatus = getUserStatusInfo();
  const capacityPercentage = getCapacityPercentage(session);
  const capacityColor = getCapacityColor(capacityPercentage);
  const popularity = getSessionPopularity(session);
  const popularityBadge = getPopularityBadge(popularity);
  const popularityText = getPopularityText(popularity);
  const popularityColor = getPopularityColor(popularity);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <button
          onClick={() => navigate(backNavigation.path)}
          className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {backNavigation.text}
        </button>
      </motion.div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card overflow-hidden"
      >
        {/* Header */}
        <div className={cn('h-3 w-full', color)} />
        
        <div className="p-8">
          {/* Session header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl', color)}>
                {icon}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {session.title}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className="text-lg text-gray-600 dark:text-gray-300">
                    {session.category}
                  </span>
                  <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', userStatus.color)}>
                    {userStatus.icon}
                    {userStatus.text}
                  </span>
                </div>
                
                {/* Enhanced status message */}
                {currentUser && reservationStatus && (
                  <div className="mt-3">
                    {reservationStatus === 'approved' && (
                      <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          You're confirmed for this session! Check-in will be available 30 minutes before the start time.
                        </span>
                      </div>
                    )}
                    {reservationStatus === 'waitlisted' && (
                      <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          You're on the waitlist. We'll notify you if a spot becomes available!
                        </span>
                      </div>
                    )}
                    {reservationStatus === 'cancelled' && (
                      <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Your reservation was cancelled. You can join the waitlist if spots are available.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                {/* Show edit button only for organizers, admins, and super admins */}
                {currentUser && session && (currentUser.role === 'organizer' || currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                  <button 
                    onClick={handleEditSession}
                    className="p-2 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit session"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                )}
              
              {currentUser && (
                <button 
                  onClick={handleToggleFavorite}
                  disabled={toggleFavorite.isLoading}
                  className={cn(
                    "p-2 transition-colors",
                    favoriteStatus?.isFavorited 
                      ? "text-red-500 hover:text-red-600" 
                      : "text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                  )}
                  title={favoriteStatus?.isFavorited ? "Remove from favorites" : "Add to favorites"}
                >
                  {toggleFavorite.isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                  ) : (
                    <Heart className={cn("h-5 w-5", favoriteStatus?.isFavorited && "fill-current")} />
                  )}
                </button>
              )}
            </div>
          </div>


          {/* Description */}
          {session.description && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                About this session
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {session.description}
              </p>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Time */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Time</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                {formatDateTime(session.start_time)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Duration: {formatDuration(session.start_time, session.end_time)}
              </p>
            </div>

            {/* Location */}
            {session.location && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Location</h4>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {session.location}
                </p>
              </div>
            )}

            {/* Capacity */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Users className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Capacity</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {session.approved_count} / {session.capacity} seats filled
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div 
                  className={cn('h-2 rounded-full transition-all duration-300', capacityColor)}
                  style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {session.remaining_seats} seats remaining
              </p>
            </div>

            {/* Popularity */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Popularity</h4>
              </div>
              <div className="flex items-center space-x-2">
                <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-sm font-medium', popularityColor)}>
                  <span className="mr-1">{popularityBadge}</span>
                  {popularityText}
                </span>
              </div>
              {session.waitlisted_count > 0 && (
                <p className="text-sm text-warning-600 dark:text-warning-400 mt-1">
                  {session.waitlisted_count} people on waitlist
                </p>
              )}
            </div>
          </div>

          {/* Friends attending */}
          {friendsAttending.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-primary-600" />
                Friends Attending ({friendsAttending.length})
              </h3>
              <div className="flex flex-wrap gap-3">
                {friendsAttending.map((friend) => (
                  <div key={friend.id} className="flex items-center space-x-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg px-3 py-2">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                        {friend.name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                      {friend.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {currentUser ? (
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <button
                  className={cn(
                    'btn btn-lg flex-1 flex items-center justify-center gap-2',
                    reservationStatus === 'approved' 
                      ? 'btn-success' 
                      : reservationStatus === 'waitlisted' 
                        ? 'btn-warning' 
                        : status === 'available' 
                          ? 'btn-primary' 
                          : status === 'waitlisted' 
                            ? 'btn-warning' 
                            : 'btn-secondary'
                  )}
                  onClick={handleReserve}
                  disabled={status === 'full' || requestReservation.isLoading || reservationStatus === 'approved' || reservationStatus === 'waitlisted'}
                >
                  {requestReservation.isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : reservationStatus === 'approved' ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Reserved
                    </>
                  ) : reservationStatus === 'waitlisted' ? (
                    <>
                      <Clock className="h-5 w-5" />
                      Waitlisted
                    </>
                  ) : (
                    <>
                      {status === 'available' ? 'Reserve Seat' : 
                       status === 'waitlisted' ? 'Join Waitlist' : 
                       'Session Full'}
                    </>
                  )}
                </button>

                {/* Delete Session Button - Only for organizers, admins, and super admins */}
                {session && (currentUser.role === 'organizer' || currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                  <button 
                    onClick={handleDeleteSession}
                    disabled={isDeleting}
                    className="btn btn-lg flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete this session"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-5 w-5" />
                        Delete Session
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 text-center py-3 text-gray-500 dark:text-gray-400">
                Please sign in to reserve a seat
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SessionDetailPage;
