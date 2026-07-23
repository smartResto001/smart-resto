import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { Table, Category, FoodItem, Order } from '../types';
import { Utensils, Users, Plus, Check, Clock, Search, Send, BellRing, Sparkles, Filter, ChevronRight, AlertCircle, X } from 'lucide-react';

export const WaiterDashboard: React.FC = () => {
  const { socket, playNotificationSound } = useSocket();

  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [runningOrders, setRunningOrders] = useState<Order[]>([]);

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'orders'>('tables');

  // Order Form State
  const [customerName, setCustomerName] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [cart, setCart] = useState<{ foodItem: FoodItem; quantity: number; notes?: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ready Food Toast Notifications state
  const [readyNotifications, setReadyNotifications] = useState<{ id: string; orderNumber: string; tableNumber: number; customerName: string }[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('order:created', (newOrder: Order) => {
      setRunningOrders((prev) => [newOrder, ...prev]);
      fetchTables();
    });

    socket.on('order:status_changed', (updatedOrder: Order) => {
      setRunningOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
      fetchTables();
    });

    socket.on('kitchen:food_ready', (data: any) => {
      playNotificationSound();
      setReadyNotifications((prev) => [
        ...prev,
        { id: Date.now().toString(), orderNumber: data.orderNumber, tableNumber: data.tableNumber, customerName: data.customerName },
      ]);
    });

    socket.on('table:updated', () => {
      fetchTables();
    });

    return () => {
      socket.off('order:created');
      socket.off('order:status_changed');
      socket.off('kitchen:food_ready');
      socket.off('table:updated');
    };
  }, [socket]);

  const fetchInitialData = async () => {
    await Promise.all([fetchTables(), fetchMenu(), fetchRunningOrders()]);
  };

  const fetchTables = async () => {
    try {
      const res = await API.get('/tables');
      setTables(res.data.data);
    } catch (err) {
      console.error('Error fetching tables', err);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await API.get('/menu');
      setCategories(res.data.data.categories);
      setFoodItems(res.data.data.foodItems);
    } catch (err) {
      console.error('Error fetching menu', err);
    }
  };

  const fetchRunningOrders = async () => {
    try {
      const res = await API.get('/orders');
      const active = res.data.data.filter((o: Order) =>
        ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'].includes(o.status)
      );
      setRunningOrders(active);
    } catch (err) {
      console.error('Error fetching orders', err);
    }
  };

  const handleOpenOrderModal = (table: Table) => {
    setSelectedTable(table);
    const hasActiveOrder = table.orders && table.orders.length > 0;
    const activeOrder = hasActiveOrder ? table.orders![0] : null;

    if (activeOrder && activeOrder.customerName) {
      setCustomerName(activeOrder.customerName);
    } else {
      setCustomerName('');
    }
    setSpecialInstructions('');
    setCart([]);
    setIsOrderModalOpen(true);
  };

  const addToCart = (item: FoodItem) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.foodItem.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [...prev, { foodItem: item, quantity: 1 }];
    });
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.foodItem.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as any
    );
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.foodItem.price * item.quantity, 0);
  };

  const handleSendOrder = async () => {
    if (!selectedTable || cart.length === 0) {
      alert('Please add at least one food item.');
      return;
    }

    const hasActiveOrder = selectedTable.orders && selectedTable.orders.length > 0;
    const activeOrder = hasActiveOrder ? selectedTable.orders![0] : null;
    const effectiveCustomerName = customerName.trim() || (activeOrder?.customerName ? activeOrder.customerName : `Guest Table ${selectedTable.tableNumber}`);

    setIsSubmitting(true);
    try {
      const payload = {
        tableId: selectedTable.id,
        customerName: effectiveCustomerName,
        specialInstructions,
        items: cart.map((c) => ({
          foodItemId: c.foodItem.id,
          quantity: c.quantity,
          notes: c.notes || '',
        })),
      };

      await API.post('/orders', payload);

      setIsOrderModalOpen(false);
      fetchTables();
      fetchRunningOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkServed = async (orderId: string) => {
    try {
      await API.put(`/orders/${orderId}/status`, { status: 'SERVED' });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleMarkTableAvailable = async (tableId: string) => {
    try {
      await API.put(`/tables/${tableId}/status`, { status: 'AVAILABLE' });
      fetchTables();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update table status');
    }
  };

  const filteredFoodItems = foodItems.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getTableStatusStyle = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:border-emerald-500';
      case 'OCCUPIED':
        return 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:border-amber-500';
      case 'RESERVED':
        return 'bg-purple-950/40 border-purple-800/60 text-purple-300';
      case 'CLEANING':
        return 'bg-blue-950/40 border-blue-800/60 text-blue-300';
      default:
        return 'bg-slate-900 border-slate-800 text-slate-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-full text-[11px] font-semibold">Order Placed</span>;
      case 'PREPARING':
        return <span className="px-2.5 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full text-[11px] font-semibold animate-pulse flex items-center gap-1">🔥 Preparing</span>;
      case 'READY':
        return <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[11px] font-semibold">✓ Ready to Serve</span>;
      case 'SERVED':
        return <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[11px] font-semibold">Served</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full text-[11px]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Ready Food Toast Banner Alerts */}
      {readyNotifications.map((notif) => (
        <div
          key={notif.id}
          className="p-4 bg-gradient-to-r from-emerald-950 to-slate-900 border-2 border-emerald-500 rounded-2xl shadow-2xl flex items-center justify-between animate-bounce"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-base">
                🔔 FOOD READY! Table {notif.tableNumber}
              </h4>
              <p className="text-xs text-slate-300">
                Order #{notif.orderNumber} for <span className="font-bold text-amber-300">{notif.customerName}</span> is cooked & ready for service.
              </p>
            </div>
          </div>
          <button
            onClick={() => setReadyNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}

      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-amber-400" /> Waiter Order Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Select a table to take new orders or track live service</p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'tables' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
          >
            Table Map ({tables.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'orders' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
          >
            Active Orders ({runningOrders.length})
          </button>
        </div>
      </div>

      {/* TABLES VIEW */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => {
            const activeOrders = table.orders || [];

            // Sort orders by urgency priority: READY (1) > PREPARING (2) > PENDING (3) > SERVED (4)
            const sortedOrders = [...activeOrders].sort((a, b) => {
              const priority: Record<string, number> = { READY: 1, PREPARING: 2, PENDING: 3, SERVED: 4 };
              return (priority[a.status] || 99) - (priority[b.status] || 99);
            });

            const topOrder = sortedOrders[0] || null;

            return (
              <div
                key={table.id}
                className={`p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${getTableStatusStyle(
                  table.status
                )}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold tracking-wider uppercase opacity-80">
                      Table {table.tableNumber}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900/80 border border-current">
                      {table.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-3">
                    <Users className="w-3.5 h-3.5" />
                    <span>Cap: {table.capacity} Persons</span>
                  </div>

                  {topOrder && (
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs mb-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-slate-200 truncate">{topOrder.customerName}</div>
                        {activeOrders.length > 1 && (
                          <span className="text-[9px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded-md font-bold">
                            +{activeOrders.length - 1} more
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-amber-400 font-mono">#{topOrder.orderNumber}</div>
                      <div className="flex items-center justify-between pt-0.5">
                        {getStatusBadge(topOrder.status)}
                      </div>

                      {topOrder.status === 'READY' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkServed(topOrder.id);
                          }}
                          className="w-full mt-1.5 py-1.5 px-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1 transition-all animate-pulse shadow-md"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Served</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleOpenOrderModal(table)}
                  className="w-full mt-2 py-2 px-3 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{table.status === 'AVAILABLE' ? 'New Order' : 'Add Items'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ACTIVE ORDERS VIEW */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {runningOrders.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 text-sm">
              No active running orders right now.
            </div>
          ) : (
            runningOrders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        #{order.orderNumber}
                      </span>
                      <h3 className="font-bold text-slate-100 text-base">{order.customerName}</h3>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-slate-400 mb-3">
                    <span className="font-semibold text-slate-300">Table {order.table?.tableNumber}</span>
                    <span>•</span>
                    <span>Token #{order.tokenNumber}</span>
                  </div>

                  {/* Food items summary */}
                  <div className="space-y-2 border-t border-slate-800 pt-3">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-slate-300 gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          {item.foodItem?.image ? (
                            <img
                              src={item.foodItem.image}
                              alt={item.foodItem?.name || 'Food item'}
                              className="w-7 h-7 object-cover rounded-lg shrink-0 border border-slate-800"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                              <Utensils className="w-3.5 h-3.5 text-amber-500/70" />
                            </div>
                          )}
                          <span className="truncate">
                            <strong className="text-amber-400">{item.quantity}x</strong> {item.foodItem?.name}
                          </span>
                        </div>
                        <span className="text-slate-400 font-semibold shrink-0">₹{item.unitPrice * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-400">Total: </span>
                    <span className="font-bold text-amber-400 text-sm">₹{order.grandTotal}</span>
                  </div>

                  {order.status === 'READY' && (
                    <button
                      onClick={() => handleMarkServed(order.id)}
                      className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1 transition-all animate-pulse"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Served</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE ORDER MODAL */}
      {isOrderModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">

            {/* Modal Header */}
            <div className="p-5 bg-slate-800/60 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Create Order - Table {selectedTable.tableNumber}
                </h3>
                <p className="text-xs text-slate-400">Cap: {selectedTable.capacity} persons</p>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left Column: Menu Selector */}
              <div className="lg:col-span-7 space-y-4">

                {/* Search & Category filter */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search food items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    <button
                      onClick={() => setSelectedCategory('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === 'ALL'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items List Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-1">
                  {filteredFoodItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex flex-col justify-between space-y-2 hover:border-amber-500/50 transition-all"
                    >
                      <div className="flex gap-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-14 h-14 object-cover rounded-xl shrink-0"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                            />
                            <h4 className="font-bold text-xs text-slate-100 leading-snug">{item.name}</h4>
                          </div>
                          <p className="text-[11px] text-amber-400 font-bold mt-1">₹{item.price}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => addToCart(item)}
                        className="w-full py-1.5 bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Order Details & Cart */}
              <div className="lg:col-span-5 bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-200 text-sm border-b border-slate-800 pb-2">Order Information</h4>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Special Cooking Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Less spicy, extra sauce"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    <div className="text-xs font-bold text-slate-400">Cart Items ({cart.length})</div>
                    {cart.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No items added yet</p>
                    ) : (
                      cart.map((c) => (
                        <div
                          key={c.foodItem.id}
                          className="flex items-center justify-between p-2 bg-slate-900 rounded-xl border border-slate-800 text-xs gap-2"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {c.foodItem.image ? (
                              <img
                                src={c.foodItem.image}
                                alt={c.foodItem.name}
                                className="w-9 h-9 object-cover rounded-lg shrink-0 border border-slate-800"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                <Utensils className="w-4 h-4 text-amber-500/70" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-slate-200 truncate">{c.foodItem.name}</div>
                              <div className="text-[10px] text-amber-400 font-semibold">₹{c.foodItem.price * c.quantity}</div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              onClick={() => updateCartQuantity(c.foodItem.id, -1)}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                            >
                              -
                            </button>
                            <span className="font-bold text-slate-100 text-xs px-1">{c.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(c.foodItem.id, 1)}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Send Order Footer */}
                <div className="border-t border-slate-800 pt-3 space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-200">
                    <span>Subtotal:</span>
                    <span className="text-amber-400">₹{calculateSubtotal()}</span>
                  </div>

                  <button
                    onClick={handleSendOrder}
                    disabled={isSubmitting || cart.length === 0 || !customerName.trim()}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'SENDING ORDER...' : 'SEND ORDER TO KITCHEN'}</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
