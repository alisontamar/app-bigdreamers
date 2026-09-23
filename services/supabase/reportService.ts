import { getSupabaseClient } from './supabase';
import { InterestType } from './investmentService';

export interface InvestmentReport {
  id: string;
  userId: string;
  companyId: string | null;
  companyName: string | null;
  investorName: string;
  reportDate: string;
  investmentId: string | null;
  investmentAmount: number;
  interestRate: number;
  interestType: InterestType | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  updatedCapital: number;
  updatedProfit: number;
  nextMonthCapital: number | null;
  observations: string | null;
  receiptImageUrl: string | null;
  pdfUrl: string;
  createdBy: string;
  createdAt: string;
}

function mapReport(row: any): InvestmentReport {
  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,
    companyName: row.company_name,
    investorName: row.investor_name,
    reportDate: row.report_date,
    investmentId: row.investment_id,
    investmentAmount: row.investment_amount,
    interestRate: row.interest_rate,
    interestType: row.interest_type,
    contractStartDate: row.contract_start_date,
    contractEndDate: row.contract_end_date,
    updatedCapital: row.updated_capital,
    updatedProfit: row.updated_profit,
    nextMonthCapital: row.next_month_capital,
    observations: row.observations,
    receiptImageUrl: row.receipt_image_url,
    pdfUrl: row.pdf_url,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function createInvestmentReport(input: {
  userId: string;
  companyId?: string;
  companyName?: string;
  investorName: string;
  reportDate: string;
  investmentId?: string;
  investmentAmount: number;
  interestRate: number;
  interestType?: InterestType;
  contractStartDate?: string;
  contractEndDate?: string;
  updatedCapital: number;
  updatedProfit: number;
  nextMonthCapital?: number;
  observations?: string;
  receiptImageUrl?: string;
  pdfUrl: string;
  createdBy: string;
}): Promise<InvestmentReport> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('investment_reports')
    .insert({
      user_id: input.userId,
      company_id: input.companyId ?? null,
      company_name: input.companyName ?? null,
      investor_name: input.investorName,
      report_date: input.reportDate,
      investment_id: input.investmentId ?? null,
      investment_amount: input.investmentAmount,
      interest_rate: input.interestRate,
      interest_type: input.interestType ?? null,
      contract_start_date: input.contractStartDate ?? null,
      contract_end_date: input.contractEndDate ?? null,
      updated_capital: input.updatedCapital,
      updated_profit: input.updatedProfit,
      next_month_capital: input.nextMonthCapital ?? null,
      observations: input.observations ?? null,
      receipt_image_url: input.receiptImageUrl ?? null,
      pdf_url: input.pdfUrl,
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return mapReport(data);
}

export async function getReportsByUser(userId: string): Promise<InvestmentReport[]> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('investment_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapReport);
}

export async function getLatestReportForInvestment(investmentId: string): Promise<InvestmentReport | null> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('investment_reports')
    .select('*')
    .eq('investment_id', investmentId)
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapReport(data) : null;
}

export async function getAllReports(): Promise<InvestmentReport[]> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('investment_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapReport);
}
