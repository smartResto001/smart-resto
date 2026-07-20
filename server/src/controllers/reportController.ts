import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalOrders = await prisma.order.count();
    const totalCompletedOrders = await prisma.order.count({ where: { status: 'PAID' } });
    const totalCancelledOrders = await prisma.order.count({ where: { status: 'CANCELLED' } });
    const activeOrdersCount = await prisma.order.count({
      where: { status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] } },
    });

    const totalRevenueAgg = await prisma.payment.aggregate({
      _sum: { grandTotal: true },
    });
    const totalRevenue = totalRevenueAgg._sum.grandTotal || 0;

    const avgOrderValue = totalCompletedOrders > 0 ? totalRevenue / totalCompletedOrders : 0;

    // Top selling foods
    const topFoodsRaw = await prisma.orderItem.groupBy({
      by: ['foodItemId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topFoods = await Promise.all(
      topFoodsRaw.map(async (tf) => {
        const item = await prisma.foodItem.findUnique({
          where: { id: tf.foodItemId },
          include: { category: true },
        });
        return {
          id: item?.id,
          name: item?.name || 'Unknown',
          category: item?.category?.name || 'General',
          totalQuantity: tf._sum.quantity || 0,
          price: item?.price || 0,
        };
      })
    );

    // Recent 10 payments
    const recentPayments = await prisma.payment.findMany({
      include: {
        order: {
          include: { table: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalCompletedOrders,
        totalCancelledOrders,
        activeOrdersCount,
        totalRevenue,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        topFoods,
        recentPayments,
      },
    });
  } catch (error) {
    next(error);
  }
};
