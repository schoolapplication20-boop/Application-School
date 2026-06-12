import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const CACHE_PREFIX = 'cache:';

/**
 * GETs `url` (or, if given an array, tries each URL in turn until one succeeds — useful
 * for endpoints with a role-based fallback), caching the unwrapped response payload
 * (res.data.data ?? res.data) in AsyncStorage so the last-known data renders immediately
 * on slow or offline connections.
 * Returns `isOffline: true` when the network request(s) failed (cached data, if any, is shown instead).
 */
export default function useCachedFetch(url, params) {
  const urls = Array.isArray(url) ? url : [url];
  const cacheKey = CACHE_PREFIX + urls[0] + (params ? '?' + JSON.stringify(params) : '');
  const urlsKey = urls.join('|');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached != null) setData(JSON.parse(cached));
    } catch {
      // ignore cache read errors
    }

    let succeeded = false;
    for (const u of urls) {
      try {
        const res = await api.get(u, params ? { params } : undefined);
        const result = res.data?.data ?? res.data;
        setData(result);
        setIsOffline(false);
        AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
        succeeded = true;
        break;
      } catch {
        // try the next URL, if any
      }
    }
    if (!succeeded) setIsOffline(true);
    setLoading(false);
  }, [urlsKey, cacheKey]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, isOffline, reload: load };
}
