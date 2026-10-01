import nodemailer, { type Transporter } from 'nodemailer';
import type { Env } from '../shared/env.js';

export type OtpPurpose = 'PASSWORD_RESET';

let transporter: Transporter | null = null;

export function initMailTransporter(env: Env) {
  transporter = nodemailer.createTransport({
    host: env.MAILTRAP_HOST,
    port: env.MAILTRAP_PORT,
    auth: { user: env.MAILTRAP_USER, pass: env.MAILTRAP_PASS },
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return transporter;
}

function getTransporter(): Transporter {
  if (!transporter) throw new Error('Mail transporter not initialized');
  return transporter;
}

function buildOtpHtml(code: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,sans-serif;background:#f4f4f7">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:#1a1a2e;padding:24px 32px"><h1 style="margin:0;color:#fff;font-size:20px">Mahfil Fund</h1></div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:18px">Reset Your Password</h2>
      <p style="color:#555;line-height:1.5">Use this code to complete your password reset.</p>
      <div style="margin:24px 0;text-align:center"><span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;background:#f0f0f5;padding:16px 32px;border-radius:8px">${code}</span></div>
      <p style="color:#888;font-size:13px">This code expires shortly. If you did not request it, ignore this email.</p>
    </div>
  </div>
</body></html>`;
}

export async function sendOtpEmail(
  to: string,
  code: string,
  _type: OtpPurpose,
  from: string,
): Promise<void> {
  await getTransporter().sendMail({
    from,
    to,
    subject: 'Mahfil Fund - Password Reset Code',
    html: buildOtpHtml(code),
  });
}
