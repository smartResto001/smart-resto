import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { Order } from '../types';
import { ChefHat, Clock, Flame, CheckCircle, AlertCircle, Sparkles, Filter } from 'lucide-react';

export const KitchenDashboard: React.FC = () => {
  const { socket, playNotificationSound } = useSocket();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    fetchOrders();

    // Timer tick every second for cooking timer countup
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('order:created', (newOrder: Order) => {
      playNotificationSound();
      setOrders((prev) => [newOrder, ...prev]);
    });

    socket.on('order:status_changed', (updatedOrder: Order) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    });

    return () => {
      socket.off('order:created');
      socket.off('order:status_changed');
    };
  }, [socket]);

  const fetchOrders = async () => {
    try {
      const res = await API.get('/orders');
      // Filter out paid/cancelled from live kitchen screen
      const kitchenActive = res.data.data.filter((o: Order) =>
        ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
      );
      setOrders(kitchenActive);
    } catch (err) {
      console.error('Error fetching kitchen orders', err);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      await API.put(`/orders/${orderId}/status`, { status: nextStatus });
    } catch (err) {
      console.error('Error updating status', err);
    }
  };

  const getElapsedTime = (orderTime: string) => {
    const start = new Date(orderTime).getTime();
    const diffSec = Math.floor((nowTime - start) / 1000);
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const getCardHeaderColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'ACCEPTED':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'PREPARING':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      case 'READY':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === 'ALL') return true;
    return o.status === filterStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Status Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-amber-400" /> Kitchen KDS Display
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Live incoming order tickets & cooking timers</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {['ALL', 'PENDING', 'PREPARING', 'READY'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === status
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {status} ({status === 'ALL' ? orders.length : orders.filter((o) => o.status === status).length})
            </button>
          ))}
        </div>
      </div>

      {/* Live Order Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800">
            <ChefHat className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-400">All Kitchen Orders Clear!</h3>
            <p className="text-xs text-slate-500">New orders submitted by waiters will appear instantly.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const elapsedTime = getElapsedTime(order.orderTime);

            return (
              <div
                key={order.id}
                className={`bg-slate-900 border-2 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between transition-all duration-300 ${
                  order.status === 'PENDING'
                    ? 'border-yellow-500/60 shadow-yellow-500/10 animate-pulse'
                    : order.status === 'PREPARING'
                    ? 'border-orange-500/60 shadow-orange-500/10'
                    : 'border-emerald-500/60 shadow-emerald-500/10'
                }`}
              >
                {/* Card Top Banner */}
                <div className={`p-4 border-b flex justify-between items-center ${getCardHeaderColor(order.status)}`}>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-black tracking-wide font-mono">
                        #{order.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-950/60 text-xs font-bold">
                        Token #{order.tokenNumber}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-100 mt-1">
                      Table {order.table?.tableNumber} • {order.customerName}
                    </div>
                  </div>

                  {/* Cooking Timer Badge */}
                  <div className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/50 text-xs font-mono font-bold text-amber-300 shadow-inner">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsedTime}</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-5 space-y-3 flex-1">
                  {order.specialInstructions && (
                    <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs font-semibold flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Note: {order.specialInstructions}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-800/60 border border-slate-700/40 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow">
                            {item.quantity}
                          </span>
                          <div>
                            <div className="text-sm font-bold text-slate-100">{item.foodItem?.name}</div>
                            {item.notes && <div className="text-[10px] text-slate-400">"{item.notes}"</div>}
                          </div>
                        </div>

                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            item.foodItem?.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          title={item.foodItem?.isVeg ? 'Veg' : 'Non-Veg'}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Transition Action Buttons */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
                  {order.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                      className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-all"
                    >
                      <Flame className="w-4 h-4" />
                      <span>START PREPARING</span>
                    </button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'READY')}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>MARK FOOD READY</span>
                    </button>
                  )}

                  {order.status === 'READY' && (
                    <div className="w-full py-2.5 text-center text-xs font-bold text-emerald-400 bg-emerald-950/40 rounded-xl border border-emerald-800/40">
                      ✓ Ready - Waiting for Waiter to serve
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
