/**
 * Email Service
 * Handles email verification and notifications using various email providers
 */

import { emailConfig } from '../config/env'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailVerificationData {
  email: string
  verificationToken: string
  userId: string
}

export class EmailService {
  private static instance: EmailService
  private emailProvider: EmailProvider | null = null

  private constructor() {
    this.initializeProvider()
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  private initializeProvider() {
    if (emailConfig.sendgrid?.apiKey) {
      this.emailProvider = new SendGridProvider(emailConfig.sendgrid.apiKey)
    } else if (emailConfig.awsSes?.accessKeyId) {
      this.emailProvider = new AWSSESProvider(
        emailConfig.awsSes.accessKeyId,
        emailConfig.awsSes.secretAccessKey,
        emailConfig.awsSes.region
      )
    } else if (emailConfig.smtp?.host) {
      this.emailProvider = new SMTPProvider(emailConfig.smtp)
    } else {
      console.warn('No email provider configured. Email verification will not work.')
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.emailProvider) {
      throw new Error('No email provider configured')
    }

    try {
      return await this.emailProvider.sendEmail(options)
    } catch (error) {
      console.error('Failed to send email:', error)
      throw error
    }
  }

  async sendVerificationEmail(data: EmailVerificationData): Promise<boolean> {
    const verificationUrl = `clothar://verify-email?token=${data.verificationToken}&userId=${data.userId}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email - ClothAR</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">Welcome to ClothAR!</h1>
            <p>Thank you for registering with ClothAR. To complete your registration and start exploring our AR clothing features, please verify your email address.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email Address
              </a>
            </div>

            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
              ${verificationUrl}
            </p>

            <p>This verification link will expire in 24 hours for security reasons.</p>

            <p>If you didn't create an account with ClothAR, please ignore this email.</p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              ClothAR - Experience clothing virtually with augmented reality
            </p>
          </div>
        </body>
      </html>
    `

    const text = `
      Welcome to ClothAR!

      Thank you for registering. To complete your registration, please verify your email address by clicking this link:

      ${verificationUrl}

      This verification link will expire in 24 hours.

      If you didn't create an account with ClothAR, please ignore this email.

      ClothAR - Experience clothing virtually with augmented reality
    `

    return await this.sendEmail({
      to: data.email,
      subject: 'Verify Your Email - ClothAR',
      html,
      text
    })
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `clothar://reset-password?token=${resetToken}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password - ClothAR</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">Reset Your Password</h1>
            <p>We received a request to reset your password for your ClothAR account. If you made this request, click the button below to reset your password.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>

            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>

            <p>This password reset link will expire in 1 hour for security reasons.</p>

            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              ClothAR - Experience clothing virtually with augmented reality
            </p>
          </div>
        </body>
      </html>
    `

    const text = `
      Reset Your Password - ClothAR

      We received a request to reset your password. If you made this request, click this link to reset your password:

      ${resetUrl}

      This password reset link will expire in 1 hour.

      If you didn't request a password reset, please ignore this email.

      ClothAR - Experience clothing virtually with augmented reality
    `

    return await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - ClothAR',
      html,
      text
    })
  }
}

// Email Provider Interfaces
interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<boolean>
}

class SendGridProvider implements EmailProvider {
  constructor(private apiKey: string) {}

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: options.to }],
            subject: options.subject,
          }],
          from: { email: 'noreply@clothar.com' },
          content: [
            {
              type: 'text/html',
              value: options.html,
            },
            ...(options.text ? [{
              type: 'text/plain',
              value: options.text,
            }] : [])
          ],
        }),
      })

      return response.ok
    } catch (error) {
      console.error('SendGrid email send failed:', error)
      return false
    }
  }
}

class AWSSESProvider implements EmailProvider {
  constructor(
    private accessKeyId: string,
    private secretAccessKey: string,
    private region: string
  ) {}

  async sendEmail(options: EmailOptions): Promise<boolean> {
    // AWS SES implementation would go here
    // This is a placeholder - actual implementation would require AWS SDK
    console.warn('AWS SES provider not fully implemented')
    return false
  }
}

class SMTPProvider implements EmailProvider {
  constructor(private config: { host: string; port: number; user: string; pass: string }) {}

  async sendEmail(options: EmailOptions): Promise<boolean> {
    // SMTP implementation would go here
    // This is a placeholder - actual implementation would require nodemailer or similar
    console.warn('SMTP provider not fully implemented')
    return false
  }
}