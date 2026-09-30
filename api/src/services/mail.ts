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

function buildInvitationHtml(inviteCode: string, expiresAt: Date | null): string {
  const expiresText = expiresAt
    ? `This invitation expires on ${expiresAt.toISOString().slice(0, 10)}.`
    : 'This invitation has an expiry date.';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,sans-serif;background:#f4f4f7">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#1a1a2e;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px">Mahfil Fund</h1>
      <p style="margin:8px 0 0;color:#d6d6f5;font-size:13px">You're invited to join a community</p>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:18px">Use this invitation code</h2>
      <p style="color:#555;line-height:1.5">Enter the code below to join. ${expiresText}</p>
      <div style="margin:24px 0;text-align:center">
        <span style="display:inline-block;font-size:28px;font-weight:700;letter-spacing:6px;color:#1a1a2e;background:#f0f0f5;padding:14px 28px;border-radius:8px">${inviteCode}</span>
      </div>
      <p style="color:#888;font-size:12px">If you weren't expecting this, you can ignore this email.</p>
    </div>
    <div style="padding:16px 32px;background:#f4f4f7;text-align:center">
      <p style="margin:0;color:#999;font-size:12px">&copy; ${new Date().getFullYear()} Mahfil Fund. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`.trim();
}

export async function sendInvitationEmail(params: {
  to: string;
  inviteCode: string;
  expiresAt: Date | null;
  from: string;
}): Promise<void> {
  await getTransporter().sendMail({
    from: params.from,
    to: params.to,
    subject: 'Mahfil Fund - Your invitation code',
    html: buildInvitationHtml(params.inviteCode, params.expiresAt),
  });
}
