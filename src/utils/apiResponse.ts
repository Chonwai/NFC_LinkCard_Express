import { Response } from 'express';

export interface ApiResponseHeaders {
    [key: string]: string;
}

export class ApiResponse {
    static success(res: Response, data: any, status: number = 200, headers?: ApiResponseHeaders) {
        Object.entries(headers || {}).forEach(([key, value]) => {
            res.header(key, value);
        });

        return res.status(status).json({
            success: true,
            data,
        });
    }

    static created(res: Response, data: any, headers?: ApiResponseHeaders) {
        return this.success(res, data, 201, headers);
    }

    static badRequest(
        res: Response,
        message = 'Bad Request',
        code = 'BAD_REQUEST',
        details?: unknown,
    ) {
        return this.error(res, message, code, details, 400);
    }

    static unauthorized(
        res: Response,
        message = 'Unauthorized',
        code = 'UNAUTHORIZED',
        details?: unknown,
    ) {
        return this.error(res, message, code, details, 401);
    }

    static forbidden(res: Response, message = 'Forbidden', code = 'FORBIDDEN', details?: unknown) {
        return this.error(res, message, code, details, 403);
    }

    static notFound(res: Response, message = 'Not Found', code = 'NOT_FOUND', details?: unknown) {
        return this.error(res, message, code, details, 404);
    }

    static validationError(
        res: Response,
        details: any,
        message = 'Validation Error',
        code = 'VALIDATION_ERROR',
    ) {
        let responseMessage = message;
        let errorDetails = details;

        if (
            Array.isArray(details) &&
            details.length > 0 &&
            details[0] &&
            typeof details[0].constraints === 'object'
        ) {
            responseMessage = 'Input validation failed. Please check the details.';
            errorDetails = details.map((err: any) => {
                const firstConstraintMessage =
                    err.constraints && Object.values(err.constraints).length > 0
                        ? Object.values(err.constraints)[0]
                        : 'Invalid value';
                return {
                    property: err.property,
                    message: firstConstraintMessage as string,
                };
            });
        }

        return this.error(res, responseMessage, code, errorDetails, 422);
    }

    static serverError(
        res: Response,
        message = 'Internal Server Error',
        code = 'INTERNAL_SERVER_ERROR',
        details?: unknown,
    ) {
        return this.error(res, message, code, details, 500);
    }

    static error(
        res: Response,
        message: string,
        code: string,
        details: unknown,
        status: number = 400,
    ) {
        const response: any = {
            success: false,
            error: {
                message,
                code,
            },
        };

        if (details) {
            response.error.details = details;
        }

        return res.status(status).json(response);
    }
}
