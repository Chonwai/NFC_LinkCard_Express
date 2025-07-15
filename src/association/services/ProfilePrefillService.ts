import { Service } from 'typedi';
import prisma from '../../lib/prisma';
import { generateSlug } from '../../utils/slugGenerator';
import { ProfileBadgeService } from './ProfileBadgeService';
import { PurchaseIntentDataService } from '../../auth/services/PurchaseIntentDataService'; // 🆕 新增
import {
    LeadProfilePrefillDataDto,
    ProfilePrefillOptionsResponseDto,
    CreateAssociationProfileWithLeadDto,
    ProfileCreationResponseDto,
} from '../dtos/lead-profile.dto';
import { LinkType, LinkPlatform } from '@prisma/client';

@Service()
export class ProfilePrefillService {
    constructor(
        private profileBadgeService: ProfileBadgeService,
        private purchaseIntentDataService: PurchaseIntentDataService, // 🆕 新增
    ) {}

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
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
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

        // 2. 🆕 查找關聯的購買意向數據記錄（替代原有的Lead記錄）
        let purchaseIntentData = await this.purchaseIntentDataService.findByOrderId(orderId);

        // 🆕 如果當前訂單沒有關聯購買意向數據，查找該用戶在同一協會的最新記錄
        if (!purchaseIntentData) {
            purchaseIntentData = await this.purchaseIntentDataService.findByUserAndAssociation(
                userId,
                order.associationId,
            );
        }

        // 🔄 為了保持API契約兼容，創建lead格式的數據對象
        let lead = null;
        if (purchaseIntentData) {
            lead = {
                id: purchaseIntentData.id,
                firstName: purchaseIntentData.firstName,
                lastName: purchaseIntentData.lastName,
                email: purchaseIntentData.email,
                phone: purchaseIntentData.phone,
                organization: purchaseIntentData.organization,
                message: purchaseIntentData.message,
                source: 'PURCHASE_INTENT',
                createdAt: purchaseIntentData.createdAt,
                updatedAt: purchaseIntentData.updatedAt,
            };
        } else {
            // 🆕 備用方案：如果沒有 PurchaseIntentData，查找 AssociationLead
            console.log('🔍 PurchaseIntentData not found, trying AssociationLead fallback...');
            const associationLead = await prisma.associationLead.findFirst({
                where: {
                    associationId: order.associationId,
                    email: order.user.email, // 使用訂單中的用戶郵箱匹配
                },
                orderBy: {
                    createdAt: 'desc', // 獲取最新的記錄
                },
            });

            if (associationLead) {
                console.log('✅ Found AssociationLead fallback data:', {
                    id: associationLead.id,
                    email: associationLead.email,
                    firstName: associationLead.firstName,
                });
                lead = {
                    id: associationLead.id,
                    firstName: associationLead.firstName || '',
                    lastName: associationLead.lastName || '',
                    email: associationLead.email || '',
                    phone: associationLead.phone || '',
                    organization: associationLead.organization || '',
                    message: associationLead.message || '',
                    source: 'ASSOCIATION_LEAD',
                    createdAt: associationLead.createdAt,
                    updatedAt: associationLead.updatedAt,
                };
            } else {
                console.log('❌ No AssociationLead found either');
            }
        }

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
     * 🆕 基於購買意向數據創建協會Profile
     * @param userId 用戶ID
     * @param dto 創建Profile的數據
     * @returns 創建的Profile信息
     */
    async createProfileWithLeadData(
        userId: string,
        dto: CreateAssociationProfileWithLeadDto,
    ): Promise<ProfileCreationResponseDto> {
        // 1. 🆕 查找購買意向數據記錄（替代原有的Lead記錄）
        let purchaseIntentData;
        let orderInfo;

        if (dto.leadId) {
            // 如果提供了leadId，實際上是購買意向數據ID
            purchaseIntentData = await prisma.purchaseIntentData.findUnique({
                where: { id: dto.leadId },
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
            });

            if (!purchaseIntentData || purchaseIntentData.userId !== userId) {
                throw new Error('購買意向數據不存在或無權限訪問');
            }

            // 查找關聯的訂單信息
            if (purchaseIntentData.purchaseOrderId) {
                orderInfo = await prisma.purchaseOrder.findUnique({
                    where: { id: purchaseIntentData.purchaseOrderId },
                });

                if (orderInfo && orderInfo.id !== dto.orderId) {
                    throw new Error('訂單信息不匹配');
                }
            }
        } else {
            // 如果沒有提供leadId，根據orderId和userId查找
            purchaseIntentData = await this.purchaseIntentDataService.findByOrderId(dto.orderId);

            if (!purchaseIntentData || purchaseIntentData.userId !== userId) {
                // 🆕 備用方案：如果沒有 PurchaseIntentData，嘗試通過 orderId 查找訂單，然後用 AssociationLead
                console.log(
                    '🔍 PurchaseIntentData not found, trying AssociationLead fallback for orderId:',
                    dto.orderId,
                );

                const orderForLead = await prisma.purchaseOrder.findUnique({
                    where: { id: dto.orderId },
                    include: {
                        association: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                logo: true,
                            },
                        },
                        user: {
                            select: {
                                id: true,
                                email: true,
                            },
                        },
                    },
                });

                if (!orderForLead || orderForLead.userId !== userId) {
                    throw new Error('訂單不存在或無權限訪問');
                }

                // 查找對應的 AssociationLead
                const associationLead = await prisma.associationLead.findFirst({
                    where: {
                        associationId: orderForLead.associationId,
                        email: orderForLead.user.email,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                });

                if (!associationLead) {
                    throw new Error('找不到相關的Lead數據或購買意向數據');
                }

                console.log('✅ Found AssociationLead fallback for profile creation:', {
                    id: associationLead.id,
                    email: associationLead.email,
                });

                // 🔄 將 AssociationLead 轉換為 purchaseIntentData 格式
                purchaseIntentData = {
                    id: associationLead.id,
                    userId: userId,
                    associationId: associationLead.associationId,
                    firstName: associationLead.firstName || '',
                    lastName: associationLead.lastName || '',
                    email: associationLead.email || '',
                    phone: associationLead.phone || '',
                    organization: associationLead.organization || '',
                    message: associationLead.message || '',
                    purchaseOrderId: dto.orderId,
                    createdAt: associationLead.createdAt,
                    updatedAt: associationLead.updatedAt,
                    association: {
                        id: orderForLead.association.id,
                        name: orderForLead.association.name,
                        slug: orderForLead.association.slug,
                        badgeImage: orderForLead.association.logo, // 使用 logo 作為 badgeImage
                    },
                } as any; // 使用 type assertion 來匹配預期的類型

                orderInfo = orderForLead;
            } else {
                // 獲取協會信息
                purchaseIntentData = await prisma.purchaseIntentData.findUnique({
                    where: { id: purchaseIntentData.id },
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
                });
            }
        }

        // 🔄 為了保持API契約兼容，創建lead格式的數據對象
        const lead = {
            id: purchaseIntentData!.id,
            firstName: purchaseIntentData!.firstName,
            lastName: purchaseIntentData!.lastName,
            email: purchaseIntentData!.email,
            phone: purchaseIntentData!.phone,
            organization: purchaseIntentData!.organization,
            message: purchaseIntentData!.message,
            userId: purchaseIntentData!.userId,
            createdAt: purchaseIntentData!.createdAt,
            updatedAt: purchaseIntentData!.updatedAt,
            purchaseOrder: orderInfo
                ? {
                      id: orderInfo.id,
                      association: purchaseIntentData!.association,
                  }
                : null,
        };

        // 2. 🆕 驗證訂單狀態（如果有關聯訂單）
        if (orderInfo && orderInfo.status !== 'PAID') {
            throw new Error('訂單尚未完成支付');
        }

        // 3. 檢查是否已存在同名Profile
        const existingProfile = await prisma.profile.findFirst({
            where: {
                user_id: userId,
                name: dto.name,
            },
        });

        if (existingProfile) {
            throw new Error('已存在同名的Profile，請選擇其他名稱');
        }

        // 4. 生成Profile slug
        const slug = await generateSlug(dto.name);

        // 5. 🆕 事務處理：創建Profile、徽章和自動Links
        const result = await prisma.$transaction(async (tx) => {
            // 5.1 創建Profile
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
                        leadId: lead.id, // 使用購買意向數據ID
                        orderId: dto.orderId,
                        associationId: purchaseIntentData!.associationId,
                        createdAt: new Date().toISOString(),
                        ...dto.customization,
                    },
                },
            });

            // 5.2 創建協會徽章
            let badge = null;
            if (purchaseIntentData!.association) {
                try {
                    badge = await this.profileBadgeService.createProfileBadge(
                        {
                            profileId: profile.id,
                            associationId: purchaseIntentData!.association.id,
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

            // 5.3 🆕 根據Lead數據自動創建Links
            const createdLinks = [];
            let displayOrder = 0;

            // 🔍 調試：檢查Lead數據
            console.log('🔍 準備創建Links，Lead數據:', {
                leadId: lead.id,
                email: lead.email,
                phone: lead.phone,
                organization: lead.organization,
                firstName: lead.firstName,
                lastName: lead.lastName,
            });

            try {
                // 創建電子郵件Link
                if (lead.email) {
                    console.log('📧 創建電子郵件Link:', lead.email);
                    const emailLink = await tx.link.create({
                        data: {
                            title: '電子郵件',
                            url: `mailto:${lead.email}`,
                            type: LinkType.CUSTOM,
                            platform: LinkPlatform.EMAIL,
                            is_active: true,
                            display_order: displayOrder++,
                            user_id: userId,
                            profile_id: profile.id,
                            meta: {
                                createdFrom: 'LEAD_PREFILL',
                                originalValue: lead.email,
                            },
                        },
                    });
                    createdLinks.push(emailLink);
                }

                // 創建電話Link
                if (lead.phone) {
                    console.log('📞 創建電話Link:', lead.phone);
                    // 處理電話號碼格式
                    let phoneUrl = lead.phone;
                    if (!phoneUrl.startsWith('tel:')) {
                        phoneUrl = `tel:${lead.phone}`;
                    }

                    const phoneLink = await tx.link.create({
                        data: {
                            title: '電話',
                            url: phoneUrl,
                            type: LinkType.CUSTOM,
                            platform: LinkPlatform.PHONE,
                            is_active: true,
                            display_order: displayOrder++,
                            user_id: userId,
                            profile_id: profile.id,
                            meta: {
                                createdFrom: 'LEAD_PREFILL',
                                originalValue: lead.phone,
                            },
                        },
                    });
                    createdLinks.push(phoneLink);
                }

                // 創建組織/公司網站Link（如果organization看起來像URL）
                if (lead.organization) {
                    console.log('🏢 檢查organization:', lead.organization);
                    const isUrl = /^https?:\/\/.+/.test(lead.organization);
                    console.log('🔗 是否為URL:', isUrl);
                    if (isUrl) {
                        console.log('🌐 創建公司網站Link:', lead.organization);
                        const websiteLink = await tx.link.create({
                            data: {
                                title: '公司網站',
                                url: lead.organization,
                                type: LinkType.CUSTOM,
                                platform: LinkPlatform.WEBSITE,
                                is_active: true,
                                display_order: displayOrder++,
                                user_id: userId,
                                profile_id: profile.id,
                                meta: {
                                    createdFrom: 'LEAD_PREFILL',
                                    originalValue: lead.organization,
                                },
                            },
                        });
                        createdLinks.push(websiteLink);
                    } else {
                        console.log('🏭 創建公司佔位符Link:', lead.organization);
                        // 如果不是URL，可能是公司名稱，創建為自定義Link
                        const companyLink = await tx.link.create({
                            data: {
                                title: lead.organization,
                                url: '#', // 佔位符URL
                                type: LinkType.CUSTOM,
                                platform: LinkPlatform.WEBSITE,
                                is_active: false, // 默認不啟用，需要用戶手動設置URL
                                display_order: displayOrder++,
                                user_id: userId,
                                profile_id: profile.id,
                                meta: {
                                    createdFrom: 'LEAD_PREFILL',
                                    originalValue: lead.organization,
                                    note: '需要設置正確的網站URL',
                                },
                            },
                        });
                        createdLinks.push(companyLink);
                    }
                }
            } catch (linkError) {
                console.error('創建Links失敗:', linkError);
                // Links創建失敗不影響Profile創建
            }

            console.log('✅ Links創建完成，總共創建:', createdLinks.length, '個Links');
            console.log(
                '📋 創建的Links詳情:',
                createdLinks.map((link) => ({
                    title: link.title,
                    url: link.url,
                    platform: link.platform,
                    isActive: link.is_active,
                })),
            );

            return { profile, badge, links: createdLinks };
        });

        // 6. 構建響應
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
            links: result.links.map((link) => ({
                id: link.id,
                title: link.title,
                url: link.url,
                type: link.type,
                platform: link.platform,
                isActive: link.is_active,
                displayOrder: link.display_order,
                createdFrom: 'LEAD_PREFILL',
            })),
            summary: {
                linksCreated: result.links.length,
                linkTypes: result.links.map((link) => link.platform).filter(Boolean),
            },
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
     * 🆕 獲取用戶在特定協會的購買意向數據記錄（替代原有的Lead記錄）
     * @param userId 用戶ID
     * @param associationId 協會ID
     * @returns 購買意向數據記錄列表（格式化為Lead格式）
     */
    async getUserLeadsForAssociation(userId: string, associationId: string) {
        // 查詢購買意向數據
        const purchaseIntentDataList = await prisma.purchaseIntentData.findMany({
            where: {
                userId,
                associationId,
            },
            include: {
                association: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // 🔄 為了保持API契約兼容，轉換為lead格式
        const leadFormattedData = await Promise.all(
            purchaseIntentDataList.map(async (intentData) => {
                let purchaseOrder = null;

                // 如果有關聯的訂單ID，查詢訂單信息
                if (intentData.purchaseOrderId) {
                    purchaseOrder = await prisma.purchaseOrder.findUnique({
                        where: { id: intentData.purchaseOrderId },
                        select: {
                            id: true,
                            orderNumber: true,
                            status: true,
                            paidAt: true,
                        },
                    });
                }

                return {
                    id: intentData.id,
                    firstName: intentData.firstName,
                    lastName: intentData.lastName,
                    email: intentData.email,
                    phone: intentData.phone,
                    organization: intentData.organization,
                    message: intentData.message,
                    userId: intentData.userId,
                    associationId: intentData.associationId,
                    status: 'NEW', // 對外使用Lead格式的狀態
                    source: 'PURCHASE_INTENT',
                    priority: 'HIGH',
                    createdAt: intentData.createdAt,
                    updatedAt: intentData.updatedAt,
                    purchaseOrder,
                };
            }),
        );

        return leadFormattedData;
    }
}
