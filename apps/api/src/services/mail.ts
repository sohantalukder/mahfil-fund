import nodemailer from 'nodemailer';
import type { Env } from '../shared/env.js';

export type OtpPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

let transporter: nodemailer.Transporter | null = null;

export function initMailTransporter(env: Env) {
  transporter = nodemailer.createTransport({
    host: env.MAILTRAP_HOST,
    port: env.MAILTRAP_PORT,
    auth: {
      user: env.MAILTRAP_USER,
      pass: env.MAILTRAP_PASS,
    },
  });
  return transporter;
}

function getTransporter(): nodemailer.Transporter {
  if (!transporter) throw new Error('Mail transporter not initialized');
  return transporter;
}

function buildOtpHtml(code: string, type: OtpPurpose): string {
  const isVerification = type === 'EMAIL_VERIFICATION';
  const title = isVerification ? 'Verify Your Email' : 'Reset Your Password';
  const message = isVerification
    ? 'Thanks for signing up! Use this code to verify your email address.'
    : 'We received a request to reset your password. Use this code to proceed.';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,sans-serif;background:#f4f4f7">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#1a1a2e;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px">Mahfil Fund</h1>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:18px">${title}</h2>
      <p style="color:#555;line-height:1.5">${message}</p>
      <div style="margin:24px 0;text-align:center">
        <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;color:#1a1a2e;background:#f0f0f5;padding:16px 32px;border-radius:8px">${code}</span>
      </div>
      <p style="color:#888;font-size:13px">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div style="padding:16px 32px;background:#f4f4f7;text-align:center">
      <p style="margin:0;color:#999;font-size:12px">&copy; ${new Date().getFullYear()} Mahfil Fund. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`.trim();
}

export async function sendOtpEmail(
  to: string,
  code: string,
  type: OtpPurpose,
  from: string
): Promise<void> {
  const isVerification = type === 'EMAIL_VERIFICATION';
  const subject = isVerification
    ? 'Mahfil Fund - Verify Your Email'
    : 'Mahfil Fund - Password Reset Code';

  await getTransporter().sendMail({
    from,
    to,
    subject,
    html: buildOtpHtml(code, type),
  });
}
