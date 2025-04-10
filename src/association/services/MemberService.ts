import { Service } from 'typedi';
import { PrismaClient, MembershipStatus, MembershipTier } from '@prisma/client';
import { AddMemberDto, UpdateMemberDto } from '../dtos/member.dto';

/**
 * 協會會員管理服務
 */
@Service()
export class MemberService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * 獲取協會會員列表
     * @param associationId 協會ID
     * @param includeInactive 是否包含未激活會員
     * @returns 會員列表
     */
    async getMembers(associationId: string, includeInactive: boolean = false) {
        const where = {
            associationId,
            ...(includeInactive ? {} : { membershipStatus: MembershipStatus.ACTIVE }),
        };

        const members = await this.prisma.associationMember.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        display_name: true,
                        avatar: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return members;
    }

    /**
     * 更新會員狀態
     * @param memberId 會員ID
     * @param status 會員狀態
     * @returns 更新後的會員
     */
    async updateMemberStatus(memberId: string, status: MembershipStatus) {
        const member = await this.prisma.associationMember.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            throw new Error('會員不存在');
        }

        return this.prisma.associationMember.update({
            where: { id: memberId },
            data: { membershipStatus: status },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        display_name: true,
                    },
                },
            },
        });
    }

    /**
     * 移除協會會員
     * @param memberId 會員ID
     * @returns 刪除結果
     */
    async removeMember(memberId: string) {
        const member = await this.prisma.associationMember.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            throw new Error('會員不存在');
        }

        await this.prisma.associationMember.delete({
            where: { id: memberId },
        });

        return { success: true, memberId };
    }

    /**
     * 更新會員角色
     * @param memberId 會員ID
     * @param role 新角色
     * @returns 更新後的會員
     */
    async updateMemberRole(memberId: string, role: string) {
        const member = await this.prisma.associationMember.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            throw new Error('會員不存在');
        }

        return this.prisma.associationMember.update({
            where: { id: memberId },
            data: { role: role as any },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        display_name: true,
                    },
                },
            },
        });
    }

    /**
     * 更新會員在目錄中的顯示設置
     * @param memberId 會員ID
     * @param displayInDirectory 是否在目錄中顯示
     * @returns 更新後的會員
     */
    async updateDirectoryVisibility(memberId: string, displayInDirectory: boolean) {
        const member = await this.prisma.associationMember.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            throw new Error('會員不存在');
        }

        return this.prisma.associationMember.update({
            where: { id: memberId },
            data: { displayInDirectory },
        });
    }

    /**
     * 獲取用戶加入的所有協會
     * @param userId 用戶ID
     * @returns 協會列表，包括用戶是會員和擁有的協會
     */
    async getUserAssociations(userId: string) {
        // 查詢用戶作為會員的協會
        const memberships = await this.prisma.associationMember.findMany({
            where: {
                userId,
                membershipStatus: MembershipStatus.ACTIVE,
            },
            include: {
                association: true,
            },
        });

        // 查詢用戶作為擁有者的協會
        const ownedAssociations = await this.prisma.association.findMany({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });

        // 將擁有的協會轉換為與會員協會相同的格式，並設置role為OWNER
        const ownedAssociationsFormatted = ownedAssociations.map((association) => ({
            id: `owner-${association.id}`, // 添加前綴避免ID衝突
            associationId: association.id,
            userId,
            role: 'OWNER', // 標記為擁有者
            membershipTier: 'EXECUTIVE' as MembershipTier, // 使用最高級別
            membershipStatus: 'ACTIVE' as MembershipStatus,
            displayInDirectory: true,
            position: '創始人/擁有者', // 默認職位
            createdAt: association.createdAt,
            updatedAt: association.updatedAt,
            joinDate: association.createdAt,
            association,
        }));

        // 合併會員和擁有的協會列表
        return [...ownedAssociationsFormatted, ...memberships];
    }

    async findByAssociationId(associationId: string) {
        return this.prisma.associationMember.findMany({
            where: { associationId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        display_name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });
    }

    async addMember(associationId: string, dto: AddMemberDto) {
        const { userId, ...memberData } = dto;

        return this.prisma.associationMember.create({
            data: {
                ...memberData,
                association: { connect: { id: associationId } },
                user: { connect: { id: userId } },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
    }

    async updateMember(memberId: string, dto: UpdateMemberDto) {
        return this.prisma.associationMember.update({
            where: { id: memberId },
            data: dto,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
    }

    async canUserManageMembers(associationId: string, userId: string) {
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

    async findAssociationsByUserId(userId: string) {
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
}
