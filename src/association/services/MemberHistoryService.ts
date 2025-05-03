import { Service } from 'typedi';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { CreateMemberHistoryDto } from '../dtos/member-history.dto';

@Service()
export class MemberHistoryService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * 記錄會員狀態變更
     * @param dto 會員歷史記錄數據
     * @returns 創建的歷史記錄
     */
    async createHistory(dto: CreateMemberHistoryDto) {
        return this.prisma.membershipHistory.create({
            data: {
                association_member_id: dto.association_member_id,
                previous_status: dto.previous_status,
                new_status: dto.new_status,
                changed_by: dto.changed_by,
                reason: dto.reason,
            },
        });
    }

    /**
     * 獲取特定會員的狀態變更歷史
     * @param memberId 會員ID
     * @returns 會員狀態變更歷史列表
     */
    async getMemberHistory(memberId: string) {
        return this.prisma.membershipHistory.findMany({
            where: {
                association_member_id: memberId,
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }

    /**
     * 記錄會員狀態變更的簡化方法
     * @param memberId 會員ID
     * @param previousStatus 先前狀態
     * @param newStatus 新狀態
     * @param changedBy 操作者ID
     * @param reason 原因（可選）
     * @returns 創建的歷史記錄
     */
    async logStatusChange(
        memberId: string,
        previousStatus: MembershipStatus,
        newStatus: MembershipStatus,
        changedBy: string,
        reason?: string,
    ) {
        return this.createHistory({
            association_member_id: memberId,
            previous_status: previousStatus as any,
            new_status: newStatus as any,
            changed_by: changedBy,
            reason,
        });
    }
}
