import prisma from '../lib/prisma';
import { UpdateUserDto, UpdatePasswordDto } from '../dtos/user.dto';
import { ErrorHandler } from '../utils/ErrorHandler';
import { Response } from 'express';
import bcrypt from 'bcrypt';
import { FileUploadService } from './FileUploadService';
import { VercelBlobProvider } from '../storage/vercel-blob.provider';
import { Service } from 'typedi';

@Service()
export class UserService {
    private fileUploadService: FileUploadService;

    constructor() {
        // 初始化文件上傳服務，使用 Vercel Blob 提供者
        const storageProvider = new VercelBlobProvider(process.env.BLOB_READ_WRITE_TOKEN);
        this.fileUploadService = new FileUploadService(storageProvider);
    }

    async findById(id: string) {
        return await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                email: true,
                display_name: true,
                avatar: true,
                bio: true,
                created_at: true,
                updated_at: true,
            },
        });
    }

    async update(id: string, data: UpdateUserDto) {
        return await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                username: true,
                email: true,
                display_name: true,
                avatar: true,
                bio: true,
                created_at: true,
                updated_at: true,
            },
        });
    }

    async updatePassword(id: string, data: UpdatePasswordDto) {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new Error('用戶不存在');
        }

        // 驗證當前密碼
        const isPasswordValid = await bcrypt.compare(data.current_password, user.password);
        if (!isPasswordValid) {
            throw new Error('當前密碼不正確');
        }

        // 驗證新密碼和確認密碼是否一致
        if (data.new_password !== data.confirm_password) {
            throw new Error('新密碼和確認密碼不一致');
        }

        // 加密新密碼
        const hashedPassword = await bcrypt.hash(data.new_password, 10);

        // 更新密碼
        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
        });
    }

    async uploadAvatar(id: string, file: Express.Multer.File) {
        try {
            // 使用文件上傳服務處理頭像
            const result = await this.fileUploadService.uploadImage(file, 'avatars', {
                width: 400,
                height: 400,
                quality: 80,
                maxSizeKB: 100,
                format: 'webp', // 使用 WebP 格式以獲得更好的壓縮率
            });

            // 更新用戶頭像
            await prisma.user.update({
                where: { id },
                data: { avatar: result.url },
            });

            return result.url;
        } catch (error) {
            console.error('頭像上傳失敗:', error);
            throw error;
        }
    }

    async findByEmail(email: string) {
        return await prisma.user.findUnique({
            where: { email },
        });
    }

    async updateResetPasswordToken(
        userId: string,
        resetToken: string,
        resetExpires: Date,
    ): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                reset_password_token: resetToken,
                reset_password_expires: resetExpires,
            },
        });
    }

    async findByResetToken(resetToken: string) {
        return await prisma.user.findFirst({
            where: {
                reset_password_token: resetToken,
                reset_password_expires: {
                    gt: new Date(), // 確保 token 未過期
                },
            },
        });
    }

    async clearResetPasswordToken(userId: string): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                reset_password_token: null,
                reset_password_expires: null,
            },
        });
    }

    async resetPassword(userId: string, newPassword: string): Promise<void> {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                reset_password_token: null,
                reset_password_expires: null,
            },
        });
    }
}
