import { Service } from 'typedi';
import prisma from '../../lib/prisma';
import { generateSlug } from '../../utils/slugGenerator';
import { ProfileBadgeService } from './ProfileBadgeService';
import {
    LeadProfilePrefillDataDto,
    ProfilePrefillOptionsResponseDto,
    CreateAssociationProfileWithLeadDto,
    ProfileCreationResponseDto,
} from '../dtos/lead-profile.dto';

@Service()
export class ProfilePrefillService {
    constructor(private profileBadgeService: ProfileBadgeService) {}

    /**
     * 🆕 獲取購買後的Profile創建選項和預填數據
     * @param userId 用戶ID
     * @param orderId 購買訂單ID
     * @returns Profile創建選項和預填數據
     */
    async getProfilePrefillOptions(
        userId: string,
        orderId: string,
    ): Promise<ProfilePrefillOptionsResponseDto> {
        // 1. 驗證訂單所有權
        const order = await prisma.purchaseOrder.findUnique({
            where: { id: orderId },
            include: {
                association: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                pricingPlan: {
                    select: {
                        displayName: true,
                        membershipTier: true,
                    },
                },
            },
        });

        if (!order || order.userId !== userId) {
            throw new Error('訂單不存在或無權限訪問');
        }

        if (order.status !== 'PAID') {
            throw new Error('訂單尚未完成支付');
        }

        // 2. 查找關聯的Lead記錄
        const lead = await prisma.associationLead.findFirst({
            where: {
                purchaseOrderId: orderId,
                userId: userId,
                source: 'PURCHASE_INTENT',
            },
        });

        // 3. 檢查用戶是否已有協會專屬Profile
        const existingAssociationProfile = await prisma.profile.findFirst({
            where: {
                user_id: userId,
                name: {
                    contains: order.association.name,
                },
                is_default: false,
            },
        });

        const shouldCreateProfile = !existingAssociationProfile;

        // 4. 準備預填數據
        const prefillData: LeadProfilePrefillDataDto = {
            firstName: lead?.firstName || '',
            lastName: lead?.lastName || '',
            organization: lead?.organization || '',
            email: lead?.email || '',
            phone: lead?.phone || '',
            suggestedName: lead
                ? `${lead.firstName} ${lead.lastName}`
                : `${order.association.name} 會員`,
            suggestedDescription: this.generateSuggestedDescription(
                lead?.organization || undefined,
                order.association.name,
                order.pricingPlan.membershipTier,
            ),
            purchaseContext: {
                associationName: order.association.name,
                membershipTier: order.pricingPlan.membershipTier,
                purchaseDate: order.paidAt?.toLocaleDateString('zh-TW') || '今日',
            },
        };

        // 5. 構建創建選項
        const creationOptions = {
            skipCreation: {
                title: '稍後創建',
                description: '您可以隨時在會員中心創建協會專屬Profile',
                action: 'SKIP_PROFILE_CREATION' as const,
            },
            createWithDefaults: {
                title: '快速創建',
                description: '使用推薦設定快速創建您的協會Profile',
                action: 'CREATE_WITH_DEFAULTS' as const,
                previewData: {
                    name: prefillData.suggestedName,
                    description: prefillData.suggestedDescription || '',
                },
            },
            createCustom: {
                title: '自定義創建',
                description: '自定義Profile名稱和描述',
                action: 'CREATE_CUSTOM' as const,
                form: {
                    defaultName: prefillData.suggestedName,
                    defaultDescription: prefillData.suggestedDescription || '',
                },
            },
        };

        return {
            shouldCreateProfile,
            prefillData,
            creationOptions,
            nextStep: {
                action: shouldCreateProfile ? 'SHOW_PROFILE_OPTIONS' : 'REDIRECT_TO_DASHBOARD',
                url: shouldCreateProfile ? undefined : `${process.env.FRONTEND_URL}/dashboard`,
            },
        };
    }

    /**
     * 🆕 基於Lead數據創建協會Profile
     * @param userId 用戶ID
     * @param dto 創建Profile的DTO
     * @returns 創建的Profile信息
     */
    async createProfileWithLeadData(
        userId: string,
        dto: CreateAssociationProfileWithLeadDto,
    ): Promise<ProfileCreationResponseDto> {
        // 1. 驗證Lead和訂單
        const lead = await prisma.associationLead.findUnique({
            where: { id: dto.leadId },
            include: {
                purchaseOrder: {
                    include: {
                        association: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                badgeImage: true,
                            },
                        },
                    },
                },
            },
        });

        if (!lead || lead.userId !== userId) {
            throw new Error('Lead記錄不存在或無權限訪問');
        }

        if (!lead.purchaseOrder || lead.purchaseOrder.id !== dto.orderId) {
            throw new Error('訂單信息不匹配');
        }

        if (lead.purchaseOrder.status !== 'PAID') {
            throw new Error('訂單尚未完成支付');
        }

        // 2. 檢查是否已存在同名Profile
        const existingProfile = await prisma.profile.findFirst({
            where: {
                user_id: userId,
                name: dto.name,
            },
        });

        if (existingProfile) {
            throw new Error('已存在同名的Profile，請選擇其他名稱');
        }

        // 3. 生成Profile slug
        const slug = await generateSlug(dto.name);

        // 4. 事務處理：創建Profile和徽章
        const result = await prisma.$transaction(async (tx) => {
            // 4.1 創建Profile
            const profile = await tx.profile.create({
                data: {
                    name: dto.name,
                    slug,
                    user_id: userId,
                    description: dto.description,
                    is_public: dto.isPublic ?? true,
                    is_default: false,
                    meta: {
                        createdFrom: 'LEAD_PURCHASE',
                        leadId: dto.leadId,
                        orderId: dto.orderId,
                        associationId: lead.purchaseOrder?.associationId,
                        createdAt: new Date().toISOString(),
                        ...dto.customization,
                    },
                },
            });

            // 4.2 創建協會徽章
            let badge = null;
            if (lead.purchaseOrder?.association) {
                try {
                    badge = await this.profileBadgeService.createProfileBadge(
                        {
                            profileId: profile.id,
                            associationId: lead.purchaseOrder.association.id,
                            isVisible: dto.customization?.associationBadge ?? true,
                            displayMode: 'FULL',
                            displayOrder: 0,
                        },
                        userId,
                    );
                } catch (badgeError) {
                    console.error('創建協會徽章失敗:', badgeError);
                    // 徽章創建失敗不影響Profile創建
                }
            }

            return { profile, badge };
        });

        // 5. 構建響應
        const profileUrl = `${process.env.FRONTEND_URL}/${result.profile.slug}`;

        return {
            success: true,
            profile: {
                id: result.profile.id,
                name: result.profile.name,
                slug: result.profile.slug,
                description: result.profile.description || undefined,
                isPublic: result.profile.is_public,
                url: profileUrl,
            },
            badge: result.badge
                ? {
                      id: result.badge.id,
                      isVisible: result.badge.isVisible,
                      displayMode: result.badge.displayMode,
                  }
                : undefined,
            nextStep: {
                action: 'VIEW_PROFILE',
                url: profileUrl,
            },
        };
    }

    /**
     * 🆕 生成建議的Profile描述
     * @param organization 組織名稱
     * @param associationName 協會名稱
     * @param membershipTier 會員等級
     * @returns 建議的描述
     */
    private generateSuggestedDescription(
        organization?: string,
        associationName?: string,
        membershipTier?: string,
    ): string {
        const parts: string[] = [];

        if (organization) {
            parts.push(`來自 ${organization}`);
        }

        if (associationName) {
            const tierText = this.getMembershipTierText(membershipTier);
            parts.push(`${associationName}${tierText}`);
        }

        if (parts.length === 0) {
            return `專業人士 | ${associationName || '協會'}會員`;
        }

        return parts.join(' | ');
    }

    /**
     * 🆕 獲取會員等級顯示文本
     * @param tier 會員等級
     * @returns 顯示文本
     */
    private getMembershipTierText(tier?: string): string {
        switch (tier) {
            case 'BASIC':
                return '基礎會員';
            case 'PREMIUM':
                return '高級會員';
            case 'EXECUTIVE':
                return '執行會員';
            default:
                return '會員';
        }
    }

    /**
     * 🆕 獲取用戶在特定協會的Lead記錄
     * @param userId 用戶ID
     * @param associationId 協會ID
     * @returns Lead記錄列表
     */
    async getUserLeadsForAssociation(userId: string, associationId: string) {
        return prisma.associationLead.findMany({
            where: {
                userId,
                associationId,
            },
            include: {
                purchaseOrder: {
                    select: {
                        id: true,
                        orderNumber: true,
                        status: true,
                        paidAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
}
