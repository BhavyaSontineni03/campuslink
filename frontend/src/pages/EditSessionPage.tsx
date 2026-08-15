import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { Calendar, ArrowLeft } from 'lucide-react';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

const EditSessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const sessionId = parseInt(id!);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [timeError, setTimeError] = useState('');

  // Fetch session data
  const { data: session, isLoading, error } = useQuery({
    queryKey: ['session', sessionId, currentUser?.id],
    queryFn: () => api.get(`/sessions/${sessionId}?userId=${currentUser?.id}`).then((res: any) => res.data.data),
    enabled: !!currentUser && !!sessionId,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache the data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Update form state when session data changes
  useEffect(() => {
    if (session) {
      console.log('🔄 Updating form with session data:', session);
      
      setTitle(session.title || '');
      setDescription(session.description || '');
      setCategory(session.category || '');
      setTags(Array.isArray(session.tags) ? session.tags.join(', ') : '');
      
      // Properly format datetime for datetime-local inputs
      const startDate = new Date(session.start_time);
      const endDate = new Date(session.end_time);
      
      // Convert to local timezone and format for datetime-local input
      const formatForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };
      
      const formattedStartTime = formatForInput(startDate);
      const formattedEndTime = formatForInput(endDate);
      
      console.log('📅 Formatted times:', { 
        original: { start: session.start_time, end: session.end_time },
        formatted: { start: formattedStartTime, end: formattedEndTime }
      });
      
      setStartTime(formattedStartTime);
      setEndTime(formattedEndTime);
      setCapacity(session.capacity || '');
      setLocation(session.location || '');
      
      // Clear any previous errors
      setErrors({});
      setTimeError('');
    }
  }, [session]);

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: (updatedSession: any) => api.put(`/sessions/${sessionId}`, updatedSession),
    onSuccess: async (data) => {
      // Comprehensive invalidation to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['popular-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['organizer-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'utilization'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      
      // Force refetch to ensure data is fresh
      await queryClient.refetchQueries({ queryKey: ['sessions'] });
      await queryClient.refetchQueries({ queryKey: ['session', sessionId] });
      
      // Update the form with the latest data from the response
      if (data?.data) {
        const updatedSession = data.data;
        setTitle(updatedSession.title || '');
        setDescription(updatedSession.description || '');
        setCategory(updatedSession.category || '');
        
        // Update times with fresh data
        const startDate = new Date(updatedSession.start_time);
        const endDate = new Date(updatedSession.end_time);
        
        const formatForInput = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };
        
        setStartTime(formatForInput(startDate));
        setEndTime(formatForInput(endDate));
        setCapacity(updatedSession.capacity || '');
        setLocation(updatedSession.location || '');
      }
      
      toast.success('Session updated successfully!');
      navigate(`/sessions/${sessionId}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update session');
    }
  });

  // Remove authorization check - allow all users to edit

  const validateTimes = () => {
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (start >= end) {
        setTimeError('❌ End time must be after start time!');
      } else {
        setTimeError('');
      }
    } else {
      setTimeError('');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!title) newErrors.title = 'Title is required';
    if (!category) newErrors.category = 'Category is required';
    if (!startTime) newErrors.startTime = 'Start time is required';
    if (!endTime) newErrors.endTime = 'End time is required';
    if (!capacity || capacity <= 0) newErrors.capacity = 'Capacity must be a positive number';
    if (new Date(startTime) >= new Date(endTime)) newErrors.time = 'Start time must be before end time';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if already updating
    if (updateSessionMutation.isLoading) {
      toast.error('Please wait, update in progress...');
      return;
    }
    
    if (!validateForm()) {
      toast.error('Please correct the errors in the form.');
      return;
    }

    const updatedSessionData = {
      title,
      description,
      category,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      capacity: Number(capacity),
      location,
      tags: tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    };

    updateSessionMutation.mutate(updatedSessionData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <span className="loading loading-spinner loading-lg text-primary-500"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 dark:text-red-400">
        Error loading session: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Session not found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          The session you're looking for doesn't exist or you don't have permission to edit it.
        </p>
        <button
          onClick={() => navigate('/organizer')}
          className="btn btn-primary btn-md"
        >
          Back to My Sessions
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8 max-w-3xl"
    >
      <button
        onClick={() => navigate(`/sessions/${sessionId}`)}
        className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Session Details
      </button>

      <h1 className="text-4xl lg:text-5xl font-extrabold text-center text-gray-900 dark:text-white mb-4">
        Edit Session
      </h1>
      <p className="text-lg text-center text-gray-600 dark:text-gray-400 mb-8">
        Update the details of your session.
      </p>

      <div className="glass-card p-6 lg:p-8">
        <form key={session?.id || 'loading'} onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={updateSessionMutation.isLoading}
              className={cn("glass-input w-full", errors.title && "border-red-500", updateSessionMutation.isLoading && "opacity-50 cursor-not-allowed")}
              placeholder="e.g., Advanced React Workshop"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="glass-input w-full"
              placeholder="Provide a detailed description of your session..."
            ></textarea>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <div className="relative">
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={cn("glass-input w-full appearance-none pr-10", errors.category && "border-red-500")}
              >
                <option value="">Select a category</option>
                <option value="Technology">Technology</option>
                <option value="Fitness">Fitness</option>
                <option value="Cultural">Cultural</option>
                <option value="Academic">Academic</option>
                <option value="Social">Social</option>
                <option value="Wellness">Wellness</option>
                <option value="Art">Art</option>
                <option value="Other">Other</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              value={tags}
              disabled={updateSessionMutation.isLoading}
              onChange={(e) => setTags(e.target.value)}
              className={cn("glass-input w-full", updateSessionMutation.isLoading && "opacity-50 cursor-not-allowed")}
              placeholder="Comma-separated, e.g. fitness, wellness, workshop"
            />
          </div>

          {/* Start and End Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="datetime-local"
                id="startTime"
                value={startTime}
                disabled={updateSessionMutation.isLoading}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setTimeout(validateTimes, 100); // Small delay to ensure state is updated
                }}
                className={cn("glass-input w-full", errors.startTime && "border-red-500", updateSessionMutation.isLoading && "opacity-50 cursor-not-allowed")}
              />
              {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime}</p>}
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time
              </label>
              <input
                type="datetime-local"
                id="endTime"
                value={endTime}
                disabled={updateSessionMutation.isLoading}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setTimeout(validateTimes, 100); // Small delay to ensure state is updated
                }}
                className={cn("glass-input w-full", errors.endTime && "border-red-500", updateSessionMutation.isLoading && "opacity-50 cursor-not-allowed")}
              />
              {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime}</p>}
            </div>
          </div>
          
          {/* Time validation error */}
          {timeError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                {timeError}
              </p>
            </div>
          )}
          {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}

          {/* Capacity */}
          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Capacity
            </label>
            <input
              type="number"
              id="capacity"
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value))}
              className={cn("glass-input w-full", errors.capacity && "border-red-500")}
              placeholder="e.g., 50"
              min="1"
            />
            {errors.capacity && <p className="text-red-500 text-xs mt-1">{errors.capacity}</p>}
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="glass-input w-full"
              placeholder="e.g., University Auditorium"
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/sessions/${sessionId}`)}
              className="btn btn-outline px-6 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-6 py-2 rounded-lg"
              disabled={updateSessionMutation.isLoading}
            >
              {updateSessionMutation.isLoading ? 'Updating...' : 'Update Session'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default EditSessionPage;
