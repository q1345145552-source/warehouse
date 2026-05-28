'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '@/lib/api';

interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseApiReturn<T, B = undefined> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (body?: B) => Promise<T | null>;
  reset: () => void;
}

export function useApiGet<T>(path: string, options: UseApiOptions<T> = {}): UseApiReturn<T> {
  const { immediate = true, onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiGet<T>(path);
      setData(response.data);
      onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [path, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return { data, loading, error, execute, reset };
}

export function useApiPost<T, B = undefined>(path: string, options: UseApiOptions<T> = {}): UseApiReturn<T, B> {
  const { onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (body?: B) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiPost<T, B>(path, body);
      setData(response.data);
      onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [path, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

export function useApiPut<T, B = undefined>(path: string, options: UseApiOptions<T> = {}): UseApiReturn<T, B> {
  const { onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (body?: B) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiPut<T, B>(path, body as B);
      setData(response.data);
      onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [path, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}
