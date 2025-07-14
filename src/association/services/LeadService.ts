import { Service } from 'typedi';
import { PrismaClient } from '@prisma/client';
import { CreateLeadDto, UpdateLeadDto, LeadStatus } from '../dtos/lead.dto';

@Service()
export class LeadService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * 創建新的潛在客戶記錄
     * @param associationId 協會ID
     * @param dto 潛在客戶數據
     * @returns 創建的潛在客戶記錄
     */
    async createLead(associationId: string, dto: CreateLeadDto) {
        // 檢查協會是否存在
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
        });

        if (!association) {
            throw new Error('協會不存在');
        }

        // 創建潛在客戶記錄
        const lead = await this.prisma.associationLead.create({
            data: {
                ...dto,
                associationId,
                status: LeadStatus.NEW,
            },
        });

        // 這裡可以添加通知功能，例如向協會管理員發送郵件
        // await this.notificationService.notifyNewLead(association, lead);

        return lead;
    }

    /**
     * 獲取協會的所有潛在客戶
     * @param associationId 協會ID
     * @param status 可選的過濾狀態
     * @param page 頁碼
     * @param limit 每頁數量
     * @returns 分頁的潛在客戶列表
     */
    async getLeads(associationId: string, status?: LeadStatus, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        // 構建查詢條件
        const where: any = { associationId };
        if (status) {
            where.status = status;
        }

        // 查詢符合條件的潛在客戶總數
        const total = await this.prisma.associationLead.count({ where });

        // 查詢潛在客戶列表
        const leads = await this.prisma.associationLead.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });

        return {
            leads,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * 🆕 獲取協會的潛在客戶（增強版，支持來源過濾和優先級排序）
     * @param associationId 協會ID
     * @param filters 過濾條件
     * @returns 分頁的潛在客戶列表
     */
    async getLeadsWithFilter(
        associationId: string,
        filters: {
            source?: string;
            status?: string;
            priority?: string;
            sortBy?: 'createdAt' | 'priority' | 'status';
            sortOrder?: 'asc' | 'desc';
            page?: number;
            limit?: number;
        } = {},
    ) {
        const {
            source,
            status,
            priority,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20,
        } = filters;

        const skip = (page - 1) * limit;

        // 構建查詢條件
        const where: any = { associationId };

        if (source) {
            where.source = source;
        }
        if (status) {
            where.status = status;
        }
        if (priority) {
            where.priority = priority;
        }

        // 構建排序條件
        let orderBy: any = { [sortBy]: sortOrder };

        // 如果按優先級排序，需要特殊處理以確保正確的優先級順序
        if (sortBy === 'priority') {
            orderBy = [
                {
                    priority: sortOrder,
                },
                {
                    createdAt: 'desc', // 相同優先級時按創建時間排序
                },
            ];
        }

        // 查詢符合條件的潛在客戶總數
        const total = await this.prisma.associationLead.count({ where });

        // 查詢潛在客戶列表（包含關聯信息）
        const leads = await this.prisma.associationLead.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        display_name: true,
                    },
                },
                purchaseOrder: {
                    select: {
                        id: true,
                        orderNumber: true,
                        status: true,
                        amount: true,
                        currency: true,
                        paidAt: true,
                    },
                },
            },
        });

        return {
            leads,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
            filters: {
                source,
                status,
                priority,
                sortBy,
                sortOrder,
            },
        };
    }

    /**
     * 🆕 獲取Lead統計信息
     * @param associationId 協會ID
     * @returns Lead統計數據
     */
    async getLeadStats(associationId: string) {
        // 按來源統計
        const sourceStats = await this.prisma.associationLead.groupBy({
            by: ['source'],
            where: { associationId },
            _count: {
                id: true,
            },
        });

        // 按狀態統計
        const statusStats = await this.prisma.associationLead.groupBy({
            by: ['status'],
            where: { associationId },
            _count: {
                id: true,
            },
        });

        // 按優先級統計
        const priorityStats = await this.prisma.associationLead.groupBy({
            by: ['priority'],
            where: { associationId },
            _count: {
                id: true,
            },
        });

        // 轉換率統計（購買意向Lead）
        const purchaseIntentTotal = await this.prisma.associationLead.count({
            where: {
                associationId,
                source: 'PURCHASE_INTENT',
            },
        });

        const purchaseIntentConverted = await this.prisma.associationLead.count({
            where: {
                associationId,
                source: 'PURCHASE_INTENT',
                status: 'CONVERTED',
            },
        });

        const conversionRate =
            purchaseIntentTotal > 0 ? (purchaseIntentConverted / purchaseIntentTotal) * 100 : 0;

        return {
            total: await this.prisma.associationLead.count({ where: { associationId } }),
            bySource: sourceStats.reduce(
                (acc, item) => {
                    acc[item.source || 'UNKNOWN'] = item._count.id;
                    return acc;
                },
                {} as Record<string, number>,
            ),
            byStatus: statusStats.reduce(
                (acc, item) => {
                    acc[item.status] = item._count.id;
                    return acc;
                },
                {} as Record<string, number>,
            ),
            byPriority: priorityStats.reduce(
                (acc, item) => {
                    acc[item.priority || 'MEDIUM'] = item._count.id;
                    return acc;
                },
                {} as Record<string, number>,
            ),
            conversion: {
                purchaseIntentTotal,
                purchaseIntentConverted,
                conversionRate: Math.round(conversionRate * 100) / 100, // 保留兩位小數
            },
        };
    }

    /**
     * 獲取單個潛在客戶詳情
     * @param leadId 潛在客戶ID
     * @returns 潛在客戶詳情
     */
    async getLeadById(leadId: string) {
        const lead = await this.prisma.associationLead.findUnique({
            where: { id: leadId },
        });

        if (!lead) {
            throw new Error('潛在客戶不存在');
        }

        return lead;
    }

    /**
     * 更新潛在客戶信息
     * @param leadId 潛在客戶ID
     * @param dto 更新數據
     * @returns 更新後的潛在客戶
     */
    async updateLead(leadId: string, dto: UpdateLeadDto) {
        // 檢查潛在客戶是否存在
        const existingLead = await this.prisma.associationLead.findUnique({
            where: { id: leadId },
        });

        if (!existingLead) {
            throw new Error('潛在客戶不存在');
        }

        // 更新潛在客戶
        return this.prisma.associationLead.update({
            where: { id: leadId },
            data: dto,
        });
    }

    /**
     * 刪除潛在客戶
     * @param leadId 潛在客戶ID
     * @returns 操作結果
     */
    async deleteLead(leadId: string) {
        // 檢查潛在客戶是否存在
        const lead = await this.prisma.associationLead.findUnique({
            where: { id: leadId },
        });

        if (!lead) {
            throw new Error('潛在客戶不存在');
        }

        // 刪除潛在客戶
        return this.prisma.associationLead.delete({
            where: { id: leadId },
        });
    }

    /**
     * 檢查用戶是否可以管理潛在客戶
     * @param associationId 協會ID
     * @param userId 用戶ID
     * @returns 是否有權限
     */
    async canManageLeads(associationId: string, userId: string) {
        // 檢查用戶是否是協會擁有者
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
        });

        if (association?.userId === userId) {
            return true;
        }

        // 檢查用戶是否是協會管理員
        const member = await this.prisma.associationMember.findUnique({
            where: {
                associationId_userId: {
                    associationId,
                    userId,
                },
            },
        });

        return member?.role === 'ADMIN';
    }
}
