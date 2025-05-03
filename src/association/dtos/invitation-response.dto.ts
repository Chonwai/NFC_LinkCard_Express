import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

/**
 * 邀請回應類型枚舉
 */
export enum InvitationResponseType {
    ACCEPT = 'ACCEPT',
    REJECT = 'REJECT',
}

/**
 * 邀請回應DTO
 */
export class InvitationResponseDto {
    /**
     * 邀請令牌
     */
    @IsString()
    @IsNotEmpty({ message: '邀請令牌不能為空' })
    token: string;

    /**
     * 回應類型 (接受/拒絕)
     */
    @IsEnum(InvitationResponseType, { message: '回應類型必須是 ACCEPT 或 REJECT' })
    response: InvitationResponseType;
}
