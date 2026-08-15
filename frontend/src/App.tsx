import { Routes, Route } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { useEffect } from 'react';
import Layout from './components/Layout';
import { useWebSocket } from './hooks/useWebSocket';
import HomePage from './pages/HomePage';
import SessionsPage from './pages/SessionsPage';
import SessionDetailPage from './pages/SessionDetailPage';
import MyBookingsPage from './pages/MyBookingsPage';
import MyFavoritesPage from './pages/MyFavoritesPage';
import ProfilePage from './pages/ProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import FriendsPage from './pages/FriendsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import CreateSessionPage from './pages/CreateSessionPage';
import EditSessionPage from './pages/EditSessionPage';
import OrganizerDashboard from './pages/OrganizerDashboard';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const { theme, setTheme, setCurrentUser, setIsAuthenticated } = useAppStore();

  // Live updates over WebSocket (reservations, waitlist, seats, notifications)
  useWebSocket();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    setTheme(savedTheme || 'light');

    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    if (savedUser && savedToken) {
      try {
        setCurrentUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, [setTheme, setCurrentUser, setIsAuthenticated]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="min-h-screen bg-canvas text-ink transition-colors duration-150">
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/my-favorites" element={<MyFavoritesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminDashboard />} />
          <Route path="/admin/sessions" element={<AdminDashboard />} />
          <Route path="/admin/reservations" element={<AdminDashboard />} />
          <Route path="/organizer" element={<OrganizerDashboard />} />
          <Route path="/create-session" element={<CreateSessionPage />} />
          <Route path="/organizer/sessions/:id/edit" element={<EditSessionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </div>
  );
}

export default App;
