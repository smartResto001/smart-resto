import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { OrderStatus, TableStatus, Role } from '../types';
import { getSocketIO } from '../socket/socketHandler';
import { randomUUID } from 'crypto';

/**
 * Validates table and qrToken matching. Ensures secure access to table menu & ordering.
 */
const validateTableToken = async (tableNumberStr: string, qrToken: string) => {
  const tableNumber = parseInt(tableNumberStr, 10);
  const includeUser = {
    user: {
      select: {
        id: true,
        hotelName: true,
        hotelAddress: true,
        hotelPhone: true,
        hotelGst: true,
        upiId: true,
        upiName: true,
      },
    },
  };

  // 1. Primary lookup: Match exact qrToken OR table ID
  let table = await prisma.table.findFirst({
    where: {
      OR: [
        { qrToken: qrToken },
        { id: qrToken },
      ],
    },
    include: includeUser,
  });

  // 2. Secondary lookup: If not found by token, lookup by tableNumber
  if (!table && !isNaN(tableNumber)) {
    table = await prisma.table.findFirst({
      where: { tableNumber },
      include: includeUser,
    });

    if (table) {
      // Auto-assign or sync qrToken on table
      table = await prisma.table.update({
        where: { id: table.id },
        data: { qrToken: qrToken && qrToken.trim() !== '' ? qrToken : randomUUID() },
        include: includeUser,
      });
    }
  }

  return table;
};

// GET /api/public/qr/:tableNumber/:qrToken/info
export const getPublicTableInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableNumber, qrToken } = req.params;
    const table = await validateTableToken(tableNumber, qrToken);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Invalid QR Code or Table session token. Please re-scan the QR code at your table.',
      });
    }

    // Get active unpaid orders for this table if any
    const activeOrders = await prisma.order.findMany({
      where: {
        tableId: table.id,
        status: { notIn: ['COMPLETED', 'PAID', 'CANCELLED'] },
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        sessionId: true,
        status: true,
        orderTime: true,
      },
    });

    const activeSessionId = activeOrders.find((o) => o.sessionId)?.sessionId || null;

    return res.status(200).json({
      success: true,
      data: {
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          status: table.status,
          qrToken: table.qrToken,
          userId: table.userId,
        },
        restaurant: table.user || {
          hotelName: 'SmartResto',
          hotelAddress: 'Main Dining Hall',
          hotelPhone: '',
        },
        activeOrdersCount: activeOrders.length,
        activeSessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/public/qr/:tableNumber/:qrToken/menu
export const getPublicMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableNumber, qrToken } = req.params;
    const table = await validateTableToken(tableNumber, qrToken);

    if (!table) {
      return res.status(403).json({
        success: false,
        message: 'Invalid QR token or Table access denied.',
      });
    }

    const categories = await prisma.category.findMany({
      where: table.userId ? { userId: table.userId } : {},
      include: {
        foodItems: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/public/qr/:tableNumber/:qrToken/order
export const createPublicQrOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableNumber, qrToken } = req.params;
    const { customerName, phone, numberOfPersons, specialInstructions, items, sessionId } = req.body;

    const table = await validateTableToken(tableNumber, qrToken);
    if (!table) {
      return res.status(403).json({
        success: false,
        message: 'Invalid QR session token.',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one item to place an order.',
      });
    }

    const userId = table.userId || undefined;

    // Maintain or create session ID for table
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      // Check existing active orders on table
      const existingActiveOrder = await prisma.order.findFirst({
        where: {
          tableId: table.id,
          status: { notIn: ['COMPLETED', 'PAID', 'CANCELLED'] },
          sessionId: { not: null },
        },
      });
      activeSessionId = existingActiveOrder?.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    const count = await prisma.order.count({ where: userId ? { userId } : {} });
    const tokenNumber = (count % 999) + 1;
    const orderNumber = `QR-${Date.now().toString().slice(-6)}-${tokenNumber.toString().padStart(3, '0')}`;

    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const foodItem = await prisma.foodItem.findUnique({ where: { id: item.foodItemId } });
      if (!foodItem || !foodItem.availability) continue;

      const itemTotal = foodItem.price * item.quantity;
      totalAmount += itemTotal;

      orderItemsData.push({
        foodItemId: item.foodItemId,
        quantity: item.quantity,
        unitPrice: foodItem.price,
        notes: item.notes || null,
      });
    }

    if (orderItemsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected items are currently unavailable.',
      });
    }

    const taxAmount = totalAmount * 0.05; // 5% GST
    const grandTotal = totalAmount + taxAmount;
    const finalCustomerName = (customerName && customerName.trim()) || `Guest Table ${table.tableNumber}`;

    let customerId: string | undefined;
    if (phone && phone.trim()) {
      const existingCustomer = await prisma.customer.findFirst({ where: { phone: phone.trim() } });
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCust = await prisma.customer.create({
          data: { name: finalCustomerName, phone: phone.trim() },
        });
        customerId = newCust.id;
      }
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        tokenNumber,
        customerName: finalCustomerName,
        customerId,
        tableId: table.id,
        userId,
        status: OrderStatus.PENDING,
        orderSource: 'QR',
        customerType: 'QR_CUSTOMER',
        numberOfPersons: numberOfPersons ? Number(numberOfPersons) : null,
        sessionId: activeSessionId,
        totalAmount,
        taxAmount,
        grandTotal,
        specialInstructions,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        table: true,
        items: {
          include: {
            foodItem: true,
          },
        },
      },
    });

    // Automatically set Table status to OCCUPIED
    const updatedTable = await prisma.table.update({
      where: { id: table.id },
      data: { status: TableStatus.OCCUPIED },
    });

    // Real-time Socket.IO Broadcast to Kitchen, Waiter & Billing
    const io = getSocketIO();
    if (io) {
      const targetRoom = userId ? `account:${userId}` : null;
      const emitTo = targetRoom ? io.to(targetRoom) : io;

      emitTo.emit('order:created', order);
      emitTo.emit('table:updated', updatedTable);
      emitTo.emit('notification:new', {
        title: '📱 New QR Order Received!',
        message: `Table ${table.tableNumber} - ${order.customerName} placed order #${order.orderNumber}`,
        roleTarget: Role.KITCHEN,
      });

      // Target alert to Waiters specifically
      emitTo.emit('waiter:qr_order', {
        orderId: order.id,
        tableNumber: table.tableNumber,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        itemsCount: order.items.length,
      });

      // Emit to specific table room for customer live updates
      io.to(`table:${table.id}`).emit('customer:order_updated', order);
    }

    return res.status(201).json({
      success: true,
      data: {
        order,
        sessionId: activeSessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/public/qr/:tableNumber/:qrToken/orders/:sessionId
export const getPublicActiveOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableNumber, qrToken, sessionId } = req.params;
    const table = await validateTableToken(tableNumber, qrToken);

    if (!table) {
      return res.status(403).json({
        success: false,
        message: 'Invalid table or QR token.',
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        tableId: table.id,
        OR: [
          { sessionId: sessionId },
          { status: { notIn: ['COMPLETED', 'PAID', 'CANCELLED'] } },
        ],
      },
      include: {
        items: {
          include: {
            foodItem: true,
          },
        },
        table: true,
      },
      orderBy: { orderTime: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/public/qr/:tableNumber/:qrToken/call-waiter
export const callWaiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableNumber, qrToken } = req.params;
    const { requestType, notes, customerName } = req.body;

    const table = await validateTableToken(tableNumber, qrToken);
    if (!table) {
      return res.status(403).json({ success: false, message: 'Invalid table token.' });
    }

    const io = getSocketIO();
    const typeLabel = requestType || 'Waiter Assistance';

    if (io) {
      const targetRoom = table.userId ? `account:${table.userId}` : null;
      const emitTo = targetRoom ? io.to(targetRoom) : io;

      const payload = {
        tableId: table.id,
        tableNumber: table.tableNumber,
        customerName: customerName || `Table ${table.tableNumber} Guest`,
        requestType: typeLabel,
        notes: notes || '',
        timestamp: new Date().toISOString(),
      };

      emitTo.emit('waiter:call', payload);
      emitTo.emit('notification:new', {
        title: `🛎️ Table ${table.tableNumber} Needs ${typeLabel}`,
        message: `${customerName || 'Customer'} at Table ${table.tableNumber} requested ${typeLabel}${notes ? `: ${notes}` : ''}`,
        roleTarget: Role.WAITER,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Waiter notified for ${typeLabel}. A staff member will attend to your table shortly!`,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/public/qr/:tableNumber/:qrToken/feedback
export const submitFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableNumber, qrToken } = req.params;
    const { orderId, ratingFood, ratingService, comments, customerName } = req.body;

    const table = await validateTableToken(tableNumber, qrToken);
    if (!table) {
      return res.status(403).json({ success: false, message: 'Invalid table token.' });
    }

    const feedback = await prisma.feedback.create({
      data: {
        tableId: table.id,
        orderId: orderId || null,
        ratingFood: ratingFood ? Math.min(5, Math.max(1, Number(ratingFood))) : 5,
        ratingService: ratingService ? Math.min(5, Math.max(1, Number(ratingService))) : 5,
        comments: comments || null,
        customerName: customerName || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/public/qr/:tableNumber/:qrToken/pay
export const processPublicQrPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableNumber, qrToken } = req.params;
    const { paymentMethod, transactionId, customerName, sessionId } = req.body;

    const table = await validateTableToken(tableNumber, qrToken);
    if (!table) {
      return res.status(403).json({ success: false, message: 'Invalid table token.' });
    }

    const userId = table.userId || undefined;

    // Fetch active unpaid orders for this table
    const activeOrders = await prisma.order.findMany({
      where: {
        tableId: table.id,
        status: { notIn: ['COMPLETED', 'PAID', 'CANCELLED'] },
        ...(sessionId ? { OR: [{ sessionId }, { sessionId: null }] } : {}),
      },
      include: {
        items: { include: { foodItem: true } },
      },
    });

    if (activeOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active unpaid bill found for this table.',
      });
    }

    // Calculate aggregated bill totals
    let subtotal = 0;
    const allItemsMap = new Map<string, any>();

    for (const order of activeOrders) {
      for (const item of order.items) {
        const itemKey = item.foodItemId;
        const existing = allItemsMap.get(itemKey);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          allItemsMap.set(itemKey, { ...item });
        }
        subtotal += item.unitPrice * item.quantity;
      }
    }

    const taxAmount = subtotal * 0.05;
    const grandTotal = subtotal + taxAmount;
    const primaryOrder = activeOrders[0];
    const txnRef = transactionId || `UPI-${Date.now().toString().slice(-8)}`;
    const finalMethod = paymentMethod || 'UPI';

    // Mark ALL table session orders as PAID & COMPLETED
    await prisma.order.updateMany({
      where: {
        id: { in: activeOrders.map((o) => o.id) },
      },
      data: {
        status: OrderStatus.PAID,
        completedTime: new Date(),
      },
    });

    // Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        orderId: primaryOrder.id,
        cashierName: customerName ? `${customerName} (Online)` : 'Customer Self-Pay',
        userId,
        paymentMethod: finalMethod,
        subtotal,
        tax: taxAmount,
        discount: 0,
        grandTotal,
        paidAmount: grandTotal,
        balance: 0,
        transactionId: txnRef,
      },
    });

    // Update Table status to AVAILABLE
    const updatedTable = await prisma.table.update({
      where: { id: table.id },
      data: { status: TableStatus.AVAILABLE },
    });

    const consolidatedReceiptOrder = {
      ...primaryOrder,
      orderNumber: activeOrders.map((o) => o.orderNumber).join(', '),
      status: OrderStatus.PAID,
      items: Array.from(allItemsMap.values()),
    };

    // Socket.IO notifications to Billing, Waiter, Kitchen & Customer
    const io = getSocketIO();
    if (io) {
      const targetRoom = userId ? `account:${userId}` : null;
      const emitTo = targetRoom ? io.to(targetRoom) : io;

      emitTo.emit('payment:completed', {
        order: consolidatedReceiptOrder,
        payment,
      });

      emitTo.emit('table:updated', updatedTable);
      emitTo.emit('notification:new', {
        title: `💳 Table ${table.tableNumber} Bill Paid Online!`,
        message: `${customerName || 'Customer'} paid ₹${grandTotal.toFixed(2)} via ${finalMethod} (Txn #${txnRef})`,
        roleTarget: Role.CASHIER,
      });

      for (const ord of activeOrders) {
        const updatedOrd = { ...ord, status: OrderStatus.PAID };
        emitTo.emit('order:status_changed', updatedOrd);
        io.to(`table:${table.id}`).emit('order:status_changed', updatedOrd);
        io.to(`table:${table.id}`).emit('customer:order_updated', updatedOrd);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment completed successfully! Thank you for dining with us.',
      data: {
        payment,
        order: consolidatedReceiptOrder,
      },
    });
  } catch (error) {
    next(error);
  }
};
