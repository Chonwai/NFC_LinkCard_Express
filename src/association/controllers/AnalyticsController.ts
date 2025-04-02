// src/association/controllers/AnalyticsController.ts
import { Service } from 'typedi';
import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';

@Service()
export class AnalyticsController {
    trackEvent = async (req: Request, res: Response) => {
        // 臨時實現
        return ApiResponse.success(res, { message: '事件已記錄' });
    };

    getAnalytics = async (req: Request, res: Response) => {
        // 臨時實現
        return ApiResponse.success(res, { analytics: [] });
    };
}
