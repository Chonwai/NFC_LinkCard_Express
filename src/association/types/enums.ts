export enum MemberRole {
    ADMIN = 'ADMIN',
    MEMBER = 'MEMBER',
}

export enum MembershipTier {
    BASIC = 'BASIC',
    PREMIUM = 'PREMIUM',
    EXECUTIVE = 'EXECUTIVE',
}

export enum MembershipStatus {
    ACTIVE = 'ACTIVE', // 活躍會員
    INACTIVE = 'INACTIVE', // 非活躍會員
    PENDING = 'PENDING', // 待批准
    EXPIRED = 'EXPIRED', // 會員已過期
    SUSPENDED = 'SUSPENDED', // 會員已暫停（例如違反規定）
    TERMINATED = 'TERMINATED', // 會員已終止（例如由管理員終止）
    CANCELLED = 'CANCELLED', // 會員自行取消
}
