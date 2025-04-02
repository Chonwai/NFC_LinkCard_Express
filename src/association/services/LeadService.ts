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
