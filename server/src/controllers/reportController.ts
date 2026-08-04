import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    const totalOrders = await prisma.order.count({
      where: userId ? { userId } : {},
    });

    const totalCompletedOrders = await prisma.order.count({
      where: {
        status: 'PAID',
        ...(userId ? { userId } : {}),
      },
    });

    const totalCancelledOrders = await prisma.order.count({
      where: {
        status: 'CANCELLED',
        ...(userId ? { userId } : {}),
      },
    });

    const activeOrdersCount = await prisma.order.count({
      where: {
        status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] },
        ...(userId ? { userId } : {}),
      },
    });

    const totalRevenueAgg = await prisma.payment.aggregate({
      where: userId ? { userId } : {},
      _sum: { grandTotal: true },
    });
    const totalRevenue = totalRevenueAgg._sum.grandTotal || 0;

    const avgOrderValue = totalCompletedOrders > 0 ? totalRevenue / totalCompletedOrders : 0;

    // QR vs Waiter Orders Breakdown
    const totalQrOrders = await prisma.order.count({
      where: {
        orderSource: 'QR',
        ...(userId ? { userId } : {}),
      },
    });

    const totalWaiterOrders = await prisma.order.count({
      where: {
        orderSource: 'WAITER',
        ...(userId ? { userId } : {}),
      },
    });

    // Most Ordered Table
    const topTableRaw = await prisma.order.groupBy({
      by: ['tableId'],
      where: userId ? { userId } : {},
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    });

    let mostOrderedTable: number | string | null = null;
    if (topTableRaw.length > 0) {
      const tbl = await prisma.table.findUnique({ where: { id: topTableRaw[0].tableId } });
      mostOrderedTable = tbl ? tbl.tableNumber : null;
    }

    // Top selling foods
    const topFoodsRaw = await prisma.orderItem.groupBy({
      by: ['foodItemId'],
      where: userId ? { order: { userId } } : {},
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

    const mostOrderedFood = topFoods.length > 0 ? topFoods[0].name : null;

    // Recent 10 payments
    const recentPayments = await prisma.payment.findMany({
      where: userId ? { userId } : {},
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
        totalQrOrders,
        totalWaiterOrders,
        mostOrderedTable,
        mostOrderedFood,
        topFoods,
        recentPayments,
      },
    });
  } catch (error) {
    next(error);
  }
};
