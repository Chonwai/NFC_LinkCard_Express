import { Response } from 'express';
import { Service } from 'typedi';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { PropertyInvitationService } from '../services/PropertyInvitationService';
import {
    CreatePropertyInvitationDto,
    AcceptPropertyInvitationDto,
    CreateBulkPropertyInvitationsDto,
} from '../dtos/propertyInvitation.dto';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthenticatedRequest } from '../../types/request.types';
import { HttpError } from '../../utils/HttpError';
import { User } from '@prisma/client';

@Service()
export class PropertyInvitationController {
    constructor(private readonly invitationService: PropertyInvitationService) {}

    /**
     * @openapi
     * /api/property/invitations:
     *   post:
     *     tags:
     *       - Property Invitations
     *     summary: Create and send a new property invitation
     *     description: Allows an authenticated admin/manager to invite a user to a property space.
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreatePropertyInvitationDto'
     *     responses:
     *       '201':
     *         description: Invitation created and sent successfully.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success: { type: 'boolean', example: true }
     *                 data:
     *                   type: object
     *                   properties:
     *                     message: { type: 'string', example: 'Invitation sent successfully.' }
     *                     invitation: { $ref: '#/components/schemas/PropertyInvitation' }
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '500':
     *         $ref: '#/components/responses/InternalServerError'
     */
    public createInvitation = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const createDto = plainToClass(CreatePropertyInvitationDto, req.body);
            const errors = await validate(createDto);
            if (errors.length > 0) {
                return ApiResponse.validationError(res, errors);
            }

            if (!req.user) {
                return ApiResponse.unauthorized(res, 'User not authenticated.');
            }

            const inviter = req.user as User;
            const invitation = await this.invitationService.createInvitation(createDto, inviter);
            return ApiResponse.created(res, { invitation });
        } catch (error: unknown) {
            if (error instanceof HttpError) {
                return ApiResponse.error(
                    res,
                    error.message,
                    error.code || 'INVITATION_CREATION_FAILED',
                    error.details,
                    error.status || 400,
                );
            }
            console.error('Error creating invitation:', error);
            return ApiResponse.serverError(res, 'Failed to create invitation.');
        }
    };

    /**
     * @openapi
     * /api/property/invitations/accept:
     *   post:
     *     tags:
     *       - Property Invitations
     *     summary: Accept a property invitation
     *     description: Allows a user (potentially new or existing LinkCard user) to accept an invitation using a token. The user performing this action must be authenticated with LinkCard.
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AcceptPropertyInvitationDto'
     *     responses:
     *       '200':
     *         description: Invitation accepted successfully, property profile created/linked.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success: { type: 'boolean', example: true }
     *                 data:
     *                   type: object
     *                   properties:
     *                     message: { type: 'string', example: 'Invitation accepted successfully.' }
     *                     profile: { $ref: '#/components/schemas/Profile' }
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     *       '500':
     *         $ref: '#/components/responses/InternalServerError'
     */
    public acceptInvitation = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const acceptDto = plainToClass(AcceptPropertyInvitationDto, req.body);
            const errors = await validate(acceptDto);
            if (errors.length > 0) {
                return ApiResponse.validationError(res, errors);
            }

            if (!req.user) {
                return ApiResponse.unauthorized(res, 'User not authenticated.');
            }
            const linkCardUser = req.user as User;

            const result = await this.invitationService.acceptInvitation(
                acceptDto.invitationToken,
                linkCardUser,
            );

            return ApiResponse.success(res, result);
        } catch (error: unknown) {
            if (error instanceof HttpError) {
                return ApiResponse.error(
                    res,
                    error.message,
                    error.code || 'ACCEPT_INVITATION_FAILED',
                    error.details,
                    error.status || 400,
                );
            }
            console.error('Error accepting invitation:', error);
            return ApiResponse.serverError(res, 'Failed to accept invitation.');
        }
    };

    /**
     * @openapi
     * /api/property/invitations/token/{token}:
     *   get:
     *     tags:
     *       - Property Invitations
     *     summary: Get invitation details by token
     *     description: Retrieves details of a specific invitation using the token. This can be used by the frontend to display info before the user accepts.
     *     parameters:
     *       - in: path
     *         name: token
     *         required: true
     *         schema:
     *           type: string
     *         description: The invitation token.
     *     responses:
     *       '200':
     *         description: Invitation details.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/PropertyInvitation'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     *       '500':
     *         $ref: '#/components/responses/InternalServerError'
     */
    public getInvitationByToken = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { token } = req.params;
            if (!token) {
                return ApiResponse.badRequest(res, 'Invitation token is required.');
            }
            const invitation = await this.invitationService.getInvitationByToken(token);
            if (!invitation) {
                return ApiResponse.notFound(res, 'Invitation not found or has expired.');
            }
            return ApiResponse.success(res, { invitation });
        } catch (error: unknown) {
            if (error instanceof HttpError) {
                return ApiResponse.error(
                    res,
                    error.message,
                    error.code || 'GET_INVITATION_FAILED',
                    error.details,
                    error.status || 400,
                );
            }
            console.error('Error fetching invitation by token:', error);
            return ApiResponse.serverError(res, 'Failed to retrieve invitation.');
        }
    };

    /**
     * @openapi
     * /api/property/invitations/my-pending:
     *   get:
     *     tags:
     *       - Property Invitations
     *     summary: Get pending invitations for the current authenticated user
     *     description: Retrieves all PENDING property invitations for the authenticated LinkCard user based on their email, and that have not expired.
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       '200':
     *         description: A list of pending invitations.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/PropertyInvitation'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '500':
     *         $ref: '#/components/responses/InternalServerError'
     */
    public getMyPendingInvitations = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user || !req.user.email) {
                return ApiResponse.unauthorized(res, 'User not authenticated or email missing.');
            }
            const invitations = await this.invitationService.getPendingInvitationsForEmail(
                req.user.email,
            );
            return ApiResponse.success(res, { invitations });
        } catch (error: unknown) {
            if (error instanceof HttpError) {
                return ApiResponse.error(
                    res,
                    error.message,
                    error.code || 'GET_PENDING_INVITATIONS_FAILED',
                    error.details,
                    error.status || 400,
                );
            }
            console.error('Error fetching pending invitations:', error);
            return ApiResponse.serverError(res, 'Failed to retrieve pending invitations.');
        }
    };

    /**
     * @openapi
     * /api/property/invitations/bulk:
     *   post:
     *     tags:
     *       - Property Invitations
     *     summary: Create and send multiple property invitations in bulk
     *     description: Allows an authenticated admin/manager to invite multiple users to a property space in a single request.
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateBulkPropertyInvitationsDto'
     *     responses:
     *       '200':
     *         description: Bulk invitation process completed. Check results for individual invitation statuses.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success: { type: 'boolean', example: true }
     *                 data:
     *                   type: object
     *                   properties:
     *                     successfulInvitations:
     *                       type: array
     *                       items:
     *                         $ref: '#/components/schemas/PropertyInvitation'
     *                     failedInvitations:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           email: { type: 'string' }
     *                           reason: { type: 'string' }
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '500':
     *         $ref: '#/components/responses/InternalServerError'
     */
    public createBulkInvitations = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const bulkCreateDto = plainToClass(CreateBulkPropertyInvitationsDto, req.body);
            const errors = await validate(bulkCreateDto);
            if (errors.length > 0) {
                // Consider how to handle nested validation errors from the array
                return ApiResponse.validationError(res, errors);
            }

            if (!req.user) {
                return ApiResponse.unauthorized(res, 'User not authenticated.');
            }

            // TODO: Add more robust authorization check here.
            // For example, check if req.user has a specific role or permission
            // to perform bulk invitations.
            // e.g., if (req.user.role !== UserRole.ADMIN) {
            // return ApiResponse.forbidden(res, 'You do not have permission to perform this action.');
            // }

            const inviter = req.user as User;
            const result = await this.invitationService.createBulkInvitations(
                bulkCreateDto,
                inviter,
            );

            // Determine overall success. If all invitations failed, maybe return a different status code or success:false.
            // For now, returning 200 with a mix of success/failure in the data.
            return ApiResponse.success(res, result);
        } catch (error: unknown) {
            // This catch block might be too generic for bulk operations.
            // The service layer now returns successes and failures, so this might only catch unexpected errors.
            if (error instanceof HttpError) {
                return ApiResponse.error(
                    res,
                    error.message,
                    error.code || 'BULK_INVITATION_FAILED',
                    error.details,
                    error.status || 400,
                );
            }
            console.error('Error creating bulk invitations:', error);
            return ApiResponse.serverError(res, 'Failed to process bulk invitations.');
        }
    };
}
