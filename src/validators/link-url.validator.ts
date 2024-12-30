import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { LinkPlatform, LinkType } from '@prisma/client';

const URL_PATTERNS: Record<LinkPlatform, RegExp> = {
    [LinkPlatform.GITHUB]: /^https:\/\/(www\.)?github\.com\/[\w-]+$/,
    [LinkPlatform.FACEBOOK]: /^https:\/\/(www\.)?facebook\.com\/[\w.]+$/,
    [LinkPlatform.INSTAGRAM]: /^https:\/\/(www\.)?instagram\.com\/[\w.]+$/,
    [LinkPlatform.LINKEDIN]: /^https:\/\/(www\.)?linkedin\.com\/in\/[\w-]+$/,
    [LinkPlatform.TELEGRAM]: /^https:\/\/t\.me\/[\w_]+$/,
    [LinkPlatform.WECHAT]: /^weixin:\/\/[\w-]+$/,
    [LinkPlatform.X]: /^https:\/\/(www\.)?x\.com\/[\w]+$/,
    [LinkPlatform.YOUTUBE]: /^https:\/\/(www\.)?youtube\.com\/(c\/|channel\/|@)?[\w-]+$/,
    [LinkPlatform.EMAIL]: /^mailto:[\w-]+(\.[\w-]+)*@([\w-]+\.)+[\w-]{2,}$/,
    [LinkPlatform.PHONE]: /^tel:\+?[\d-]+$/,
    [LinkPlatform.WEBSITE]: /^https?:\/\/.+$/,
    [LinkPlatform.LOCATION]: /^https:\/\/(www\.)?google\.com\/maps\/.+$/,
};

@ValidatorConstraint({ name: 'isValidLinkUrl', async: false })
export class IsValidLinkUrlConstraint implements ValidatorConstraintInterface {
    validate(url: string, args: ValidationArguments) {
        const object = args.object as any;
        const platform = object.platform as LinkPlatform;
        const type = object.type as LinkType;

        // 如果是 CUSTOM 類型但沒有指定平台，則跳過驗證
        if (type === LinkType.CUSTOM && !platform) {
            return true;
        }

        // 如果指定了平台，則使用對應的正則表達式驗證
        if (platform) {
            const pattern = URL_PATTERNS[platform];
            return pattern.test(url);
        }

        // 如果是社交平台類型但沒有指定具體平台，則跳過驗證
        if (type === LinkType.SOCIAL) {
            return true;
        }

        return true;
    }

    defaultMessage(args: ValidationArguments) {
        const object = args.object as any;
        const platform = object.platform as LinkPlatform;
        return platform ? `URL 格式不正確，請參考 ${platform} 的標準格式` : 'URL 格式不正確';
    }
}

export function IsValidLinkUrl(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidLinkUrlConstraint,
        });
    };
}
