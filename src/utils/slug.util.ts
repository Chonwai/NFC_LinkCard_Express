import { PrismaClient } from '@prisma/client';
//nanoid v3 or lower is CJS, v4+ is ESM only. Assuming project setup allows CJS or nanoid v3 is used.
// If using nanoid v4+ with ESM, the import would be: import { customAlphabet } from 'nanoid';
// For broad compatibility with common project setups (especially older TS/Node configurations that might default to CJS for node_modules),
// we might need to use require if it's an older version or if the project isn't configured for ESM imports from node_modules.
// However, typical modern TypeScript setups with `moduleResolution: "node"` should handle `import { customAlphabet } from 'nanoid';` fine if nanoid is listed in dependencies.
// Let's assume a compatible version of nanoid is installed that works with this import style.
// import { customAlphabet } from 'nanoid'; // Removed static import

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
        const { customAlphabet } = await import('nanoid'); // Dynamic import
        const generateNanoId = customAlphabet('1234567890abcdef', 6);
        finalSlug = `${baseSlug}-${generateNanoId()}`;
        attempts++;
    }

    // Fallback to a more random slug if attempts fail
    const { customAlphabet: customAlphabetFallback } = await import('nanoid'); // Dynamic import for fallback
    const generateNanoIdFallback = customAlphabetFallback(
        '1234567890abcdefghijklmnopqrstuvwxyz',
        10,
    );
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
