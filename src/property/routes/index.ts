import { Router } from 'express';
import { Container } from 'typedi';
import { authMiddleware } from '../../middleware/auth.middleware';
import { PropertyController } from '../controllers/PropertyController';
import { FacilityController } from '../controllers/FacilityController';
import { Request, Response } from 'express';

const router = Router();

// Get controller instances
const propertyController = Container.get(PropertyController);
const facilityController = Container.get(FacilityController);

// --- Property Routes --- (Formerly in property.routes.ts)

/**
 * @openapi
 * /link:  // Path adjusted for base path /api/property
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
router.post('/link', authMiddleware, propertyController.linkProperty);

/**
 * @openapi
 * /linked-units: // Path adjusted for base path /api/property
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
router.get('/linked-units', authMiddleware, propertyController.getLinkedProperties);

// --- Facility Routes --- (Formerly in facility.routes.ts)
// Note: Facility routes will be mounted under /api/facility, so paths here are relative to that.

/**
 * @openapi
 * /unit/{propertyUnitId}: // Path adjusted for base path /api/facility
 *   get:
 *     tags:
 *       - Facility
 *     summary: Get facilities for a specific property unit linked to the user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyUnitId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the property unit.
 *     responses:
 *       200: { description: 'List of facilities for the unit', $ref: '#/components/schemas/ApiResponseSuccessListFacility' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/unit/:propertyUnitId', authMiddleware, facilityController.getFacilities);

/**
 * @openapi
 * /unit/{propertyUnitId}/request-access: // Path adjusted for base path /api/facility
 *   post:
 *     tags:
 *       - Facility
 *     summary: Request access credential for a facility within a specific property unit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyUnitId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the property unit.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RequestFacilityAccessDto'
 *     responses:
 *       200: { description: 'Facility access credential generated', $ref: '#/components/schemas/ApiResponseSuccessFacilityAccessCredential' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post(
    '/unit/:propertyUnitId/request-access',
    authMiddleware,
    facilityController.requestAccess,
);

export default router;
