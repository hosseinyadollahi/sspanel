import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Server, Globe, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const [form, setForm] = useState(settings);

  const handleSave = () => {
    updateSettings(form);
    alert('تنظیمات با موفقیت ذخیره شد.');
  };

  const toggle2FA = () => {
    // In a real app, this would verify a code first
    setForm({ ...form, is2FAEnabled: !form.is2FAEnabled });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">تنظیمات سیستم</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Admin Settings */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              حساب مدیریت
           </h3>
           <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-sm text-slate-400">نام کاربری ادمین</label>
                 <input type="text" value={form.adminUser} onChange={e => setForm({...form, adminUser: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
              </div>
              <div className="space-y-2">
                 <label className="text-sm text-slate-400">رمز عبور ادمین</label>
                 <input type="password" value={form.adminPass} onChange={e => setForm({...form, adminPass: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
              </div>
              <div className="pt-4 border-t border-slate-700">
                 <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">احراز هویت دو مرحله‌ای (Google 2FA)</span>
                    <button 
                      onClick={toggle2FA}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is2FAEnabled ? 'bg-indigo-600' : 'bg-slate-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition transition-transform ${form.is2FAEnabled ? '-translate-x-6' : '-translate-x-1'}`} />
                    </button>
                 </div>
                 {form.is2FAEnabled && (
                    <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-center">
                       <p className="text-xs text-indigo-300 mb-2">QR کد را با اپلیکیشن Google Authenticator اسکن کنید</p>
                       <div className="bg-white p-2 w-32 h-32 mx-auto rounded-lg">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=otpauth://totp/SSHPanel:${form.adminUser}?secret=${form.secret2FA}&issuer=SSHPanel`} alt="2FA QR" className="w-full h-full" />
                       </div>
                       <p className="text-xs font-mono text-slate-400 mt-2">Secret: {form.secret2FA}</p>
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Network Settings */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              شبکه و اتصال
           </h3>
           <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-sm text-slate-400 flex items-center gap-2"><Globe className="w-4 h-4" /> دامنه پنل</label>
                 <input type="text" value={form.panelDomain} onChange={e => setForm({...form, panelDomain: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
                 <p className="text-xs text-slate-500">برای دسترسی به پنل و ایجاد لینک‌های اشتراک استفاده می‌شود.</p>
              </div>
              <div className="space-y-2">
                 <label className="text-sm text-slate-400">آی پی سرور (SSH Host)</label>
                 <input type="text" value={form.serverIp} onChange={e => setForm({...form, serverIp: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
                 <p className="text-xs text-slate-500">این IP در فایل‌های کانفیگ کاربر قرار می‌گیرد.</p>
              </div>
           </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} className="bg-gradient-to-l from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20">
          <Save className="w-5 h-5" />
          ذخیره تنظیمات
        </button>
      </div>
    </div>
  );
};
