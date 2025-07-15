import { Service } from 'typedi';
import prisma from '../../lib/prisma';
import { CreatePurchaseIntentDataDto } from '../dtos/register-with-lead.dto';

@Service()
export class PurchaseIntentDataService {
    /**
     * 創建購買意向數據記錄
     */
    async create(dto: CreatePurchaseIntentDataDto) {
        // 設置過期時間（30天後）
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        return await prisma.purchaseIntentData.create({
            data: {
                ...dto,
                expiresAt,
                status: 'PENDING',
            },
        });
    }

    /**
     * 根據用戶ID和協會ID查找購買意向數據
     */
    async findByUserAndAssociation(userId: string, associationId: string) {
        return await prisma.purchaseIntentData.findFirst({
            where: {
                userId,
                associationId,
                status: 'PENDING',
                expiresAt: {
                    gt: new Date(), // 未過期
                },
            },
            include: {
                association: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc', // 獲取最新的記錄
            },
        });
    }

    /**
     * 根據訂單ID查找購買意向數據
     */
    async findByOrderId(orderId: string) {
        return await prisma.purchaseIntentData.findFirst({
            where: {
                purchaseOrderId: orderId,
                status: {
                    in: ['PENDING', 'CONVERTED'],
                },
            },
            include: {
                association: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                    },
                },
            },
        });
    }

    /**
     * 關聯購買訂單
     */
    async linkToPurchaseOrder(intentDataId: string, orderId: string) {
        return await prisma.purchaseIntentData.update({
            where: {
                id: intentDataId,
            },
            data: {
                purchaseOrderId: orderId,
            },
        });
    }

    /**
     * 標記為已轉換
     */
    async markAsConverted(intentDataId: string) {
        return await prisma.purchaseIntentData.update({
            where: {
                id: intentDataId,
            },
            data: {
                status: 'CONVERTED',
                convertedAt: new Date(),
            },
        });
    }

    /**
     * 根據郵箱和協會查找最新的購買意向數據
     * 用於用戶註冊前的情況
     */
    async findByEmailAndAssociation(email: string, associationId: string) {
        return await prisma.purchaseIntentData.findFirst({
            where: {
                email,
                associationId,
                status: 'PENDING',
                expiresAt: {
                    gt: new Date(), // 未過期
                },
                userId: null, // 尚未關聯用戶
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * 關聯用戶ID
     */
    async linkToUser(intentDataId: string, userId: string) {
        return await prisma.purchaseIntentData.update({
            where: {
                id: intentDataId,
            },
            data: {
                userId,
            },
        });
    }

    /**
     * 清理過期數據
     */
    async cleanupExpiredData() {
        const result = await prisma.purchaseIntentData.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
                status: {
                    not: 'CONVERTED', // 保留已轉換的記錄
                },
            },
        });

        return result.count;
    }
}
