import { Service, Inject } from 'typedi';
import {
    RequestFacilityAccessDto,
    FacilityAccessCredentialDto,
    FacilityAccessMethod,
} from '../dtos/facility.dto';
import { LinkApiIntegrationService } from './LinkApiIntegrationService';
import { logger } from '../../utils/logger';
import {
    PrismaClient,
    PropertyResident,
    PropertyUnit,
    Facility as PrismaFacility, // Alias to avoid conflict with potential DTO
    PropertyManagementCompany,
} from '@prisma/client';

// Example DTO for facility if needed for local representation, otherwise use PrismaFacility
export interface FacilityDto {
    id: string;
    name: string;
    // other relevant fields from your PrismaFacility model or link-api
}

@Service()
export class FacilityService {
    private prisma: PrismaClient;
    private linkApiIntegrationService: LinkApiIntegrationService;

    constructor() {
        this.prisma = new PrismaClient();
        this.linkApiIntegrationService = new LinkApiIntegrationService();
    }

    /**
     * Retrieves facilities available for a specific property unit a user is linked to.
     * This might involve checking the user's role/subscription via link-api or local cache.
     */
    async getFacilitiesForPropertyUnit(
        userId: string,
        propertyUnitId: string,
    ): Promise<FacilityDto[]> {
        logger.info(`User ${userId} fetching facilities for unit ${propertyUnitId}`);

        const residentLink = await this.prisma.propertyResident.findFirst({
            where: {
                user_id: userId,
                property_unit_id: propertyUnitId,
                verification_status: true,
            },
            include: {
                propertyUnit: {
                    include: {
                        property: {
                            include: {
                                propertyManagementCompany: true,
                            },
                        },
                    },
                },
            },
        });

        if (!residentLink || !residentLink.propertyUnit.property.propertyManagementCompany) {
            throw new Error(
                'No verified link found for this user and unit, or PMC not configured.',
            );
        }

        const pmc = residentLink.propertyUnit.property.propertyManagementCompany;
        const propertyExternalId = residentLink.propertyUnit.property.external_property_id;
        const unitExternalId = residentLink.propertyUnit.external_unit_id;
        const userExternalAccountId = residentLink.external_account_id; // Account ID from link-api

        // TODO: Call link-api to get available facilities for this user/unit/property
        // This is a placeholder. The actual call would depend on link-api's capabilities.
        // For example: facilities = await this.linkApiIntegrationService.getAvailableFacilities(pmc, userExternalAccountId, unitExternalId);
        // For now, let's assume we fetch local PrismaFacility records linked to the property/unit for MVP
        // and access control is handled by link-api when generating credential.

        const localFacilities = await this.prisma.facility.findMany({
            where: {
                // Assuming Facility is linked to Property or PropertyUnit
                // This model needs to be defined in schema.prisma
                property_id: residentLink.propertyUnit.property_id, // Or property_unit_id if applicable
            },
        });

        return localFacilities.map((f) => this.mapFacilityToDto(f));
    }

    /**
     * Requests an access credential (e.g., QR code) for a specific facility.
     */
    async requestFacilityAccess(
        userId: string,
        propertyUnitId: string,
        dto: RequestFacilityAccessDto,
    ): Promise<FacilityAccessCredentialDto> {
        logger.info(
            `User ${userId} requesting ${dto.accessMethod} access for facility ${dto.facilityId} in unit ${propertyUnitId}`,
        );

        const residentLink = await this.prisma.propertyResident.findFirst({
            where: {
                user_id: userId,
                property_unit_id: propertyUnitId,
                verification_status: true,
            },
            include: {
                propertyUnit: {
                    include: {
                        property: {
                            include: {
                                propertyManagementCompany: true,
                            },
                        },
                    },
                },
            },
        });

        if (
            !residentLink ||
            !residentLink.external_account_id ||
            !residentLink.propertyUnit.property.propertyManagementCompany
        ) {
            throw new Error(
                'User not properly linked or authorized for this unit, or PMC not configured.',
            );
        }

        const pmc = residentLink.propertyUnit.property.propertyManagementCompany;
        const userExternalAccountId = residentLink.external_account_id;

        // Optional: Fetch local facility to get its external ID if not provided directly
        const facility = await this.prisma.facility.findUnique({
            where: { id: dto.facilityId },
        });

        if (!facility || !facility.external_facility_id) {
            throw new Error('Facility not found or not configured for external access.');
        }

        const credentialResult =
            await this.linkApiIntegrationService.generateFacilityAccessCredential(
                pmc,
                userExternalAccountId, // User's account ID from link-api
                facility.external_facility_id, // Facility's external ID
                dto.accessMethod,
            );

        if (!credentialResult.success) {
            throw new Error(
                credentialResult.message ||
                    'Failed to generate facility access credential from PMS.',
            );
        }

        // Log the access attempt/credential generation
        await this.prisma.facilityAccessLog.create({
            data: {
                property_resident_id: residentLink.id,
                facility_id: dto.facilityId,
                access_method: dto.accessMethod, // This should be FacilityAccessMethod enum from Prisma schema
                access_time: new Date(), // Record the time of credential generation/request
                is_successful: true, // Assuming successful credential generation means a successful log entry init
                meta: {
                    credential_expires_at: credentialResult.expiresAt, // Store expiration from PMS here
                    // you can add other details from credentialResult if needed
                },
            },
        });

        return {
            credentialType: dto.accessMethod === FacilityAccessMethod.QR ? 'QR_CODE' : 'NFC_DATA',
            data: credentialResult.data,
            expiresAt: credentialResult.expiresAt || '',
            facilityName: facility.name, // Add facility name for context
        };
    }

    private mapFacilityToDto(facility: PrismaFacility): FacilityDto {
        return {
            id: facility.id,
            name: facility.name,
            // map other fields as necessary
        };
    }
}
