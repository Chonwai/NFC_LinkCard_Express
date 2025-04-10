import { Service } from 'typedi';
import { PrismaClient } from '@prisma/client';
import {
    CreateAssociationDto,
    UpdateAssociationDto,
    CreateFullAssociationDto,
} from '../dtos/association.dto';
import { generateAssociationSlug } from '../../utils/slugGenerator';

@Service()
export class AssociationService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async create(userId: string, dto: CreateFullAssociationDto) {
        // 檢查用戶是否已有協會
        const existingAssociation = await this.prisma.association.findUnique({
            where: { userId },
        });

        if (existingAssociation) {
            throw new Error('用戶已擁有協會');
        }

        // 生成唯一的slug
        const slug = await generateAssociationSlug(dto.name);

        // 創建Association記錄
        return this.prisma.association.create({
            data: {
                name: dto.name,
                slug: dto.slug ?? slug,
                description: dto.description,
                logo: dto.logo,
                banner: dto.banner,
                website: dto.website,
                email: dto.email,
                phone: dto.phone,
                address: dto.address,
                socialLinks: dto.socialLinks,
                customization: dto.customization,
                isPublic: dto.isPublic ?? true,
                user: { connect: { id: userId } },
            },
        });
    }

    async findById(id: string) {
        return this.prisma.association.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
    }

    /**
     * 通過slug查找協會
     * @param slug 協會的唯一標識符
     * @returns 協會詳情，包括關聯的用戶信息
     */
    async findBySlug(slug: string) {
        return this.prisma.association.findUnique({
            where: { slug },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
    }

    async update(id: string, dto: UpdateAssociationDto) {
        // 如果更新包含name但沒有slug，則重新生成slug
        let updateData = { ...dto };

        if (dto.name && !dto.slug) {
            const slug = await generateAssociationSlug(dto.name);
            updateData = { ...updateData, slug };
        }

        return this.prisma.association.update({
            where: { id },
            data: updateData,
        });
    }

    async delete(id: string) {
        return this.prisma.association.delete({
            where: { id },
        });
    }

    async canUserUpdateAssociation(associationId: string, userId: string) {
        // 檢查用戶是否是協會擁有者
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
        });

        if (association?.userId === userId) {
            return true;
        }

        // 檢查用戶是否是協會管理員
        const member = await this.prisma.associationMember.findUnique({
            where: {
                associationId_userId: {
                    associationId,
                    userId,
                },
            },
        });

        return member?.role === 'ADMIN';
    }

    async canUserDeleteAssociation(associationId: string, userId: string) {
        // 只有協會擁有者才能刪除協會
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
        });

        return association?.userId === userId;
    }

    /**
     * 檢查用戶是否為協會成員
     * @param associationId 協會ID
     * @param userId 用戶ID
     * @returns 是否為協會成員
     */
    async isUserMember(associationId: string, userId: string): Promise<boolean> {
        // 檢查用戶是否是協會擁有者
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
        });

        if (association?.userId === userId) {
            return true;
        }

        // 檢查用戶是否是協會成員
        const member = await this.prisma.associationMember.findUnique({
            where: {
                associationId_userId: {
                    associationId,
                    userId,
                },
            },
        });

        return !!member;
    }

    /**
     * 獲取用戶關聯的所有協會
     * @param userId 用戶ID
     * @param options 分頁選項
     * @returns 協會列表和分頁信息
     */
    async findUserAssociations(userId: string, options: { page: number; limit: number }) {
        const { page, limit } = options;
        const skip = (page - 1) * limit;

        // 查找用戶擁有的協會
        const ownedAssociations = await this.prisma.association.findMany({
            where: { userId },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });

        // 查找用戶作為成員加入的協會
        const memberAssociations = await this.prisma.association.findMany({
            where: {
                members: {
                    some: {
                        userId,
                    },
                },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });

        // 合併並去重
        const allAssociations = [...ownedAssociations];
        for (const association of memberAssociations) {
            if (!allAssociations.some((a) => a.id === association.id)) {
                allAssociations.push(association);
            }
        }

        // 獲取總數
        const totalOwnedCount = await this.prisma.association.count({
            where: { userId },
        });

        const totalMemberCount = await this.prisma.association.count({
            where: {
                members: {
                    some: {
                        userId,
                    },
                },
            },
        });

        // 總數應該是去重後的結果，但為了簡化我們暫時使用這個近似值
        const totalCount = totalOwnedCount + totalMemberCount;

        return {
            associations: allAssociations,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit),
            },
        };
    }
}
