import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Calendar, 
  TrendingUp, 
  Award,
  Clock,
  CheckCircle,
  Users,
  Edit,
  Save,
  X
} from 'lucide-react';
import { useUserWithStats, useUserAttendanceStats, useUserCurrentStreak, useUpdateUserProfile } from '../hooks/useUsers';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../utils/dateUtils';
import { cn } from '../utils/cn';

const ProfilePage = () => {
  const { currentUser } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || ''
  });

  // Fetch user data
  const { data: userStats, isLoading: statsLoading } = useUserWithStats(currentUser?.id || 0);
  const { data: attendanceStats, isLoading: attendanceLoading } = useUserAttendanceStats(currentUser?.id || 0);
  const { data: currentStreak } = useUserCurrentStreak(currentUser?.id || 0);

  // Auto-refresh user data every 30 seconds
  const updateProfile = useUpdateUserProfile();

  const handleSave = async () => {
    if (!currentUser) return;
    try {
      await updateProfile.mutateAsync({
        userId: currentUser.id,
        profileData: editData
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleCancel = () => {
    setEditData({
      name: currentUser?.name || '',
      email: currentUser?.email || ''
    });
    setIsEditing(false);
  };

  if (!currentUser) {
    return (
      <div className="surface p-12 text-center max-w-lg mx-auto">
        <User className="h-10 w-10 text-ink-soft mx-auto mb-4" />
        <h3 className="font-display text-lg text-ink mb-2">Please sign in to view your profile</h3>
        <p className="section-copy mx-auto text-sm">
          Sign in to see your profile information and statistics.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="chip-sky mb-3 inline-flex">Your profile</span>
        <h1 className="section-title">Profile</h1>
        <p className="section-copy mt-2">
          Your personal information and activity statistics.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-1"
        >
          <div className="surface p-6">
            <div className="text-center">
              <div className="w-24 h-24 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-display mx-auto mb-4">
                {(isEditing ? editData.name : currentUser.name).charAt(0).toUpperCase()}
              </div>
              
              <div className="flex justify-center mb-4">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="btn-primary">
                    <Edit className="h-4 w-4" />
                    Edit profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={updateProfile.isLoading}
                      className="btn-mint disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {updateProfile.isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={handleCancel} className="btn-secondary">
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              {/* Name and Email */}
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">Name</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="field"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-xl text-ink mb-1">{currentUser.name}</h2>
                  <p className="text-ink-muted mb-4">{currentUser.email}</p>
                </>
              )}
              
              <div className="flex items-center justify-center text-sm text-ink-muted">
                <Calendar className="h-4 w-4 mr-2" />
                Member since {formatDate(currentUser.created_at)}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Activity Stats */}
          <div className="surface p-6">
            <h3 className="font-display text-lg text-ink mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              Activity statistics
            </h3>
            
            {statsLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-primary-100 rounded" />
                <div className="h-4 bg-primary-100 rounded w-3/4" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center surface-muted p-4">
                  <div className="text-3xl font-display text-primary-600 mb-1">
                    {userStats?.total_reservations || 0}
                  </div>
                  <div className="text-sm text-ink-muted">Total reservations</div>
                </div>
                <div className="text-center surface-muted p-4">
                  <div className="text-3xl font-display text-mint-600 mb-1">
                    {attendanceStats?.total_checkins || 0}
                  </div>
                  <div className="text-sm text-ink-muted">Check-ins</div>
                </div>
                <div className="text-center surface-muted p-4">
                  <div className="text-3xl font-display text-peach-500 mb-1">
                    {currentStreak?.current_streak || 0}
                  </div>
                  <div className="text-sm text-ink-muted">Current streak</div>
                </div>
              </div>
            )}
          </div>

          <div className="surface p-6">
            <h3 className="font-display text-lg text-ink mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-mint-600" />
              Attendance details
            </h3>
            
            {attendanceLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-primary-100 rounded" />
                <div className="h-4 bg-primary-100 rounded w-3/4" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Completed sessions</span>
                    <span className="font-semibold text-ink">{attendanceStats?.completed_sessions || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Currently attending</span>
                    <span className="font-semibold text-ink">{attendanceStats?.currently_attending || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Last check-in</span>
                    <span className="font-semibold text-ink">
                      {attendanceStats?.last_checkin ? formatDate(attendanceStats.last_checkin) : 'Never'}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Current streak</span>
                    <span className="font-semibold text-ink">{currentStreak?.current_streak || 0} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Longest streak</span>
                    <span className="font-semibold text-ink">{attendanceStats?.longest_streak || 0} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Total check-ins</span>
                    <span className="font-semibold text-ink">{attendanceStats?.total_checkins || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="surface p-6">
            <h3 className="font-display text-lg text-ink mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-peach-500" />
              Achievements
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={cn(
                'p-4 rounded-xl border transition-colors',
                (userStats?.total_reservations || 0) >= 5
                  ? 'border-mint-200 bg-mint-50'
                  : 'border-primary-100 bg-canvas-soft/80'
              )}>
                <div className="flex items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center mr-3',
                    (userStats?.total_reservations || 0) >= 5
                      ? 'bg-mint-100 text-mint-600'
                      : 'bg-primary-100 text-ink-soft'
                  )}>
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-ink">First steps</div>
                    <div className="text-sm text-ink-muted">Make 5 reservations</div>
                  </div>
                </div>
              </div>
              
              <div className={cn(
                'p-4 rounded-xl border transition-colors',
                (currentStreak?.current_streak || 0) >= 7
                  ? 'border-mint-200 bg-mint-50'
                  : 'border-primary-100 bg-canvas-soft/80'
              )}>
                <div className="flex items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center mr-3',
                    (currentStreak?.current_streak || 0) >= 7
                      ? 'bg-mint-100 text-mint-600'
                      : 'bg-primary-100 text-ink-soft'
                  )}>
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-ink">Consistent</div>
                    <div className="text-sm text-ink-muted">7-day streak</div>
                  </div>
                </div>
              </div>
              
              <div className={cn(
                'p-4 rounded-xl border transition-colors',
                (attendanceStats?.total_checkins || 0) >= 20
                  ? 'border-mint-200 bg-mint-50'
                  : 'border-primary-100 bg-canvas-soft/80'
              )}>
                <div className="flex items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center mr-3',
                    (attendanceStats?.total_checkins || 0) >= 20
                      ? 'bg-mint-100 text-mint-600'
                      : 'bg-primary-100 text-ink-soft'
                  )}>
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-ink">Regular</div>
                    <div className="text-sm text-ink-muted">20 check-ins</div>
                  </div>
                </div>
              </div>
              
              <div className={cn(
                'p-4 rounded-xl border transition-colors',
                (attendanceStats?.longest_streak || 0) >= 30
                  ? 'border-mint-200 bg-mint-50'
                  : 'border-primary-100 bg-canvas-soft/80'
              )}>
                <div className="flex items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center mr-3',
                    (attendanceStats?.longest_streak || 0) >= 30
                      ? 'bg-mint-100 text-mint-600'
                      : 'bg-primary-100 text-ink-soft'
                  )}>
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-ink">Dedicated</div>
                    <div className="text-sm text-ink-muted">30-day streak</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
