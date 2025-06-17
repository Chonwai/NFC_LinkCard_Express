import { PrismaClient } from '@prisma/client';
import { customAlphabet } from 'nanoid';

const prisma = new PrismaClient(); // TODO: Consider injecting PrismaClient for better testability

/**
 * Generates a URL-friendly slug from a given name.
 * Replaces spaces with hyphens and converts to lowercase.
 * Appends a short random string to ensure uniqueness if the base slug is taken.
 * @param name The string to slugify.
 * @param _userId Optional userId to further scope uniqueness or for specific slug patterns (currently unused but kept for potential future use).
 * @returns A unique slug string.
 */
export async function generateProfileSlug(name: string, _userId?: string): Promise<string> {
    let baseSlug = name
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, ''); // Remove non-alphanumeric characters except hyphens

    if (!baseSlug) {
        baseSlug = 'profile'; // Default if name results in empty slug
    }

    // Check for uniqueness
    let attempts = 0;
    let finalSlug = baseSlug;
    while (attempts < 5) {
        const existingProfile = await prisma.profile.findUnique({
            where: { slug: finalSlug },
        });
        if (!existingProfile) {
            return finalSlug;
        }
        // If slug exists, append a short random string
        const generateNanoId = customAlphabet('1234567890abcdef', 6);
        finalSlug = `${baseSlug}-${generateNanoId()}`;
        attempts++;
    }

    // Fallback to a more random slug if attempts fail
    const generateNanoIdFallback = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10);
    return `${baseSlug}-${generateNanoIdFallback()}`;
}

/**
 * Generates a generic slug for other entities if needed.
 * @param name The string to process.
 * @returns A slugified string.
 */
export function generateGenericSlug(name: string): string {
    return (
        name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '') || 'entity'
    );
}
