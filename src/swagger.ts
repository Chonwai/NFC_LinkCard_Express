import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import options from './config/swagger.config'; // 從配置文件導入 options

const specs = swaggerJSDoc(options); // 使用導入的 options

// 添加日誌來查看生成的 specs 內容
console.log('Generated Swagger Specs:', JSON.stringify(specs, null, 2));

export { specs, swaggerUi };
