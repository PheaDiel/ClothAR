/**
 * Monitoring Service
 * Handles security monitoring, alerts, and system health checks
 */

import { supabase } from './supabase'

export interface SecurityAlert {
  id: string
  type: 'brute_force' | 'suspicious_activity' | 'account_lockout' | 'unusual_login'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  userId?: string
  metadata: Record<string, any>
  createdAt: Date
  resolved: boolean
}

export interface SystemHealth {
  database: 'healthy' | 'degraded' | 'unhealthy'
  authentication: 'healthy' | 'degraded' | 'unhealthy'
  email: 'healthy' | 'degraded' | 'unhealthy'
  lastChecked: Date
  issues: string[]
}

export class MonitoringService {
  private static instance: MonitoringService
  private alerts: SecurityAlert[] = []

  private constructor() {
    this.startMonitoring()
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  private startMonitoring() {
    // Check for security issues every 5 minutes
    setInterval(() => {
      this.checkSecurityHealth()
    }, 5 * 60 * 1000)

    // Check for brute force attempts every minute
    setInterval(() => {
      this.checkBruteForceAttempts()
    }, 60 * 1000)
  }

  /**
   * Check overall system health
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
      database: 'healthy',
      authentication: 'healthy',
      email: 'healthy',
      lastChecked: new Date(),
      issues: []
    }

    try {
      // Check database connectivity
      const { error: dbError } = await supabase.from('profiles').select('count').limit(1)
      if (dbError) {
        health.database = 'unhealthy'
        health.issues.push(`Database error: ${dbError.message}`)
      }

      // Check authentication system
      const { error: authError } = await supabase.auth.getSession()
      if (authError) {
        health.authentication = 'degraded'
        health.issues.push(`Authentication error: ${authError.message}`)
      }

      // Check recent failed login attempts
      const { data: failedAttempts, error: attemptsError } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('success', false)
        .gte('attempted_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour

      if (attemptsError) {
        health.authentication = 'degraded'
        health.issues.push(`Login attempts check error: ${attemptsError.message}`)
      } else if (failedAttempts && failedAttempts.length > 10) {
        health.authentication = 'degraded'
        health.issues.push(`High number of failed login attempts: ${failedAttempts.length}`)
      }

      // Check email verification tokens
      const { data: expiredTokens, error: tokensError } = await supabase
        .from('email_verification_tokens')
        .select('*')
        .lt('expires_at', new Date().toISOString())

      if (tokensError) {
        health.database = 'degraded'
        health.issues.push(`Email verification tokens check error: ${tokensError.message}`)
      } else if (expiredTokens && expiredTokens.length > 50) {
        health.database = 'degraded'
        health.issues.push(`High number of expired email verification tokens: ${expiredTokens.length}`)
      }

    } catch (error: any) {
      health.database = 'unhealthy'
      health.issues.push(`System health check failed: ${error.message}`)
    }

    return health
  }

  /**
   * Check for brute force attempts
   */
  private async checkBruteForceAttempts() {
    try {
      const windowStart = new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes

      // Get IPs with high failure rates
      const { data: suspiciousIPs, error } = await supabase
        .rpc('get_suspicious_login_attempts', {
          p_window_minutes: 15,
          p_threshold: 5
        })

      if (error) {
        console.error('Brute force check error:', error)
        return
      }

      if (suspiciousIPs && suspiciousIPs.length > 0) {
        for (const ip of suspiciousIPs) {
          await this.createAlert({
            type: 'brute_force',
            severity: 'high',
            message: `Brute force attempt detected from IP: ${ip.ip_address}`,
            metadata: {
              ipAddress: ip.ip_address,
              attempts: ip.attempt_count,
              emails: ip.emails
            }
          })
        }
      }

      // Check for account lockouts
      const { data: lockedAccounts, error: lockError } = await supabase
        .from('profiles')
        .select('id, account_locked_until')
        .not('account_locked_until', 'is', null)
        .gte('account_locked_until', new Date().toISOString())

      if (lockError) {
        console.error('Account lockout check error:', lockError)
        return
      }

      if (lockedAccounts && lockedAccounts.length > 0) {
        for (const account of lockedAccounts) {
          await this.createAlert({
            type: 'account_lockout',
            severity: 'medium',
            message: `Account locked due to failed login attempts`,
            userId: account.id,
            metadata: {
              lockedUntil: account.account_locked_until
            }
          })
        }
      }

    } catch (error) {
      console.error('Brute force monitoring error:', error)
    }
  }

  /**
   * Check overall security health
   */
  private async checkSecurityHealth() {
    try {
      const health = await this.checkSystemHealth()

      if (health.issues.length > 0) {
        console.warn('Security health issues detected:', health.issues)

        // Create alerts for critical issues
        for (const issue of health.issues) {
          if (issue.includes('Database error') || issue.includes('unhealthy')) {
            await this.createAlert({
              type: 'suspicious_activity',
              severity: 'critical',
              message: `System health issue: ${issue}`,
              metadata: { health }
            })
          }
        }
      }

      // Check for unusual login patterns
      await this.checkUnusualLoginPatterns()

    } catch (error) {
      console.error('Security health check error:', error)
    }
  }

  /**
   * Check for unusual login patterns
   */
  private async checkUnusualLoginPatterns() {
    try {
      // Get logins from unusual locations or times
      const { data: unusualLogins, error } = await supabase
        .rpc('detect_unusual_logins', {
          p_hours_window: 24
        })

      if (error) {
        console.error('Unusual login check error:', error)
        return
      }

      if (unusualLogins && unusualLogins.length > 0) {
        for (const login of unusualLogins) {
          await this.createAlert({
            type: 'unusual_login',
            severity: 'medium',
            message: `Unusual login detected for user`,
            userId: login.user_id,
            metadata: {
              ipAddress: login.ip_address,
              userAgent: login.user_agent,
              location: login.location,
              time: login.login_time
            }
          })
        }
      }

    } catch (error) {
      console.error('Unusual login pattern check error:', error)
    }
  }

  /**
   * Create a security alert
   */
  async createAlert(alert: Omit<SecurityAlert, 'id' | 'createdAt' | 'resolved'>): Promise<void> {
    const newAlert: SecurityAlert = {
      ...alert,
      id: Math.random().toString(36).substring(2, 15),
      createdAt: new Date(),
      resolved: false
    }

    this.alerts.push(newAlert)

    // Log to audit system
    try {
      await supabase.from('audit_logs').insert({
        user_id: alert.userId || null,
        action: 'security_alert',
        resource_type: 'security',
        resource_id: newAlert.id,
        metadata: {
          alert_type: alert.type,
          severity: alert.severity,
          message: alert.message,
          ...alert.metadata
        }
      })
    } catch (error) {
      console.error('Failed to log security alert:', error)
    }

    // In a real system, you might send notifications to admins
    console.warn(`🚨 Security Alert [${alert.severity.toUpperCase()}]: ${alert.message}`)
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SecurityAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      return true
    }
    return false
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeframeHours: number = 24) {
    try {
      const startTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000)

      // Get login statistics
      const { data: loginStats, error: loginError } = await supabase
        .from('login_attempts')
        .select('*')
        .gte('attempted_at', startTime.toISOString())

      if (loginError) {
        console.error('Login stats error:', loginError)
        return null
      }

      const totalAttempts = loginStats?.length || 0
      const successfulLogins = loginStats?.filter(a => a.success).length || 0
      const failedLogins = totalAttempts - successfulLogins

      // Get active alerts count
      const activeAlerts = this.getActiveAlerts().length

      // Get locked accounts
      const { data: lockedAccounts, error: lockError } = await supabase
        .from('profiles')
        .select('id')
        .not('account_locked_until', 'is', null)
        .gte('account_locked_until', new Date().toISOString())

      if (lockError) {
        console.error('Locked accounts error:', lockError)
      }

      return {
        timeframeHours,
        totalLoginAttempts: totalAttempts,
        successfulLogins,
        failedLogins,
        successRate: totalAttempts > 0 ? (successfulLogins / totalAttempts) * 100 : 0,
        activeAlerts,
        lockedAccounts: lockedAccounts?.length || 0,
        generatedAt: new Date()
      }
    } catch (error) {
      console.error('Security metrics error:', error)
      return null
    }
  }

  /**
   * Clean up old data
   */
  async cleanupOldData() {
    try {
      // Clean up expired OTPs
      await supabase.rpc('cleanup_expired_otps')

      // Clean up old audit logs (older than 90 days)
      await supabase.rpc('cleanup_old_audit_logs')

      // Clean up old login attempts (older than 30 days)
      await supabase.rpc('cleanup_old_login_attempts')

      console.log('✅ Old data cleanup completed')
    } catch (error) {
      console.error('Data cleanup error:', error)
    }
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance()