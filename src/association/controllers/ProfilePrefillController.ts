import { Service } from 'typedi';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiResponse } from '../../utils/apiResponse';
import { ProfilePrefillService } from '../services/ProfilePrefillService';
import { CreateAssociationProfileWithLeadDto } from '../dtos/lead-profile.dto';

@Service()
export class ProfilePrefillController {
    constructor(private readonly profilePrefillService: ProfilePrefillService) {}

    /**
     * 🆕 獲取Profile預填選項
     * @param req 請求對象
     * @param res 響應對象
     */
    getProfilePrefillOptions = async (req: Request, res: Response) => {
        try {
            const { associationId, userId } = req.params;
            const { orderId } = req.query;
            const currentUserId = req.user?.id;

            // 檢查權限：只能查看自己的預填數據
            if (userId !== currentUserId) {
                return ApiResponse.error(
                    res,
                    '無權限訪問其他用戶的資料',
                    'PERMISSION_DENIED',
                    null,
                    403,
                );
            }

            if (!orderId) {
                return ApiResponse.error(
                    res,
                    '缺少必需的訂單ID參數',
                    'MISSING_ORDER_ID',
                    null,
                    400,
                );
            }

            // 獲取預填選項
            const options = await this.profilePrefillService.getProfilePrefillOptions(
                userId,
                orderId as string,
            );

            return ApiResponse.success(res, options);
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取Profile預填選項失敗',
                'GET_PREFILL_OPTIONS_ERROR',
                error.message,
                error.message.includes('訂單') ? 404 : 500,
            );
        }
    };

    /**
     * 🆕 基於Lead數據創建Profile
     * @param req 請求對象
     * @param res 響應對象
     */
    createProfileWithLeadData = async (req: Request, res: Response) => {
        try {
            const { associationId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '用戶未認證', 'UNAUTHORIZED', null, 401);
            }

            // 驗證輸入數據
            const dto = plainToClass(CreateAssociationProfileWithLeadDto, req.body);
            const errors = await validate(dto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // 創建Profile
            const result = await this.profilePrefillService.createProfileWithLeadData(userId, dto);

            return ApiResponse.success(res, {
                message: '協會Profile創建成功！',
                data: result,
            });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '創建Profile失敗',
                'CREATE_PROFILE_WITH_LEAD_ERROR',
                error.message,
                error.message.includes('不存在') || error.message.includes('不匹配') ? 404 : 500,
            );
        }
    };

    /**
     * 🆕 獲取用戶在協會的Lead記錄
     * @param req 請求對象
     * @param res 響應對象
     */
    getUserLeadsForAssociation = async (req: Request, res: Response) => {
        try {
            const { associationId, userId } = req.params;
            const currentUserId = req.user?.id;

            // 檢查權限：只能查看自己的Lead記錄
            if (userId !== currentUserId) {
                return ApiResponse.error(
                    res,
                    '無權限訪問其他用戶的Lead記錄',
                    'PERMISSION_DENIED',
                    null,
                    403,
                );
            }

            // 獲取用戶的Lead記錄
            const leads = await this.profilePrefillService.getUserLeadsForAssociation(
                userId,
                associationId,
            );

            return ApiResponse.success(res, { leads });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取Lead記錄失敗',
                'GET_USER_LEADS_ERROR',
                error.message,
                500,
            );
        }
    };
}
