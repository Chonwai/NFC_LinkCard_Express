import { Service } from 'typedi';
import { PrismaClient } from '@prisma/client';
import {
    CreateAffiliationDto,
    UpdateAffiliationDto,
    AffiliationStatus,
} from '../dtos/affiliation.dto';

/**
 * 會員關聯服務
 * 處理用戶與協會之間的關聯關係
 */
@Service()
export class AffiliationService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * 發起會員關聯請求
     * @param associationId 協會ID
     * @param dto 關聯請求數據
     * @returns 創建的關聯記錄
     */
    async createAffiliation(associationId: string, dto: CreateAffiliationDto) {
        // 檢查協會是否存在
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
        });

        if (!association) {
            throw new Error('協會不存在');
        }

        // 檢查用戶是否存在
        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
        });

        if (!user) {
            throw new Error('用戶不存在');
        }

        // 檢查是否已存在關聯
        const existingAffiliation = await this.prisma.associationMember.findUnique({
            where: {
                associationId_userId: {
                    associationId,
                    userId: dto.userId,
                },
            },
        });

        if (existingAffiliation) {
            throw new Error('用戶已是協會成員');
        }

        // 創建關聯記錄
        return this.prisma.associationMember.create({
            data: {
                associationId,
                userId: dto.userId,
                role: 'MEMBER',
                membershipStatus: 'PENDING',
                displayInDirectory: dto.displayInUserProfile || true,
                // 使用一致的meta命名
                meta: {
                    requestMessage: dto.message || '',
                    joinRequestDate: new Date(),
                },
            },
        });
    }

    /**
     * 更新會員關聯狀態
     * @param affiliationId 關聯ID
     * @param dto 更新數據
     * @returns 更新後的關聯
     */
    async updateAffiliation(affiliationId: string, dto: UpdateAffiliationDto) {
        // 找到現有關聯
        const affiliation = await this.prisma.associationMember.findUnique({
            where: { id: affiliationId },
        });

        if (!affiliation) {
            throw new Error('關聯記錄不存在');
        }

        // 更新關聯記錄
        return this.prisma.associationMember.update({
            where: { id: affiliationId },
            data: {
                membershipStatus: dto.status || undefined,
                displayInDirectory:
                    dto.displayInUserProfile !== undefined ? dto.displayInUserProfile : undefined,
                position: dto.position || undefined,
                // 更新metadata
                meta: {
                    ...(affiliation.meta ? JSON.parse(JSON.stringify(affiliation.meta)) : {}),
                    displayMode: dto.displayMode || undefined,
                    updatedAt: new Date(),
                },
            },
        });
    }

    /**
     * 獲取用戶的所有協會關聯
     * @param userId 用戶ID
     * @returns 用戶的協會關聯列表
     */
    async getUserAffiliations(userId: string) {
        return this.prisma.associationMember.findMany({
            where: { userId },
            include: {
                association: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        logo: true,
                    },
                },
            },
        });
    }

    /**
     * 獲取用戶可公開展示的協會關聯
     * @param userId 用戶ID
     * @returns 可公開展示的協會關聯
     */
    async getPublicUserAffiliations(userId: string) {
        return this.prisma.associationMember.findMany({
            where: {
                userId,
                membershipStatus: 'ACTIVE',
                displayInDirectory: true,
            },
            include: {
                association: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        logo: true,
                    },
                },
            },
        });
    }

    /**
     * 檢查用戶是否可以管理協會關聯
     * @param associationId 協會ID
     * @param userId 用戶ID
     * @returns 是否有權限
     */
    async canManageAffiliations(associationId: string, userId: string) {
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
