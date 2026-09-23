import { useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Gem, Lock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

interface PremiumUnlockModalProps {
  visible: boolean;
  moduleTitle: string;
  gemsCost: number;
  userGems: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

const PremiumUnlockModal = ({ visible, moduleTitle, gemsCost, userGems, onConfirm, onClose }: PremiumUnlockModalProps) => {
  const { isDark } = useTheme();
  const [unlocking, setUnlocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textPrimary = isDark ? Colors.text.primary : Colors.light.textPrimary;
  const textMuted = isDark ? 'rgba(255,255,255,0.65)' : Colors.light.textMuted;
  const canAfford = userGems >= gemsCost;

  const handleConfirm = async () => {
    setErrorMsg(null);
    setUnlocking(true);
    try {
      await onConfirm();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'No se pudo desbloquear el curso.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleClose = () => {
    if (unlocking) return;
    setErrorMsg(null);
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View
          style={{
            backgroundColor: isDark ? Colors.navy?.[700] ?? '#1E3A5F' : '#fff',
            borderRadius: 24,
            padding: 28,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: 'rgba(255,215,64,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Lock size={32} color={Colors.gold[400]} />
          </View>

          <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary, textAlign: 'center' }}>
            Curso premium
          </Text>
          <Text style={{ marginTop: 6, fontSize: 14, color: textMuted, textAlign: 'center' }} numberOfLines={2}>
            {moduleTitle}
          </Text>

          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              marginTop: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
              borderRadius: 16, paddingVertical: 10, paddingHorizontal: 18,
            }}
          >
            <Gem size={18} color={Colors.gold[400]} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>
              {gemsCost.toLocaleString('es-BO')} gemas
            </Text>
          </View>

          <Text style={{ marginTop: 10, fontSize: 12, color: textMuted, textAlign: 'center' }}>
            Tu saldo: {userGems.toLocaleString('es-BO')} gemas
          </Text>

          {!canAfford && (
            <Text style={{ marginTop: 10, fontSize: 13, color: Colors.error, textAlign: 'center', fontWeight: '700' }}>
              Te faltan {(gemsCost - userGems).toLocaleString('es-BO')} gemas para desbloquearlo.
            </Text>
          )}

          {errorMsg && (
            <Text style={{ marginTop: 10, fontSize: 13, color: Colors.error, textAlign: 'center' }}>
              {errorMsg}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22, width: '100%' }}>
            <Pressable
              onPress={handleClose}
              disabled={unlocking}
              style={{
                flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
              }}
            >
              <Text style={{ color: textMuted, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={!canAfford || unlocking}
              style={{
                flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
                backgroundColor: Colors.gold[400],
                opacity: !canAfford || unlocking ? 0.5 : 1,
              }}
            >
              {unlocking
                ? <ActivityIndicator color="#000" />
                : <Text style={{ color: '#000', fontWeight: '800' }}>Desbloquear</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PremiumUnlockModal;
