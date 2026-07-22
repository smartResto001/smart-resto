import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { Role } from '../types';
import { isGmailAccount, sendWelcomeEmail } from '../services/emailService';

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!isGmailAccount(email)) {
      return res.status(400).json({
        success: false,
        message: "This mail doesn't exist as a valid Gmail account (@gmail.com). Only existing Google Mail accounts can be used to create an account.",
      });
    }

    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: role as Role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Send welcome email notification asynchronously
    sendWelcomeEmail(user.email, user.name, user.role);

    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (id === req.user?.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    await prisma.user.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
