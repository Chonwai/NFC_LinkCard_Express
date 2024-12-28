export interface StorageConfig {
    vercelBlob?: {
        token: string;
    };
    s3?: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        bucket: string;
    };
    azure?: {
        connectionString: string;
        container: string;
    };
}

export interface UploadedFile {
    url: string;
    key?: string;
    size: number;
}

export interface StorageProvider {
    upload(
        file: Buffer,
        options: {
            filename: string;
            contentType: string;
            folder?: string;
        },
    ): Promise<UploadedFile>;

    delete?(key: string): Promise<void>;
}
