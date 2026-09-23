import { useState, useCallback } from 'react';
import { unlockPremiumModule } from '@/services/supabase/learningService';

export function useUnlockPremiumModule() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const unlock = useCallback(async (userId: string, moduleId: string) => {
    setLoading(true);
    setError(null);

    try {
      await unlockPremiumModule(userId, moduleId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { unlock, loading, error };
}
