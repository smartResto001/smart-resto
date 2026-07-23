"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const prisma_1 = require("../config/prisma");
const getDashboardStats = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const totalOrders = await prisma_1.prisma.order.count({
            where: userId ? { userId } : {},
        });
        const totalCompletedOrders = await prisma_1.prisma.order.count({
            where: {
                status: 'PAID',
                ...(userId ? { userId } : {}),
            },
        });
        const totalCancelledOrders = await prisma_1.prisma.order.count({
            where: {
                status: 'CANCELLED',
                ...(userId ? { userId } : {}),
            },
        });
        const activeOrdersCount = await prisma_1.prisma.order.count({
            where: {
                status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] },
                ...(userId ? { userId } : {}),
            },
        });
        const totalRevenueAgg = await prisma_1.prisma.payment.aggregate({
            where: userId ? { userId } : {},
            _sum: { grandTotal: true },
        });
        const totalRevenue = totalRevenueAgg._sum.grandTotal || 0;
        const avgOrderValue = totalCompletedOrders > 0 ? totalRevenue / totalCompletedOrders : 0;
        // Top selling foods
        const topFoodsRaw = await prisma_1.prisma.orderItem.groupBy({
            by: ['foodItemId'],
            where: userId ? { order: { userId } } : {},
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5,
        });
        const topFoods = await Promise.all(topFoodsRaw.map(async (tf) => {
            const item = await prisma_1.prisma.foodItem.findUnique({
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
        }));
        // Recent 10 payments
        const recentPayments = await prisma_1.prisma.payment.findMany({
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
                topFoods,
                recentPayments,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboardStats = getDashboardStats;
