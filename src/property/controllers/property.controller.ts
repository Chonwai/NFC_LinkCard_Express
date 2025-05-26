import { Request, Response } from 'express';
import { Service, Inject } from 'typedi';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { PropertyService } from '../services/property.service';
import { LinkPropertyWithCodeDto } from '../dtos/property.dto';
import { ApiResponse } from '../../utils/apiResponse'; // Adjusted path
import { logger } from '../../utils/logger'; // Adjusted path
import { AuthenticatedRequest } from '../../types/request.types'; // Adjusted path

@Service()
export class PropertyController {
    constructor(private readonly propertyService: PropertyService) {}

    linkProperty = async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user || !req.user.id) {
            return ApiResponse.unauthorized(res, 'Authentication required.');
        }

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

            const result = await this.propertyService.linkPropertyWithCode(req.user.id, dto);
            return ApiResponse.success(res, result, 200);
        } catch (error: any) {
            logger.error(`Error in PropertyController.linkProperty: ${error.message}`, { error });
            if (error.status && error.message) {
                return ApiResponse.error(
                    res,
                    error.message,
                    error.code || 'PROPERTY_LINK_FAILED',
                    error.details || error.message,
                    error.status,
                );
            }
            return ApiResponse.serverError(
                res,
                'Failed to link property.',
                'INTERNAL_ERROR',
                error.message,
            );
        }
    };

    getLinkedProperties = async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user || !req.user.id) {
            return ApiResponse.unauthorized(res, 'Authentication required.');
        }

        try {
            const properties = await this.propertyService.getUserLinkedProperties(req.user.id);
            return ApiResponse.success(res, properties, 200);
        } catch (error: any) {
            logger.error(`Error in PropertyController.getLinkedProperties: ${error.message}`, {
                error,
            });
            return ApiResponse.serverError(
                res,
                'Failed to retrieve linked properties.',
                'INTERNAL_ERROR',
                error.message,
            );
        }
    };
}
