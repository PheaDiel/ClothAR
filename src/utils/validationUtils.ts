// src/utils/validationUtils.ts

// Input sanitization utilities
export class InputSanitizer {
  // Remove potentially dangerous characters and normalize input
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return input
      .trim()
      // Remove null bytes and other control characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Remove potential script injection patterns
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      // Limit length to prevent buffer overflow attempts
      .substring(0, 10000);
  }

  // Sanitize email addresses
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') return '';

    return email
      .trim()
      .toLowerCase()
      // Remove any whitespace and control characters
      .replace(/\s+/g, '')
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Basic email pattern validation will be done separately
      .substring(0, 254); // RFC 5321 limit
  }

  // Sanitize phone numbers
  static sanitizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') return '';

    return phone
      .trim()
      // Remove all non-digit characters except +, -, (, ), space
      .replace(/[^\d+\-\(\)\s]/g, '')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .substring(0, 20); // Reasonable limit for phone numbers
  }

  // Sanitize numeric inputs
  static sanitizeNumber(input: string | number): string {
    if (input === null || input === undefined) return '';

    const str = String(input);
    // Remove all non-numeric characters except decimal point
    return str.replace(/[^0-9.]/g, '').substring(0, 20);
  }

  // Sanitize names (allow letters, spaces, hyphens, apostrophes)
  static sanitizeName(name: string): string {
    if (!name || typeof name !== 'string') return '';

    return name
      .trim()
      // Allow letters, spaces, hyphens, apostrophes, and periods
      .replace(/[^a-zA-Z\s\-'.]/g, '')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      .substring(0, 100); // Reasonable limit for names
  }

  // Sanitize addresses
  static sanitizeAddress(address: string): string {
    if (!address || typeof address !== 'string') return '';

    return address
      .trim()
      // Allow alphanumeric, spaces, and common address characters
      .replace(/[^a-zA-Z0-9\s\-.,#/]/g, '')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .substring(0, 500); // Reasonable limit for addresses
  }

  // Sanitize measurement values (numbers with optional decimal)
  static sanitizeMeasurement(value: string | number): string {
    if (value === null || value === undefined) return '';

    const str = String(value);
    // Allow only numbers and single decimal point
    const sanitized = str.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = sanitized.split('.');
    return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
  }
}

// Validation rules and error messages
export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Common validation rules
export class ValidationRules {
  static required(message = 'This field is required'): ValidationRule {
    return {
      validate: (value: any) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return true;
      },
      message
    };
  }

  static minLength(min: number, message?: string): ValidationRule {
    return {
      validate: (value: string) => !value || value.length >= min,
      message: message || `Must be at least ${min} characters long`
    };
  }

  static maxLength(max: number, message?: string): ValidationRule {
    return {
      validate: (value: string) => !value || value.length <= max,
      message: message || `Must be no more than ${max} characters long`
    };
  }

  static email(message = 'Please enter a valid email address'): ValidationRule {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      validate: (value: string) => !value || emailRegex.test(value),
      message
    };
  }

  static phone(message = 'Please enter a valid phone number'): ValidationRule {
    // Philippine phone number pattern: +63XXXXXXXXXX or 09XXXXXXXXX or 63XXXXXXXXXX
    const phoneRegex = /^(\+?63|0)?9\d{9}$/;
    return {
      validate: (value: string) => !value || phoneRegex.test(value.replace(/[\s\-\(\)]/g, '')),
      message
    };
  }

  static numeric(message = 'Please enter a valid number'): ValidationRule {
    return {
      validate: (value: any) => {
        if (!value) return true; // Allow empty values
        const num = Number(value);
        return !isNaN(num) && isFinite(num);
      },
      message
    };
  }

  static positiveNumber(message = 'Please enter a positive number'): ValidationRule {
    return {
      validate: (value: any) => {
        if (!value) return true; // Allow empty values
        const num = Number(value);
        return !isNaN(num) && isFinite(num) && num > 0;
      },
      message
    };
  }

  static measurement(message = 'Please enter a valid measurement (positive number)'): ValidationRule {
    return {
      validate: (value: any) => {
        if (!value) return true; // Allow empty values
        const num = parseFloat(value);
        return !isNaN(num) && isFinite(num) && num > 0 && num < 1000; // Reasonable range
      },
      message
    };
  }

  static password(message = 'Password must be at least 8 characters with uppercase, lowercase, and number'): ValidationRule {
    return {
      validate: (value: string) => {
        if (!value) return false;
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return passwordRegex.test(value);
      },
      message
    };
  }

  static confirmPassword(originalPassword: string, message = 'Passwords do not match'): ValidationRule {
    return {
      validate: (value: string) => value === originalPassword,
      message
    };
  }

  static date(message = 'Please enter a valid date'): ValidationRule {
    return {
      validate: (value: string) => {
        if (!value) return true;
        const date = new Date(value);
        return !isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= new Date().getFullYear();
      },
      message
    };
  }

  static url(message = 'Please enter a valid URL'): ValidationRule {
    const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    return {
      validate: (value: string) => !value || urlRegex.test(value),
      message
    };
  }
}

// Form validation utility
export class FormValidator {
  static validateField(value: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];

    for (const rule of rules) {
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateForm(fields: Record<string, { value: any; rules: ValidationRule[] }>): ValidationResult {
    const allErrors: string[] = [];
    let isValid = true;

    for (const [fieldName, field] of Object.entries(fields)) {
      const result = this.validateField(field.value, field.rules);
      if (!result.isValid) {
        isValid = false;
        allErrors.push(...result.errors.map(error => `${fieldName}: ${error}`));
      }
    }

    return {
      isValid,
      errors: allErrors
    };
  }

  // Sanitize and validate in one step
  static sanitizeAndValidate(
    rawValue: any,
    sanitizer: (value: any) => string,
    rules: ValidationRule[]
  ): { sanitizedValue: string; validation: ValidationResult } {
    const sanitizedValue = sanitizer(rawValue);
    const validation = this.validateField(sanitizedValue, rules);

    return {
      sanitizedValue,
      validation
    };
  }
}

// Server-side validation helpers (for API responses)
export class ServerValidation {
  static parseValidationErrors(errorResponse: any): string[] {
    if (!errorResponse) return ['An unknown error occurred'];

    // Handle different error response formats
    if (errorResponse.errors && Array.isArray(errorResponse.errors)) {
      return errorResponse.errors;
    }

    if (errorResponse.message) {
      return [errorResponse.message];
    }

    if (typeof errorResponse === 'string') {
      return [errorResponse];
    }

    // Handle validation error objects
    if (errorResponse.validation && typeof errorResponse.validation === 'object') {
      const errors: string[] = [];
      for (const [field, fieldErrors] of Object.entries(errorResponse.validation)) {
        if (Array.isArray(fieldErrors)) {
          errors.push(...fieldErrors.map((error: any) => `${field}: ${error}`));
        } else if (typeof fieldErrors === 'string') {
          errors.push(`${field}: ${fieldErrors}`);
        }
      }
      return errors;
    }

    return ['Validation failed. Please check your input.'];
  }

  static isValidationError(error: any): boolean {
    return error && (
      error.status === 422 || // Unprocessable Entity
      error.status === 400 || // Bad Request
      (error.message && error.message.toLowerCase().includes('validation'))
    );
  }
}