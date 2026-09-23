import { useCachedQuery } from '@/hooks/useCachedQuery';
import { getUserModuleUnlocks } from '@/services/supabase/learningService';
import { CacheKeys } from '@/services/cache/cacheService';

export function useUserModuleUnlocks(userId: string | null) {
  const { data, loading, error, refetch } = useCachedQuery<string[]>(
    userId ? CacheKeys.userModuleUnlocks(userId) : '',
    () => getUserModuleUnlocks(userId!),
    !!userId,
  );

  return { unlockedModuleIds: data || [], loading, error, refetch };
}
