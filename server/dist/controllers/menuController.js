"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.deleteFoodItem = exports.updateFoodItem = exports.createFoodItem = exports.createCategory = exports.getMenu = void 0;
const prisma_1 = require("../config/prisma");
const getOrCreateDefaultCategory = async (userId) => {
    let cat = await prisma_1.prisma.category.findFirst({
        where: { userId },
    });
    if (!cat) {
        try {
            cat = await prisma_1.prisma.category.create({
                data: {
                    name: 'General',
                    description: 'Default Menu Category',
                    userId,
                },
            });
        }
        catch (err) {
            cat = await prisma_1.prisma.category.findFirst({
                where: { userId },
            });
        }
    }
    return cat;
};
const getMenu = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        let categories = await prisma_1.prisma.category.findMany({
            where: userId ? { userId } : {},
            include: {
                foodItems: {
                    where: userId ? { userId } : {},
                    orderBy: { name: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        });
        // Auto-create default 'General' category for new accounts if none exist
        if (userId && categories.length === 0) {
            const defaultCat = await getOrCreateDefaultCategory(userId);
            if (defaultCat) {
                categories = [
                    {
                        ...defaultCat,
                        foodItems: [],
                    },
                ];
            }
        }
        const foodItems = await prisma_1.prisma.foodItem.findMany({
            where: userId ? { userId } : {},
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
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User authentication required' });
        }
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }
        const existing = await prisma_1.prisma.category.findFirst({
            where: { name: name.trim(), userId },
        });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Category already exists for your account' });
        }
        const category = await prisma_1.prisma.category.create({
            data: { name: name.trim(), description, userId },
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
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User authentication required' });
        }
        let targetCategoryId = categoryId;
        if (!targetCategoryId) {
            const defaultCat = await getOrCreateDefaultCategory(userId);
            if (!defaultCat) {
                return res.status(400).json({ success: false, message: 'Could not resolve default category. Please create a category first.' });
            }
            targetCategoryId = defaultCat.id;
        }
        else {
            const catExists = await prisma_1.prisma.category.findUnique({ where: { id: targetCategoryId } });
            if (!catExists) {
                return res.status(400).json({ success: false, message: 'Selected Category does not exist. Please select or create a category.' });
            }
        }
        const item = await prisma_1.prisma.foodItem.create({
            data: {
                name,
                description,
                price: Number(price),
                prepTime: Number(prepTime) || 15,
                availability: availability !== undefined ? Boolean(availability) : true,
                isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
                image,
                categoryId: targetCategoryId,
                userId,
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
        const userId = req.user?.id;
        const existing = await prisma_1.prisma.foodItem.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Food item not found' });
        }
        if (existing.userId && existing.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
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
        const userId = req.user?.id;
        const existing = await prisma_1.prisma.foodItem.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Food item not found' });
        }
        if (existing.userId && existing.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        // Clean up any order items referencing this food item
        await prisma_1.prisma.orderItem.deleteMany({ where: { foodItemId: id } });
        await prisma_1.prisma.foodItem.delete({ where: { id } });
        return res.status(200).json({ success: true, message: 'Food item deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteFoodItem = deleteFoodItem;
const updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const userId = req.user?.id;
        const existing = await prisma_1.prisma.category.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        if (existing.userId && existing.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        if (name && name.trim() !== '') {
            const duplicate = await prisma_1.prisma.category.findFirst({
                where: { name: name.trim(), userId, id: { not: id } },
            });
            if (duplicate) {
                return res.status(400).json({ success: false, message: 'Category with this name already exists' });
            }
        }
        const category = await prisma_1.prisma.category.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description }),
            },
        });
        return res.status(200).json({ success: true, data: category });
    }
    catch (error) {
        next(error);
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const existing = await prisma_1.prisma.category.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        if (existing.userId && existing.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        // Check if there are food items attached to this category
        const foodItemCount = await prisma_1.prisma.foodItem.count({ where: { categoryId: id } });
        if (foodItemCount > 0) {
            // Find another existing category for this user
            let fallbackCategory = await prisma_1.prisma.category.findFirst({
                where: {
                    userId,
                    id: { not: id },
                },
            });
            if (!fallbackCategory) {
                // Use a fallback name that does not collide with the category being deleted
                const fallbackName = existing.name.toLowerCase() === 'general' ? 'Uncategorized' : 'General';
                let existingFallback = await prisma_1.prisma.category.findFirst({
                    where: { userId, name: fallbackName },
                });
                if (existingFallback && existingFallback.id !== id) {
                    fallbackCategory = existingFallback;
                }
                else {
                    fallbackCategory = await prisma_1.prisma.category.create({
                        data: {
                            name: fallbackName,
                            description: 'Default Menu Category',
                            userId,
                        },
                    });
                }
            }
            // Reassign all food items from the deleted category to the fallback category
            await prisma_1.prisma.foodItem.updateMany({
                where: { categoryId: id },
                data: { categoryId: fallbackCategory.id },
            });
        }
        // Delete ONLY the category
        await prisma_1.prisma.category.delete({ where: { id } });
        return res.status(200).json({
            success: true,
            message: 'Category removed successfully. Food items were preserved.',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCategory = deleteCategory;
