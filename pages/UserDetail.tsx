import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Wifi, Clock, Database, Globe, QrCode, Smartphone, Copy } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { User } from '../types';

// Mock Access Logs
const MOCK_LOGS = [
  { time: '14:32:01', dest: 'google.com:443', bytes: '12 KB' },
  { time: '14:32:05', dest: 'youtube.com:443', bytes: '1.2 MB' },
  { time: '14:32:12', dest: 'instagram.com:443', bytes: '450 KB' },
  { time: '14:33:45', dest: 'telegram.org:443', bytes: '120 KB' },
  { time: '14:34:01', dest: 'whatsapp.net:443', bytes: '85 KB' },
];

export const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { users, settings, updateUser } = useApp();
  const user = users.find(u => u.id === id);
  const [liveData, setLiveData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'logs'>('overview');

  // Local state for editing
  const [editForm, setEditForm] = useState<Partial<User>>({});

  useEffect(() => {
    if (user) {
      setEditForm(user);
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
        return newData.slice(-20); // Keep last 20 points
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return <div>کاربر یافت نشد</div>;

  const sshLink = `ssh://${user.username}:${user.password}@${settings.serverIp}:22`;

  const handleSave = () => {
    if (user && editForm) {
      updateUser({ ...user, ...editForm } as User);
      alert('تغییرات ذخیره شد');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sshLink);
    alert('لینک کپی شد');
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        بازگشت به لیست
      </button>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
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
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>نمای کلی</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>ویرایش</button>
            <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>لاگ بازدید</button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Live Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-2 text-slate-400">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm">سرعت لحظه‌ای</span>
                </div>
                <div className="flex justify-between items-end">
                   <div>
                      <div className="text-xs text-slate-500">دانلود</div>
                      <div className="text-xl font-bold text-cyan-400">{user.currentDownloadSpeed} <span className="text-xs">Mbps</span></div>
                   </div>
                   <div className="text-right">
                      <div className="text-xs text-slate-500">آپلود</div>
                      <div className="text-xl font-bold text-indigo-400">{user.currentUploadSpeed} <span className="text-xs">Mbps</span></div>
                   </div>
                </div>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-2 text-slate-400">
                  <Database className="w-4 h-4" />
                  <span className="text-sm">حجم مصرفی</span>
                </div>
                <div className="text-xl font-bold text-white mb-2">{user.dataUsedGB.toFixed(2)} / {user.dataLimitGB} GB</div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                   <div className="bg-cyan-500 h-full" style={{width: `${(user.dataUsedGB / user.dataLimitGB) * 100}%`}}></div>
                </div>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-2 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">تاریخ انقضا</span>
                </div>
                <div className="text-xl font-bold text-white">{new Date(user.expiryDate).toLocaleDateString('fa-IR')}</div>
                <div className="text-xs text-slate-500 mt-1">تعداد روز باقی مانده: {Math.max(0, Math.ceil((new Date(user.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}</div>
              </div>
            </div>

            {/* Live Chart */}
            <div className="h-64 bg-slate-900/30 rounded-xl p-4 border border-slate-700" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={liveData}>
                   <defs>
                    <linearGradient id="userDown" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155'}} />
                  <Area type="monotone" dataKey="down" stroke="#06b6d4" fill="url(#userDown)" strokeWidth={2} />
                  <Area type="monotone" dataKey="up" stroke="#6366f1" fill="none" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Connection Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white/5 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center">
                    <QrCode className="w-8 h-8 text-white mb-4" />
                    {/* Placeholder for QR Code */}
                    <div className="w-48 h-48 bg-white p-2 rounded-lg mb-4">
                       <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(sshLink)}`} alt="QR Code" className="w-full h-full" />
                    </div>
                    <p className="text-xs text-slate-400 mb-2">اسکن برای افزودن در اپلیکیشن</p>
                </div>
                <div className="space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-2"><Smartphone className="w-5 h-5" /> لینک اشتراک</h3>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 break-all text-xs font-mono text-slate-300 relative group">
                        {sshLink}
                        <button onClick={copyToClipboard} className="absolute top-2 left-2 p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="text-sm text-slate-400">
                        <p>• پروتکل: SSH Tunnel</p>
                        <p>• پورت: 22</p>
                        <p>• فشرده سازی: دارد</p>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
           <div className="space-y-4 max-w-2xl mx-auto animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm text-slate-400">رمز عبور جدید</label>
                    <input type="text" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm text-slate-400">تاریخ انقضا</label>
                    <input type="date" value={editForm.expiryDate?.split('T')[0]} onChange={e => setEditForm({...editForm, expiryDate: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm text-slate-400">محدودیت حجمی (GB)</label>
                    <input type="number" value={editForm.dataLimitGB} onChange={e => setEditForm({...editForm, dataLimitGB: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm text-slate-400">تعداد اتصال همزمان</label>
                    <input type="number" value={editForm.concurrentLimit} onChange={e => setEditForm({...editForm, concurrentLimit: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
                 </div>
              </div>
              <button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20">
                 ذخیره تغییرات
              </button>
           </div>
        )}

        {activeTab === 'logs' && (
           <div className="animate-fadeIn">
             <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-white flex items-center gap-2"><Globe className="w-4 h-4" /> لاگ بازدید (شبیه‌سازی)</h3>
               <span className="text-xs text-slate-500">بروزرسانی: لحظه‌ای</span>
             </div>
             <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-right text-sm">
                   <thead className="bg-slate-900 text-slate-400">
                      <tr>
                         <th className="p-3">زمان</th>
                         <th className="p-3">مقصد</th>
                         <th className="p-3">حجم</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800 text-slate-300">
                      {MOCK_LOGS.map((log, i) => (
                         <tr key={i} className="hover:bg-slate-900/50">
                            <td className="p-3 font-mono text-cyan-500">{log.time}</td>
                            <td className="p-3">{log.dest}</td>
                            <td className="p-3 text-slate-400">{log.bytes}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};
