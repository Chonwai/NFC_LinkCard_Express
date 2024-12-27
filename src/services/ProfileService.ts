import prisma from '../lib/prisma';
import { CreateProfileDto, UpdateProfileDto } from '../dtos/profile.dto';
import { generateSlug } from '../utils/slugGenerator';
import { ErrorHandler } from '../utils/ErrorHandler';
import { Response } from 'express';

export class ProfileService {
    async create(data: CreateProfileDto, userId: string) {
        const slug = await generateSlug(data.name);

        return await prisma.$transaction(async (tx) => {
            // 檢查是否已經有默認檔案
            const existingDefaultProfile = await tx.profile.findFirst({
                where: {
                    user_id: userId,
                    is_default: true,
                },
            });

            // 如果沒有默認檔案，需要先將所有檔案設為非默認
            if (!existingDefaultProfile) {
                await tx.profile.updateMany({
                    where: { user_id: userId },
                    data: { is_default: false },
                });
            }

            return await tx.profile.create({
                data: {
                    ...data,
                    slug,
                    user_id: userId,
                    is_default: !existingDefaultProfile,
                },
                include: {
                    user: {
                        select: {
                            username: true,
                            display_name: true,
                            avatar: true,
                        },
                    },
                },
            });
        });
    }

    async findByUserId(userId: string) {
        return await prisma.profile.findMany({
            where: { user_id: userId },
            include: {
                links: {
                    orderBy: { display_order: 'asc' },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    async findBySlug(slug: string, res: Response) {
        const profile = await prisma.profile.findUnique({
            where: { slug },
            include: {
                links: {
                    where: { is_active: true },
                    orderBy: { display_order: 'asc' },
                },
                user: {
                    select: {
                        username: true,
                        display_name: true,
                        avatar: true,
                        bio: true,
                    },
                },
            },
        });

        if (!profile) {
            return ErrorHandler.notFound(res, '檔案不存在', 'PROFILE_NOT_FOUND');
        }

        if (!profile.is_public) {
            return ErrorHandler.forbidden(res, '此檔案為私密', 'PROFILE_PRIVATE');
        }

        return profile;
    }

    async update(id: string, data: UpdateProfileDto, userId: string, res: Response) {
        const profile = await prisma.profile.findFirst({
            where: { id, user_id: userId },
        });

        if (!profile) {
            return ErrorHandler.notFound(res, '檔案不存在或無權訪問', 'PROFILE_NOT_FOUND');
        }

        const updateData = {
            ...data,
            slug: profile.slug,
        };

        return await prisma.profile.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        username: true,
                        display_name: true,
                        avatar: true,
                    },
                },
            },
        });
    }

    async delete(id: string, userId: string, res: Response) {
        const profile = await prisma.profile.findFirst({
            where: { id, user_id: userId },
        });

        if (!profile) {
            return ErrorHandler.notFound(res, '檔案不存在或無權訪問', 'PROFILE_NOT_FOUND');
        }

        if (profile.is_default) {
            return ErrorHandler.badRequest(
                res,
                '無法刪除默認檔案',
                'CANNOT_DELETE_DEFAULT_PROFILE',
            );
        }

        await prisma.profile.delete({ where: { id } });
    }

    async setDefault(id: string, userId: string, res: Response) {
        const profile = await prisma.profile.findFirst({
            where: { id, user_id: userId },
        });

        if (!profile) {
            return ErrorHandler.notFound(res, '檔案不存在或無權訪問', 'PROFILE_NOT_FOUND');
        }

        return await prisma.$transaction(async (tx) => {
            // 先將所有檔案設為非默認
            await tx.profile.updateMany({
                where: { user_id: userId },
                data: { is_default: false },
            });

            // 再將指定檔案設為默認
            return await tx.profile.update({
                where: { id },
                data: { is_default: true },
                include: {
                    user: {
                        select: {
                            username: true,
                            display_name: true,
                            avatar: true,
                        },
                    },
                },
            });
        });
    }
}
