import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Shield, Calendar, Users, Activity, Clock, MapPin } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at?: string;
    stats?: {
      total_sessions?: number;
      total_friends?: number;
      attendance_rate?: number;
    };
    sessions?: Array<{
      id: number;
      title: string;
      date: string;
      location: string;
      category: string;
    }>;
  };
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user }) => {
  if (!user) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'super_admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'admin':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'organizer':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'student':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'super_admin':
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'organizer':
        return <Users className="h-4 w-4" />;
      case 'student':
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.3 
            }}
            className="relative w-full max-w-md mx-auto"
          >
            <div className="glass-card p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Profile</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* User Info */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary-600/80 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {user.name}
                </h3>
                
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getRoleColor(user.role)}`}>
                  {getRoleIcon(user.role)}
                  <span className="text-sm font-medium capitalize">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</p>
                    <p className="text-sm text-gray-900 dark:text-white">{user.email}</p>
                  </div>
                </div>

                {user.created_at && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Member Since</p>
                      <p className="text-sm text-gray-900 dark:text-white">{formatDate(user.created_at)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              {user.stats && (
                <div className="grid grid-cols-3 gap-3 mt-6">
                  <div className="glass-card p-3 text-center">
                    <Activity className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sessions</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{user.stats.total_sessions || 0}</p>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <Users className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Friends</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{user.stats.total_friends || 0}</p>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <div className="h-5 w-5 bg-purple-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">%</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Attendance</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{user.stats.attendance_rate || 0}%</p>
                  </div>
                </div>
              )}

              {/* User's Sessions */}
              {user.sessions && user.sessions.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                    Sessions Attending
                  </h4>
                  <div className="space-y-3">
                    {user.sessions.slice(0, 3).map((session) => (
                      <div key={session.id} className="glass-card p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                              {session.title}
                            </h5>
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {session.date}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {session.location}
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-full">
                            {session.category}
                          </span>
                        </div>
                      </div>
                    ))}
                    {user.sessions.length > 3 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        +{user.sessions.length - 3} more sessions
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UserProfileModal;