import { Service, Inject } from 'typedi';
// PrismaClient is not needed here if using typeof prisma, but other types are
import { PropertyInvitation, User, InvitationStatus, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma'; // Import the prisma instance
import { randomBytes } from 'crypto';
import {
    CreatePropertyInvitationDto,
    AcceptPropertyInvitationDto,
    CreateBulkPropertyInvitationsDto,
} from '../dtos/propertyInvitation.dto';
import { EmailService } from '../../services/EmailService'; // Assuming core EmailService path
import { PropertyProfileService } from './PropertyProfileService';
import { HttpError } from '../../utils/HttpError';
import { Config } from '../../config'; // For frontend URL

@Service()
export class PropertyInvitationService {
    // @Inject(() => PrismaClient) // Removed Inject
    private prisma: typeof prisma; // Use the actual type of the imported prisma instance

    @Inject(() => EmailService)
    private emailService: EmailService;

    @Inject(() => PropertyProfileService)
    private propertyProfileService: PropertyProfileService;

    constructor() {
        this.prisma = prisma; // Assign imported instance
    }

    private calculateExpiry(durationString: string): Date {
        const now = new Date();
        const value = parseInt(durationString.slice(0, -1));
        const unit = durationString.slice(-1).toLowerCase();

        if (isNaN(value)) {
            console.error('Invalid duration value, defaulting to 7 days:', durationString);
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days
        }

        switch (unit) {
            case 'd':
                return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
            case 'h':
                return new Date(now.getTime() + value * 60 * 60 * 1000);
            case 'm':
                return new Date(now.getTime() + value * 60 * 1000);
            default:
                console.error('Invalid duration unit, defaulting to 7 days:', durationString);
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days
        }
    }

    async createInvitation(
        createDto: CreatePropertyInvitationDto,
        inviter: User | null,
    ): Promise<PropertyInvitation> {
        const { email, spaceId, linkspaceUserId } = createDto;
        const invitationToken = randomBytes(32).toString('hex');
        const expiresAt = this.calculateExpiry(Config.propertyInvitation.tokenExpiresIn);

        const data: Prisma.PropertyInvitationUncheckedCreateInput = {
            email: email.toLowerCase(),
            spaceId,
            linkspaceUserId: linkspaceUserId,
            invitationToken,
            expiresAt,
            status: InvitationStatus.PENDING,
            invitedByUserId: inviter ? inviter.id : null,
        };

        const invitation = await this.prisma.propertyInvitation.create({
            data,
        });

        const invitationLink = `${Config.frontendBaseUrl}${Config.propertyInvitation.acceptPath}?token=${invitationToken}`;
        const inviterName = inviter
            ? inviter.display_name || inviter.username
            : 'The Management Team';

        await this.emailService.sendPropertyInvitationEmail({
            to: email,
            invitationLink,
            invitedBy: inviterName,
            spaceId,
        });

        return invitation;
    }

    async acceptInvitation(
        invitationToken: string,
        acceptingUser: User,
    ): Promise<{ invitation: PropertyInvitation; profile: any }> {
        // Consider a specific type for profile
        const invitation = await this.prisma.propertyInvitation.findUnique({
            where: { invitationToken },
        });

        if (!invitation) {
            throw new HttpError(404, 'Invitation not found.', 'INVITATION_NOT_FOUND');
        }
        if (invitation.status !== InvitationStatus.PENDING) {
            throw new HttpError(
                400,
                'Invitation is no longer valid or has already been accepted.',
                'INVITATION_NOT_PENDING',
            );
        }
        if (invitation.expiresAt < new Date()) {
            await this.prisma.propertyInvitation.update({
                where: { id: invitation.id },
                data: { status: InvitationStatus.EXPIRED },
            });
            throw new HttpError(400, 'Invitation has expired.', 'INVITATION_EXPIRED');
        }

        const linkspaceVerificationId = `LS_VERIFY_${randomBytes(8).toString('hex').toUpperCase()}`;

        const profile = await this.propertyProfileService.createPropertyProfileForUser(
            acceptingUser.id,
            invitation.spaceId,
            linkspaceVerificationId,
            invitation.linkspaceUserId,
        );

        const updatedInvitation = await this.prisma.propertyInvitation.update({
            where: { id: invitation.id },
            data: {
                status: InvitationStatus.ACCEPTED,
                acceptedAt: new Date(),
                acceptedByUserId: acceptingUser.id,
            },
        });

        return { invitation: updatedInvitation, profile };
    }

    async getInvitationByToken(invitationToken: string): Promise<PropertyInvitation | null> {
        return this.prisma.propertyInvitation.findUnique({
            where: { invitationToken },
        });
    }

    async getPendingInvitationsForEmail(email: string): Promise<PropertyInvitation[]> {
        return this.prisma.propertyInvitation.findMany({
            where: {
                email: email.toLowerCase(),
                status: InvitationStatus.PENDING,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getInvitationsBySpace(spaceId: string): Promise<PropertyInvitation[]> {
        return this.prisma.propertyInvitation.findMany({
            where: { spaceId },
            orderBy: { createdAt: 'desc' },
            include: {
                invitedByUser: { select: { id: true, username: true, display_name: true } },
                acceptedUser: { select: { id: true, username: true, display_name: true } },
            },
        });
    }

    async getInvitationsSentByUser(userId: string): Promise<PropertyInvitation[]> {
        return this.prisma.propertyInvitation.findMany({
            where: { invitedByUserId: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                acceptedUser: { select: { id: true, username: true, display_name: true } },
            },
        });
    }

    async createBulkInvitations(
        bulkCreateDto: CreateBulkPropertyInvitationsDto,
        inviter: User | null,
    ): Promise<{
        successfulInvitations: PropertyInvitation[];
        failedInvitations: { email: string; reason: string }[];
    }> {
        const successfulInvitations: PropertyInvitation[] = [];
        const failedInvitations: { email: string; reason: string }[] = [];

        for (const invitationDto of bulkCreateDto.invitations) {
            try {
                const invitation = await this.createInvitation(invitationDto, inviter);
                successfulInvitations.push(invitation);
            } catch (error: any) {
                failedInvitations.push({
                    email: invitationDto.email,
                    reason: error.message || 'Failed to create invitation.',
                });
            }
        }
        return { successfulInvitations, failedInvitations };
    }
}
