import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const getMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        foodItems: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const foodItems = await prisma.foodItem.findMany({
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
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await prisma.category.create({
      data: { name, description },
    });

    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const createFoodItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, price, prepTime, availability, isVeg, image, categoryId } = req.body;

    const item = await prisma.foodItem.create({
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
  } catch (error) {
    next(error);
  }
};

export const updateFoodItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, price, prepTime, availability, isVeg, image, categoryId } = req.body;

    const item = await prisma.foodItem.update({
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
  } catch (error) {
    next(error);
  }
};

export const deleteFoodItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.foodItem.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Food item deleted successfully' });
  } catch (error) {
    next(error);
  }
};
