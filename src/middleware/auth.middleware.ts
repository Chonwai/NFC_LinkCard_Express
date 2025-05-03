import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config';
import prisma from '../lib/prisma';
import { ApiError } from '../types/error.types';
import { ApiResponse } from '../utils/apiResponse';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: '未授權訪問' });
        }

        const decoded = jwt.verify(token, jwtConfig.secret) as {
            id: string;
            email: string;
        };

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, username: true },
        });

        if (!user) {
            return res.status(401).json({ message: '用戶不存在' });
        }

        req.user = user;
        next();
    } catch (error: unknown) {
        const apiError = error as ApiError;
        return ApiResponse.error(
            res,
            '無效的 token',
            'INVALID_TOKEN',
            null,
            apiError.status || 401,
        );
    }
};
