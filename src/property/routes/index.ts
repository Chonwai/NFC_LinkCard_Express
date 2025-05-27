import { RequestHandler, Router } from 'express';
import { Container } from 'typedi'; // Import Container
import { PropertyInvitationController } from '../controllers/PropertyInvitationController';
import { authMiddleware } from '../../middleware/auth.middleware'; // Path to your auth middleware

const router = Router();
const invitationController = Container.get(PropertyInvitationController); // Corrected instantiation

/**
 * @openapi
 * tags:
 *   name: Property Invitations
 *   description: API endpoints for managing property invitations
 */

// POST /api/property/invitations - Create a new invitation
router.post(
    '/',
    authMiddleware, // Protected route
    invitationController.createInvitation as RequestHandler,
);

// POST /api/property/invitations/accept - Accept an invitation
router.post(
    '/accept',
    authMiddleware, // Protected: User must be logged in to LinkCard to accept
    invitationController.acceptInvitation as RequestHandler,
);

// GET /api/property/invitations/token/:token - Get invitation details by token
router.get(
    '/token/:token',
    // No auth needed for this one, as frontend might check token before login/signup
    invitationController.getInvitationByToken as RequestHandler,
);

// GET /api/property/invitations/my-pending - Get pending invitations for the authenticated user
router.get(
    '/my-pending',
    authMiddleware, // Protected route
    invitationController.getMyPendingInvitations as RequestHandler,
);

// TODO: Add routes for admin/manager to view invitations for a space, resend, revoke, etc.
// Example:
// router.get(
//     '/space/:spaceId',
//     authMiddleware, // Protected & role-checked
//     invitationController.getInvitationsForSpace // Method to be created in controller & service
// );

export default router;
