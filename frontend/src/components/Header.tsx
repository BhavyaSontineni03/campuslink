import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Bell, 
  User,
  Calendar,
  LogIn,
  UserPlus,
  LogOut,
  Shield
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useUnreadCount } from '../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';
import { cn } from '../utils/cn';

const Header = () => {
  const { 
    currentUser, 
    isAuthenticated,
    theme, 
    toggleTheme, 
    sidebarOpen, 
    toggleSidebar,
    signOut
  } = useAppStore();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useUnreadCount(currentUser?.id || 0);
  const unreadCount = unreadData?.unread_count || 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showUserMenu || showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showNotifications]);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-primary-100/60">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl text-ink-muted hover:bg-primary-50 hover:text-ink transition-colors"
              onClick={toggleSidebar}
            >
              <span className="sr-only">Open sidebar</span>
              {sidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center">
              <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 font-display text-xl text-ink">
                CampusLink
              </span>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {/* Theme toggle */}
            <button
              type="button"
              className="p-2.5 rounded-xl text-ink-muted hover:bg-primary-50 hover:text-ink dark:hover:bg-white/10 transition-colors"
              onClick={toggleTheme}
            >
              <span className="sr-only">Toggle theme</span>
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            {/* Notifications */}
            {isAuthenticated && (
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(prev => !prev)}
                  className={cn(
                    "p-2.5 rounded-xl text-ink-muted hover:bg-primary-50 hover:text-ink dark:hover:bg-white/10 transition-colors relative",
                    showNotifications && "bg-primary-100 text-primary-700"
                  )}
                >
                  <span className="sr-only">View notifications</span>
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                <NotificationDropdown
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                />
              </div>
            )}

            {/* Authentication buttons */}
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="flex items-center space-x-2 p-2.5 rounded-xl text-ink-muted hover:bg-primary-50 hover:text-ink transition-colors"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <User className="h-5 w-5" />
                  <span className="text-sm font-medium hidden sm:inline">
                    {currentUser?.name || 'User'}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="user-dropdown absolute right-0 mt-2 w-48 surface py-2">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-ink hover:bg-primary-50 rounded-lg mx-2 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/my-bookings"
                      className="block px-4 py-2 text-sm text-ink hover:bg-primary-50 rounded-lg mx-2 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      My Bookings
                    </Link>
                    {currentUser?.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center px-4 py-2 text-sm text-ink hover:bg-primary-50 rounded-lg mx-2 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    )}
                    <div className="border-t border-primary-100 my-1" />
                    <button
                      className="flex w-full items-center text-left px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 rounded-lg mx-2 transition-colors"
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut();
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="btn-ghost px-3 py-2 text-sm">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary px-3 py-2 text-sm">
                  <UserPlus className="h-4 w-4" />
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
