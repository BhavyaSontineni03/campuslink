import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle, 
  Clock as ClockIcon,
  XCircle,
  AlertCircle,
  UserCheck,
  Timer,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUserReservations, useCancelReservation, useWaitlistPosition } from '../hooks/useSessions';
import { useCheckIn, useAttendanceByReservation, useUserAttendanceStats } from '../hooks/useAttendance';
import { useAppStore } from '../store/useAppStore';
import { formatDateTime } from '../utils/dateUtils';
import { cn } from '../utils/cn';

// Waitlist position component
const WaitlistPosition = ({ reservationId, status }: { reservationId: number; status: string }) => {
  // Only fetch waitlist position if the reservation is actually waitlisted
  const { data: positionData, isLoading, error } = useWaitlistPosition(reservationId, {
    enabled: status === 'waitlisted'
  });
  
  // Don't show anything if not waitlisted
  if (status !== 'waitlisted') {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-warning-600">
        <ClockIcon className="h-4 w-4" />
        <span className="text-sm">Loading position...</span>
      </div>
    );
  }
  
  if (error || !positionData || !positionData.position) {
    return null;
  }
  
  return (
    <div className="flex items-center space-x-2 text-warning-600">
      <ClockIcon className="h-4 w-4" />
      <span className="text-sm font-medium">
        Position #{positionData.position} in waitlist
      </span>
    </div>
  );
};

// Enhanced check-in button component with comprehensive functionality
const CheckInButton = ({ 
  reservationId, 
  sessionStartTime,
  sessionEndTime,
  onCheckIn, 
  isLoading,
  status
}: { 
  reservationId: number; 
  sessionStartTime: string;
  sessionEndTime: string;
  onCheckIn: (id: number) => void; 
  isLoading: boolean;
  status: string;
}) => {
  // Only fetch attendance for approved reservations
  const { data: attendance } = useAttendanceByReservation(reservationId, {
    enabled: status === 'approved'
  });
  
  // Check if already checked in
  const isCheckedIn = attendance?.checkin_time && !attendance?.checkout_time;
  const isCheckedOut = attendance?.checkout_time;
  
  // Time-based validation
  const now = new Date();
  const startTime = new Date(sessionStartTime);
  const endTime = new Date(sessionEndTime);
  
  // Check-in window: 30 minutes before to 30 minutes after session starts
  const checkInWindowStart = new Date(startTime.getTime() - 30 * 60 * 1000);
  const checkInWindowEnd = new Date(startTime.getTime() + 30 * 60 * 1000);
  
  const isInCheckInWindow = now >= checkInWindowStart && now <= checkInWindowEnd;
  const isTooEarly = now < checkInWindowStart;
  const isTooLate = now > checkInWindowEnd;
  const isSessionEnded = now > endTime;
  
  // Calculate time until check-in window opens
  const timeUntilCheckIn = checkInWindowStart.getTime() - now.getTime();
  const hoursUntilCheckIn = Math.floor(timeUntilCheckIn / (1000 * 60 * 60));
  const minutesUntilCheckIn = Math.floor((timeUntilCheckIn % (1000 * 60 * 60)) / (1000 * 60));
  
  // Button state logic
  const getButtonState = () => {
    if (isCheckedOut) {
      return {
        text: 'Checked Out',
        icon: <CheckCircle2 className="h-4 w-4" />,
        className: 'btn btn-secondary btn-sm cursor-not-allowed',
        disabled: true,
        tooltip: 'Already checked out'
      };
    }
    
    if (isCheckedIn) {
      return {
        text: 'Checked In',
        icon: <UserCheck className="h-4 w-4" />,
        className: 'btn btn-success btn-sm cursor-not-allowed',
        disabled: true,
        tooltip: 'Currently checked in'
      };
    }
    
    if (isSessionEnded) {
      return {
        text: 'Session Ended',
        icon: <XCircle className="h-4 w-4" />,
        className: 'btn btn-secondary btn-sm cursor-not-allowed',
        disabled: true,
        tooltip: 'Session has ended'
      };
    }
    
    if (isTooLate) {
      return {
        text: 'Check-in Closed',
        icon: <XCircle className="h-4 w-4" />,
        className: 'btn btn-danger btn-sm cursor-not-allowed',
        disabled: true,
        tooltip: 'Check-in window has closed'
      };
    }
    
    if (isTooEarly) {
      return {
        text: `Check-in in ${hoursUntilCheckIn > 0 ? `${hoursUntilCheckIn}h ` : ''}${minutesUntilCheckIn}m`,
        icon: <Timer className="h-4 w-4" />,
        className: 'btn btn-warning btn-sm cursor-not-allowed',
        disabled: true,
        tooltip: `Check-in opens 30 min before session start`
      };
    }
    
    if (isInCheckInWindow) {
      return {
        text: isLoading ? 'Checking In...' : 'Check In',
        icon: isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : <UserCheck className="h-4 w-4" />,
        className: 'btn btn-success btn-sm',
        disabled: isLoading,
        tooltip: 'Click to check in'
      };
    }
    
    return {
      text: 'Check-in Unavailable',
      icon: <AlertCircle className="h-4 w-4" />,
      className: 'btn btn-secondary btn-sm cursor-not-allowed',
      disabled: true,
        tooltip: 'Check-in unavailable'
    };
  };
  
  const buttonState = getButtonState();
  
  return (
    <div className="relative group w-full">
      <button 
        className={cn(buttonState.className, "flex items-center justify-center gap-2 w-full")}
        onClick={() => !buttonState.disabled && onCheckIn(reservationId)}
        disabled={buttonState.disabled}
        title={buttonState.tooltip}
      >
        {buttonState.icon}
        <span>{buttonState.text}</span>
      </button>
      
      {/* Enhanced tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs w-max shadow-lg">
        <div className="break-words text-center leading-relaxed">
          {buttonState.tooltip}
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
      </div>
    </div>
  );
};

// Attendance status indicator component
const AttendanceStatusIndicator = ({ reservationId, status }: { reservationId: number; status: string }) => {
  // Only fetch attendance for approved reservations
  const { data: attendance } = useAttendanceByReservation(reservationId, {
    enabled: status === 'approved'
  });
  
  // Don't show anything if not approved
  if (status !== 'approved') {
    return null;
  }
  
  if (!attendance) {
    return null;
  }
  
  const isCheckedIn = attendance.checkin_time && !attendance.checkout_time;
  const isCheckedOut = attendance.checkout_time;
  
  if (isCheckedOut) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
        <UserCheck className="h-3 w-3 mr-1" />
        Attended
      </span>
    );
  }
  
  if (isCheckedIn) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
        <UserCheck className="h-3 w-3 mr-1" />
        Present
      </span>
    );
  }
  
  return null;
};

const MyBookingsPage = () => {
  const { currentUser } = useAppStore();
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Fetch all user reservations (single source of truth)
  const { data: allReservations = [], isLoading } = useUserReservations(currentUser?.id || 0);
  
  // Filter reservations based on selected status
  const reservations = selectedStatus 
    ? allReservations.filter(reservation => reservation.status === selectedStatus)
    : allReservations;

  // Cancel reservation mutation
  const cancelReservation = useCancelReservation();
  
  // Check in mutation
  const checkIn = useCheckIn();
  
  // Attendance statistics
  const { data: attendanceStats } = useUserAttendanceStats(currentUser?.id || 0);

  const handleCancel = async (reservationId: number) => {
    if (!currentUser) return;
    
    try {
      await cancelReservation.mutateAsync({
        id: reservationId,
        userId: currentUser.id
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleCheckIn = async (reservationId: number) => {
    if (!currentUser) return;
    
    try {
      await checkIn.mutateAsync({
        reservation_id: reservationId,
        user_id: currentUser.id
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'waitlisted':
        return <ClockIcon className="h-5 w-5 text-warning-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-danger-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-success-600 bg-success-50 dark:bg-success-900/20';
      case 'waitlisted':
        return 'text-warning-600 bg-warning-50 dark:bg-warning-900/20';
      case 'cancelled':
        return 'text-danger-600 bg-danger-50 dark:bg-danger-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Confirmed';
      case 'waitlisted':
        return 'On Waitlist';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const statusCounts = allReservations.reduce((acc, reservation) => {
    acc[reservation.status] = (acc[reservation.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!currentUser) {
    return (
      <div className="surface p-12 text-center max-w-lg mx-auto">
        <Calendar className="h-10 w-10 text-ink-soft mx-auto mb-4" />
        <h3 className="font-display text-lg text-ink mb-2">
          Please sign in to view your bookings
        </h3>
        <p className="section-copy mx-auto text-sm">
          Sign in to see your session reservations and manage your bookings.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="chip-sky mb-3 inline-flex">My bookings</span>
        <h1 className="section-title">Your reservations</h1>
        <p className="section-copy mt-2">
          Manage your session reservations and track your attendance.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        <div className="surface p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-mint-100 rounded-xl">
              <CheckCircle className="h-5 w-5 text-mint-600" />
            </div>
            <div>
              <p className="text-2xl font-display text-ink">{statusCounts.approved || 0}</p>
              <p className="text-sm text-ink-muted">Confirmed</p>
            </div>
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-peach-100 rounded-xl">
              <ClockIcon className="h-5 w-5 text-peach-500" />
            </div>
            <div>
              <p className="text-2xl font-display text-ink">{statusCounts.waitlisted || 0}</p>
              <p className="text-sm text-ink-muted">Waitlisted</p>
            </div>
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-display text-ink">{statusCounts.cancelled || 0}</p>
              <p className="text-sm text-ink-muted">Cancelled</p>
            </div>
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-xl">
              <Calendar className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-display text-ink">{allReservations.length}</p>
              <p className="text-sm text-ink-muted">Total</p>
            </div>
          </div>
        </div>

        {attendanceStats && (
          <div className="surface p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-mint-100 rounded-xl">
                <UserCheck className="h-5 w-5 text-mint-600" />
              </div>
              <div>
                <p className="text-2xl font-display text-ink">{attendanceStats.attended_sessions || 0}</p>
                <p className="text-sm text-ink-muted">Attended</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="surface p-5"
      >
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStatus('')}
            className={cn(
              'chip',
              selectedStatus === ''
                ? 'chip-sky'
                : 'bg-canvas-soft text-ink-muted hover:bg-primary-50'
            )}
          >
            All ({allReservations.length})
          </button>
          <button
            onClick={() => setSelectedStatus('approved')}
            className={cn(
              'chip',
              selectedStatus === 'approved'
                ? 'chip-mint'
                : 'bg-canvas-soft text-ink-muted hover:bg-mint-50'
            )}
          >
            Confirmed ({statusCounts.approved || 0})
          </button>
          <button
            onClick={() => setSelectedStatus('waitlisted')}
            className={cn(
              'chip',
              selectedStatus === 'waitlisted'
                ? 'chip-peach'
                : 'bg-canvas-soft text-ink-muted hover:bg-peach-50'
            )}
          >
            Waitlisted ({statusCounts.waitlisted || 0})
          </button>
          <button
            onClick={() => setSelectedStatus('cancelled')}
            className={cn(
              'chip',
              selectedStatus === 'cancelled'
                ? 'bg-red-100 text-red-600'
                : 'bg-canvas-soft text-ink-muted hover:bg-red-50'
            )}
          >
            Cancelled ({statusCounts.cancelled || 0})
          </button>
        </div>
      </motion.div>

      {/* Reservations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="surface p-6 animate-pulse">
                <div className="h-4 bg-primary-100 rounded mb-4" />
                <div className="h-3 bg-primary-100 rounded mb-2" />
                <div className="h-3 bg-primary-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : reservations.length > 0 ? (
          <div className="space-y-4">
            {reservations.map((reservation) => (
              <motion.div
                key={reservation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="surface p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h3 className="font-display text-lg text-ink">
                        {reservation.title}
                      </h3>
                      <span className={cn('inline-flex items-center gap-1 chip', getStatusColor(reservation.status))}>
                        {getStatusIcon(reservation.status)}
                        {getStatusText(reservation.status)}
                      </span>
                      {reservation.status === 'approved' && (
                        <AttendanceStatusIndicator reservationId={reservation.id} status={reservation.status} />
                      )}
                      {reservation.status === 'waitlisted' && (
                        <WaitlistPosition reservationId={reservation.id} status={reservation.status} />
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-ink-muted">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-ink-soft" />
                        <span>{formatDateTime(reservation.start_time)}</span>
                      </div>
                      {reservation.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-ink-soft" />
                          <span>{reservation.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-ink-soft" />
                        <span>{reservation.approved_count} / {reservation.capacity} seats</span>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-ink-soft">
                      Reserved on {formatDateTime(reservation.created_at)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:min-w-[140px]">
                    <Link
                      to={`/sessions/${reservation.session_id}`}
                      state={{ from: '/my-bookings' }}
                      className="btn-secondary w-full text-center"
                    >
                      View details
                    </Link>
                    
                    {reservation.status === 'approved' && (
                      <div className="w-full">
                        <CheckInButton 
                          reservationId={reservation.id}
                          sessionStartTime={reservation.start_time}
                          sessionEndTime={reservation.end_time}
                          onCheckIn={handleCheckIn}
                          isLoading={checkIn.isLoading}
                          status={reservation.status}
                        />
                      </div>
                    )}
                    
                    {reservation.status !== 'cancelled' && (
                      <button
                        className="btn bg-red-500 text-white hover:bg-red-600 w-full text-sm"
                        onClick={() => handleCancel(reservation.id)}
                        disabled={cancelReservation.isLoading}
                      >
                        {cancelReservation.isLoading ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="surface p-12 text-center">
            <Calendar className="h-10 w-10 text-ink-soft mx-auto mb-4" />
            <h3 className="font-display text-lg text-ink mb-2">No bookings found</h3>
            <p className="section-copy mx-auto text-sm mb-6">
              {selectedStatus
                ? `You don't have any ${selectedStatus} reservations.`
                : "You haven't made any reservations yet."}
            </p>
            <Link to="/sessions" className="btn-primary px-6 py-3">
              Browse sessions
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MyBookingsPage;
