import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  // Load Initial Data
  useEffect(() => {
      fetchSettings();
      fetchUsers();
      
      const interval = setInterval(() => {
          fetchStats();
          // Simulate live traffic updates on client side for visual effects
          // In a real production app with websockets, this would come from server
          simulateLiveTraffic(); 
      }, 2000);
      return () => clearInterval(interval);
  }, []);

  const fetchSettings = async () => {
      try {
          const res = await fetch('/api/settings');
          const data = await res.json();
          setSettings(data);
      } catch (e) { console.error("Failed to fetch settings", e); }
  };

  const fetchUsers = async () => {
      try {
          const res = await fetch('/api/users');
          const data = await res.json();
          // Initialize simulation fields
          const usersWithSim = data.map((u: any) => ({
              ...u,
              activeConnections: [],
              siteUsageHistory: [],
              currentDownloadSpeed: 0,
              currentUploadSpeed: 0
          }));
          setUsers(usersWithSim);
      } catch (e) { console.error("Failed to fetch users", e); }
  };

  const fetchStats = async () => {
      try {
          const res = await fetch('/api/stats');
          const data = await res.json();
          setStats(data);
      } catch (e) { console.error("Failed to fetch stats", e); }
  };

  const simulateLiveTraffic = () => {
      setUsers(prev => prev.map(u => {
          if (!u.isActive) return u;
          // Only simulate if user is active
          const dl = Math.random() > 0.5 ? parseFloat((Math.random() * 5).toFixed(2)) : 0;
          const ul = Math.random() > 0.5 ? parseFloat((Math.random() * 1).toFixed(2)) : 0;
          return {
              ...u,
              currentDownloadSpeed: dl,
              currentUploadSpeed: ul
          };
      }));
  };

  const login = (u: string, p: string, code?: string) => {
    // In a real secure app, this would be a POST /api/login call returning a JWT
    // For this implementation, we check against the settings loaded from DB
    if (u === settings.adminUser && p === settings.adminPass) {
      if (settings.is2FAEnabled && code && code.length !== 6) { 
        // Rudimentary 2FA check (Mock)
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
      try {
          const res = await fetch('/api/users', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(user)
          });
          if(res.ok) {
              setUsers([...users, user]);
          }
      } catch(e) { alert("Error creating user"); }
  };
  
  const updateUser = async (updatedUser: User) => {
      try {
          const res = await fetch(`/api/users/${updatedUser.id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(updatedUser)
          });
          if(res.ok) {
             setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
          }
      } catch(e) { alert("Error updating user"); }
  };

  const deleteUser = async (id: string) => {
      if(!window.confirm("Are you sure?")) return;
      try {
          const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
          if(res.ok) {
              setUsers(users.filter(u => u.id !== id));
          }
      } catch(e) { alert("Error deleting user"); }
  };

  const updateSettings = async (s: AppSettings) => {
      try {
          const res = await fetch('/api/settings', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(s)
          });
          if(res.ok) {
              setSettings(s);
          }
      } catch(e) { alert("Error saving settings"); }
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
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