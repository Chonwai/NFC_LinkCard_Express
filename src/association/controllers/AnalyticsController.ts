// src/association/controllers/AnalyticsController.ts
import { Service } from 'typedi';
import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { AnalyticsService } from '../services/AnalyticsService';
import { AssociationService } from '../services/AssociationService';

@Service()
export class AnalyticsController {
    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly associationService: AssociationService,
    ) {}

    /**
     * 記錄事件
     * 這個API可以由前端直接調用，用於記錄訪問等事件
     */
    trackEvent = async (req: Request, res: Response) => {
        try {
            const { associationId, eventType, metadata } = req.body;

            // 驗證協會是否存在
            const association = await this.associationService.findById(associationId);
            if (!association) {
                return ApiResponse.error(res, '協會不存在', 'ASSOCIATION_NOT_FOUND', null, 404);
            }

            // 記錄事件
            const event = await this.analyticsService.trackEvent({
                associationId,
                eventType,
                metadata: {
                    ...metadata,
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
}
