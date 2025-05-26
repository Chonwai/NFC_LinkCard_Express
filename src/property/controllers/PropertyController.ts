import { Request, Response } from 'express';
import { Service } from 'typedi';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaClient } from '@prisma/client';
import { PropertyService } from '../services/PropertyService';
import { LinkPropertyWithCodeDto } from '../dtos/property.dto';
import { ApiResponse } from '../../utils/apiResponse';
// import { AuthenticatedRequest } from '../../types/request.types'; // Assuming user ID comes from req.user.id set by authMiddleware

@Service()
export class PropertyController {
    private propertyService: PropertyService;
    private prisma: PrismaClient;

    constructor() {
        this.propertyService = new PropertyService();
        this.prisma = new PrismaClient(); // Consistent with AssociationController
    }

    linkProperty = async (req: Request, res: Response) => {
        try {
            const dto = plainToClass(LinkPropertyWithCodeDto, req.body);
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

            const result = await this.propertyService.linkPropertyWithCode(userId, dto);
            return ApiResponse.success(res, result);
        } catch (error: any) {
            console.error('Error in linkProperty:', error);
            return ApiResponse.serverError(res, error.message || 'Failed to link property');
        }
    };

    getLinkedProperties = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.unauthorized(res, 'User not authenticated');
            }

            const properties = await this.propertyService.getUserLinkedProperties(userId);
            return ApiResponse.success(res, { properties });
        } catch (error: any) {
            console.error('Error in getLinkedProperties:', error);
            return ApiResponse.serverError(res, error.message || 'Failed to get linked properties');
        }
    };
}
