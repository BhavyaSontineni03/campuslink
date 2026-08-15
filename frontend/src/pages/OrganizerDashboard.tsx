import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Users, 
  Clock, 
  MapPin, 
  Filter,
  Search,
  Eye,
  BarChart3
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import { organizerApi } from '../services/api';
import { SessionWithCapacity } from '../types';

const OrganizerDashboard: React.FC = () => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionWithCapacity | null>(null);

  // Fetch organizer sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['organizer-sessions'],
    queryFn: organizerApi.getSessions,
    enabled: !!currentUser && currentUser.role === 'organizer'
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: organizerApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizer-sessions'] });
      setShowDeleteModal(false);
      setSessionToDelete(null);
    }
  });

  // Filter sessions
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (session.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesCategory = !selectedCategory || session.category === selectedCategory;
    const matchesStatus = !selectedStatus || (
      selectedStatus === 'upcoming' ? new Date(session.start_time) > new Date() :
      selectedStatus === 'past' ? new Date(session.end_time) < new Date() :
      selectedStatus === 'ongoing' ? new Date(session.start_time) <= new Date() && new Date(session.end_time) > new Date() :
      true
    );
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get unique categories
  const categories = [...new Set(sessions.map((session) => session.category))];

  // Handle delete session
  const handleDeleteSession = (session: SessionWithCapacity) => {
    setSessionToDelete(session);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (sessionToDelete) {
      deleteSessionMutation.mutate(sessionToDelete.id);
    }
  };

  // Redirect if not organizer
  useEffect(() => {
    if (currentUser && currentUser.role !== 'organizer') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'organizer') {
    return null;
  }

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

  return (
    <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="chip-sky mb-3 inline-flex">Organizer</span>
          <h1 className="section-title">My sessions</h1>
          <p className="section-copy mt-2">
            Manage and monitor your created sessions.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-ink-muted text-sm">Total sessions</p>
                <p className="text-2xl font-display text-ink">{sessions.length}</p>
              </div>
              <Calendar className="h-7 w-7 text-primary-500" />
            </div>
          </div>
          
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-ink-muted text-sm">Upcoming</p>
                <p className="text-2xl font-display text-ink">
                  {sessions.filter((s) => new Date(s.start_time) > new Date()).length}
                </p>
              </div>
              <Clock className="h-7 w-7 text-mint-500" />
            </div>
          </div>
          
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-ink-muted text-sm">Total attendees</p>
                <p className="text-2xl font-display text-ink">
                  {sessions.reduce((sum, s) => sum + s.approved_count, 0)}
                </p>
              </div>
              <Users className="h-7 w-7 text-lavender-500" />
            </div>
          </div>
          
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-ink-muted text-sm">Waitlisted</p>
                <p className="text-2xl font-display text-ink">
                  {sessions.reduce((sum, s) => sum + s.waitlisted_count, 0)}
                </p>
              </div>
              <BarChart3 className="h-7 w-7 text-peach-500" />
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="surface p-5 sm:p-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft h-5 w-5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="field pl-11 w-full"
              />
            </div>

            <div className="relative sm:w-48">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft h-5 w-5 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="field pl-11 appearance-none cursor-pointer w-full"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="sm:w-40">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="field appearance-none cursor-pointer w-full"
              >
                <option value="">All status</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="past">Past</option>
              </select>
            </div>

            <button
              onClick={() => navigate('/create-session')}
              className="btn-primary px-6 py-3"
            >
              <Plus className="h-5 w-5" />
              Create session
            </button>
          </div>
        </motion.div>

        {/* Sessions List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="surface p-6 animate-pulse">
                  <div className="h-4 bg-primary-100 rounded mb-4" />
                  <div className="h-3 bg-primary-100 rounded mb-2" />
                  <div className="h-3 bg-primary-100 rounded mb-4" />
                </div>
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <motion.div variants={itemVariants} className="surface p-12 text-center">
              <Calendar className="h-10 w-10 text-ink-soft mx-auto mb-4" />
              <h3 className="font-display text-lg text-ink mb-2">No sessions found</h3>
              <p className="section-copy mx-auto text-sm mb-6">
                {searchTerm || selectedCategory || selectedStatus
                  ? 'Try adjusting your filters'
                  : 'Create your first session to get started'}
              </p>
              <button onClick={() => navigate('/create-session')} className="btn-primary">
                Create session
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredSessions.map((session) => (
                <motion.div
                  key={session.id}
                  variants={itemVariants}
                  className="surface p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-display text-base text-ink mb-1">{session.title}</h3>
                      <p className="text-sm text-ink-muted mb-2 line-clamp-2">{session.description}</p>
                      <span className="chip-sky">{session.category}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-ink-muted">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-ink-soft" />
                      {new Date(session.start_time).toLocaleDateString()} at{' '}
                      {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-ink-soft" />
                      {session.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-ink-soft" />
                      {session.approved_count}/{session.capacity} attendees
                      {session.waitlisted_count > 0 && (
                        <span className="text-peach-500">({session.waitlisted_count} waitlisted)</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    {new Date(session.start_time) > new Date() ? (
                      <span className="chip-mint">Upcoming</span>
                    ) : new Date(session.end_time) < new Date() ? (
                      <span className="chip bg-primary-100 text-ink-muted">Past</span>
                    ) : (
                      <span className="chip-sky">Ongoing</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/sessions/${session.id}`)}
                      className="btn-secondary flex-1 text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/organizer/sessions/${session.id}/edit`)}
                      className="btn-secondary flex-1 text-sm"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session)}
                      className="btn bg-red-500 text-white hover:bg-red-600 px-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="surface p-6 max-w-md w-full"
              >
                <h3 className="font-display text-xl text-ink mb-4">Delete session</h3>
                <p className="text-ink-muted mb-6">
                  Are you sure you want to delete "{sessionToDelete?.title}"?
                  This action cannot be undone and will cancel all reservations.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleteSessionMutation.isLoading}
                    className="btn bg-red-500 text-white hover:bg-red-600 flex-1"
                  >
                    {deleteSessionMutation.isLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};

export default OrganizerDashboard;
