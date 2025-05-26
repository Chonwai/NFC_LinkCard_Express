import { Request, Response } from 'express';
import { Service, Inject } from 'typedi';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { FacilityService } from '../services/facility.service';
import { RequestFacilityAccessDto } from '../dtos/facility.dto';
import { ApiResponse } from '../../utils/apiResponse'; // Adjusted path
import { logger } from '../../utils/logger'; // Adjusted path
import { AuthenticatedRequest } from '../../types/request.types'; // Adjusted path

@Service()
export class FacilityController {
    constructor(private readonly facilityService: FacilityService) {}

    getFacilities = async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user || !req.user.id) {
            return ApiResponse.unauthorized(res, 'Authentication required.');
        }
        const { propertyUnitId } = req.params;
        if (!propertyUnitId) {
            return ApiResponse.badRequest(res, 'Property Unit ID is required.');
        }

        try {
            const facilities = await this.facilityService.getFacilitiesForPropertyUnit(
                req.user.id,
                propertyUnitId,
            );
            return ApiResponse.success(res, facilities, 200);
        } catch (error: any) {
            logger.error(`Error in FacilityController.getFacilities: ${error.message}`, { error });
            if (error.status && error.message) {
                return ApiResponse.error(
                    res,
                    error.message,
                    error.code || 'FACILITY_FETCH_FAILED',
                    error.details || error.message,
                    error.status,
                );
            }
            return ApiResponse.serverError(
                res,
                'Failed to retrieve facilities.',
                'INTERNAL_ERROR',
                error.message,
            );
        }
    };

    requestAccess = async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user || !req.user.id) {
            return ApiResponse.unauthorized(res, 'Authentication required.');
        }

        try {
            const dto = plainToClass(RequestFacilityAccessDto, req.body);
            const errors = await validate(dto);
            if (errors.length > 0) {
                return ApiResponse.validationError(
                    res,
                    'Validation failed',
                    'VALIDATION_ERROR',
                    errors,
                );
            }

            const credential = await this.facilityService.requestFacilityAccess(req.user.id, dto);
            return ApiResponse.success(res, credential, 200);
        } catch (error: any) {
            logger.error(`Error in FacilityController.requestAccess: ${error.message}`, { error });
            if (error.status && error.message) {
                return ApiResponse.error(
                    res,
                    error.message,
                    error.code || 'FACILITY_ACCESS_REQUEST_FAILED',
                    error.details || error.message,
                    error.status,
                );
            }
            return ApiResponse.serverError(
                res,
                'Failed to request facility access.',
                'INTERNAL_ERROR',
                error.message,
            );
        }
    };
}
