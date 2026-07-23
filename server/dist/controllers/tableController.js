"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTable = exports.createTable = exports.updateTableStatus = exports.getAllTables = void 0;
const prisma_1 = require("../config/prisma");
const types_1 = require("../types");
const socketHandler_1 = require("../socket/socketHandler");
const getAllTables = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const tables = await prisma_1.prisma.table.findMany({
            where: userId ? { userId } : {},
            orderBy: { tableNumber: 'asc' },
            include: {
                orders: {
                    where: {
                        status: {
                            notIn: ['COMPLETED', 'PAID', 'CANCELLED'],
                        },
                    },
                    select: {
                        id: true,
                        orderNumber: true,
                        customerName: true,
                        status: true,
                        totalAmount: true,
                        orderTime: true,
                    },
                },
            },
        });
        return res.status(200).json({ success: true, data: tables });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllTables = getAllTables;
const updateTableStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user?.id;
        if (!Object.values(types_1.TableStatus).includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid table status' });
        }
        const existingTable = await prisma_1.prisma.table.findUnique({ where: { id } });
        if (!existingTable) {
            return res.status(404).json({ success: false, message: 'Table not found' });
        }
        if (existingTable.userId && existingTable.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const table = await prisma_1.prisma.table.update({
            where: { id },
            data: { status },
        });
        // Notify via Socket.IO
        const io = (0, socketHandler_1.getSocketIO)();
        if (io) {
            const targetRoom = table.userId ? `account:${table.userId}` : null;
            if (targetRoom) {
                io.to(targetRoom).emit('table:updated', table);
            }
            else {
                io.emit('table:updated', table);
            }
        }
        return res.status(200).json({ success: true, data: table });
    }
    catch (error) {
        next(error);
    }
};
exports.updateTableStatus = updateTableStatus;
const createTable = async (req, res, next) => {
    try {
        const { tableNumber, capacity } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User authentication required' });
        }
        const existing = await prisma_1.prisma.table.findFirst({
            where: {
                userId,
                tableNumber: Number(tableNumber),
            },
        });
        if (existing) {
            return res.status(400).json({ success: false, message: `Table Number ${tableNumber} already exists for your account` });
        }
        const table = await prisma_1.prisma.table.create({
            data: {
                tableNumber: Number(tableNumber),
                capacity: Number(capacity) || 4,
                status: types_1.TableStatus.AVAILABLE,
                userId,
            },
        });
        const io = (0, socketHandler_1.getSocketIO)();
        if (io) {
            io.to(`account:${userId}`).emit('table:updated', table);
        }
        return res.status(201).json({ success: true, data: table });
    }
    catch (error) {
        next(error);
    }
};
exports.createTable = createTable;
const deleteTable = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const existingTable = await prisma_1.prisma.table.findUnique({ where: { id } });
        if (!existingTable) {
            return res.status(404).json({ success: false, message: 'Table not found' });
        }
        if (existingTable.userId && existingTable.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        // Clean up all associated orders, order items, and payments to avoid foreign key constraints
        const associatedOrders = await prisma_1.prisma.order.findMany({
            where: { tableId: id },
            select: { id: true },
        });
        if (associatedOrders.length > 0) {
            const orderIds = associatedOrders.map((o) => o.id);
            await prisma_1.prisma.payment.deleteMany({
                where: { orderId: { in: orderIds } },
            });
            await prisma_1.prisma.orderItem.deleteMany({
                where: { orderId: { in: orderIds } },
            });
            await prisma_1.prisma.order.deleteMany({
                where: { id: { in: orderIds } },
            });
        }
        await prisma_1.prisma.table.delete({ where: { id } });
        const io = (0, socketHandler_1.getSocketIO)();
        if (io) {
            const targetRoom = existingTable.userId ? `account:${existingTable.userId}` : null;
            if (targetRoom) {
                io.to(targetRoom).emit('table:deleted', { id });
            }
            else {
                io.emit('table:deleted', { id });
            }
        }
        return res.status(200).json({ success: true, message: 'Table deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTable = deleteTable;
