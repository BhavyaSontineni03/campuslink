import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setCurrentUser, setIsAuthenticated } = useAppStore();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { user, token } = await authApi.login(formData.email, formData.password);

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setCurrentUser(user);
      setIsAuthenticated(true);

      toast.success('Welcome back!');
      navigate('/');
    } catch {
      toast.error('Login failed. Please check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          <span className="chip-lavender mb-4 inline-flex">CampusLink</span>
          <h1 className="font-display text-3xl sm:text-4xl text-ink">
            Sign in to your account
          </h1>
          <p className="section-copy mx-auto mt-3 text-sm">
            Or{' '}
            <Link
              to="/register"
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="surface p-6 sm:p-8 space-y-5" onSubmit={handleSubmit}>
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
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft pointer-events-none" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="field pl-11 pr-11"
                placeholder="Enter your password"
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

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-ink-muted cursor-pointer">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-primary-200 text-primary-600 focus:ring-primary-300"
              />
              Remember me
            </label>
            <a href="#" className="font-semibold text-primary-600 hover:text-primary-700">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>

          <div className="pt-2 border-t border-primary-100/60">
            <p className="text-center text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
              Demo credentials
            </p>
            <div className="text-center text-sm text-ink-muted space-y-0.5">
              <p>Email: john.doe@university.edu</p>
              <p>Password: password</p>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
