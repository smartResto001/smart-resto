import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Category, FoodItem, Table, User, DashboardStats } from '../types';
import { LayoutDashboard, Utensils, Grid, Users, Plus, Trash2, Edit, DollarSign, TrendingUp, ShoppingBag, ShieldCheck, Check, X, AlertTriangle } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'menu' | 'tables' | 'users'>('analytics');

  // Stats State
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Menu State
  const [categories, setCategories] = useState<Category[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [editingFoodItem, setEditingFoodItem] = useState<FoodItem | null>(null);

  // Food Form State
  const [foodName, setFoodName] = useState('');
  const [foodDesc, setFoodDesc] = useState('');
  const [foodPrice, setFoodPrice] = useState('');
  const [foodPrepTime, setFoodPrepTime] = useState('15');
  const [foodCategoryId, setFoodCategoryId] = useState('');
  const [foodIsVeg, setFoodIsVeg] = useState(true);
  const [foodImage, setFoodImage] = useState('');

  // Table State
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableNum, setNewTableNum] = useState('');
  const [newTableCap, setNewTableCap] = useState('4');

  // User State
  const [users, setUsers] = useState<User[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'ADMIN' | 'WAITER' | 'KITCHEN' | 'CASHIER'>('WAITER');

  useEffect(() => {
    fetchDashboardStats();
    fetchMenu();
    fetchTables();
    fetchUsers();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await API.get('/reports/dashboard');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await API.get('/menu');
      setCategories(res.data.data.categories);
      setFoodItems(res.data.data.foodItems);
      if (res.data.data.categories.length > 0 && !foodCategoryId) {
        setFoodCategoryId(res.data.data.categories[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch menu', err);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await API.get('/tables');
      setTables(res.data.data);
    } catch (err) {
      console.error('Failed to fetch tables', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get('/users');
      setUsers(res.data.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  // Food Item Handlers
  const handleOpenFoodModal = (item?: FoodItem) => {
    if (item) {
      setEditingFoodItem(item);
      setFoodName(item.name);
      setFoodDesc(item.description || '');
      setFoodPrice(item.price.toString());
      setFoodPrepTime(item.prepTime.toString());
      setFoodCategoryId(item.categoryId);
      setFoodIsVeg(item.isVeg);
      setFoodImage(item.image || '');
    } else {
      setEditingFoodItem(null);
      setFoodName('');
      setFoodDesc('');
      setFoodPrice('');
      setFoodPrepTime('15');
      setFoodIsVeg(true);
      setFoodImage('');
    }
    setIsFoodModalOpen(true);
  };

  const handleSaveFoodItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: foodName,
        description: foodDesc,
        price: Number(foodPrice),
        prepTime: Number(foodPrepTime),
        categoryId: foodCategoryId,
        isVeg: foodIsVeg,
        image: foodImage,
      };

      if (editingFoodItem) {
        await API.put(`/menu/items/${editingFoodItem.id}`, payload);
      } else {
        await API.post('/menu/items', payload);
      }

      setIsFoodModalOpen(false);
      fetchMenu();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save food item');
    }
  };

  const handleDeleteFoodItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this food item?')) return;
    try {
      await API.delete(`/menu/items/${id}`);
      fetchMenu();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete food item');
    }
  };

  // Table Handlers
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNum) return;
    try {
      await API.post('/tables', {
        tableNumber: Number(newTableNum),
        capacity: Number(newTableCap),
      });
      setNewTableNum('');
      fetchTables();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create table');
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm('Delete this table?')) return;
    try {
      await API.delete(`/tables/${id}`);
      fetchTables();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete table');
    }
  };

  // User Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.post('/users', {
        name: userName,
        email: userEmail,
        password: userPassword,
        role: userRole,
      });
      setIsUserModalOpen(false);
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create staff user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this staff account?')) return;
    try {
      await API.delete(`/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Admin Top Navigation Tabs */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex flex-wrap gap-2 justify-between items-center">
        <div className="flex items-center space-x-2 px-2">
          <ShieldCheck className="w-6 h-6 text-purple-400" />
          <h2 className="text-lg font-bold text-white">Admin Portal</h2>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'analytics' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Dashboard Stats</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'menu' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Menu & Items</span>
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'tables' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Tables</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'users' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Users</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ANALYTICS DASHBOARD */}
      {activeTab === 'analytics' && stats && (
        <div className="space-y-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Total Revenue</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-100">₹{stats.totalRevenue.toLocaleString()}</div>
              <div className="text-[11px] text-emerald-400 font-semibold">From completed bills</div>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Total Orders</span>
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-100">{stats.totalOrders}</div>
              <div className="text-[11px] text-slate-400">{stats.activeOrdersCount} Currently Active</div>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Avg Order Value</span>
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-100">₹{stats.avgOrderValue}</div>
              <div className="text-[11px] text-amber-400 font-semibold">Per completed table</div>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Completed Orders</span>
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Check className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-100">{stats.totalCompletedOrders}</div>
              <div className="text-[11px] text-purple-400 font-semibold">Billed & Paid</div>
            </div>
          </div>

          {/* Top Selling Dishes & Recent Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Top Selling Dishes */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-slate-100 text-sm">Top Selling Dishes</h3>
              <div className="space-y-3">
                {stats.topFoods.map((tf, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <div>
                      <div className="font-bold text-xs text-slate-100">{tf.name}</div>
                      <div className="text-[10px] text-slate-400">{tf.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-400 text-xs">{tf.totalQuantity} Sold</div>
                      <div className="text-[10px] text-slate-400">₹{tf.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Payments */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-slate-100 text-sm">Recent Transactions</h3>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {stats.recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                    <div>
                      <div className="font-bold text-slate-100">Order #{p.order?.orderNumber}</div>
                      <div className="text-[10px] text-slate-400">Cashier: {p.cashierName} • {p.paymentMethod}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400">₹{p.grandTotal}</div>
                      <div className="text-[10px] text-slate-500">{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: MENU MANAGEMENT */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-100 text-base">Menu Items ({foodItems.length})</h3>
            <button
              onClick={() => handleOpenFoodModal()}
              className="py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Food Item</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {foodItems.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex gap-3">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <h4 className="font-bold text-sm text-slate-100">{item.name}</h4>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                    <div className="text-xs font-bold text-amber-400 mt-1">₹{item.price} • Prep: {item.prepTime}m</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleOpenFoodModal(item)}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center space-x-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteFoodItem(item.id)}
                    className="py-1.5 px-3 bg-rose-950/40 hover:bg-rose-950 text-rose-400 text-xs font-bold rounded-xl border border-rose-800/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TABLES MANAGEMENT */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-slate-100 text-sm">Add New Table</h3>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Table Number</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 11"
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Seating Capacity</label>
                <input
                  type="number"
                  required
                  placeholder="4"
                  value={newTableCap}
                  onChange={(e) => setNewTableCap(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Create Table</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {tables.map((t) => (
              <div key={t.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-100 text-sm">Table {t.tableNumber}</span>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/50">
                    {t.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">Capacity: {t.capacity} Persons</div>
                <button
                  onClick={() => handleDeleteTable(t.id)}
                  className="w-full py-1.5 bg-rose-950/40 hover:bg-rose-950 text-rose-400 text-xs font-bold rounded-xl border border-rose-800/40 flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Table</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: STAFF USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-100 text-base">Staff User Accounts ({users.length})</h3>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Staff Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => (
              <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-sm text-slate-100">{u.name}</h4>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/50">
                      {u.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <button
                  onClick={() => handleDeleteUser(u.id)}
                  className="w-full py-1.5 bg-rose-950/40 hover:bg-rose-950 text-rose-400 text-xs font-bold rounded-xl border border-rose-800/40 flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD/EDIT FOOD ITEM MODAL */}
      {isFoodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">
                {editingFoodItem ? 'Edit Food Item' : 'Add Food Item'}
              </h3>
              <button onClick={() => setIsFoodModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFoodItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={foodCategoryId}
                  onChange={(e) => setFoodCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={foodPrice}
                    onChange={(e) => setFoodPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prep Time (Mins)</label>
                  <input
                    type="number"
                    required
                    value={foodPrepTime}
                    onChange={(e) => setFoodPrepTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={foodImage}
                  onChange={(e) => setFoodImage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isVeg"
                  checked={foodIsVeg}
                  onChange={(e) => setFoodIsVeg(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500"
                />
                <label htmlFor="isVeg" className="text-xs font-semibold text-slate-300">
                  Vegetarian Dish
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg"
              >
                Save Food Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE STAFF ACCOUNT MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Create Staff Account</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Waiter"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="staff@restaurant.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                >
                  <option value="WAITER">WAITER</option>
                  <option value="KITCHEN">KITCHEN</option>
                  <option value="CASHIER">CASHIER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg"
              >
                Create Staff User
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
