import { create } from 'zustand';
import { User, SessionWithFriends } from '../types';

interface AppState {
  // User state
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  // Authentication state
  isAuthenticated: boolean;
  setIsAuthenticated: (authenticated: boolean) => void;
  
  // Session state
  selectedSession: SessionWithFriends | null;
  setSelectedSession: (session: SessionWithFriends | null) => void;
  
  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  error: string | null;
  setError: (error: string | null) => void;
  
  // Theme state
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  
  // Navigation state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  
  // Actions
  clearError: () => void;
  reset: () => void;
  signOut: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // User state
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  // Authentication state
  isAuthenticated: false,
  setIsAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  
  // Session state
  selectedSession: null,
  setSelectedSession: (session) => set({ selectedSession: session }),
  
  // UI state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  error: null,
  setError: (error) => set({ error }),
  
  // Theme state
  theme: 'light',
  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(newTheme);
  },
  
  // Navigation state
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  // Actions
  clearError: () => set({ error: null }),
  reset: () => set({
    currentUser: null,
    isAuthenticated: false,
    selectedSession: null,
    isLoading: false,
    error: null,
    sidebarOpen: false
  }),
  signOut: () => {
    set({
      currentUser: null,
      isAuthenticated: false,
      selectedSession: null,
      error: null,
      sidebarOpen: false
    });
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
}));
