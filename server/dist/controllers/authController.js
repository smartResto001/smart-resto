"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAdminPasswordWithAccountPassword = exports.verifyAdminPassword = exports.setAdminPassword = exports.register = exports.getMe = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const emailService_1 = require("../services/emailService");
const JWT_SECRET = process.env.JWT_SECRET || 'smart_resto_super_secret_jwt_key_2026';
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        if (user.isLocked) {
            return res.status(403).json({
                success: false,
                message: 'Account has been locked/suspended by Chief Admin. Please contact support.',
            });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        }, JWT_SECRET, { expiresIn: '1d' });
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isLocked: user.isLocked,
                hasAdminPassword: !!user.adminPassword,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const getMe = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isLocked: true,
                adminPassword: true,
                createdAt: true,
            },
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
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
                hasAdminPassword: !!user.adminPassword,
                createdAt: user.createdAt,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
const register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
        }
        if (!(0, emailService_1.isGmailAccount)(email)) {
            return res.status(400).json({
                success: false,
                message: "This mail doesn't exist as a valid Gmail account (@gmail.com). Only existing Google Mail accounts can be used to create an account.",
            });
        }
        const validRoles = ['ADMIN', 'WAITER', 'KITCHEN', 'CASHIER'];
        const userRole = role && validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : 'WAITER';
        const cleanEmail = email.trim().toLowerCase();
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email: cleanEmail } });
        const existingChiefAdmin = await prisma_1.prisma.chiefAdmin.findUnique({ where: { email: cleanEmail } });
        if (existingUser || existingChiefAdmin) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email: cleanEmail,
                password: hashedPassword,
                role: userRole,
            },
        });
        // Send welcome email notification asynchronously
        (0, emailService_1.sendWelcomeEmail)(user.email, user.name, user.role);
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        }, JWT_SECRET, { expiresIn: '1d' });
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
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const setAdminPassword = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { adminPassword } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        if (req.user?.role === 'CHIEF_ADMIN') {
            return res.status(200).json({
                success: true,
                message: 'Chief Admin account unlocked by default',
            });
        }
        let hashedAdminPassword = null;
        if (adminPassword && typeof adminPassword === 'string' && adminPassword.trim() !== '') {
            hashedAdminPassword = await bcryptjs_1.default.hash(adminPassword.trim(), 10);
        }
        const updatedUser = await prisma_1.prisma.user.update({
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
    }
    catch (error) {
        next(error);
    }
};
exports.setAdminPassword = setAdminPassword;
const verifyAdminPassword = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { password } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        if (!password || typeof password !== 'string' || password.trim() === '') {
            return res.status(400).json({ success: false, message: 'Password is required' });
        }
        if (req.user?.role === 'CHIEF_ADMIN') {
            const chiefAdmin = await prisma_1.prisma.chiefAdmin.findUnique({
                where: { id: userId },
            });
            if (!chiefAdmin) {
                return res.status(404).json({ success: false, message: 'Chief Admin not found' });
            }
            const isMatch = await bcryptjs_1.default.compare(String(password), chiefAdmin.password);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Incorrect Chief Admin password.',
                });
            }
            return res.status(200).json({ success: true, message: 'Admin password verified' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        let isMatch = false;
        // 1. Check custom Admin passcode if set
        if (user.adminPassword) {
            isMatch = await bcryptjs_1.default.compare(String(password), user.adminPassword);
        }
        // 2. Fallback to main Account Login password
        if (!isMatch && user.password) {
            isMatch = await bcryptjs_1.default.compare(String(password), user.password);
        }
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Incorrect password. Enter your Admin passcode or Account login password.',
            });
        }
        return res.status(200).json({ success: true, message: 'Admin password verified' });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyAdminPassword = verifyAdminPassword;
const resetAdminPasswordWithAccountPassword = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { accountPassword, newAdminPassword } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        if (!accountPassword || typeof accountPassword !== 'string' || accountPassword.trim() === '') {
            return res.status(400).json({ success: false, message: 'Account login password is required' });
        }
        if (req.user?.role === 'CHIEF_ADMIN') {
            const chiefAdmin = await prisma_1.prisma.chiefAdmin.findUnique({
                where: { id: userId },
            });
            if (!chiefAdmin) {
                return res.status(404).json({ success: false, message: 'Chief Admin not found' });
            }
            const isMatch = await bcryptjs_1.default.compare(String(accountPassword), chiefAdmin.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Incorrect Chief Admin password' });
            }
            return res.status(200).json({
                success: true,
                message: 'Chief Admin authenticated successfully',
                user: {
                    id: chiefAdmin.id,
                    name: chiefAdmin.name,
                    email: chiefAdmin.email,
                    role: 'CHIEF_ADMIN',
                    hasAdminPassword: false,
                },
            });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (!user.password) {
            return res.status(400).json({ success: false, message: 'User password not set' });
        }
        const isMatch = await bcryptjs_1.default.compare(String(accountPassword), user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect Account Login password' });
        }
        let hashedAdminPassword = null;
        if (newAdminPassword && typeof newAdminPassword === 'string' && newAdminPassword.trim() !== '') {
            hashedAdminPassword = await bcryptjs_1.default.hash(newAdminPassword.trim(), 10);
        }
        const updatedUser = await prisma_1.prisma.user.update({
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
    }
    catch (error) {
        next(error);
    }
};
exports.resetAdminPasswordWithAccountPassword = resetAdminPasswordWithAccountPassword;
