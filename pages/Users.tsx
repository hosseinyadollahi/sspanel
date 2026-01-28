import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { Plus, Search, MoreVertical, Edit, Trash2, Eye, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { User } from '../types';

export const UsersPage: React.FC = () => {
  const { users, deleteUser, updateUser, addUser, generateRandomPassword } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Create User State
  const [newUser, setNewUser] = useState<Partial<User>>({
    username: '',
    password: '',
    dataLimitGB: 50,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days
    concurrentLimit: 2,
    isActive: true,
    notes: '',
  });

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const created: User = {
      ...newUser as User,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      dataUsedGB: 0,
      concurrentInUse: 0,
      currentDownloadSpeed: 0,
      currentUploadSpeed: 0,
      expiryDate: new Date(newUser.expiryDate!).toISOString(),
    };
    addUser(created);
    setIsModalOpen(false);
    // Reset form
    setNewUser({
       username: '',
       password: '',
       dataLimitGB: 50,
       expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
       concurrentLimit: 2,
       isActive: true,
       notes: '',
    });
  };

  const setRandomPass = () => {
    setNewUser({...newUser, password: generateRandomPassword()});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-white">مدیریت کاربران</h2>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="جستجو کاربر..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 pl-10 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            افزودن کاربر
          </button>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-900/50 text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">نام کاربری</th>
                <th className="px-6 py-4 font-medium">وضعیت</th>
                <th className="px-6 py-4 font-medium">حجم مصرفی</th>
                <th className="px-6 py-4 font-medium">اعتبار</th>
                <th className="px-6 py-4 font-medium">اتصالات</th>
                <th className="px-6 py-4 font-medium text-left">عملیات</th>
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
                      {user.isActive ? 'فعال' : 'غیرفعال'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500" 
                          style={{ width: `${Math.min(100, (user.dataUsedGB / user.dataLimitGB) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        {user.dataUsedGB.toFixed(1)} / {user.dataLimitGB} GB
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-sm">
                    {new Date(user.expiryDate).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-sm">
                    {user.concurrentInUse} / {user.concurrentLimit}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/users/${user.id}`} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors" title="مشاهده و ویرایش">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button onClick={() => deleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    کاربری یافت نشد.
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
              <h3 className="text-xl font-bold text-white">افزودن کاربر جدید (Nologin)</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><XCircle /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">نام کاربری</label>
                  <input required type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">رمز عبور</label>
                  <div className="flex gap-2">
                    <input required type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                    <button type="button" onClick={setRandomPass} className="bg-indigo-600/20 text-indigo-400 p-3 rounded-xl hover:bg-indigo-600/30"><RefreshCw className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">محدودیت ترافیک (GB)</label>
                  <input type="number" value={newUser.dataLimitGB} onChange={e => setNewUser({...newUser, dataLimitGB: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">تعداد کاربر همزمان</label>
                  <input type="number" value={newUser.concurrentLimit} onChange={e => setNewUser({...newUser, concurrentLimit: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">تاریخ انقضا</label>
                  <input type="date" value={newUser.expiryDate} onChange={e => setNewUser({...newUser, expiryDate: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-slate-400">یادداشت</label>
                <textarea rows={3} value={newUser.notes} onChange={e => setNewUser({...newUser, notes: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">انصراف</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium">ایجاد کاربر</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
