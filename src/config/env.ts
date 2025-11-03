/**
 * Environment Configuration
 * Centralized environment variable management with validation
 */

interface EnvConfig {
  // Supabase
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };

  // Email Configuration
  email: {
    smtp?: {
      host: string;
      port: number;
      user: string;
      pass: string;
    };
    sendgrid?: {
      apiKey: string;
    };
    awsSes?: {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
    };
  };

  // Security Configuration
  security: {
    jwtSecret?: string;
    rateLimit: {
      maxAttempts: number;
      windowMinutes: number;
    };
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    accountLockout: {
      attempts: number;
      durationMinutes: number;
    };
  };

  // Environment
  nodeEnv: 'development' | 'production' | 'test';
}

// Validate required environment variables
const validateEnv = (): EnvConfig => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required Supabase environment variables. Please check your .env file.'
    );
  }

  // Parse numeric values with defaults
  const rateLimitMaxAttempts = parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '5', 10);
  const rateLimitWindowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10);
  const passwordMinLength = parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10);
  const accountLockoutAttempts = parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS || '5', 10);
  const accountLockoutDuration = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES || '30', 10);

  const config: EnvConfig = {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceRoleKey: process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    },
    email: {
      smtp: process.env.SMTP_HOST ? {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      } : undefined,
      sendgrid: process.env.SENDGRID_API_KEY ? {
        apiKey: process.env.SENDGRID_API_KEY,
      } : undefined,
      awsSes: process.env.AWS_SES_ACCESS_KEY_ID ? {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY || '',
        region: process.env.AWS_SES_REGION || 'us-east-1',
      } : undefined,
    },
    security: {
      jwtSecret: process.env.JWT_SECRET,
      rateLimit: {
        maxAttempts: rateLimitMaxAttempts,
        windowMinutes: rateLimitWindowMinutes,
      },
      passwordPolicy: {
        minLength: passwordMinLength,
        requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
        requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
        requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
        requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS === 'true',
      },
      accountLockout: {
        attempts: accountLockoutAttempts,
        durationMinutes: accountLockoutDuration,
      },
    },
    nodeEnv: (process.env.NODE_ENV as EnvConfig['nodeEnv']) || 'development',
  };

  return config;
};

// Export validated configuration
export const env = validateEnv();

// Export individual configs for convenience
export const supabaseConfig = env.supabase;
export const emailConfig = env.email;
export const securityConfig = env.security;
export const isDevelopment = env.nodeEnv === 'development';
export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';