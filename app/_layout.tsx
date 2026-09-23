import '../global.css';
import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Image, Animated, Easing, StyleSheet, Linking } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { UserAvatarProvider, useUserAvatar } from '@/contexts/UserAvatarContext';
import { Colors } from '@/constants/colors';
import { IMAGES } from '@/constants/images';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import GemsReceivedModal from '@/components/shared/GemsReceivedModal';
import EnableNotificationsModal from '@/components/shared/EnableNotificationsModal';
import {
  registerForPushNotifications,
  savePushToken,
  setupNotificationHandler,
  getNotificationsModule,
  hasNotificationPermission,
} from '@/services/notifications/notificationService';

SplashScreen.preventAutoHideAsync();

function LoadingScreen() {
  const { isDark } = useTheme();
  const bounce = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -12, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: isDark ? Colors.blue.primary : Colors.light.bg }}
    >
      <Animated.View style={{ opacity: fade, transform: [{ translateY: bounce }] }} className="items-center">
        <Image
          source={IMAGES.BUHO}
          style={{ width: 240, height: 201 }}
          resizeMode="contain"
        />
        <ActivityIndicator
          size="large"
          color={Colors.gold[400]}
          style={{ marginTop: 24 }}
        />
      </Animated.View>
    </View>
  );
}

function AppContent() {
  const { isDark } = useTheme();
  const { isLoggedIn, isLoading, onboardingDone, user } = useAuth();
  const { setAvatarUrl } = useUserAvatar();
  const router = useRouter();
  const segments = useSegments();
  const [gemsModal, setGemsModal] = useState<{ gems: number; companyName: string | null } | null>(null);
  const [showEnableNotifications, setShowEnableNotifications] = useState(false);
  const handledInitialResponse = useRef(false);

  useEffect(() => {
    setAvatarUrl(user?.avatar ?? null);
  }, [user?.avatar, setAvatarUrl]);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    registerForPushNotifications()
      .then((token) => { if (token) savePushToken(user.id, token); })
      .catch(() => {});
  }, [isLoggedIn, user?.id]);

  // Si el usuario todavía no activó las notificaciones, se lo recordamos cada
  // vez que vuelve a entrar a la app (no solo la primera vez).
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    hasNotificationPermission()
      .then((granted) => { if (!granted) setShowEnableNotifications(true); })
      .catch(() => {});
  }, [isLoggedIn, user?.id]);

  const handleEnableNotifications = async () => {
    setShowEnableNotifications(false);
    const token = await registerForPushNotifications();
    if (token && user?.id) {
      await savePushToken(user.id, token);
    } else {
      Linking.openSettings();
    }
  };

  // Qué hacer cuando el usuario toca una notificación push (app en segundo
  // plano o cerrada): si es de un reporte, abre el PDF; si es de gemas,
  // muestra una ventanita de aviso en vez de dejarlo sin reacción visible.
  useEffect(() => {
    if (!isLoggedIn) return;

    let subscription: { remove: () => void } | undefined;

    const handleResponse = (response: any) => {
      const data = response?.notification?.request?.content?.data ?? {};
      if (data.type === 'gems_assigned') {
        setGemsModal({ gems: Number(data.gems) || 0, companyName: data.companyName ?? null });
      } else if (data.type === 'report_generated' && data.pdfUrl) {
        Linking.openURL(data.pdfUrl);
      } else if (data.type === 'course_published' && data.moduleId) {
        router.push(`/module/${data.moduleId}` as any);
      } else if (data.type === 'company_published' && data.companyId) {
        router.push(`/company/${data.companyId}` as any);
      } else if (data.type === 'admin_contracts_alert') {
        router.push('/admin/expiring-contracts' as any);
      } else if (data.type === 'report_generated' || data.type === 'contract_expiring_soon' || data.type === 'contract_expired') {
        router.push('/notifications' as any);
      }
    };

    (async () => {
      const Notifications = await getNotificationsModule();
      if (!Notifications) return;

      if (!handledInitialResponse.current) {
        handledInitialResponse.current = true;
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last) handleResponse(last);
      }

      subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    })();

    return () => subscription?.remove();
  }, [isLoggedIn, router]);

  // Auth gate: redirige imperativamente según el estado de sesión.
  // Las <Stack.Screen> NO redirigen por sí solas: en el APK la ruta inicial
  // resuelve a (tabs)/index, por eso hay que forzar la navegación aquí.
  useEffect(() => {
    // Esperar a que termine la restauración de sesión...
    if (isLoading) return;
    // ...y a conocer el estado de onboarding cuando hay sesión.
    if (isLoggedIn && onboardingDone === null) return;

    const root = segments[0];
    const inLogin = root === 'login';
    const inOnboarding = root === 'onboarding';
    // La pantalla de callback de OAuth procesa el login: no la toques.
    const inAuthCallback = root === 'auth';

    if (inAuthCallback) return;

    if (!isLoggedIn) {
      if (!inLogin) router.replace('/login');
    } else if (!onboardingDone) {
      if (!inOnboarding) router.replace('/onboarding');
    } else if (inLogin || inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isLoading, isLoggedIn, onboardingDone, segments, router]);

  const showLoading = isLoading || (isLoggedIn && onboardingDone === null);

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="company/[id]" />
        <Stack.Screen name="+not-found" />
      </Stack>
      {showLoading && (
        <View style={StyleSheet.absoluteFill}>
          <LoadingScreen />
        </View>
      )}
      <GemsReceivedModal
        visible={!!gemsModal}
        gems={gemsModal?.gems ?? 0}
        companyName={gemsModal?.companyName ?? null}
        onClose={() => setGemsModal(null)}
      />
      <EnableNotificationsModal
        visible={showEnableNotifications}
        onEnable={handleEnableNotifications}
        onDismiss={() => setShowEnableNotifications(false)}
      />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  return (
    <AuthProvider>
      <ThemeProvider>
        <UserAvatarProvider>
          <AppContent />
        </UserAvatarProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}