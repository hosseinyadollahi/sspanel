
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, AppSettings, SystemStats, ActiveConnection, SiteUsage } from '../types';

interface AppContextType {
  users: User[];
  settings: AppSettings;
  stats: SystemStats;
  currentUser: string | null;
  login: (u: string, p: string, code?: string) => boolean;
  logout: () => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  updateSettings: (s: AppSettings) => void;
  generateRandomPassword: () => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_SETTINGS: AppSettings = {
  panelDomain: '',
  serverIp: '',
  adminUser: '',
  adminPass: '',
  is2FAEnabled: false,
  secret2FA: '',
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('auth_user'));
  const [stats, setStats] = useState<SystemStats>({
    cpu: 0,
    ram: 0,
    disk: 0,
    uptime: '-',
    totalTrafficUp: 0,
    totalTrafficDown: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load Initial Data
  useEffect(() => {
      const loadInitialData = async () => {
          await fetchSettings();
          await fetchUsers();
      };
      loadInitialData();
      
      const interval = setInterval(() => {
          fetchStats();
      }, 2000);

      return () => {
          clearInterval(interval);
          if (abortControllerRef.current) {
              abortControllerRef.current.abort();
          }
      };
  }, []);

  const safeFetch = async (url: string, options?: RequestInit) => {
      try {
          const res = await fetch(url, options);
          if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
          }
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
              return await res.json();
          }
          const text = await res.text();
          console.warn(`Received non-JSON response from ${url}:`, text.substring(0, 100));
          return null;
      } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
               return null;
          }
          console.error(`Fetch failed for ${url}:`, error);
          return null;
      }
  };

  const fetchSettings = async () => {
      const data = await safeFetch('/api/settings');
      if (data) setSettings(data);
  };

  const fetchUsers = async () => {
      const data = await safeFetch('/api/users');
      if (data && Array.isArray(data)) {
          const usersWithSim = data.map((u: any) => ({
              ...u,
              activeConnections: u.activeConnections || [],
              siteUsageHistory: u.siteUsageHistory || [],
              // Initialize with 0 for real display
              currentDownloadSpeed: 0,
              currentUploadSpeed: 0,
              speedLimitTotal: u.speedLimitTotal || 0
          }));
          setUsers(usersWithSim);
      }
  };

  const fetchStats = async () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const data = await safeFetch('/api/stats', { signal: abortControllerRef.current.signal });
      if (data) setStats(data);
  };

  const login = (u: string, p: string, code?: string) => {
    if (u === settings.adminUser && p === settings.adminPass) {
      if (settings.is2FAEnabled && code && code.length !== 6) { 
        return false; 
      }
      setCurrentUser(u);
      localStorage.setItem('auth_user', u);
      return true;
    }
    return false;
  };

  const logout = () => {
      setCurrentUser(null);
      localStorage.removeItem('auth_user');
  };

  const addUser = async (user: User) => {
      const res = await safeFetch('/api/users', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(user)
      });
      if (res && res.success) {
          fetchUsers();
      } else {
          setUsers(prev => [...prev, user]);
      }
  };
  
  const updateUser = async (updatedUser: User) => {
      const res = await safeFetch(`/api/users/${updatedUser.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(updatedUser)
      });
      if (res && res.success) {
         setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      } else {
         setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      }
  };

  const deleteUser = async (id: string) => {
      if(!window.confirm("Are you sure?")) return;
      const res = await safeFetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res && res.success) {
          setUsers(prev => prev.filter(u => u.id !== id));
      } else {
          setUsers(prev => prev.filter(u => u.id !== id));
      }
  };

  const updateSettings = async (s: AppSettings) => {
      const res = await safeFetch('/api/settings', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(s)
      });
      if (res && res.success) {
          setSettings(s);
      }
  };

  const generateRandomPassword = () => {
    // Only alphanumeric characters (a-z, A-Z, 0-9) to prevent shell issues
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  return (
    <AppContext.Provider value={{ 
      users, settings, stats, currentUser, 
      login, logout, addUser, updateUser, deleteUser, updateSettings, generateRandomPassword 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
