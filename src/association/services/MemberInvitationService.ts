import { Service } from 'typedi';
import { PrismaClient, MemberRole, User, MembershipStatus } from '@prisma/client';
import { MemberInvitationItemDto, BatchMemberInvitationDto } from '../dtos/member-invitation.dto';
import { InvitationResponseType } from '../dtos/invitation-response.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { EmailService } from '../../services/EmailService';

@Service()
export class MemberInvitationService {
    private prisma: PrismaClient;
    private emailService: EmailService;

    constructor(emailService: EmailService) {
        this.prisma = new PrismaClient();
        this.emailService = emailService;
    }

    /**
     * 批量創建協會會員邀請
     * @param associationId 協會ID
     * @param dto 批量邀請數據
     * @returns 邀請處理結果
     */
    async batchInviteMembers(associationId: string, dto: BatchMemberInvitationDto) {
        // 檢查協會是否存在
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
            include: { user: true },
        });

        if (!association) {
            throw new Error('協會不存在');
        }

        // 處理結果統計
        const result = {
            total: dto.members.length,
            processed: 0,
            existing: 0, // 已經是會員
            invited: 0, // 邀請已發送
            created: 0, // 新創建的臨時用戶
            failed: 0, // 處理失敗
            details: [] as Array<{
                email: string;
                status: 'EXISTING' | 'INVITED' | 'CREATED' | 'FAILED';
                message?: string;
            }>,
        };

        // 逐個處理邀請
        for (const member of dto.members) {
            try {
                result.processed++;

                // 檢查用戶是否已存在
                let user = await this.prisma.user.findUnique({
                    where: { email: member.email },
                });

                // 檢查是否已是協會成員
                if (user) {
                    const existingMember = await this.prisma.associationMember.findUnique({
                        where: {
                            associationId_userId: {
                                associationId,
                                userId: user.id,
                            },
                        },
                    });

                    if (existingMember) {
                        // 用戶已是協會成員
                        result.existing++;
                        result.details.push({
                            email: member.email,
                            status: 'EXISTING',
                            message: '用戶已是協會成員',
                        });
                        continue;
                    }
                }

                // 處理邀請流程
                if (user) {
                    // 現有用戶 - 創建邀請
                    await this.createInvitation(association, user, member, dto.customMessage);
                    result.invited++;
                    result.details.push({
                        email: member.email,
                        status: 'INVITED',
                        message: '邀請已發送給現有用戶',
                    });
                } else {
                    // 新用戶 - 創建臨時帳戶並發送激活邀請
                    const newUser = await this.createTemporaryUser(member);
                    await this.createInvitation(association, newUser, member, dto.customMessage);
                    result.created++;
                    result.details.push({
                        email: member.email,
                        status: 'CREATED',
                        message: '臨時帳戶已創建並發送邀請',
                    });
                }
            } catch (error) {
                result.failed++;
                result.details.push({
                    email: member.email,
                    status: 'FAILED',
                    message: (error as Error).message,
                });
            }
        }

        return result;
    }

    /**
     * 創建臨時用戶
     * @param memberData 成員數據
     * @returns 創建的用戶
     */
    private async createTemporaryUser(memberData: MemberInvitationItemDto): Promise<User> {
        // 生成隨機用戶名和密碼
        const randomString = crypto.randomBytes(8).toString('hex');
        const username = `user_${randomString}`;
        const password = await this.hashPassword(crypto.randomBytes(10).toString('hex'));
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // 創建用戶
        return this.prisma.user.create({
            data: {
                email: memberData.email,
                username: username,
                password: password,
                display_name: memberData.name || null,
                is_verified: false,
                verification_token: verificationToken,
                // 初始化邀請數據
                meta: {
                    invitations: [],
                },
            },
        });
    }

    /**
     * 創建邀請記錄並發送邀請郵件
     * @param association 協會
     * @param user 用戶
     * @param memberData 成員數據
     * @param customMessage 自定義消息
     */
    private async createInvitation(
        association: any,
        user: User,
        memberData: MemberInvitationItemDto,
        customMessage?: string,
    ) {
        // 創建邀請令牌
        const invitationToken = crypto.randomBytes(32).toString('hex');

        // 從meta字段獲取邀請信息
        let userData: { invitations?: any[] } = {};
        try {
            if (user.meta) {
                userData = user.meta as any;
            }
        } catch (e) {
            userData = { invitations: [] };
        }

        // 確保invitations數組存在
        if (!userData.invitations) {
            userData.invitations = [];
        }

        // 添加新的邀請
        userData.invitations.push({
            associationId: association.id,
            token: invitationToken,
            role: memberData.role || 'MEMBER',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14天有效期
        });

        // 更新用戶
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                meta: userData,
            },
        });

        // 發送邀請郵件
        await this.emailService.sendAssociationInvitation(
            user.email,
            association.name,
            invitationToken,
            customMessage,
            !user.is_verified, // 是否為新用戶
        );
    }

    /**
     * 簡單密碼加密（實際項目應使用bcrypt）
     */
    private async hashPassword(password: string): Promise<string> {
        // 注意：實際項目中應使用bcrypt等安全的哈希算法
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    /**
     * 處理邀請回應（接受或拒絕）
     * @param userId 用戶ID
     * @param token 邀請令牌
     * @param responseType 回應類型
     * @returns 處理結果
     */
    async processInvitationResponse(
        userId: string,
        token: string,
        responseType: InvitationResponseType,
    ) {
        // 獲取用戶信息
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('用戶不存在');
        }

        // 獲取邀請詳情
        const invitation = await this.getInvitationByToken(token);

        if (!invitation) {
            throw new Error('邀請不存在或已過期');
        }

        // 檢查邀請是否已過期
        if (new Date(invitation.expiresAt) < new Date()) {
            throw new Error('邀請已過期');
        }

        // 【關鍵安全檢查】驗證邀請郵箱與用戶郵箱是否匹配
        if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
            throw new Error('您無權處理此邀請，因為它不是發送給您的郵箱');
        }

        // 檢查協會是否存在
        const association = await this.prisma.association.findUnique({
            where: { id: invitation.associationId },
        });

        if (!association) {
            throw new Error('協會不存在');
        }

        // 解析用戶的meta數據
        let userData: { invitations?: any[] } = {};
        try {
            if (user.meta) {
                userData = user.meta as any;
            }
        } catch (e) {
            userData = { invitations: [] };
        }

        // 確保invitations數組存在
        if (!userData.invitations || !Array.isArray(userData.invitations)) {
            userData.invitations = [];
        }

        // 查找對應的邀請
        const invitationIndex = userData.invitations.findIndex((inv: any) => inv.token === token);

        if (invitationIndex === -1) {
            throw new Error('邀請不存在或已過期');
        }

        // 處理接受或拒絕邀請
        if (responseType === InvitationResponseType.ACCEPT) {
            // 檢查用戶是否已是協會成員
            const existingMember = await this.prisma.associationMember.findUnique({
                where: {
                    associationId_userId: {
                        associationId: invitation.associationId,
                        userId: userId,
                    },
                },
            });

            if (existingMember) {
                // 用戶已是協會成員，只需更新邀請狀態
                userData.invitations.splice(invitationIndex, 1);
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { meta: userData },
                });

                return {
                    success: true,
                    action: responseType,
                    associationId: invitation.associationId,
                    associationName: association.name,
                    message: '您已經是此協會的成員',
                };
            }

            // 接受邀請 - 創建協會成員記錄
            await this.prisma.associationMember.create({
                data: {
                    associationId: invitation.associationId,
                    userId: userId,
                    role: invitation.role as MemberRole,
                    membershipStatus: MembershipStatus.ACTIVE,
                    displayInDirectory: true,
                    meta: {
                        invitedAt: invitation.createdAt,
                        acceptedAt: new Date().toISOString(),
                    },
                },
            });
        }

        // 無論接受或拒絕，都從邀請列表中移除
        userData.invitations.splice(invitationIndex, 1);
        await this.prisma.user.update({
            where: { id: userId },
            data: { meta: userData },
        });

        return {
            success: true,
            action: responseType,
            associationId: invitation.associationId,
            associationName: association.name,
        };
    }

    /**
     * 獲取用戶的所有協會邀請
     * @param userId 用戶ID
     * @returns 邀請列表
     */
    async getUserInvitations(userId: string) {
        // 獲取用戶信息
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('用戶不存在');
        }

        // 解析用戶的meta數據
        let invitations = [];
        try {
            if (user.meta && (user.meta as any).invitations) {
                invitations = (user.meta as any).invitations;
            }
        } catch (e) {
            return [];
        }

        // 過濾有效邀請並加載協會信息
        const validInvitations = [];
        for (const invitation of invitations) {
            // 跳過過期邀請
            if (new Date(invitation.expiresAt) < new Date()) {
                continue;
            }

            // 獲取協會信息
            try {
                const association = await this.prisma.association.findUnique({
                    where: { id: invitation.associationId },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        logo: true,
                    },
                });

                if (association) {
                    validInvitations.push({
                        token: invitation.token,
                        role: invitation.role,
                        createdAt: invitation.createdAt,
                        expiresAt: invitation.expiresAt,
                        association: association,
                    });
                }
            } catch (e) {
                // 忽略不存在的協會
            }
        }

        return validInvitations;
    }

    /**
     * 激活臨時用戶並接受協會邀請
     *
     * @param token 激活令牌
     * @param password 設置的密碼
     * @param userData 其他用戶數據
     * @returns 用戶信息和JWT令牌
     */
    async activateInvitedUser(token: string, password: string, userData?: any) {
        // 獲取邀請信息
        const invitation = await this.getInvitationByToken(token);

        if (!invitation) {
            throw new Error('無效的激活令牌');
        }

        // 檢查邀請是否已過期
        if (new Date(invitation.expiresAt) < new Date()) {
            throw new Error('激活令牌已過期');
        }

        // 查找用戶
        const user = await this.prisma.user.findUnique({
            where: { email: invitation.email },
        });

        if (!user) {
            throw new Error('用戶不存在');
        }

        // 檢查用戶是否已激活
        if (user.is_verified) {
            throw new Error('此郵箱已被激活，請直接登入後接受邀請');
        }

        // 哈希密碼
        const hashedPassword = await bcrypt.hash(password, 10);

        // 解析用戶的meta數據
        let userMeta: { invitations?: any[] } = {};
        try {
            if (user.meta) {
                userMeta = user.meta as any;
            }
        } catch (e) {
            userMeta = { invitations: [] };
        }

        // 確保invitations數組存在
        if (!userMeta.invitations || !Array.isArray(userMeta.invitations)) {
            userMeta.invitations = [];
        }

        // 查找對應的邀請
        const invitationIndex = userMeta.invitations.findIndex((inv: any) => inv.token === token);

        if (invitationIndex === -1) {
            throw new Error('邀請不存在');
        }

        // 獲取協會信息
        const association = await this.prisma.association.findUnique({
            where: { id: invitation.associationId },
        });

        if (!association) {
            throw new Error('協會不存在');
        }

        // 更新用戶資料
        const updatedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                display_name: userData?.displayName || user.username,
                is_verified: true,
                verification_token: null,
                meta: {
                    ...userMeta,
                    invitations: userMeta.invitations.filter((inv: any) => inv.token !== token),
                    activatedAt: new Date().toISOString(),
                },
            },
            select: {
                id: true,
                email: true,
                display_name: true,
                username: true,
                is_verified: true,
            },
        });

        // 創建協會成員關係
        await this.prisma.associationMember.create({
            data: {
                associationId: invitation.associationId,
                userId: user.id,
                role: invitation.role as MemberRole,
                membershipStatus: MembershipStatus.ACTIVE,
                displayInDirectory: true,
                meta: {
                    invitedAt: invitation.createdAt,
                    acceptedAt: new Date().toISOString(),
                },
            },
        });

        // 修改這一行，將 token 改為 jwtToken
        const jwtToken = this.generateJwtToken(updatedUser);

        return {
            user: updatedUser,
            associations: [association],
            token: jwtToken, // 這裡使用新命名的變量
        };
    }

    // 新增JWT生成輔助函數
    private generateJwtToken(user: any) {
        return jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '7d' },
        );
    }

    /**
     * 重發邀請
     * @param associationId 協會ID
     * @param email 用戶郵箱
     * @returns 處理結果
     */
    async resendInvitation(associationId: string, email: string) {
        // 檢查協會是否存在
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
            include: { user: true },
        });

        if (!association) {
            throw new Error('協會不存在');
        }

        // 查找用戶
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new Error('用戶不存在');
        }

        // 檢查用戶是否已是協會成員
        const existingMember = await this.prisma.associationMember.findUnique({
            where: {
                associationId_userId: {
                    associationId,
                    userId: user.id,
                },
            },
        });

        if (existingMember) {
            throw new Error('用戶已是協會成員');
        }

        // 解析用戶的meta數據
        let userData: { invitations?: any[] } = {};
        try {
            if (user.meta) {
                userData = user.meta as any;
            }
        } catch (e) {
            userData = { invitations: [] };
        }

        // 確保invitations數組存在
        if (!userData.invitations) {
            userData.invitations = [];
        }

        // 查找並移除現有邀請
        const invitationIndex = userData.invitations.findIndex(
            (inv: any) => inv.associationId === associationId,
        );
        if (invitationIndex !== -1) {
            userData.invitations.splice(invitationIndex, 1);
        }

        // 創建新邀請
        const memberData: MemberInvitationItemDto = {
            email,
            role: MemberRole.MEMBER,
        };
        await this.createInvitation(association, user, memberData);

        return {
            success: true,
            email,
            message: '邀請已重新發送',
        };
    }

    /**
     * 根據Token獲取邀請詳情
     *
     * @param token 邀請令牌
     * @returns 邀請信息
     */
    async getInvitationByToken(token: string) {
        // 先嘗試從用戶meta數據中查找邀請
        const user = await this.prisma.user.findFirst({
            where: {
                meta: {
                    path: ['invitations'],
                    array_contains: [
                        {
                            token: token,
                        },
                    ],
                },
            },
        });

        if (!user) {
            return null;
        }

        // 從用戶meta數據中提取邀請信息
        let invitation: any = null;
        try {
            const userData = user.meta as any;
            if (userData?.invitations && Array.isArray(userData.invitations)) {
                invitation = userData.invitations.find((inv: any) => inv.token === token);
            }
        } catch (e) {
            throw new Error('無法解析用戶邀請數據');
        }

        if (!invitation) {
            return null;
        }

        // 獲取關聯的協會信息
        const association = await this.prisma.association.findUnique({
            where: { id: invitation.associationId },
            select: {
                id: true,
                name: true,
                description: true,
                logo: true,
            },
        });

        // 檢查此郵箱是否已有激活的帳戶
        const existingAccount = await this.prisma.user.findUnique({
            where: {
                email: user.email,
                is_verified: true, // 只計算已激活的帳戶
            },
        });

        const hasAccount = !!existingAccount;

        // 構建返回的邀請詳情對象
        return {
            id: invitation.token,
            email: user.email,
            associationId: invitation.associationId,
            associationName: association?.name || '未知協會',
            status: 'PENDING',
            expiresAt: invitation.expiresAt,
            token: invitation.token,
            createdAt: invitation.createdAt,
            role: invitation.role,
            association,
            hasAccount, // 新增: 是否已有激活的帳戶
        };
    }
}
