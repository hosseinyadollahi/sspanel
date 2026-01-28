
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../core/context/AppContext';
import { ArrowLeft, Wifi, Clock, Database, Globe, QrCode, Smartphone, Copy, Monitor, Network, Gauge, Infinity, CheckCircle, Activity, Server, ArrowDown, ArrowUp } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { User } from '../../core/types';

export const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { users, settings, updateUser } = useApp();
  const user = users.find(u => u.id === id);
  const [liveData, setLiveData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

  // Local state for editing
  const [editForm, setEditForm] = useState<Partial<User>>({});
  
  // Toggles for Edit Tab
  const [unlimitedData, setUnlimitedData] = useState(false);
  const [unlimitedExpiry, setUnlimitedExpiry] = useState(false);
  const [unlimitedSpeed, setUnlimitedSpeed] = useState(false);
  const [useTotalSpeed, setUseTotalSpeed] = useState(true);

  useEffect(() => {
    if (user) {
      setEditForm(user);
      setUnlimitedData(user.dataLimitGB === 0);
      
      const hasTotal = user.speedLimitTotal && user.speedLimitTotal > 0;
      const hasSep = user.speedLimitUpload > 0 || user.speedLimitDownload > 0;

      setUnlimitedSpeed(!hasTotal && !hasSep);
      setUseTotalSpeed(hasTotal || (!hasSep && !hasTotal));

      const year = new Date(user.expiryDate).getFullYear();
      setUnlimitedExpiry(year > 2090);
    }
  }, [user]);

  // Simulate Live Graph
  useEffect(() => {
    const interval = setInterval(() => {
      if (!user) return;
      setLiveData(prev => {
        const newData = [...prev, {
          time: new Date().toLocaleTimeString(),
          up: user.currentUploadSpeed,
          down: user.currentDownloadSpeed
        }];
        return newData.slice(-30); // Keep last 30 points
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return <div>User not found</div>;

  const sshLink = `ssh://${user.username}:${user.password}@${settings.serverIp}:22`;

  const handleSave = () => {
    if (user && editForm) {
      const updatedUser = { ...user, ...editForm } as User;
      
      if (unlimitedData) updatedUser.dataLimitGB = 0;
      
      if (unlimitedSpeed) {
          updatedUser.speedLimitUpload = 0;
          updatedUser.speedLimitDownload = 0;
          updatedUser.speedLimitTotal = 0;
      } else {
          if (useTotalSpeed) {
              updatedUser.speedLimitUpload = 0;
              updatedUser.speedLimitDownload = 0;
              // updatedUser.speedLimitTotal is set by input
          } else {
              updatedUser.speedLimitTotal = 0;
          }
      }

      if (unlimitedExpiry) updatedUser.expiryDate = '2099-01-01T00:00:00.000Z';
      else if (!updatedUser.expiryDate.includes('T')) {
          updatedUser.expiryDate = new Date(updatedUser.expiryDate).toISOString();
      }

      updateUser(updatedUser);
      alert('Changes saved successfully');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sshLink);
    alert('Link copied to clipboard');
  };

  const UnlimitedCheckbox = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
     <label className="flex items-center gap-2 cursor-pointer select-none">
        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-500'}`}>
            {checked && <CheckCircle className="w-3 h-3 text-white" />}
        </div>
        <input type="checkbox" className="hidden" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="text-xs text-slate-400">{label}</span>
     </label>
  );

  // Helper to format MB/GB
  const formatSize = (mb: number) => {
      if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
      return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </button>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 text-2xl font-bold border border-indigo-500/30">
               {user.username.charAt(0).toUpperCase()}
             </div>
             <div>
               <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                 {user.username}
                 <span className={`text-xs px-2 py-0.5 rounded-full border ${user.isActive ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                   {user.isActive ? 'Active' : 'Inactive'}
                 </span>
               </h1>
               <p className="text-slate-400 text-sm mt-1 font-mono">Shell: /sbin/nologin (Tunnel Only)</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Overview</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Edit</button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
             {/* Connection Info - Moved to Top */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-white p-4 rounded-xl flex items-center justify-center">
                   <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(sshLink)}`} alt="QR Code" className="w-40 h-40" />
                </div>
                <div className="md:col-span-2 bg-slate-900/50 p-6 rounded-xl border border-slate-700 flex flex-col justify-center">
                    <h3 className="font-bold text-white flex items-center gap-2 mb-4"><Smartphone className="w-5 h-5" /> Connection String</h3>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 break-all text-xs font-mono text-slate-300 relative group">
                        {sshLink}
                        <button onClick={copyToClipboard} className="absolute top-2 right-2 p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="text-sm text-slate-400 mt-4 flex gap-6">
                        <p>• Protocol: SSH Tunnel</p>
                        <p>• Port: 22</p>
                        <p>• Compression: Enabled</p>
                    </div>
                </div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity className="w-16 h-16 text-indigo-500" />
                </div>
                <div className="flex items-center gap-3 mb-4 text-slate-400 relative z-10">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Wifi className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-sm font-medium">Real-time Speed</span>
                  <span className="ml-auto flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                   <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><ArrowDown className="w-3 h-3" /> Download</div>
                      <div className="text-xl font-bold text-cyan-400 tracking-tight">{user.currentDownloadSpeed.toFixed(1)} <span className="text-xs text-slate-500 font-normal">Mbps</span></div>
                   </div>
                   <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><ArrowUp className="w-3 h-3" /> Upload</div>
                      <div className="text-xl font-bold text-indigo-400 tracking-tight">{user.currentUploadSpeed.toFixed(1)} <span className="text-xs text-slate-500 font-normal">Mbps</span></div>
                   </div>
                </div>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-2 text-slate-400">
                  <Database className="w-4 h-4" />
                  <span className="text-sm">Data Usage</span>
                </div>
                <div className="text-xl font-bold text-white mb-2">{user.dataUsedGB.toFixed(2)} / {user.dataLimitGB === 0 ? '∞' : user.dataLimitGB + ' GB'}</div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                   <div className="bg-cyan-500 h-full" style={{width: `${(user.dataUsedGB / (user.dataLimitGB || 1)) * 100}%`}}></div>
                </div>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                 <div className="flex items-center gap-3 mb-2 text-slate-400">
                    <Gauge className="w-4 h-4" />
                    <span className="text-sm">Limits</span>
                 </div>
                 <div className="flex justify-between">
                     <div>
                         <div className="text-xs text-slate-500">Speed Config</div>
                         <div className="text-lg font-bold text-white">
                             {(user.speedLimitTotal && user.speedLimitTotal > 0) ? `Total: ${user.speedLimitTotal}` : (user.speedLimitDownload === 0 && user.speedLimitUpload === 0) ? 'Unlimited' : `${user.speedLimitDownload}/${user.speedLimitUpload}`}
                         </div>
                     </div>
                     <div className="text-right">
                         <div className="text-xs text-slate-500">Expiry</div>
                         <div className="text-lg font-bold text-white">
                             {new Date(user.expiryDate).getFullYear() > 2090 ? <Infinity className="inline w-5 h-5"/> : Math.max(0, Math.ceil((new Date(user.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) + ' Days'}
                         </div>
                     </div>
                 </div>
              </div>
            </div>

             {/* Live Chart */}
            <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700">
                <h3 className="text-sm text-slate-400 mb-4 ml-2 flex items-center gap-2"><Network className="w-4 h-4" /> Real-time Activity</h3>
                <div className="h-64 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={liveData}>
                      <defs>
                        <linearGradient id="userDown" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155'}} />
                      <Area type="monotone" dataKey="down" stroke="#06b6d4" fill="url(#userDown)" strokeWidth={2} name="Download" />
                      <Area type="monotone" dataKey="up" stroke="#6366f1" fill="none" strokeWidth={2} name="Upload" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
            </div>

          </div>
        )}

        {activeTab === 'settings' && (
           <div className="space-y-4 max-w-2xl mx-auto animate-fadeIn">
              <div className="space-y-2">
                 <label className="text-sm text-slate-400">New Password</label>
                 <input type="text" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm text-slate-400">Expiry Date</label>
                        <UnlimitedCheckbox label="Unlimited" checked={unlimitedExpiry} onChange={setUnlimitedExpiry} />
                    </div>
                    <input type="date" disabled={unlimitedExpiry} value={unlimitedExpiry ? '' : editForm.expiryDate?.split('T')[0]} onChange={e => setEditForm({...editForm, expiryDate: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" />
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm text-slate-400">Total Bandwidth (GB)</label>
                        <UnlimitedCheckbox label="Unlimited" checked={unlimitedData} onChange={setUnlimitedData} />
                    </div>
                    <input type="number" disabled={unlimitedData} value={unlimitedData ? '' : editForm.dataLimitGB} onChange={e => setEditForm({...editForm, dataLimitGB: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" />
                 </div>

                 {/* Speed Limits Config */}
                 <div className="col-span-1 md:col-span-2 space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm text-slate-400">Speed Limits (Mbps)</label>
                        <UnlimitedCheckbox label="Unlimited" checked={unlimitedSpeed} onChange={setUnlimitedSpeed} />
                    </div>
                    
                    {!unlimitedSpeed && (
                      <div className="flex gap-4 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                          <input type="radio" checked={useTotalSpeed} onChange={() => setUseTotalSpeed(true)} className="accent-indigo-500"/>
                          Total Limit
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                          <input type="radio" checked={!useTotalSpeed} onChange={() => setUseTotalSpeed(false)} className="accent-indigo-500"/>
                          Separate (Up/Down)
                        </label>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {useTotalSpeed ? (
                            <div className="col-span-2">
                                <input 
                                  type="number" 
                                  disabled={unlimitedSpeed}
                                  placeholder="Total Speed Limit (Mbps)"
                                  value={unlimitedSpeed ? '' : editForm.speedLimitTotal} 
                                  onChange={e => setEditForm({...editForm, speedLimitTotal: Number(e.target.value)})} 
                                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" 
                                />
                            </div>
                        ) : (
                          <>
                             <input type="number" disabled={unlimitedSpeed} placeholder="Download (Mbps)" value={unlimitedSpeed ? '' : editForm.speedLimitDownload} onChange={e => setEditForm({...editForm, speedLimitDownload: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" />
                             <input type="number" disabled={unlimitedSpeed} placeholder="Upload (Mbps)" value={unlimitedSpeed ? '' : editForm.speedLimitUpload} onChange={e => setEditForm({...editForm, speedLimitUpload: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" />
                          </>
                        )}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm text-slate-400">Concurrent Limit</label>
                    <input type="number" value={editForm.concurrentLimit} onChange={e => setEditForm({...editForm, concurrentLimit: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
                 </div>
              </div>
              <button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20">
                 Save Changes
              </button>
           </div>
        )}
      </div>
    </div>
  );
};
