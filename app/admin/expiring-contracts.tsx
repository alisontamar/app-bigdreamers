import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/colors';
import ButtonBackScreen from '@/components/shared/ButtonBackScreen';
import { getExpiringContracts, ExpiringContract } from '@/services/supabase/investmentService';

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function ExpiringContractsScreen() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [contracts, setContracts] = useState<ExpiringContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await getExpiringContracts();
      setContracts(data);
    } catch (e) {
      console.error('[ExpiringContracts] No se pudo cargar la lista:', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  };

  const bg          = isDark ? Colors.blue.primary : Colors.light.bg;
  const textPrimary = isDark ? Colors.text.primary : Colors.light.textPrimary;
  const textMuted   = isDark ? 'rgba(255,255,255,0.65)' : Colors.light.textMuted;
  const cardBg      = isDark ? 'rgba(255,255,255,0.05)' : Colors.light.card;
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  const handlePress = (c: ExpiringContract) => {
    router.push({ pathname: '/admin', params: { assignGemsUserId: c.userId } });
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bg }}>
      <View className="flex-row items-center px-2 pb-2 pt-2">
        <ButtonBackScreen />
        <Text className="flex-1 text-center text-[17px] font-bold mr-8" style={{ color: textPrimary }}>
          Contratos por vencer
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.gold[400]} />
        </View>
      ) : (
        <FlatList
          data={contracts}
          keyExtractor={(item) => item.investmentId}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold[400]} colors={[Colors.gold[400]]} />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Clock size={40} color={textMuted} />
              <Text className="text-center mt-3" style={{ color: textMuted }}>
                No hay contratos por vencer en los próximos días.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const days = daysUntil(item.contractEndDate);
            const dueLabel = days < 0
              ? `Venció hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`
              : days === 0
                ? 'Vence hoy'
                : `Vence en ${days} día${days === 1 ? '' : 's'}`;
            const dueColor = days <= 0 ? '#EF4444' : Colors.gold[500];

            return (
              <Pressable
                onPress={() => handlePress(item)}
                className="rounded-2xl p-4"
                style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}
              >
                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 15 }}>{item.userName}</Text>
                <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }}>
                  {item.companyName ? `${item.companyName} · ` : ''}{item.gems.toLocaleString('es-BO')} Bs
                </Text>
                <Text style={{ color: dueColor, fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                  {dueLabel} ({fmtDate(item.contractEndDate)})
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
