import { Request, Response } from 'express';
import { Service } from 'typedi';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaClient } from '@prisma/client';
import { FacilityService } from '../services/FacilityService';
import { RequestFacilityAccessDto } from '../dtos/facility.dto';
import { ApiResponse } from '../../utils/apiResponse';
// import { AuthenticatedRequest } from '../../types/request.types';

@Service()
export class FacilityController {
    private facilityService: FacilityService;
    private prisma: PrismaClient;

    constructor() {
        this.facilityService = new FacilityService();
        this.prisma = new PrismaClient(); // Consistent with AssociationController
    }

    getFacilities = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.unauthorized(res, 'User not authenticated');
            }

            const { propertyUnitId } = req.params;
            if (!propertyUnitId) {
                return ApiResponse.badRequest(res, 'Property Unit ID is required');
            }

            const facilities = await this.facilityService.getFacilitiesForPropertyUnit(
                userId,
                propertyUnitId,
            );
            return ApiResponse.success(res, { facilities });
        } catch (error: any) {
            console.error('Error in getFacilities:', error);
            return ApiResponse.serverError(res, error.message || 'Failed to get facilities');
        }
    };

    requestAccess = async (req: Request, res: Response) => {
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

            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.unauthorized(res, 'User not authenticated');
            }

            const { propertyUnitId } = req.params;
            if (!propertyUnitId) {
                return ApiResponse.badRequest(
                    res,
                    'Property Unit ID is required from path parameter',
                );
            }

            // Pass propertyUnitId from params to the service method
            const credential = await this.facilityService.requestFacilityAccess(
                userId,
                propertyUnitId,
                dto,
            );
            return ApiResponse.success(res, { credential });
        } catch (error: any) {
            console.error('Error in requestAccess:', error);
            return ApiResponse.serverError(
                res,
                error.message || 'Failed to request facility access',
            );
        }
    };
}
