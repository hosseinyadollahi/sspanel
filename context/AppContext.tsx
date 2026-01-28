import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AppSettings, SystemStats } from '../types';

interface AppContextType {
  users: User[];
  settings: AppSettings;
  stats: SystemStats;
  currentUser: string | null; // Admin login state
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
  panelDomain: 'panel.example.com',
  serverIp: '192.168.1.100',
  adminUser: 'admin',
  adminPass: 'admin123',
  is2FAEnabled: false,
  secret2FA: 'JBSWY3DPEHPK3PXP', // Mock secret
};

const MOCK_USERS: User[] = [
  {
    id: '1',
    username: 'test_user_1',
    password: 'password123',
    isActive: true,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    dataLimitGB: 50,
    dataUsedGB: 12.5,
    concurrentLimit: 2,
    concurrentInUse: 1,
    createdAt: new Date().toISOString(),
    notes: 'کاربر تست',
    currentUploadSpeed: 0,
    currentDownloadSpeed: 0,
  },
  {
    id: '2',
    username: 'vip_client',
    password: 'supersecret',
    isActive: false,
    expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired
    dataLimitGB: 100,
    dataUsedGB: 99.8,
    concurrentLimit: 5,
    concurrentInUse: 0,
    createdAt: new Date().toISOString(),
    notes: 'اکانت منقضی شده',
    currentUploadSpeed: 0,
    currentDownloadSpeed: 0,
  }
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [stats, setStats] = useState<SystemStats>({
    cpu: 15,
    ram: 40,
    disk: 25,
    uptime: '12 روز, 4 ساعت',
    totalTrafficUp: 450,
    totalTrafficDown: 1200
  });

  // Simulator Effect: Randomize stats and user speeds
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate Server Stats
      setStats(prev => ({
        ...prev,
        cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() * 10 - 5))),
        ram: Math.min(100, Math.max(0, prev.ram + (Math.random() * 5 - 2.5))),
      }));

      // Simulate User Traffic
      setUsers(prevUsers => prevUsers.map(u => {
        if (!u.isActive) return { ...u, currentUploadSpeed: 0, currentDownloadSpeed: 0 };
        return {
          ...u,
          currentUploadSpeed: parseFloat((Math.random() * 2).toFixed(2)),
          currentDownloadSpeed: parseFloat((Math.random() * 10).toFixed(2)),
          dataUsedGB: u.dataUsedGB + 0.0001 // Slowly increment usage
        };
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const login = (u: string, p: string, code?: string) => {
    if (u === settings.adminUser && p === settings.adminPass) {
      if (settings.is2FAEnabled && code !== '123456') { // Mock 2FA check
        return false;
      }
      setCurrentUser(u);
      return true;
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  const addUser = (user: User) => setUsers([...users, user]);
  
  const updateUser = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const updateSettings = (s: AppSettings) => setSettings(s);

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
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
