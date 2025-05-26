import { Request } from 'express';
import { User } from '@prisma/client'; // Assuming User model is in Prisma

export interface AuthenticatedRequest extends Request {
    user?: User & { id: string }; // Make user property optional and ensure id is string
}
