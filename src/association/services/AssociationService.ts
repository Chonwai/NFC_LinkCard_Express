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
                slug,
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
}
