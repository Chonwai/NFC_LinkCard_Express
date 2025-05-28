import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';

export const adminApiKeyAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-admin-api-key'] as string;
    const expectedApiKey = process.env.ADMIN_PORTAL_API_KEY;

    if (!expectedApiKey) {
        console.error('ADMIN_PORTAL_API_KEY is not configured in the environment variables.');
        // For security, treat as unauthorized if the server is misconfigured
        return ApiResponse.unauthorized(
            res,
            'Server configuration error. Access denied.',
            'SERVER_CONFIG_ERROR',
        );
    }

    if (!apiKey) {
        return ApiResponse.unauthorized(res, 'Admin API Key is missing.', 'MISSING_API_KEY');
    }

    if (apiKey !== expectedApiKey) {
        return ApiResponse.forbidden(res, 'Invalid Admin API Key.', 'INVALID_API_KEY');
    }

    next();
};
