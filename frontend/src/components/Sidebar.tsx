import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  BarChart3, 
  User,
  Home,
  Users,
  Settings,
  Shield,
  Heart,
  Calendar,
  Plus
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';

const Sidebar = () => {
  const { currentUser } = useAppStore();
  const location = useLocation();

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isOrganizer = currentUser?.role === 'organizer' || isAdmin;

  const baseNavigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Sessions', href: '/sessions', icon: BookOpen },
    { name: 'My Bookings', href: '/my-bookings', icon: BookOpen },
    { name: 'My Favorites', href: '/my-favorites', icon: Heart },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Friends', href: '/friends', icon: Users },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const organizerNavigation = [
    { name: 'My Sessions', href: '/organizer', icon: Calendar },
    { name: 'Create Session', href: '/create-session', icon: Plus },
  ];

  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: Shield },
  ];

  // Build navigation based on user role
  let navigation = baseNavigation;
  
  if (isOrganizer) {
    // For organizers, add organizer navigation after Analytics
    navigation = [
      ...baseNavigation.slice(0, 5), // Home, Sessions, My Bookings, My Favorites, Analytics
      ...organizerNavigation, // My Sessions, Create Session
      ...baseNavigation.slice(5) // Friends, Profile, Settings
    ];
  }
  
  if (isAdmin) {
    // For admins, add Admin Dashboard after organizer navigation
    navigation = [
      ...baseNavigation.slice(0, 5), // Home, Sessions, My Bookings, My Favorites, Analytics
      ...organizerNavigation, // My Sessions, Create Session
      ...adminNavigation, // Admin Dashboard
      ...baseNavigation.slice(5) // Friends, Profile, Settings
    ];
  }

  return (
    <>
      {/* Desktop bottom sidebar */}
      <div className="hidden lg:block lg:fixed lg:bottom-0 lg:left-0 lg:right-0 lg:z-50">
        <div className="glass-card mx-4 mb-4">
          <nav className="px-6 py-4">
            <ul role="list" className="flex justify-center space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        'group flex flex-col items-center gap-y-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 hover:scale-[1.02]',
                        isActive
                          ? 'glass-nav-item-active text-primary-600 dark:text-primary-400'
                          : 'glass-nav-item text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 shrink-0',
                          isActive
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400'
                        )}
                        aria-hidden="true"
                      />
                      <span className="text-xs">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile bottom sidebar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="glass-card mx-2 mb-2">
          <nav className="px-4 py-3">
            <ul role="list" className="flex justify-center space-x-1 overflow-x-auto">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name} className="flex-shrink-0">
                    <Link
                      to={item.href}
                      className={cn(
                        'group flex flex-col items-center gap-y-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300 hover:scale-[1.02]',
                        isActive
                          ? 'glass-nav-item-active text-primary-600 dark:text-primary-400'
                          : 'glass-nav-item text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 shrink-0',
                          isActive
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400'
                        )}
                        aria-hidden="true"
                      />
                      <span className="text-xs">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
