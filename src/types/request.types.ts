import { Request } from 'express';
import { User } from '@prisma/client'; // Or your specific User type/interface

/**
 * Extends the default Express Request interface to include the 'user' property,
 * which is added by the authentication middleware.
 */
export interface AuthenticatedRequest extends Request {
    user?: User; // Make user optional initially, auth middleware should ensure it exists in protected routes
}
