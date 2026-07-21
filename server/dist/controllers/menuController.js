"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFoodItem = exports.updateFoodItem = exports.createFoodItem = exports.createCategory = exports.getMenu = void 0;
const prisma_1 = require("../config/prisma");
const getMenu = async (req, res, next) => {
    try {
        const categories = await prisma_1.prisma.category.findMany({
            include: {
                foodItems: {
                    orderBy: { name: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        });
        const foodItems = await prisma_1.prisma.foodItem.findMany({
            include: { category: true },
            orderBy: { name: 'asc' },
        });
        return res.status(200).json({
            success: true,
            data: {
                categories,
                foodItems,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMenu = getMenu;
const createCategory = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const existing = await prisma_1.prisma.category.findUnique({ where: { name } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }
        const category = await prisma_1.prisma.category.create({
            data: { name, description },
        });
        return res.status(201).json({ success: true, data: category });
    }
    catch (error) {
        next(error);
    }
};
exports.createCategory = createCategory;
const createFoodItem = async (req, res, next) => {
    try {
        const { name, description, price, prepTime, availability, isVeg, image, categoryId } = req.body;
        const item = await prisma_1.prisma.foodItem.create({
            data: {
                name,
                description,
                price: Number(price),
                prepTime: Number(prepTime) || 15,
                availability: availability !== undefined ? Boolean(availability) : true,
                isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
                image,
                categoryId,
            },
            include: { category: true },
        });
        return res.status(201).json({ success: true, data: item });
    }
    catch (error) {
        next(error);
    }
};
exports.createFoodItem = createFoodItem;
const updateFoodItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, price, prepTime, availability, isVeg, image, categoryId } = req.body;
        const item = await prisma_1.prisma.foodItem.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price: Number(price) }),
                ...(prepTime !== undefined && { prepTime: Number(prepTime) }),
                ...(availability !== undefined && { availability: Boolean(availability) }),
                ...(isVeg !== undefined && { isVeg: Boolean(isVeg) }),
                ...(image !== undefined && { image }),
                ...(categoryId && { categoryId }),
            },
            include: { category: true },
        });
        return res.status(200).json({ success: true, data: item });
    }
    catch (error) {
        next(error);
    }
};
exports.updateFoodItem = updateFoodItem;
const deleteFoodItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.foodItem.delete({ where: { id } });
        return res.status(200).json({ success: true, message: 'Food item deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteFoodItem = deleteFoodItem;
