import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'NFC LinkCard Express API',
            version: '1.0.0',
            description: 'API 文檔 for NFC LinkCard Express',
        },
        servers: [
            {
                url: 'http://localhost:3020',
                description: '開發環境',
            },
            {
                url: 'https://api.linkcards.app',
                description: '生產環境',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/**/*.ts'], // 指定包含API註釋的檔案路徑
};

const specs = swaggerJSDoc(options);

export { specs, swaggerUi };
