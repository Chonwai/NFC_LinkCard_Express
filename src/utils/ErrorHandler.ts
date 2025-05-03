import { ApiResponse } from './apiResponse';
import { Response } from 'express';

export class ErrorHandler {
    static forbidden(res: Response, message: string = '無權訪問', code: string = 'FORBIDDEN') {
        return ApiResponse.error(res, message, code, null, 403);
    }

    static badRequest(res: Response, message: string, code: string = 'BAD_REQUEST') {
        return ApiResponse.error(res, message, code, null, 400);
    }

    static notFound(res: Response, message: string, code: string = 'NOT_FOUND') {
        return ApiResponse.error(res, message, code, null, 404);
    }

    static unauthorized(
        res: Response,
        message: string = '未授權訪問',
        code: string = 'UNAUTHORIZED',
    ) {
        return ApiResponse.error(res, message, code, null, 401);
    }
}
