import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.smtp.host || !env.smtp.user) {
    logger.warn('SMTP not configured — emails will be logged instead of sent.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transporter;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    logger.info(`[EMAIL:dev] To=${to} Subject=${subject}`);
    return;
  }
  try {
    await t.sendMail({ from: env.smtp.from, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Failed to send email to ${to}`, err);
  }
}

function layout(title: string, body: string): string {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#f5f5f5;padding:24px;">
    <div style="max-width:560px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eee;">
      <div style="background:#1E1E1E;padding:20px 24px;">
        <span style="color:#fff;font-size:20px;font-weight:700;">Modern<span style="color:#4CAF50;">Shop</span></span>
      </div>
      <div style="padding:24px;color:#1E1E1E;line-height:1.6;">
        <h2 style="margin-top:0;color:#1E1E1E;">${title}</h2>
        ${body}
      </div>
      <div style="padding:16px 24px;background:#fafafa;color:#888;font-size:12px;text-align:center;">
        &copy; ${new Date().getFullYear()} ${env.store.name}. All rights reserved.
      </div>
    </div>
  </div>`;
}

const button = (label: string, url: string) =>
  `<a href="${url}" style="display:inline-block;background:#4CAF50;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">${label}</a>`;

export const emailService = {
  async sendWelcome(to: string, name: string, verifyUrl?: string) {
    const verifyBlock = verifyUrl
      ? `<p>Please confirm your email address to activate your account:</p><p>${button('Verify email', verifyUrl)}</p>`
      : '';
    await send(
      to,
      `Welcome to ${env.store.name}!`,
      layout(
        `Welcome, ${name}! 🎉`,
        `<p>Thanks for creating an account at ${env.store.name}. Discover smart watches, earbuds, cameras and more — with fast shipping and secure checkout.</p>${verifyBlock}<p>Happy shopping!</p>`
      )
    );
  },

  async sendPasswordReset(to: string, name: string, resetUrl: string) {
    await send(
      to,
      'Reset your password',
      layout(
        'Reset your password',
        `<p>Hi ${name},</p><p>We received a request to reset your password. This link expires in 30 minutes.</p><p>${button(
          'Reset password',
          resetUrl
        )}</p><p style="color:#888;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>`
      )
    );
  },

  async sendOrderConfirmation(
    to: string,
    name: string,
    order: {
      order_number: string;
      total: number;
      items: { name: string; quantity: number; total: number }[];
      trackUrl: string;
    }
  ) {
    const rows = order.items
      .map(
        (i) =>
          `<tr><td style="padding:8px 0;">${i.name} × ${i.quantity}</td><td style="padding:8px 0;text-align:right;">₹${i.total.toFixed(
            2
          )}</td></tr>`
      )
      .join('');
    await send(
      to,
      `Order ${order.order_number} confirmed`,
      layout(
        'Your order is confirmed! 📦',
        `<p>Hi ${name}, thanks for your order <strong>${order.order_number}</strong>.</p>
         <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;border-bottom:1px solid #eee;margin:12px 0;">${rows}</table>
         <p style="font-size:16px;"><strong>Total: ₹${order.total.toFixed(2)}</strong></p>
         <p>${button('Track your order', order.trackUrl)}</p>`
      )
    );
  },

  async sendOrderStatus(to: string, orderNumber: string, status: string, trackUrl: string) {
    await send(
      to,
      `Order ${orderNumber}: ${status}`,
      layout(
        `Order update: ${status}`,
        `<p>Your order <strong>${orderNumber}</strong> is now <strong>${status}</strong>.</p><p>${button(
          'View order',
          trackUrl
        )}</p>`
      )
    );
  },
};
