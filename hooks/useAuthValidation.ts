import { useState, useCallback } from 'react';
import { ValidationUtils, ValidationError } from '@/utils/validation';

interface UseAuthValidationReturn {
  errors: Record<string, string>;
  validateField: (field: string, value: string, additionalData?: any) => boolean;
  validateForm: (data: any) => boolean;
  clearErrors: () => void;
  clearFieldError: (field: string) => void;
}

export function useAuthValidation(): UseAuthValidationReturn {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const validateField = useCallback((field: string, value: string, additionalData?: any): boolean => {
    let error: ValidationError | null = null;

    switch (field) {
      case 'email':
        error = ValidationUtils.validateEmail(value);
        break;
      case 'password':
        error = ValidationUtils.validatePassword(value);
        break;
      case 'confirmPassword':
        if (additionalData?.password) {
          error = ValidationUtils.validatePasswordConfirmation(additionalData.password, value);
        }
        break;
      case 'username':
        error = ValidationUtils.validateUsername(value);
        break;
      case 'phone':
        error = ValidationUtils.validatePhone(value);
        break;
      case 'date_of_birth':
        error = ValidationUtils.validateDateOfBirth(value);
        break;
    }

    if (error) {
      setFieldError(field, error.message);
      return false;
    } else {
      clearFieldError(field);
      return true;
    }
  }, [setFieldError, clearFieldError]);

  const validateForm = useCallback((data: any): boolean => {
    const validationErrors: ValidationError[] = [];

    if (data.type === 'signup') {
      validationErrors.push(...ValidationUtils.validateSignUpData({
        email: data.email || '',
        password: data.password || '',
        confirmPassword: data.confirmPassword || '',
        username: data.username || '',
      }));
    } else if (data.type === 'login') {
      const emailError = ValidationUtils.validateEmail(data.email || '');
      if (emailError) validationErrors.push(emailError);

      if (!data.password) {
        validationErrors.push({ field: 'password', message: 'パスワードを入力してください' });
      }
    }

    // Set all errors
    const errorMap: Record<string, string> = {};
    validationErrors.forEach(error => {
      errorMap[error.field] = error.message;
    });
    setErrors(errorMap);

    return validationErrors.length === 0;
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    clearErrors,
    clearFieldError,
  };
}