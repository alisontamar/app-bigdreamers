import React, { useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { CheckCircle, Gem, Lock } from 'lucide-react-native';
import { useLearningModuleById } from '@/hooks/learning/useLearningModuleById';
import { useLessonsByModuleId } from '@/hooks/learning/useLessonsByModuleId';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserModuleProgress } from '@/hooks/learning/useUserModuleProgress';
import { useUserModuleUnlocks } from '@/hooks/learning/useUserModuleUnlocks';
import { useUnlockPremiumModule } from '@/hooks/learning/useUnlockPremiumModule';
import { useCurrentUser } from '@/hooks/user/useCurrentUser';
import { invalidateCachePattern, CacheKeys } from '@/services/cache/cacheService';
import { Colors } from '@/constants/colors';
import ButtonBackScreen from '@/components/shared/ButtonBackScreen';
import ModuleDetailHeader from '@/components/learn/ModuleDetailHeader';
import ModuleProgressSection from '@/components/learn/ModuleProgressSection';
import ModuleLessonList from '@/components/learn/ModuleLessonList';

interface Props {
  moduleId: string;
}

export default function ModuleDetail({ moduleId }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { module, loading, error } = useLearningModuleById(moduleId);
  const { lessons, loading: loadingLessons } = useLessonsByModuleId(moduleId);
  const { user } = useAuth();
  const { progress: userProgress, loading: progressLoading, refetch: refetchProgress } = useUserModuleProgress(user?.id ?? null, moduleId);
  const { unlockedModuleIds, loading: unlocksLoading, refetch: refetchUnlocks } = useUserModuleUnlocks(user?.id ?? null);
  const { unlock, loading: unlocking } = useUnlockPremiumModule();
  const { user: dbUser, refetch: refetchUser } = useCurrentUser(user?.id ?? null);
  const { isDark } = useTheme();

  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    if (userProgress !== undefined && initialLoad) setInitialLoad(false);
  }, [userProgress]);

  useFocusEffect(
    useCallback(() => {
      refetchProgress();
      refetchUnlocks();
    }, [moduleId])
  );
  const bg = isDark ? Colors.blue.primary : Colors.light.bg;
  const textMuted = isDark ? 'rgba(255,255,255,0.65)' : Colors.light.textMuted;
  const textPrimary = isDark ? '#FFFFFF' : Colors.light.textPrimary;

  if (loading || loadingLessons || initialLoad || unlocksLoading)  {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: bg }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.gold[400]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: bg }}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-bold text-center" style={{ color: textMuted }}>
            Ocurrió un error al cargar el módulo.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!module) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: bg }}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-bold text-center" style={{ color: textMuted }}>
            Módulo no encontrado.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isUnlocked = !module.isPremium || unlockedModuleIds.includes(moduleId);

  if (!isUnlocked) {
    const gems = dbUser?.gems ?? user?.gems ?? 0;
    const canAfford = gems >= module.gemsCost;

    const handleUnlock = async () => {
      if (!user?.id) return;
      try {
        await unlock(user.id, moduleId);
        invalidateCachePattern(CacheKeys.userModuleUnlocks(user.id));
        invalidateCachePattern(CacheKeys.currentUser(user.id));
        await Promise.all([refetchUnlocks(), refetchUser()]);
      } catch (e) {
        Alert.alert('No se pudo desbloquear', e instanceof Error ? e.message : 'Intenta nuevamente.');
      }
    };

    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: bg }} edges={['top']}>
        <View style={{ paddingTop: Math.max(8, insets.top > 0 ? 0 : 12), paddingHorizontal: 16, paddingBottom: 4 }}>
          <ButtonBackScreen redirectTo="/learn" />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View
            style={{
              width: 88, height: 88, borderRadius: 44,
              backgroundColor: 'rgba(255,215,64,0.18)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}
          >
            <Lock size={38} color={Colors.gold[400]} />
          </View>
          <Text className="text-xl font-black text-center" style={{ color: textPrimary }}>
            Curso premium
          </Text>
          <Text className="text-base font-bold text-center mt-2" style={{ color: textPrimary }}>
            {module.title}
          </Text>
          <View
            className="flex-row items-center mt-5"
            style={{
              gap: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
              borderRadius: 16, paddingVertical: 10, paddingHorizontal: 18,
            }}
          >
            <Gem size={18} color={Colors.gold[400]} />
            <Text className="text-base font-extrabold" style={{ color: textPrimary }}>
              {module.gemsCost.toLocaleString('es-BO')} gemas
            </Text>
          </View>
          <Text className="text-xs text-center mt-3" style={{ color: textMuted }}>
            Tu saldo: {gems.toLocaleString('es-BO')} gemas
          </Text>
          {!canAfford && (
            <Text className="text-sm font-bold text-center mt-3" style={{ color: Colors.error }}>
              Te faltan {(module.gemsCost - gems).toLocaleString('es-BO')} gemas para desbloquearlo.
            </Text>
          )}
          <Pressable
            onPress={handleUnlock}
            disabled={!canAfford || unlocking}
            className="mt-7 rounded-2xl py-4 px-10 items-center"
            style={{ backgroundColor: Colors.gold[400], opacity: !canAfford || unlocking ? 0.5 : 1 }}
          >
            {unlocking
              ? <ActivityIndicator color="#000" />
              : <Text className="font-extrabold text-sm" style={{ color: '#000' }}>Desbloquear</Text>}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Las lecciones "hechas" son las que ya existían cuando el usuario completó
  // el módulo (created_at <= completed_at). Si el admin agrega lecciones nuevas
  // después, esas quedan como faltantes y el módulo deja de estar completado.
  const totalLessons = lessons.length;
  const completedAt = userProgress?.completedAt;
  const completedLessons = completedAt
    ? lessons.filter((l) => new Date(l.createdAt) <= new Date(completedAt)).length
    : Math.floor(((userProgress?.progress ?? 0) / 100) * totalLessons);
  const isCompletelyCompleted = totalLessons > 0 && completedLessons >= totalLessons;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bg }} edges={['top']}>
      <View style={{ paddingTop: Math.max(8, insets.top > 0 ? 0 : 12), paddingHorizontal: 16, paddingBottom: 4 }}>
        <ButtonBackScreen redirectTo="/learn" />
      </View>

      {isCompletelyCompleted ? (
        <ScrollView
          className="px-4"
          contentContainerStyle={{ paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center py-16 px-6">
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: isDark ? 'rgba(22,163,74,0.15)' : '#DCFCE7',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <CheckCircle size={52} color={isDark ? '#4ADE80' : '#16A34A'} />
            </View>
            <Text
              className="text-2xl font-black text-center"
              style={{ color: isDark ? '#FFFFFF' : Colors.light.textPrimary }}
            >
              ¡Módulo completado!
            </Text>
            <Text
              className="text-base text-center mt-3 leading-6"
              style={{ color: textMuted }}
            >
              Ya completaste todas las lecciones de este módulo. Sigue avanzando con los siguientes módulos.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          className="px-4"
          contentContainerStyle={{ paddingBottom: 36, gap: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <ModuleDetailHeader
            title={module.title}
            description={module.description}
            category={module.category}
            difficulty={module.difficulty}
            gemsReward={module.gemsReward}
            isDark={isDark}
            thumbnail={module.thumbnail}
          />

          <ModuleProgressSection
            completedLessons={completedLessons}
            totalLessons={totalLessons}
            progress={progress}
            isDark={isDark}
          />

          <ModuleLessonList
            lessons={lessons}
            completedLessons={completedLessons}
            isDark={isDark}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
