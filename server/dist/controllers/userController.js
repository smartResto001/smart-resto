"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.createUser = exports.getAllUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../config/prisma");
const types_1 = require("../types");
const emailService_1 = require("../services/emailService");
const getAllUsers = async (req, res, next) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getAllUsers = getAllUsers;
const createUser = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        if (!(0, emailService_1.isGmailAccount)(email)) {
            return res.status(400).json({
                success: false,
                message: "This mail doesn't exist as a valid Gmail account (@gmail.com). Only existing Google Mail accounts can be used to create an account.",
            });
        }
        if (!Object.values(types_1.Role).includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email: email.trim().toLowerCase(),
                password: hashedPassword,
                role: role,
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
        (0, emailService_1.sendWelcomeEmail)(user.email, user.name, user.role);
        return res.status(201).json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
};
exports.createUser = createUser;
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (id === req.user?.id) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        }
        await prisma_1.prisma.user.delete({ where: { id } });
        return res.status(200).json({ success: true, message: 'User deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteUser = deleteUser;
