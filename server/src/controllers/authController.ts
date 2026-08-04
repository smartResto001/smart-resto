import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma';
import { isGmailAccount, sendWelcomeEmail } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'smart_resto_super_secret_jwt_key_2026';

export const getSystemDefaults = async () => {
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
  return settings;
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query strictly from User table in database
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials for User Account' });
    }

    if (user.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'Account has been locked/suspended by Chief Admin. Please contact support.',
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'This account was created using Google Sign-In. Please sign in with Google.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials for User Account' });
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
      message: 'User Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isLocked: user.isLocked,
        planName: user.planName,
        isTrial: user.isTrial,
        trialDays: user.trialDays,
        trialExpiresAt: user.trialExpiresAt,
        isPaid: user.isPaid,
        monthlyFee: user.monthlyFee,
        subscriptionMonths: user.subscriptionMonths,
        discountAmount: user.discountAmount,
        totalPayable: user.totalPayable,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        lastPaidAt: user.lastPaidAt,
        hasAdminPassword: !!user.adminPassword,
        hotelName: user.hotelName || user.name || 'SmartResto',
        hotelAddress: user.hotelAddress || '',
        hotelPhone: user.hotelPhone || '',
        hotelGst: user.hotelGst || '',
        upiId: user.upiId || '',
        upiName: user.upiName || '',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const chiefAdminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query strictly from ChiefAdmin table in database
    const chiefAdmin = await prisma.chiefAdmin.findUnique({
      where: { email: cleanEmail },
    });

    if (!chiefAdmin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials for Chief Admin Account' });
    }

    if (chiefAdmin.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'Chief Admin Account has been locked/suspended.',
      });
    }

    const isMatch = await bcrypt.compare(password, chiefAdmin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials for Chief Admin Account' });
    }

    const token = jwt.sign(
      {
        id: chiefAdmin.id,
        name: chiefAdmin.name,
        email: chiefAdmin.email,
        role: 'CHIEF_ADMIN',
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Chief Admin Login successful',
      token,
      user: {
        id: chiefAdmin.id,
        name: chiefAdmin.name,
        email: chiefAdmin.email,
        role: 'CHIEF_ADMIN',
        isLocked: chiefAdmin.isLocked,
        hasAdminPassword: false,
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

    if (req.user.role === 'CHIEF_ADMIN') {
      const chiefAdmin = await prisma.chiefAdmin.findUnique({
        where: { id: req.user.id },
      });

      if (chiefAdmin) {
        if (chiefAdmin.isLocked) {
          return res.status(403).json({ success: false, message: 'Chief Admin account is locked' });
        }

        return res.status(200).json({
          success: true,
          user: {
            id: chiefAdmin.id,
            name: chiefAdmin.name,
            email: chiefAdmin.email,
            role: 'CHIEF_ADMIN',
            isLocked: chiefAdmin.isLocked,
            hasAdminPassword: false,
            createdAt: chiefAdmin.createdAt,
          },
        });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
        adminPassword: true,
        hotelName: true,
        hotelAddress: true,
        hotelPhone: true,
        hotelGst: true,
        upiId: true,
        upiName: true,
        createdAt: true,
      },
    });

    if (user) {
      if (user.isLocked) {
        return res.status(403).json({ success: false, message: 'Account locked by Chief Admin' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isLocked: user.isLocked,
          planName: user.planName,
          isTrial: user.isTrial,
          trialDays: user.trialDays,
          trialExpiresAt: user.trialExpiresAt,
          isPaid: user.isPaid,
          monthlyFee: user.monthlyFee,
          subscriptionMonths: user.subscriptionMonths,
          discountAmount: user.discountAmount,
          totalPayable: user.totalPayable,
          subscriptionExpiresAt: user.subscriptionExpiresAt,
          lastPaidAt: user.lastPaidAt,
          hasAdminPassword: !!user.adminPassword,
          hotelName: user.hotelName || user.name || 'SmartResto',
          hotelAddress: user.hotelAddress || '',
          hotelPhone: user.hotelPhone || '',
          hotelGst: user.hotelGst || '',
          upiId: user.upiId || '',
          upiName: user.upiName || '',
          createdAt: user.createdAt,
        },
      });
    }

    // Fallback: Check ChiefAdmin if role was not explicitly CHIEF_ADMIN in payload
    const fallbackChiefAdmin = await prisma.chiefAdmin.findUnique({
      where: { id: req.user.id },
    });

    if (fallbackChiefAdmin) {
      if (fallbackChiefAdmin.isLocked) {
        return res.status(403).json({ success: false, message: 'Chief Admin account is locked' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: fallbackChiefAdmin.id,
          name: fallbackChiefAdmin.name,
          email: fallbackChiefAdmin.email,
          role: 'CHIEF_ADMIN',
          isLocked: fallbackChiefAdmin.isLocked,
          hasAdminPassword: false,
          createdAt: fallbackChiefAdmin.createdAt,
        },
      });
    }

    return res.status(404).json({ success: false, message: 'User account not found' });
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

    const defaults = await getSystemDefaults();
    const trialExpiresAt = new Date(Date.now() + defaults.defaultTrialDays * 24 * 60 * 60 * 1000);
    const totalPayable = Math.max(0, defaults.defaultMonthlyFee * defaults.defaultSubscriptionMonths - defaults.defaultDiscountAmount);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: userRole,
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
      message: `Account created successfully with a ${defaults.defaultTrialDays}-day trial period!`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        planName: user.planName,
        isTrial: user.isTrial,
        trialDays: user.trialDays,
        trialExpiresAt: user.trialExpiresAt,
        isPaid: user.isPaid,
        monthlyFee: user.monthlyFee,
        subscriptionMonths: user.subscriptionMonths,
        discountAmount: user.discountAmount,
        totalPayable: user.totalPayable,
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
    if (adminPassword && typeof adminPassword === 'string' && adminPassword.trim() !== '') {
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

    if (!password || typeof password !== 'string' || password.trim() === '') {
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
      isMatch = await bcrypt.compare(String(password), user.adminPassword);
    }

    // 2. Fallback to main Account Login password
    if (!isMatch && user.password) {
      isMatch = await bcrypt.compare(String(password), user.password);
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

    if (!accountPassword || typeof accountPassword !== 'string' || accountPassword.trim() === '') {
      return res.status(400).json({ success: false, message: 'Account login password is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.password) {
      return res.status(400).json({ success: false, message: 'User password not set' });
    }

    const isMatch = await bcrypt.compare(String(accountPassword), user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect Account Login password' });
    }

    let hashedAdminPassword: string | null = null;
    if (newAdminPassword && typeof newAdminPassword === 'string' && newAdminPassword.trim() !== '') {
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

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address' });
    }

    if (user.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'Account is locked/suspended. Please contact support.',
      });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword).trim(), 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

const googleClient = new OAuth2Client();

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential, isRegistering, name: providedName, email: providedEmail, googleId: providedGoogleId, avatar: providedAvatar } = req.body;

    let email = providedEmail;
    let name = providedName;
    let googleId = providedGoogleId;
    let avatar = providedAvatar;

    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload) {
          email = payload.email;
          name = payload.name;
          googleId = payload.sub;
          avatar = payload.picture;
        }
      } catch (verifyErr) {
        try {
          const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
          if (response.ok) {
            const data: any = await response.json();
            if (data && data.email) {
              email = data.email;
              name = data.name || data.given_name || name;
              googleId = data.sub || googleId;
              avatar = data.picture || avatar;
            }
          }
        } catch (fetchErr) {
          try {
            const parts = credential.split('.');
            if (parts.length === 3) {
              const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
              if (decoded && decoded.email) {
                email = decoded.email;
                name = decoded.name || name;
                googleId = decoded.sub || googleId;
                avatar = decoded.picture || avatar;
              }
            }
          } catch (decodeErr) {
            console.error('Failed to parse Google credential token:', decodeErr);
          }
        }
      }
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication failed: Email address could not be verified from Google account.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists in User table
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          ...(googleId ? [{ googleId }] : []),
        ],
      },
    });

    // IF USER EXISTS:
    if (user) {
      if (user.isLocked) {
        return res.status(403).json({
          success: false,
          message: 'Account has been locked/suspended by Chief Admin. Please contact support.',
        });
      }

      // Update provider, googleId, avatar if missing
      if (!user.googleId || !user.avatar || user.provider !== 'GOOGLE') {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleId || user.googleId,
            provider: 'GOOGLE',
            avatar: avatar || user.avatar,
          },
        });
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
        exists: true,
        message: 'User login successful with Google Account',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          googleId: user.googleId,
          provider: user.provider,
          avatar: user.avatar,
          isLocked: user.isLocked,
          planName: user.planName,
          isTrial: user.isTrial,
          trialDays: user.trialDays,
          trialExpiresAt: user.trialExpiresAt,
          isPaid: user.isPaid,
          monthlyFee: user.monthlyFee,
          subscriptionMonths: user.subscriptionMonths,
          discountAmount: user.discountAmount,
          totalPayable: user.totalPayable,
          subscriptionExpiresAt: user.subscriptionExpiresAt,
          lastPaidAt: user.lastPaidAt,
          hotelGst: user.hotelGst || '',
          upiId: user.upiId || '',
          upiName: user.upiName || '',
          hasAdminPassword: !!user.adminPassword,
        },
      });
    }

    // IF USER DOES NOT EXIST: Automatically create account with Google details and log in
    const finalName = providedName || name || cleanEmail.split('@')[0];

    const defaults = await getSystemDefaults();
    const trialExpiresAt = new Date(Date.now() + defaults.defaultTrialDays * 24 * 60 * 60 * 1000);
    const totalPayable = Math.max(0, defaults.defaultMonthlyFee * defaults.defaultSubscriptionMonths - defaults.defaultDiscountAmount);

    user = await prisma.user.create({
      data: {
        name: finalName,
        email: cleanEmail,
        googleId: googleId || null,
        provider: 'GOOGLE',
        avatar: avatar || null,
        password: null,
        role: 'ADMIN',
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
    });

    // Send welcome email asynchronously
    sendWelcomeEmail(user.email, user.name, user.role || 'ADMIN');

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
      exists: true,
      message: 'Account created successfully and logged in with Google Account',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        googleId: user.googleId,
        provider: user.provider,
        avatar: user.avatar,
        isLocked: user.isLocked,
        hasAdminPassword: !!user.adminPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateHotelSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { hotelName, hotelAddress, hotelPhone, hotelGst, upiId, upiName } = req.body;

    if (!hotelName || !hotelName.trim()) {
      return res.status(400).json({ success: false, message: 'Hotel name is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        hotelName: hotelName.trim(),
        hotelAddress: hotelAddress ? hotelAddress.trim() : null,
        hotelPhone: hotelPhone ? hotelPhone.trim() : null,
        hotelGst: hotelGst ? hotelGst.trim() : null,
        upiId: upiId ? upiId.trim() : null,
        upiName: upiName ? upiName.trim() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isLocked: true,
        adminPassword: true,
        hotelName: true,
        hotelAddress: true,
        hotelPhone: true,
        hotelGst: true,
        upiId: true,
        upiName: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Hotel details & bill header updated successfully!',
      user: {
        ...updatedUser,
        hasAdminPassword: !!updatedUser.adminPassword,
        hotelName: updatedUser.hotelName || updatedUser.name || 'SmartResto',
        hotelAddress: updatedUser.hotelAddress || '',
        hotelPhone: updatedUser.hotelPhone || '',
        hotelGst: updatedUser.hotelGst || '',
        upiId: updatedUser.upiId || '',
        upiName: updatedUser.upiName || '',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const paySubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    const months = user.subscriptionMonths || 1;
    const now = new Date();
    let newExpiry = new Date();
    if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > now) {
      newExpiry = new Date(user.subscriptionExpiresAt);
    }
    newExpiry.setMonth(newExpiry.getMonth() + months);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isPaid: true,
        isLocked: false,
        lastPaidAt: now,
        subscriptionExpiresAt: newExpiry,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isLocked: true,
        isPaid: true,
        monthlyFee: true,
        subscriptionMonths: true,
        discountAmount: true,
        totalPayable: true,
        subscriptionExpiresAt: true,
        lastPaidAt: true,
        adminPassword: true,
        hotelName: true,
        hotelAddress: true,
        hotelPhone: true,
        hotelGst: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Payment of ₹${updatedUser.totalPayable} received successfully! Subscription extended by ${months} month(s). All role dashboards unlocked.`,
      user: {
        ...updatedUser,
        hasAdminPassword: !!updatedUser.adminPassword,
        hotelName: updatedUser.hotelName || updatedUser.name || 'SmartResto',
      },
    });
  } catch (error) {
    next(error);
  }
};

