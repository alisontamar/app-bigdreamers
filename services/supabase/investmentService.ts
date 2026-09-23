import { getSupabaseClient } from './supabase';

export type InterestType = 'simple' | 'compuesto';

export interface Investment {
  id: string;
  companyId: string | null;
  companyName: string | null;
  gems: number;
  contractStartDate: string | null;
  contractEndDate: string | null;
  interestType: InterestType | null;
  interestRate: number | null;
  createdAt: string;
}

function mapInvestment(row: any): Investment {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    gems: row.gems,
    contractStartDate: row.contract_start_date,
    contractEndDate: row.contract_end_date,
    interestType: row.interest_type,
    interestRate: row.interest_rate,
    createdAt: row.created_at,
  };
}

export async function createInvestment(input: {
  userId: string;
  companyId?: string;
  companyName?: string;
  gems: number;
  contractStartDate?: string;
  contractEndDate?: string;
  interestType?: InterestType;
  interestRate?: number;
}): Promise<Investment> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('investments')
    .insert({
      user_id: input.userId,
      company_id: input.companyId ?? null,
      company_name: input.companyName ?? null,
      gems: input.gems,
      contract_start_date: input.contractStartDate ?? null,
      contract_end_date: input.contractEndDate ?? null,
      interest_type: input.interestType ?? null,
      interest_rate: input.interestRate ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapInvestment(data);
}

export async function getUserInvestments(userId: string): Promise<Investment[]> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapInvestment);
}

export interface ExpiringContract {
  investmentId: string;
  userId: string;
  userName: string;
  companyName: string | null;
  gems: number;
  contractEndDate: string;
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Contratos por vencer dentro de `withinDays` días (no incluye los que ya
// vencieron), con el nombre del usuario ya incluido (para la pantalla de
// "contratos por vencer" del admin). Se calcula en vivo, no depende de los
// avisos ya enviados.
export async function getExpiringContracts(withinDays: number = 5): Promise<ExpiringContract[]> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('investments')
    .select('id, user_id, company_name, gems, contract_end_date, users(name)')
    .not('interest_type', 'is', null)
    .not('contract_end_date', 'is', null)
    .gte('contract_end_date', addDaysIso(0))
    .lte('contract_end_date', addDaysIso(withinDays))
    .order('contract_end_date', { ascending: true });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    investmentId: row.id,
    userId: row.user_id,
    userName: row.users?.name ?? 'Usuario',
    companyName: row.company_name,
    gems: row.gems,
    contractEndDate: row.contract_end_date,
  }));
}
