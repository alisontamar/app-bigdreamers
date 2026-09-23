import * as FileSystem from 'expo-file-system/legacy';
import { toByteArray } from 'base64-js';
import { getSupabaseClient } from '@/services/supabase/supabase';
import { LOGO_BASE64_PNG } from './logoBase64';
import { MORFEUS_BASE64_WEBP } from './morfeusBase64';
import { InterestType } from '@/services/supabase/investmentService';

export interface ReportPdfData {
  companyName?: string;
  investorName: string;
  reportDate: string;
  investmentAmount: number;
  interestRate: number;
  interestType: InterestType;
  contractStartDate: string;
  contractEndDate: string;
  updatedCapital: number;
  updatedProfit: number;
  nextMonthCapital?: number;
  observations?: string;
  receiptImageUrl?: string;
}

function fmtNumber(n: number): string {
  return n.toLocaleString('es-BO', { maximumFractionDigits: 2 });
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function interestTypeLabel(type: InterestType): string {
  return type === 'simple' ? 'Interés Simple' : 'Interés Compuesto';
}

const CALENDAR_ICON = `
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>`;
const CHECK_ICON = `
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`;
const CHAT_ICON = `
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>`;
const RECEIPT_ICON = `
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 3h16v18l-3-2-3 2-3-2-3 2-3-2-3 2Z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/>
  </svg>`;
const HEART_ICON = `
  <svg width="30" height="30" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"/>
  </svg>`;

export function buildReportHtml(data: ReportPdfData, logoDataUri: string, morfeusDataUri: string): string {
  const observationsLines = (data.observations || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const observationsHtml = observationsLines.map((l) => `<li>${l}</li>`).join('');

  const nextMonthHtml =
    data.nextMonthCapital != null
      ? `<li>capital a tomar en cuenta para el siguiente mes ${fmtNumber(data.nextMonthCapital)} Bs</li>`
      : '';

  const observationsItem =
    observationsHtml || nextMonthHtml
      ? `
    <div class="item">
      <div class="badge">${CHAT_ICON}</div>
      <p>Observaciones o informes pendientes :</p>
      <ul>${observationsHtml}${nextMonthHtml}</ul>
    </div>`
      : '';

  const receiptItem = data.receiptImageUrl
    ? `
    <div class="item">
      <div class="badge">${RECEIPT_ICON}</div>
      <p>Comprobante de la operación :</p>
      <div class="receipt-card">
        <img src="${data.receiptImageUrl}" />
      </div>
    </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, Helvetica, Arial, sans-serif;
    background: #1565C0;
    color: #fff;
    padding: 44px 40px 56px;
  }
  .logo-row { display: flex; align-items: center; gap: 14px; }
  .logo-row img { width: 60px; height: 60px; object-fit: contain; }
  .brand { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
  .brand-sub { font-size: 12px; letter-spacing: 5px; font-weight: 600; opacity: 0.92; margin-top: 4px; }
  .title { font-size: 42px; font-weight: 900; letter-spacing: 0.5px; margin: 30px 0 34px; text-transform: uppercase; }
  .timeline { position: relative; padding-left: 66px; }
  .timeline::before {
    content: ''; position: absolute; left: 25px; top: 4px; bottom: 4px; width: 2px;
    background: rgba(255,255,255,0.55);
  }
  .item { position: relative; margin-bottom: 32px; }
  .item:last-child { margin-bottom: 0; }
  .badge {
    position: absolute; left: -66px; top: -8px;
    width: 52px; height: 52px; border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #4FE0E8, #1D5FAE);
    border: 2px solid rgba(255,255,255,0.85);
    display: flex; align-items: center; justify-content: center;
  }
  .item p { font-size: 15px; line-height: 1.55; font-style: italic; }
  .item ul { margin: 4px 0 0 18px; font-size: 15px; font-style: italic; }
  .item li { margin-bottom: 2px; }
  .receipt-card {
    margin-top: 10px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.35);
    border-radius: 14px; padding: 10px; max-width: 320px;
  }
  .receipt-card img { width: 100%; max-height: 360px; object-fit: contain; border-radius: 8px; display: block; }
  .thanks {
    margin-top: 48px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.35);
    text-align: center;
  }
  .thanks .divider { display: flex; justify-content: center; margin-bottom: 14px; }
  .thanks h2 { font-size: 20px; font-weight: 800; letter-spacing: 0.3px; margin-bottom: 8px; }
  .thanks p { font-size: 13px; line-height: 1.6; opacity: 0.92; max-width: 480px; margin: 0 auto; font-style: italic; }
  .thanks .brand-mark { margin-top: 16px; font-size: 12px; letter-spacing: 3px; font-weight: 700; opacity: 0.8; }
  .morfeus { margin-top: 30px; text-align: center; }
  .morfeus img { max-width: 170px; width: 100%; object-fit: contain; }
</style>
</head>
<body>
  <div class="logo-row">
    <img src="${logoDataUri}" />
    <div>
      <div class="brand">BigDreamers</div>
      <div class="brand-sub">INVERSIONES</div>
    </div>
  </div>

  <div class="title">Reporte Mensual</div>

  <div class="timeline">
    <div class="item">
      <div class="badge">${CALENDAR_ICON}</div>
      <p>Inversionista : ${data.investorName}<br/>${data.companyName ? `Empresa : ${data.companyName}<br/>` : ''}fecha : ${fmtDate(data.reportDate)}</p>
    </div>
    <div class="item">
      <div class="badge">${CHECK_ICON}</div>
      <p>Monto de Inversión&nbsp;&nbsp;: ${fmtNumber(data.investmentAmount)} Bs<br/>${interestTypeLabel(data.interestType)}&nbsp;&nbsp;: ${data.interestRate}%<br/>Vigencia del contrato&nbsp;&nbsp;: ${fmtDate(data.contractStartDate)} — ${fmtDate(data.contractEndDate)}</p>
    </div>
    <div class="item">
      <div class="badge">${CHECK_ICON}</div>
      <p>Capital actualizado&nbsp;&nbsp;: ${fmtNumber(data.updatedCapital)} Bs<br/>Ganancia actualizado&nbsp;&nbsp;: ${fmtNumber(data.updatedProfit)} Bs</p>
    </div>
    ${observationsItem}
    ${receiptItem}
  </div>

  <div class="thanks">
    <div class="divider">${HEART_ICON}</div>
    <h2>¡Gracias por confiar en nosotros!</h2>
    <p>
      En BigDreamers Inversiones valoramos profundamente tu confianza. Seguimos
      trabajando con transparencia y compromiso para hacer crecer tu inversión
      mes a mes. Cualquier duda sobre este reporte, contáctanos con confianza.
    </p>
    <div class="brand-mark">BIGDREAMERS · INVERSIONES</div>
  </div>

  <div class="morfeus">
    <img src="${morfeusDataUri}" />
  </div>
</body>
</html>`;
}

export async function generateAndUploadReportPdf(
  data: ReportPdfData,
  userId: string
): Promise<{ pdfUrl: string; localUri: string }> {
  const { printToFileAsync } = await import('expo-print');
  const logoDataUri = `data:image/png;base64,${LOGO_BASE64_PNG}`;
  const morfeusDataUri = `data:image/webp;base64,${MORFEUS_BASE64_WEBP}`;

  const html = buildReportHtml(data, logoDataUri, morfeusDataUri);
  const { uri } = await printToFileAsync({ html, base64: false });

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const bytes = toByteArray(base64);
  const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.pdf`;

  const supabase = await getSupabaseClient();
  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(fileName, bytes, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('reports').getPublicUrl(fileName);
  return { pdfUrl: urlData.publicUrl, localUri: uri };
}
