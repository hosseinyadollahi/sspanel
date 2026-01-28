import React from 'react';
import { useApp } from '../context/AppContext';
import { Cpu, HardDrive, Wifi, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Generate some dummy history data for the graph
const generateData = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    name: i.toString(),
    upload: Math.floor(Math.random() * 50) + 10,
    download: Math.floor(Math.random() * 100) + 20,
  }));
};

const data = generateData();

export const Dashboard: React.FC = () => {
  const { stats, users } = useApp();
  const activeUsers = users.filter(u => u.isActive).length;

  const StatCard = ({ title, value, subValue, icon: Icon, color }: any) => (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <span className="text-slate-400 text-sm font-medium">{subValue}</span>
      </div>
      <h3 className="text-slate-400 text-sm mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">داشبورد وضعیت سرور</h2>
        <div className="px-4 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm border border-green-500/30">
          سرور آنلاین • {stats.uptime}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="کاربران فعال" 
          value={activeUsers} 
          subValue={`کل: ${users.length}`} 
          icon={Users} 
          color="bg-indigo-500" 
        />
        <StatCard 
          title="مصرف پردازنده" 
          value={`${stats.cpu.toFixed(1)}%`} 
          subValue="4 Cores" 
          icon={Cpu} 
          color="bg-rose-500" 
        />
        <StatCard 
          title="مصرف رم" 
          value={`${stats.ram.toFixed(1)}%`} 
          subValue="16 GB Total" 
          icon={HardDrive} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="ترافیک کل" 
          value={`${(stats.totalTrafficDown / 1024).toFixed(2)} TB`} 
          subValue={`Up: ${stats.totalTrafficUp} GB`} 
          icon={Wifi} 
          color="bg-cyan-500" 
        />
      </div>

      {/* Main Traffic Graph */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <ActivityIcon />
            گراف ترافیک لحظه‌ای شبکه (Mbps)
        </h3>
        <div className="h-[350px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" hide />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Area 
                type="monotone" 
                dataKey="download" 
                stroke="#06b6d4" 
                fillOpacity={1} 
                fill="url(#colorDown)" 
                name="دانلود"
              />
              <Area 
                type="monotone" 
                dataKey="upload" 
                stroke="#6366f1" 
                fillOpacity={1} 
                fill="url(#colorUp)" 
                name="آپلود"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const ActivityIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
)
