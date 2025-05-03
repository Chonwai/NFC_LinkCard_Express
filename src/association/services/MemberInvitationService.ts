import { Service } from 'typedi';
import { PrismaClient, MemberRole, User, MembershipStatus } from '@prisma/client';
import { MemberInvitationItemDto, BatchMemberInvitationDto } from '../dtos/member-invitation.dto';
import { InvitationResponseType } from '../dtos/invitation-response.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { EmailService } from '../../services/EmailService';
import { ProfileBadgeService } from './ProfileBadgeService';
import { BadgeDisplayMode } from '@prisma/client';
import { CreateProfileBadgeDto } from '../dtos/profile-badge.dto';

@Service()
export class MemberInvitationService {
    private prisma: PrismaClient;
    private emailService: EmailService;
    private readonly profileBadgeService: ProfileBadgeService;

    constructor(emailService: EmailService, profileBadgeService: ProfileBadgeService) {
        this.prisma = new PrismaClient();
        this.emailService = emailService;
        this.profileBadgeService = profileBadgeService;
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
                    await this.createInvitation(
                        association,
                        user,
                        member,
                        dto.customMessage,
                        false,
                    );
                    result.invited++;
                    result.details.push({
                        email: member.email,
                        status: 'INVITED',
                        message: '邀請已發送給現有用戶',
                    });
                } else {
                    // 新用戶 - 創建臨時帳戶並發送激活邀請
                    const newUser = await this.createTemporaryUser(member);
                    await this.createInvitation(
                        association,
                        newUser,
                        member,
                        dto.customMessage,
                        true,
                    );
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
        // 生成隨機用戶名
        const randomString = crypto.randomBytes(8).toString('hex');
        const username = `user_${randomString}`;

        // 使用 bcrypt 哈希隨機生成的密碼
        const temporaryPassword = crypto.randomBytes(12).toString('hex'); // 生成更強的臨時密碼
        const saltRounds = 10; // bcrypt 加鹽輪數，10 是常用的安全值
        const hashedPassword = await bcrypt.hash(temporaryPassword, saltRounds); // *** 使用 bcrypt ***

        const verificationToken = crypto.randomBytes(32).toString('hex');

        // 創建用戶
        return this.prisma.user.create({
            data: {
                email: memberData.email,
                username: username,
                password: hashedPassword, // 存儲 bcrypt 哈希後的密碼
                display_name: memberData.name || null,
                is_verified: false,
                verification_token: verificationToken,
                // 添加明確的來源標記
                meta: {
                    invitations: [],
                    userSource: 'ASSOCIATION_INVITE', // 明確標記用戶創建來源
                    createDate: new Date().toISOString(),
                    isTemporaryAccount: true, // 標記這是臨時帳戶
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
     * @param isBatchCreated 標識是否由批量流程為新用戶創建
     * @param isReinvitation 標識是否為重新邀請
     */
    private async createInvitation(
        association: any,
        user: User,
        memberData: MemberInvitationItemDto,
        customMessage?: string,
        isBatchCreated: boolean = false,
        isReinvitation: boolean = false,
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

        // 添加新的邀請，包含標識
        userData.invitations.push({
            associationId: association.id,
            token: invitationToken,
            role: memberData.role || 'MEMBER',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(
                Date.now() + (isBatchCreated ? 14 : 7) * 24 * 60 * 60 * 1000,
            ).toISOString(),
            isBatchCreated: isBatchCreated,
            isReinvitation: isReinvitation,
        });

        // 更新用戶
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                meta: userData,
            },
        });

        // 發送邀請郵件，根據不同情況選擇模板
        const isNewUserCreatedByInvitation =
            !user.is_verified && (user.meta as any)?.userSource === 'ASSOCIATION_INVITE';

        await this.emailService.sendAssociationInvitation(
            user.email,
            association.name,
            invitationToken,
            customMessage,
            isNewUserCreatedByInvitation,
            isReinvitation,
        );
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
            // 檢查是否為重新邀請
            const isReinvitation = invitation.isReinvitation === true;

            // 檢查是否存在已刪除的會員記錄
            let existingMember;
            if (isReinvitation) {
                // 對於重新邀請，查找包括已刪除的記錄
                existingMember = await this.prisma.associationMember.findFirst({
                    where: {
                        associationId: invitation.associationId,
                        userId: userId,
                    },
                });
            } else {
                // 對於普通邀請，只查找活躍記錄
                existingMember = await this.prisma.associationMember.findUnique({
                    where: {
                        associationId_userId: {
                            associationId: invitation.associationId,
                            userId: userId,
                        },
                    },
                });
            }

            if (existingMember) {
                if (isReinvitation) {
                    // 重新啟用會員記錄
                    await this.prisma.associationMember.update({
                        where: { id: existingMember.id },
                        data: {
                            membershipStatus: MembershipStatus.ACTIVE,
                            deleted_at: null,
                            meta: {
                                ...(existingMember.meta as any),
                                reactivatedAt: new Date().toISOString(),
                                previousTermination: {
                                    terminatedAt: existingMember.deleted_at,
                                    status: existingMember.membershipStatus,
                                },
                            },
                        },
                    });

                    // 記錄重新激活操作
                    await this.prisma.membershipHistory.create({
                        data: {
                            association_member_id: existingMember.id,
                            previous_status: existingMember.membershipStatus,
                            new_status: MembershipStatus.ACTIVE,
                            changed_by: userId,
                            reason: '接受重新邀請，會員資格已恢復',
                        },
                    });
                } else {
                    // 一般邀請 - 用戶已是會員，只需移除邀請
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
            } else {
                // 新創建會員關係
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
                            isRejoined: isReinvitation,
                        },
                    },
                });
            }
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

        // 哈希用戶設置的新密碼
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds); // *** 確認使用 bcrypt ***

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
                password: hashedPassword, // 更新為用戶設置的、bcrypt 哈希後的密碼
                display_name: userData?.displayName || user.display_name || user.username,
                username: userData?.username || user.username, // 允許用戶自定義用戶名
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

        // --- *** 新增：確保用戶有默認 Profile *** ---
        let userProfile = await this.prisma.profile.findFirst({
            where: { user_id: updatedUser.id }, // Check if *any* profile exists for this user
        });

        // 如果用戶還沒有任何 Profile，為其創建一個默認的
        if (!userProfile) {
            try {
                // 生成一個簡單的唯一 slug
                const defaultSlug = `${updatedUser.username || 'user'}-${crypto.randomBytes(4).toString('hex')}`;

                userProfile = await this.prisma.profile.create({
                    data: {
                        user_id: updatedUser.id,
                        name: updatedUser.display_name || updatedUser.username || 'My Profile',
                        slug: defaultSlug,
                        is_default: true,
                        is_public: true,
                        description: `Welcome! This is the default profile for ${updatedUser.display_name || updatedUser.username}.`,
                        // Ensure other required fields have defaults here
                    },
                });
                console.log(
                    `Created default profile ${userProfile.id} for newly activated user ${updatedUser.id}`,
                );
            } catch (profileCreateError) {
                console.error(
                    `[Critical] Failed to create default profile for user ${updatedUser.id} during activation:`,
                    profileCreateError,
                );
                // Consider if error should halt activation
            }
        }
        // --- *** 結束：確保用戶有默認 Profile *** ---

        // --- 查找用戶的默認 Profile (現在應該總能找到了) ---
        const defaultProfile = await this.prisma.profile.findFirst({
            where: { user_id: updatedUser.id, is_default: true },
        });

        // --- 為默認 Profile 添加協會徽章 ---
        if (defaultProfile) {
            try {
                // 檢查徽章是否已存在
                const existingBadge = await this.prisma.profileBadge.findFirst({
                    where: {
                        profileId: defaultProfile.id,
                        associationId: invitation.associationId,
                    },
                });

                if (!existingBadge) {
                    // *** 修正：調用 createProfileBadge 時使用正確的 DTO 字段 ***
                    const badgeDto: CreateProfileBadgeDto = {
                        profileId: defaultProfile.id,
                        associationId: invitation.associationId,
                        userId: updatedUser.id,
                        displayMode: BadgeDisplayMode.FULL, // 使用默認顯示模式
                        isVisible: true, // 默認可見
                        displayOrder: 0, // 默認順序
                        // customLabel, customColor, customSize 可選，此處省略
                    };
                    await this.profileBadgeService.createProfileBadge(badgeDto, updatedUser.id);
                    console.log(
                        `Successfully added association badge to default profile ${defaultProfile.id} for user ${updatedUser.id}`,
                    );
                }
            } catch (badgeError) {
                console.error(
                    `Error auto-adding badge to default profile ${defaultProfile.id} after activation:`,
                    badgeError,
                );
            }
        } else {
            console.warn(
                `User ${updatedUser.id} still does not have a default profile after creation check. Cannot auto-add association badge.`,
            );
        }

        // --- 生成JWT令牌 ---
        const jwtToken = this.generateJwtToken(updatedUser);

        return {
            user: updatedUser,
            associations: [association],
            token: jwtToken,
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

        // 更精確地判斷是否為通過邀請創建的臨時帳戶
        const isInvitationCreatedUser =
            ((user.meta as any)?.userSource === 'ASSOCIATION_INVITE' ||
                (user.meta as any)?.isTemporaryAccount === true) &&
            !user.is_verified;

        // 反轉邏輯 - 不是臨時帳戶就視為已有帳戶
        const hasAccount = !isInvitationCreatedUser;

        // *** 提取 isBatchCreated 標識 ***
        const isBatchCreatedUser = invitation.isBatchCreated === true; // 默認為 false

        // *** 新增：提取 isReinvitation 標識 ***
        const isReinvitation = invitation.isReinvitation === true; // 從存儲的邀請數據中獲取

        // 構建返回的邀請詳情對象
        return {
            id: invitation.token,
            email: user.email,
            associationId: invitation.associationId,
            associationName: association?.name || '未知協會',
            status: 'PENDING', // 注意：這裡的狀態可能需要更複雜的邏輯判斷
            expiresAt: invitation.expiresAt,
            token: invitation.token, // 冗餘，但保持與前端可能的使用一致
            createdAt: invitation.createdAt,
            role: invitation.role,
            association,
            hasAccount,
            isBatchCreatedUser,
            isReinvitation, // *** 在返回對象中添加 isReinvitation ***
        };
    }

    /**
     * 重新邀請已刪除的會員
     * @param associationId 協會ID
     * @param memberId 會員ID
     * @param operatorId 操作者ID
     * @param customMessage 自定義消息
     * @returns 處理結果
     */
    async reInviteDeletedMember(
        associationId: string,
        memberId: string,
        operatorId: string,
        customMessage?: string,
    ) {
        // 檢查協會是否存在
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
            include: { user: true },
        });

        if (!association) {
            throw new Error('協會不存在');
        }

        // 查找用戶
        const member = await this.prisma.associationMember.findUnique({
            where: { id: memberId },
            include: { user: true },
        });

        if (!member) {
            throw new Error('會員不存在');
        }

        // 檢查操作者權限
        // ... 權限檢查代碼 ...

        // 檢查用戶是否已是活躍協會成員
        const existingActiveMember = await this.prisma.associationMember.findFirst({
            where: {
                associationId,
                userId: member.userId,
                membershipStatus: MembershipStatus.ACTIVE,
                deleted_at: null,
            },
        });

        if (existingActiveMember) {
            throw new Error('會員已是協會現有成員');
        }

        // 檢查是否存在已刪除的會員記錄
        const existingDeletedMember = await this.prisma.associationMember.findFirst({
            where: {
                associationId,
                userId: member.userId,
                OR: [
                    { membershipStatus: MembershipStatus.TERMINATED },
                    { deleted_at: { not: null } },
                ],
            },
        });

        if (!existingDeletedMember) {
            throw new Error('找不到該用戶的已刪除會員記錄');
        }

        // 查找用戶
        const user = await this.prisma.user.findUnique({
            where: { id: member.userId },
        });

        if (!user) {
            throw new Error('用戶不存在');
        }
        // 準備邀請數據
        const memberData: MemberInvitationItemDto = {
            email: user.email,
            role: existingDeletedMember.role, // 保留原來的角色
            name: user.display_name || user.username,
        };

        // 構建自定義消息
        const defaultMessage = `您之前在「${association.name}」的會員資格已被終止，現在協會邀請您重新加入。`;
        const finalMessage = customMessage || defaultMessage;

        // 創建邀請並發送邀請郵件
        await this.createInvitation(
            association,
            user,
            memberData,
            finalMessage,
            false,
            true, // 新增參數：isReinvitation
        );

        // 記錄重新邀請操作
        await this.prisma.membershipHistory.create({
            data: {
                association_member_id: existingDeletedMember.id,
                previous_status: existingDeletedMember.membershipStatus,
                new_status: MembershipStatus.PENDING,
                changed_by: operatorId,
                reason: finalMessage,
            },
        });

        return {
            success: true,
            email: user.email,
            message: '重新邀請已發送',
            previousMembershipDetails: {
                role: existingDeletedMember.role,
                membershipStatus: existingDeletedMember.membershipStatus,
                deletedAt: existingDeletedMember.deleted_at,
            },
        };
    }
}
