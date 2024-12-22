import { LinkType, LinkPlatform } from '@prisma/client';

const PLATFORM_MAP: Record<LinkType, LinkPlatform[]> = {
    [LinkType.SOCIAL]: [
        LinkPlatform.GITHUB,
        LinkPlatform.FACEBOOK,
        LinkPlatform.INSTAGRAM,
        LinkPlatform.LINKEDIN,
    ],
    [LinkType.CUSTOM]: [
        LinkPlatform.WEBSITE,
        LinkPlatform.PHONE,
        LinkPlatform.EMAIL,
        LinkPlatform.LOCATION,
    ],
};

export function isValidPlatformForType(type: LinkType, platform: LinkPlatform): boolean {
    return PLATFORM_MAP[type].includes(platform);
}

export function getPlatformsForType(type: LinkType): LinkPlatform[] {
    return PLATFORM_MAP[type as LinkType];
}

// URL 格式驗證
export function validatePlatformUrl(platform: LinkPlatform, url: string): boolean {
    const urlPatterns: Record<LinkPlatform, RegExp> = {
        [LinkPlatform.GITHUB]: /^https:\/\/(www\.)?github\.com\/[\w-]+$/,
        [LinkPlatform.FACEBOOK]: /^https:\/\/(www\.)?facebook\.com\/[\w.]+$/,
        [LinkPlatform.INSTAGRAM]: /^https:\/\/(www\.)?instagram\.com\/[\w.]+$/,
        [LinkPlatform.LINKEDIN]: /^https:\/\/(www\.)?linkedin\.com\/in\/[\w-]+$/,
        [LinkPlatform.EMAIL]: /^mailto:[\w-]+(\.[\w-]+)*@([\w-]+\.)+[\w-]{2,}$/,
        [LinkPlatform.PHONE]: /^tel:\+?[\d-]+$/,
        [LinkPlatform.WEBSITE]: /^https?:\/\/.+$/,
        [LinkPlatform.LOCATION]: /^https:\/\/(www\.)?google\.com\/maps\/.+$/,
    };

    const pattern = urlPatterns[platform];
    if (!pattern) {
        return true; // 如果沒有特定的驗證規則，返回 true
    }
    return pattern.test(url);
}
