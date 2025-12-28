/**
 * StickerNest v2 - Commerce Analytics Controller
 * Handles revenue and leads analytics for creators
 */

import type { Request, Response, NextFunction } from 'express';
import { db } from '../../db/client.js';

/**
 * Get revenue summary for creator
 */
export async function getRevenueSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { canvasId } = req.query;

    const where: any = { creatorId: userId, status: 'paid' };
    if (canvasId) where.canvasId = canvasId;

    const aggregate = await db.canvasOrder.aggregate({
      where,
      _sum: { amountCents: true },
      _count: true,
    });

    const totalRevenue = aggregate._sum.amountCents || 0;
    const totalOrders = aggregate._count;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await db.canvasOrder.findMany({
      where: {
        ...where,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        amountCents: true,
        createdAt: true,
      },
    });

    const revenueByDay: Record<string, { revenue: number; orders: number }> = {};
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!revenueByDay[date]) {
        revenueByDay[date] = { revenue: 0, orders: 0 };
      }
      revenueByDay[date].revenue += order.amountCents;
      revenueByDay[date].orders += 1;
    });

    const revenueByDayArray = Object.entries(revenueByDay)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      revenueByDay: revenueByDayArray,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get leads summary for creator
 */
export async function getLeadsSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const days = Number(req.query.days) || 30;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const totalLeads = await db.formSubmission.count({
      where: { creatorId: userId },
    });

    const newLeads = await db.formSubmission.count({
      where: { creatorId: userId, status: 'new' },
    });

    const convertedLeads = await db.formSubmission.count({
      where: { creatorId: userId, status: 'converted' },
    });

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const leadsByTypeRaw = await db.formSubmission.groupBy({
      by: ['formType'],
      where: { creatorId: userId },
      _count: true,
    });

    const leadsByType: Record<string, number> = {};
    leadsByTypeRaw.forEach(row => {
      leadsByType[row.formType] = row._count;
    });

    const recentLeads = await db.formSubmission.findMany({
      where: {
        creatorId: userId,
        createdAt: { gte: daysAgo },
      },
      select: { createdAt: true },
    });

    const leadsByDayMap: Record<string, number> = {};
    recentLeads.forEach(lead => {
      const date = lead.createdAt.toISOString().split('T')[0];
      leadsByDayMap[date] = (leadsByDayMap[date] || 0) + 1;
    });

    const leadsByDay = Object.entries(leadsByDayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      totalLeads,
      newLeads,
      conversionRate: Math.round(conversionRate * 100) / 100,
      leadsByType,
      leadsByDay,
    });
  } catch (error) {
    next(error);
  }
}
