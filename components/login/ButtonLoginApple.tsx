import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithApple } from '@/services/supabase/appleService';
import { useRouter } from 'expo-router';

export default function ButtonLoginApple() {
  const { isDark } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  const handleLogin = async () => {
    try {
      const user = await signInWithApple();
      login(user);
      router.replace('/onboarding');
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') return;
      console.error('Error logging in with Apple:', error);
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={isDark
        ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
        : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={22}
      style={{ width: 230, height: 44, marginTop: 16 }}
      onPress={handleLogin}
    />
  );
}
