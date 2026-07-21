import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { TableStatus } from '../types';
import { getSocketIO } from '../socket/socketHandler';

export const getAllTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    const tables = await prisma.table.findMany({
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
  } catch (error) {
    next(error);
  }
};

export const updateTableStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(TableStatus).includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid table status' });
    }

    const table = await prisma.table.update({
      where: { id },
      data: { status },
    });

    // Notify via Socket.IO
    const io = getSocketIO();
    if (io) {
      io.emit('table:updated', table);
    }

    return res.status(200).json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

export const createTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableNumber, capacity } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }

    const existing = await prisma.table.findFirst({
      where: {
        userId,
        tableNumber: Number(tableNumber),
      },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Table Number ${tableNumber} already exists for your account` });
    }

    const table = await prisma.table.create({
      data: {
        tableNumber: Number(tableNumber),
        capacity: Number(capacity) || 4,
        status: TableStatus.AVAILABLE,
        userId,
      },
    });

    const io = getSocketIO();
    if (io) {
      io.emit('table:updated', table);
    }

    return res.status(201).json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

export const deleteTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.table.delete({ where: { id } });

    const io = getSocketIO();
    if (io) {
      io.emit('table:deleted', { id });
    }

    return res.status(200).json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    next(error);
  }
};
