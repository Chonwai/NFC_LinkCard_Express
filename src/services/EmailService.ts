import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import { Service } from 'typedi';

@Service()
export class EmailService {
    private transporter: nodemailer.Transporter;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000; // 1秒

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
            debug: true,
            logger: true,
        });

        // 驗證 SMTP 連接設置
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('SMTP connection error:', error);
            } else {
                console.log('SMTP server is ready');
            }
        });
    }

    private async sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async sendVerificationEmail(to: string, verificationToken: string): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

                const template = await ejs.renderFile(
                    path.join(__dirname, '../templates/emails/verify-email.ejs'),
                    { verificationLink },
                );

                const mailOptions = {
                    from: `"NFC LinkCard" <${process.env.GMAIL_USER}>`,
                    to,
                    subject: 'Verify Your Email - NFC LinkCard',
                    html: template,
                };

                console.log(`Attempting to send email (${attempt}/${this.MAX_RETRIES})`);
                const info = await this.transporter.sendMail(mailOptions);
                console.log('Email sent successfully:', info);
                return;
            } catch (error: any) {
                lastError = error;
                console.error(`Email sending failed (attempt ${attempt}/${this.MAX_RETRIES}):`, {
                    error: error.message,
                    code: error.code,
                    command: error.command,
                    response: error.response,
                });

                if (attempt < this.MAX_RETRIES) {
                    const delay = this.RETRY_DELAY * attempt;
                    console.log(`Waiting ${delay}ms before retry...`);
                    await this.sleep(delay);
                }
            }
        }

        throw new Error(`Failed to send email: ${lastError?.message}`);
    }

    async sendResetPasswordEmail(to: string, resetToken: string): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

                const template = await ejs.renderFile(
                    path.join(__dirname, '../templates/emails/reset-password.ejs'),
                    { resetLink },
                );

                const mailOptions = {
                    from: `"NFC LinkCard" <${process.env.GMAIL_USER}>`,
                    to,
                    subject: '重設密碼請求 - NFC LinkCard',
                    html: template,
                };

                console.log(`嘗試發送郵件 (${attempt}/${this.MAX_RETRIES})`);
                console.log('郵件選項:', JSON.stringify(mailOptions, null, 2));

                const info = await this.transporter.sendMail(mailOptions);
                console.log('郵件發送成功:', info);
                return;
            } catch (error: any) {
                lastError = error;
                console.error(`郵件發送失敗 (嘗試 ${attempt}/${this.MAX_RETRIES}):`, {
                    error: error.message,
                    code: error.code,
                    command: error.command,
                    response: error.response,
                });

                if (attempt < this.MAX_RETRIES) {
                    const delay = this.RETRY_DELAY * attempt;
                    console.log(`等待 ${delay}ms 後重試...`);
                    await this.sleep(delay);
                }
            }
        }

        throw new Error(`郵件發送失敗: ${lastError?.message}`);
    }

    async verifyConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            return true;
        } catch (error) {
            console.error('Email service connection error:', error);
            return false;
        }
    }

    async sendAssociationInvitation(
        email: string,
        associationName: string,
        token: string,
        customMessage?: string,
        isNewUser: boolean = false,
    ) {
        // 準備模板數據
        const templateData = {
            associationName,
            customMessage: customMessage || `您被邀請加入 ${associationName}`,
            actionUrl: isNewUser
                ? `${process.env.FRONTEND_URL}/activate?token=${token}`
                : `${process.env.FRONTEND_URL}/invitations/respond?token=${token}`,
            actionText: isNewUser ? '激活帳戶並加入' : '回應邀請',
            expiryDays: isNewUser ? 14 : 7,
        };

        // 選擇適當的模板
        const templatePath = isNewUser ? 'new-user-invitation.ejs' : 'existing-user-invitation.ejs';

        // 發送郵件
        return this.sendTemplateEmail(
            email,
            `邀請您加入 ${associationName}`,
            templatePath,
            templateData,
        );
    }
}
