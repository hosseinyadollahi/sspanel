import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, LogOut, ShieldCheck, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Layout: React.FC = () => {
  const { logout, currentUser } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'داشبورد' },
    { to: '/users', icon: Users, label: 'مدیریت کاربران' },
    { to: '/settings', icon: Settings, label: 'تنظیمات پنل' },
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col shadow-xl z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-700">
          <ShieldCheck className="w-8 h-8 text-indigo-500" />
          <h1 className="text-xl font-bold bg-gradient-to-l from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            SSH Panel
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 shadow-sm border border-indigo-500/30'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>خروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-950 relative">
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-5">
             {/* Background Grid Pattern */}
             <div className="absolute w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
         </div>
        <div className="container mx-auto p-6 md:p-8 relative z-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
