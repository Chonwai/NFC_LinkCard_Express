import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { HttpException } from '../utils/HttpException';
import { generateSlug } from '../utils/slugGenerator';

export class ProfileService {
    async create(data: Prisma.ProfileCreateInput, userId: string) {
        const existingDefaultProfile = await prisma.profile.findFirst({
            where: {
                user_id: userId,
                is_default: true,
            },
        });

        const slug = await generateSlug(data.name);

        return await prisma.profile.create({
            data: {
                ...data,
                slug,
                user_id: userId,
                is_default: !existingDefaultProfile,
            },
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
        });
    }

    async findBySlug(slug: string) {
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
            throw new HttpException(404, '檔案不存在');
        }

        if (!profile.is_public) {
            throw new HttpException(403, '此檔案為私密');
        }

        return profile;
    }

    async setDefault(profileId: string, userId: string) {
        const profile = await prisma.profile.findFirst({
            where: { id: profileId, user_id: userId },
        });

        if (!profile) {
            throw new HttpException(404, '檔案不存在');
        }

        await prisma.$transaction([
            prisma.profile.updateMany({
                where: { user_id: userId, is_default: true },
                data: { is_default: false },
            }),
            prisma.profile.update({
                where: { id: profileId },
                data: { is_default: true },
            }),
        ]);

        return profile;
    }
}
