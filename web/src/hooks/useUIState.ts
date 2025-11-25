import React, { useState, useCallback } from 'react';
import { useMessage } from './useMessage';

// 通用 UI 状态 Hook
interface UseUIStateOptions {
  successMessage?: string;
  errorMessage?: string;
  showLoading?: boolean;
  showMessage?: boolean;
}

interface UIState {
  loading: boolean;
  error: Error | null;
}

export function useUIState(options: UseUIStateOptions = {}) {
  const [uiState, setUIState] = useState<UIState>({
    loading: false,
    error: null
  });

  const message = useMessage();

  const setLoading = useCallback((loading: boolean) => {
    setUIState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: Error | string | null) => {
    const errorObj = error ? (typeof error === 'string' ? new Error(error) : error) : null;
    setUIState(prev => ({ ...prev, error: errorObj }));
  }, []);

  const clearError = useCallback(() => {
    setUIState(prev => ({ ...prev, error: null }));
  }, []);

  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      showSuccess?: boolean;
      showError?: boolean;
    }
  ): Promise<T | null> => {
    const opts = { ...options, ...useUIState.defaultOptions, ...options };

    try {
      setLoading(true);
      setError(null);

      const result = await asyncFn();

      if (opts.showSuccess && opts.successMessage) {
        message.success(opts.successMessage);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      setError(errorMessage);

      if (opts.showError && opts.errorMessage) {
        message.error(opts.errorMessage);
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, message]);

  return {
    loading: uiState.loading,
    error: uiState.error,
    setLoading,
    setError,
    clearError,
    executeAsync
  };
}

// 设置默认选项
useUIState.defaultOptions = {
  successMessage: '操作成功',
  errorMessage: '操作失败',
  showLoading: true,
  showMessage: true
};

// 重试 Hook
export function useRetry<T>(
  asyncFn: () => Promise<T>,
  maxRetries: number = 3
) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const { loading, error, executeAsync } = useUIState();

  const retry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      message.error(`重试失败，已达到最大重试次数 ${maxRetries}`);
      return null;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      const result = await executeAsync(asyncFn);
      if (result !== null) {
        setRetryCount(0); // 成功后重置重试次数
      }
      return result;
    } finally {
      setIsRetrying(false);
    }
  }, [asyncFn, maxRetries, retryCount, executeAsync, message]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    retryCount,
    isRetrying,
    canRetry: retryCount < maxRetries,
    retry,
    reset,
    loading: loading || isRetrying,
    error
  };
}

// 防抖 Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 节流 Hook
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecution = React.useRef<number>(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastExecution.current >= delay) {
        setThrottledValue(value);
        lastExecution.current = Date.now();
      }
    }, delay - (Date.now() - lastExecution.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}

// 本地存储 Hook
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// 页面可见性 Hook
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

// 窗口大小 Hook
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  React.useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

// 在线状态 Hook
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// 异步操作状态 Hook
interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useAsyncOperation<T, P extends any[] = []>(
  asyncFn: (...params: P) => Promise<T>
) {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const execute = useCallback(async (...params: P): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await asyncFn(...params);
      setState({
        data: result,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
        lastUpdated: null
      });
      return null;
    }
  }, [asyncFn]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null
    });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
}

export default {
  useUIState,
  useRetry,
  useDebounce,
  useThrottle,
  useLocalStorage,
  usePageVisibility,
  useWindowSize,
  useOnlineStatus,
  useAsyncOperation
};