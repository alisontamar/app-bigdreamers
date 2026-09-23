import { Modal, View, Text, Pressable } from 'react-native';
import { Gem } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

interface GemsReceivedModalProps {
  visible: boolean;
  gems: number;
  companyName?: string | null;
  onClose: () => void;
}

const GemsReceivedModal = ({ visible, gems, companyName, onClose }: GemsReceivedModalProps) => {
  const { isDark } = useTheme();
  const textPrimary = isDark ? Colors.text.primary : Colors.light.textPrimary;
  const textMuted = isDark ? 'rgba(255,255,255,0.65)' : Colors.light.textMuted;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
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
            <Gem size={36} color={Colors.gold[400]} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary, textAlign: 'center' }}>
            ¡Te recargaron {gems} gemas!
          </Text>
          <Text style={{ marginTop: 10, fontSize: 14, color: textMuted, textAlign: 'center', lineHeight: 20 }}>
            {companyName ? `Tu inversión en ${companyName} ya quedó registrada. ` : ''}
            Recibirás tu reporte próximamente.
          </Text>
          <Pressable
            onPress={onClose}
            style={{ marginTop: 22, backgroundColor: Colors.gold[400], borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32 }}
          >
            <Text style={{ color: '#000', fontWeight: '800' }}>¡Genial!</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default GemsReceivedModal;
