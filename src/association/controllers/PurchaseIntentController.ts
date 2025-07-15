import { Service } from 'typedi';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiResponse } from '../../utils/apiResponse';
import { PurchaseIntentDataService } from '../../auth/services/PurchaseIntentDataService';
import { CreatePurchaseIntentLeadDto } from '../dtos/lead.dto';
import { CreatePurchaseIntentDataDto } from '../../auth/dtos/register-with-lead.dto';

@Service()
export class PurchaseIntentController {
    constructor(private readonly purchaseIntentDataService: PurchaseIntentDataService) {}

    /**
     * 🆕 創建購買意向數據記錄（替代原有的Lead API）
     * 專門用於購買流程中的數據收集
     * @param req 請求對象
     * @param res 響應對象
     */
    createPurchaseIntent = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const dto = plainToClass(CreatePurchaseIntentLeadDto, req.body);

            // 驗證輸入數據
            const errors = await validate(dto);
            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // 🆕 檢查是否有認證用戶信息
            const userId = req.user?.id || undefined;

            console.log('🔍 創建購買意向數據:', {
                associationId,
                pricingPlanId: dto.purchaseContext?.pricingPlanId,
                userId,
                isAuthenticated: !!req.user,
                email: dto.email,
            });

            // 轉換為內部DTO格式
            const purchaseIntentDto: CreatePurchaseIntentDataDto = {
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email,
                phone: dto.phone,
                organization: dto.organization,
                message: dto.message,
                associationId,
                userId, // 🆕 如果有登錄用戶，設置 userId
                pricingPlanId: dto.purchaseContext?.pricingPlanId, // 🆕 從 purchaseContext 中提取 pricingPlanId
                purchaseContext: dto.purchaseContext,
                autoCreateProfile: true, // 默認自動創建Profile
                profileSettings: {
                    formSource: 'PURCHASE_INTENT_FORM',
                    submittedAt: new Date().toISOString(),
                    isAuthenticated: !!req.user,
                },
            };

            // 創建購買意向數據
            const purchaseIntentData =
                await this.purchaseIntentDataService.create(purchaseIntentDto);

            // 🔄 為保持API兼容性，返回Lead格式的響應
            return ApiResponse.success(res, {
                message: '您的購買意向已成功提交，請繼續完成註冊和付款流程',
                lead: {
                    id: purchaseIntentData.id,
                    firstName: purchaseIntentData.firstName,
                    lastName: purchaseIntentData.lastName,
                    email: purchaseIntentData.email,
                    phone: purchaseIntentData.phone,
                    organization: purchaseIntentData.organization,
                    message: purchaseIntentData.message,
                    source: 'PURCHASE_INTENT',
                    status: 'NEW',
                    priority: 'HIGH',
                    createdAt: purchaseIntentData.createdAt,
                },
            });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '提交購買意向失敗',
                'CREATE_PURCHASE_INTENT_ERROR',
                error.message,
                error.message === '協會不存在' ? 404 : 500,
            );
        }
    };

    /**
     * 🆕 獲取用戶的購買意向數據記錄
     * @param req 請求對象
     * @param res 響應對象
     */
    getUserPurchaseIntents = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '用戶未認證', 'UNAUTHORIZED', null, 401);
            }

            // 獲取用戶在該協會的購買意向數據
            const purchaseIntentData =
                await this.purchaseIntentDataService.findByUserAndAssociation(
                    userId,
                    associationId,
                );

            if (!purchaseIntentData) {
                return ApiResponse.success(res, {
                    message: '未找到購買意向記錄',
                    purchaseIntent: null,
                });
            }

            // 🔄 為保持API兼容性，返回Lead格式的響應
            return ApiResponse.success(res, {
                lead: {
                    id: purchaseIntentData.id,
                    firstName: purchaseIntentData.firstName,
                    lastName: purchaseIntentData.lastName,
                    email: purchaseIntentData.email,
                    phone: purchaseIntentData.phone,
                    organization: purchaseIntentData.organization,
                    message: purchaseIntentData.message,
                    source: 'PURCHASE_INTENT',
                    status: purchaseIntentData.status === 'CONVERTED' ? 'CONVERTED' : 'NEW',
                    priority: 'HIGH',
                    createdAt: purchaseIntentData.createdAt,
                    purchaseContext: purchaseIntentData.purchaseContext,
                },
            });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取購買意向記錄失敗',
                'GET_PURCHASE_INTENT_ERROR',
                error.message,
                500,
            );
        }
    };

    /**
     * 🆕 根據郵箱和協會查找購買意向數據
     * 用於註冊前的購買意向查找
     * @param req 請求對象
     * @param res 響應對象
     */
    findPurchaseIntentByEmail = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const { email } = req.query;

            if (!email || typeof email !== 'string') {
                return ApiResponse.error(res, '缺少email參數', 'MISSING_EMAIL', null, 400);
            }

            // 查找購買意向數據
            const purchaseIntentData =
                await this.purchaseIntentDataService.findByEmailAndAssociation(
                    email,
                    associationId,
                );

            if (!purchaseIntentData) {
                return ApiResponse.success(res, {
                    message: '未找到相關的購買意向記錄',
                    purchaseIntent: null,
                });
            }

            // 🔄 為保持API兼容性，返回Lead格式的響應
            return ApiResponse.success(res, {
                lead: {
                    id: purchaseIntentData.id,
                    firstName: purchaseIntentData.firstName,
                    lastName: purchaseIntentData.lastName,
                    email: purchaseIntentData.email,
                    phone: purchaseIntentData.phone,
                    organization: purchaseIntentData.organization,
                    message: purchaseIntentData.message,
                    source: 'PURCHASE_INTENT',
                    status: 'NEW',
                    priority: 'HIGH',
                    createdAt: purchaseIntentData.createdAt,
                    purchaseContext: purchaseIntentData.purchaseContext,
                },
            });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '查找購買意向記錄失敗',
                'FIND_PURCHASE_INTENT_ERROR',
                error.message,
                500,
            );
        }
    };
}
