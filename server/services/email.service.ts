/**
 * StickerNest v2 - Email Service
 *
 * Basic email service for sending transactional emails.
 * Currently uses console logging as a placeholder.
 * Can be extended with actual email providers (Resend, SendGrid, etc.)
 */

import { db } from '../db/client.js';
import { log } from '../utils/logger.js';

// ==================
// Types
// ==================

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ==================
// Email Templates
// ==================

const templates = {
  paymentFailed: {
    subject: 'Action Required: Payment Failed - StickerNest',
    html: (data: { userName: string; amount?: number; retryUrl?: string }) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Payment Failed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            <p>We were unable to process your recent payment${data.amount ? ` of $${(data.amount / 100).toFixed(2)}` : ''}.</p>
            <p>This may have happened because:</p>
            <ul>
              <li>Your card was declined</li>
              <li>Your card has expired</li>
              <li>There were insufficient funds</li>
            </ul>
            <p>To avoid service interruption, please update your payment method:</p>
            ${data.retryUrl ? `<a href="${data.retryUrl}" class="button">Update Payment Method</a>` : ''}
            <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
            <p>Best regards,<br>The StickerNest Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} StickerNest. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data: { userName: string; amount?: number; retryUrl?: string }) =>
      `Hi ${data.userName || 'there'},\n\n` +
      `We were unable to process your recent payment${data.amount ? ` of $${(data.amount / 100).toFixed(2)}` : ''}.\n\n` +
      `Please update your payment method to avoid service interruption.\n\n` +
      (data.retryUrl ? `Update here: ${data.retryUrl}\n\n` : '') +
      `Best regards,\nThe StickerNest Team`,
  },

  paymentSuccessful: {
    subject: 'Payment Received - StickerNest',
    html: (data: { userName: string; amount: number; itemName?: string }) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
          .amount { font-size: 32px; font-weight: 700; color: #10b981; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Received</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            <p>Thank you for your payment${data.itemName ? ` for "${data.itemName}"` : ''}!</p>
            <div class="amount">$${(data.amount / 100).toFixed(2)}</div>
            <p>Your transaction has been completed successfully.</p>
            <p>Best regards,<br>The StickerNest Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} StickerNest. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data: { userName: string; amount: number; itemName?: string }) =>
      `Hi ${data.userName || 'there'},\n\n` +
      `Thank you for your payment${data.itemName ? ` for "${data.itemName}"` : ''}!\n\n` +
      `Amount: $${(data.amount / 100).toFixed(2)}\n\n` +
      `Your transaction has been completed successfully.\n\n` +
      `Best regards,\nThe StickerNest Team`,
  },

  creatorPayout: {
    subject: 'Payout Initiated - StickerNest',
    html: (data: { userName: string; amount: number }) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
          .amount { font-size: 32px; font-weight: 700; color: #8b5cf6; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Payout Initiated</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            <p>Great news! Your payout has been initiated.</p>
            <div class="amount">$${(data.amount / 100).toFixed(2)}</div>
            <p>The funds should arrive in your bank account within 2-7 business days, depending on your bank.</p>
            <p>Keep creating amazing widgets!</p>
            <p>Best regards,<br>The StickerNest Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} StickerNest. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data: { userName: string; amount: number }) =>
      `Hi ${data.userName || 'there'},\n\n` +
      `Great news! Your payout of $${(data.amount / 100).toFixed(2)} has been initiated.\n\n` +
      `The funds should arrive in your bank account within 2-7 business days.\n\n` +
      `Keep creating amazing widgets!\n\n` +
      `Best regards,\nThe StickerNest Team`,
  },
};

// ==================
// Email Service Class
// ==================

class EmailService {
  private enabled: boolean;

  constructor() {
    // Check if email is configured (can be extended with actual provider checks)
    this.enabled = process.env.EMAIL_ENABLED === 'true';
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      if (!this.enabled) {
        // Log email instead of sending in development
        log.info('[Email] Would send email:', {
          to: options.to,
          subject: options.subject,
        });
        return { success: true, messageId: `dev-${Date.now()}` };
      }

      // TODO: Integrate with actual email provider (Resend, SendGrid, etc.)
      // For now, log the email
      log.info('[Email] Sending email:', {
        to: options.to,
        subject: options.subject,
      });

      // Placeholder for actual email sending
      // const response = await resend.emails.send({
      //   from: 'StickerNest <noreply@stickernest.com>',
      //   to: options.to,
      //   subject: options.subject,
      //   html: options.html,
      //   text: options.text,
      // });

      return { success: true, messageId: `placeholder-${Date.now()}` };
    } catch (error) {
      log.error('[Email] Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedNotification(
    userId: string,
    options?: { amount?: number; retryUrl?: string }
  ): Promise<EmailResult> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      log.warn('[Email] Cannot send payment failed notification - no email for user', { userId });
      return { success: false, error: 'User email not found' };
    }

    const template = templates.paymentFailed;
    const data = {
      userName: user.name || 'there',
      amount: options?.amount,
      retryUrl: options?.retryUrl || `${process.env.APP_URL || 'https://stickernest.com'}/settings/billing`,
    };

    return this.send({
      to: user.email,
      subject: template.subject,
      html: template.html(data),
      text: template.text(data),
    });
  }

  /**
   * Send payment successful notification
   */
  async sendPaymentSuccessNotification(
    userId: string,
    amount: number,
    itemName?: string
  ): Promise<EmailResult> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      return { success: false, error: 'User email not found' };
    }

    const template = templates.paymentSuccessful;
    const data = {
      userName: user.name || 'there',
      amount,
      itemName,
    };

    return this.send({
      to: user.email,
      subject: template.subject,
      html: template.html(data),
      text: template.text(data),
    });
  }

  /**
   * Send creator payout notification
   */
  async sendCreatorPayoutNotification(
    userId: string,
    amount: number
  ): Promise<EmailResult> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      return { success: false, error: 'User email not found' };
    }

    const template = templates.creatorPayout;
    const data = {
      userName: user.name || 'there',
      amount,
    };

    return this.send({
      to: user.email,
      subject: template.subject,
      html: template.html(data),
      text: template.text(data),
    });
  }
}

// ==================
// Singleton Export
// ==================

export const emailService = new EmailService();
