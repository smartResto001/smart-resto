"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRole = exports.getMe = exports.register = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const JWT_SECRET = process.env.JWT_SECRET || 'smart_resto_super_secret_jwt_key_2026';
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const userRoles = user.userRoles.map((ur) => ur.role.name);
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            name: user.name,
            email: user.email,
            roles: userRoles,
        }, JWT_SECRET, { expiresIn: '1d' });
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                roles: userRoles,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const register = async (req, res, next) => {
    try {
        const { name, email, password, confirmPassword, phone } = req.body;
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        if (confirmPassword && password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Default role for new registered user is USER (not staff roles)
        let defaultRole = await prisma_1.prisma.role.findUnique({
            where: { name: 'USER' },
        });
        if (!defaultRole) {
            defaultRole = await prisma_1.prisma.role.create({
                data: { name: 'USER' },
            });
        }
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone,
                userRoles: {
                    create: [
                        {
                            roleId: defaultRole.id,
                        },
                    ],
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
        const userRoles = user.userRoles.map((ur) => ur.role.name);
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            name: user.name,
            email: user.email,
            roles: userRoles,
        }, JWT_SECRET, { expiresIn: '1d' });
        return res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                roles: userRoles,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const getMe = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const userRoles = user.userRoles.map((ur) => ur.role.name);
        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                roles: userRoles,
                createdAt: user.createdAt,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
const verifyRole = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ success: false, message: 'Role parameter is required' });
        }
        const requestedRole = role.toUpperCase();
        // Fetch user and check permissions
        const userRole = await prisma_1.prisma.userRole.findFirst({
            where: {
                userId: req.user.id,
                role: {
                    name: requestedRole,
                },
            },
        });
        if (!userRole) {
            return res.status(403).json({
                success: false,
                authorized: false,
                message: 'You are not authorized to access this role.',
            });
        }
        return res.status(200).json({
            success: true,
            authorized: true,
            role: requestedRole,
            message: `Role ${requestedRole} verified successfully`,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyRole = verifyRole;
