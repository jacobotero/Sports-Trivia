import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "noreply@fanatiq.app";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://fanatiq.vercel.app";
const APP_NAME = "FanatIQ";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function emailHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #09090b; margin: 0; padding: 40px 20px; color: #fafafa; }
    .container { max-width: 480px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 40px; }
    .logo { font-size: 22px; font-weight: 900; margin-bottom: 28px; letter-spacing: -0.5px; }
    .logo .accent { color: #6366f1; }
    h2 { font-size: 18px; font-weight: 700; margin: 0 0 12px; }
    p { color: #a1a1aa; line-height: 1.6; margin: 0 0 20px; font-size: 14px; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 4px 0 24px; }
    .link-fallback { color: #52525b; font-size: 12px; word-break: break-all; }
    .link-fallback a { color: #6366f1; }
    .footer { color: #3f3f46; font-size: 12px; margin-top: 28px; padding-top: 20px; border-top: 1px solid #27272a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span class="accent">Fanat</span>IQ</div>
    ${content}
    <div class="footer">If you didn't request this email, you can safely ignore it.</div>
  </div>
</body>
</html>`.trim();
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — skipping verification email to ${to}`);
    console.log(`[email] Verification URL: ${APP_URL}/verify-email?token=${token}`);
    return;
  }

  const url = `${APP_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Verify your email — ${APP_NAME}`,
    html: emailHtml(`
      <h2>Verify your email address</h2>
      <p>Hey ${name}, welcome to ${APP_NAME}! Click the button below to confirm your email and unlock your full account.</p>
      <a href="${url}" class="btn">Verify Email</a>
      <p>This link expires in <strong style="color:#fafafa">24 hours</strong>.</p>
      <p class="link-fallback">Or copy this link: <a href="${url}">${url}</a></p>
    `),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — skipping reset email to ${to}`);
    console.log(`[email] Reset URL: ${APP_URL}/reset-password?token=${token}`);
    return;
  }

  const url = `${APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Reset your password — ${APP_NAME}`,
    html: emailHtml(`
      <h2>Reset your password</h2>
      <p>Hey ${name}, we received a request to reset your ${APP_NAME} password. Click below to choose a new one.</p>
      <a href="${url}" class="btn">Reset Password</a>
      <p>This link expires in <strong style="color:#fafafa">1 hour</strong>. If you didn't request this, no action is needed.</p>
      <p class="link-fallback">Or copy this link: <a href="${url}">${url}</a></p>
    `),
  });
}
