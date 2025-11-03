// src/services/validationService.ts
import { ServerValidation } from '../utils/validationUtils';

export class ValidationService {
  // Validate user registration data on server
  static async validateRegistration(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const response = await fetch('/api/validate/registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: ['Validation failed'] }));
        return {
          isValid: false,
          errors: ServerValidation.parseValidationErrors(errorData)
        };
      }

      const result = await response.json();
      return {
        isValid: result.valid || false,
        errors: result.errors || []
      };
    } catch (error) {
      console.error('Registration validation error:', error);
      return {
        isValid: false,
        errors: ['Unable to validate registration data. Please try again.']
      };
    }
  }

  // Validate measurement data on server
  static async validateMeasurement(data: {
    name: string;
    measurements: Record<string, number>;
  }): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const response = await fetch('/api/validate/measurement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: ['Validation failed'] }));
        return {
          isValid: false,
          errors: ServerValidation.parseValidationErrors(errorData)
        };
      }

      const result = await response.json();
      return {
        isValid: result.valid || false,
        errors: result.errors || []
      };
    } catch (error) {
      console.error('Measurement validation error:', error);
      return {
        isValid: false,
        errors: ['Unable to validate measurement data. Please try again.']
      };
    }
  }

  // Validate order data on server
  static async validateOrder(data: {
    items: any[];
    shippingAddress: any;
    paymentMethod: string;
  }): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const response = await fetch('/api/validate/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: ['Validation failed'] }));
        return {
          isValid: false,
          errors: ServerValidation.parseValidationErrors(errorData)
        };
      }

      const result = await response.json();
      return {
        isValid: result.valid || false,
        errors: result.errors || []
      };
    } catch (error) {
      console.error('Order validation error:', error);
      return {
        isValid: false,
        errors: ['Unable to validate order data. Please try again.']
      };
    }
  }

  // Validate product data on server
  static async validateProduct(data: {
    name: string;
    description: string;
    price: number;
    category: string;
  }): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const response = await fetch('/api/validate/product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: ['Validation failed'] }));
        return {
          isValid: false,
          errors: ServerValidation.parseValidationErrors(errorData)
        };
      }

      const result = await response.json();
      return {
        isValid: result.valid || false,
        errors: result.errors || []
      };
    } catch (error) {
      console.error('Product validation error:', error);
      return {
        isValid: false,
        errors: ['Unable to validate product data. Please try again.']
      };
    }
  }

  // Generic validation method for any endpoint
  static async validate(endpoint: string, data: any): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const response = await fetch(`/api/validate/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: ['Validation failed'] }));
        return {
          isValid: false,
          errors: ServerValidation.parseValidationErrors(errorData)
        };
      }

      const result = await response.json();
      return {
        isValid: result.valid || false,
        errors: result.errors || []
      };
    } catch (error) {
      console.error(`Validation error for ${endpoint}:`, error);
      return {
        isValid: false,
        errors: [`Unable to validate ${endpoint} data. Please try again.`]
      };
    }
  }

  // Validate file upload
  static validateFile(file: any, options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    maxFiles?: number;
  } = {}): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'], maxFiles = 1 } = options;

    if (!file) {
      errors.push('No file selected');
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate multiple files
  static validateFiles(files: any[], options: {
    maxSize?: number;
    allowedTypes?: string[];
    maxFiles?: number;
  } = {}): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { maxFiles = 10 } = options;

    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return { isValid: false, errors };
    }

    files.forEach((file, index) => {
      const result = this.validateFile(file, options);
      if (!result.isValid) {
        errors.push(`File ${index + 1}: ${result.errors.join(', ')}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}