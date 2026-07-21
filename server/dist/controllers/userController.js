"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.createUser = exports.getAllUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../config/prisma");
const types_1 = require("../types");
const getAllUsers = async (req, res, next) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const formattedUsers = users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            roles: u.userRoles.map((ur) => ur.role.name),
            createdAt: u.createdAt,
        }));
        return res.status(200).json({ success: true, data: formattedUsers });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllUsers = getAllUsers;
const createUser = async (req, res, next) => {
    try {
        const { name, email, password, role, phone } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'All required fields must be provided' });
        }
        if (!Object.values(types_1.Role).includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }
        let targetRole = await prisma_1.prisma.role.findUnique({ where: { name: role } });
        if (!targetRole) {
            targetRole = await prisma_1.prisma.role.create({ data: { name: role } });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone,
                userRoles: {
                    create: [{ roleId: targetRole.id }],
                },
            },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        const formattedUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            roles: user.userRoles.map((ur) => ur.role.name),
            createdAt: user.createdAt,
        };
        return res.status(201).json({ success: true, data: formattedUser });
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
