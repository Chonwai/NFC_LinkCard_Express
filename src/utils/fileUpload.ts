import { put } from '@vercel/blob';
import sharp from 'sharp';

export async function uploadImage(
    file: Express.Multer.File,
    folder: string,
    options = { width: 400, height: 400 },
) {
    try {
        // 壓縮圖片
        const compressedImageBuffer = await sharp(file.buffer)
            .resize(options.width, options.height, {
                fit: 'cover',
                position: 'center',
            })
            .jpeg({ quality: 80 }) // 使用 JPEG 格式，質量 80%
            .toBuffer();

        // 計算文件大小（KB）
        const fileSizeInKB = compressedImageBuffer.length / 1024;
        if (fileSizeInKB > 100) {
            throw new Error('圖片大小超過 100KB 限制');
        }

        // 生成唯一的文件名
        const timestamp = Date.now();
        const filename = `${folder}/${timestamp}-${file.originalname}`;

        // 上傳到 Vercel Blob
        const { url } = await put(filename, compressedImageBuffer, {
            access: 'public',
            contentType: 'image/jpeg',
        });

        return url;
    } catch (error) {
        console.error('圖片���傳失敗:', error);
        throw error;
    }
}
