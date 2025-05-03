import { Service } from 'typedi';
import { PrismaClient } from '@prisma/client';

/**
 * 協會分析服務
 * 負責記錄和分析與協會相關的各類事件數據
 */
@Service()
export class AnalyticsService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * 記錄分析事件
     * @param data 事件數據
     * @returns 創建的事件記錄
     */
    async trackEvent(data: { associationId: string; eventType: string; meta?: any }) {
        // 記錄分析事件
        return this.prisma.associationAnalytics.create({
            data: {
                associationId: data.associationId,
                eventType: data.eventType,
                meta: data.meta || {},
            },
        });
    }

    /**
     * 獲取協會的訪問統計數據
     * @param associationId 協會ID
     * @param period 時間範圍 (day, week, month, year)
     * @returns 訪問統計數據
     */
    async getVisitStats(associationId: string, period: string) {
        // 根據時間範圍設置起始日期
        const startDate = new Date();
        switch (period) {
            case 'day':
                startDate.setDate(startDate.getDate() - 1);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 30); // 默認30天
        }

        // 查詢頁面訪問事件
        const pageViews = await this.prisma.associationAnalytics.count({
            where: {
                associationId,
                eventType: 'PAGE_VIEW',
                createdAt: {
                    gte: startDate,
                },
            },
        });

        // 查詢獨立訪客數 (基於IP地址)
        const uniqueVisitors = await this.prisma.associationAnalytics.findMany({
            where: {
                associationId,
                eventType: 'PAGE_VIEW',
                createdAt: {
                    gte: startDate,
                },
            },
            select: {
                meta: true,
            },
            distinct: ['meta'], // 這裡假設metadata中包含訪客IP
        });

        return {
            pageViews,
            uniqueVisitors: uniqueVisitors.length,
            period,
        };
    }

    /**
     * 獲取協會的潛在客戶(Lead)統計數據
     * @param associationId 協會ID
     * @param period 時間範圍
     * @returns 潛在客戶統計數據
     */
    async getLeadStats(associationId: string, period: string) {
        // 根據時間範圍設置起始日期
        const startDate = new Date();
        switch (period) {
            case 'day':
                startDate.setDate(startDate.getDate() - 1);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 30); // 默認30天
        }

        // 查詢新增潛在客戶數量
        const newLeads = await this.prisma.associationLead.count({
            where: {
                associationId,
                createdAt: {
                    gte: startDate,
                },
            },
        });

        // 查詢不同狀態的潛在客戶數量
        const statusCounts = await this.prisma.$queryRaw`
      SELECT status, COUNT(*) as count
      FROM "AssociationLead"
      WHERE "associationId" = ${associationId}
      GROUP BY status
    `;

        return {
            newLeads,
            statusCounts,
            period,
        };
    }

    /**
     * 獲取協會會員活躍度數據
     * @param associationId 協會ID
     * @returns 會員活躍度數據
     */
    async getMemberEngagement(associationId: string) {
        // 獲取協會有效會員總數（排除已刪除會員）
        const totalMembers = await this.prisma.associationMember.count({
            where: {
                associationId,
                deleted_at: null,
            },
        });

        // 按會員身份分組（排除已刪除會員）
        const membersByRole = await this.prisma.associationMember.groupBy({
            by: ['role'],
            where: {
                associationId,
                deleted_at: null,
            },
            _count: true,
        });

        // 按會員狀態分組（排除已刪除會員）
        const membersByStatus = await this.prisma.associationMember.groupBy({
            by: ['membershipStatus'],
            where: {
                associationId,
                deleted_at: null,
            },
            _count: true,
        });

        // 獲取活躍會員數量
        const activeMembers = await this.prisma.associationMember.count({
            where: {
                associationId,
                membershipStatus: 'ACTIVE',
                deleted_at: null,
            },
        });

        return {
            totalMembers,
            activeMembers,
            membersByRole,
            membersByStatus,
            activeRate: totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0,
        };
    }

    /**
     * 獲取協會完整分析報告
     * @param associationId 協會ID
     * @param period 時間範圍
     * @returns 完整分析報告
     */
    async getAssociationAnalytics(associationId: string, period: string = 'month') {
        // 獲取各類分析數據
        const [visitStats, leadStats, memberEngagement] = await Promise.all([
            this.getVisitStats(associationId, period),
            this.getLeadStats(associationId, period),
            this.getMemberEngagement(associationId),
        ]);

        return {
            visitStats,
            leadStats,
            memberEngagement,
        };
    }
}
