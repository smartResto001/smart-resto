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
        planName: true,
        isTrial: true,
        trialDays: true,
        trialExpiresAt: true,
        isPaid: true,
        monthlyFee: true,
        subscriptionMonths: true,
        discountAmount: true,
        totalPayable: true,
        subscriptionExpiresAt: true,
        lastPaidAt: true,
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
      planName: 'CHIEF_ADMIN',
      isTrial: false,
      trialDays: 0,
      trialExpiresAt: null,
      isPaid: true,
      monthlyFee: 0,
      subscriptionMonths: 0,
      discountAmount: 0,
      totalPayable: 0,
      subscriptionExpiresAt: null,
      lastPaidAt: null,
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
      planName: u.planName,
      isTrial: u.isTrial,
      trialDays: u.trialDays,
      trialExpiresAt: u.trialExpiresAt,
      isPaid: u.isPaid,
      monthlyFee: u.monthlyFee,
      subscriptionMonths: u.subscriptionMonths,
      discountAmount: u.discountAmount,
      totalPayable: u.totalPayable,
      subscriptionExpiresAt: u.subscriptionExpiresAt,
      lastPaidAt: u.lastPaidAt,
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

    let defaults = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
    if (!defaults) {
      defaults = await prisma.systemSettings.create({
        data: {
          id: 'default',
          defaultPlanName: 'Basic Plan',
          defaultMonthlyFee: 1000,
          defaultSubscriptionMonths: 1,
          defaultDiscountAmount: 0,
          defaultTrialDays: 2,
        },
      });
    }

    const trialExpiresAt = new Date(Date.now() + defaults.defaultTrialDays * 24 * 60 * 60 * 1000);
    const totalPayable = Math.max(0, defaults.defaultMonthlyFee * defaults.defaultSubscriptionMonths - defaults.defaultDiscountAmount);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: role as Role,
        isLocked: false,
        planName: defaults.defaultPlanName,
        isTrial: true,
        trialDays: defaults.defaultTrialDays,
        trialExpiresAt: trialExpiresAt,
        monthlyFee: defaults.defaultMonthlyFee,
        subscriptionMonths: defaults.defaultSubscriptionMonths,
        discountAmount: defaults.defaultDiscountAmount,
        totalPayable: totalPayable,
        isPaid: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isLocked: true,
        planName: true,
        isTrial: true,
        trialDays: true,
        trialExpiresAt: true,
        monthlyFee: true,
        subscriptionMonths: true,
        discountAmount: true,
        totalPayable: true,
        isPaid: true,
        subscriptionExpiresAt: true,
        createdAt: true,
      },
    });

    sendWelcomeEmail(newUser.email, newUser.name, newUser.role);

    return res.status(201).json({
      success: true,
      message: `Account for ${newUser.name} created successfully with a ${defaults.defaultTrialDays}-day trial!`,
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubscriptionSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { planName, monthlyFee, subscriptionMonths, discountAmount, isTrial, trialDays, trialExpiresAt, isPaid, isLocked, subscriptionExpiresAt } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Hotel user account not found' });
    }

    const fee = typeof monthlyFee === 'number' && monthlyFee >= 0 ? monthlyFee : user.monthlyFee;
    const months = typeof subscriptionMonths === 'number' && subscriptionMonths >= 1 ? Math.floor(subscriptionMonths) : user.subscriptionMonths;
    const discount = typeof discountAmount === 'number' && discountAmount >= 0 ? discountAmount : user.discountAmount;
    const payable = Math.max(0, fee * months - discount);

    let expiry: Date | null = user.subscriptionExpiresAt;
    if (subscriptionExpiresAt) {
      expiry = new Date(subscriptionExpiresAt);
    } else if (isPaid === true && !user.isPaid) {
      const now = new Date();
      expiry = new Date(now);
      expiry.setMonth(expiry.getMonth() + months);
    }

    let calculatedTrialExpiry: Date | null = user.trialExpiresAt;
    if (trialExpiresAt) {
      calculatedTrialExpiry = new Date(trialExpiresAt);
    } else if (typeof trialDays === 'number' && trialDays >= 0) {
      calculatedTrialExpiry = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        planName: planName ? String(planName).trim() : user.planName,
        monthlyFee: fee,
        subscriptionMonths: months,
        discountAmount: discount,
        totalPayable: payable,
        ...(typeof isTrial === 'boolean' ? { isTrial } : {}),
        ...(typeof trialDays === 'number' && trialDays >= 0 ? { trialDays: Math.floor(trialDays) } : {}),
        trialExpiresAt: calculatedTrialExpiry,
        ...(typeof isPaid === 'boolean' ? { isPaid, lastPaidAt: isPaid ? new Date() : user.lastPaidAt } : {}),
        ...(typeof isLocked === 'boolean' ? { isLocked } : {}),
        subscriptionExpiresAt: expiry,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isLocked: true,
        planName: true,
        isTrial: true,
        trialDays: true,
        trialExpiresAt: true,
        isPaid: true,
        monthlyFee: true,
        subscriptionMonths: true,
        discountAmount: true,
        totalPayable: true,
        subscriptionExpiresAt: true,
        lastPaidAt: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Subscription & Trial updated for ${updatedUser.name}: Plan "${updatedUser.planName}", ${updatedUser.isTrial ? `Trial (${updatedUser.trialDays}d)` : 'Paid Subscription'}, ₹${updatedUser.monthlyFee}/mo, Net Total: ₹${updatedUser.totalPayable}.`,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const getGlobalSubscriptionSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: 'default',
          defaultPlanName: 'Basic Plan',
          defaultMonthlyFee: 1000,
          defaultSubscriptionMonths: 1,
          defaultDiscountAmount: 0,
          defaultTrialDays: 2,
        },
      });
    }
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateGlobalSubscriptionSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { defaultPlanName, defaultMonthlyFee, defaultSubscriptionMonths, defaultDiscountAmount, defaultTrialDays } = req.body;

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: {
        ...(defaultPlanName ? { defaultPlanName: String(defaultPlanName).trim() } : {}),
        ...(typeof defaultMonthlyFee === 'number' && defaultMonthlyFee >= 0 ? { defaultMonthlyFee } : {}),
        ...(typeof defaultSubscriptionMonths === 'number' && defaultSubscriptionMonths >= 1 ? { defaultSubscriptionMonths: Math.floor(defaultSubscriptionMonths) } : {}),
        ...(typeof defaultDiscountAmount === 'number' && defaultDiscountAmount >= 0 ? { defaultDiscountAmount } : {}),
        ...(typeof defaultTrialDays === 'number' && defaultTrialDays >= 0 ? { defaultTrialDays: Math.floor(defaultTrialDays) } : {}),
      },
      create: {
        id: 'default',
        defaultPlanName: defaultPlanName ? String(defaultPlanName).trim() : 'Basic Plan',
        defaultMonthlyFee: typeof defaultMonthlyFee === 'number' && defaultMonthlyFee >= 0 ? defaultMonthlyFee : 1000,
        defaultSubscriptionMonths: typeof defaultSubscriptionMonths === 'number' && defaultSubscriptionMonths >= 1 ? Math.floor(defaultSubscriptionMonths) : 1,
        defaultDiscountAmount: typeof defaultDiscountAmount === 'number' && defaultDiscountAmount >= 0 ? defaultDiscountAmount : 0,
        defaultTrialDays: typeof defaultTrialDays === 'number' && defaultTrialDays >= 0 ? Math.floor(defaultTrialDays) : 2,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Global subscription & trial settings updated: Plan "${settings.defaultPlanName}", ${settings.defaultTrialDays}-Day Trial, ₹${settings.defaultMonthlyFee}/mo`,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

