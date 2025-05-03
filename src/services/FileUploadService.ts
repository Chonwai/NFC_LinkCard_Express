import sharp from 'sharp';
import { StorageProvider, UploadedFile } from '../interfaces/storage.interface';

export interface ImageProcessOptions {
    width?: number;
    height?: number;
    quality?: number;
    maxSizeKB?: number;
    format?: 'jpeg' | 'png' | 'webp';
}

export class FileUploadService {
    constructor(private readonly storageProvider: StorageProvider) {}

    async uploadImage(
        file: Express.Multer.File,
        folder: string,
        options: ImageProcessOptions = {},
    ): Promise<UploadedFile> {
        const {
            width = 400,
            height = 400,
            quality = 80,
            maxSizeKB = 100,
            format = 'webp',
        } = options;

        try {
            // 初始壓縮參數
            let currentQuality = quality;
            let processedBuffer: Buffer;
            let fileSizeKB: number;

            // 智能壓縮循環
            do {
                // 處理圖片尺寸
                let imageProcessor = sharp(file.buffer).resize(width, height, {
                    fit: 'cover',
                    position: 'center',
                });

                // 根據指定格式處理圖片
                switch (format) {
                    case 'webp':
                        imageProcessor = imageProcessor.webp({ quality: currentQuality });
                        break;
                    case 'jpeg':
                        imageProcessor = imageProcessor.jpeg({ quality: currentQuality });
                        break;
                    case 'png':
                        imageProcessor = imageProcessor.png({ quality: currentQuality });
                        break;
                }

                processedBuffer = await imageProcessor.toBuffer();
                fileSizeKB = processedBuffer.length / 1024;

                // 如果文件仍然太大，降低質量繼續嘗試
                if (fileSizeKB > maxSizeKB && currentQuality > 10) {
                    currentQuality -= 10;
                    console.log(
                        `文件大小 ${fileSizeKB}KB 超過限制，降低質量到 ${currentQuality} 重試`,
                    );
                }
            } while (fileSizeKB > maxSizeKB && currentQuality > 10);

            // 如果文件仍然太大，可以考慮進一步降低尺寸
            if (fileSizeKB > maxSizeKB) {
                const scale = Math.sqrt(maxSizeKB / fileSizeKB);
                const newWidth = Math.floor(width * scale);
                const newHeight = Math.floor(height * scale);

                console.log(`嘗試降低尺寸到 ${newWidth}x${newHeight}`);

                const imageProcessor = sharp(file.buffer)
                    .resize(newWidth, newHeight, {
                        fit: 'cover',
                        position: 'center',
                    })
                    // eslint-disable-next-line no-unexpected-multiline
                    [format]({ quality: currentQuality });
                processedBuffer = await imageProcessor.toBuffer();
                fileSizeKB = processedBuffer.length / 1024;
            }

            // 如果所有嘗試都失敗，拋出錯誤
            if (fileSizeKB > maxSizeKB) {
                throw new Error(
                    `無法將圖片壓縮到 ${maxSizeKB}KB 以下（當前大小：${fileSizeKB.toFixed(2)}KB）`,
                );
            }

            // 生成文件名
            const timestamp = Date.now();
            const extension = format === 'jpeg' ? 'jpg' : format;
            const filename = `${timestamp}-${file.originalname.replace(/\.[^/.]+$/, '')}.${extension}`;

            console.log(`最終圖片大小: ${fileSizeKB.toFixed(2)}KB，質量: ${currentQuality}`);

            // 上傳到存儲服務
            return await this.storageProvider.upload(processedBuffer, {
                filename,
                contentType: `image/${format}`,
                folder,
            });
        } catch (error) {
            console.error('圖片處理失敗:', error);
            throw error;
        }
    }
}
