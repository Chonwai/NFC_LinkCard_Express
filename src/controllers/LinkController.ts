// import { Request, Response, NextFunction } from 'express';
// import { LinkService } from '../services/LinkService';
// import { ApiResponse } from '../utils/apiResponse';
// import { ApiError } from '../types/error.types';
// import { plainToClass } from 'class-transformer';
// import { CreateLinkDto, UpdateLinkDto, ReorderLinkDto } from '../dtos/link.dto';
// import { validate } from 'class-validator';

// export class LinkController {
//     private linkService: LinkService;

//     constructor() {
//         this.linkService = new LinkService();
//     }

//     create = async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             const createLinkDto = plainToClass(CreateLinkDto, req.body);
//             const errors = await validate(createLinkDto);

//             if (errors.length > 0) {
//                 return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
//             }

//             if (!req.user) {
//                 return ApiResponse.error(res, '使用者未驗證', 'UNAUTHORIZED', null, 401);
//             }

//             const link = await this.linkService.create(createLinkDto, req.user.id as string);
//             return ApiResponse.success(res, { link }, 201);
//         } catch (error) {
//             next(error);
//         }
//     };

//     update = async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             const updateLinkDto = plainToClass(UpdateLinkDto, req.body);
//             const errors = await validate(updateLinkDto);

//             if (errors.length > 0) {
//                 return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
//             }

//             if (!req.user) {
//                 return ApiResponse.error(res, '使用者未驗證', 'UNAUTHORIZED', null, 401);
//             }

//             const link = await this.linkService.update(
//                 req.params.id,
//                 updateLinkDto,
//                 req.user.id as string,
//             );
//             return ApiResponse.success(res, { link });
//         } catch (error: unknown) {
//             const apiError = error as ApiError;
//             return ApiResponse.error(
//                 res,
//                 '連結更新失敗',
//                 'LINK_UPDATE_ERROR',
//                 apiError.message,
//                 400,
//             );
//         }
//     };

//     delete = async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             if (!req.user) {
//                 return ApiResponse.error(res, '使用者未驗證', 'UNAUTHORIZED', null, 401);
//             }

//             await this.linkService.delete(req.params.id, req.user.id as string);
//             return ApiResponse.success(res, {}, 204);
//         } catch (error: unknown) {
//             const apiError = error as ApiError;
//             return ApiResponse.error(
//                 res,
//                 '連結刪除失敗',
//                 'LINK_DELETE_ERROR',
//                 apiError.message,
//                 400,
//             );
//         }
//     };

//     reorder = async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             const reorderLinks = Array.isArray(req.body.links)
//                 ? req.body.links.map((link: any) => plainToClass(ReorderLinkDto, link))
//                 : [];
//             const errors = await validate(reorderLinks);

//             if (errors.length > 0) {
//                 return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
//             }

//             if (!req.user) {
//                 return ApiResponse.error(res, '使用者未驗證', 'UNAUTHORIZED', null, 401);
//             }

//             await this.linkService.reorder(reorderLinks, req.user.id as string);
//             return ApiResponse.success(res, {});
//         } catch (error: unknown) {
//             const apiError = error as ApiError;
//             return ApiResponse.error(
//                 res,
//                 '連結排序失敗',
//                 'LINK_REORDER_ERROR',
//                 apiError.message,
//                 400,
//             );
//         }
//     };

//     getAll = async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             if (!req.user) {
//                 return ApiResponse.error(res, '使用者未驗證', 'UNAUTHORIZED', null, 401);
//             }

//             const links = await this.linkService.findAll(req.user.id as string);
//             return ApiResponse.success(res, { links });
//         } catch (error: unknown) {
//             const apiError = error as ApiError;
//             return ApiResponse.error(
//                 res,
//                 '獲取連結列表失敗',
//                 'LINK_FETCH_ERROR',
//                 apiError.message,
//                 apiError.status || 500,
//             );
//         }
//     };

//     getByProfile = async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             if (!req.user) {
//                 return ApiResponse.error(res, '使用者未驗證', 'UNAUTHORIZED', null, 401);
//             }

//             const { profileId } = req.params;
//             const links = await this.linkService.findByProfile(profileId, req.user.id as string);
//             return ApiResponse.success(res, { links });
//         } catch (error: unknown) {
//             const apiError = error as ApiError;
//             return ApiResponse.error(
//                 res,
//                 '獲取特定檔案的連結失敗',
//                 'LINK_BY_PROFILE_FETCH_ERROR',
//                 apiError.message,
//                 apiError.status || 500,
//             );
//         }
//     };
// }
