import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  Users, 
  Clock, 
  Star,
  AlertCircle,
  CheckCircle,
  Info,
  BookOpen
} from 'lucide-react';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from '../hooks/useNotifications';
import { useAppStore } from '../store/useAppStore';
import { Notification } from '../types';
import { cn } from '../utils/cn';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAppStore();
  const [page] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications and unread count
  const { data: notificationsData, isLoading, error } = useNotifications(currentUser?.id || 0, page, 10);
  const { data: unreadData } = useUnreadCount(currentUser?.id || 0);
  
  // Mutations
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadData?.unread_count || 0;


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Get notification icon based on type
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'booking_confirmed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'booking_cancelled':
        return <X className="h-5 w-5 text-red-500" />;
      case 'waitlist_promoted':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'session_reminder':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'new_session':
        return <BookOpen className="h-5 w-5 text-purple-500" />;
      case 'friend_activity':
        return <Users className="h-5 w-5 text-indigo-500" />;
      case 'system':
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get notification color based on type
  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'booking_confirmed':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'booking_cancelled':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'waitlist_promoted':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'session_reminder':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
      case 'new_session':
        return 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20';
      case 'friend_activity':
        return 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20';
      case 'system':
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20';
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    if (!currentUser) return;
    await markAsRead.mutateAsync({ userId: currentUser.id, notificationId });
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    await markAllAsRead.mutateAsync(currentUser.id);
  };

  const handleDelete = async (notificationId: number) => {
    if (!currentUser) return;
    await deleteNotification.mutateAsync({ userId: currentUser.id, notificationId });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ 
            duration: 0.2,
            ease: "easeOut"
          }}
          className="absolute right-0 mt-2 w-96 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-xl py-2 user-dropdown border border-white/20 dark:border-gray-700/30 transform translate-y-0 z-50"
          ref={dropdownRef}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsRead.isLoading}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center py-8"
              >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </motion.div>
            ) : error ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-8 text-red-500 dark:text-red-400"
              >
                <Bell className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">Error loading notifications</p>
                <p className="text-xs mt-1">Please try again later</p>
              </motion.div>
            ) : notifications.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400"
              >
                <Bell className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">We'll notify you about important updates</p>
              </motion.div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 p-3 mx-2 rounded-lg transition-all duration-200 hover:bg-white/60 dark:hover:bg-gray-700/60',
                      !notification.is_read && 'bg-primary-50/50 dark:bg-primary-900/20',
                      getNotificationColor(notification.type)
                    )}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={cn(
                            'text-sm font-medium text-gray-900 dark:text-white',
                            !notification.is_read && 'font-semibold'
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markAsRead.isLoading}
                              className="p-1 rounded-lg hover:bg-white/60 dark:hover:bg-gray-600/60 transition-colors disabled:opacity-50"
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4 text-gray-500 hover:text-green-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            disabled={deleteNotification.isLoading}
                            className="p-1 rounded-lg hover:bg-white/60 dark:hover:bg-gray-600/60 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
