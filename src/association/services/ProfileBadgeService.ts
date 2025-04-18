import { Service } from 'typedi';
import { PrismaClient } from '@prisma/client';
import {
    CreateProfileBadgeDto,
    UpdateProfileBadgeDto,
    ProfileBadgeResponseDto,
} from '../dtos/profile-badge.dto';
import { BadgeDisplayMode } from '@prisma/client';

@Service()
export class ProfileBadgeService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    // 創建個人檔案徽章
    async createProfileBadge(dto: CreateProfileBadgeDto): Promise<ProfileBadgeResponseDto> {
        // 檢查個人檔案是否存在
        const profile = await this.prisma.profile.findUnique({
            where: { id: dto.profileId },
        });

        if (!profile) {
            throw new Error('個人檔案不存在');
        }

        // 檢查協會是否存在
        const association = await this.prisma.association.findUnique({
            where: { id: dto.associationId },
        });

        if (!association) {
            throw new Error('協會不存在');
        }

        // 檢查用戶是否為協會成員
        const membership = await this.prisma.associationMember.findUnique({
            where: {
                associationId_userId: {
                    associationId: dto.associationId,
                    userId: dto.userId,
                },
            },
        });

        if (!membership) {
            throw new Error('用戶不是協會成員');
        }

        // 檢查徽章是否已存在
        const existingBadge = await this.prisma.profileBadge.findUnique({
            where: {
                profileId_associationId: {
                    profileId: dto.profileId,
                    associationId: dto.associationId,
                },
            },
        });

        if (existingBadge) {
            throw new Error('此徽章已添加到個人檔案中');
        }

        // 創建徽章
        const badge = await this.prisma.profileBadge.create({
            data: {
                profileId: dto.profileId,
                associationId: dto.associationId,
                displayOrder: dto.displayOrder || 0,
                isVisible: dto.isVisible === undefined ? true : dto.isVisible,
                customLabel: dto.customLabel,
                customColor: dto.customColor,
                customSize: dto.customSize,
                displayMode: dto.displayMode || BadgeDisplayMode.FULL,
            },
            include: {
                association: true,
            },
        });

        return {
            id: badge.id,
            profileId: badge.profileId,
            associationId: badge.associationId,
            associationName: association.name,
            associationSlug: association.slug,
            associationLogo: association.logo || undefined,
            displayOrder: badge.displayOrder,
            isVisible: badge.isVisible,
            customLabel: badge.customLabel || undefined,
            customColor: badge.customColor || undefined,
            customSize: badge.customSize || undefined,
            displayMode: badge.displayMode,
            createdAt: badge.createdAt,
            updatedAt: badge.updatedAt,
        };
    }

    // 獲取個人檔案的所有徽章
    async getProfileBadges(profileId: string): Promise<ProfileBadgeResponseDto[]> {
        const badges = await this.prisma.profileBadge.findMany({
            where: {
                profileId,
            },
            include: {
                association: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logo: true,
                    },
                },
            },
            orderBy: {
                displayOrder: 'asc',
            },
        });

        return badges.map((badge) => ({
            id: badge.id,
            profileId: badge.profileId,
            associationId: badge.associationId,
            associationName: badge.association.name,
            associationSlug: badge.association.slug,
            associationLogo: badge.association.logo || undefined,
            isVisible: badge.isVisible,
            displayOrder: badge.displayOrder,
            customLabel: badge.customLabel || undefined,
            customColor: badge.customColor || undefined,
            customSize: badge.customSize || undefined,
            displayMode: badge.displayMode,
            createdAt: badge.createdAt,
            updatedAt: badge.updatedAt,
        }));
    }

    // 獲取用戶可用的徽章（用戶是成員的所有協會）
    async getAvailableBadges(
        userId: string,
        profileId: string,
    ): Promise<ProfileBadgeResponseDto[]> {
        // 檢查個人檔案是否屬於該用戶
        const profile = await this.prisma.profile.findUnique({
            where: { id: profileId },
            select: { user_id: true },
        });

        if (!profile || profile.user_id !== userId) {
            throw new Error('無權訪問該個人檔案');
        }

        // 獲取用戶已經是成員的所有協會
        const members = await this.prisma.associationMember.findMany({
            where: {
                userId,
                membershipStatus: 'ACTIVE', // 只獲取活躍的成員資格
            },
            include: {
                association: true,
            },
        });

        // 獲取個人檔案當前的徽章
        const existingBadges = await this.prisma.profileBadge.findMany({
            where: { profileId },
            select: { associationId: true },
        });

        const existingAssociationIds = new Set(existingBadges.map((b) => b.associationId));

        // 過濾掉已經添加的協會
        return members
            .filter((member) => !existingAssociationIds.has(member.associationId))
            .map((member) => ({
                id: '', // 尚未創建，沒有ID
                profileId,
                associationId: member.associationId,
                associationName: member.association.name,
                associationSlug: member.association.slug,
                associationLogo: member.association.logo || undefined,
                displayOrder: 0,
                isVisible: true,
                customLabel: undefined,
                customColor: undefined,
                customSize: undefined,
                displayMode: BadgeDisplayMode.FULL,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));
    }

    // 更新個人檔案徽章
    async updateProfileBadge(
        id: string,
        userId: string,
        dto: UpdateProfileBadgeDto,
    ): Promise<ProfileBadgeResponseDto> {
        // 獲取徽章并檢查權限
        const badge = await this.getProfileBadgeById(id);
        const profile = await this.getProfileOwner(badge.profileId);

        if (profile.user_id !== userId) {
            throw new Error('無權更新該徽章');
        }

        // 更新徽章
        const updatedBadge = await this.prisma.profileBadge.update({
            where: { id },
            data: {
                displayOrder: dto.displayOrder,
                isVisible: dto.isVisible,
                customLabel: dto.customLabel,
                customColor: dto.customColor,
                customSize: dto.customSize,
                displayMode: dto.displayMode,
            },
            include: {
                association: true,
            },
        });

        return {
            id: updatedBadge.id,
            profileId: updatedBadge.profileId,
            associationId: updatedBadge.associationId,
            associationName: updatedBadge.association.name,
            associationSlug: updatedBadge.association.slug,
            associationLogo: updatedBadge.association.logo || undefined,
            displayOrder: updatedBadge.displayOrder,
            isVisible: updatedBadge.isVisible,
            customLabel: updatedBadge.customLabel || undefined,
            customColor: updatedBadge.customColor || undefined,
            customSize: updatedBadge.customSize || undefined,
            displayMode: updatedBadge.displayMode,
            createdAt: updatedBadge.createdAt,
            updatedAt: updatedBadge.updatedAt,
        };
    }

    // 批量更新個人檔案徽章
    async batchUpdateProfileBadges(
        profileId: string,
        userId: string,
        badges: UpdateProfileBadgeDto[],
    ): Promise<ProfileBadgeResponseDto[]> {
        // 檢查個人檔案是否屬於該用戶
        const profile = await this.prisma.profile.findUnique({
            where: { id: profileId },
            select: { user_id: true },
        });

        if (!profile || profile.user_id !== userId) {
            throw new Error('無權訪問該個人檔案');
        }

        // 獲取所有徽章
        const existingBadges = await this.prisma.profileBadge.findMany({
            where: { profileId },
            include: {
                association: true,
            },
        });

        // 創建一個更新操作列表
        const updatePromises = existingBadges.map(async (badge: any, index: number) => {
            const dto = badges[index] || { displayOrder: index };

            return this.prisma.profileBadge.update({
                where: { id: badge.id },
                data: {
                    displayOrder: dto.displayOrder !== undefined ? dto.displayOrder : index,
                    isVisible: dto.isVisible !== undefined ? dto.isVisible : badge.isVisible,
                    customLabel:
                        dto.customLabel !== undefined ? dto.customLabel : badge.customLabel,
                    customColor:
                        dto.customColor !== undefined ? dto.customColor : badge.customColor,
                    customSize: dto.customSize !== undefined ? dto.customSize : badge.customSize,
                    displayMode:
                        dto.displayMode !== undefined ? dto.displayMode : badge.displayMode,
                },
                include: {
                    association: true,
                },
            });
        });

        // 執行所有更新操作
        const updatedBadges = await Promise.all(updatePromises);

        return updatedBadges.map((badge: any) => ({
            id: badge.id,
            profileId: badge.profileId,
            associationId: badge.associationId,
            associationName: badge.association.name,
            associationSlug: badge.association.slug,
            associationLogo: badge.association.logo || undefined,
            displayOrder: badge.displayOrder,
            isVisible: badge.isVisible,
            customLabel: badge.customLabel || undefined,
            customColor: badge.customColor || undefined,
            customSize: badge.customSize || undefined,
            displayMode: badge.displayMode,
            createdAt: badge.createdAt,
            updatedAt: badge.updatedAt,
        }));
    }

    // 刪除個人檔案徽章
    async deleteProfileBadge(id: string, userId: string): Promise<void> {
        // 獲取徽章并檢查權限
        const badge = await this.getProfileBadgeById(id);
        const profile = await this.getProfileOwner(badge.profileId);

        if (profile.user_id !== userId) {
            throw new Error('無權刪除該徽章');
        }

        // 刪除徽章
        await this.prisma.profileBadge.delete({
            where: { id },
        });
    }

    // 輔助方法：獲取徽章詳情
    async getProfileBadgeById(id: string) {
        const badge = await this.prisma.profileBadge.findUnique({
            where: { id },
        });

        if (!badge) {
            throw new Error('徽章不存在');
        }

        return badge;
    }

    // 輔助方法：獲取個人檔案擁有者
    async getProfileOwner(profileId: string) {
        const profile = await this.prisma.profile.findUnique({
            where: { id: profileId },
            select: { user_id: true },
        });

        if (!profile) {
            throw new Error('個人檔案不存在');
        }

        return profile;
    }
}
