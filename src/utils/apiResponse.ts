import { Response } from 'express';

export class ApiResponse {
    static success(
        res: Response,
        data: any = {},
        status: number = 200,
        headers: Record<string, string> = {},
    ) {
        Object.entries(headers).forEach(([key, value]) => {
            res.header(key, value);
        });

        return res.status(status).json({
            success: true,
            data,
        });
    }

    static error(
        res: Response,
        message: string,
        errorCode: string,
        details: any = null,
        status: number = 200,
    ) {
        const response: any = {
            success: false,
            error: {
                message,
                code: errorCode,
            },
        };

        if (details) {
            response.error.details = details;
        }

        return res.status(status).json(response);
    }
}
