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

        // 獲取協會會員及其相關資料
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
                        profiles: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                profile_image: true,
                                description: true,
                                is_default: true,
                                badges: {
                                    where: {
                                        associationId: associationId,
                                    },
                                    select: {
                                        id: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // 處理結果，添加更有用的 Profile 信息
        return members.map((member) => {
            const { user, ...memberData } = member;

            // 獲取所有 profiles
            const profiles = user.profiles || [];

            // 1. 尋找與當前協會關聯的 Profile
            let associationProfile = null;
            let defaultProfile = null;

            // 遍歷所有 profiles
            for (const profile of profiles) {
                // 檢查是否與協會相關聯 (通過 badges)
                if (profile.badges && profile.badges.length > 0) {
                    const { badges, ...rest } = profile;
                    associationProfile = rest;
                }

                // 檢查是否為默認 profile
                if (profile.is_default) {
                    const { badges, ...rest } = profile;
                    defaultProfile = rest;
                }
            }

            // 如果沒有找到任何 profile，使用第一個或 null
            let selectedProfile = null;
            if (associationProfile) {
                selectedProfile = associationProfile;
            } else if (defaultProfile) {
                selectedProfile = defaultProfile;
            } else if (profiles.length > 0) {
                const { badges, ...rest } = profiles[0];
                selectedProfile = rest;
            }

            // 返回處理後的結果
            return {
                ...memberData,
                user: {
                    ...user,
                    profiles: undefined, // 移除原始 profiles 數組
                    defaultProfile: selectedProfile, // 按優先順序選擇的 profile
                    hasAssociationProfile: associationProfile !== null, // 是否有協會專屬 profile
                },
            };
        });
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

    /**
     * 獲取用戶管理的協會（擁有者或管理員角色）
     * @param userId 用戶ID
     * @returns 用戶作為擁有者或管理員的協會列表
     */
    async getManagedAssociations(userId: string) {
        // 1. 獲取所有協會
        const allAssociations = await this.getUserAssociations(userId);

        // 2. 過濾出用戶是擁有者或管理員的協會
        const managedAssociations = allAssociations.filter(
            (assoc) => assoc.role === 'OWNER' || assoc.role === 'ADMIN',
        );

        // 3. 對結果進行排序 - 首先是擁有的協會，然後是管理的協會，按名稱字母順序排列
        managedAssociations.sort((a, b) => {
            // 首先按角色排序（OWNER在前）
            if (a.role === 'OWNER' && b.role !== 'OWNER') return -1;
            if (a.role !== 'OWNER' && b.role === 'OWNER') return 1;

            // 然後按協會名稱排序
            return a.association.name.localeCompare(b.association.name);
        });

        return managedAssociations;
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

    /**
     * 根據ID獲取會員信息
     * @param memberId 會員ID
     * @returns 會員信息
     */
    async getMemberById(memberId: string) {
        return this.prisma.associationMember.findUnique({
            where: { id: memberId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        display_name: true,
                    },
                },
                association: {
                    select: {
                        id: true,
                        name: true,
                        userId: true, // 獲取協會擁有者ID
                    },
                },
            },
        });
    }

    /**
     * 獲取用戶在協會中的角色
     * @param associationId 協會ID
     * @param userId 用戶ID
     * @returns 用戶角色（OWNER, ADMIN, MEMBER 或 null）
     */
    async getUserRoleInAssociation(associationId: string, userId: string) {
        // 檢查用戶是否是協會擁有者
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
            select: { userId: true },
        });

        if (association?.userId === userId) {
            return 'OWNER';
        }

        // 檢查用戶是否是協會成員
        const member = await this.prisma.associationMember.findUnique({
            where: {
                associationId_userId: {
                    associationId,
                    userId,
                },
            },
            select: { role: true },
        });

        return member?.role || null;
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
