// 邮件发送 provider 抽象
// console：默认，仅日志输出（本地开发 / 未配置 SMTP）
// smtp：配置 SMTP_* 后走真实邮件（nodemailer）
import { getEnv } from "@/server/config/env";

export interface MailProvider {
  /** 发送登录验证码邮件 */
  sendLoginCode(email: string, code: string): Promise<void>;
}

function codeEmailHtml(code: string, ttlMin: number): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F7F4EE;font-family:'PingFang SC','Microsoft YaHei',sans-serif;color:#1A1A18;">
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E0D6;padding:32px;">
    <h1 style="font-size:20px;margin:0 0 8px;">iPrompt Studio 登录验证码</h1>
    <p style="font-size:14px;color:#6B6B66;margin:0 0 20px;">请在 ${ttlMin} 分钟内输入以下验证码完成登录。若非本人操作，请忽略本邮件。</p>
    <div style="font-size:36px;letter-spacing:12px;font-weight:700;text-align:center;padding:20px;border:1px dashed #C9C2B2;background:#FAF8F3;">${code}</div>
  </div>
</body></html>`;
}

class ConsoleProvider implements MailProvider {
  async sendLoginCode(email: string, code: string): Promise<void> {
    console.log(`[mailer:console] 登录验证码 → ${email} : ${code}`);
  }
}

class SmtpProvider implements MailProvider {
  private transporter: import("nodemailer").Transporter | null = null;

  private async getTransporter() {
    if (this.transporter) return this.transporter;
    const env = getEnv();
    const nodemailer = await import("nodemailer");
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
    });
    return this.transporter;
  }

  async sendLoginCode(email: string, code: string): Promise<void> {
    const env = getEnv();
    const transporter = await this.getTransporter();
    await transporter.sendMail({
      from: env.MAIL_FROM,
      to: email,
      subject: `iPrompt Studio 登录验证码：${code}`,
      html: codeEmailHtml(code, env.CODE_TTL_MIN),
    });
  }
}

let cached: MailProvider | null = null;

/** 按环境配置返回邮件 provider（进程内单例） */
export function getMailer(): MailProvider {
  if (cached) return cached;
  cached = getEnv().MAIL_PROVIDER === "smtp" ? new SmtpProvider() : new ConsoleProvider();
  return cached;
}

/** 仅测试用 */
export function resetMailerCache(): void {
  cached = null;
}
