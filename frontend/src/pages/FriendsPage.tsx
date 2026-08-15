import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  UserPlus, 
  Users, 
  MapPin,
  Clock,
  UserX,
  LogIn
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUsers, useUserFriends, useFollowUser, useUnfollowUser } from '../hooks/useUsers';
import { useSessions } from '../hooks/useSessions';
import { useAppStore } from '../store/useAppStore';
import UserProfileModal from '../components/UserProfileModal';

const FriendsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'friends' | 'requests'>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentUser, isAuthenticated } = useAppStore();
  
  const { data: users, isLoading: usersLoading } = useUsers(50, 0);
  const { data: friends, isLoading: friendsLoading } = useUserFriends(currentUser?.id || 0);

  // Auto-refresh data every 30 seconds
  const { data: sessions } = useSessions();
  
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const filteredUsers = users?.filter(user => 
    // Only show students
    user.role === 'student' &&
    // Exclude current user
    user.id !== currentUser?.id &&
    // Apply search filter
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  // Check if user is already followed
  const isUserFollowed = (userId: number) => {
    return friends?.some(friend => friend.id === userId) || false;
  };

  const handleFollowUser = async (targetUserId: number) => {
    if (!currentUser) return;
    try {
      await followUser.mutateAsync({ 
        userId: currentUser.id, 
        data: { target_user_id: targetUserId } 
      });
    } catch (error) {
      console.error('Failed to follow user:', error);
    }
  };

  const handleUnfollowUser = async (targetUserId: number) => {
    if (!currentUser) return;
    try {
      await unfollowUser.mutateAsync({ 
        userId: currentUser.id, 
        data: { target_user_id: targetUserId } 
      });
    } catch (error) {
      console.error('Failed to unfollow user:', error);
    }
  };

  const handleViewUser = (userId: number) => {
    const user = users?.find(u => u.id === userId);
    if (user) {
      setSelectedUser({
        ...user,
        sessions: [] as { id: number; title: string; date: string; location?: string; category: string }[]
      });
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const friendsAttendingSessions = sessions?.map(session => ({
    ...session,
    friendsAttending: friends?.filter((_friend) => 
      // This would need to be implemented with actual attendance data
      Math.random() > 0.7 // Mock data for demonstration
    ) || []
  })).filter(session => session.friendsAttending.length > 0) || [];

  const tabs = [
    { id: 'all', name: 'Students', count: filteredUsers.length },
    { id: 'friends', name: 'My Friends', count: friends?.length || 0 },
    { id: 'requests', name: 'Requests', count: 0 }
  ];

  // Show authentication required message if not signed in
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="surface p-12 text-center max-w-lg mx-auto">
          <LogIn className="h-10 w-10 text-ink-soft mx-auto mb-4" />
          <h3 className="font-display text-lg text-ink mb-2">Sign in required</h3>
          <p className="section-copy mx-auto text-sm mb-6">
            Please sign in to view your friends and connect with other users.
          </p>
          <Link to="/login" className="btn-primary px-6 py-3">
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
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
        <span className="chip-mint mb-3 inline-flex">
          <Users className="h-3.5 w-3.5 mr-1" />
          Community
        </span>
        <h1 className="section-title">Friends</h1>
        <p className="section-copy mt-2">
          Connect with friends and see what activities they're attending.
        </p>
      </motion.div>

      {/* Search and Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="surface p-5 sm:p-6"
      >
        <div className="flex flex-col lg:flex-row gap-4 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft pointer-events-none" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="field pl-11"
            />
          </div>
          <button
            onClick={() => alert('Use the search bar to find users and click "Follow" on their cards to add them as friends!')}
            className="btn-primary"
          >
            <UserPlus className="h-4 w-4" />
            Add friend
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`chip ${activeTab === tab.id ? 'chip-sky' : 'bg-canvas-soft text-ink-muted hover:bg-primary-50'}`}
            >
              {tab.name}
              <span className="ml-1.5 opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content based on active tab */}
      {activeTab === 'all' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="font-display text-lg text-ink">Students</h2>
          
          {usersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="surface p-6 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-primary-100 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-primary-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div 
              key="students-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filteredUsers.map((user) => (
                <motion.div 
                  key={user.id} 
                  whileHover={{ y: -4, transition: { duration: 0.15 } }}
                  className="surface p-5 cursor-pointer transition-shadow hover:shadow-lift"
                  onClick={() => handleViewUser(user.id)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-ink truncate">{user.name}</h3>
                      <p className="text-sm text-ink-muted truncate">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {isUserFollowed(user.id) ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnfollowUser(user.id);
                        }}
                        disabled={unfollowUser.isLoading}
                        className="btn-secondary flex-1 text-sm disabled:opacity-50"
                      >
                        <UserX className="h-4 w-4" />
                        {unfollowUser.isLoading ? 'Unfollowing...' : 'Unfollow'}
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowUser(user.id);
                        }}
                        disabled={followUser.isLoading}
                        className="btn-primary flex-1 text-sm disabled:opacity-50"
                      >
                        <UserPlus className="h-4 w-4" />
                        {followUser.isLoading ? 'Following...' : 'Follow'}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}

      {activeTab === 'friends' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="font-display text-lg text-ink">My friends</h2>
          
          {friendsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="surface p-6 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-primary-100 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-primary-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div 
              key="friends-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {friends?.map((friend) => (
                <motion.div 
                  key={friend.id} 
                  whileHover={{ y: -4, transition: { duration: 0.15 } }}
                  className="surface p-5 cursor-pointer transition-shadow hover:shadow-lift"
                  onClick={() => handleViewUser(friend.id)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-mint-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {friend.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-ink truncate">{friend.name}</h3>
                      <p className="text-sm text-ink-muted truncate">{friend.email}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnfollowUser(friend.id);
                    }}
                    disabled={unfollowUser.isLoading}
                    className="btn-secondary w-full text-sm disabled:opacity-50"
                  >
                    <UserX className="h-4 w-4" />
                    {unfollowUser.isLoading ? 'Unfollowing...' : 'Unfollow'}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}

      {activeTab === 'requests' && (
        <div className="surface p-12 text-center">
          <Users className="h-10 w-10 text-ink-soft mx-auto mb-4" />
          <h3 className="font-display text-lg text-ink mb-2">No friend requests</h3>
          <p className="section-copy mx-auto text-sm">
            You don't have any pending friend requests at the moment.
          </p>
        </div>
      )}

      {activeTab === 'friends' && !isModalOpen && friendsAttendingSessions.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg text-ink mb-5">Friends attending sessions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {friendsAttendingSessions.map((session) => (
              <div key={session.id} className="surface p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center text-white font-semibold">
                    {session.title.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-ink mb-1">{session.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(session.start_time).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {session.location}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary-600" />
                      <span className="text-sm font-medium text-ink">
                        {session.friendsAttending.length} friend{session.friendsAttending.length !== 1 ? 's' : ''} attending
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {session.friendsAttending.slice(0, 3).map((friend, index) => (
                        <div key={index} className="w-8 h-8 bg-mint-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {friend.name.charAt(0)}
                        </div>
                      ))}
                      {session.friendsAttending.length > 3 && (
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-ink-muted text-xs font-semibold">
                          +{session.friendsAttending.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        user={selectedUser}
      />
    </div>
  );
};

export default FriendsPage;
