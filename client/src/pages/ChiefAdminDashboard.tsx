import React, { useState, useEffect } from 'react';
import API from '../services/api';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Trash2,
  UserPlus,
  Search,
  Building2,
  Layers,
  UtensilsCrossed,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface HotelAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  isLocked: boolean;
  createdAt: string;
  tableCount: number;
  orderCount: number;
  foodItemCount: number;
}

export const ChiefAdminDashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<HotelAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED'>('ALL');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Create Account Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('ADMIN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Confirmation Modal State
  const [accountToDelete, setAccountToDelete] = useState<HotelAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await API.get('/chief-admin/users');
      setAccounts(res.data.data);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to fetch hotel accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleToggleLock = async (account: HotelAccount) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await API.put(`/chief-admin/users/${account.id}/lock`, {
        lock: !account.isLocked,
      });
      setActionSuccess(res.data.message);
      fetchAccounts();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to update account lock status');
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    setIsDeleting(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await API.delete(`/chief-admin/users/${accountToDelete.id}`);
      setActionSuccess(res.data.message);
      setAccountToDelete(null);
      fetchAccounts();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);
    try {
      const res = await API.post('/chief-admin/users', {
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      setActionSuccess(res.data.message);
      setIsCreateModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('ADMIN');
      fetchAccounts();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && !acc.isLocked) ||
      (statusFilter === 'LOCKED' && acc.isLocked);
    return matchesSearch && matchesStatus;
  });

  const totalHotels = accounts.filter((a) => a.role === 'ADMIN').length;
  const activeCount = accounts.filter((a) => !a.isLocked).length;
  const lockedCount = accounts.filter((a) => a.isLocked).length;
  const totalPlatformOrders = accounts.reduce((sum, a) => sum + a.orderCount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls Bar */}
      <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-2xl flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-2xl shadow-lg shadow-purple-600/30 text-white">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center space-x-2">
              <span>Chief Admin Control Center</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-widest">
                Platform Master
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Multi-Hotel SaaS Governance, Account Provisioning, Locking & Access Control
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAccounts}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all"
            title="Refresh Platform Accounts"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setModalError('');
              setIsCreateModalOpen(true);
            }}
            className="py-2.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision New Hotel</span>
          </button>
        </div>
      </div>

      {/* Global Alert Banners */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800/60 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center space-x-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 bg-rose-950/60 border border-rose-800/60 rounded-2xl text-rose-300 text-xs font-semibold flex items-center space-x-2 shadow-lg animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Key Metrics Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Registered Hotels</p>
            <h3 className="text-2xl font-black text-white">{totalHotels}</h3>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Active Unlocked Accounts</p>
            <h3 className="text-2xl font-black text-emerald-400">{activeCount}</h3>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Locked / Suspended</p>
            <h3 className="text-2xl font-black text-rose-400">{lockedCount}</h3>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Platform Orders Served</p>
            <h3 className="text-2xl font-black text-amber-400">{totalPlatformOrders}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Hotel Name or Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full md:w-auto">
          {(['ALL', 'ACTIVE', 'LOCKED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === filter
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              {filter === 'ALL' ? 'All Accounts' : filter === 'ACTIVE' ? 'Active' : 'Locked'}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Governance Table */}
      <div className="bg-slate-900/70 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="font-bold text-slate-200 text-base flex items-center space-x-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span>Platform Hotel & Staff Accounts ({filteredAccounts.length})</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
            <p className="text-xs font-medium">Loading hotel accounts...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p className="text-sm font-semibold">No hotel accounts found matching filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Account / Hotel</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Platform Stats</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Chief Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Hotel Name & Email */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-sm shrink-0">
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-100 text-sm">{acc.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{acc.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${acc.role === 'CHIEF_ADMIN'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                            : acc.role === 'ADMIN'
                              ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
                              : acc.role === 'WAITER'
                                ? 'bg-blue-950/80 text-blue-300 border-blue-700/60'
                                : acc.role === 'KITCHEN'
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                          }`}
                      >
                        {acc.role}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      {acc.isLocked ? (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60">
                          <Lock className="w-3 h-3 text-rose-400" />
                          <span>Locked</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    {/* Platform Stats */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3 text-slate-300 text-[11px]">
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          Tables: <strong>{acc.tableCount}</strong>
                        </span>
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          Orders: <strong>{acc.orderCount}</strong>
                        </span>
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          Menu: <strong>{acc.foodItemCount}</strong>
                        </span>
                      </div>
                    </td>

                    {/* Joined Date */}
                    <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                      {new Date(acc.createdAt).toLocaleDateString()}
                    </td>

                    {/* Chief Controls */}
                    <td className="px-6 py-4 text-right">
                      {acc.role === 'CHIEF_ADMIN' ? (
                        <span className="text-[10px] text-purple-400 font-bold italic">Master Account</span>
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleToggleLock(acc)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all border ${acc.isLocked
                                ? 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/60'
                                : 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border-amber-800/60'
                              }`}
                            title={acc.isLocked ? 'Unlock Account Access' : 'Lock Account Access'}
                          >
                            {acc.isLocked ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Unlock</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Lock</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setAccountToDelete(acc)}
                            className="p-1.5 bg-rose-950/50 hover:bg-rose-900 text-rose-400 border border-rose-800/60 rounded-xl transition-all"
                            title="Delete Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE HOTEL ACCOUNT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-base">Provision New Hotel Account</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Hotel / Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grand Palace Hotel"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Gmail Address (@gmail.com) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="hotelowner@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Account Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Account Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="ADMIN">Restaurant Admin (Hotel Owner)</option>
                  <option value="WAITER">Waiter</option>
                  <option value="KITCHEN">Kitchen Staff</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="CHIEF_ADMIN">Chief Admin (Co-Owner)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center space-x-1.5"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center space-x-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-rose-500/20 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base">Delete Hotel Account</h3>
                <p className="text-xs text-rose-300">Irreversible Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the account for{' '}
              <strong className="text-white">{accountToDelete.name}</strong> ({accountToDelete.email})?
            </p>
            <p className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
              ⚠️ All associated tables ({accountToDelete.tableCount}), food items ({accountToDelete.foodItemCount}), orders ({accountToDelete.orderCount}), and payments will be permanently removed from the system.
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
