import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Calendar } from 'lucide-react';
import {
  useSessions,
  useSessionCategories,
  useRequestReservation,
  useSessionSearch,
  useRecommendedFeed,
} from '../hooks/useSessions';
import { useAppStore } from '../store/useAppStore';
import SessionCard from '../components/SessionCard';
import toast from 'react-hot-toast';

const SessionsPage = () => {
  const { currentUser, isAuthenticated } = useAppStore();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'popularity' | 'capacity'>('date');

  // Debounce search input by ~200ms before it hits the API
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchInput.trim()), 200);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const isSearching = debouncedQuery.length > 0;

  const { data: categories = [] } = useSessionCategories();
  const { data: searchResults, isLoading: searchLoading } = useSessionSearch(debouncedQuery);
  const { data: recommendedSessions, isLoading: recommendedLoading } = useRecommendedFeed(
    isAuthenticated && !isSearching
  );
  const { data: chronologicalSessions = [], isLoading: chronologicalLoading } = useSessions({
    category: selectedCategory || undefined,
  });

  const requestReservation = useRequestReservation();

  const { sessions, isLoading, feedLabel } = useMemo(() => {
    if (isSearching) {
      return { sessions: searchResults ?? [], isLoading: searchLoading, feedLabel: 'Search results' };
    }
    if (isAuthenticated && (recommendedSessions?.length ?? 0) > 0) {
      return { sessions: recommendedSessions!, isLoading: recommendedLoading, feedLabel: 'Recommended for you' };
    }
    return { sessions: chronologicalSessions, isLoading: chronologicalLoading, feedLabel: 'All sessions' };
  }, [
    isSearching,
    searchResults,
    searchLoading,
    isAuthenticated,
    recommendedSessions,
    recommendedLoading,
    chronologicalSessions,
    chronologicalLoading,
  ]);

  const handleReserve = async (sessionId: number) => {
    if (!currentUser) {
      toast.error('Sign in to reserve a spot');
      return;
    }

    try {
      await requestReservation.mutateAsync({
        user_id: currentUser.id,
        session_id: sessionId,
      });
    } catch {
      // Error toast is handled by the useRequestReservation hook
    }
  };

  const handleViewDetails = (sessionId: number) => {
    navigate(`/sessions/${sessionId}`, { state: { from: '/sessions' } });
  };

  const visibleSessions = useMemo(() => {
    return sessions
      .filter((session) => !selectedCategory || session.category === selectedCategory)
      .sort((a, b) => {
        switch (sortBy) {
          case 'popularity':
            return (b.approved_count + b.waitlisted_count) - (a.approved_count + a.waitlisted_count);
          case 'capacity':
            return b.remaining_seats - a.remaining_seats;
          case 'date':
          default:
            return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        }
      });
  }, [sessions, selectedCategory, sortBy]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="section-title">Sessions</h1>
        <p className="section-copy mt-2">
          Search by what you want to do, or browse a feed tuned to your interests.
        </p>
      </motion.div>

      {/* Search and Filters */}
      <div className="surface p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft pointer-events-none" />
              <input
                type="text"
                placeholder="Search sessions by name, topic, or keyword"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="field pl-11"
              />
            </div>
          </div>

          <div className="sm:w-56">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="field appearance-none cursor-pointer"
            >
              <option value="">All categories</option>
              {categories.map((category: any) => (
                <option key={category.category} value={category.category}>
                  {category.category} ({category.session_count})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:w-56">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'popularity' | 'capacity')}
              className="field appearance-none cursor-pointer"
            >
              <option value="date">Sort by date</option>
              <option value="popularity">Sort by popularity</option>
              <option value="capacity">Sort by availability</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-ink-muted text-sm font-medium">
            {isSearching ? <Search className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            {feedLabel}
          </div>
          <div className="text-sm text-ink-muted">
            {visibleSessions.length} session{visibleSessions.length !== 1 ? 's' : ''}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="surface p-6 animate-pulse">
                <div className="h-4 bg-primary-100 rounded mb-4" />
                <div className="h-3 bg-primary-100 rounded mb-2" />
                <div className="h-3 bg-primary-100 rounded mb-4 w-2/3" />
                <div className="h-8 bg-primary-100 rounded" />
              </div>
            ))}
          </div>
        ) : visibleSessions.length === 0 ? (
          <div className="surface p-12 text-center">
            <Calendar className="h-10 w-10 text-ink-soft mx-auto mb-4" />
            <h3 className="font-display text-lg text-ink mb-2">No sessions found</h3>
            <p className="section-copy mx-auto">
              {isSearching || selectedCategory
                ? 'Try a different search term or clear the category filter.'
                : 'No sessions are currently available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                currentUserId={currentUser?.id}
                onReserve={() => handleReserve(session.id)}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionsPage;
