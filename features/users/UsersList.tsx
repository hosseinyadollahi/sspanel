
import React, { useState, useEffect } from 'react';
import { useApp } from '../../core/context/AppContext';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, Eye, RefreshCw, CheckCircle, XCircle, Smartphone, Globe, Monitor, Pencil, Gauge, Infinity } from 'lucide-react';
import { User } from '../../core/types';

export const UsersList: React.FC = () => {
  const { users, deleteUser, updateUser, addUser, generateRandomPassword } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quickEditUser, setQuickEditUser] = useState<User | null>(null);
  
  // States for toggles in Create Modal
  const [unlimitedData, setUnlimitedData] = useState(false);
  const [unlimitedExpiry, setUnlimitedExpiry] = useState(false);
  const [unlimitedSpeed, setUnlimitedSpeed] = useState(true);
  
  // New: Toggle between Separate Limits vs Total Limit
  const [useTotalSpeedLimit, setUseTotalSpeedLimit] = useState(true);

  // States for toggles in Quick Edit
  const [qeUnlimitedData, setQeUnlimitedData] = useState(false);
  const [qeUnlimitedExpiry, setQeUnlimitedExpiry] = useState(false);
  const [qeUnlimitedSpeed, setQeUnlimitedSpeed] = useState(false);
  
  // Create User State
  const [newUser, setNewUser] = useState<Partial<User>>({
    username: '',
    password: '',
    dataLimitGB: 50,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days
    concurrentLimit: 2,
    speedLimitUpload: 0,
    speedLimitDownload: 0,
    speedLimitTotal: 0,
    isActive: true,
    notes: '',
  });

  // Sync unlimited toggles with Quick Edit User data when opened
  useEffect(() => {
      if (quickEditUser) {
          setQeUnlimitedData(quickEditUser.dataLimitGB === 0);
          const hasSeparate = quickEditUser.speedLimitUpload > 0 || quickEditUser.speedLimitDownload > 0;
          const hasTotal = quickEditUser.speedLimitTotal && quickEditUser.speedLimitTotal > 0;
          setQeUnlimitedSpeed(!hasSeparate && !hasTotal);
          
          // Check if year is > 2090 for unlimited expiry
          const expiryYear = new Date(quickEditUser.expiryDate).getFullYear();
          setQeUnlimitedExpiry(expiryYear > 2090);
      }
  }, [quickEditUser]);

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  const generateRandomUsername = () => {
    return `user_${Math.floor(Math.random() * 9000) + 1000}`;
  };

  const openCreateModal = () => {
      setNewUser({
       username: generateRandomUsername(),
       password: generateRandomPassword(),
       dataLimitGB: 50,
       expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
       concurrentLimit: 2,
       speedLimitUpload: 0,
       speedLimitDownload: 0,
       speedLimitTotal: 0,
       isActive: true,
       notes: '',
    });
    setUnlimitedData(false);
    setUnlimitedExpiry(false);
    setUnlimitedSpeed(true);
    setUseTotalSpeedLimit(true);
    setIsModalOpen(true);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle Unlimited Logic
    const finalDataLimit = unlimitedData ? 0 : newUser.dataLimitGB;
    const finalExpiryDate = unlimitedExpiry 
        ? '2099-01-01T00:00:00.000Z' 
        : new Date(newUser.expiryDate!).toISOString();

    let finalUp = 0;
    let finalDown = 0;
    let finalTotal = 0;

    if (!unlimitedSpeed) {
        if (useTotalSpeedLimit) {
            finalTotal = newUser.speedLimitTotal || 0;
        } else {
            finalUp = newUser.speedLimitUpload || 0;
            finalDown = newUser.speedLimitDownload || 0;
        }
    }

    const created: User = {
      ...newUser as User,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      dataLimitGB: finalDataLimit,
      speedLimitUpload: finalUp,
      speedLimitDownload: finalDown,
      speedLimitTotal: finalTotal,
      expiryDate: finalExpiryDate,
      dataUsedGB: 0,
      concurrentInUse: 0,
      currentDownloadSpeed: 0,
      currentUploadSpeed: 0,
      activeConnections: []
    };
    addUser(created);
    setIsModalOpen(false);
  };

  const handleQuickEditSave = (e: React.FormEvent) => {
      e.preventDefault();
      if(quickEditUser) {
          const updatedUser = { ...quickEditUser };
          
          if (qeUnlimitedData) updatedUser.dataLimitGB = 0;
          if (qeUnlimitedSpeed) {
              updatedUser.speedLimitUpload = 0;
              updatedUser.speedLimitDownload = 0;
              updatedUser.speedLimitTotal = 0;
          }
          if (qeUnlimitedExpiry) updatedUser.expiryDate = '2099-01-01T00:00:00.000Z';
          else {
             if(!updatedUser.expiryDate.includes('T')) {
                 updatedUser.expiryDate = new Date(updatedUser.expiryDate).toISOString();
             }
          }

          updateUser(updatedUser);
          setQuickEditUser(null);
      }
  };

  const setRandomPass = () => {
    setNewUser({...newUser, password: generateRandomPassword()});
  };

  const getFlagEmoji = (countryCode: string) => {
    if (!countryCode) return '🏳️';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char =>  127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  const UnlimitedCheckbox = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
     <label className="flex items-center gap-2 cursor-pointer select-none">
        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-500'}`}>
            {checked && <CheckCircle className="w-3 h-3 text-white" />}
        </div>
        <input type="checkbox" className="hidden" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="text-xs text-slate-400">{label}</span>
     </label>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 pl-10 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          </div>
          <button 
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Username</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Live Speed</th>
                <th className="px-6 py-4 font-medium">Speed Limit</th>
                <th className="px-6 py-4 font-medium">Traffic</th>
                <th className="px-6 py-4 font-medium">Expiry</th>
                <th className="px-6 py-4 font-medium">Conns</th>
                <th className="px-6 py-4 font-medium">Last Device/IP</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 text-slate-200 font-medium">{user.username}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => updateUser({...user, isActive: !user.isActive})}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${user.isActive ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}
                    >
                      {user.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {user.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs">
                        <span className="text-cyan-400 font-mono">↓ {user.currentDownloadSpeed.toFixed(1)} Mb</span>
                        <span className="text-indigo-400 font-mono">↑ {user.currentUploadSpeed.toFixed(1)} Mb</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.speedLimitTotal && user.speedLimitTotal > 0 ? (
                         <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-1 rounded text-xs border border-amber-500/30">
                             <Gauge className="w-3 h-3" /> Total: {user.speedLimitTotal} Mbps
                         </span>
                    ) : (user.speedLimitDownload > 0 || user.speedLimitUpload > 0) ? (
                        <div className="flex flex-col gap-1 text-xs text-slate-400">
                            <span>↓ {user.speedLimitDownload === 0 ? '∞' : user.speedLimitDownload + ' Mb'}</span>
                            <span>↑ {user.speedLimitUpload === 0 ? '∞' : user.speedLimitUpload + ' Mb'}</span>
                        </div>
                    ) : (
                        <span className="text-xs text-slate-600">Unlimited</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500" 
                          style={{ width: `${Math.min(100, (user.dataUsedGB / (user.dataLimitGB || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        {user.dataUsedGB.toFixed(1)} / {user.dataLimitGB === 0 ? '∞' : user.dataLimitGB + ' GB'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-sm">
                    {new Date(user.expiryDate).getFullYear() > 2090 ? <Infinity className="w-4 h-4 text-green-400"/> : new Date(user.expiryDate).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-sm">
                     <span className={`px-2 py-0.5 rounded text-xs ${user.concurrentInUse > 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700/50 text-slate-500'}`}>
                        {user.concurrentInUse} / {user.concurrentLimit}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                     {user.activeConnections.length > 0 ? (
                        <div className="flex flex-col text-xs text-slate-300">
                           <span className="flex items-center gap-1">
                             <Globe className="w-3 h-3 text-slate-500" />
                             {user.activeConnections[0].ip} 
                             <span title={user.activeConnections[0].country}>{getFlagEmoji(user.activeConnections[0].country)}</span>
                           </span>
                           <span className="flex items-center gap-1 text-slate-500">
                             <Monitor className="w-3 h-3" />
                             {user.activeConnections[0].device}
                           </span>
                        </div>
                     ) : (
                        <span className="text-xs text-slate-600">-</span>
                     )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setQuickEditUser(user)} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors" title="Quick Edit">
                         <Pencil className="w-4 h-4" />
                      </button>
                      <Link to={`/users/${user.id}`} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors" title="View & Edit">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button onClick={() => deleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Add New User (Nologin)</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><XCircle /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Username</label>
                  <div className="relative">
                    <input required type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                    <button type="button" onClick={() => setNewUser({...newUser, username: generateRandomUsername()})} className="absolute right-2 top-2 p-1 text-slate-500 hover:text-indigo-400"><RefreshCw className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Password</label>
                  <div className="flex gap-2">
                    <input required type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                    <button type="button" onClick={setRandomPass} className="bg-indigo-600/20 text-indigo-400 p-3 rounded-xl hover:bg-indigo-600/30"><RefreshCw className="w-5 h-5" /></button>
                  </div>
                </div>
                
                {/* Traffic Limit */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-slate-400">Total Bandwidth (GB)</label>
                    <UnlimitedCheckbox label="Unlimited" checked={unlimitedData} onChange={setUnlimitedData} />
                  </div>
                  <input 
                      type="number" 
                      disabled={unlimitedData}
                      value={unlimitedData ? '' : newUser.dataLimitGB} 
                      onChange={e => setNewUser({...newUser, dataLimitGB: Number(e.target.value)})} 
                      placeholder={unlimitedData ? 'Unlimited' : '50'}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </div>

                {/* Expiry */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-slate-400">Expiry Date</label>
                    <UnlimitedCheckbox label="Unlimited" checked={unlimitedExpiry} onChange={setUnlimitedExpiry} />
                  </div>
                   <input 
                      type="date" 
                      disabled={unlimitedExpiry}
                      value={unlimitedExpiry ? '' : newUser.expiryDate} 
                      onChange={e => setNewUser({...newUser, expiryDate: e.target.value})} 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                   />
                </div>

                {/* Concurrent */}
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Concurrent Connections</label>
                  <input type="number" value={newUser.concurrentLimit} onChange={e => setNewUser({...newUser, concurrentLimit: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                </div>

                 {/* Speed Limits */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm text-slate-400">Speed Limits (Mbps)</label>
                        <UnlimitedCheckbox label="Unlimited" checked={unlimitedSpeed} onChange={setUnlimitedSpeed} />
                    </div>
                    
                    {!unlimitedSpeed && (
                      <div className="flex gap-4 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                          <input type="radio" checked={useTotalSpeedLimit} onChange={() => setUseTotalSpeedLimit(true)} className="accent-indigo-500"/>
                          Total Limit
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                          <input type="radio" checked={!useTotalSpeedLimit} onChange={() => setUseTotalSpeedLimit(false)} className="accent-indigo-500"/>
                          Separate (Up/Down)
                        </label>
                      </div>
                    )}

                    <div className="flex gap-2">
                        {useTotalSpeedLimit ? (
                            <input 
                              type="number" 
                              disabled={unlimitedSpeed}
                              placeholder="Total Speed Limit (Mbps)"
                              value={unlimitedSpeed ? '' : newUser.speedLimitTotal} 
                              onChange={e => setNewUser({...newUser, speedLimitTotal: Number(e.target.value)})} 
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" 
                            />
                        ) : (
                          <>
                            <input 
                                type="number" 
                                disabled={unlimitedSpeed}
                                placeholder="DL"
                                value={unlimitedSpeed ? '' : newUser.speedLimitDownload} 
                                onChange={e => setNewUser({...newUser, speedLimitDownload: Number(e.target.value)})} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" 
                            />
                            <input 
                                type="number" 
                                disabled={unlimitedSpeed}
                                placeholder="UL"
                                value={unlimitedSpeed ? '' : newUser.speedLimitUpload} 
                                onChange={e => setNewUser({...newUser, speedLimitUpload: Number(e.target.value)})} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" 
                            />
                          </>
                        )}
                    </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Notes</label>
                <textarea rows={3} value={newUser.notes} onChange={e => setNewUser({...newUser, notes: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Edit Modal */}
      {quickEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-amber-400" />
                  Quick Edit: <span className="text-indigo-400">{quickEditUser.username}</span>
              </h3>
              <button onClick={() => setQuickEditUser(null)} className="text-slate-500 hover:text-white"><XCircle /></button>
            </div>
            <form onSubmit={handleQuickEditSave} className="p-6 space-y-4">
                <div className="space-y-2">
                    <label className="text-sm text-slate-400">Password</label>
                    <input type="text" value={quickEditUser.password} onChange={e => setQuickEditUser({...quickEditUser, password: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm text-slate-400">Bandwidth</label>
                            <UnlimitedCheckbox label="Unl" checked={qeUnlimitedData} onChange={setQeUnlimitedData} />
                        </div>
                        <input 
                            type="number" 
                            disabled={qeUnlimitedData}
                            value={qeUnlimitedData ? '' : quickEditUser.dataLimitGB} 
                            onChange={e => setQuickEditUser({...quickEditUser, dataLimitGB: Number(e.target.value)})} 
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" 
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm text-slate-400">Expiry</label>
                            <UnlimitedCheckbox label="Unl" checked={qeUnlimitedExpiry} onChange={setQeUnlimitedExpiry} />
                        </div>
                        <input 
                            type="date" 
                            disabled={qeUnlimitedExpiry}
                            value={qeUnlimitedExpiry ? '' : quickEditUser.expiryDate.split('T')[0]} 
                            onChange={e => setQuickEditUser({...quickEditUser, expiryDate: e.target.value})} 
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-sm text-slate-400">Speed Limit (Mbps)</label>
                        <UnlimitedCheckbox label="Unlimited Speed" checked={qeUnlimitedSpeed} onChange={setQeUnlimitedSpeed} />
                    </div>
                    {/* Simplified Quick Edit: Only showing Total Limit if used, or separate if used */}
                    {(quickEditUser.speedLimitTotal || 0) > 0 ? (
                         <input type="number" placeholder="Total" disabled={qeUnlimitedSpeed} value={qeUnlimitedSpeed ? '' : quickEditUser.speedLimitTotal} onChange={e => setQuickEditUser({...quickEditUser, speedLimitTotal: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" />
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" placeholder="DL" disabled={qeUnlimitedSpeed} value={qeUnlimitedSpeed ? '' : quickEditUser.speedLimitDownload} onChange={e => setQuickEditUser({...quickEditUser, speedLimitDownload: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" />
                            <input type="number" placeholder="UL" disabled={qeUnlimitedSpeed} value={qeUnlimitedSpeed ? '' : quickEditUser.speedLimitUpload} onChange={e => setQuickEditUser({...quickEditUser, speedLimitUpload: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" />
                        </div>
                    )}
                </div>

                <div className="space-y-2 pt-2">
                     <label className="flex items-center gap-3 p-3 border border-slate-700 rounded-xl bg-slate-800 cursor-pointer hover:bg-slate-700/50">
                        <input 
                            type="checkbox" 
                            checked={quickEditUser.isActive} 
                            onChange={e => setQuickEditUser({...quickEditUser, isActive: e.target.checked})} 
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-white font-medium">Account Active</span>
                     </label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={() => setQuickEditUser(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium">Save Changes</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
