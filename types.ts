export interface User {
  id: string;
  username: string;
  password: string;
  isActive: boolean;
  expiryDate: string; // ISO date string
  dataLimitGB: number;
  dataUsedGB: number;
  concurrentLimit: number;
  concurrentInUse: number;
  createdAt: string;
  notes: string;
  // Simulation for live graphs
  currentUploadSpeed: number; // Mbps
  currentDownloadSpeed: number; // Mbps
}

export interface AccessLog {
  id: string;
  timestamp: string;
  domain: string;
  method: string;
}

export interface SystemStats {
  cpu: number;
  ram: number;
  disk: number;
  uptime: string;
  totalTrafficUp: number;
  totalTrafficDown: number;
}

export interface AppSettings {
  panelDomain: string;
  serverIp: string;
  adminUser: string;
  adminPass: string;
  is2FAEnabled: boolean;
  secret2FA: string;
}
