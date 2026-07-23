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
        const primaryOrder = await prisma_1.prisma.order.findUnique({
            where: { id: orderId },
            include: { table: true },
        });
        if (!primaryOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const userId = primaryOrder.userId || cashierId;
        const balance = Math.max(0, paidAmount - grandTotal);
        // Find ALL active unbilled orders for this table to close them together in ONE consolidated bill
        const activeTableOrders = await prisma_1.prisma.order.findMany({
            where: {
                tableId: primaryOrder.tableId,
                status: { notIn: ['COMPLETED', 'PAID', 'CANCELLED'] },
            },
            include: {
                items: { include: { foodItem: true } },
            },
        });
        // Mark ALL active orders for this table as PAID & COMPLETED
        await prisma_1.prisma.order.updateMany({
            where: {
                id: { in: activeTableOrders.map((o) => o.id) },
            },
            data: {
                status: types_1.OrderStatus.PAID,
                completedTime: new Date(),
            },
        });
        // Create single Payment Record tied to primary order
        const payment = await prisma_1.prisma.payment.create({
            data: {
                orderId: primaryOrder.id,
                cashierId,
                cashierName,
                userId,
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
        // Update Table status to AVAILABLE after billing full table
        await prisma_1.prisma.table.update({
            where: { id: primaryOrder.tableId },
            data: { status: types_1.TableStatus.AVAILABLE },
        });
        // Combine all items across all active orders for printable tax invoice
        const allItemsMap = new Map();
        for (const ord of activeTableOrders) {
            for (const item of ord.items) {
                const itemKey = item.foodItemId;
                const existingItem = allItemsMap.get(itemKey);
                if (existingItem) {
                    existingItem.quantity += item.quantity;
                }
                else {
                    allItemsMap.set(itemKey, { ...item });
                }
            }
        }
        const consolidatedReceiptOrder = {
            ...primaryOrder,
            orderNumber: activeTableOrders.map((o) => o.orderNumber).join(', '),
            status: types_1.OrderStatus.PAID,
            items: Array.from(allItemsMap.values()),
        };
        // Broadcast Socket.IO events
        const io = (0, socketHandler_1.getSocketIO)();
        if (io) {
            const targetRoom = userId ? `account:${userId}` : null;
            const emitTo = targetRoom ? io.to(targetRoom) : io;
            emitTo.emit('payment:completed', {
                order: consolidatedReceiptOrder,
                payment,
            });
            for (const ord of activeTableOrders) {
                emitTo.emit('order:status_changed', { ...ord, status: types_1.OrderStatus.PAID });
            }
            emitTo.emit('table:updated', { id: primaryOrder.tableId, status: types_1.TableStatus.AVAILABLE });
        }
        return res.status(200).json({
            success: true,
            message: 'Payment processed and full table bill closed successfully',
            data: {
                payment,
                order: consolidatedReceiptOrder,
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
        const userId = req.user?.id;
        const rawOrders = await prisma_1.prisma.order.findMany({
            where: {
                ...(userId ? { userId } : {}),
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
        // Group active unbilled orders by tableId to form ONE consolidated bill per table
        const tableMap = new Map();
        for (const order of rawOrders) {
            const existing = tableMap.get(order.tableId) || [];
            existing.push(order);
            tableMap.set(order.tableId, existing);
        }
        const consolidatedOrders = Array.from(tableMap.values()).map((orders) => {
            const primaryOrder = orders[0];
            const allItemsMap = new Map();
            let subtotal = 0;
            for (const order of orders) {
                for (const item of order.items) {
                    const itemKey = item.foodItemId;
                    const existingItem = allItemsMap.get(itemKey);
                    if (existingItem) {
                        existingItem.quantity += item.quantity;
                    }
                    else {
                        allItemsMap.set(itemKey, { ...item });
                    }
                    subtotal += item.unitPrice * item.quantity;
                }
            }
            const taxAmount = subtotal * 0.05;
            const grandTotal = subtotal + taxAmount;
            const combinedItems = Array.from(allItemsMap.values());
            const orderNumbers = orders.map((o) => o.orderNumber).join(', ');
            return {
                ...primaryOrder,
                orderNumber: orderNumbers,
                totalAmount: subtotal,
                taxAmount,
                grandTotal,
                items: combinedItems,
            };
        });
        return res.status(200).json({ success: true, data: consolidatedOrders });
    }
    catch (error) {
        next(error);
    }
};
exports.getUnbilledOrders = getUnbilledOrders;
const getPaymentHistory = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const payments = await prisma_1.prisma.payment.findMany({
            where: userId ? { userId } : {},
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
