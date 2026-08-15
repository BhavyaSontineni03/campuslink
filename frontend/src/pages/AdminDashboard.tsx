import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  BookOpen, 
  UserX,
  Clock,
  CheckCircle,
  BarChart3,
  Activity,
  Shield,
  UserCog,
  Database,
  Bell
} from 'lucide-react';
import { useAdminOverview, useAdminUsers, useAdminSessions, useAdminReservations } from '../hooks/useAdmin';
import { useAppStore } from '../store/useAppStore';
import UserManagement from './UserManagement';
import { createSampleNotifications } from '../utils/createSampleNotifications';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { currentUser } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'sessions' | 'reservations'>('overview');

  // Set active tab based on URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/admin/users') {
      setActiveTab('users');
    } else if (path === '/admin/sessions') {
      setActiveTab('sessions');
    } else if (path === '/admin/reservations') {
      setActiveTab('reservations');
    } else {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  const handleTabChange = (tab: 'overview' | 'users' | 'sessions' | 'reservations') => {
    setActiveTab(tab);
    if (tab === 'overview') {
      navigate('/admin');
    } else {
      navigate(`/admin/${tab}`);
    }
  };

  const handleCreateSampleNotifications = async () => {
    if (!currentUser) return;
    
    try {
      await createSampleNotifications(currentUser.id);
      toast.success('Sample notifications created successfully!');
    } catch (error) {
      toast.error('Failed to create sample notifications');
      console.error('Error creating sample notifications:', error);
    }
  };

  // Fetch admin data
  const { data: overview, isLoading: overviewLoading } = useAdminOverview();
  useAdminUsers(1, 10);
  const { data: sessions, isLoading: sessionsLoading } = useAdminSessions(1, 10);
  const { data: reservations, isLoading: reservationsLoading } = useAdminReservations(1, 10);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'sessions', name: 'Sessions', icon: Calendar },
    { id: 'reservations', name: 'Reservations', icon: BookOpen }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="chip-lavender mb-2 inline-flex">Admin</span>
            <h1 className="section-title">Admin dashboard</h1>
            <p className="section-copy mt-1 text-sm">
              Welcome back, {currentUser?.name || 'Administrator'}
            </p>
          </div>
          <div className="p-3 bg-primary-500 rounded-xl">
            <Shield className="h-7 w-7 text-white" />
          </div>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-primary-100/60">
          <nav className="flex flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-4 font-medium text-sm transition-colors border-b-2',
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 bg-primary-50/50'
                      : 'border-transparent text-ink-muted hover:text-ink hover:bg-white/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="surface-muted p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary-600">Total users</p>
                      <p className="text-3xl font-display text-ink">{overviewLoading ? '...' : overview?.data?.totalUsers || 0}</p>
                    </div>
                    <div className="p-2.5 bg-primary-500 rounded-xl"><Users className="h-5 w-5 text-white" /></div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="surface-muted p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-mint-600">Total sessions</p>
                      <p className="text-3xl font-display text-ink">{overviewLoading ? '...' : overview?.data?.totalSessions || 0}</p>
                    </div>
                    <div className="p-2.5 bg-mint-500 rounded-xl"><Calendar className="h-5 w-5 text-white" /></div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="surface-muted p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-lavender-500">Total reservations</p>
                      <p className="text-3xl font-display text-ink">{overviewLoading ? '...' : overview?.data?.totalReservations || 0}</p>
                    </div>
                    <div className="p-2.5 bg-lavender-400 rounded-xl"><BookOpen className="h-5 w-5 text-white" /></div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="surface-muted p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-peach-500">Active sessions</p>
                      <p className="text-3xl font-display text-ink">{overviewLoading ? '...' : overview?.data?.activeSessions || 0}</p>
                    </div>
                    <div className="p-2.5 bg-peach-500 rounded-xl"><Activity className="h-5 w-5 text-white" /></div>
                  </div>
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="surface p-5">
                <h3 className="font-display text-lg text-ink mb-4">Quick actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button onClick={() => handleTabChange('users')} className="flex items-center gap-3 p-4 rounded-xl border border-primary-100 hover:bg-primary-50 transition-colors text-left">
                    <UserCog className="h-5 w-5 text-primary-500" />
                    <span className="font-medium text-ink">Manage users</span>
                  </button>
                  <button onClick={() => handleTabChange('sessions')} className="flex items-center gap-3 p-4 rounded-xl border border-primary-100 hover:bg-mint-50 transition-colors text-left">
                    <Database className="h-5 w-5 text-mint-500" />
                    <span className="font-medium text-ink">Manage sessions</span>
                  </button>
                  <button onClick={() => handleTabChange('reservations')} className="flex items-center gap-3 p-4 rounded-xl border border-primary-100 hover:bg-lavender-50 transition-colors text-left">
                    <BookOpen className="h-5 w-5 text-lavender-500" />
                    <span className="font-medium text-ink">View reservations</span>
                  </button>
                  <button onClick={handleCreateSampleNotifications} className="flex items-center gap-3 p-4 rounded-xl border border-primary-100 hover:bg-peach-50 transition-colors text-left">
                    <Bell className="h-5 w-5 text-peach-500" />
                    <span className="font-medium text-ink">Test notifications</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'users' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <UserManagement />
            </motion.div>
          )}

          {activeTab === 'sessions' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="surface p-5 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-xl text-ink">Session management</h2>
                      <p className="text-ink-muted text-sm mt-1">Manage all sessions and events</p>
                    </div>
                    <div className="p-2.5 bg-mint-100 rounded-xl">
                      <Database className="h-6 w-6 text-mint-600" />
                    </div>
                  </div>
                </div>

                <div className="surface p-5">
                  {sessionsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-500 mx-auto" />
                      <p className="text-ink-muted mt-4">Loading sessions...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sessions?.data?.map((session: any, index: number) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="surface-muted p-5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-medium text-ink mb-1">{session.title}</h3>
                              <p className="text-sm text-ink-muted">
                                {session.creator_name} · {new Date(session.start_time).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="p-2 bg-mint-500 rounded-lg">
                              <Calendar className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-ink-muted">Capacity</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-primary-100 rounded-full h-1.5">
                                  <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${(session.approved_count / session.capacity) * 100}%` }} />
                                </div>
                                <span className="font-medium text-ink">{session.approved_count}/{session.capacity}</span>
                              </div>
                            </div>
                            {session.waitlisted_count > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-ink-muted">Waitlist</span>
                                <span className="chip-peach">{session.waitlisted_count} waiting</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'reservations' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="surface p-5 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-xl text-ink">Reservation management</h2>
                      <p className="text-ink-muted text-sm mt-1">Manage all reservations and bookings</p>
                    </div>
                    <div className="p-2.5 bg-lavender-100 rounded-xl">
                      <BookOpen className="h-6 w-6 text-lavender-500" />
                    </div>
                  </div>
                </div>

                <div className="surface p-5">
                  {reservationsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-500 mx-auto" />
                      <p className="text-ink-muted mt-4">Loading reservations...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reservations?.data?.map((reservation: any, index: number) => (
                        <motion.div
                          key={reservation.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="surface-muted p-5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-4">
                              <div className="bg-lavender-400 rounded-xl p-2.5">
                                <BookOpen className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-medium text-ink">{reservation.session_title}</h3>
                                <p className="text-sm text-ink-muted">
                                  {reservation.user_name} · {new Date(reservation.session_start_time).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-ink-soft mt-1">
                                  ID #{reservation.id} · Created {new Date(reservation.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span className={cn(
                              'chip self-start sm:self-center',
                              reservation.status === 'approved' ? 'chip-mint'
                                : reservation.status === 'waitlisted' ? 'chip-peach'
                                : reservation.status === 'cancelled' ? 'bg-red-100 text-red-600'
                                : 'bg-primary-100 text-ink-muted'
                            )}>
                              {reservation.status === 'approved' && <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                              {reservation.status === 'waitlisted' && <Clock className="h-3.5 w-3.5 mr-1" />}
                              {reservation.status === 'cancelled' && <UserX className="h-3.5 w-3.5 mr-1" />}
                              {reservation.status?.toUpperCase()}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;