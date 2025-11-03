// src/hooks/useAsyncOperation.ts
import { useState, useCallback } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { useToast } from '../context/ToastContext';

interface AsyncOperationOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  retryCount?: number;
  retryDelay?: number;
}

export const useAsyncOperation = () => {
  const [loading, setLoading] = useState(false);
  const { isConnected, isInternetReachable } = useNetwork();
  const { showSuccess, showError, showInfo } = useToast();

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    options: AsyncOperationOptions = {}
  ): Promise<boolean> => {
    const {
      showSuccessToast = false,
      showErrorToast = true,
      successMessage = 'Operation completed successfully',
      errorMessage = 'Operation failed. Please try again.',
      onSuccess,
      onError,
      retryCount = 0,
      retryDelay = 1000,
    } = options;

    // Check network connectivity
    if (!isConnected || isInternetReachable === false) {
      showInfo('No internet connection. Operation will be saved locally.');
      // For offline operations, we might want to queue them
      // For now, just show the message and return false
      return false;
    }

    setLoading(true);

    let lastError: any = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await operation();

        setLoading(false);

        if (showSuccessToast) {
          showSuccess(successMessage);
        }

        onSuccess?.(result);
        return true;

      } catch (error) {
        lastError = error;
        console.error(`Operation attempt ${attempt + 1} failed:`, error);

        // If this isn't the last attempt, wait before retrying
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    // All attempts failed
    setLoading(false);

    if (showErrorToast) {
      showError(errorMessage);
    }

    onError?.(lastError);
    return false;
  }, [isConnected, isInternetReachable, showSuccess, showError, showInfo]);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: Omit<AsyncOperationOptions, 'retryCount'> & { maxRetries?: number } = {}
  ): Promise<boolean> => {
    const { maxRetries = 2, ...restOptions } = options;
    return execute(operation, { ...restOptions, retryCount: maxRetries });
  }, [execute]);

  return {
    loading,
    execute,
    executeWithRetry,
  };
};