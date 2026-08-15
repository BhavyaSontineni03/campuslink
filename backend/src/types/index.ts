// Core entity types
export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
  role?: 'student' | 'organizer' | 'admin' | 'super_admin';
  password_hash?: string;
  is_active?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: number;
  title: string;
  description?: string;
  category: string;
  start_time: Date;
  end_time: Date;
  capacity: number;
  location?: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  tags?: string[];
  organizer_name?: string;
}

export interface Reservation {
  id: number;
  user_id: number;
  session_id: number;
  status: 'requested' | 'approved' | 'waitlisted' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface Attendance {
  id: number;
  reservation_id: number;
  checkin_time?: Date;
  checkout_time?: Date;
  created_at: Date;
}

export interface Follow {
  id: number;
  user_id: number;
  target_user_id: number;
  created_at: Date;
}

// Extended types with joins
export interface SessionWithCapacity extends Session {
  approved_count: number;
  waitlisted_count: number;
  remaining_seats: number;
  friends_attending_count?: number;
}

export interface SessionWithFriends extends SessionWithCapacity {
  friends_attending: User[];
}

export interface ReservationWithSession extends Reservation {
  session: Session;
}

export interface UserWithStats extends User {
  total_reservations: number;
  current_streak: number;
}

// API Request/Response types
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
}

export interface CheckoutRequest {
  reservation_id: number;
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

export interface UserStreak {
  user_id: number;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
}

// Error types
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// Database procedure result types
export interface ReservationResult {
  reservation_id: number;
  status: string;
}

// Engagement layer types (recommendations, search, bandit, funnel)

export type InteractionType = 'view' | 'favorite' | 'register' | 'attend';

export interface UserInteraction {
  id: number;
  user_id: number;
  session_id: number;
  interaction_type: InteractionType;
  created_at: Date;
}

export type FunnelStage =
  | 'viewed'
  | 'opened'
  | 'started_registration'
  | 'completed_registration'
  | 'attended';

export interface FunnelEvent {
  id: number;
  user_id?: number;
  session_id: number;
  stage: FunnelStage;
  created_at: Date;
}

export type NotificationChannel = 'email' | 'in_app_push' | 'sms';

// Minutes before session start that a reminder can be sent.
export type NotificationOffset = 1440 | 180 | 30;

export interface NotificationExperimentArm {
  channel: NotificationChannel;
  offset_minutes: NotificationOffset;
  alpha: number;
  beta: number;
}

export interface NotificationSend {
  id: number;
  user_id: number;
  session_id: number;
  channel: NotificationChannel;
  offset_minutes: NotificationOffset;
  sent_at: Date;
  outcome_recorded_at?: Date;
  attended?: boolean;
}

export interface RankedSession extends SessionWithCapacity {
  score: number;
}
