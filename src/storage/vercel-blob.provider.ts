import { put } from '@vercel/blob';
import { StorageProvider, UploadedFile } from '../interfaces/storage.interface';

export class VercelBlobProvider implements StorageProvider {
    constructor(private readonly token?: string) {}

    async upload(
        file: Buffer,
        options: {
            filename: string;
            contentType: string;
            folder?: string;
        },
    ): Promise<UploadedFile> {
        const path = options.folder ? `${options.folder}/${options.filename}` : options.filename;

        const { url } = await put(path, file, {
            access: 'public',
            contentType: options.contentType,
            token: this.token,
        });

        return {
            url,
            key: path,
            size: file.length,
        };
    }
}
