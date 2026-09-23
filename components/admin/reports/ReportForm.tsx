import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Check, Search } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import { User } from '@/types';
import { InterestType } from '@/services/supabase/investmentService';
import { getLatestReportForInvestment } from '@/services/supabase/reportService';
import { useUserInvestments } from '@/hooks/investment/useUserInvestments';
import ButtonBackScreen from '@/components/shared/ButtonBackScreen';
import ImagePickerField from '@/components/shared/ImagePickerField';

interface ReportFormValues {
  userId: string;
  companyId?: string;
  companyName?: string;
  investorName: string;
  reportDate: string;
  investmentId: string;
  investmentAmount: number;
  interestRate: number;
  interestType: InterestType;
  contractStartDate: string;
  contractEndDate: string;
  updatedCapital: number;
  updatedProfit: number;
  nextMonthCapital?: number;
  observations?: string;
  receiptImageUri?: string;
}

interface ReportFormProps {
  users: User[];
  onSubmit: (values: ReportFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function round2(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

const ReportForm = ({ users, onSubmit, onCancel, submitting }: ReportFormProps) => {
  const { isDark } = useTheme();

  const [userQuery, setUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
  const [investorName, setInvestorName] = useState('');
  const [reportDate, setReportDate] = useState(todayIso());
  const [updatedCapital, setUpdatedCapital] = useState('');
  const [updatedProfit, setUpdatedProfit] = useState('');
  const [nextMonthCapital, setNextMonthCapital] = useState('');
  const [observations, setObservations] = useState('');
  const [receiptImageUri, setReceiptImageUri] = useState<string | null>(null);
  const [calculatingSuggestion, setCalculatingSuggestion] = useState(false);

  const { investments, loading: investmentsLoading } = useUserInvestments(selectedUser?.id ?? null);

  const contracts = useMemo(
    () => investments.filter((inv) => !!inv.interestType),
    [investments]
  );

  useEffect(() => {
    setSelectedInvestmentId(null);
  }, [selectedUser?.id]);

  const selectedInvestment = contracts.find((c) => c.id === selectedInvestmentId) ?? null;

  // Sugiere capital/ganancia/capital del siguiente mes según el contrato: usa
  // el cierre del último reporte de este mismo contrato como punto de partida
  // (o el monto de inversión si es el primer reporte), y aplica la tasa según
  // sea interés simple (siempre sobre el monto original) o compuesto (sobre
  // el capital acumulado). Los campos quedan editables por si el admin
  // necesita ajustarlos.
  useEffect(() => {
    if (!selectedInvestment) return;
    let cancelled = false;
    setCalculatingSuggestion(true);

    (async () => {
      try {
        const rate = selectedInvestment.interestRate ?? 0;
        const investmentAmount = selectedInvestment.gems;
        const latestReport = await getLatestReportForInvestment(selectedInvestment.id);

        const baseCapital = latestReport
          ? latestReport.nextMonthCapital ?? latestReport.updatedCapital + latestReport.updatedProfit
          : investmentAmount;

        const gain = selectedInvestment.interestType === 'simple'
          ? investmentAmount * (rate / 100)
          : baseCapital * (rate / 100);

        const nextCapital = baseCapital + gain;

        if (!cancelled) {
          setUpdatedCapital(round2(baseCapital));
          setUpdatedProfit(round2(gain));
          setNextMonthCapital(round2(nextCapital));
        }
      } catch (e) {
        console.error('[ReportForm] No se pudo calcular la sugerencia de capital/ganancia:', e);
      } finally {
        if (!cancelled) setCalculatingSuggestion(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedInvestmentId]);

  const textPrimary = isDark ? Colors.text.primary : Colors.light.textPrimary;
  const textMuted   = isDark ? 'rgba(255,255,255,0.65)' : Colors.light.textMuted;

  const inputStyle = {
    backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#F1F5F9',
    borderColor: isDark ? 'rgba(255,255,255,0)' : '#E2E8F0',
    color: textPrimary,
  };

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users.slice(0, 8);
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [users, userQuery]);

  const selectUser = (u: User) => {
    setSelectedUser(u);
    setUserQuery(u.name);
    if (!investorName.trim()) setInvestorName(u.name);
  };

  const toNumber = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return isNaN(n) ? undefined : n;
  };

  const updatedCapitalNum = toNumber(updatedCapital);
  const updatedProfitNum = toNumber(updatedProfit);
  const nextMonthCapitalNum = nextMonthCapital.trim() ? toNumber(nextMonthCapital) : undefined;

  const canSubmit =
    !!selectedUser &&
    !!selectedInvestment &&
    investorName.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(reportDate) &&
    updatedCapitalNum !== undefined &&
    updatedProfitNum !== undefined;

  const missingFields: string[] = [];
  if (!selectedUser) missingFields.push('elegir el inversionista');
  if (selectedUser && !selectedInvestment) missingFields.push('seleccionar un contrato de inversión (toca una tarjeta de la lista)');
  if (!investorName.trim()) missingFields.push('nombre del inversionista');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) missingFields.push('fecha válida (AAAA-MM-DD)');
  if (updatedCapitalNum === undefined) missingFields.push('capital actualizado');
  if (updatedProfitNum === undefined) missingFields.push('ganancia actualizada');

  const handlePickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para subir el comprobante.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setReceiptImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit || !selectedUser || !selectedInvestment) return;

    onSubmit({
      userId: selectedUser.id,
      companyId: selectedInvestment.companyId ?? undefined,
      companyName: selectedInvestment.companyName ?? undefined,
      investorName: investorName.trim(),
      reportDate,
      investmentId: selectedInvestment.id,
      investmentAmount: selectedInvestment.gems,
      interestRate: selectedInvestment.interestRate ?? 0,
      interestType: selectedInvestment.interestType as InterestType,
      contractStartDate: selectedInvestment.contractStartDate ?? '',
      contractEndDate: selectedInvestment.contractEndDate ?? '',
      updatedCapital: updatedCapitalNum!,
      updatedProfit: updatedProfitNum!,
      nextMonthCapital: nextMonthCapitalNum,
      observations: observations.trim() || undefined,
      receiptImageUri: receiptImageUri ?? undefined,
    });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: isDark ? Colors.blue.primary : Colors.light.bg }}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-6 pt-2">
          <ButtonBackScreen />
          <Text
            className="flex-1 text-center text-2xl font-bold mr-8"
            style={{ color: isDark ? '#FFFFFF' : Colors.text.primary }}
          >
            Nuevo Reporte
          </Text>
        </View>
        <View className="w-8 h-[3px] rounded-sm mb-5 -mt-3" style={{ backgroundColor: Colors.gold[400] }} />

        <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 8 }}>INVERSIONISTA (BUSCAR USUARIO)</Text>
        <View className="flex-row items-center rounded-xl border px-3 mb-2" style={inputStyle}>
          <Search size={16} color={textMuted} />
          <TextInput
            placeholder="Buscar por nombre o correo"
            placeholderTextColor={textMuted}
            value={userQuery}
            onChangeText={(t) => { setUserQuery(t); setSelectedUser(null); }}
            className="flex-1 py-3.5 px-2 text-[15px]"
            style={{ color: textPrimary }}
          />
        </View>
        {!selectedUser && userQuery.trim().length > 0 && (
          <View className="rounded-xl border mb-4 overflow-hidden" style={{ borderColor: inputStyle.borderColor }}>
            {filteredUsers.length === 0 ? (
              <Text className="px-4 py-3 text-sm" style={{ color: textMuted }}>Sin resultados</Text>
            ) : filteredUsers.map((u) => (
              <Pressable
                key={u.id}
                onPress={() => selectUser(u)}
                className="px-4 py-3 border-b"
                style={{ borderColor: inputStyle.borderColor }}
              >
                <Text style={{ color: textPrimary, fontWeight: '600' }}>{u.name}</Text>
                <Text style={{ color: textMuted, fontSize: 12 }}>{u.email}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {selectedUser && (
          <View className="flex-row items-center mb-4">
            <Check size={14} color="#4ADE80" />
            <Text style={{ color: '#4ADE80', marginLeft: 6, fontSize: 13, fontWeight: '600' }}>
              Usuario seleccionado: {selectedUser.name}
            </Text>
          </View>
        )}

        {selectedUser && (
          <>
            <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 8 }}>CONTRATO DE INVERSIÓN</Text>
            {investmentsLoading ? (
              <Text style={{ color: textMuted, fontSize: 13, marginBottom: 16 }}>Cargando contratos...</Text>
            ) : contracts.length === 0 ? (
              <Text style={{ color: textMuted, fontSize: 13, marginBottom: 16 }}>
                Este usuario no tiene contratos de inversión. Asígnale gemas primero desde la pestaña Usuarios.
              </Text>
            ) : (
              <View className="mb-4" style={{ gap: 8 }}>
                {contracts.map((c) => {
                  const isSelected = selectedInvestmentId === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setSelectedInvestmentId(c.id)}
                      className="rounded-xl border px-4 py-3"
                      style={{
                        borderColor: isSelected ? Colors.gold[400] : inputStyle.borderColor,
                        backgroundColor: isSelected ? 'rgba(212,175,55,0.12)' : inputStyle.backgroundColor,
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text style={{ color: textPrimary, fontWeight: '700' }}>{c.companyName ?? 'Contrato de inversión'}</Text>
                        {isSelected && <Check size={16} color={Colors.gold[400]} />}
                      </View>
                      <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }}>
                        {c.gems.toLocaleString('es-BO')} Bs · Interés {c.interestType} {c.interestRate}%
                      </Text>
                      <Text style={{ color: textMuted, fontSize: 12 }}>
                        Vigencia: {fmtDate(c.contractStartDate)} – {fmtDate(c.contractEndDate)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}

        <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 8 }}>NOMBRE DEL INVERSIONISTA (para el PDF)</Text>
        <TextInput
          placeholder="Nombre completo"
          placeholderTextColor={textMuted}
          value={investorName}
          onChangeText={setInvestorName}
          className="rounded-xl border px-4 py-3.5 text-[15px] mb-4"
          style={inputStyle}
        />

        <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 8 }}>FECHA (AAAA-MM-DD)</Text>
        <TextInput
          placeholder={todayIso()}
          placeholderTextColor={textMuted}
          value={reportDate}
          onChangeText={setReportDate}
          className="rounded-xl border px-4 py-3.5 text-[15px] mb-4"
          style={inputStyle}
        />

        {selectedInvestment && (
          <Text style={{ fontSize: 12, color: textMuted, marginBottom: 8, fontStyle: 'italic' }}>
            {calculatingSuggestion ? 'Calculando según el contrato...' : 'Calculado según el contrato — puedes ajustarlo si hace falta.'}
          </Text>
        )}

        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 8 }}>CAPITAL ACTUALIZADO (Bs)</Text>
            <TextInput
              placeholder="17921"
              placeholderTextColor={textMuted}
              value={updatedCapital}
              onChangeText={setUpdatedCapital}
              keyboardType="decimal-pad"
              className="rounded-xl border px-4 py-3.5 text-[15px]"
              style={inputStyle}
            />
          </View>
          <View className="flex-1">
            <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 8 }}>GANANCIA ACTUALIZADA (Bs)</Text>
            <TextInput
              placeholder="448"
              placeholderTextColor={textMuted}
              value={updatedProfit}
              onChangeText={setUpdatedProfit}
              keyboardType="decimal-pad"
              className="rounded-xl border px-4 py-3.5 text-[15px]"
              style={inputStyle}
            />
          </View>
        </View>

        <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 8 }}>CAPITAL PARA EL SIGUIENTE MES (Bs, opcional)</Text>
        <TextInput
          placeholder="18369"
          placeholderTextColor={textMuted}
          value={nextMonthCapital}
          onChangeText={setNextMonthCapital}
          keyboardType="decimal-pad"
          className="rounded-xl border px-4 py-3.5 text-[15px] mb-4"
          style={inputStyle}
        />

        <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 8 }}>OBSERVACIONES (una por línea, opcional)</Text>
        <TextInput
          placeholder={'formato interés compuesto\ncapital a tomar en cuenta...'}
          placeholderTextColor={textMuted}
          value={observations}
          onChangeText={setObservations}
          multiline
          numberOfLines={4}
          className="rounded-xl border px-4 py-3.5 text-[15px] mb-6"
          style={[inputStyle, { textAlignVertical: 'top', minHeight: 100 }]}
        />

        <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 8 }}>COMPROBANTE (opcional)</Text>
        <View className="mb-6">
          <ImagePickerField
            isDark={isDark}
            imageUri={receiptImageUri}
            onPick={handlePickReceipt}
            onRemove={() => setReceiptImageUri(null)}
            variant="receipt"
          />
        </View>

        {!canSubmit && missingFields.length > 0 && (
          <View
            className="rounded-xl px-4 py-3 mb-4"
            style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' }}
          >
            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
              Falta completar:
            </Text>
            {missingFields.map((f) => (
              <Text key={f} style={{ color: '#EF4444', fontSize: 12 }}>• {f}</Text>
            ))}
          </View>
        )}

        <View className="flex-row gap-3">
          <Pressable
            onPress={onCancel}
            className="flex-1 rounded-2xl py-4 items-center border"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0' }}
          >
            <Text style={{ color: textMuted, fontWeight: '700' }}>Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex-1 rounded-2xl py-4 items-center"
            style={{ backgroundColor: Colors.gold[400], opacity: canSubmit && !submitting ? 1 : 0.5 }}
          >
            <Text style={{ color: '#000', fontWeight: '800' }}>
              {submitting ? 'Generando...' : 'Generar PDF'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ReportForm;
export type { ReportFormValues };
