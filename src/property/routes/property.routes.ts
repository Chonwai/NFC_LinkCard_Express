import { Router } from 'express';
import { PropertyController } from '../controllers/property.controller';
import { authMiddleware } from '../../middleware/auth.middleware'; // Adjusted path
import Container from 'typedi';

const router = Router();
const propertyController = Container.get(PropertyController);

// Secure all property routes with authMiddleware
router.use(authMiddleware);

/**
 * @openapi
 * /api/property/link:
 *   post:
 *     tags:
 *       - Property
 *     summary: Link user to a property unit using a unique code
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LinkPropertyWithCodeDto'
 *     responses:
 *       200: { description: 'Successfully linked to property unit', $ref: '#/components/schemas/ApiResponseSuccessPropertyResident' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post('/link', propertyController.linkProperty);

/**
 * @openapi
 * /api/property/linked-units:
 *   get:
 *     tags:
 *       - Property
 *     summary: Get all property units linked to the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: 'List of linked property units', $ref: '#/components/schemas/ApiResponseSuccessListPropertyResident' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/linked-units', propertyController.getLinkedProperties);

export default router;
