export class HttpError extends Error {
    public status: number;
    public code?: string;
    public details?: any;

    constructor(status: number, message: string, code?: string, details?: any) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, HttpError.prototype); // For instanceof checks
    }
}
