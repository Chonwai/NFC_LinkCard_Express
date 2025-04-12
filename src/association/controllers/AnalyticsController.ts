// src/association/controllers/AnalyticsController.ts
import { Service } from 'typedi';
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { AnalyticsService } from '../services/AnalyticsService';
import { AssociationService } from '../services/AssociationService';
import { HttpException } from '../../utils/HttpException';
import { MemberService } from '../services/MemberService';
import { PrismaClient } from '@prisma/client';

@Service()
export class AnalyticsController {
    private readonly prisma = new PrismaClient();

    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly associationService: AssociationService,
        private readonly memberService: MemberService,
    ) {}

    /**
     * 記錄事件
     * 這個API可以由前端直接調用，用於記錄訪問等事件
     */
    trackEvent = async (req: Request, res: Response) => {
        try {
            const { associationId, eventType, meta } = req.body;

            // 驗證協會是否存在
            const association = await this.associationService.findById(associationId);
            if (!association) {
                return ApiResponse.error(res, '協會不存在', 'ASSOCIATION_NOT_FOUND', null, 404);
            }

            // 記錄事件
            const event = await this.analyticsService.trackEvent({
                associationId,
                eventType,
                meta: {
                    ...meta,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    referer: req.headers.referer,
                },
            });

            return ApiResponse.success(res, {
                message: '事件已記錄',
                eventId: event.id,
            });
        } catch (error: any) {
            return ApiResponse.error(res, '記錄事件失敗', 'TRACK_EVENT_ERROR', error.message, 500);
        }
    };

    /**
     * 獲取協會分析數據
     * 需要管理員權限
     */
    getAnalytics = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const userId = req.user?.id;
            const period = (req.query.period as string) || 'month';

            // 驗證權限
            const canAccess = await this.associationService.canUserUpdateAssociation(
                associationId,
                userId as string,
            );
            if (!canAccess) {
                return ApiResponse.error(res, '無權訪問分析數據', 'PERMISSION_DENIED', null, 403);
            }

            // 獲取分析數據
            const analytics = await this.analyticsService.getAssociationAnalytics(
                associationId,
                period,
            );

            return ApiResponse.success(res, { analytics });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取分析數據失敗',
                'GET_ANALYTICS_ERROR',
                error.message,
                500,
            );
        }
    };

    /**
     * 獲取訪問統計數據
     */
    getVisitStats = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const userId = req.user?.id;
            const period = (req.query.period as string) || 'month';

            // 驗證權限
            const canAccess = await this.associationService.canUserUpdateAssociation(
                associationId,
                userId as string,
            );
            if (!canAccess) {
                return ApiResponse.error(res, '無權訪問分析數據', 'PERMISSION_DENIED', null, 403);
            }

            // 獲取訪問統計
            const stats = await this.analyticsService.getVisitStats(associationId, period);

            return ApiResponse.success(res, { stats });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取訪問統計失敗',
                'GET_VISIT_STATS_ERROR',
                error.message,
                500,
            );
        }
    };

    /**
     * 獲取潛在客戶統計數據
     */
    getLeadStats = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const userId = req.user?.id;
            const period = (req.query.period as string) || 'month';

            // 驗證權限
            const canAccess = await this.associationService.canUserUpdateAssociation(
                associationId,
                userId as string,
            );
            if (!canAccess) {
                return ApiResponse.error(res, '無權訪問分析數據', 'PERMISSION_DENIED', null, 403);
            }

            // 獲取潛在客戶統計
            const stats = await this.analyticsService.getLeadStats(associationId, period);

            return ApiResponse.success(res, { stats });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取潛在客戶統計失敗',
                'GET_LEAD_STATS_ERROR',
                error.message,
                500,
            );
        }
    };

    /**
     * @summary 獲取協會統計數據摘要
     * @tag Analytics
     * @param {string} req.params.id - 協會ID
     * @return {object} 200 - 統計數據摘要響應
     * @return {object} 400 - 錯誤響應
     * @return {object} 404 - 協會未找到
     */
    getStats = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const userId = req.user?.id;

            // 檢查用戶是否已登入
            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            // 檢查協會是否存在
            const association = await this.prisma.association.findUnique({
                where: { id: associationId },
            });

            if (!association) {
                return ApiResponse.error(res, '協會不存在', 'ASSOCIATION_NOT_FOUND', null, 404);
            }

            // 驗證權限 - 檢查用戶是否為協會管理員或擁有者
            const canAccess = await this.associationService.canUserUpdateAssociation(
                associationId,
                userId as string,
            );
            if (!canAccess) {
                return ApiResponse.error(res, '無權訪問統計數據', 'PERMISSION_DENIED', null, 403);
            }

            // 獲取訪問總數
            const totalVisits = await this.prisma.associationAnalytics.count({
                where: {
                    associationId,
                    eventType: 'PAGE_VIEW',
                },
            });

            // 獲取會員總數
            const totalMembers = await this.prisma.associationMember.count({
                where: { associationId },
            });

            // 獲取潛在客戶總數
            const totalLeads = await this.prisma.associationLead.count({
                where: { associationId },
            });

            return ApiResponse.success(res, {
                stats: {
                    totalVisits,
                    totalMembers,
                    totalLeads,
                    createdAt: association.createdAt,
                },
            });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取協會統計數據失敗',
                'GET_STATS_ERROR',
                error.message,
                500,
            );
        }
    };

    /**
     * 獲取公開的協會統計數據
     */
    getPublicStats = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;

            // 檢查協會是否存在
            const association = await this.prisma.association.findUnique({
                where: { id: associationId },
            });

            if (!association) {
                return ApiResponse.error(res, '協會不存在', 'ASSOCIATION_NOT_FOUND', null, 404);
            }

            // 獲取訪問總數
            const totalMembers = await this.prisma.associationMember.count({
                where: { associationId },
            });

            return ApiResponse.success(res, {
                stats: {
                    totalMembers,
                    createdAt: association.createdAt,
                },
            });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取公開的協會統計數據失敗',
                'GET_PUBLIC_STATS_ERROR',
                error.message,
                500,
            );
        }
    };
}
