// src/hooks/useFormValidation.ts
import { useState, useCallback, useMemo } from 'react';
import {
  InputSanitizer,
  ValidationRules,
  FormValidator,
  ValidationRule,
  ValidationResult
} from '../utils/validationUtils';

interface FormField {
  value: string;
  error: string;
  touched: boolean;
}

interface FormConfig {
  [key: string]: {
    initialValue: string;
    sanitizer: (value: any) => string;
    rules: ValidationRule[];
  };
}

interface UseFormValidationReturn {
  fields: Record<string, FormField>;
  isValid: boolean;
  isDirty: boolean;
  errors: string[];
  setFieldValue: (fieldName: string, value: string) => void;
  setFieldTouched: (fieldName: string) => void;
  validateField: (fieldName: string) => boolean;
  validateForm: () => boolean;
  resetForm: () => void;
  getFieldValue: (fieldName: string) => string;
  getSanitizedValues: () => Record<string, string>;
}

export const useFormValidation = (config: FormConfig): UseFormValidationReturn => {
  const [fields, setFields] = useState<Record<string, FormField>>(() => {
    const initialFields: Record<string, FormField> = {};
    for (const [fieldName, fieldConfig] of Object.entries(config)) {
      initialFields[fieldName] = {
        value: fieldConfig.initialValue,
        error: '',
        touched: false,
      };
    }
    return initialFields;
  });

  // Validate a single field
  const validateField = useCallback((fieldName: string): boolean => {
    const field = fields[fieldName];
    const fieldConfig = config[fieldName];

    if (!fieldConfig) return true;

    const { sanitizedValue, validation } = FormValidator.sanitizeAndValidate(
      field.value,
      fieldConfig.sanitizer,
      fieldConfig.rules
    );

    setFields(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        value: sanitizedValue,
        error: validation.errors[0] || '',
        touched: true,
      }
    }));

    return validation.isValid;
  }, [fields, config]);

  // Set field value and optionally validate
  const setFieldValue = useCallback((fieldName: string, value: string, validate = true) => {
    const fieldConfig = config[fieldName];
    if (!fieldConfig) return;

    const sanitizedValue = fieldConfig.sanitizer(value);

    setFields(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        value: sanitizedValue,
        error: validate ? '' : prev[fieldName].error, // Clear error if validating
      }
    }));

    if (validate) {
      // Debounced validation
      setTimeout(() => validateField(fieldName), 300);
    }
  }, [config, validateField]);

  // Mark field as touched
  const setFieldTouched = useCallback((fieldName: string) => {
    setFields(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        touched: true,
      }
    }));
    validateField(fieldName);
  }, [validateField]);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    let allValid = true;

    for (const fieldName of Object.keys(config)) {
      if (!validateField(fieldName)) {
        allValid = false;
      }
    }

    return allValid;
  }, [config, validateField]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFields(() => {
      const initialFields: Record<string, FormField> = {};
      for (const [fieldName, fieldConfig] of Object.entries(config)) {
        initialFields[fieldName] = {
          value: fieldConfig.initialValue,
          error: '',
          touched: false,
        };
      }
      return initialFields;
    });
  }, [config]);

  // Get field value
  const getFieldValue = useCallback((fieldName: string): string => {
    return fields[fieldName]?.value || '';
  }, [fields]);

  // Get all sanitized values
  const getSanitizedValues = useCallback((): Record<string, string> => {
    const values: Record<string, string> = {};
    for (const fieldName of Object.keys(config)) {
      values[fieldName] = fields[fieldName]?.value || '';
    }
    return values;
  }, [config, fields]);

  // Computed values
  const isValid = useMemo(() => {
    return Object.values(fields).every(field =>
      field.error === '' && (!config[Object.keys(fields)[Object.values(fields).indexOf(field)]]?.rules.some(rule => rule === ValidationRules.required()) || field.value.trim() !== '')
    );
  }, [fields, config]);

  const isDirty = useMemo(() => {
    return Object.entries(fields).some(([fieldName, field]) =>
      field.value !== config[fieldName]?.initialValue
    );
  }, [fields, config]);

  const errors = useMemo(() => {
    return Object.values(fields)
      .map(field => field.error)
      .filter(error => error !== '');
  }, [fields]);

  return {
    fields,
    isValid,
    isDirty,
    errors,
    setFieldValue,
    setFieldTouched,
    validateField,
    validateForm,
    resetForm,
    getFieldValue,
    getSanitizedValues,
  };
};

// Pre-configured form hooks for common use cases
export const useLoginForm = () => {
  return useFormValidation({
    email: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeEmail,
      rules: [ValidationRules.required(), ValidationRules.email()],
    },
    password: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeText,
      rules: [ValidationRules.required(), ValidationRules.minLength(1)],
    },
  });
};

export const useRegistrationForm = () => {
  return useFormValidation({
    name: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeName,
      rules: [ValidationRules.required(), ValidationRules.minLength(2), ValidationRules.maxLength(100)],
    },
    email: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeEmail,
      rules: [ValidationRules.required(), ValidationRules.email()],
    },
    phone: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizePhone,
      rules: [ValidationRules.required(), ValidationRules.phone()],
    },
    password: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeText,
      rules: [ValidationRules.required(), ValidationRules.password()],
    },
    confirmPassword: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeText,
      rules: [ValidationRules.required()],
    },
  });
};

export const useMeasurementForm = () => {
  return useFormValidation({
    name: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeName,
      rules: [ValidationRules.required(), ValidationRules.minLength(2), ValidationRules.maxLength(50)],
    },
    bust: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeMeasurement,
      rules: [ValidationRules.measurement()],
    },
    waist: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeMeasurement,
      rules: [ValidationRules.measurement()],
    },
    hip: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeMeasurement,
      rules: [ValidationRules.measurement()],
    },
    inseam: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeMeasurement,
      rules: [ValidationRules.measurement()],
    },
  });
};

export const useProfileForm = () => {
  return useFormValidation({
    name: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeName,
      rules: [ValidationRules.required(), ValidationRules.minLength(2), ValidationRules.maxLength(100)],
    },
    phone: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizePhone,
      rules: [ValidationRules.phone()],
    },
    dateOfBirth: {
      initialValue: '',
      sanitizer: InputSanitizer.sanitizeText,
      rules: [ValidationRules.date()],
    },
  });
};