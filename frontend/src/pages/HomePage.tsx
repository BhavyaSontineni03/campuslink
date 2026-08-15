import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Target, BellRing, ArrowRight, LogIn } from 'lucide-react';
import { useSessions, useRecommendedFeed, useRequestReservation } from '../hooks/useSessions';
import { useAppStore } from '../store/useAppStore';
import SessionCard from '../components/SessionCard';
import toast from 'react-hot-toast';

const beats = [
  {
    icon: Target,
    title: 'Personalized ranking',
    copy: 'Every feed is ordered around what you actually attend, not just what was posted most recently.',
    chipClass: 'chip-sky',
  },
  {
    icon: Search,
    title: 'Relevance search',
    copy: 'Search understands your intent so a query like "beginner yoga" surfaces the right sessions first.',
    chipClass: 'chip-mint',
  },
  {
    icon: BellRing,
    title: 'Reminder timing',
    copy: 'Reminders land when you are actually likely to act on them, cutting down last-minute no-shows.',
    chipClass: 'chip-peach',
  },
];

const HomePage = () => {
  const { currentUser, isAuthenticated } = useAppStore();
  const navigate = useNavigate();

  const { data: chronologicalSessions = [] } = useSessions();
  const { data: recommendedSessions = [] } = useRecommendedFeed(isAuthenticated);

  const requestReservation = useRequestReservation();

  const feedSessions = isAuthenticated && recommendedSessions.length > 0
    ? recommendedSessions
    : chronologicalSessions;

  const feedTitle = isAuthenticated && recommendedSessions.length > 0
    ? 'Recommended for you'
    : 'Upcoming sessions';

  const handleReserve = async (sessionId: number) => {
    if (!currentUser) {
      toast.error('Sign in to reserve a spot');
      return;
    }

    try {
      await requestReservation.mutateAsync({
        user_id: currentUser.id,
        session_id: sessionId
      });
    } catch {
      // Error toast is handled by the useRequestReservation hook
    }
  };

  const handleViewDetails = (sessionId: number) => {
    navigate(`/sessions/${sessionId}`, { state: { from: '/' } });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-14 sm:space-y-20">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto pt-4 sm:pt-8"
      >
        <span className="chip-lavender mb-5 inline-flex">CampusLink</span>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-ink text-balance leading-tight">
          Find the right event. Get reminded at the right time.
        </h1>
        <p className="section-copy mx-auto mt-5 text-lg">
          CampusLink ranks campus events around your interests and nudges you before
          seats fill up, so discovery and timing work together instead of against you.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={() => navigate('/sessions')}
            className="btn-primary px-6 py-3 text-base"
          >
            <Search className="h-5 w-5" />
            Browse events
            <ArrowRight className="h-4 w-4" />
          </button>

          {isAuthenticated ? (
            <button
              onClick={() => navigate('/sessions')}
              className="btn-secondary px-6 py-3 text-base"
            >
              <Sparkles className="h-5 w-5" />
              View your recommended feed
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="btn-secondary px-6 py-3 text-base"
            >
              <LogIn className="h-5 w-5" />
              Sign in
            </button>
          )}
        </div>
      </motion.section>

      {/* Why CampusLink */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="section-title text-center">Why CampusLink</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {beats.map((beat) => (
            <div key={beat.title} className="surface p-6">
              <span className={beat.chipClass}>
                <beat.icon className="h-3.5 w-3.5 mr-1" />
                {beat.title}
              </span>
              <p className="section-copy mt-4 text-sm">{beat.copy}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Feed */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title">{feedTitle}</h2>
          <button
            onClick={() => navigate('/sessions')}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {feedSessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {feedSessions.slice(0, 6).map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                currentUserId={currentUser?.id}
                onReserve={() => handleReserve(session.id)}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="surface p-10 text-center">
            <p className="section-copy mx-auto">No sessions to show yet. Check back soon.</p>
          </div>
        )}
      </motion.section>
    </div>
  );
};

export default HomePage;
