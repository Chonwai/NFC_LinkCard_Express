import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateAssociationProfileDto {
    @IsString()
    @IsOptional()
    name?: string; // 可選，允許用戶自定義名稱，否則後端生成默認名稱

    @IsString()
    @IsOptional()
    description?: string; // 可選

    @IsBoolean()
    @IsOptional()
    isPublic?: boolean = true; // 默認公開
}
