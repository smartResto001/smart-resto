import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { Order, PaymentMethod } from '../types';
import { Receipt, DollarSign, CreditCard, QrCode, Printer, CheckCircle2, Search, Wallet, Sparkles, Percent, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';

export const BillingDashboard: React.FC = () => {
  const { socket, playNotificationSound } = useSocket();

  const [unbilledOrders, setUnbilledOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Billing Controls State
  const [taxPercent, setTaxPercent] = useState<number>(5); // Default 5% GST
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Print Receipt Modal State
  const [receiptData, setReceiptData] = useState<{ order: Order; payment: any } | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    fetchUnbilledOrders();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('order:created', (newOrder: Order) => {
      playNotificationSound();
      setUnbilledOrders((prev) => [newOrder, ...prev]);
    });

    socket.on('order:status_changed', (updatedOrder: Order) => {
      setUnbilledOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    });

    socket.on('payment:completed', (data: any) => {
      setUnbilledOrders((prev) => prev.filter((o) => o.id !== data.order.id));
    });

    return () => {
      socket.off('order:created');
      socket.off('order:status_changed');
      socket.off('payment:completed');
    };
  }, [socket]);

  const fetchUnbilledOrders = async () => {
    try {
      const res = await API.get('/billing/unbilled');
      setUnbilledOrders(res.data.data);
      if (res.data.data.length > 0 && !selectedOrder) {
        setSelectedOrder(res.data.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch unbilled orders', err);
    }
  };

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setDiscountAmount(0);
    setPaidAmountInput('');
    setTransactionId('');
  };

  // Calculations
  const subtotal = selectedOrder ? selectedOrder.totalAmount : 0;
  const taxAmount = (subtotal * taxPercent) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);
  const paidAmount = parseFloat(paidAmountInput) || grandTotal;
  const balance = Math.max(0, paidAmount - grandTotal);

  const handleProcessPayment = async () => {
    if (!selectedOrder) return;

    setIsProcessing(true);
    try {
      const payload = {
        orderId: selectedOrder.id,
        paymentMethod,
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        grandTotal,
        paidAmount,
        transactionId: paymentMethod !== 'CASH' ? transactionId || `TXN-${Date.now().toString().slice(-6)}` : null,
      };

      const res = await API.post('/billing/payment', payload);

      // Celebrate confetti on payment success!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });

      setReceiptData(res.data.data);
      setShowPrintModal(true);

      setSelectedOrder(null);
      fetchUnbilledOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-400" /> Cashier & Billing Counter
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Generate bills, process split/cash/UPI payments & print receipts</p>
        </div>
        <div className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800/50">
          Unbilled Orders: {unbilledOrders.length}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Unbilled Orders Selector */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-bold text-slate-200 text-sm">Active Orders ({unbilledOrders.length})</h3>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {unbilledOrders.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                No orders waiting for billing.
              </div>
            ) : (
              unbilledOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;

                return (
                  <div
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-mono text-amber-400 font-bold">#{order.orderNumber}</span>
                        <h4 className="font-bold text-slate-100 text-sm">{order.customerName}</h4>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          order.status === 'READY'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5 mt-2">
                      <span>Table {order.table?.tableNumber}</span>
                      <span className="font-bold text-slate-200">₹{order.grandTotal}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Billing Calculator & Checkout */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-6">
          {selectedOrder ? (
            <>
              {/* Order Info & Items Breakdown */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">
                      Bill Checkout - Table {selectedOrder.table?.tableNumber}
                    </h3>
                    <p className="text-xs text-slate-400">Order #{selectedOrder.orderNumber} • {selectedOrder.customerName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Status</span>
                    <div className="text-xs font-bold text-amber-400">{selectedOrder.status}</div>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 max-h-[220px] overflow-y-auto space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-200">
                      <span>
                        <strong className="text-amber-400">{item.quantity}x</strong> {item.foodItem?.name}
                      </span>
                      <span className="font-mono">₹{item.unitPrice * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Adjustments: GST & Discount */}
                <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">GST Tax Rate</label>
                    <div className="flex gap-2">
                      {[5, 18].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setTaxPercent(rate)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            taxPercent === rate
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Discount Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['CASH', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET', 'SPLIT'] as PaymentMethod[]).map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                          paymentMethod === method
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span>{method.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extra inputs for UPI/Card transaction ID or Cash Paid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Amount Received (₹)</label>
                    <input
                      type="number"
                      placeholder={grandTotal.toString()}
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {paymentMethod !== 'CASH' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Txn Ref / UPI ID</label>
                      <input
                        type="text"
                        placeholder="e.g. UPI-984210"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Summary & Process Button */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST ({taxPercent}%):</span>
                    <span>+₹{taxAmount.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount:</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-100 pt-1 border-t border-slate-800">
                    <span>Grand Total:</span>
                    <span className="text-amber-400 text-lg">₹{grandTotal.toFixed(2)}</span>
                  </div>
                  {paidAmount > grandTotal && (
                    <div className="flex justify-between text-xs font-bold text-emerald-400">
                      <span>Return Balance:</span>
                      <span>₹{balance.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleProcessPayment}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold rounded-2xl text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all"
                >
                  <DollarSign className="w-5 h-5" />
                  <span>{isProcessing ? 'PROCESSING...' : `COLLECT ₹${grandTotal.toFixed(2)} & CLOSE ORDER`}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-slate-500 text-sm">
              Select an unbilled order from the left column to prepare receipt.
            </div>
          )}
        </div>

      </div>

      {/* PRINTABLE RECEIPT MODAL */}
      {showPrintModal && receiptData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            
            {/* Printable Receipt Content */}
            <div id="thermal-receipt" className="bg-white text-slate-900 p-6 rounded-2xl font-mono text-xs space-y-4 shadow-inner">
              <div className="text-center space-y-1 border-b border-slate-200 pb-3">
                <h2 className="text-base font-black uppercase tracking-wider font-sans">SMART RESTO</h2>
                <p className="text-[10px] text-slate-600">123 Culinary Boulevard, Gourmet City</p>
                <p className="text-[10px] text-slate-600">GSTIN: 27AAAAA0000A1Z5</p>
                <p className="text-[10px] font-bold text-slate-800">TAX INVOICE</p>
              </div>

              <div className="space-y-1 text-[11px] border-b border-slate-200 pb-2">
                <div className="flex justify-between">
                  <span>Order: #{receiptData.order.orderNumber}</span>
                  <span>Table: {receiptData.order.table?.tableNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer: {receiptData.order.customerName}</span>
                  <span>Token: #{receiptData.order.tokenNumber}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Date: {new Date(receiptData.payment.createdAt).toLocaleDateString()}</span>
                  <span>Time: {new Date(receiptData.payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-1.5 border-b border-slate-200 pb-3">
                <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500">
                  <span>Item</span>
                  <span>Qty x Price</span>
                  <span>Amount</span>
                </div>
                {receiptData.order.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate max-w-[140px]">{item.foodItem?.name}</span>
                    <span>{item.quantity} x {item.unitPrice}</span>
                    <span className="font-bold">₹{item.quantity * item.unitPrice}</span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="space-y-1 text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{receiptData.payment.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Tax:</span>
                  <span>₹{receiptData.payment.tax}</span>
                </div>
                {receiptData.payment.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{receiptData.payment.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-900">
                  <span>GRAND TOTAL:</span>
                  <span>₹{receiptData.payment.grandTotal}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Payment Method:</span>
                  <span>{receiptData.payment.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Cashier:</span>
                  <span>{receiptData.payment.cashierName}</span>
                </div>
              </div>

              {/* QR Code & Footer */}
              <div className="text-center pt-3 border-t border-slate-200 space-y-2">
                <div className="flex justify-center">
                  <QRCodeSVG value={`https://smartresto.com/verify/${receiptData.order.orderNumber}`} size={70} />
                </div>
                <p className="text-[10px] text-slate-500 font-sans">Thank you for dining with us!</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                onClick={triggerPrint}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all shadow-lg"
              >
                <Printer className="w-4 h-4" />
                <span>PRINT RECEIPT</span>
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition-all"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
