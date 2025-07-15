import { Service } from 'typedi';
import { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma';
import { AuthService } from '../../services/AuthService';
import { LeadService } from '../../association/services/LeadService';
import { EmailService } from '../../services/EmailService';
import { PurchaseIntentDataService } from './PurchaseIntentDataService';
import { generateSlug } from '../../utils/slugGenerator';
import { ErrorHandler } from '../../utils/ErrorHandler';
import {
    RegisterWithLeadDto,
    RegisterWithLeadResponseDto,
    CreatePurchaseOrderWithLeadDto,
    CreatePurchaseIntentDataDto,
} from '../dtos/register-with-lead.dto';
import { LeadSource, LeadPriority, LeadStatus } from '../../association/dtos/lead.dto';

@Service()
export class RegisterWithLeadService {
    constructor(
        private authService: AuthService,
        private leadService: LeadService,
        private emailService: EmailService,
        private purchaseIntentDataService: PurchaseIntentDataService, // 🆕 新增
    ) {}

    /**
     * 🆕 一站式用戶註冊 + Lead收集
     * 流程：
     * 1. 驗證郵箱和用戶名唯一性
     * 2. 創建用戶帳戶（包含驗證token）
     * 3. 創建默認Profile
     * 4. 創建購買意向Lead記錄
     * 5. 發送驗證郵件
     * 6. 返回JWT token和下一步引導
     */
    async registerWithLead(
        dto: RegisterWithLeadDto,
    ): Promise<RegisterWithLeadResponseDto | Response> {
        try {
            console.log('開始註冊流程，數據:', JSON.stringify(dto, null, 2));

            // 1. 檢查用戶是否已存在
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [{ email: dto.user.email }, { username: dto.user.username }],
                },
            });

            if (existingUser) {
                throw new Error('郵箱或用戶名已被使用');
            }

            // 2. 檢查協會是否存在
            const association = await prisma.association.findUnique({
                where: { id: dto.purchaseContext.associationId },
            });

            if (!association) {
                throw new Error('協會不存在');
            }

            // 3. 檢查定價方案是否存在和有效
            const pricingPlan = await prisma.pricingPlan.findUnique({
                where: { id: dto.purchaseContext.pricingPlanId },
            });

            if (!pricingPlan || !pricingPlan.isActive) {
                throw new Error('定價方案不存在或已停用');
            }

            const verificationToken = crypto.randomBytes(32).toString('hex');
            const hashedPassword = await bcrypt.hash(dto.user.password, 10);

            console.log('準備開始事務處理...');

            // 4. 事務處理：創建用戶、Profile和Lead
            const result = await prisma.$transaction(
                async (tx) => {
                    // 4.1 創建用戶
                    const user = await tx.user.create({
                        data: {
                            username: dto.user.username,
                            email: dto.user.email,
                            password: hashedPassword,
                            display_name: dto.user.display_name,
                            verification_token: verificationToken,
                            is_verified: false,
                            verified_at: null,
                        },
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            display_name: true,
                            is_verified: true,
                            created_at: true,
                            updated_at: true,
                        },
                    });

                    // 4.2 創建默認Profile
                    const defaultProfile = await tx.profile.create({
                        data: {
                            name: user.display_name || user.username,
                            slug: await generateSlug(user.username),
                            user_id: user.id,
                            is_default: true,
                            description: `${user.username}的默認Profile`,
                        },
                    });

                    // 4.3 🆕 創建購買意向數據（替代原有的Lead創建）
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 30); // 30天後過期

                    const purchaseIntentData = await tx.purchaseIntentData.create({
                        data: {
                            firstName: dto.lead.firstName,
                            lastName: dto.lead.lastName,
                            email: dto.user.email, // 使用用戶註冊的郵箱
                            phone: dto.lead.phone,
                            organization: dto.lead.organization,
                            message: dto.lead.message,
                            associationId: dto.purchaseContext.associationId,
                            userId: user.id,
                            pricingPlanId: dto.purchaseContext.pricingPlanId, // 🆕 直接設置 pricingPlanId 字段
                            status: 'PENDING',
                            expiresAt, // 🆕 添加過期時間
                            autoCreateProfile: true,
                            purchaseContext: {
                                pricingPlanId: dto.purchaseContext.pricingPlanId,
                                planName: dto.purchaseContext.planName || pricingPlan.displayName,
                                amount: dto.purchaseContext.amount || Number(pricingPlan.price),
                                currency: dto.purchaseContext.currency || pricingPlan.currency,
                            },
                            profileSettings: {
                                formSource: 'PURCHASE_REGISTRATION_MODAL',
                                userRegistration: {
                                    registeredAt: new Date().toISOString(),
                                    verificationToken: verificationToken,
                                },
                            },
                        },
                    });

                    // 🔄 為了保持API契約兼容，創建一個lead格式的響應對象
                    const leadResponse = {
                        id: purchaseIntentData.id,
                        firstName: purchaseIntentData.firstName,
                        lastName: purchaseIntentData.lastName,
                        email: purchaseIntentData.email,
                        phone: purchaseIntentData.phone,
                        organization: purchaseIntentData.organization,
                        message: purchaseIntentData.message,
                        associationId: purchaseIntentData.associationId,
                        status: 'NEW', // 對外仍使用Lead的狀態格式
                        source: 'PURCHASE_INTENT',
                        priority: 'HIGH',
                        userId: purchaseIntentData.userId,
                        createdAt: purchaseIntentData.createdAt,
                        updatedAt: purchaseIntentData.updatedAt,
                    };

                    return {
                        user,
                        profile: defaultProfile,
                        lead: leadResponse, // 🔄 返回兼容格式的lead對象
                        pricingPlan,
                    };
                },
                {
                    timeout: 30000, // 30秒超時
                },
            );

            // 5. 檢查事務結果
            if (!result.user || !result.lead) {
                throw new Error('註冊過程中發生錯誤，請聯繫客服或稍後再試。');
            }

            // 6. 發送驗證郵件（異步處理，不阻塞響應）
            this.emailService
                .sendVerificationEmail(result.user.email, verificationToken)
                .catch((error) => {
                    console.error('發送驗證郵件失敗:', error);
                    // TODO: 記錄到日誌系統
                });

            // 7. 生成JWT token
            const token = this.authService.generateToken(result.user);

            // 8. 構建響應
            const response: RegisterWithLeadResponseDto = {
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    email: result.user.email,
                    isVerified: result.user.is_verified,
                    displayName: result.user.display_name || undefined,
                },
                lead: {
                    id: result.lead.id,
                    source: result.lead.source || 'PURCHASE_INTENT',
                    status: result.lead.status,
                    priority: result.lead.priority || 'HIGH',
                },
                token,
                nextStep: {
                    action: 'PROCEED_TO_PAYMENT',
                    // checkoutUrl將在創建購買訂單時生成
                },
            };

            return response;
        } catch (error) {
            console.error('註冊流程錯誤:', error);
            throw error;
        }
    }

    /**
     * 🆕 創建帶Lead關聯的購買訂單
     * 在用戶註冊+Lead收集完成後調用
     */
    async createPurchaseOrderWithLead(
        userId: string,
        dto: CreatePurchaseOrderWithLeadDto,
    ): Promise<{
        orderId: string;
        checkoutUrl: string;
        leadId?: string;
    }> {
        // 1. 獲取Lead信息（如果提供）
        let lead = null;
        if (dto.leadId) {
            lead = await prisma.associationLead.findUnique({
                where: { id: dto.leadId },
            });

            if (!lead) {
                throw new Error('Lead記錄不存在');
            }

            // 檢查Lead是否屬於當前用戶
            if (lead.userId !== userId) {
                throw new Error('無權限訪問此Lead記錄');
            }
        }

        // 2. 獲取定價方案
        const pricingPlan = await prisma.pricingPlan.findUnique({
            where: { id: dto.pricingPlanId },
        });

        if (!pricingPlan || !pricingPlan.isActive) {
            throw new Error('定價方案不存在或已停用');
        }

        // 3. 生成訂單號
        const orderNumber = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 4. 創建購買訂單並更新Lead記錄
        const result = await prisma.$transaction(async (tx) => {
            // 4.1 創建購買訂單
            const purchaseOrder = await tx.purchaseOrder.create({
                data: {
                    associationId: pricingPlan.associationId,
                    userId,
                    pricingPlanId: dto.pricingPlanId,
                    orderNumber,
                    amount: pricingPlan.price,
                    currency: pricingPlan.currency,
                    status: 'PENDING',
                },
            });

            // 4.2 更新Lead記錄（如果存在）
            if (lead) {
                await tx.associationLead.update({
                    where: { id: lead.id },
                    data: {
                        purchaseOrderId: purchaseOrder.id,
                        metadata: {
                            ...((lead.metadata as any) || {}),
                            purchaseOrder: {
                                orderId: purchaseOrder.id,
                                orderNumber: purchaseOrder.orderNumber,
                                createdAt: new Date().toISOString(),
                            },
                        },
                    },
                });
            }

            return purchaseOrder;
        });

        // 5. 這裡應該調用Stripe創建checkout session
        // 為了簡化，先返回模擬的checkout URL
        const mockCheckoutUrl = `${process.env.FRONTEND_URL}/payment/checkout?orderId=${result.id}`;

        return {
            orderId: result.id,
            checkoutUrl: mockCheckoutUrl,
            leadId: dto.leadId,
        };
    }

    /**
     * 🆕 獲取用戶的Lead記錄
     * 用於支付成功後的Profile預填
     */
    async getUserLeadForOrder(userId: string, orderId: string) {
        const order = await prisma.purchaseOrder.findUnique({
            where: { id: orderId },
        });

        if (!order || order.userId !== userId) {
            throw new Error('訂單不存在或無權限訪問');
        }

        // 查找與此訂單關聯的Lead記錄
        const lead = await prisma.associationLead.findFirst({
            where: {
                purchaseOrderId: orderId,
                userId: userId,
            },
        });

        return lead;
    }
}
