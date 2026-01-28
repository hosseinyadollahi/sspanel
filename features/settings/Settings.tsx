import React, { useState } from 'react';
import { useApp } from '../../core/context/AppContext';
import { Shield, Server, Globe, Save, RefreshCw, Copy, X, ShieldCheck, CheckCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const [form, setForm] = useState(settings);

  // 2FA Setup State
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [tempSecret, setTempSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  const handleSave = () => {
    updateSettings(form);
    alert('Settings saved successfully.');
  };

  // Generate a random Base32-like string for the secret
  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const handleToggle2FA = () => {
    if (form.is2FAEnabled) {
        // Disable Flow
        if (window.confirm("Are you sure you want to disable 2FA? This will decrease your account security.")) {
            setForm({ ...form, is2FAEnabled: false });
            setIsSetupMode(false);
        }
    } else {
        // Enable Flow - Start Setup
        if (!isSetupMode) {
            setTempSecret(generateSecret());
            setVerifyCode('');
            setIsSetupMode(true);
        } else {
            setIsSetupMode(false);
        }
    }
  };

  const confirmSetup = () => {
      if (verifyCode.length !== 6) {
          alert("Please enter a valid 6-digit code from your authenticator app.");
          return;
      }
      
      // In a real app, we would verify the token against the secret here.
      // For this mock, we assume any 6-digit code is valid for demonstration.
      setForm({ 
          ...form, 
          is2FAEnabled: true, 
          secret2FA: tempSecret 
      });
      setIsSetupMode(false);
      alert("Two-Factor Authentication has been successfully enabled!");
  };

  const copySecret = () => {
      navigator.clipboard.writeText(tempSecret);
      alert("Secret key copied to clipboard.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">System Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Admin Settings */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              Admin Account
           </h3>
           <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-sm text-slate-400">Admin Username</label>
                 <input type="text" value={form.adminUser} onChange={e => setForm({...form, adminUser: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none" />
              </div>
              <div className="space-y-2">
                 <label className="text-sm text-slate-400">Admin Password</label>
                 <input type="password" value={form.adminPass} onChange={e => setForm({...form, adminPass: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none" />
              </div>

              {/* Enhanced 2FA Section */}
              <div className="pt-6 mt-2 border-t border-slate-700">
                 <div className="flex items-center justify-between mb-4">
                    <div>
                        <span className="text-slate-200 font-medium block flex items-center gap-2">
                            Two-Factor Authentication
                            {form.is2FAEnabled && <CheckCircle className="w-4 h-4 text-green-400" />}
                        </span>
                        <span className="text-xs text-slate-500">Secure your account with Google Authenticator</span>
                    </div>
                    <button 
                      onClick={handleToggle2FA}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${form.is2FAEnabled ? 'bg-green-500' : 'bg-slate-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition transition-transform ${form.is2FAEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                 </div>

                 {/* 2FA Setup Wizard */}
                 {isSetupMode && !form.is2FAEnabled && (
                    <div className="relative mt-4 p-6 bg-slate-900 rounded-xl border border-indigo-500/30 animate-fadeIn">
                       <button onClick={() => setIsSetupMode(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                           <X className="w-5 h-5" />
                       </button>

                       <h4 className="text-white font-bold mb-6 text-sm flex items-center gap-2">
                           <ShieldCheck className="w-4 h-4 text-indigo-400" /> 
                           Setup 2FA
                       </h4>
                       
                       <div className="flex flex-col gap-6">
                           {/* Step 1: Scan */}
                           <div className="flex gap-4 items-start">
                               <div className="bg-white p-2 rounded-lg flex-shrink-0">
                                  <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=otpauth://totp/SSHPanel:${form.adminUser}?secret=${tempSecret}&issuer=SSHPanel`} 
                                    alt="2FA QR" 
                                    className="w-28 h-28" 
                                  />
                               </div>
                               <div className="flex-1 space-y-3">
                                   <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Step 1: Scan Code</div>
                                   <p className="text-xs text-slate-400 leading-relaxed">
                                       Open Google Authenticator (or any TOTP app) and scan the QR code. If you can't scan, enter the key manually.
                                   </p>
                                   <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                                       <code className="flex-1 font-mono text-indigo-300 text-center tracking-widest text-sm">{tempSecret}</code>
                                       <button onClick={copySecret} className="p-1.5 text-slate-400 hover:text-white bg-slate-700 rounded hover:bg-slate-600 transition-colors" title="Copy Secret">
                                           <Copy className="w-4 h-4" />
                                       </button>
                                       <button onClick={() => setTempSecret(generateSecret())} className="p-1.5 text-slate-400 hover:text-white bg-slate-700 rounded hover:bg-slate-600 transition-colors" title="Regenerate Secret">
                                           <RefreshCw className="w-4 h-4" />
                                       </button>
                                   </div>
                               </div>
                           </div>

                           {/* Step 2: Verify */}
                           <div className="space-y-3 pt-4 border-t border-slate-800">
                               <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Step 2: Verify & Enable</div>
                               <div className="flex gap-3">
                                   <input 
                                       type="text" 
                                       value={verifyCode}
                                       onChange={e => setVerifyCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                                       placeholder="Enter 6-digit code"
                                       className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-center text-white font-mono tracking-widest focus:border-indigo-500 focus:outline-none"
                                   />
                                   <button 
                                       onClick={confirmSetup}
                                       disabled={verifyCode.length !== 6}
                                       className="whitespace-nowrap px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-indigo-500/20"
                                   >
                                       Activate 2FA
                                   </button>
                               </div>
                           </div>
                       </div>
                    </div>
                 )}

                 {/* Active State Banner */}
                 {form.is2FAEnabled && (
                     <div className="mt-4 flex items-start gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl animate-fadeIn">
                         <div className="p-2 bg-green-500/10 rounded-full text-green-400 mt-0.5">
                             <ShieldCheck className="w-5 h-5" />
                         </div>
                         <div>
                             <p className="text-green-400 font-bold text-sm">Two-Factor Authentication is Active</p>
                             <p className="text-slate-500 text-xs mt-1">Your account is currently protected. You will be asked for a verification code upon your next login.</p>
                         </div>
                     </div>
                 )}
              </div>
           </div>
        </div>

        {/* Network Settings */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg h-fit">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              Network & Connection
           </h3>
           <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-sm text-slate-400 flex items-center gap-2"><Globe className="w-4 h-4" /> Panel Domain</label>
                 <input type="text" value={form.panelDomain} onChange={e => setForm({...form, panelDomain: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
                 <p className="text-xs text-slate-500">Used for accessing the panel and generating subscription links.</p>
              </div>
              <div className="space-y-2">
                 <label className="text-sm text-slate-400">Server IP (SSH Host)</label>
                 <input type="text" value={form.serverIp} onChange={e => setForm({...form, serverIp: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
                 <p className="text-xs text-slate-500">This IP will be used in user configuration files.</p>
              </div>
           </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={handleSave} className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transform active:scale-95 transition-all">
          <Save className="w-5 h-5" />
          Save Settings
        </button>
      </div>
    </div>
  );
};