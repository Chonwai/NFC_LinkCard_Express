import { Request, Response } from 'express';
import { Service } from 'typedi';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { PricingPlanService } from '../services/PricingPlanService';
import { CreatePricingPlanDto, UpdatePricingPlanDto } from '../dtos/pricing-plan.dto';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../types/error.types';
import { PrismaClient } from '@prisma/client';

/**
 * 協會定價方案控制器 (RESTful API)
 * 處理嵌套在協會路由下的定價方案操作
 * 路由格式: /api/associations/{associationId}/pricing-plans
 */
@Service()
export class AssociationPricingPlanController {
    private prisma: PrismaClient;

    constructor(private readonly pricingPlanService: PricingPlanService) {
        this.prisma = new PrismaClient();
    }

    /**
     * 獲取協會的定價方案列表
     * GET /api/associations/{associationId}/pricing-plans
     */
    getAssociationPricingPlans = async (req: Request, res: Response) => {
        try {
            const associationId = req.associationId!; // 來自權限中間件
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
     * 獲取單個定價方案
     * GET /api/associations/{associationId}/pricing-plans/{planId}
     */
    getPricingPlan = async (req: Request, res: Response) => {
        try {
            const { planId } = req.params;
            const associationId = req.associationId!; // 來自權限中間件

            const plan = await this.pricingPlanService.getPricingPlanById(planId);

            // 驗證定價方案是否屬於指定協會
            if (plan.associationId !== associationId) {
                return ApiResponse.error(
                    res,
                    '定價方案不屬於指定協會',
                    'PRICING_PLAN_ASSOCIATION_MISMATCH',
                    null,
                    400,
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
     * POST /api/associations/{associationId}/pricing-plans
     */
    createPricingPlan = async (req: Request, res: Response) => {
        try {
            const associationId = req.associationId!; // 來自權限中間件

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
     * PATCH /api/associations/{associationId}/pricing-plans/{planId}
     */
    updatePricingPlan = async (req: Request, res: Response) => {
        try {
            const { planId } = req.params;
            const associationId = req.associationId!; // 來自權限中間件

            // 先驗證定價方案是否屬於指定協會
            const existingPlan = await this.pricingPlanService.getPricingPlanById(planId);
            if (existingPlan.associationId !== associationId) {
                return ApiResponse.error(
                    res,
                    '定價方案不屬於指定協會',
                    'PRICING_PLAN_ASSOCIATION_MISMATCH',
                    null,
                    400,
                );
            }

            const updatePricingPlanDto = plainToClass(UpdatePricingPlanDto, req.body);
            const errors = await validate(updatePricingPlanDto);

            if (errors.length > 0) {
                return ApiResponse.validationError(res, errors);
            }

            const plan = await this.pricingPlanService.updatePricingPlan(
                planId,
                updatePricingPlanDto,
            );
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
     * DELETE /api/associations/{associationId}/pricing-plans/{planId}
     */
    deletePricingPlan = async (req: Request, res: Response) => {
        try {
            const { planId } = req.params;
            const associationId = req.associationId!; // 來自權限中間件

            // 先驗證定價方案是否屬於指定協會
            const existingPlan = await this.pricingPlanService.getPricingPlanById(planId);
            if (existingPlan.associationId !== associationId) {
                return ApiResponse.error(
                    res,
                    '定價方案不屬於指定協會',
                    'PRICING_PLAN_ASSOCIATION_MISMATCH',
                    null,
                    400,
                );
            }

            await this.pricingPlanService.deletePricingPlan(planId);
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
     * 啟用定價方案
     * PATCH /api/associations/{associationId}/pricing-plans/{planId}/activate
     */
    activatePricingPlan = async (req: Request, res: Response) => {
        try {
            const { planId } = req.params;
            const associationId = req.associationId!; // 來自權限中間件

            // 先驗證定價方案是否屬於指定協會
            const existingPlan = await this.pricingPlanService.getPricingPlanById(planId);
            if (existingPlan.associationId !== associationId) {
                return ApiResponse.error(
                    res,
                    '定價方案不屬於指定協會',
                    'PRICING_PLAN_ASSOCIATION_MISMATCH',
                    null,
                    400,
                );
            }

            const plan = await this.pricingPlanService.updatePricingPlan(planId, {
                isActive: true,
            });
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

    /**
     * 停用定價方案
     * PATCH /api/associations/{associationId}/pricing-plans/{planId}/deactivate
     */
    deactivatePricingPlan = async (req: Request, res: Response) => {
        try {
            const { planId } = req.params;
            const associationId = req.associationId!; // 來自權限中間件

            // 先驗證定價方案是否屬於指定協會
            const existingPlan = await this.pricingPlanService.getPricingPlanById(planId);
            if (existingPlan.associationId !== associationId) {
                return ApiResponse.error(
                    res,
                    '定價方案不屬於指定協會',
                    'PRICING_PLAN_ASSOCIATION_MISMATCH',
                    null,
                    400,
                );
            }

            const plan = await this.pricingPlanService.updatePricingPlan(planId, {
                isActive: false,
            });
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
}
