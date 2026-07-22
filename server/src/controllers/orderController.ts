import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { OrderStatus, TableStatus, Role } from '../types';
import { getSocketIO } from '../socket/socketHandler';

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableId, customerName, items, specialInstructions } = req.body;
    const waiterId = req.user?.id;

    if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required order fields' });
    }

    // Check table
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const userId = table.userId || req.user?.id;

    // Create brand new Order ticket in DB
    const count = await prisma.order.count({ where: userId ? { userId } : {} });
    const tokenNumber = (count % 999) + 1;
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${tokenNumber.toString().padStart(3, '0')}`;

    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const foodItem = await prisma.foodItem.findUnique({ where: { id: item.foodItemId } });
      if (!foodItem) continue;

      const itemTotal = foodItem.price * item.quantity;
      totalAmount += itemTotal;

      orderItemsData.push({
        foodItemId: item.foodItemId,
        quantity: item.quantity,
        unitPrice: foodItem.price,
        notes: item.notes || null,
      });
    }

    const taxAmount = totalAmount * 0.05; // 5% GST default
    const grandTotal = totalAmount + taxAmount;
    const finalCustomerName = (customerName && customerName.trim()) || `Guest Table ${table.tableNumber}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        tokenNumber,
        customerName: finalCustomerName,
        tableId,
        waiterId,
        userId,
        status: OrderStatus.PENDING,
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
        waiter: { select: { name: true, email: true } },
        items: {
          include: {
            foodItem: true,
          },
        },
      },
    });

    // Update Table status to OCCUPIED
    await prisma.table.update({
      where: { id: tableId },
      data: { status: TableStatus.OCCUPIED },
    });

    // Broadcast Real-time Socket.IO Notifications to Kitchen & Cashier!
    const io = getSocketIO();
    if (io) {
      const targetRoom = userId ? `account:${userId}` : null;
      const emitTo = targetRoom ? io.to(targetRoom) : io;

      emitTo.emit('order:created', order);
      emitTo.emit('notification:new', {
        title: 'New Order Received',
        message: `Order #${order.orderNumber} for Table ${table.tableNumber} (${order.customerName})`,
        roleTarget: Role.KITCHEN,
      });
    }

    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, tableId } = req.query;
    const userId = req.user?.id;

    const whereClause: any = {};
    if (userId) {
      whereClause.userId = userId;
    }
    if (status) {
      whereClause.status = status;
    }
    if (tableId) {
      whereClause.tableId = tableId;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        table: true,
        waiter: { select: { name: true } },
        items: {
          include: {
            foodItem: true,
          },
        },
        payment: true,
      },
      orderBy: { orderTime: 'desc' },
    });

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: true,
        waiter: { select: { name: true, email: true } },
        items: {
          include: {
            foodItem: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.userId && userId && order.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this order' });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    if (!Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const existingOrder = await prisma.order.findUnique({ where: { id } });
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (existingOrder.userId && userId && existingOrder.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const updateData: any = { status };

    if (status === OrderStatus.READY) {
      updateData.readyTime = new Date();
    } else if (status === OrderStatus.SERVED) {
      updateData.servedTime = new Date();
    } else if (status === OrderStatus.COMPLETED) {
      updateData.completedTime = new Date();
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        table: true,
        waiter: { select: { name: true } },
        items: { include: { foodItem: true } },
      },
    });

    // Real-time socket broadcast
    const io = getSocketIO();
    if (io) {
      const targetRoom = order.userId ? `account:${order.userId}` : null;
      const emitTo = targetRoom ? io.to(targetRoom) : io;

      emitTo.emit('order:status_changed', order);

      // Targeted alerts
      if (status === OrderStatus.READY) {
        emitTo.emit('kitchen:food_ready', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          tableNumber: order.table.tableNumber,
          customerName: order.customerName,
        });
      }
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const existingOrder = await prisma.order.findUnique({ where: { id } });
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (existingOrder.userId && userId && existingOrder.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: { table: true },
    });

    // Reset table status if no other active order on table
    const activeOrders = await prisma.order.count({
      where: {
        tableId: order.tableId,
        status: { notIn: ['COMPLETED', 'PAID', 'CANCELLED'] },
      },
    });

    if (activeOrders === 0) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: TableStatus.AVAILABLE },
      });
    }

    const io = getSocketIO();
    if (io) {
      const targetRoom = order.userId ? `account:${order.userId}` : null;
      const emitTo = targetRoom ? io.to(targetRoom) : io;
      emitTo.emit('order:status_changed', order);
    }

    return res.status(200).json({ success: true, message: 'Order cancelled successfully', data: order });
  } catch (error) {
    next(error);
  }
};
