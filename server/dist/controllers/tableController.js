"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTable = exports.createTable = exports.updateTableStatus = exports.getAllTables = void 0;
const prisma_1 = require("../config/prisma");
const types_1 = require("../types");
const socketHandler_1 = require("../socket/socketHandler");
const getAllTables = async (req, res, next) => {
    try {
        const tables = await prisma_1.prisma.table.findMany({
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
        if (!Object.values(types_1.TableStatus).includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid table status' });
        }
        const table = await prisma_1.prisma.table.update({
            where: { id },
            data: { status },
        });
        // Notify via Socket.IO
        const io = (0, socketHandler_1.getSocketIO)();
        if (io) {
            io.emit('table:updated', table);
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
        const existing = await prisma_1.prisma.table.findUnique({
            where: { tableNumber: Number(tableNumber) },
        });
        if (existing) {
            return res.status(400).json({ success: false, message: `Table Number ${tableNumber} already exists` });
        }
        const table = await prisma_1.prisma.table.create({
            data: {
                tableNumber: Number(tableNumber),
                capacity: Number(capacity) || 4,
                status: types_1.TableStatus.AVAILABLE,
            },
        });
        const io = (0, socketHandler_1.getSocketIO)();
        if (io) {
            io.emit('table:updated', table);
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
        await prisma_1.prisma.table.delete({ where: { id } });
        const io = (0, socketHandler_1.getSocketIO)();
        if (io) {
            io.emit('table:deleted', { id });
        }
        return res.status(200).json({ success: true, message: 'Table deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTable = deleteTable;
