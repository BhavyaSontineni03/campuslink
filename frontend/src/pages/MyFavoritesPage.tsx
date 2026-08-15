import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { Heart, Clock, MapPin, Users, Filter, Search, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { useUserReservations } from '../hooks/useSessions';
import { useAppStore } from '../store/useAppStore';
import { Favorite, SessionWithCapacity } from '../types';
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

const favoriteToSession = (favorite: Favorite): SessionWithCapacity | null => {
  if (favorite.session) return favorite.session;
  if (!favorite.title || !favorite.start_time || !favorite.end_time || favorite.capacity == null) {
    return null;
  }
  return {
    id: favorite.session_id,
    title: favorite.title,
    description: favorite.description,
    category: favorite.category ?? '',
    start_time: favorite.start_time,
    end_time: favorite.end_time,
    capacity: favorite.capacity,
    location: favorite.location,
    created_by: 0,
    created_at: favorite.created_at,
    updated_at: favorite.created_at,
    approved_count: favorite.approved_count ?? 0,
    waitlisted_count: favorite.waitlisted_count ?? 0,
    remaining_seats: favorite.remaining_seats ?? 0,
    friends_attending_count: favorite.friends_attending_count,
  };
};

const MyFavoritesPage = () => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Animation variants - exact same as SessionsPage
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };


  // Fetch user's favorites
  const { data: favorites = [], isLoading, error } = useFavorites(currentUser?.id || 0);
  
  // Fetch user's reservations to show personal status
  const { data: userReservations = [] } = useUserReservations(currentUser?.id || 0);

  const handleRefresh = useCallback(async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries(['favorites', currentUser.id]),
      queryClient.invalidateQueries(['user-reservations', currentUser.id]),
    ]);
    setIsRefreshing(false);
  }, [queryClient, currentUser]);

  const handleViewDetails = useCallback((sessionId: number) => {
    navigate(`/sessions/${sessionId}`, { state: { from: '/my-favorites' } });
  }, [navigate]);

  // Get user's personal status for a session
  const getUserStatusInfo = (sessionId: number) => {
    if (!currentUser) {
      return { text: 'Available', color: 'text-success-600 bg-success-50', icon: null };
    }

    // Find user's reservation for this session
    const userReservation = userReservations.find(r => r.session_id === sessionId);
    
    if (userReservation) {
      // User has a reservation - show their personal status
      if (userReservation.status === 'approved') {
        return { 
          text: 'Confirmed', 
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          icon: <CheckCircle className="h-4 w-4 mr-1" />
        };
      }
      
      if (userReservation.status === 'waitlisted') {
        return { 
          text: 'Waitlisted', 
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
          icon: <Clock className="h-4 w-4 mr-1" />
        };
      }

      if (userReservation.status === 'cancelled') {
        return { 
          text: 'Cancelled', 
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
          icon: <XCircle className="h-4 w-4 mr-1" />
        };
      }
    }

    // No reservation - show session availability
    const favorite = favorites.find(
      (f) => f.session?.id === sessionId || f.session_id === sessionId
    );
    const session = favorite ? favoriteToSession(favorite) : null;
    if (session) {
      const status = getSessionStatus(session);
      const statusColor = getSessionStatusColor(status);
      const statusText = getSessionStatusText(status);
      return { text: statusText, color: statusColor, icon: null };
    }

    return { text: 'Available', color: 'text-success-600 bg-success-50', icon: null };
  };

  // Filter favorites based on search and category (memoized for performance)
  const filteredFavorites = useMemo(() => {
    return favorites.filter((favorite) => {
      const session = favoriteToSession(favorite);
      if (!session) return false;
      const matchesSearch =
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (session.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory = !selectedCategory || session.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [favorites, searchQuery, selectedCategory]);

  // Get unique categories from favorites (memoized for performance)
  const categories = useMemo(() => {
    return Array.from(new Set(favorites.map((f) => favoriteToSession(f)?.category).filter(Boolean)));
  }, [favorites]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="animate-pulse">
          <div className="h-10 bg-primary-100 rounded w-1/3 mb-8" />
          <div className="surface p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 h-12 bg-primary-100 rounded-xl" />
              <div className="lg:w-64 h-12 bg-primary-100 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="surface p-6 animate-pulse">
                <div className="h-4 bg-primary-100 rounded mb-4" />
                <div className="h-3 bg-primary-100 rounded mb-2" />
                <div className="h-3 bg-primary-100 rounded mb-4 w-2/3" />
                <div className="h-8 bg-primary-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="surface p-12 text-center">
          <Heart className="h-10 w-10 text-peach-500 mx-auto mb-4" />
          <h3 className="font-display text-lg text-ink mb-2">Error loading favorites</h3>
          <p className="section-copy mx-auto text-sm">
            Something went wrong while loading your favorite sessions.
          </p>
        </div>
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
        <span className="chip-peach mb-3 inline-flex">
          <Heart className="h-3.5 w-3.5 mr-1" />
          Saved sessions
        </span>
        <h1 className="section-title">My favorites</h1>
        <p className="section-copy mt-2">
          Sessions you've saved for later. Discover and manage your favorite activities.
        </p>
      </motion.div>

      <div className="surface p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft pointer-events-none" />
            <input
              type="text"
              placeholder="Search your favorite sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field pl-11"
            />
          </div>
          <div className="sm:w-56 relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="field pl-11 appearance-none cursor-pointer"
            >
              <option value="">All categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-ink-muted text-sm font-medium">
            <Heart className="h-4 w-4 text-peach-500" />
            {filteredFavorites.length} session{filteredFavorites.length !== 1 ? 's' : ''} found
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-ghost p-2"
            title="Refresh favorites"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </button>
        </div>

        {filteredFavorites.length === 0 ? (
          <div className="surface p-12 text-center">
            <Heart className="h-10 w-10 text-ink-soft mx-auto mb-4" />
            <h3 className="font-display text-lg text-ink mb-2">
              {favorites.length === 0 ? 'No favorites yet' : 'No matching favorites'}
            </h3>
            <p className="section-copy mx-auto text-sm">
              {favorites.length === 0
                ? 'Start exploring sessions and add them to your favorites by clicking the heart icon.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {favorites.length === 0 && (
              <button
                onClick={() => navigate('/sessions')}
                className="btn-primary mt-6 px-6 py-3"
              >
                Browse sessions
              </button>
            )}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
          {filteredFavorites.map((favorite) => {
            const session = favoriteToSession(favorite);
            if (!session) return null;

            const color = getSessionColor(session.category);
            const icon = getSessionIcon(session.category);
            
            // Get user's personal status instead of general session status
            const userStatus = getUserStatusInfo(session.id);
            const capacityPercentage = getCapacityPercentage(session);
            const capacityColor = getCapacityColor(capacityPercentage);
            const popularity = getSessionPopularity(session);
            const popularityBadge = getPopularityBadge(popularity);
            const popularityText = getPopularityText(popularity);
            const popularityColor = getPopularityColor(popularity);

            return (
              <motion.div key={session.id} variants={itemVariants}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ 
                    y: -8, 
                    scale: 1.02,
                    transition: { duration: 0.15, ease: "easeOut" }
                  }}
                  whileTap={{ 
                    scale: 0.98,
                    transition: { duration: 0.1 }
                  }}
                  className="group relative surface overflow-hidden cursor-pointer transition-shadow duration-150 hover:shadow-lift"
                  onClick={() => handleViewDetails(session.id)}
                >
                  <div className={cn('h-1.5 w-full', color)} />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg', color)}>
                          {icon}
                        </div>
                        <div>
                          <h3 className="font-display text-base text-ink group-hover:text-primary-600 transition-colors">
                            {session.title}
                          </h3>
                          <p className="text-sm text-ink-muted">{session.category}</p>
                        </div>
                      </div>
                      <span className={cn('chip text-xs', userStatus.color)}>
                        {userStatus.icon}
                        {userStatus.text}
                      </span>
                    </div>

                    {session.description && (
                      <p className="text-ink-muted text-sm mb-3 line-clamp-2">{session.description}</p>
                    )}

                    <div className="space-y-2 mb-3 text-sm text-ink-muted">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-ink-soft" />
                        <span>{formatDateTime(session.start_time)}</span>
                        <span>·</span>
                        <span>{formatDuration(session.start_time, session.end_time)}</span>
                      </div>
                      {session.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-ink-soft" />
                          <span>{session.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-ink-soft" />
                        <span>{session.approved_count} / {session.capacity} seats</span>
                        <span>·</span>
                        <span>{session.remaining_seats} remaining</span>
                      </div>
                      {session.friends_attending_count !== undefined && session.friends_attending_count > 0 && (
                        <div className="flex items-center gap-2 text-primary-600">
                          <Users className="h-4 w-4" />
                          <span>
                            {session.friends_attending_count === 1
                              ? '1 friend attending'
                              : `${session.friends_attending_count} friends attending`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-ink-muted mb-1">
                        <span>Capacity</span>
                        <span>{capacityPercentage}%</span>
                      </div>
                      <div className="w-full bg-primary-100 rounded-full h-1.5">
                        <div
                          className={cn('h-1.5 rounded-full transition-all duration-300', capacityColor)}
                          style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={cn('chip text-xs', popularityColor)}>
                        <span className="mr-1">{popularityBadge}</span>
                        {popularityText}
                      </span>
                      {session.waitlisted_count > 0 && (
                        <span className="text-xs text-peach-500 font-medium">
                          {session.waitlisted_count} on waitlist
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MyFavoritesPage;
