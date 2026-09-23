import { useState, useCallback } from 'react';
import { requestGemsSimple } from '@/services/supabase/gemService';
import { invalidateCachePattern, CacheKeys } from '@/services/cache/cacheService';

export function useRequestGems() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const request = useCallback(async (userId: string, gems: number) => {
    setLoading(true);
    setError(null);

    try {
      const requestId = await requestGemsSimple(userId, gems);
      await invalidateCachePattern(CacheKeys.gemRequests().slice(0, -1));
      return requestId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
}
