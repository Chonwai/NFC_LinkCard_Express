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
import { parse as parseDuration } from 'tinyduration'; // For parsing duration string like '7d'

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
        try {
            const duration = parseDuration(durationString);
            let totalMilliseconds = 0;
            if (duration.days) totalMilliseconds += duration.days * 24 * 60 * 60 * 1000;
            if (duration.hours) totalMilliseconds += duration.hours * 60 * 60 * 1000;
            if (duration.minutes) totalMilliseconds += duration.minutes * 60 * 1000;
            if (duration.seconds) totalMilliseconds += duration.seconds * 1000;
            return new Date(Date.now() + totalMilliseconds);
        } catch (error) {
            console.error('Error parsing duration string, defaulting to 7 days:', error);
            return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days if parsing fails
        }
    }

    async createInvitation(
        createDto: CreatePropertyInvitationDto,
        inviter: User | null, // Allow inviter to be User or null
    ): Promise<PropertyInvitation> {
        const { email, spaceId, linkspaceUserId } = createDto;

        // 1. Generate a unique invitation token
        const invitationToken = randomBytes(32).toString('hex');
        const expiresAt = this.calculateExpiry(Config.propertyInvitation.tokenExpiresIn);

        // 2. Store the invitation in the database
        const dataToCreate: any = {
            email: email.toLowerCase(),
            spaceId,
            linkspaceUserId: linkspaceUserId,
            invitationToken,
            expiresAt,
            status: InvitationStatus.PENDING,
        };

        if (inviter) {
            dataToCreate.invitedByUser = { connect: { id: inviter.id } };
        } else {
            // Explicitly set invitedByUserId to null if no inviter, assuming the field is nullable
            dataToCreate.invitedByUserId = null;
        }

        const invitation = await this.prisma.propertyInvitation.create({
            data: dataToCreate as Prisma.PropertyInvitationCreateInput, // Used Prisma.PropertyInvitationCreateInput
        });

        // 3. Send an invitation email
        const invitationLink = `${Config.frontendBaseUrl}${Config.propertyInvitation.acceptPath}?token=${invitationToken}`;

        // Handle inviter name for email display
        const inviterName = inviter
            ? inviter.display_name || inviter.username
            : 'The Management Team'; // Fallback name if inviter is null

        await this.emailService.sendPropertyInvitationEmail({
            to: email,
            invitationLink,
            invitedBy: inviterName,
            spaceId, // You might want to resolve space name via LinkSpace API for better email content
        });

        return invitation;
    }

    async acceptInvitation(
        invitationToken: string, // Changed from DTO to just token
        linkCardUser: User, // The LinkCard user accepting the invitation
    ): Promise<{ invitation: PropertyInvitation; profile: any }> {
        // Return type updated
        const invitation = await this.prisma.propertyInvitation.findUnique({
            where: { invitationToken },
        });

        if (!invitation) {
            throw new HttpError(404, 'Invitation not found.', 'INVALID_INVITATION_TOKEN');
        }

        if (invitation.status !== InvitationStatus.PENDING) {
            throw new HttpError(400, 'Invitation is no longer valid.', 'INVITATION_NOT_PENDING');
        }

        if (invitation.expiresAt && invitation.expiresAt < new Date()) {
            // Check if expiresAt is not null
            await this.prisma.propertyInvitation.update({
                where: { id: invitation.id },
                data: { status: InvitationStatus.EXPIRED },
            });
            throw new HttpError(400, 'Invitation has expired.', 'INVITATION_EXPIRED');
        }

        // Optional: Check if the email matches if the user is already logged in and email is set
        if (invitation.email.toLowerCase() !== linkCardUser.email.toLowerCase()) {
            throw new HttpError(
                403,
                'This invitation is intended for a different email address.',
                'INVITATION_EMAIL_MISMATCH',
            );
        }

        // Mark invitation as accepted and link the user
        const updatedInvitation = await this.prisma.propertyInvitation.update({
            where: { id: invitation.id },
            data: {
                status: InvitationStatus.ACCEPTED,
                acceptedAt: new Date(),
                acceptedByUserId: linkCardUser.id,
                // If linkspaceUserId was in the invitation, it's already there.
                // If not, and LinkSpace requires it, we might need another step or different flow.
            },
        });

        // Create the property-specific profile for the LinkCard user
        const profile = await this.propertyProfileService.createPropertyProfileForUser(
            linkCardUser.id,
            invitation.spaceId,
            invitation.linkspaceUserId || '', // Pass empty string if null
        );

        return { invitation: updatedInvitation, profile };
    }

    async getInvitationByToken(invitationToken: string): Promise<PropertyInvitation | null> {
        const invitation = await this.prisma.propertyInvitation.findUnique({
            where: { invitationToken },
        });

        if (!invitation) {
            return null;
        }
        // Potentially check for expiry or status if needed by the caller
        return invitation;
    }

    async getPendingInvitationsForEmail(email: string): Promise<PropertyInvitation[]> {
        return this.prisma.propertyInvitation.findMany({
            where: {
                email: email.toLowerCase(),
                status: InvitationStatus.PENDING,
                OR: [
                    { expiresAt: null }, // Invitations that do not expire
                    { expiresAt: { gte: new Date() } }, // Invitations that have not expired
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                // Optionally include who invited them if needed on the frontend
                // invitedByUser: { select: { id: true, username: true, display_name: true } },
            },
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
        inviter: User | null, // Allow inviter to be User or null
    ): Promise<{
        successfulInvitations: PropertyInvitation[];
        failedInvitations: { email: string; reason: string }[];
    }> {
        const successfulInvitations: PropertyInvitation[] = [];
        const failedInvitations: { email: string; reason: string }[] = [];

        for (const invitationDto of bulkCreateDto.invitations) {
            try {
                // Optional: Add a check here to see if an active PENDING invitation already exists for this email and spaceId
                // to prevent duplicate invitations if desired.
                // const existingInvitation = await this.prisma.propertyInvitation.findFirst({
                // where: {
                // email: invitationDto.email.toLowerCase(),
                // spaceId: invitationDto.spaceId,
                // status: InvitationStatus.PENDING,
                // OR: [
                // { expiresAt: null },
                // { expiresAt: { gte: new Date() } },
                // ],
                // }
                // });
                // if (existingInvitation) {
                // failedInvitations.push({ email: invitationDto.email, reason: 'An active pending invitation already exists for this email and space.' });
                // continue;
                // }

                const invitation = await this.createInvitation(invitationDto, inviter);
                successfulInvitations.push(invitation);
            } catch (error: any) {
                console.error(`Failed to create invitation for ${invitationDto.email}:`, error);
                failedInvitations.push({
                    email: invitationDto.email,
                    reason: error.message || 'Unknown error',
                });
            }
        }

        return { successfulInvitations, failedInvitations };
    }
}
