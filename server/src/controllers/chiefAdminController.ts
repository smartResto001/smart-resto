import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { Role } from '../types';
import { isGmailAccount, sendWelcomeEmail } from '../services/emailService';

export const getAllHotelAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chiefAdmins = await prisma.chiefAdmin.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isLocked: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isLocked: true,
        createdAt: true,
        _count: {
          select: {
            tables: true,
            userOrders: true,
            foodItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedChiefAdmins = chiefAdmins.map((ca) => ({
      id: ca.id,
      name: ca.name,
      email: ca.email,
      role: 'CHIEF_ADMIN',
      isLocked: ca.isLocked,
      createdAt: ca.createdAt,
      tableCount: 0,
      orderCount: 0,
      foodItemCount: 0,
    }));

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isLocked: u.isLocked,
      createdAt: u.createdAt,
      tableCount: u._count.tables,
      orderCount: u._count.userOrders,
      foodItemCount: u._count.foodItems,
    }));

    return res.status(200).json({
      success: true,
      data: formattedUsers,
      chiefAdmins: formattedChiefAdmins,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleAccountLock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { lock } = req.body; // boolean

    if (id === req.user?.id) {
      return res.status(400).json({ success: false, message: 'You cannot lock your own Chief Admin account' });
    }

    // Check ChiefAdmin table first
    const targetChiefAdmin = await prisma.chiefAdmin.findUnique({ where: { id } });
    if (targetChiefAdmin) {
      const updated = await prisma.chiefAdmin.update({
        where: { id },
        data: { isLocked: lock ?? !targetChiefAdmin.isLocked },
        select: {
          id: true,
          name: true,
          email: true,
          isLocked: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: updated.isLocked
          ? `Chief Admin account for ${updated.name} locked successfully`
          : `Chief Admin account for ${updated.name} unlocked successfully`,
        data: { ...updated, role: 'CHIEF_ADMIN' },
      });
    }

    // Check User table
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isLocked: lock ?? !targetUser.isLocked },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isLocked: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: updatedUser.isLocked
        ? `Account for ${updatedUser.name} locked successfully`
        : `Account for ${updatedUser.name} unlocked successfully`,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHotelAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (id === req.user?.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own Chief Admin account' });
    }

    // Check ChiefAdmin table first
    const targetChiefAdmin = await prisma.chiefAdmin.findUnique({ where: { id } });
    if (targetChiefAdmin) {
      await prisma.chiefAdmin.delete({ where: { id } });
      return res.status(200).json({
        success: true,
        message: `Chief Admin account for ${targetChiefAdmin.name} deleted successfully`,
      });
    }

    // Check User table
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // 1. Delete payments linked to user's orders or processed by user
    await prisma.payment.deleteMany({
      where: {
        OR: [{ userId: id }, { cashierId: id }],
      },
    });

    // 2. Delete order items for user's orders
    const userOrders = await prisma.order.findMany({
      where: { OR: [{ userId: id }, { waiterId: id }] },
      select: { id: true },
    });
    if (userOrders.length > 0) {
      const orderIds = userOrders.map((o) => o.id);
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    // 3. Delete user's food items and categories
    await prisma.foodItem.deleteMany({ where: { userId: id } });
    await prisma.category.deleteMany({ where: { userId: id } });

    // 4. Delete user's tables
    await prisma.table.deleteMany({ where: { userId: id } });

    // 5. Delete the User account
    await prisma.user.delete({ where: { id } });

    return res.status(200).json({ success: true, message: `Account for ${targetUser.name} deleted successfully` });
  } catch (error) {
    next(error);
  }
};

export const createHotelAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
    }

    if (!isGmailAccount(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email must be a valid Gmail account (@gmail.com).',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    const existingChiefAdmin = await prisma.chiefAdmin.findUnique({ where: { email: cleanEmail } });

    if (existingUser || existingChiefAdmin) {
      return res.status(400).json({ success: false, message: 'Account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (role === 'CHIEF_ADMIN') {
      const newChiefAdmin = await prisma.chiefAdmin.create({
        data: {
          name,
          email: cleanEmail,
          password: hashedPassword,
          isLocked: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          isLocked: true,
          createdAt: true,
        },
      });

      sendWelcomeEmail(newChiefAdmin.email, newChiefAdmin.name, 'CHIEF_ADMIN');

      return res.status(201).json({
        success: true,
        message: `Chief Admin account for ${newChiefAdmin.name} created successfully in ChiefAdmin table`,
        data: { ...newChiefAdmin, role: 'CHIEF_ADMIN' },
      });
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: role as Role,
        isLocked: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isLocked: true,
        createdAt: true,
      },
    });

    sendWelcomeEmail(newUser.email, newUser.name, newUser.role);

    return res.status(201).json({
      success: true,
      message: `Account for ${newUser.name} created successfully`,
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};
