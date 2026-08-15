import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, UserPlus } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { setCurrentUser, setIsAuthenticated } = useAppStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        setIsLoading(false);
        return;
      }

      const { user, token } = await authApi.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role as 'student' | 'organizer'
      });

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setCurrentUser(user);
      setIsAuthenticated(true);

      toast.success('Account created successfully!');
      navigate('/');
    } catch (error: any) {
      const status = error?.response?.status;
      const apiMessage = error?.response?.data?.message || error?.response?.data?.error;
      if (!error?.response) {
        toast.error('Cannot reach the server. Make sure the API is running on port 3001.');
      } else if (status === 409) {
        toast.error(apiMessage || 'An account with this email already exists.');
      } else {
        toast.error(apiMessage || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <span className="chip-lavender mb-4 inline-flex">
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            CampusLink
          </span>
          <h1 className="font-display text-3xl sm:text-4xl text-ink">
            Create your account
          </h1>
          <p className="section-copy mx-auto mt-3 text-sm">
            Or{' '}
            <Link
              to="/login"
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="surface p-6 sm:p-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft pointer-events-none" />
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="field pl-11"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft pointer-events-none" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="field pl-11"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-ink mb-1.5">
              Account type
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="field appearance-none cursor-pointer"
            >
              <option value="student">Student (Attendee)</option>
              <option value="organizer">Organizer (Event Creator)</option>
            </select>
            <p className="mt-1.5 text-xs text-ink-muted">
              Students can book events; organizers can create them. Admin roles are assigned by administrators.
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft pointer-events-none" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="field pl-11 pr-11"
                placeholder="Create a password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-soft hover:text-ink"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft pointer-events-none" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="field pl-11 pr-11"
                placeholder="Confirm your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-soft hover:text-ink"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-ink-muted cursor-pointer">
            <input
              id="agree-terms"
              name="agree-terms"
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4 rounded border-primary-200 text-primary-600 focus:ring-primary-300"
            />
            <span>
              I agree to the{' '}
              <a href="#" className="font-semibold text-primary-600 hover:text-primary-700">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="font-semibold text-primary-600 hover:text-primary-700">Privacy Policy</a>
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
