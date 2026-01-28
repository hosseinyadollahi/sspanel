export interface ActiveConnection {
  id: string;
  ip: string;
  country: string; // e.g., 'US', 'DE', 'IR'
  device: string;  // e.g., 'Windows 10', 'Android', 'iPhone'
  connectedAt: string;
  currentDownloadSpeed: number; // Mbps
  currentUploadSpeed: number; // Mbps
  sessionUsageMB: number; // Total MB used in this specific session
}

export interface SiteUsage {
  domain: string;
  category: string; // e.g., 'Social', 'Video', 'Web'
  totalUsageMB: number;
  lastAccess: string;
}

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
  // Speed Limits (0 = Unlimited)
  speedLimitUpload: number; 
  speedLimitDownload: number;
  activeConnections: ActiveConnection[];
  siteUsageHistory: SiteUsage[]; // Persistent history of visited sites
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