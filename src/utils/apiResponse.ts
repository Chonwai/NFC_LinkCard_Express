import { Response } from 'express';

export interface ApiResponseHeaders {
    [key: string]: string;
}

export class ApiResponse {
    static success(
        res: Response,
        data: Record<string, unknown>,
        status = 200,
        headers?: ApiResponseHeaders,
    ) {
        Object.entries(headers || {}).forEach(([key, value]) => {
            res.header(key, value);
        });

        return res.status(status).json({
            success: true,
            data,
        });
    }

    static error(res: Response, message: string, code: string, details: unknown, status = 400) {
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
