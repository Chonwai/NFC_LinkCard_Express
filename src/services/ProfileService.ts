import prisma from '../lib/prisma';
import { CreateProfileDto, UpdateProfileDto } from '../dtos/profile.dto';
import { HttpException } from '../utils/HttpException';
import { generateSlug } from '../utils/slugGenerator';

export class ProfileService {
    async create(data: CreateProfileDto, userId: string) {
        const slug = await generateSlug(data.name);

        return await prisma.profile.create({
            data: {
                ...data,
                slug,
                user_id: userId,
                is_default: false,
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

    async update(id: string, data: UpdateProfileDto, userId: string) {
        const profile = await prisma.profile.findFirst({
            where: { id, user_id: userId },
        });

        if (!profile) {
            throw new HttpException(404, '檔案不存在或無權訪問');
        }

        return await prisma.profile.update({
            where: { id },
            data: {
                ...data,
                slug: profile.slug,
            },
        });
    }

    async delete(id: string, userId: string) {
        const profile = await prisma.profile.findFirst({
            where: { id, user_id: userId },
        });

        if (!profile) {
            throw new HttpException(404, '檔案不存在或無權訪問');
        }

        if (profile.is_default) {
            throw new HttpException(400, '無法刪除默認檔案');
        }

        await prisma.profile.delete({ where: { id } });
    }
}
