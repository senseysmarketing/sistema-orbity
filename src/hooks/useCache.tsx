import { useState, useCallback } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean;
}

export function useCache<T>(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
  const [cache, setCache] = useState<Map<string, CacheItem<T>>>(new Map());

  const set = useCallback((key: string, data: T, options?: CacheOptions) => {
    const ttl = options?.ttl || defaultTTL;
    const now = Date.now();
    
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + ttl
      });
      return newCache;
    });
  }, [defaultTTL]);

  const get = useCallback((key: string): { data: T | null; isStale: boolean; exists: boolean } => {
    const item = cache.get(key);
    if (!item) {
      return { data: null, isStale: false, exists: false };
    }

    const now = Date.now();
    const isExpired = now > item.expiresAt;
    const isStale = now > (item.timestamp + (defaultTTL * 0.7)); // Consider stale at 70% of TTL

    if (isExpired) {
      // Remove expired item
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(key);
        return newCache;
      });
      return { data: null, isStale: false, exists: false };
    }

    return { data: item.data, isStale, exists: true };
  }, [cache, defaultTTL]);

  const remove = useCallback((key: string) => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(key);
      return newCache;
    });
  }, []);

  const clear = useCallback(() => {
    setCache(new Map());
  }, []);

  const has = useCallback((key: string): boolean => {
    const { exists } = get(key);
    return exists;
  }, [get]);

  return { set, get, remove, clear, has };
}