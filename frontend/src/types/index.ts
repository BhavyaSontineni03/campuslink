// Core entity types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'organizer' | 'admin' | 'super_admin';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  title: string;
  description?: string;
  category: string;
  start_time: string;
  end_time: string;
  capacity: number;
  location?: string;
  created_by: number;
  tags?: string[];
  organizer_name?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionWithCapacity extends Session {
  approved_count: number;
  waitlisted_count: number;
  remaining_seats: number;
  friends_attending_count?: number;
}

export interface SessionWithFriends extends SessionWithCapacity {
  friends_attending: User[];
}

export interface Reservation {
  id: number;
  user_id: number;
  session_id: number;
  status: 'requested' | 'approved' | 'waitlisted' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ReservationWithSession extends Reservation {
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  capacity: number;
  approved_count: number;
}

export interface Attendance {
  id: number;
  reservation_id: number;
  checkin_time?: string;
  checkout_time?: string;
  created_at: string;
}

export interface Follow {
  id: number;
  user_id: number;
  target_user_id: number;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'booking_confirmed' | 'booking_cancelled' | 'waitlist_promoted' | 'session_reminder' | 'new_session' | 'friend_activity' | 'system';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface Favorite {
  id: number;
  user_id: number;
  session_id: number;
  created_at: string;
  // Favorites list endpoint joins session + capacity fields onto each row
  title?: string;
  description?: string;
  category?: string;
  start_time?: string;
  end_time?: string;
  capacity?: number;
  location?: string;
  approved_count?: number;
  waitlisted_count?: number;
  remaining_seats?: number;
  friends_attending_count?: number;
  session?: SessionWithCapacity;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

// Request types
export interface CreateReservationRequest {
  user_id: number;
  session_id: number;
}

export interface CreateReservationResponse {
  reservation_id: number;
  status: string;
  message: string;
}

export interface CheckinRequest {
  reservation_id: number;
  user_id: number;
}

export interface CheckoutRequest {
  reservation_id: number;
  user_id: number;
}

export interface FollowUserRequest {
  target_user_id: number;
}

// Analytics types
export interface SessionUtilization {
  session_id: number;
  title: string;
  capacity: number;
  approved_count: number;
  utilization_percentage: number;
}

// Funnel + bandit analytics types (mirrors backend EngagementController contract)
export type FunnelStageKey =
  | 'viewed'
  | 'opened'
  | 'started_registration'
  | 'completed_registration'
  | 'attended';

export type InteractionType = 'view' | 'favorite' | 'register' | 'attend';

export interface FunnelStage {
  stage: FunnelStageKey;
  count: number;
  conversion_from_previous: number | null;
}

export interface FunnelDropOff {
  from: FunnelStageKey;
  to: FunnelStageKey;
  drop_pct: number;
}

export interface FunnelAnalytics {
  stages: FunnelStage[];
  biggest_dropoff: FunnelDropOff | null;
  reminder_timing_is_top_lever: boolean;
}

export type NotificationChannel = 'email' | 'in_app_push' | 'sms';

export interface BanditArm {
  channel: NotificationChannel;
  offset_minutes: number;
  alpha: number;
  beta: number;
  mean: number;
  total_trials: number;
}

export type BanditSnapshot = BanditArm[];

export interface UserStreak {
  user_id: number;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
}

// UI State types
export interface AppState {
  currentUser: User | null;
  selectedSession: SessionWithFriends | null;
  isLoading: boolean;
  error: string | null;
}

// Component Props types
export interface SessionCardProps {
  session: SessionWithCapacity;
  currentUserId?: number;
  onReserve?: (sessionId: number) => void;
  onCancel?: (reservationId: number) => void;
  onViewDetails?: (sessionId: number) => void;
}

export interface BookingButtonProps {
  session: SessionWithCapacity;
  currentUserId?: number;
  onReserve?: (sessionId: number) => void;
  onCancel?: (reservationId: number) => void;
}

export interface FriendsListProps {
  friends: User[];
  sessionId: number;
}

// Filter and Search types
export interface SessionFilters {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'available' | 'full' | 'waitlisted';
}

export interface SearchParams {
  query?: string;
  filters?: SessionFilters;
  sortBy?: 'date' | 'popularity' | 'capacity';
  sortOrder?: 'asc' | 'desc';
}

// Navigation types
export type NavigationItem = {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  current?: boolean;
};

// Theme types
export type Theme = 'light' | 'dark';

// Animation types
export interface AnimationVariants {
  hidden: {
    opacity: number;
    y?: number;
    x?: number;
    scale?: number;
  };
  visible: {
    opacity: number;
    y?: number;
    x?: number;
    scale?: number;
    transition?: {
      duration?: number;
      delay?: number;
      ease?: string;
    };
  };
}
