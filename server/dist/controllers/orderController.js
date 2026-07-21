"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrder = exports.updateOrderStatus = exports.getOrderById = exports.getAllOrders = exports.createOrder = void 0;
const prisma_1 = require("../config/prisma");
const types_1 = require("../types");
const socketHandler_1 = require("../socket/socketHandler");
const createOrder = async (req, res, next) => {
    try {
        const { tableId, customerName, items, specialInstructions } = req.body;
        const waiterId = req.user?.id;
        if (!tableId || !customerName || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Missing required order fields' });
        }
        // Check table
        const table = await prisma_1.prisma.table.findUnique({ where: { id: tableId } });
        if (!table) {
            return res.status(404).json({ success: false, message: 'Table not found' });
        }
        // Generate Unique Order ID & Token Number
        const count = await prisma_1.prisma.order.count();
        const tokenNumber = (count % 999) + 1;
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${tokenNumber.toString().padStart(3, '0')}`;
        // Calculate total
        let totalAmount = 0;
        const orderItemsData = [];
        for (const item of items) {
            const foodItem = await prisma_1.prisma.foodItem.findUnique({ where: { id: item.foodItemId } });
            if (!foodItem)
                continue;
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
        // Create Order in DB
        const order = await prisma_1.prisma.order.create({
            data: {
                orderNumber,
                tokenNumber,
                customerName,
                tableId,
                waiterId,
                status: types_1.OrderStatus.PENDING,
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
        await prisma_1.prisma.table.update({
            where: { id: tableId },
            data: { status: types_1.TableStatus.OCCUPIED },
        });
        // Broadcast Real-time Socket.IO Notifications to Kitchen & Cashier!
        const io = (0, socketHandler_1.getSocketIO)();
        if (io) {
            io.emit('order:created', order);
            io.emit('notification:new', {
                title: 'New Order Received',
                message: `Order #${order.orderNumber} for Table ${table.tableNumber} (${order.customerName})`,
                roleTarget: types_1.Role.KITCHEN,
            });
        }
        return res.status(201).json({ success: true, data: order });
    }
    catch (error) {
        next(error);
    }
};
exports.createOrder = createOrder;
const getAllOrders = async (req, res, next) => {
    try {
        const { status, tableId } = req.query;
        const whereClause = {};
        if (status) {
            whereClause.status = status;
        }
        if (tableId) {
            whereClause.tableId = tableId;
        }
        const orders = await prisma_1.prisma.order.findMany({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getAllOrders = getAllOrders;
const getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await prisma_1.prisma.order.findUnique({
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
        return res.status(200).json({ success: true, data: order });
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderById = getOrderById;
const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!Object.values(types_1.OrderStatus).includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid order status' });
        }
        const updateData = { status };
        if (status === types_1.OrderStatus.READY) {
            updateData.readyTime = new Date();
        }
        else if (status === types_1.OrderStatus.SERVED) {
            updateData.servedTime = new Date();
        }
        else if (status === types_1.OrderStatus.COMPLETED) {
            updateData.completedTime = new Date();
        }
        const order = await prisma_1.prisma.order.update({
            where: { id },
            data: updateData,
            include: {
                table: true,
                waiter: { select: { name: true } },
                items: { include: { foodItem: true } },
            },
        });
        // Real-time socket broadcast
        const io = (0, socketHandler_1.getSocketIO)();
        if (io) {
            io.emit('order:status_changed', order);
            // Targeted alerts
            if (status === types_1.OrderStatus.READY) {
                io.emit('kitchen:food_ready', {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    tableNumber: order.table.tableNumber,
                    customerName: order.customerName,
                });
            }
        }
        return res.status(200).json({ success: true, data: order });
    }
    catch (error) {
        next(error);
    }
};
exports.updateOrderStatus = updateOrderStatus;
const cancelOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await prisma_1.prisma.order.update({
            where: { id },
            data: { status: types_1.OrderStatus.CANCELLED },
            include: { table: true },
        });
        // Reset table status if no other active order on table
        const activeOrders = await prisma_1.prisma.order.count({
            where: {
                tableId: order.tableId,
                status: { notIn: ['COMPLETED', 'PAID', 'CANCELLED'] },
            },
        });
        if (activeOrders === 0) {
            await prisma_1.prisma.table.update({
                where: { id: order.tableId },
                data: { status: types_1.TableStatus.AVAILABLE },
            });
        }
        const io = (0, socketHandler_1.getSocketIO)();
        if (io) {
            io.emit('order:status_changed', order);
        }
        return res.status(200).json({ success: true, message: 'Order cancelled successfully', data: order });
    }
    catch (error) {
        next(error);
    }
};
exports.cancelOrder = cancelOrder;
