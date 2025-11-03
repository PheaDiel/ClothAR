/**
 * Security Service
 * Handles authentication security features like rate limiting, password policies, and account lockouts
 */

import { supabase } from './supabase'
import { securityConfig } from '../config/env'

export interface LoginAttempt {
  email: string
  ipAddress?: string
  userAgent?: string
  success: boolean
  failureReason?: string
}

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

export interface RateLimitResult {
  allowed: boolean
  remainingAttempts: number
  lockoutUntil?: Date
}

/**
 * Password Policy Validation
 */
export class PasswordPolicy {
  static validate(password: string): PasswordValidationResult {
    const errors: string[] = []
    const policy = securityConfig.passwordPolicy

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`)
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein']
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * Rate Limiting and Account Security
 */
export class SecurityService {
  /**
   * Check rate limiting for login attempts
   */
  static async checkRateLimit(email: string, ipAddress?: string): Promise<RateLimitResult> {
    try {
      const windowStart = new Date()
      windowStart.setMinutes(windowStart.getMinutes() - securityConfig.rateLimit.windowMinutes)

      // Get recent failed attempts
      const { data: attempts, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('email', email)
        .gte('attempted_at', windowStart.toISOString())
        .order('attempted_at', { ascending: false })

      if (error) {
        console.error('Rate limit check error:', error)
        return { allowed: true, remainingAttempts: securityConfig.rateLimit.maxAttempts }
      }

      const failedAttempts = attempts?.filter(a => !a.success) || []
      const recentFailures = failedAttempts.length

      // Check if account is currently locked
      const lockoutConfig = securityConfig.accountLockout
      if (recentFailures >= lockoutConfig.attempts) {
        const lockoutUntil = new Date(windowStart)
        lockoutUntil.setMinutes(lockoutUntil.getMinutes() + lockoutConfig.durationMinutes)

        return {
          allowed: false,
          remainingAttempts: 0,
          lockoutUntil
        }
      }

      const remainingAttempts = Math.max(0, securityConfig.rateLimit.maxAttempts - recentFailures)

      return {
        allowed: remainingAttempts > 0,
        remainingAttempts
      }
    } catch (error) {
      console.error('Rate limit check failed:', error)
      // Allow login on error to avoid blocking legitimate users
      return { allowed: true, remainingAttempts: securityConfig.rateLimit.maxAttempts }
    }
  }

  /**
   * Record login attempt
   */
  static async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    try {
      const { error } = await supabase
        .from('login_attempts')
        .insert({
          email: attempt.email,
          ip_address: attempt.ipAddress,
          user_agent: attempt.userAgent,
          success: attempt.success,
          failure_reason: attempt.failureReason,
          attempted_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to record login attempt:', error)
      }
    } catch (error) {
      console.error('Login attempt recording failed:', error)
    }
  }

  /**
   * Log security event to audit logs
   */
  static async logSecurityEvent(
    action: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          metadata,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to log security event:', error)
      }
    } catch (error) {
      console.error('Security event logging failed:', error)
    }
  }

  /**
   * Check if user account is locked
   */
  static async isAccountLocked(email: string): Promise<{ locked: boolean; lockoutUntil?: Date }> {
    try {
      const windowStart = new Date()
      windowStart.setMinutes(windowStart.getMinutes() - securityConfig.rateLimit.windowMinutes)

      const { data: attempts, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('email', email)
        .gte('attempted_at', windowStart.toISOString())
        .eq('success', false)
        .order('attempted_at', { ascending: false })
        .limit(securityConfig.accountLockout.attempts)

      if (error || !attempts) {
        return { locked: false }
      }

      if (attempts.length >= securityConfig.accountLockout.attempts) {
        const lockoutUntil = new Date(windowStart)
        lockoutUntil.setMinutes(lockoutUntil.getMinutes() + securityConfig.accountLockout.durationMinutes)

        return { locked: true, lockoutUntil }
      }

      return { locked: false }
    } catch (error) {
      console.error('Account lock check failed:', error)
      return { locked: false }
    }
  }

  /**
   * Get user's security status
   */
  static async getUserSecurityStatus(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('failed_login_attempts, account_locked_until, last_login_at, password_changed_at')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Failed to get user security status:', error)
        return null
      }

      return {
        failedLoginAttempts: profile.failed_login_attempts || 0,
        accountLockedUntil: profile.account_locked_until ? new Date(profile.account_locked_until) : null,
        lastLoginAt: profile.last_login_at ? new Date(profile.last_login_at) : null,
        passwordChangedAt: profile.password_changed_at ? new Date(profile.password_changed_at) : null,
      }
    } catch (error) {
      console.error('User security status check failed:', error)
      return null
    }
  }
}

/**
 * Enhanced Authentication with Security Features
 */
export class SecureAuth {
  /**
   * Secure login with rate limiting and account lockout
   */
  static async signInWithPassword(email: string, password: string, ipAddress?: string, userAgent?: string) {
    try {
      // Check rate limiting first
      const rateLimitResult = await SecurityService.checkRateLimit(email, ipAddress)
      if (!rateLimitResult.allowed) {
        await SecurityService.recordLoginAttempt({
          email,
          ipAddress,
          userAgent,
          success: false,
          failureReason: 'Rate limited'
        })

        throw new Error(`Account temporarily locked. Try again after ${rateLimitResult.lockoutUntil?.toLocaleTimeString()}`)
      }

      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      const success = !error

      // Record the attempt
      await SecurityService.recordLoginAttempt({
        email,
        ipAddress,
        userAgent,
        success,
        failureReason: error?.message
      })

      // Log security event
      await SecurityService.logSecurityEvent(
        success ? 'user_login_success' : 'user_login_failed',
        'auth',
        data.user?.id,
        { email, ipAddress }
      )

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      throw error
    }
  }

  /**
   * Secure registration with password validation
   */
  static async signUp(email: string, password: string, metadata?: Record<string, any>) {
    // Validate password policy
    const passwordValidation = PasswordPolicy.validate(password)
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`)
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })

    if (error) {
      throw error
    }

    // Log registration event
    await SecurityService.logSecurityEvent(
      'user_registered',
      'auth',
      data.user?.id,
      { email }
    )

    return data
  }
}