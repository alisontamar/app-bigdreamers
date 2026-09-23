import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { getSupabaseClient } from '@/services/supabase/supabase';
import { createUser, getUserById } from '@/services/supabase/userService';
import { User } from '@/types';

export async function signInWithApple(): Promise<User> {
  const supabase = await getSupabaseClient();

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('No se recibió el token de identidad de Apple.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) throw error;

  const { user } = data;
  if (!user) throw new Error('No user found after Apple sign-in');
  if (!user.email) throw new Error('No email found for user');

  const existingUser = await getUserById(user.id);
  if (existingUser) return existingUser;

  // Apple solo entrega el nombre la primera vez que el usuario autoriza la
  // app; hay que capturarlo ahora porque en logins siguientes viene null.
  const givenName = credential.fullName?.givenName ?? '';
  const familyName = credential.fullName?.familyName ?? '';
  const name = `${givenName} ${familyName}`.trim() || user.email.split('@')[0] || 'User';

  return await createUser({
    id: user.id,
    name,
    email: user.email,
  });
}
