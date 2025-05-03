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
                // You might need schemas for other DTOs like UpdateAssociationDto, AssociationSummary, ApiResponseAssociationList etc.
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
    // 指定包含 JSDoc/TSDoc 註解的文件路徑
    apis: [
        // 保留通用路徑
        path.join(__dirname, '../**/*.controller.ts'),
        path.join(__dirname, '../**/routes/**/*.ts'),
        // 添加更明確指向 association 目錄的路徑
        path.join(__dirname, '../association/controllers/**/*.ts'),
        path.join(__dirname, '../association/routes/**/*.ts'),
        // 如果 DTOs 文件中也包含需要被引用的 schema 定義，也可以加入：
        // path.join(__dirname, '../dtos/**/*.dto.ts'),
    ],
};

export default options;
