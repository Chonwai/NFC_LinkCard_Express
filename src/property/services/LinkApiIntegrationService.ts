import { Inject } from 'typedi';
import { PropertyManagementCompany } from '@prisma/client';
// import { HttpError } from '../../utils/HttpError'; // Will be removed
import { logger } from '../../utils/logger'; // Adjusted path
import axios, { AxiosInstance, AxiosError } from 'axios';
import { FacilityAccessMethod } from '../dtos/facility.dto'; // Adjusted path

// Define interfaces for the expected responses from link-api (these are examples)
interface LinkApiVerificationResponse {
    success: boolean;
    message?: string;
    externalAccountId?: string;
    externalRoleId?: string;
    externalSubscriptionId?: string;
    unitNumber?: string;
    propertyName?: string;
    propertyAddress?: string;
    meta?: any;
}

interface LinkApiCredentialResponseData {
    data: string;
    expiresAt: string;
    credentialIdFromPMS?: string;
}

interface LinkApiGenericResponse {
    success: boolean;
    message?: string;
    data?: any;
    [key: string]: any;
}

export class LinkApiIntegrationService {
    private httpClient: AxiosInstance;

    constructor() {
        this.httpClient = axios.create();
    }

    private getApiClient(pmc: PropertyManagementCompany): AxiosInstance {
        return axios.create({
            baseURL: pmc.api_endpoint,
            headers: {
                ...(pmc.api_key && { Authorization: `Bearer ${pmc.api_key}` }),
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
    }

    async verifyUniqueCode(
        pmc: PropertyManagementCompany,
        propertyExternalId: string,
        unitExternalId: string,
        uniqueCode: string,
        linkCardUserId: string,
    ): Promise<LinkApiVerificationResponse> {
        logger.info(
            `Calling link-api to verify code ${uniqueCode} for unit ${unitExternalId}, user ${linkCardUserId}`,
        );
        const client = this.getApiClient(pmc);
        try {
            const response = await client.post<LinkApiVerificationResponse>(
                `/v1/property/${propertyExternalId}/unit/${unitExternalId}/verify-link-code`,
                {
                    code: uniqueCode,
                    userIdFromTenant: linkCardUserId,
                },
            );
            if (response.data && typeof response.data.success === 'boolean') {
                return response.data;
            }
            logger.error('Link-api verifyUniqueCode bad response structure:', response.data);
            return { success: false, message: 'Invalid response from PMS verification.' };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error(
                    'Axios error calling link-api verifyUniqueCode:',
                    error.response?.data || error.message,
                );
                const errorMessage =
                    error.response?.data?.message ||
                    'PMS communication error during code verification.';
                return { success: false, message: errorMessage };
            } else {
                logger.error('Non-Axios error calling link-api verifyUniqueCode:', error);
                return {
                    success: false,
                    message: 'An unexpected error occurred during code verification.',
                };
            }
        }
    }

    async generateFacilityAccessCredential(
        pmc: PropertyManagementCompany,
        externalAccountId: string,
        externalFacilityId: string,
        accessMethod: FacilityAccessMethod | string,
    ): Promise<
        LinkApiGenericResponse & { data?: string; expiresAt?: string; credentialIdFromPMS?: string }
    > {
        logger.info(
            `Calling link-api to generate ${accessMethod} credential for account ${externalAccountId}, facility ${externalFacilityId}`,
        );
        const client = this.getApiClient(pmc);

        try {
            const response = await client.post<LinkApiCredentialResponseData>(
                `/v1/accounts/${externalAccountId}/facilities/${externalFacilityId}/request-access-credential`,
                {
                    accessMethod: accessMethod,
                },
            );

            if (response.data && response.data.data && response.data.expiresAt) {
                return {
                    success: true,
                    data: response.data.data,
                    expiresAt: response.data.expiresAt,
                    credentialIdFromPMS: response.data.credentialIdFromPMS,
                };
            }
            logger.error(
                'Link-api generateFacilityAccessCredential bad response structure:',
                response.data,
            );
            return { success: false, message: 'Invalid response from PMS credential generation.' };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error(
                    'Axios error calling link-api generateFacilityAccessCredential:',
                    error.response?.data || error.message,
                );
                const errorMessage =
                    error.response?.data?.message ||
                    'PMS communication error during credential generation.';
                return { success: false, message: errorMessage };
            } else {
                logger.error(
                    'Non-Axios error calling link-api generateFacilityAccessCredential:',
                    error,
                );
                return {
                    success: false,
                    message: 'An unexpected error occurred during credential generation.',
                };
            }
        }
    }
}
