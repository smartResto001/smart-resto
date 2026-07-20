import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { OrderStatus, TableStatus, PaymentMethod } from '../types';
import { getSocketIO } from '../socket/socketHandler';

export const processPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, paymentMethod, subtotal, tax, discount, grandTotal, paidAmount, transactionId } = req.body;
    const cashierId = req.user?.id;
    const cashierName = req.user?.name || 'Cashier';

    if (!orderId || !paymentMethod || grandTotal === undefined || paidAmount === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required payment details' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const balance = Math.max(0, paidAmount - grandTotal);

    // Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        orderId,
        cashierId,
        cashierName,
        paymentMethod: paymentMethod as PaymentMethod,
        subtotal: Number(subtotal),
        tax: Number(tax),
        discount: Number(discount) || 0,
        grandTotal: Number(grandTotal),
        paidAmount: Number(paidAmount),
        balance,
        transactionId: transactionId || `TXN-${Date.now().toString().slice(-8)}`,
      },
    });

    // Mark Order as PAID & COMPLETED
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        completedTime: new Date(),
      },
      include: {
        table: true,
        payment: true,
        items: { include: { foodItem: true } },
      },
    });

    // Update Table status to CLEANING or AVAILABLE
    await prisma.table.update({
      where: { id: order.tableId },
      data: { status: TableStatus.CLEANING },
    });

    // Broadcast Socket.IO events
    const io = getSocketIO();
    if (io) {
      io.emit('payment:completed', {
        order: updatedOrder,
        payment,
      });
      io.emit('order:status_changed', updatedOrder);
      io.emit('table:updated', { id: order.tableId, status: TableStatus.CLEANING });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment processed and bill closed successfully',
      data: {
        payment,
        order: updatedOrder,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUnbilledOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.READY, OrderStatus.SERVED, OrderStatus.PREPARING, OrderStatus.PENDING, OrderStatus.ACCEPTED],
        },
      },
      include: {
        table: true,
        waiter: { select: { name: true } },
        items: {
          include: { foodItem: true },
        },
      },
      orderBy: { orderTime: 'asc' },
    });

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        order: {
          include: {
            table: true,
            items: { include: { foodItem: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.status(200).json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};
