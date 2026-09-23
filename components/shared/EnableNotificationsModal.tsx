import { Modal, View, Text, Pressable } from 'react-native';
import { BellRing } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

interface EnableNotificationsModalProps {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

const EnableNotificationsModal = ({ visible, onEnable, onDismiss }: EnableNotificationsModalProps) => {
  const { isDark } = useTheme();
  const textPrimary = isDark ? Colors.text.primary : Colors.light.textPrimary;
  const textMuted = isDark ? 'rgba(255,255,255,0.65)' : Colors.light.textMuted;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
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
            <BellRing size={34} color={Colors.gold[400]} />
          </View>
          <Text style={{ fontSize: 19, fontWeight: '800', color: textPrimary, textAlign: 'center' }}>
            Activa tus notificaciones
          </Text>
          <Text style={{ marginTop: 10, fontSize: 14, color: textMuted, textAlign: 'center', lineHeight: 20 }}>
            No te pierdas cuando te asignen gemas, se genere tu reporte, o haya nuevos cursos y empresas.
          </Text>
          <Pressable
            onPress={onEnable}
            style={{ marginTop: 22, backgroundColor: Colors.gold[400], borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' }}
          >
            <Text style={{ color: '#000', fontWeight: '800' }}>Activar notificaciones</Text>
          </Pressable>
          <Pressable onPress={onDismiss} style={{ marginTop: 12, paddingVertical: 8 }}>
            <Text style={{ color: textMuted, fontWeight: '600' }}>Ahora no</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default EnableNotificationsModal;
