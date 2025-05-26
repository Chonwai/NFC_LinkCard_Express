import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0', // 指定 OpenAPI 版本
        info: {
            title: 'NFC LinkCard Express API', // API 標題
            version: '1.0.0', // API 版本
            description:
                'API documentation for the NFC LinkCard Express backend service, managing user profiles, links, analytics, and association features.',
        },
        servers: [
            {
                url: 'http://localhost:3020', // 開發環境服務器 URL (請根據實際情況修改端口和基礎路徑)
                description: 'Development server',
            },
            // 如果有其他環境 (例如生產環境)，可以在這裡添加
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    // 定義名為 bearerAuth 的安全方案
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT', // 指定令牌格式為 JWT
                },
            },
            // Define reusable schemas
            schemas: {
                // Placeholder for CreateAssociationDto - define actual properties based on your DTO
                CreateAssociationDto: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            example: 'Tech Innovators Association',
                        },
                        description: {
                            type: 'string',
                            example: 'Association for leading tech innovators.',
                        },
                        // Add other properties from your DTO here...
                    },
                    required: ['name'], // Specify required fields
                },
                // Placeholder for a successful response containing an association
                ApiResponseSuccessAssociation: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true,
                        },
                        data: {
                            type: 'object',
                            properties: {
                                // Assuming you have an 'Association' schema defined elsewhere or define it here
                                association: {
                                    $ref: '#/components/schemas/Association', // You'll need to define this too!
                                },
                            },
                        },
                    },
                },
                // Placeholder for the Association schema itself
                Association: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        isPublic: { type: 'boolean' },
                        // ... other association properties
                    },
                },
                // Placeholder for a generic error response body
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        error: {
                            type: 'object',
                            properties: {
                                message: { type: 'string' },
                                code: { type: 'string' },
                                details: { type: 'object', nullable: true },
                            },
                        },
                    },
                },
                // Placeholder for a successful message response
                ApiResponseSuccessMessage: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' },
                    },
                },
                // Added Schemas for Property Management MVP
                LinkPropertyWithCodeDto: {
                    type: 'object',
                    required: [
                        'propertyManagementCompanyCode',
                        'propertyExternalId',
                        'unitExternalId',
                        'uniqueCode',
                    ],
                    properties: {
                        propertyManagementCompanyCode: {
                            type: 'string',
                            example: 'LINK_API_PROVIDER',
                            description: 'Code or ID for the PropertyManagementCompany',
                        },
                        propertyExternalId: {
                            type: 'string',
                            example: 'building_123',
                            description: 'External ID of the property (e.g., building)',
                        },
                        unitExternalId: {
                            type: 'string',
                            example: 'unit_A101',
                            description: 'External ID of the unit (e.g., apartment)',
                        },
                        uniqueCode: {
                            type: 'string',
                            example: 'ABCXYZ123',
                            description: 'The unique code for linking',
                        },
                    },
                },
                PropertyResidentDto: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Internal ID of the resident link',
                        },
                        userId: { type: 'string', format: 'uuid', description: 'ID of the user' },
                        propertyUnitId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID of the property unit',
                        },
                        unitNumber: {
                            type: 'string',
                            example: 'Flat 12B',
                            description: 'Unit number',
                        },
                        propertyName: {
                            type: 'string',
                            example: 'Grand Building Tower A',
                            description: 'Name of the property',
                        },
                        propertyAddress: {
                            type: 'string',
                            example: '123 Main St, Anytown',
                            description: 'Address of the property',
                        },
                        verificationMethod: {
                            type: 'string',
                            enum: ['UNIQUE_CODE', 'ADMIN_APPROVAL'],
                            nullable: true,
                            description: 'Method used for verification',
                        },
                        meta: {
                            type: 'object',
                            nullable: true,
                            description: 'Additional metadata',
                        },
                    },
                },
                ApiResponseSuccessPropertyResident: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { $ref: '#/components/schemas/PropertyResidentDto' },
                    },
                },
                ApiResponseSuccessListPropertyResident: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/PropertyResidentDto' },
                        },
                    },
                },
                Facility: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Gymnasium' },
                        external_facility_id: {
                            type: 'string',
                            nullable: true,
                            example: 'gym_001',
                        },
                        property_id: { type: 'string', format: 'uuid' },
                        access_methods_supported: {
                            type: 'object',
                            example: { QR: true, NFC: false },
                        },
                        meta: { type: 'object', nullable: true },
                    },
                },
                ApiResponseSuccessListFacility: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Facility' },
                        },
                    },
                },
                RequestFacilityAccessDto: {
                    type: 'object',
                    required: ['facilityId', 'accessMethod'],
                    properties: {
                        facilityId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID of the facility',
                        },
                        accessMethod: {
                            type: 'string',
                            enum: ['QR', 'NFC'],
                            example: 'QR',
                            description: 'Requested access method',
                        },
                    },
                },
                FacilityAccessCredentialDto: {
                    type: 'object',
                    properties: {
                        credentialType: {
                            type: 'string',
                            enum: ['QR_CODE', 'NFC_DATA'],
                            example: 'QR_CODE',
                        },
                        data: {
                            type: 'string',
                            example: 'raw_qr_data_or_nfc_payload',
                            description: 'Credential data',
                        },
                        expiresAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-12-31T23:59:59Z',
                            description: 'Expiry time of the credential',
                        },
                        facilityName: { type: 'string', nullable: true, example: 'Gymnasium' },
                    },
                },
                ApiResponseSuccessFacilityAccessCredential: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { $ref: '#/components/schemas/FacilityAccessCredentialDto' },
                    },
                },
                // End of Added Schemas for Property Management MVP
            },
            // Define reusable responses
            responses: {
                BadRequest: {
                    description: 'Bad Request - Invalid input data or validation error.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
                Unauthorized: {
                    description: 'Unauthorized - Authentication required or invalid token.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
                Forbidden: {
                    description:
                        'Forbidden - User does not have permission to access the resource.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
                NotFound: {
                    description: 'Not Found - The requested resource could not be found.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
                InternalServerError: {
                    description:
                        'Internal Server Error - An unexpected error occurred on the server.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
            },
            // Define reusable parameters
            parameters: {
                AssociationId: {
                    in: 'path',
                    name: 'id',
                    required: true,
                    schema: {
                        type: 'string',
                        format: 'uuid',
                    },
                    description: 'The unique identifier of the association.',
                },
                PageQuery: {
                    in: 'query',
                    name: 'page',
                    schema: {
                        type: 'integer',
                        default: 1,
                        minimum: 1,
                    },
                    description: 'Page number for pagination.',
                },
                LimitQuery: {
                    in: 'query',
                    name: 'limit',
                    schema: {
                        type: 'integer',
                        default: 10,
                        minimum: 1,
                        maximum: 100, // Example max limit
                    },
                    description: 'Number of items per page.',
                },
                // Add other common parameters like MemberId, LeadId etc.
            },
        },
        security: [
            {
                bearerAuth: [], // 全局應用 bearerAuth 安全方案 (可以被個別操作覆蓋)
            },
        ],
    },
    // APIs array defines where swagger-jsdoc should look for JSDoc comments.
    apis: [
        path.join(__dirname, '../routes/**/*.ts'), // General routes
        path.join(__dirname, '../controllers/**/*.ts'), // General controllers
        path.join(__dirname, '../association/routes/**/*.ts'), // Association routes
        path.join(__dirname, '../association/controllers/**/*.ts'), // Association controllers
        path.join(__dirname, '../property/routes/**/*.ts'), // Property routes
        path.join(__dirname, '../property/controllers/**/*.ts'), // Property controllers
    ],
};

export default options;
