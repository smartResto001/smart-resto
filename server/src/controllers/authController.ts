import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { isGmailAccount, sendWelcomeEmail } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'smart_resto_super_secret_jwt_key_2026';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasAdminPassword: !!user.adminPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminPassword: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasAdminPassword: !!user.adminPassword,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    if (!isGmailAccount(email)) {
      return res.status(400).json({
        success: false,
        message: "This mail doesn't exist as a valid Gmail account (@gmail.com). Only existing Google Mail accounts can be used to create an account.",
      });
    }

    const validRoles = ['ADMIN', 'WAITER', 'KITCHEN', 'CASHIER'];
    const userRole = role && validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : 'WAITER';

    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: userRole,
      },
    });

    // Send welcome email notification asynchronously
    sendWelcomeEmail(user.email, user.name, user.role);

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasAdminPassword: !!user.adminPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const setAdminPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { adminPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    let hashedAdminPassword: string | null = null;
    if (adminPassword && adminPassword.trim() !== '') {
      hashedAdminPassword = await bcrypt.hash(adminPassword.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { adminPassword: hashedAdminPassword },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminPassword: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: hashedAdminPassword ? 'Admin Dashboard password set successfully' : 'Admin Dashboard password removed',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        hasAdminPassword: !!updatedUser.adminPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyAdminPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { password } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let isMatch = false;

    // 1. Check custom Admin passcode if set
    if (user.adminPassword) {
      isMatch = await bcrypt.compare(password, user.adminPassword);
    }

    // 2. Fallback to main Account Login password
    if (!isMatch && user.password) {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password. Enter your Admin passcode or Account login password.',
      });
    }

    return res.status(200).json({ success: true, message: 'Admin password verified' });
  } catch (error) {
    next(error);
  }
};

export const resetAdminPasswordWithAccountPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { accountPassword, newAdminPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!accountPassword) {
      return res.status(400).json({ success: false, message: 'Account login password is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(accountPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect Account Login password' });
    }

    let hashedAdminPassword: string | null = null;
    if (newAdminPassword && newAdminPassword.trim() !== '') {
      hashedAdminPassword = await bcrypt.hash(newAdminPassword.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { adminPassword: hashedAdminPassword },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminPassword: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: hashedAdminPassword ? 'Admin password updated successfully' : 'Admin password reset and removed successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        hasAdminPassword: !!updatedUser.adminPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

