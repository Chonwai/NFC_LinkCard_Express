import { Service, Inject } from 'typedi';
import { PrismaClient, Profile, User } from '@prisma/client';
import { HttpError } from '../../utils/HttpError';
import { generateProfileSlug } from '../../utils/slug.util'; // Assuming a slug utility exists

@Service()
export class PropertyProfileService {
    @Inject(() => PrismaClient)
    private prisma: PrismaClient;

    constructor() {}

    async createPropertyProfileForUser(
        linkCardUserId: string,
        spaceId: string,
        linkspaceVerificationId: string,
    ): Promise<Profile> {
        // Check if user exists
        const user = await this.prisma.user.findUnique({
            where: { id: linkCardUserId },
        });

        if (!user) {
            throw new HttpError(
                404,
                'User not found to create property profile.',
                'USER_NOT_FOUND',
            );
        }

        // 1. Generate a unique slug for this property profile
        // This might need more sophisticated logic, e.g., based on space name or user preference
        const profileName = `Property Access - ${spaceId.substring(0, 8)}`; // Example name
        const slug = await generateProfileSlug(profileName, linkCardUserId);

        // 2. Create a new Profile record, linking it to the user and storing property-specific info
        const propertyProfile = await this.prisma.profile.create({
            data: {
                user_id: linkCardUserId,
                name: profileName,
                slug: slug,
                is_public: false, // Property profiles are likely private by default
                is_default: false, // Not the user's main default profile
                description: `Profile for accessing property space: ${spaceId}`,
                // Store property-specific identifiers in the meta field or dedicated fields if added
                meta: {
                    propertySpaceId: spaceId,
                    linkspaceVerificationId: linkspaceVerificationId,
                    profileType: 'PROPERTY_MANAGEMENT', // Custom type to distinguish this profile
                },
                appearance: {
                    // Minimal appearance, can be customized later
                    theme: 'default_property_theme',
                },
            },
            include: {
                user: { select: { username: true, display_name: true, email: true } },
            },
        });

        return propertyProfile;
    }

    async getPropertyProfileForUserBySpace(
        linkCardUserId: string,
        spaceId: string,
    ): Promise<Profile | null> {
        return this.prisma.profile.findFirst({
            where: {
                user_id: linkCardUserId,
                meta: {
                    path: ['propertySpaceId'],
                    equals: spaceId,
                },
            },
        });
    }

    async getAllPropertyProfilesForUser(linkCardUserId: string): Promise<Profile[]> {
        return this.prisma.profile.findMany({
            where: {
                user_id: linkCardUserId,
                meta: {
                    path: ['profileType'],
                    equals: 'PROPERTY_MANAGEMENT',
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }
}
