import { Router } from 'express';
import { FacilityController } from '../controllers/facility.controller';
import { authMiddleware } from '../../middleware/auth.middleware'; // Adjusted path
import Container from 'typedi';

const router = Router();
const facilityController = Container.get(FacilityController);

// Secure all facility routes with authMiddleware
router.use(authMiddleware);

/**
 * @openapi
 * /api/facility/unit/{propertyUnitId}:
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
router.get('/unit/:propertyUnitId', facilityController.getFacilities);

/**
 * @openapi
 * /api/facility/request-access:
 *   post:
 *     tags:
 *       - Facility
 *     summary: Request access credential for a facility
 *     security:
 *       - bearerAuth: []
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
router.post('/request-access', facilityController.requestAccess);

export default router;
