import swaggerJSDoc from 'swagger-jsdoc';
import { Config } from './index'; // Assuming your main config is here

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'NFC LinkCard Express API',
        version: '1.0.0',
        description:
            'API documentation for the NFC LinkCard Express application, including Profile Management, Link Management, Analytics, Association Features, and Property Management MVP.',
        contact: {
            name: 'API Support',
            url: 'https://yourdomain.com/support',
            email: 'support@yourdomain.com',
        },
        license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
        },
    },
    servers: [
        {
            url: `http://localhost:${Config.port || 3020}/api`,
            description: 'Local development server',
        },
        // TODO: Add production server URL if applicable
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            // Core Schemas
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    username: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    display_name: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            Profile: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    userId: { type: 'string', format: 'uuid' },
                    isPublic: { type: 'boolean' },
                    isDefault: { type: 'boolean' },
                    description: { type: 'string', nullable: true },
                    profileImage: { type: 'string', format: 'url', nullable: true },
                    profileType: {
                        type: 'string',
                        enum: ['DEFAULT', 'ASSOCIATION', 'PROPERTY_MANAGEMENT'],
                        default: 'DEFAULT',
                    },
                    linkspaceAffiliation: {
                        type: 'object',
                        nullable: true,
                        properties: {
                            spaceId: { type: 'string' },
                            linkspaceUserId: { type: 'string', nullable: true },
                        },
                    },
                    // ... other profile properties
                },
            },
            Link: {
                type: 'object',
                properties: {
                    /* Define Link properties here or reference full model */
                },
            },
            Analytics: {
                type: 'object',
                properties: {
                    /* Define Analytics properties here */
                },
            },
            Lead: {
                type: 'object',
                properties: {
                    /* Define Lead properties here */
                },
            },
            Association: {
                type: 'object',
                properties: {
                    /* Define Association properties here */
                },
            },
            AssociationMember: {
                type: 'object',
                properties: {
                    /* Define AssociationMember properties here */
                },
            },
            ProfileBadge: {
                type: 'object',
                properties: {
                    /* Define ProfileBadge properties here */
                },
            },

            // Property Invitation Schemas
            CreatePropertyInvitationDto: {
                type: 'object',
                required: ['email', 'spaceId'],
                properties: {
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'Email of the user to invite.',
                    },
                    spaceId: {
                        type: 'string',
                        description: 'The ID of the LinkSpace space to invite the user to.',
                    },
                    linkspaceUserId: {
                        type: 'string',
                        nullable: true,
                        description: 'Optional: Pre-assigned LinkSpace User ID for the invitee.',
                    },
                },
            },
            AcceptPropertyInvitationDto: {
                type: 'object',
                required: ['invitationToken'],
                properties: {
                    invitationToken: {
                        type: 'string',
                        description: 'The unique token from the invitation email.',
                    },
                },
            },
            PropertyInvitation: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'cuid' },
                    email: { type: 'string', format: 'email' },
                    spaceId: { type: 'string' },
                    linkspaceUserId: { type: 'string', nullable: true },
                    invitationToken: { type: 'string' },
                    status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'EXPIRED'] },
                    expiresAt: { type: 'string', format: 'date-time', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    acceptedByUserId: { type: 'string', format: 'uuid', nullable: true },
                    invitedByUserId: { type: 'string', format: 'uuid', nullable: true },
                },
            },

            // Standard Error Responses
            BadRequest: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            code: { type: 'string' },
                            details: { type: 'array', items: { type: 'object' }, nullable: true },
                        },
                    },
                },
            },
            Unauthorized: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            message: { type: 'string', example: 'Unauthorized' },
                            code: { type: 'string', example: 'UNAUTHORIZED' },
                        },
                    },
                },
            },
            Forbidden: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            message: { type: 'string', example: 'Forbidden' },
                            code: { type: 'string', example: 'FORBIDDEN' },
                        },
                    },
                },
            },
            NotFound: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            message: { type: 'string', example: 'Resource not found' },
                            code: { type: 'string', example: 'NOT_FOUND' },
                        },
                    },
                },
            },
            InternalServerError: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            message: { type: 'string', example: 'Internal Server Error' },
                            code: { type: 'string', example: 'INTERNAL_SERVER_ERROR' },
                        },
                    },
                },
            },
        },
    },
    apis: [
        './src/routes/**/*.ts',
        './src/property/routes/**/*.ts',
        './src/association/routes/**/*.ts',
        './src/controllers/**/*.ts',
        './src/property/controllers/**/*.ts',
        './src/association/controllers/**/*.ts',
    ],
};

const swaggerSpec = swaggerJSDoc(swaggerDefinition);

export default swaggerSpec;
