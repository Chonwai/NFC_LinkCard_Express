import {
    PrismaClient,
    User,
    PropertyResident,
    PropertyUnit,
    Property,
    PropertyManagementCompany,
    ResidentVerificationMethod,
    Prisma, // Import Prisma namespace for advanced types
} from '@prisma/client';
import { Service, Inject } from 'typedi';
import { LinkPropertyWithCodeDto, PropertyResidentDto } from '../dtos/property.dto'; // Adjusted path
import { LinkApiIntegrationService } from './linkApi.integration.service'; // Path remains similar if moved together
// import { HttpError } from '../../utils/HttpError'; // Will be removed or replaced
import { logger } from '../../utils/logger'; // Adjusted path

// Define a type for the populated resident link
type PropertyResidentWithRelations = PropertyResident & {
    propertyUnit: PropertyUnit & {
        property: Property;
    };
};

@Service()
export class PropertyService {
    constructor(
        @Inject('prisma') private readonly prisma: PrismaClient,
        private readonly linkApiIntegrationService: LinkApiIntegrationService,
    ) {}

    /**
     * Links a user to a property unit using a unique code.
     * This is an MVP implementation focusing on the unique code method.
     */
    async linkPropertyWithCode(
        userId: string,
        dto: LinkPropertyWithCodeDto,
    ): Promise<PropertyResidentDto> {
        logger.info(
            `User ${userId} attempting to link with code ${dto.uniqueCode} for unit ${dto.unitExternalId}`,
        );

        const pmc = await this.prisma.propertyManagementCompany.findFirst({
            where: { name: 'Link API Provider' },
        });

        if (!pmc) {
            // Throwing a more generic error object, assuming controller handles it for ApiResponse
            throw { status: 404, message: 'Property Management Company configuration not found.' };
        }

        const verificationResult = await this.linkApiIntegrationService.verifyUniqueCode(
            pmc,
            dto.propertyExternalId,
            dto.unitExternalId,
            dto.uniqueCode,
            userId,
        );

        if (!verificationResult.success) {
            throw {
                status: 400,
                message: verificationResult.message || 'Unique code verification failed.',
            };
        }

        let property = await this.prisma.property.findUnique({
            where: { external_property_id: dto.propertyExternalId },
        });

        if (!property) {
            property = await this.prisma.property.create({
                data: {
                    name: verificationResult.propertyName || 'Property from LinkAPI',
                    external_property_id: dto.propertyExternalId,
                    property_management_company_id: pmc.id,
                    address: verificationResult.propertyAddress || undefined,
                },
            });
        }

        let unit = await this.prisma.propertyUnit.findUnique({
            where: { external_unit_id: dto.unitExternalId },
        });

        if (!unit) {
            unit = await this.prisma.propertyUnit.create({
                data: {
                    unit_number: verificationResult.unitNumber || 'Unit from LinkAPI',
                    external_unit_id: dto.unitExternalId,
                    property_id: property.id,
                },
            });
        }

        const existingLink = await this.prisma.propertyResident.findUnique({
            where: {
                user_property_unit_unique_constraint: {
                    user_id: userId,
                    property_unit_id: unit.id,
                },
            },
        });

        if (existingLink) {
            if (existingLink.verification_status) {
                logger.info(`User ${userId} already linked and verified for unit ${unit.id}.`);
            } else {
                await this.prisma.propertyResident.update({
                    where: { id: existingLink.id },
                    data: {
                        verification_status: true,
                        verified_at: new Date(),
                        verification_method: ResidentVerificationMethod.UNIQUE_CODE,
                        external_role_id: verificationResult.externalRoleId,
                        external_account_id: verificationResult.externalAccountId,
                        external_subscription_id: verificationResult.externalSubscriptionId,
                        meta: { uniqueCode: dto.uniqueCode, linkApiData: verificationResult.meta },
                    },
                });
                logger.info(`Re-verified link for user ${userId} and unit ${unit.id}.`);
            }
            return this.mapPropertyResidentToDto(existingLink, unit, property);
        }

        const newResidentLink = await this.prisma.propertyResident.create({
            data: {
                user_id: userId,
                property_unit_id: unit.id,
                external_role_id: verificationResult.externalRoleId,
                external_account_id: verificationResult.externalAccountId,
                external_subscription_id: verificationResult.externalSubscriptionId,
                verification_status: true,
                verified_at: new Date(),
                verification_method: ResidentVerificationMethod.UNIQUE_CODE,
                meta: { uniqueCode: dto.uniqueCode, linkApiData: verificationResult.meta },
            },
        });
        logger.info(`Successfully linked user ${userId} to unit ${unit.id}.`);

        return this.mapPropertyResidentToDto(newResidentLink, unit, property);
    }

    async getUserLinkedProperties(userId: string): Promise<PropertyResidentDto[]> {
        const residentLinks =
            await this.prisma.propertyResident.findMany<Prisma.PropertyResidentFindManyArgs>({
                where: {
                    user_id: userId,
                    verification_status: true,
                },
                include: {
                    propertyUnit: {
                        include: {
                            property: true,
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

        return (residentLinks as PropertyResidentWithRelations[]).map(
            (link: PropertyResidentWithRelations) =>
                this.mapPropertyResidentToDto(link, link.propertyUnit, link.propertyUnit.property),
        );
    }

    private mapPropertyResidentToDto(
        resident: PropertyResident,
        unit: PropertyUnit,
        property: Property,
    ): PropertyResidentDto {
        return {
            id: resident.id,
            userId: resident.user_id,
            propertyUnitId: unit.id,
            unitNumber: unit.unit_number,
            propertyName: property.name,
            propertyAddress: property.address || 'N/A',
            verificationMethod: resident.verification_method || undefined,
            meta: resident.meta,
        };
    }
}
