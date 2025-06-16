import { Request, Response } from 'express';
import { Service } from 'typedi';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { PricingPlanService } from '../services/PricingPlanService';
import { CreatePricingPlanDto, UpdatePricingPlanDto } from '../dtos/pricing-plan.dto';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../types/error.types';
import { MemberService } from '../../association/services/MemberService';

/**
 * 定價方案控制器
 * 處理定價方案相關的 HTTP 請求
 */
@Service()
export class PricingPlanController {
    constructor(
        private readonly pricingPlanService: PricingPlanService,
        private readonly memberService: MemberService,
    ) {}

    /**
     * 檢查用戶是否有管理協會的權限
     * @private
     */
    private async checkAssociationManagePermission(
        associationId: string,
        userId: string,
    ): Promise<boolean> {
        return await this.memberService.canUserManageMembers(associationId, userId);
    }

    /**
     * 獲取協會的定價方案列表
     * 注意：此方法需要用戶至少是協會成員
     */
    getAssociationPricingPlans = async (req: Request, res: Response) => {
        try {
            const { associationId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            // 檢查用戶是否為協會成員
            const userRole = await this.memberService.getUserRoleInAssociation(
                associationId,
                userId,
            );
            if (!userRole) {
                return ApiResponse.forbidden(
                    res,
                    '無權訪問此協會的定價方案',
                    'ACCESS_DENIED',
                    '只有協會成員可以查看定價方案',
                );
            }

            const plans = await this.pricingPlanService.getAssociationPricingPlans(associationId);
            return ApiResponse.success(res, { plans });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '獲取定價方案失敗',
                'PRICING_PLAN_FETCH_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 根據 ID 獲取定價方案
     * 注意：此方法需要驗證定價方案所屬協會的權限
     */
    getPricingPlanById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            // 先獲取定價方案以確定所屬協會
            const plan = await this.pricingPlanService.getPricingPlanById(id);

            // 檢查用戶是否為該協會的成員
            const userRole = await this.memberService.getUserRoleInAssociation(
                plan.associationId,
                userId,
            );
            if (!userRole) {
                return ApiResponse.forbidden(
                    res,
                    '無權訪問此定價方案',
                    'ACCESS_DENIED',
                    '只有協會成員可以查看定價方案',
                );
            }

            return ApiResponse.success(res, { plan });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '獲取定價方案失敗',
                'PRICING_PLAN_FETCH_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 創建定價方案
     * 需要協會管理權限（擁有者或管理員）
     */
    createPricingPlan = async (req: Request, res: Response) => {
        try {
            const { associationId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            // 檢查管理權限
            const canManage = await this.checkAssociationManagePermission(associationId, userId);
            if (!canManage) {
                return ApiResponse.forbidden(
                    res,
                    '無權管理此協會的定價方案',
                    'PERMISSION_DENIED',
                    '只有協會擁有者或管理員可以創建定價方案',
                );
            }

            const createPricingPlanDto = plainToClass(CreatePricingPlanDto, req.body);
            const errors = await validate(createPricingPlanDto);

            if (errors.length > 0) {
                return ApiResponse.validationError(res, errors);
            }

            const plan = await this.pricingPlanService.createPricingPlan(
                associationId,
                createPricingPlanDto,
            );
            return ApiResponse.created(res, { plan });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '創建定價方案失敗',
                'PRICING_PLAN_CREATE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 更新定價方案
     * 需要協會管理權限（擁有者或管理員）
     */
    updatePricingPlan = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            // 先獲取定價方案以確定所屬協會
            const existingPlan = await this.pricingPlanService.getPricingPlanById(id);

            // 檢查管理權限
            const canManage = await this.checkAssociationManagePermission(
                existingPlan.associationId,
                userId,
            );
            if (!canManage) {
                return ApiResponse.forbidden(
                    res,
                    '無權更新此定價方案',
                    'PERMISSION_DENIED',
                    '只有協會擁有者或管理員可以更新定價方案',
                );
            }

            const updatePricingPlanDto = plainToClass(UpdatePricingPlanDto, req.body);
            const errors = await validate(updatePricingPlanDto);

            if (errors.length > 0) {
                return ApiResponse.validationError(res, errors);
            }

            const plan = await this.pricingPlanService.updatePricingPlan(id, updatePricingPlanDto);
            return ApiResponse.success(res, { plan });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '更新定價方案失敗',
                'PRICING_PLAN_UPDATE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 刪除定價方案
     * 需要協會管理權限（擁有者或管理員）
     */
    deletePricingPlan = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            // 先獲取定價方案以確定所屬協會
            const existingPlan = await this.pricingPlanService.getPricingPlanById(id);

            // 檢查管理權限
            const canManage = await this.checkAssociationManagePermission(
                existingPlan.associationId,
                userId,
            );
            if (!canManage) {
                return ApiResponse.forbidden(
                    res,
                    '無權刪除此定價方案',
                    'PERMISSION_DENIED',
                    '只有協會擁有者或管理員可以刪除定價方案',
                );
            }

            await this.pricingPlanService.deletePricingPlan(id);
            return ApiResponse.success(res, { message: '定價方案已刪除' });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '刪除定價方案失敗',
                'PRICING_PLAN_DELETE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 停用定價方案
     */
    deactivatePricingPlan = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            const plan = await this.pricingPlanService.deactivatePricingPlan(id, userId);
            return ApiResponse.success(res, { plan });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '停用定價方案失敗',
                'PRICING_PLAN_DEACTIVATE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 啟用定價方案
     */
    activatePricingPlan = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            const plan = await this.pricingPlanService.activatePricingPlan(id, userId);
            return ApiResponse.success(res, { plan });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '啟用定價方案失敗',
                'PRICING_PLAN_ACTIVATE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };
}
