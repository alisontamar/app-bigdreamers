import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Gem, Check, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/colors';
import { User } from '@/types';
import { InterestType } from '@/services/supabase/investmentService';

interface AssignGemsModalProps {
  visible: boolean;
  user: User | null;
  onConfirm: (params: {
    gems: number;
    contractStartDate: string;
    contractEndDate: string;
    interestType: InterestType;
    interestRate: number;
  }) => void;
  onCancel: () => void;
  isDark: boolean;
  submitting?: boolean;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtDate(d: Date | null): string {
  if (!d) return 'Seleccionar';
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${m}/${d.getFullYear()}`;
}

const AssignGemsModal = ({ visible, user, onConfirm, onCancel, isDark, submitting = false }: AssignGemsModalProps) => {
  const [gems, setGems] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [interestType, setInterestType] = useState<InterestType | null>(null);
  const [interestRate, setInterestRate] = useState('');

  useEffect(() => {
    if (visible) {
      setGems('');
      setStartDate(null);
      setEndDate(null);
      setInterestType(null);
      setInterestRate('');
    }
  }, [visible]);

  const textMuted = isDark ? 'rgba(255,255,255,0.65)' : Colors.light.textMuted;
  const textPrimary = isDark ? Colors.text.primary : Colors.light.textPrimary;

  const inputStyle = {
    backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#F1F5F9',
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
    color: textPrimary,
  };

  const gemsValue = parseInt(gems, 10);
  const interestRateValue = parseFloat(interestRate.replace(',', '.'));

  const canConfirm =
    !isNaN(gemsValue) && gemsValue > 0 &&
    !!startDate && !!endDate && endDate.getTime() > startDate.getTime() &&
    !!interestType &&
    !isNaN(interestRateValue) && interestRateValue > 0;

  const handleConfirm = () => {
    if (!canConfirm || submitting || !startDate || !endDate || !interestType) return;
    onConfirm({
      gems: gemsValue,
      contractStartDate: toIsoDate(startDate),
      contractEndDate: toIsoDate(endDate),
      interestType,
      interestRate: interestRateValue,
    });
  };

  const dateBoxStyle = {
    ...inputStyle,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  };

  // Si el teclado está abierto (ej. escribiendo la tasa de interés) y se abre
  // el selector de fecha nativo al mismo tiempo, la pantalla queda "trabada"
  // a medio animar. Cerrando el teclado primero y dando un respiro antes de
  // mostrar el picker se evita el choque de animaciones.
  const openStartPicker = () => {
    Keyboard.dismiss();
    setTimeout(() => setShowStartPicker(true), 250);
  };
  const openEndPicker = () => {
    Keyboard.dismiss();
    setTimeout(() => setShowEndPicker(true), 250);
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View
          style={{
            backgroundColor: isDark ? Colors.navy?.[700] ?? '#1E3A5F' : '#fff',
            borderRadius: 24,
            padding: 28,
            maxHeight: '88%',
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Gem size={44} color={Colors.gold[400]} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary, textAlign: 'center' }}>
            Nuevo contrato de inversión
          </Text>
          <Text style={{ marginTop: 8, fontSize: 15, fontWeight: '700', color: Colors.gold[400], textAlign: 'center' }}>
            {user?.name ?? ''}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 4 }}>
            <Text style={{ marginTop: 18, fontSize: 12, fontWeight: '700', color: textMuted }}>
              GEMAS = MONTO DE INVERSIÓN (Bs)
            </Text>
            <TextInput
              placeholder="Ej: 14000"
              placeholderTextColor={textMuted}
              value={gems}
              onChangeText={(t) => setGems(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              editable={!submitting}
              className="rounded-xl border px-4 py-3.5 text-[16px] mt-2"
              style={inputStyle}
            />

            <Text style={{ marginTop: 18, fontSize: 12, fontWeight: '700', color: textMuted }}>
              TIEMPO DE CONTRATO
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Pressable onPress={openStartPicker} disabled={submitting} style={[{ flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 }, dateBoxStyle]}>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: textMuted }}>INICIO</Text>
                  <Text style={{ color: textPrimary, fontWeight: '600', marginTop: 2 }}>{fmtDate(startDate)}</Text>
                </View>
                <Calendar size={16} color={Colors.gold[400]} />
              </Pressable>
              <Pressable onPress={openEndPicker} disabled={submitting} style={[{ flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 }, dateBoxStyle]}>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: textMuted }}>FIN</Text>
                  <Text style={{ color: textPrimary, fontWeight: '600', marginTop: 2 }}>{fmtDate(endDate)}</Text>
                </View>
                <Calendar size={16} color={Colors.gold[400]} />
              </Pressable>
            </View>
            {showStartPicker && (
              <DateTimePicker
                value={startDate ?? new Date()}
                mode="date"
                display="default"
                onChange={(_event, date) => {
                  setShowStartPicker(false);
                  if (date) setStartDate(date);
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate ?? startDate ?? new Date()}
                mode="date"
                display="default"
                onChange={(_event, date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}

            <Text style={{ marginTop: 18, fontSize: 12, fontWeight: '700', color: textMuted }}>
              TIPO DE INTERÉS
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              {(['simple', 'compuesto'] as InterestType[]).map((type) => {
                const isSelected = interestType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setInterestType(type)}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: 'center',
                      backgroundColor: isSelected ? Colors.gold[400] : (isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'),
                    }}
                  >
                    <Text style={{ fontWeight: '700', color: isSelected ? '#000' : textMuted, textTransform: 'capitalize' }}>
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ marginTop: 18, fontSize: 12, fontWeight: '700', color: textMuted }}>
              TASA DE INTERÉS (%)
            </Text>
            <TextInput
              placeholder="Ej: 2.5"
              placeholderTextColor={textMuted}
              value={interestRate}
              onChangeText={(t) => setInterestRate(t.replace(/[^0-9.,]/g, ''))}
              keyboardType="decimal-pad"
              editable={!submitting}
              className="rounded-xl border px-4 py-3.5 text-[16px] mt-2"
              style={inputStyle}
            />
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
            <Pressable
              onPress={onCancel}
              disabled={submitting}
              style={{ flex: 1, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 14, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}
            >
              <Text style={{ color: textMuted }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={!canConfirm || submitting}
              style={{
                flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
                flexDirection: 'row', justifyContent: 'center',
                backgroundColor: canConfirm ? Colors.gold[400] : 'rgba(255,255,255,0.08)',
                opacity: canConfirm && !submitting ? 1 : 0.6,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Check size={16} color={canConfirm ? '#000' : textMuted} />
                  <Text style={{ color: canConfirm ? '#000' : textMuted, fontWeight: '800', marginLeft: 6 }}>Asignar</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AssignGemsModal;
