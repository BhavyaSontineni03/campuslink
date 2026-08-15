import { Link, useLocation } from 'react-router-dom';
import { 
  Home,
  BookOpen,
  BarChart3,
  Users,
  User,
  Settings,
  Shield,
  Heart
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';

const Navigation = () => {
  const { currentUser } = useAppStore();
  const location = useLocation();

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

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

  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: Shield },
  ];

  // Build navigation based on user role
  let navigation = baseNavigation;
  
  if (isAdmin) {
    // For admins, add Admin Dashboard after Analytics
    navigation = [
      ...baseNavigation.slice(0, 5), // Home, Sessions, My Bookings, My Favorites, Analytics
      ...adminNavigation, // Admin Dashboard
      ...baseNavigation.slice(5) // Friends, Profile, Settings
    ];
  }

  return (
    <div className="hidden lg:block lg:fixed lg:top-20 lg:left-0 lg:bottom-0 lg:w-64 lg:z-40">
      <div className="surface h-full rounded-none lg:rounded-r-2xl p-6 border-r border-white/60 dark:border-[var(--border-subtle)]">
        <nav className="space-y-1.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center gap-x-3 text-sm font-medium',
                  isActive ? 'glass-nav-item-active' : 'glass-nav-item'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    isActive ? 'text-primary-600' : 'text-ink-soft group-hover:text-primary-600'
                  )}
                  aria-hidden="true"
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Navigation;
