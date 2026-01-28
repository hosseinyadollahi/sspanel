import React from 'react';
import { useApp } from '../../core/context/AppContext';
import { Cpu, HardDrive, Wifi, Users, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Generate some dummy history data for the graph
const generateData = () => {
  return Array.from({ length: 30 }, (_, i) => ({
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
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${color} opacity-10 group-hover:opacity-20 transition-opacity blur-2xl`}></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <span className="text-slate-400 text-sm font-medium">{subValue}</span>
      </div>
      <h3 className="text-slate-400 text-sm mb-1 relative z-10">{title}</h3>
      <p className="text-2xl font-bold text-white relative z-10">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">System Dashboard</h2>
        <div className="px-4 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm border border-green-500/30 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Server Online • {stats.uptime}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Users" 
          value={activeUsers} 
          subValue={`Total: ${users.length}`} 
          icon={Users} 
          color="bg-indigo-500" 
        />
        <StatCard 
          title="CPU Usage" 
          value={`${stats.cpu.toFixed(1)}%`} 
          subValue="4 Cores" 
          icon={Cpu} 
          color="bg-rose-500" 
        />
        <StatCard 
          title="RAM Usage" 
          value={`${stats.ram.toFixed(1)}%`} 
          subValue="16 GB Total" 
          icon={HardDrive} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="Total Traffic" 
          value={`${(stats.totalTrafficDown / 1024).toFixed(2)} TB`} 
          subValue={`Up: ${stats.totalTrafficUp} GB`} 
          icon={Wifi} 
          color="bg-cyan-500" 
        />
      </div>

      {/* Main Traffic Graph */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-cyan-400 w-5 h-5" />
            Live Network Traffic (Mbps)
        </h3>
        <div className="h-[400px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
              <XAxis dataKey="name" hide />
              <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                itemStyle={{ color: '#e2e8f0', fontSize: '13px' }}
                cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area 
                type="monotone" 
                dataKey="download" 
                stroke="#06b6d4" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorDown)" 
                name="Download"
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                dataKey="upload" 
                stroke="#6366f1" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorUp)" 
                name="Upload"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};