import crypto from 'crypto';

export const generateToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

export const generateRandomChars = (length: number): string => {
    return crypto.randomBytes(length).toString('hex');
};
