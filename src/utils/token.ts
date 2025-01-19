import crypto from 'crypto';

export const generateToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
};
