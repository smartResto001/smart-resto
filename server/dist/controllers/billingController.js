"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentHistory = exports.getUnbilledOrders = exports.processPayment = void 0;
const prisma_1 = require("../config/prisma");
const types_1 = require("../types");
const socketHandler_1 = require("../socket/socketHandler");
const processPayment = async (req, res, next) => {
    try {
        const { orderId, paymentMethod, subtotal, tax, discount, grandTotal, paidAmount, transactionId } = req.body;
        const cashierId = req.user?.id;
        const cashierName = req.user?.name || 'Cashier';
        if (!orderId || !paymentMethod || grandTotal === undefined || paidAmount === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required payment details' });
        }
        const order = await prisma_1.prisma.order.findUnique({
            where: { id: orderId },
            include: { table: true },
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const balance = Math.max(0, paidAmount - grandTotal);
        // Create Payment Record
        const payment = await prisma_1.prisma.payment.create({
            data: {
                orderId,
                cashierId,
                cashierName,
                paymentMethod: paymentMethod,
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
        const updatedOrder = await prisma_1.prisma.order.update({
            where: { id: orderId },
            data: {
                status: types_1.OrderStatus.PAID,
                completedTime: new Date(),
            },
            include: {
                table: true,
                payment: true,
                items: { include: { foodItem: true } },
            },
        });
        // Update Table status to CLEANING or AVAILABLE
        await prisma_1.prisma.table.update({
            where: { id: order.tableId },
            data: { status: types_1.TableStatus.CLEANING },
        });
        // Broadcast Socket.IO events
        const io = (0, socketHandler_1.getSocketIO)();
        if (io) {
            io.emit('payment:completed', {
                order: updatedOrder,
                payment,
            });
            io.emit('order:status_changed', updatedOrder);
            io.emit('table:updated', { id: order.tableId, status: types_1.TableStatus.CLEANING });
        }
        return res.status(200).json({
            success: true,
            message: 'Payment processed and bill closed successfully',
            data: {
                payment,
                order: updatedOrder,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.processPayment = processPayment;
const getUnbilledOrders = async (req, res, next) => {
    try {
        const orders = await prisma_1.prisma.order.findMany({
            where: {
                status: {
                    in: [types_1.OrderStatus.READY, types_1.OrderStatus.SERVED, types_1.OrderStatus.PREPARING, types_1.OrderStatus.PENDING, types_1.OrderStatus.ACCEPTED],
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
    }
    catch (error) {
        next(error);
    }
};
exports.getUnbilledOrders = getUnbilledOrders;
const getPaymentHistory = async (req, res, next) => {
    try {
        const payments = await prisma_1.prisma.payment.findMany({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getPaymentHistory = getPaymentHistory;
