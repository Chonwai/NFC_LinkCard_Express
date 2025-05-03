import { Request, Response, NextFunction } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { LeadService } from '../services/LeadService';
import { CreateLeadDto } from '../dtos/lead.dto';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../types/error.types';

export class LeadController {
    private leadService: LeadService;

    constructor() {
        this.leadService = new LeadService();
    }

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const createLeadDto = plainToClass(CreateLeadDto, req.body);
            const errors = await validate(createLeadDto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            const { profileId } = req.params;
            const lead = await this.leadService.create(createLeadDto, profileId, res);
            return ApiResponse.success(res, { lead });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '創建Lead失敗',
                'LEAD_CREATE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    getByProfile = async (req: Request, res: Response) => {
        try {
            const { profileId } = req.params;
            const result = await this.leadService.findByProfile(profileId, req.user!.id, res);
            return ApiResponse.success(res, { ...result });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '獲取Lead列表失敗',
                'LEAD_FETCH_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };
}
