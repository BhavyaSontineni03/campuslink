import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  UserPlus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Shield,
  User,
  UserCheck,
  UserX,
  MoreHorizontal,
  Crown,
  Star,
  GraduationCap
} from 'lucide-react';
import { useAdminUsers, useUpdateUserRole, useToggleUserStatus, useDeleteUser } from '../hooks/useAdmin';
import { useUpdateUserProfile } from '../hooks/useUsers';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';

// Edit User Form Component
const EditUserForm = ({ user, onSave, onCancel, isLoading }: {
  user: any;
  onSave: (data: { name: string; email: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() && formData.email.trim()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 glass-input"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 glass-input"
          required
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 glass-button-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !formData.name.trim() || !formData.email.trim()}
          className="flex-1 px-4 py-2 glass-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

const UserManagement = () => {
  const { currentUser } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<number | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowMoreMenu(null);
    };
    
    if (showMoreMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMoreMenu]);

  // Fetch users
  const { data: usersData, isLoading } = useAdminUsers(page, 20, {
    search: searchTerm,
    role: roleFilter
  });

  // Mutations
  const updateUserRole = useUpdateUserRole();
  const toggleUserStatus = useToggleUserStatus();
  const deleteUser = useDeleteUser();
  const updateUserProfile = useUpdateUserProfile();

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      // Security check: Prevent unauthorized role assignments
      if (newRole === 'super_admin') {
        toast.error('Cannot assign Super Admin role through this interface');
        return;
      }
      
      await updateUserRole.mutateAsync({ userId, role: newRole });
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const handleStatusToggle = async (userId: number, isActive: boolean) => {
    try {
      await toggleUserStatus.mutateAsync({ userId, isActive });
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        await deleteUser.mutateAsync(userId);
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
  };

  const handleSaveEdit = async (userData: { name: string; email: string }) => {
    if (!editingUser) return;
    
    try {
      await updateUserProfile.mutateAsync({
        userId: editingUser.id,
        profileData: userData
      });
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-600/80 text-white';
      case 'admin':
        return 'bg-red-600/80 text-white';
      case 'organizer':
        return 'bg-blue-600/80 text-white';
      case 'student':
        return 'bg-green-600/80 text-white';
      default:
        return 'bg-gray-600/80 text-white';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="h-6 w-6 text-white flex-shrink-0" />;
      case 'admin':
        return <Shield className="h-6 w-6 text-white flex-shrink-0" />;
      case 'organizer':
        return <Star className="h-6 w-6 text-white flex-shrink-0" />;
      case 'student':
        return <GraduationCap className="h-6 w-6 text-white flex-shrink-0" />;
      default:
        return <User className="h-6 w-6 text-white flex-shrink-0" />;
    }
  };

  const canDeleteUser = (targetUserRole: string, targetUserId: number) => {
    if (!currentUser) return false;
    
    // Can't delete self
    if (currentUser.id === targetUserId) return false;
    
    // Super admin can delete anyone
    if (currentUser.role === 'super_admin') return true;
    
    // Admin can delete students and organizers, but not other admins or super admins
    if (currentUser.role === 'admin') {
      return targetUserRole === 'student' || targetUserRole === 'organizer';
    }
    
    // Organizers and students cannot delete anyone
    return false;
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-600/80 text-white'
      : 'bg-red-600/80 text-white';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-ink">User management</h1>
            <p className="text-ink-muted text-sm mt-1">Manage users, roles, and permissions</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <UserPlus className="h-4 w-4" />
            Add user
          </motion.button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="surface p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="field pl-11 w-full"
            />
          </div>
          <div className="md:w-56 relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft pointer-events-none" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="field pl-11 appearance-none cursor-pointer w-full"
            >
              <option value="">All roles</option>
              <option value="student">Students</option>
              <option value="organizer">Organizers</option>
              <option value="admin">Admins</option>
              <option value="super_admin">Super admins</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Users Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden"
      >
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-4 text-lg">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="glass-card">
                <tr>
                  <th className="w-80 px-8 py-5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="w-48 px-6 py-5 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="w-32 px-6 py-5 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="w-32 px-6 py-5 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="w-40 px-6 py-5 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {usersData?.data?.map((user: any, index: number) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-white/20 hover:border-white/50 hover:shadow-xl hover:scale-[1.02] hover:backdrop-blur-sm hover:ring-2 hover:ring-primary-500/30 dark:hover:bg-gray-800/40 dark:hover:border-gray-600/70 dark:hover:shadow-2xl dark:hover:scale-[1.02] dark:hover:backdrop-blur-sm dark:hover:ring-2 dark:hover:ring-primary-400/40 transition-all duration-300"
                  >
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-full bg-primary-600/80 flex items-center justify-center text-white font-bold text-lg">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex justify-center">
                        {user.role === 'super_admin' ? (
                          /* Super Admin - Read Only Badge - Extra Wide Width */
                          <div className={cn(
                            'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium shadow-sm w-40',
                            getRoleColor(user.role)
                          )}>
                            {getRoleIcon(user.role)}
                            {user.role?.replace('_', ' ').toUpperCase()}
                          </div>
                        ) : (
                          /* Other Roles - Clickable Badge with Hidden Dropdown */
                          <div className="relative">
                            {/* Clickable Role Badge - Extra Wide Width */}
                            <div className={cn(
                              'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer w-40',
                              getRoleColor(user.role)
                            )}>
                              {getRoleIcon(user.role)}
                              {user.role?.replace('_', ' ').toUpperCase()}
                            </div>
                            
                            {/* Hidden Select - Invisible but functional */}
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            >
                              <option value="student">Student</option>
                              <option value="organizer">Organizer</option>
                              <option value="admin">Admin</option>
                              {/* Super Admin option removed for security - only existing super admins can promote others */}
                            </select>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex justify-center">
                        <span className={cn(
                          'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium min-w-[80px] justify-center',
                          getStatusColor(user.is_active)
                        )}>
                          {getStatusIcon(user.is_active)}
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex justify-center">
                        <span className="text-center">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleStatusToggle(user.id, !user.is_active)}
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            user.is_active 
                              ? 'text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'
                          )}
                        >
                          {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </motion.button>
                        {canDeleteUser(user.role, user.id) && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        )}
                        <div className="relative">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowMoreMenu(showMoreMenu === user.id ? null : user.id)}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </motion.button>
                          
                          {showMoreMenu === user.id && (
                            <div 
                              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleEditUser(user);
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit Profile
                                </button>
                                <button
                                  onClick={() => {
                                    handleStatusToggle(user.id, !user.is_active);
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                                >
                                  {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                  {user.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                {canDeleteUser(user.role, user.id) && (
                                  <button
                                    onClick={() => {
                                      handleDeleteUser(user.id, user.name);
                                      setShowMoreMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete User
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {usersData?.pagination && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between glass-card p-4"
        >
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, usersData.pagination.total)} of {usersData.pagination.total} users
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Page {page} of {usersData.pagination.pages}
            </span>
            <button
              onClick={() => setPage(Math.min(usersData.pagination.pages, page + 1))}
              disabled={page === usersData.pagination.pages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </motion.div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-modal p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Edit User
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <EditUserForm
              user={editingUser}
              onSave={handleSaveEdit}
              onCancel={() => setEditingUser(null)}
              isLoading={updateUserProfile.isLoading}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;