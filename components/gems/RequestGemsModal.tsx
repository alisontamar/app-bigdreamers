import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, ActivityIndicator, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { Gem, Check, MessageCircle, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useRequestGems } from '@/hooks/gem/useRequestGems';

const WHATSAPP_NUMBER = '59167548200';
const QUICK_AMOUNTS = [300, 800, 2000, 5000];

interface RequestGemsModalProps {
  visible: boolean;
  userId: string;
  userName?: string | null;
  isDark: boolean;
  onClose: () => void;
  onRequested?: () => void;
}

const RequestGemsModal = ({ visible, userId, userName, isDark, onClose, onRequested }: RequestGemsModalProps) => {
  const { request, loading } = useRequestGems();
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAmount(null);
      setCustomAmount('');
      setSent(false);
      setErrorMsg(null);
    }
  }, [visible]);

  const textPrimary = isDark ? Colors.text.primary : Colors.light.textPrimary;
  const textMuted = isDark ? 'rgba(255,255,255,0.65)' : Colors.light.textMuted;
  const inputStyle = {
    backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#F1F5F9',
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
    color: textPrimary,
  };

  const customAmountValue = parseInt(customAmount, 10);
  const gemsToRequest = customAmount ? customAmountValue : amount;
  const canRequest = !!gemsToRequest && gemsToRequest > 0;

  const handleSelectQuick = (value: number) => {
    setCustomAmount('');
    setAmount(value);
  };

  const handleConfirm = async () => {
    if (!canRequest || !gemsToRequest || loading) return;
    setErrorMsg(null);
    try {
      await request(userId, gemsToRequest);
      setSent(true);
      onRequested?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'No se pudo enviar la solicitud.');
    }
  };

  const handleWhatsApp = () => {
    const gemsText = gemsToRequest ? `${gemsToRequest} gemas` : 'gemas';
    const name = userName ? ` (soy ${userName})` : '';
    const message = `Hola, quiero solicitar ${gemsText} en BigDreamerss${name}.`;
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`);
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View
            style={{
              backgroundColor: isDark ? Colors.navy?.[700] ?? '#1E3A5F' : '#fff',
              borderRadius: 24,
              padding: 28,
            }}
          >
            {sent ? (
              <View style={{ alignItems: 'center' }}>
                <Clock size={48} color={Colors.gold[400]} />
                <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary, textAlign: 'center', marginTop: 16 }}>
                  Solicitud enviada
                </Text>
                <Text style={{ marginTop: 10, fontSize: 14, color: textMuted, textAlign: 'center', lineHeight: 20 }}>
                  Le avisamos al administrador que solicitaste {gemsToRequest} gemas. Te llegará una notificación cuando las asigne.
                </Text>
                <Pressable
                  onPress={onClose}
                  style={{ marginTop: 22, backgroundColor: Colors.gold[400], borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32 }}
                >
                  <Text style={{ color: '#000', fontWeight: '800' }}>¡Listo!</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={{ alignItems: 'center', marginBottom: 8 }}>
                  <Gem size={40} color={Colors.gold[400]} />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary, textAlign: 'center' }}>
                  Recargar gemas
                </Text>
                <Text style={{ marginTop: 6, fontSize: 13, color: textMuted, textAlign: 'center' }}>
                  Elige cuántas gemas quieres solicitar. El administrador revisará tu pedido y te las asignará.
                </Text>

                <Text style={{ marginTop: 20, fontSize: 12, fontWeight: '700', color: textMuted }}>
                  CANTIDAD
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {QUICK_AMOUNTS.map((value) => {
                    const isSelected = !customAmount && amount === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => handleSelectQuick(value)}
                        disabled={loading}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          backgroundColor: isSelected ? Colors.gold[400] : (isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'),
                        }}
                      >
                        <Text style={{ fontWeight: '700', color: isSelected ? '#000' : textPrimary }}>
                          {value.toLocaleString('es-BO')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={{ marginTop: 16, fontSize: 12, fontWeight: '700', color: textMuted }}>
                  U OTRA CANTIDAD
                </Text>
                <TextInput
                  placeholder="Ej: 1500"
                  placeholderTextColor={textMuted}
                  value={customAmount}
                  onChangeText={(t) => { setCustomAmount(t.replace(/[^0-9]/g, '')); setAmount(null); }}
                  keyboardType="number-pad"
                  editable={!loading}
                  className="rounded-xl border px-4 py-3.5 text-[16px] mt-2"
                  style={inputStyle}
                />

                {errorMsg && (
                  <Text style={{ marginTop: 12, fontSize: 13, color: Colors.error, textAlign: 'center' }}>
                    {errorMsg}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
                  <Pressable
                    onPress={handleClose}
                    disabled={loading}
                    style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }}
                  >
                    <Text style={{ color: textMuted, fontWeight: '700' }}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirm}
                    disabled={!canRequest || loading}
                    style={{
                      flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
                      flexDirection: 'row', justifyContent: 'center',
                      backgroundColor: canRequest ? Colors.gold[400] : (isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'),
                      opacity: canRequest && !loading ? 1 : 0.6,
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <>
                        <Check size={16} color={canRequest ? '#000' : textMuted} />
                        <Text style={{ color: canRequest ? '#000' : textMuted, fontWeight: '800', marginLeft: 6 }}>Solicitar</Text>
                      </>
                    )}
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleWhatsApp}
                  disabled={loading}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginTop: 12, borderRadius: 16, paddingVertical: 14,
                    backgroundColor: 'rgba(37,211,102,0.12)',
                  }}
                >
                  <MessageCircle size={18} color="#25D366" />
                  <Text style={{ color: '#25D366', fontWeight: '800' }}>Solicitar por WhatsApp</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RequestGemsModal;
