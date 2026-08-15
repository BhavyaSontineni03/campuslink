import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Tag, 
  FileText,
  ArrowLeft,
  Save
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { sessionApi } from '../services/api';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

const CreateSessionPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    start_time: '',
    end_time: '',
    capacity: '',
    location: '',
    tags: '',
  });
  const [timeError, setTimeError] = useState('');

  const categories = [
    'Fitness',
    'Academic',
    'Social',
    'Cultural',
    'Sports',
    'Technology',
    'Arts',
    'Wellness',
    'Career',
    'Other'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Real-time time validation
    if (name === 'start_time' || name === 'end_time') {
      validateTimes();
    }
  };

  const validateTimes = () => {
    if (formData.start_time && formData.end_time) {
      const startTime = new Date(formData.start_time);
      const endTime = new Date(formData.end_time);
      
      if (startTime >= endTime) {
        setTimeError('❌ End time must be after start time!');
      } else {
        setTimeError('');
      }
    } else {
      setTimeError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.category || !formData.start_time || !formData.end_time || !formData.capacity) {
        toast.error('Please fill in all required fields');
        setIsLoading(false);
        return;
      }

      // Validate capacity
      const capacity = parseInt(formData.capacity);
      if (capacity <= 0) {
        toast.error('Capacity must be greater than 0');
        setIsLoading(false);
        return;
      }

      // Validate time
      const startTime = new Date(formData.start_time);
      const endTime = new Date(formData.end_time);
      if (startTime >= endTime) {
        toast.error('❌ End time must be after start time! Please check your dates and times.');
        setIsLoading(false);
        return;
      }

      // Create session
      const sessionData = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        capacity: capacity,
        location: formData.location || null,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
        created_by: currentUser?.id
      };

      await sessionApi.create(sessionData);
      
      // Invalidate and refetch sessions list
      queryClient.invalidateQueries(['sessions']);
      queryClient.invalidateQueries(['popular-sessions']);
      queryClient.invalidateQueries(['organizer-sessions']);
      
      // Force refetch to ensure data is fresh
      await queryClient.refetchQueries(['sessions']);
      
      toast.success('Session created successfully!');
      navigate('/sessions');
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast.error(error.response?.data?.message || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Create New Session
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Set up a new event or activity for students to join
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card"
        >
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Basic Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Session Title *
                  </label>
                  <div className="relative group">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white dark:text-white group-focus-within:text-blue-400 transition-colors duration-200 z-10 pointer-events-none" />
                    <input
                      type="text"
                      id="title"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 glass-input"
                      placeholder="Enter session title"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <div className="relative group">
                    <FileText className="absolute left-3 top-4 h-5 w-5 text-white dark:text-white group-focus-within:text-blue-400 transition-colors duration-200 z-10 pointer-events-none" />
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={formData.description}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 glass-input resize-none"
                      placeholder="Describe your session..."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <div className="relative group">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white dark:text-white group-focus-within:text-blue-400 transition-colors duration-200 z-10 pointer-events-none" />
                    <select
                      id="category"
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 glass-input appearance-none cursor-pointer"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-white dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <div className="relative group">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white dark:text-white group-focus-within:text-blue-400 transition-colors duration-200 z-10 pointer-events-none" />
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 glass-input"
                      placeholder="Enter location"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    className="w-full px-4 py-3 glass-input"
                    placeholder="Comma-separated, e.g. fitness, wellness, workshop"
                  />
                  <p className="mt-1 text-xs text-gray-500">Used by the recommendation engine and full-text search.</p>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Date & Time
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Time *
                  </label>
                  <div className="relative group">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white dark:text-white group-focus-within:text-blue-400 transition-colors duration-200 z-10 pointer-events-none" />
                    <input
                      type="datetime-local"
                      id="start_time"
                      name="start_time"
                      required
                      value={formData.start_time}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Time *
                  </label>
                  <div className="relative group">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white dark:text-white group-focus-within:text-blue-400 transition-colors duration-200 z-10 pointer-events-none" />
                    <input
                      type="datetime-local"
                      id="end_time"
                      name="end_time"
                      required
                      value={formData.end_time}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
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
            </div>

            {/* Capacity */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Capacity
                </h2>
              </div>

              <div className="max-w-md">
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Participants *
                </label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  required
                  min="1"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter capacity"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  How many people can join this session?
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2",
                  isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-primary-600/80 hover:bg-primary-700/80 text-white shadow-md hover:shadow-lg"
                )}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Session
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateSessionPage;
