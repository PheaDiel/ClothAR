/**
 * Authentication Service
 * Handles user authentication, registration, and email verification
 */

import { supabase } from './supabase'
import { SecureAuth } from './securityService'
import { EmailService } from './emailService'

export interface AuthResult {
  success: boolean
  user?: any
  error?: string
}

export interface EmailVerificationResult {
  success: boolean
  message: string
  userId?: string
}

export class AuthService {
  /**
   * Register a new user with email verification
   */
  static async registerWithEmailVerification(
    email: string,
    password: string,
    userData: Record<string, any> = {}
  ): Promise<AuthResult> {
    try {
      // Use secure registration
      const result = await SecureAuth.signUp(email, password, userData)

      if (result.user) {
        // Send verification email
        const emailService = EmailService.getInstance()
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

        // Store verification token
        const { error: tokenError } = await supabase
          .from('email_verification_tokens')
          .insert({
            user_id: result.user.id,
            email: email,
            token: token,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })

        if (tokenError) {
          console.error('Token storage error:', tokenError)
          return { success: false, error: 'Failed to create verification token' }
        }

        // Send verification email
        const emailSent = await emailService.sendVerificationEmail({
          email: email,
          verificationToken: token,
          userId: result.user.id
        })

        if (!emailSent) {
          return { success: false, error: 'Failed to send verification email' }
        }

        return { success: true, user: result.user }
      }

      return { success: false, error: 'Registration failed' }
    } catch (error: any) {
      console.error('Registration error:', error)
      return { success: false, error: error.message || 'Registration failed' }
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<EmailVerificationResult> {
    try {
      const { data, error } = await supabase
        .rpc('verify_email_with_token', { p_token: token })

      if (error) {
        console.error('Email verification error:', error)
        return { success: false, message: 'Verification failed' }
      }

      if (data && data.success) {
        return {
          success: true,
          message: data.message || 'Email verified successfully',
          userId: data.user_id
        }
      }

      return { success: false, message: data?.message || 'Verification failed' }
    } catch (error: any) {
      console.error('Email verification error:', error)
      return { success: false, message: 'An error occurred during verification' }
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user email
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)

      if (userError || !user?.user?.email) {
        return { success: false, error: 'User not found' }
      }

      // Generate new token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

      // Store new verification token
      const { error: tokenError } = await supabase
        .from('email_verification_tokens')
        .insert({
          user_id: userId,
          email: user.user.email,
          token: token,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })

      if (tokenError) {
        console.error('Token storage error:', tokenError)
        return { success: false, error: 'Failed to create verification token' }
      }

      // Send verification email
      const emailService = EmailService.getInstance()
      const emailSent = await emailService.sendVerificationEmail({
        email: user.user.email,
        verificationToken: token,
        userId: userId
      })

      if (!emailSent) {
        return { success: false, error: 'Failed to send verification email' }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Resend verification email error:', error)
      return { success: false, error: error.message || 'Failed to resend verification email' }
    }
  }

  /**
   * Check if user email is verified
   */
  static async isEmailVerified(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Email verification check error:', error)
        return false
      }

      return data?.email_verified || false
    } catch (error) {
      console.error('Email verification check error:', error)
      return false
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate reset token
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

      // Store reset token (you might want to create a separate table for this)
      // For now, we'll use Supabase's built-in password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `clothar://reset-password?token=${resetToken}`
      })

      if (error) {
        console.error('Password reset error:', error)
        return { success: false, error: error.message }
      }

      // Send custom password reset email
      const emailService = EmailService.getInstance()
      const emailSent = await emailService.sendPasswordResetEmail(email, resetToken)

      if (!emailSent) {
        return { success: false, error: 'Failed to send password reset email' }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Password reset error:', error)
      return { success: false, error: error.message || 'Failed to send password reset email' }
    }
  }

  /**
   * Update password with reset token
   */
  static async updatePasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify password strength
      const { PasswordPolicy } = await import('./securityService')
      const validation = PasswordPolicy.validate(newPassword)

      if (!validation.isValid) {
        return { success: false, error: `Password validation failed: ${validation.errors.join(', ')}` }
      }

      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        console.error('Password update error:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Password update error:', error)
      return { success: false, error: error.message || 'Failed to update password' }
    }
  }
}