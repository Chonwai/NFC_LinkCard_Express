import { Service } from 'typedi';
import { PrismaClient, MembershipStatus, MembershipTier, MemberRole } from '@prisma/client';
import { MemberHistoryService } from './MemberHistoryService';
import { AddMemberDto, UpdateMemberDto, SoftDeleteMemberDto } from '../dtos/member.dto';

/**
 * 協會會員管理服務
 */
@Service()
export class MemberService {
    private prisma: PrismaClient;
    private memberHistoryService: MemberHistoryService;

    constructor() {
        this.prisma = new PrismaClient();
        this.memberHistoryService = new MemberHistoryService();
    }

    /**
     * 獲取協會會員列表
     * @param associationId 協會ID
     * @param includeInactive 是否包含非活躍會員
     * @param includeDeleted 是否包含已軟刪除會員
     * @returns 會員列表
     */
    async getMembers(
        associationId: string,
        includeInactive: boolean = false,
        includeDeleted: boolean = false,
    ) {
        const where = {
            associationId,
            ...(includeInactive ? {} : { membershipStatus: MembershipStatus.ACTIVE }),
            ...(!includeDeleted ? { deleted_at: null } : {}),
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
                            where: {
                                is_public: true,
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
     * 獲取已刪除的會員列表
     * @param associationId 協會ID
     * @returns 已刪除的會員列表
     */
    async getDeletedMembers(associationId: string) {
        return this.prisma.associationMember.findMany({
            where: {
                associationId,
                deleted_at: {
                    not: null,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        display_name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                deleted_at: 'desc',
            },
        });
    }

    /**
     * 更新會員狀態
     * @param memberId 會員ID
     * @param status 會員狀態
     * @param userId 操作者ID
     * @param reason 狀態變更原因（可選）
     * @returns 更新後的會員
     */
    async updateMemberStatus(
        memberId: string,
        status: MembershipStatus,
        userId: string,
        reason?: string,
    ) {
        const member = await this.prisma.associationMember.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            throw new Error('會員不存在');
        }

        // 記錄狀態變更
        await this.memberHistoryService.logStatusChange(
            memberId,
            member.membershipStatus,
            status,
            userId,
            reason,
        );

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
     * 軟刪除會員（將會員標記為已刪除而非實際刪除）
     * @param memberId 會員ID
     * @param userId 操作者ID
     * @param dto 包含刪除原因的DTO
     * @returns 刪除結果
     */
    async softDeleteMember(memberId: string, userId: string, dto?: SoftDeleteMemberDto) {
        const member = await this.prisma.associationMember.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            throw new Error('會員不存在');
        }

        // 記錄狀態變更
        await this.memberHistoryService.logStatusChange(
            memberId,
            member.membershipStatus,
            MembershipStatus.TERMINATED,
            userId,
            dto?.reason || '會員已被移除',
        );

        // 更新會員狀態為已終止並設置刪除時間
        await this.prisma.associationMember.update({
            where: { id: memberId },
            data: {
                membershipStatus: MembershipStatus.TERMINATED,
                deleted_at: new Date(),
                meta: {
                    ...(member.meta as any),
                    removal_reason: dto?.reason,
                    removed_at: new Date().toISOString(),
                    removed_by: userId,
                },
            },
        });

        return { success: true, memberId };
    }

    /**
     * 移除會員（實際刪除記錄，不推薦使用，應優先使用軟刪除）
     * @param memberId 會員ID
     * @returns 刪除結果
     * @deprecated 推薦使用 softDeleteMember 代替
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
     * 恢復已軟刪除的會員
     * @param memberId 會員ID
     * @param userId 操作者ID
     * @param reason 恢復原因（可選）
     * @returns 恢復後的會員
     */
    async restoreMember(memberId: string, userId: string, reason?: string) {
        const member = await this.prisma.associationMember.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            throw new Error('會員不存在');
        }

        if (!member.deleted_at) {
            throw new Error('會員未被刪除');
        }

        // 記錄狀態變更
        await this.memberHistoryService.logStatusChange(
            memberId,
            MembershipStatus.TERMINATED,
            MembershipStatus.ACTIVE,
            userId,
            reason || '會員已被恢復',
        );

        return this.prisma.associationMember.update({
            where: { id: memberId },
            data: {
                membershipStatus: MembershipStatus.ACTIVE,
                deleted_at: null,
                meta: {
                    ...(member.meta as any),
                    restored_at: new Date().toISOString(),
                    restored_by: userId,
                    restoration_reason: reason,
                },
            },
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
     * 暫停會員資格
     * @param memberId 會員ID
     * @param userId 操作者ID
     * @param reason 暫停原因（可選）
     * @returns 更新後的會員
     */
    async suspendMember(memberId: string, userId: string, reason?: string) {
        return this.updateMemberStatus(
            memberId,
            MembershipStatus.SUSPENDED,
            userId,
            reason || '會員資格已被暫停',
        );
    }

    /**
     * 取消會員資格
     * @param memberId 會員ID
     * @param userId 操作者ID
     * @param reason 取消原因（可選）
     * @returns 更新後的會員
     */
    async cancelMembership(memberId: string, userId: string, reason?: string) {
        return this.updateMemberStatus(
            memberId,
            MembershipStatus.CANCELLED,
            userId,
            reason || '會員自行取消會員資格',
        );
    }

    /**
     * 終止會員資格
     * @param memberId 會員ID
     * @param userId 操作者ID
     * @param reason 終止原因（可選）
     * @returns 更新後的會員
     */
    async terminateMembership(memberId: string, userId: string, reason?: string) {
        return this.updateMemberStatus(
            memberId,
            MembershipStatus.TERMINATED,
            userId,
            reason || '會員資格已被終止',
        );
    }

    /**
     * 激活會員資格
     * @param memberId 會員ID
     * @param userId 操作者ID
     * @param reason 激活原因（可選）
     * @returns 更新後的會員
     */
    async activateMembership(memberId: string, userId: string, reason?: string) {
        return this.updateMemberStatus(
            memberId,
            MembershipStatus.ACTIVE,
            userId,
            reason || '會員資格已被激活',
        );
    }

    /**
     * 設置會員資格為過期
     * @param memberId 會員ID
     * @param userId 操作者ID
     * @param reason 過期原因（可選）
     * @returns 更新後的會員
     */
    async expireMembership(memberId: string, userId: string, reason?: string) {
        return this.updateMemberStatus(
            memberId,
            MembershipStatus.EXPIRED,
            userId,
            reason || '會員資格已過期',
        );
    }

    /**
     * 檢查並處理過期會員資格
     * 此方法應由定時任務調用
     * @returns 處理結果
     */
    async checkExpiredMemberships() {
        const today = new Date();

        // 查找所有已過期但仍處於活躍狀態的會員
        const expiredMembers = await this.prisma.associationMember.findMany({
            where: {
                renewalDate: {
                    lt: today,
                },
                membershipStatus: MembershipStatus.ACTIVE,
            },
        });

        const results = [];

        // 更新會員狀態為過期
        for (const member of expiredMembers) {
            try {
                await this.updateMemberStatus(
                    member.id,
                    MembershipStatus.EXPIRED,
                    'system', // 系統自動操作
                    '會員資格已自動過期（系統檢測到續費日期已過）',
                );

                results.push({
                    id: member.id,
                    success: true,
                });
            } catch (error) {
                results.push({
                    id: member.id,
                    success: false,
                    error: (error as Error).message,
                });
            }
        }

        return {
            processed: expiredMembers.length,
            results,
        };
    }

    /**
     * 獲取會員狀態變更歷史
     * @param memberId 會員ID
     * @returns 狀態變更歷史列表
     */
    async getMemberStatusHistory(memberId: string) {
        return this.memberHistoryService.getMemberHistory(memberId);
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

    /**
     * 處理會員續費
     * @param memberId 會員ID
     * @param months 續費月數
     * @param userId 操作者ID
     * @param reason 續費原因（可選）
     * @returns 續費後的會員記錄
     */
    async renewMembership(memberId: string, months: number, userId: string, reason?: string) {
        const member = await this.prisma.associationMember.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            throw new Error('會員不存在');
        }

        // 計算新的續費日期
        const currentDate = new Date();
        let newRenewalDate: Date;

        // 如果會員已過期或沒有設置續費日期，從當前日期開始計算
        if (!member.renewalDate || member.renewalDate < currentDate) {
            newRenewalDate = new Date();
        } else {
            // 否則從現有續費日期開始添加
            newRenewalDate = new Date(member.renewalDate);
        }

        // 添加續費月數
        newRenewalDate.setMonth(newRenewalDate.getMonth() + months);

        // 如果會員不是活躍狀態，記錄狀態變更
        if (member.membershipStatus !== MembershipStatus.ACTIVE) {
            await this.memberHistoryService.logStatusChange(
                memberId,
                member.membershipStatus,
                MembershipStatus.ACTIVE,
                userId,
                reason || `會員續費 ${months} 個月，狀態已更新為活躍`,
            );
        } else {
            // 否則僅記錄續費活動
            await this.memberHistoryService.logStatusChange(
                memberId,
                MembershipStatus.ACTIVE,
                MembershipStatus.ACTIVE,
                userId,
                reason || `會員續費 ${months} 個月`,
            );
        }

        // 準備元數據更新
        const metaData = typeof member.meta === 'object' ? member.meta : {};
        const updatedMeta = {
            ...metaData,
            last_renewal: {
                date: currentDate.toISOString(),
                months: months,
                by: userId,
                reason: reason || `續費 ${months} 個月`,
            },
        };

        // 更新會員記錄
        return this.prisma.associationMember.update({
            where: { id: memberId },
            data: {
                membershipStatus: MembershipStatus.ACTIVE,
                renewalDate: newRenewalDate,
                meta: updatedMeta,
            },
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
}
