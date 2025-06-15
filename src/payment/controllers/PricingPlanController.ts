import { Request, Response } from 'express';
import { Service } from 'typedi';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { PricingPlanService } from '../services/PricingPlanService';
import { CreatePricingPlanDto, UpdatePricingPlanDto } from '../dtos/pricing-plan.dto';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../types/error.types';

/**
 * 定價方案控制器
 * 處理定價方案相關的 HTTP 請求
 */
@Service()
export class PricingPlanController {
    constructor(private readonly pricingPlanService: PricingPlanService) {}

    /**
     * 獲取協會的定價方案列表
     */
    getAssociationPricingPlans = async (req: Request, res: Response) => {
        try {
            const { associationId } = req.params;
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
     */
    getPricingPlanById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const plan = await this.pricingPlanService.getPricingPlanById(id);
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
     */
    createPricingPlan = async (req: Request, res: Response) => {
        try {
            const { associationId } = req.params;
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
     */
    updatePricingPlan = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
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
     */
    deletePricingPlan = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
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
