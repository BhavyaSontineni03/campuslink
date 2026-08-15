import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import {
  Bell,
  Shield,
  Palette,
  Download,
  Trash2,
  User,
  Eye,
  EyeOff
} from 'lucide-react';

const SettingsPage = () => {
  const { theme, setTheme, currentUser } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    reminders: true
  });

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const notificationLabels: Record<string, { title: string; description: string }> = {
    email: { title: 'Email notifications', description: 'Receive updates via email' },
    push: { title: 'Push notifications', description: 'Get notified in the app' },
    sms: { title: 'SMS notifications', description: 'Receive text messages' },
    reminders: { title: 'Reminder notifications', description: 'Get reminders for upcoming sessions' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="chip-lavender mb-3 inline-flex">Preferences</span>
        <h1 className="section-title">Settings</h1>
        <p className="section-copy mt-2">
          Manage your account settings and preferences.
        </p>
      </motion.div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="surface p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <Palette className="h-5 w-5 text-primary-600" />
            <h2 className="font-display text-lg text-ink">Appearance</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-3">Theme</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <div className="w-3 h-3 bg-peach-300 rounded-sm" />
                Light
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <div className="w-3 h-3 bg-ink rounded-sm" />
                Dark
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="surface p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <Bell className="h-5 w-5 text-primary-600" />
            <h2 className="font-display text-lg text-ink">Notifications</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-ink">{notificationLabels[key].title}</h3>
                  <p className="text-sm text-ink-muted">{notificationLabels[key].description}</p>
                </div>
                <button
                  onClick={() => handleNotificationChange(key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-primary-500' : 'bg-primary-100'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="surface p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <User className="h-5 w-5 text-primary-600" />
            <h2 className="font-display text-lg text-ink">Account</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Full name</label>
              <input type="text" defaultValue={currentUser?.name || ''} className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
              <input type="email" defaultValue={currentUser?.email || ''} className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  defaultValue="••••••••"
                  className="field pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-soft hover:text-ink"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="surface p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <Shield className="h-5 w-5 text-primary-600" />
            <h2 className="font-display text-lg text-ink">Data & privacy</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-ink">Export data</h3>
                <p className="text-sm text-ink-muted">Download a copy of your data</p>
              </div>
              <button className="btn-secondary">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-ink">Delete account</h3>
                <p className="text-sm text-ink-muted">Permanently delete your account and all data</p>
              </div>
              <button className="btn bg-red-500 text-white hover:bg-red-600">
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </motion.div>

        <div className="flex justify-end">
          <button className="btn-primary px-6 py-3">Save changes</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
