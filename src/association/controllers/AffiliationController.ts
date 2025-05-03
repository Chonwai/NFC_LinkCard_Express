import { Service } from 'typedi';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiResponse } from '../../utils/apiResponse';
import { AffiliationService } from '../services/AffiliationService';
import { CreateAffiliationDto, UpdateAffiliationDto } from '../dtos/affiliation.dto';

@Service()
export class AffiliationController {
    constructor(private readonly affiliationService: AffiliationService) {}

    /**
     * 發起協會關聯請求
     * @param req 請求對象
     * @param res 響應對象
     */
    createAffiliation = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const dto = plainToClass(CreateAffiliationDto, req.body);

            // 驗證輸入數據
            const errors = await validate(dto);
            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // 創建關聯
            const affiliation = await this.affiliationService.createAffiliation(associationId, dto);

            return ApiResponse.success(res, {
                message: '關聯請求已發送',
                affiliation,
            });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '創建關聯失敗',
                'CREATE_AFFILIATION_ERROR',
                error.message,
                error.message.includes('不存在') ? 404 : 500,
            );
        }
    };

    /**
     * 更新協會關聯
     * @param req 請求對象
     * @param res 響應對象
     */
    updateAffiliation = async (req: Request, res: Response) => {
        try {
            const { id: associationId, affiliationId } = req.params;
            const userId = req.user?.id;
            const dto = plainToClass(UpdateAffiliationDto, req.body);

            // 驗證輸入數據
            const errors = await validate(dto);
            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // 檢查權限
            const canManage = await this.affiliationService.canManageAffiliations(
                associationId,
                userId as string,
            );
            if (!canManage) {
                return ApiResponse.error(res, '無權更新關聯', 'PERMISSION_DENIED', null, 403);
            }

            // 更新關聯
            const affiliation = await this.affiliationService.updateAffiliation(affiliationId, dto);

            return ApiResponse.success(res, { affiliation });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '更新關聯失敗',
                'UPDATE_AFFILIATION_ERROR',
                error.message,
                error.message.includes('不存在') ? 404 : 500,
            );
        }
    };

    /**
     * 獲取用戶的協會關聯
     * @param req 請求對象
     * @param res 響應對象
     */
    getUserAffiliations = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            // 獲取用戶關聯
            const affiliations = await this.affiliationService.getUserAffiliations(userId);

            return ApiResponse.success(res, { affiliations });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取關聯失敗',
                'GET_AFFILIATIONS_ERROR',
                error.message,
                500,
            );
        }
    };

    /**
     * 獲取用戶的公開協會關聯
     * @param req 請求對象
     * @param res 響應對象
     */
    getPublicUserAffiliations = async (req: Request, res: Response) => {
        try {
            const { userId } = req.params;

            // 獲取公開關聯
            const affiliations = await this.affiliationService.getPublicUserAffiliations(userId);

            return ApiResponse.success(res, { affiliations });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取關聯失敗',
                'GET_AFFILIATIONS_ERROR',
                error.message,
                500,
            );
        }
    };
}
