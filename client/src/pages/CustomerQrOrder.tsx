import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { Category, FoodItem, Order } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  Utensils,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Clock,
  Flame,
  ChefHat,
  Bell,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Star,
  ChevronRight,
  Info,
  Sparkles,
  RefreshCw,
  Phone,
  User as UserIcon,
  Users,
  MessageSquare,
  Droplets,
  Receipt,
  HelpCircle,
  CreditCard,
  QrCode,
  DollarSign,
  Check,
} from 'lucide-react';
import axios from 'axios';

interface CartItem {
  foodItem: FoodItem;
  quantity: number;
  notes: string;
}

export const CustomerQrOrder: React.FC = () => {
  const { tableNumber, qrToken } = useParams<{ tableNumber: string; qrToken: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [restaurantInfo, setRestaurantInfo] = useState<any>(null);
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vegOnlyFilter, setVegOnlyFilter] = useState<boolean>(false);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [editingItemNotes, setEditingItemNotes] = useState<FoodItem | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');

  // Checkout Modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>(() => localStorage.getItem('qr_customer_name') || '');
  const [customerPhone, setCustomerPhone] = useState<string>(() => localStorage.getItem('qr_customer_phone') || '');
  const [numberOfPersons, setNumberOfPersons] = useState<number>(2);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // Session & Tracking
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem(`qr_session_${tableNumber}`));
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [trackingView, setTrackingView] = useState<boolean>(false);

  // Call Waiter Modal
  const [isCallWaiterOpen, setIsCallWaiterOpen] = useState<boolean>(false);
  const [waiterNote, setWaiterNote] = useState<string>('');
  const [callWaiterMessage, setCallWaiterMessage] = useState<string | null>(null);

  // Feedback Modal
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);
  const [ratingFood, setRatingFood] = useState<number>(5);
  const [ratingService, setRatingService] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  // Online Pay Bill Modal
  const [isPayBillModalOpen, setIsPayBillModalOpen] = useState<boolean>(false);
  const [payMethod, setPayMethod] = useState<'UPI' | 'ONLINE'>('UPI');
  const [payTxnId, setPayTxnId] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);

  const getPublicApiBase = (): string => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (!envUrl) return '/api';
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  };
  const apiBase = getPublicApiBase();

  // 1. Initial Load: Validate QR & Fetch Restaurant/Menu Info
  useEffect(() => {
    if (!tableNumber || !qrToken) {
      setError('Invalid Table QR Code Link');
      setLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch Table & Hotel Info
        const infoRes = await axios.get(`${apiBase}/public/qr/${tableNumber}/${qrToken}/info`);
        if (infoRes.data.success) {
          setTableInfo(infoRes.data.data.table);
          setRestaurantInfo(infoRes.data.data.restaurant);

          // Restore session if available
          if (infoRes.data.data.activeSessionId) {
            setSessionId(infoRes.data.data.activeSessionId);
            localStorage.setItem(`qr_session_${tableNumber}`, infoRes.data.data.activeSessionId);
          }
        }

        // Fetch Menu
        const menuRes = await axios.get(`${apiBase}/public/qr/${tableNumber}/${qrToken}/menu`);
        if (menuRes.data.success) {
          setCategories(menuRes.data.data);
        }
      } catch (err: any) {
        console.error('Error loading QR menu:', err);
        setError(err.response?.data?.message || 'Failed to connect to table session. Please re-scan QR Code.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [tableNumber, qrToken]);

  // 2. Fetch Active Session Orders
  const fetchActiveOrders = async () => {
    if (!tableNumber || !qrToken || !sessionId) return;
    try {
      const res = await axios.get(`${apiBase}/public/qr/${tableNumber}/${qrToken}/orders/${sessionId}`);
      if (res.data.success) {
        setActiveOrders(res.data.data);
        if (res.data.data.length > 0 && cart.length === 0) {
          setTrackingView(true);
        }
      }
    } catch (err) {
      console.error('Error fetching active session orders:', err);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchActiveOrders();
    }
  }, [sessionId, tableNumber, qrToken]);

  // Polling fallback when tracking view is open to guarantee status updates
  useEffect(() => {
    if (!trackingView || !sessionId) return;
    const interval = setInterval(() => {
      fetchActiveOrders();
    }, 4000);
    return () => clearInterval(interval);
  }, [trackingView, sessionId, tableNumber, qrToken]);

  // 3. Socket.IO Listeners for Live Order Tracking
  useEffect(() => {
    if (!socket || !tableInfo?.id) return;

    socket.emit('join:table', tableInfo.id);

    const handleOrderUpdate = (updatedOrder: Order) => {
      console.log('⚡ Socket Order Update:', updatedOrder);
      setActiveOrders((prev) => {
        const exists = prev.some((o) => o.id === updatedOrder.id);
        if (exists) {
          return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
        } else {
          return [updatedOrder, ...prev];
        }
      });
    };

    socket.on('customer:order_updated', handleOrderUpdate);
    socket.on('order:status_changed', (updatedOrder: Order) => {
      if (updatedOrder.tableId === tableInfo.id || updatedOrder.sessionId === sessionId) {
        handleOrderUpdate(updatedOrder);
      }
    });

    return () => {
      socket.off('customer:order_updated', handleOrderUpdate);
      socket.off('order:status_changed');
    };
  }, [socket, tableInfo?.id, sessionId]);

  // All Food Items extracted
  const allFoodItems = useMemo(() => {
    const list: FoodItem[] = [];
    categories.forEach((cat) => {
      if (cat.foodItems) {
        cat.foodItems.forEach((item) => list.push({ ...item, category: cat }));
      }
    });
    return list;
  }, [categories]);

  // Filtered Food Items
  const filteredItems = useMemo(() => {
    return allFoodItems.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' || item.categoryId === activeCategory;
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVeg = !vegOnlyFilter || item.isVeg;
      return matchesCategory && matchesSearch && matchesVeg;
    });
  }, [allFoodItems, activeCategory, searchQuery, vegOnlyFilter]);

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, ci) => sum + ci.foodItem.price * ci.quantity, 0);
  }, [cart]);

  const cartGst = cartSubtotal * 0.05;
  const cartGrandTotal = cartSubtotal + cartGst;
  const cartTotalItemsCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  // Cart Helpers
  const getItemQuantity = (foodItemId: string) => {
    const found = cart.find((ci) => ci.foodItem.id === foodItemId);
    return found ? found.quantity : 0;
  };

  const getItemNotes = (foodItemId: string) => {
    const found = cart.find((ci) => ci.foodItem.id === foodItemId);
    return found ? found.notes : '';
  };

  const handleAddToCart = (foodItem: FoodItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.foodItem.id === foodItem.id);
      if (existing) {
        return prev.map((ci) =>
          ci.foodItem.id === foodItem.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      } else {
        return [...prev, { foodItem, quantity: 1, notes: '' }];
      }
    });
  };

  const handleRemoveFromCart = (foodItemId: string) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.foodItem.id === foodItemId);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map((ci) =>
          ci.foodItem.id === foodItemId ? { ...ci, quantity: ci.quantity - 1 } : ci
        );
      } else {
        return prev.filter((ci) => ci.foodItem.id !== foodItemId);
      }
    });
  };

  const handleSaveNotes = () => {
    if (!editingItemNotes) return;
    setCart((prev) =>
      prev.map((ci) =>
        ci.foodItem.id === editingItemNotes.id ? { ...ci, notes: tempNoteText } : ci
      )
    );
    setEditingItemNotes(null);
    setTempNoteText('');
  };

  // Submit QR Order
  const handlePlaceOrder = async () => {
    if (!customerName.trim()) {
      alert('Please enter your Name before placing order');
      return;
    }
    if (cart.length === 0) return;

    try {
      setIsSubmittingOrder(true);

      localStorage.setItem('qr_customer_name', customerName.trim());
      if (customerPhone) localStorage.setItem('qr_customer_phone', customerPhone.trim());

      const payload = {
        customerName: customerName.trim(),
        phone: customerPhone.trim() || undefined,
        numberOfPersons,
        specialInstructions: specialInstructions.trim() || undefined,
        sessionId: sessionId || undefined,
        items: cart.map((ci) => ({
          foodItemId: ci.foodItem.id,
          quantity: ci.quantity,
          notes: ci.notes || undefined,
        })),
      };

      const res = await axios.post(`${apiBase}/public/qr/${tableNumber}/${qrToken}/order`, payload);

      if (res.data.success) {
        const createdOrder = res.data.data.order;
        const newSessionId = res.data.data.sessionId;

        setSessionId(newSessionId);
        localStorage.setItem(`qr_session_${tableNumber}`, newSessionId);

        setActiveOrders((prev) => [createdOrder, ...prev]);
        setCart([]);
        setIsCartOpen(false);
        setIsCheckoutModalOpen(false);
        setTrackingView(true);
      }
    } catch (err: any) {
      console.error('Error placing QR order:', err);
      alert(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Call Waiter Action
  const handleTriggerCallWaiter = async (type: string) => {
    try {
      const res = await axios.post(`${apiBase}/public/qr/${tableNumber}/${qrToken}/call-waiter`, {
        requestType: type,
        notes: waiterNote,
        customerName: customerName || `Table ${tableNumber} Guest`,
      });
      if (res.data.success) {
        setCallWaiterMessage(res.data.message);
        setTimeout(() => {
          setCallWaiterMessage(null);
          setIsCallWaiterOpen(false);
          setWaiterNote('');
        }, 2500);
      }
    } catch (err) {
      console.error('Error calling waiter:', err);
    }
  };

  // Submit Feedback Action
  const handleSubmitFeedback = async () => {
    try {
      const res = await axios.post(`${apiBase}/public/qr/${tableNumber}/${qrToken}/feedback`, {
        orderId: activeOrders[0]?.id,
        ratingFood,
        ratingService,
        comments: feedbackComments,
        customerName: customerName || `Table ${tableNumber} Guest`,
      });
      if (res.data.success) {
        setFeedbackSubmitted(true);
        setTimeout(() => {
          setIsFeedbackOpen(false);
          setFeedbackSubmitted(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  // Mobile Customer Online Payment
  const handleConfirmPublicPayment = async () => {
    if (!tableNumber || !qrToken) return;

    try {
      setIsProcessingPayment(true);
      const res = await axios.post(`${apiBase}/public/qr/${tableNumber}/${qrToken}/pay`, {
        paymentMethod: payMethod,
        transactionId: payTxnId.trim() || undefined,
        customerName: customerName || `Table ${tableNumber} Guest`,
        sessionId: sessionId || undefined,
      });

      if (res.data.success) {
        setPaymentSuccessData(res.data.data);

        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {}

        // Clear table session
        localStorage.removeItem(`qr_session_${tableNumber}`);
        setActiveOrders([]);

        setTimeout(() => {
          setIsPayBillModalOpen(false);
          setIsFeedbackOpen(true);
        }, 3000);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      alert(err.response?.data?.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold">Scanning QR Code...</h2>
        <p className="text-sm text-slate-400 mt-1">Detecting Table {tableNumber} session</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-red-400">QR Code Error</h2>
        <p className="text-slate-300 max-w-sm mt-2">{error}</p>
        <p className="text-xs text-slate-500 mt-4">Please make sure you scan the valid QR code present on your table.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-32 font-sans selection:bg-sky-500 selection:text-white">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-md font-bold text-white text-lg">
              {restaurantInfo?.hotelName?.charAt(0) || 'R'}
            </div>
            <div>
              <h1 className="font-extrabold text-base leading-tight text-white">
                {restaurantInfo?.hotelName || 'SmartResto'}
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Table #{tableInfo?.tableNumber}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Call Waiter Button */}
            <button
              onClick={() => setIsCallWaiterOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-medium text-xs transition"
            >
              <Bell className="w-3.5 h-3.5" /> Call Waiter
            </button>

            {/* Toggle Order Tracking View if active orders exist */}
            {activeOrders.length > 0 && (
              <button
                onClick={() => setTrackingView(!trackingView)}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 border transition ${
                  trackingView
                    ? 'bg-sky-600 text-white border-sky-500 shadow-lg shadow-sky-600/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <ChefHat className="w-4 h-4" />
                <span className="hidden sm:inline">Status</span>
                <span className="w-2 h-2 rounded-full bg-sky-400" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Content Body */}
      <main className="max-w-lg mx-auto p-4 space-y-5">
        {/* Active Order Banner / Tracking Toggle */}
        {activeOrders.length > 0 && !trackingView && (
          <div
            onClick={() => setTrackingView(true)}
            className="bg-gradient-to-r from-sky-950 to-indigo-950 border border-sky-500/40 p-4 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer group hover:border-sky-400 transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl">
                <ChefHat className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">Order in Progress</div>
                <div className="font-bold text-white text-sm">
                  {activeOrders[0].items.length} items • Status: <span className="text-amber-400">{activeOrders[0].status}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-sky-400 group-hover:translate-x-1 transition">
              Track <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* VIEW A: LIVE ORDER TRACKING */}
        {trackingView ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-sky-400" /> Live Order Tracking
              </h2>
              <button
                onClick={() => setTrackingView(false)}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 underline"
              >
                + Order More Items
              </button>
            </div>

            {activeOrders.map((ord) => {
              const getStatusMeta = (status: string) => {
                switch (status) {
                  case 'PENDING':
                    return { step: 1, percent: 25, label: 'Pending', color: 'text-amber-400', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
                  case 'ACCEPTED':
                  case 'PREPARING':
                    return { step: 2, percent: 50, label: 'Preparing 🍳', color: 'text-orange-400', badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
                  case 'READY':
                    return { step: 3, percent: 75, label: 'Food Ready 🍲', color: 'text-emerald-400', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
                  case 'SERVED':
                    return { step: 4, percent: 90, label: 'Served 🍽️', color: 'text-sky-400', badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30' };
                  case 'COMPLETED':
                  case 'PAID':
                    return { step: 4, percent: 100, label: 'Completed ✅', color: 'text-purple-400', badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
                  case 'CANCELLED':
                    return { step: 0, percent: 0, label: 'Cancelled ❌', color: 'text-rose-400', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
                  default:
                    return { step: 1, percent: 25, label: status, color: 'text-sky-400', badgeClass: 'bg-slate-800 text-slate-300' };
                }
              };

              const meta = getStatusMeta(ord.status);

              return (
                <div
                  key={ord.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-xs text-slate-400">Order ID</div>
                      <div className="font-mono font-bold text-white text-base">{ord.orderNumber}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Token Number</div>
                      <div className="font-extrabold text-sky-400 text-xl">#{ord.tokenNumber}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span>Status: <span className={`px-2 py-0.5 rounded-md border text-xs ${meta.badgeClass}`}>{meta.label}</span></span>
                      <span className="text-slate-400">Est. Prep: 15 min</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
                        style={{
                          width: `${meta.percent}%`,
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-4 text-[10px] text-center text-slate-500 pt-1 font-medium">
                      <span className={meta.step >= 1 ? 'text-amber-400 font-bold' : ''}>1. Received</span>
                      <span className={meta.step >= 2 ? 'text-orange-400 font-bold' : ''}>2. Kitchen</span>
                      <span className={meta.step >= 3 ? 'text-emerald-400 font-bold' : ''}>3. Ready</span>
                      <span className={meta.step >= 4 ? 'text-sky-400 font-bold' : ''}>4. Served</span>
                    </div>
                  </div>

                  {/* Order Items List */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="text-xs font-semibold text-slate-400 border-b border-slate-800 pb-1">
                      Ordered Items ({ord.items.length})
                    </div>
                    {ord.items.map((it) => (
                      <div key={it.id || it.foodItemId} className="flex justify-between text-xs py-1">
                        <div className="flex gap-2">
                          <span className="font-bold text-sky-400">{it.quantity}x</span>
                          <span className="text-slate-200">{it.foodItem?.name || 'Food Item'}</span>
                        </div>
                        <span className="font-medium text-slate-400">₹{it.unitPrice * it.quantity}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-white">
                      <span>Total (incl. GST)</span>
                      <span className="text-emerald-400">₹{ord.grandTotal}</span>
                    </div>
                  </div>

                  {/* Action Buttons: Pay Online (Only if Payment Pending) / Feedback */}
                  <div className="space-y-2 pt-1">
                    {ord.status !== 'PAID' && ord.status !== 'COMPLETED' && ord.status !== 'CANCELLED' ? (
                      <button
                        onClick={() => setIsPayBillModalOpen(true)}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                      >
                        <CreditCard className="w-4 h-4 text-emerald-300" /> Pay Bill Online (UPI / Card)
                      </button>
                    ) : (ord.status === 'PAID' || ord.status === 'COMPLETED') ? (
                      <div className="w-full py-2.5 bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Bill Paid & Completed
                      </div>
                    ) : null}

                    {(ord.status === 'SERVED' || ord.status === 'COMPLETED' || ord.status === 'PAID') && (
                      <button
                        onClick={() => setIsFeedbackOpen(true)}
                        className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                      >
                        <Star className="w-4 h-4 fill-emerald-400" /> Rate Food & Service
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* VIEW B: MENU & ORDERING */
          <>
            {/* Search Bar & Veg Toggle */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search starters, biryani, drinks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition shadow-inner"
                />
              </div>

              {/* Veg Toggle Pill */}
              <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Filter Vegetarian Only
                </span>
                <button
                  onClick={() => setVegOnlyFilter(!vegOnlyFilter)}
                  className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                    vegOnlyFilter ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow" />
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeCategory === 'all'
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                All Menu ({allFoodItems.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    activeCategory === cat.id
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {cat.name} ({cat.foodItems?.length || 0})
                </button>
              ))}
            </div>

            {/* Food Items List */}
            <div className="space-y-4 pt-1">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
                  <Utensils className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="font-semibold text-sm">No items found matching your filters.</p>
                </div>
              ) : (
                filteredItems.map((food) => {
                  const qty = getItemQuantity(food.id);
                  const notes = getItemNotes(food.id);

                  return (
                    <div
                      key={food.id}
                      className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex gap-3 sm:gap-4 transition hover:border-slate-700 relative overflow-hidden"
                    >
                      {/* Food Image */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-slate-800 overflow-hidden relative shrink-0">
                        {food.image ? (
                          <img
                            src={food.image}
                            alt={food.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Utensils className="w-8 h-8" />
                          </div>
                        )}
                        {food.isPopular && (
                          <span className="absolute top-1 left-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-0.5 shadow">
                            <Flame className="w-2.5 h-2.5 fill-slate-950" /> Popular
                          </span>
                        )}
                      </div>

                      {/* Food Info */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              {/* Veg / Non-Veg Indicator */}
                              <span
                                className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                                  food.isVeg ? 'border-emerald-500' : 'border-red-500'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    food.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                                  }`}
                                />
                              </span>
                              <h3 className="font-bold text-white text-sm leading-tight">{food.name}</h3>
                            </div>
                            <div className="font-extrabold text-sky-400 text-base">₹{food.price}</div>
                          </div>

                          {food.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1">{food.description}</p>
                          )}

                          {/* Extra Badges: Prep Time, Spicy, Ingredients */}
                          <div className="flex flex-wrap gap-2 items-center mt-2 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                              <Clock className="w-2.5 h-2.5 text-sky-400" /> {food.prepTime || 15}m
                            </span>
                            {food.spicyLevel ? (
                              <span className="flex items-center gap-0.5 bg-red-500/10 text-red-400 px-2 py-0.5 rounded-md border border-red-500/20 font-bold">
                                {'🌶️'.repeat(Math.min(3, food.spicyLevel))}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Quantity Counter & Notes */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/50 mt-2">
                          {qty > 0 ? (
                            <button
                              onClick={() => {
                                setEditingItemNotes(food);
                                setTempNoteText(notes);
                              }}
                              className="text-[11px] text-sky-400 font-semibold flex items-center gap-1 hover:underline"
                            >
                              <FileText className="w-3 h-3" /> {notes ? 'Notes added' : '+ Add Notes'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500">Fast Kitchen Prep</span>
                          )}

                          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden p-0.5">
                            {qty > 0 ? (
                              <>
                                <button
                                  onClick={() => handleRemoveFromCart(food.id)}
                                  className="w-7 h-7 flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white transition rounded-lg"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center font-bold text-xs text-white">{qty}</span>
                                <button
                                  onClick={() => handleAddToCart(food)}
                                  className="w-7 h-7 flex items-center justify-center bg-sky-600 text-white transition rounded-lg shadow"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleAddToCart(food)}
                                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> ADD
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* 3. Sticky Checkout / Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-4 shadow-2xl">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsCartOpen(true)}>
              <div className="relative p-3 bg-sky-600 text-white rounded-xl shadow-lg shadow-sky-600/30">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 font-black text-xs w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {cartTotalItemsCount}
                </span>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Grand Total</div>
                <div className="text-lg font-extrabold text-emerald-400">₹{cartGrandTotal.toFixed(2)}</div>
              </div>
            </div>

            <button
              onClick={() => setIsCheckoutModalOpen(true)}
              className="flex-1 py-3 px-5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-sky-600/30 transition text-sm flex items-center justify-center gap-2"
            >
              PLACE ORDER <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 space-y-4 text-white max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-sky-400" /> Your Food Cart
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {cart.map((item) => (
                <div
                  key={item.foodItem.id}
                  className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="font-bold text-sm text-white">{item.foodItem.name}</div>
                    <div className="text-xs text-emerald-400 font-semibold">
                      ₹{item.foodItem.price} x {item.quantity} = ₹{item.foodItem.price * item.quantity}
                    </div>
                    {item.notes && (
                      <div className="text-[11px] text-amber-400 mt-1 italic">"{item.notes}"</div>
                    )}
                  </div>

                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() => handleRemoveFromCart(item.foodItem.id)}
                      className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                    <button
                      onClick={() => handleAddToCart(item.foodItem)}
                      className="w-6 h-6 flex items-center justify-center bg-sky-600 text-white rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST (5%)</span>
                <span>₹{cartGst.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-extrabold text-white">
                <span>Grand Total</span>
                <span className="text-emerald-400">₹{cartGrandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutModalOpen(true);
              }}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 font-extrabold text-sm rounded-xl transition shadow-lg shadow-sky-600/30"
            >
              Proceed to Customer Details
            </button>
          </div>
        </div>
      )}

      {/* 5. Item Notes Modal */}
      {editingItemNotes && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 text-white">
            <h3 className="font-bold text-base">Add Notes for {editingItemNotes.name}</h3>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {['No Onion', 'Extra Cheese', 'Less Spicy', 'No Ice', 'Serve Hot'].map((preset) => (
                <button
                  key={preset}
                  onClick={() =>
                    setTempNoteText((prev) => (prev ? `${prev}, ${preset}` : preset))
                  }
                  className="px-2.5 py-1 bg-slate-800 border border-slate-700 hover:bg-sky-600 hover:border-sky-500 rounded-lg text-slate-300 hover:text-white transition"
                >
                  +{preset}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              placeholder="e.g. Less oil, extra chutney..."
              value={tempNoteText}
              onChange={(e) => setTempNoteText(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingItemNotes(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="flex-1 py-2 bg-sky-600 text-white font-bold rounded-xl text-xs"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Checkout Customer Details Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-white">Table #{tableNumber} Checkout</h3>
                <p className="text-xs text-slate-400">Confirm details to send order to kitchen</p>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-sky-400" /> Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-sky-400" /> Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-sky-400" /> Number of Persons
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNumberOfPersons(num)}
                      className={`flex-1 py-2 rounded-lg font-bold border transition ${
                        numberOfPersons === num
                          ? 'bg-sky-600 border-sky-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" /> Special Kitchen Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deliver all items together"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Total Payment Note */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
              💵 Payment is done directly at the billing counter after dining.
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmittingOrder}
              className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black text-sm rounded-xl transition shadow-lg shadow-sky-600/30 disabled:opacity-50"
            >
              {isSubmittingOrder ? 'Submitting to Kitchen...' : `CONFIRM ORDER (₹${cartGrandTotal.toFixed(2)})`}
            </button>
          </div>
        </div>
      )}

      {/* 7. Call Waiter Modal */}
      {isCallWaiterOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-amber-400">
                <Bell className="w-5 h-5" /> Request Waiter Service
              </h3>
              <button onClick={() => setIsCallWaiterOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {callWaiterMessage ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-emerald-400 text-xs font-bold space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <p>{callWaiterMessage}</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-400">Select what you need for Table #{tableNumber}:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTriggerCallWaiter('Request Water')}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-sky-500 hover:bg-sky-500/10 rounded-xl flex flex-col items-center gap-1.5 transition text-xs font-bold text-slate-200"
                  >
                    <Droplets className="w-5 h-5 text-sky-400" /> Request Water
                  </button>
                  <button
                    onClick={() => handleTriggerCallWaiter('Request Bill')}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-emerald-500 hover:bg-emerald-500/10 rounded-xl flex flex-col items-center gap-1.5 transition text-xs font-bold text-slate-200"
                  >
                    <Receipt className="w-5 h-5 text-emerald-400" /> Request Bill
                  </button>
                  <button
                    onClick={() => handleTriggerCallWaiter('Waiter Assistance')}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-amber-500 hover:bg-amber-500/10 rounded-xl flex flex-col items-center gap-1.5 transition text-xs font-bold text-slate-200"
                  >
                    <HelpCircle className="w-5 h-5 text-amber-400" /> Assistance
                  </button>
                  <button
                    onClick={() => handleTriggerCallWaiter('Clean Table')}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-indigo-500 hover:bg-indigo-500/10 rounded-xl flex flex-col items-center gap-1.5 transition text-xs font-bold text-slate-200"
                  >
                    <Sparkles className="w-5 h-5 text-indigo-400" /> Clean Table
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 8. Post-Payment Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-emerald-400">
                <Star className="w-5 h-5 fill-emerald-400" /> Dining Feedback
              </h3>
              <button onClick={() => setIsFeedbackOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedbackSubmitted ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-emerald-400 text-xs font-bold space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <p>Thank you for rating your dining experience!</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Rate Food Quality</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingFood(star)}
                        className="p-1 text-amber-400 hover:scale-110 transition"
                      >
                        <Star className={`w-6 h-6 ${star <= ratingFood ? 'fill-amber-400' : 'text-slate-700'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Rate Waiter & Service</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingService(star)}
                        className="p-1 text-amber-400 hover:scale-110 transition"
                      >
                        <Star className={`w-6 h-6 ${star <= ratingService ? 'fill-amber-400' : 'text-slate-700'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Comments or Suggestions</label>
                  <textarea
                    rows={2}
                    placeholder="Tell us what you enjoyed..."
                    value={feedbackComments}
                    onChange={(e) => setFeedbackComments(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  onClick={handleSubmitFeedback}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition"
                >
                  Submit Feedback
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. Mobile Online Pay Bill Modal */}
      {isPayBillModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 text-white shadow-2xl my-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Mobile Self Checkout
                </span>
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" /> Pay Bill - Table #{tableNumber}
                </h3>
              </div>
              <button
                onClick={() => setIsPayBillModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentSuccessData ? (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3 text-emerald-400">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 animate-bounce" />
                <h4 className="font-extrabold text-lg text-white">Bill Payment Successful!</h4>
                <p className="text-xs text-slate-300">
                  Ref Txn: <span className="font-mono text-emerald-400 font-bold">{paymentSuccessData.payment?.transactionId}</span>
                </p>
                <div className="bg-slate-950 p-3 rounded-xl text-xs text-slate-300 font-mono text-left space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>Grand Total Paid</span>
                    <span className="text-emerald-400">₹{paymentSuccessData.payment?.grandTotal}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Method: {paymentSuccessData.payment?.paymentMethod}</div>
                </div>
                <p className="text-xs text-slate-400">Redirecting to dining feedback...</p>
              </div>
            ) : (() => {
              const unpaidActiveOrders = activeOrders.filter(
                (o) => !['PAID', 'COMPLETED', 'CANCELLED'].includes(o.status)
              );
              const unpaidSubtotal = unpaidActiveOrders.reduce((sum, o) => sum + o.totalAmount, 0);
              const unpaidTax = unpaidSubtotal * 0.05;
              const unpaidGrandTotal = unpaidSubtotal + unpaidTax;

              if (unpaidActiveOrders.length === 0) {
                return (
                  <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3 text-slate-300">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
                    <h4 className="font-bold text-base text-white">No Pending Bill</h4>
                    <p className="text-xs text-slate-400">All orders for Table #{tableNumber} have already been paid and completed!</p>
                    <button
                      onClick={() => setIsPayBillModalOpen(false)}
                      className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl"
                    >
                      Close
                    </button>
                  </div>
                );
              }

              return (
                <>
                  {/* Bill Breakdown */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="font-bold text-slate-300 border-b border-slate-800 pb-1.5 flex justify-between">
                      <span>Table #{tableNumber} Pending Bill</span>
                      <span className="text-sky-400">{unpaidActiveOrders.length} ticket(s)</span>
                    </div>
                    {unpaidActiveOrders.map((o) => (
                      <div key={o.id} className="space-y-1">
                        {o.items.map((it) => (
                          <div key={it.id || it.foodItemId} className="flex justify-between text-slate-400">
                            <span>{it.quantity}x {it.foodItem?.name}</span>
                            <span>₹{it.unitPrice * it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="border-t border-slate-800 pt-2 space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal</span>
                        <span>₹{unpaidSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>GST (5%)</span>
                        <span>₹{unpaidTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-slate-800">
                        <span>Grand Total</span>
                        <span className="text-emerald-400">
                          ₹{unpaidGrandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Select Payment Method */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300">Choose Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPayMethod('UPI')}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                          payMethod === 'UPI'
                            ? 'bg-sky-600 border-sky-500 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <QrCode className="w-4 h-4" /> UPI QR / App
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayMethod('ONLINE')}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                          payMethod === 'ONLINE'
                            ? 'bg-sky-600 border-sky-500 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" /> Card / NetBanking
                      </button>
                    </div>
                  </div>

                  {/* UPI QR Display */}
                  {payMethod === 'UPI' && (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
                      <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                        Scan or Click to Pay via UPI
                      </div>
                      <div className="bg-white p-3 rounded-xl inline-block shadow-md">
                        <QRCodeSVG
                          value={`upi://pay?pa=${encodeURIComponent(restaurantInfo?.upiId || 'smartresto@upi')}&pn=${encodeURIComponent(
                            restaurantInfo?.upiName || restaurantInfo?.hotelName || 'SmartResto'
                          )}&am=${unpaidGrandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
                            `Table ${tableNumber} Bill`
                          )}`}
                          size={150}
                          level="M"
                        />
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Payee: {restaurantInfo?.upiName || restaurantInfo?.hotelName || 'SmartResto'} ({restaurantInfo?.upiId || 'smartresto@upi'})
                      </div>

                      {/* Quick UPI App Launch Links */}
                      <div className="flex justify-center gap-2 pt-1">
                        <a
                          href={`upi://pay?pa=${encodeURIComponent(restaurantInfo?.upiId || 'smartresto@upi')}&pn=${encodeURIComponent(
                            restaurantInfo?.upiName || restaurantInfo?.hotelName || 'SmartResto'
                          )}&am=${unpaidGrandTotal.toFixed(2)}&cu=INR`}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-lg text-[11px] font-bold"
                        >
                          📲 Open UPI App
                        </a>
                      </div>
                    </div>
                  )}

                {/* Optional Txn Ref Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    UPI / Payment Transaction Ref ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 329182391203 or TXN-12345"
                    value={payTxnId}
                    onChange={(e) => setPayTxnId(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <button
                  onClick={handleConfirmPublicPayment}
                  disabled={isProcessingPayment}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  {isProcessingPayment ? 'Processing Payment...' : 'CONFIRM & COMPLETE PAYMENT'}
                </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
