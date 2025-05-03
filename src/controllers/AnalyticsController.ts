// import { Request, Response } from 'express';
// import { AnalyticsService } from '../services/AnalyticsService';
// import { ApiResponse } from '../utils/apiResponse';
// import { ApiError } from '../types/error.types';

// export class AnalyticsController {
//     private analyticsService: AnalyticsService;

//     constructor() {
//         this.analyticsService = new AnalyticsService();
//     }

//     recordClick = async (req: Request, res: Response) => {
//         try {
//             const { linkId } = req.params;
//             const visitorIp = req.ip;
//             const userAgent = req.headers['user-agent'];
//             const referer = req.headers.referer;

//             await this.analyticsService.recordClick(linkId, {
//                 visitor_ip: visitorIp,
//                 user_agent: userAgent,
//                 referer: referer,
//             });

//             return ApiResponse.success(res, null);
//         } catch (error: unknown) {
//             const apiError = error as ApiError;
//             return ApiResponse.error(
//                 res,
//                 '記錄點擊失敗',
//                 'ANALYTICS_RECORD_ERROR',
//                 apiError.message,
//                 apiError.status || 500,
//             );
//         }
//     };

//     getLinkAnalytics = async (req: Request, res: Response) => {
//         try {
//             const { linkId } = req.params;
//             const analytics = await this.analyticsService.getLinkAnalytics(linkId, req.user.id);
//             return ApiResponse.success(res, { analytics });
//         } catch (error: unknown) {
//             const apiError = error as ApiError;
//             return ApiResponse.error(
//                 res,
//                 '獲取分析數據失敗',
//                 'ANALYTICS_FETCH_ERROR',
//                 apiError.message,
//                 apiError.status || 500,
//             );
//         }
//     };
// }
