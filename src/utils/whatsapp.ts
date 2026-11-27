import { DimensionUnit } from '../types';
import { formatINR } from './pricing';

export interface WhatsAppQuoteParams {
  frameId: string;
  frameName: string;
  profileWidth: number;
  width: number;
  height: number;
  unit: DimensionUnit;
  matName: string;
  glazingName?: string;
  mountingName?: string;
  basePrice?: number;
  gstAmount?: number;
  estimatedPrice: number;
  customerName?: string;
  customerCity?: string;
  customerPin?: string;
  customerState?: string;
  shareUrl?: string;
  currency?: string;
}

export const DEFAULT_PLACEHOLDER_WHATSAPP = '919820000000';
export const DEFAULT_OFFICIAL_WHATSAPP = '918793242979';

/**
 * Returns sanitized WhatsApp recipient phone number from environment or official atelier line.
 * Default official atelier line: +91 87932 42979 (Sanskruti Arts Workshop).
 */
export function getWhatsAppNumber(): string {
  const envNumber = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WHATSAPP_NUMBER;
  const rawNumber = envNumber || DEFAULT_OFFICIAL_WHATSAPP;
  // Strip non-digits
  return String(rawNumber).replace(/\D/g, '');
}

/**
 * Returns true if production or current environment points at a placeholder or invalid WhatsApp number.
 */
export function isPlaceholderWhatsAppConfigured(): boolean {
  const digits = getWhatsAppNumber();
  return !digits || digits.length < 10 || digits === DEFAULT_PLACEHOLDER_WHATSAPP || /^0+$/.test(digits);
}

let prodWhatsAppWarnLogged = false;

/**
 * Logs an explicit console warning in production builds if VITE_WHATSAPP_NUMBER is missing or still placeholder.
 */
export function warnIfPlaceholderWhatsAppInProd(): void {
  const isProd = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.PROD);
  if (isProd && isPlaceholderWhatsAppConfigured() && !prodWhatsAppWarnLogged) {
    prodWhatsAppWarnLogged = true;
    console.warn(
      '[Sanskruti Arts] Production warning: VITE_WHATSAPP_NUMBER is unset or set to placeholder +91 98200 00000. Configure VITE_WHATSAPP_NUMBER before directing live customer traffic.'
    );
  }
}

/**
 * Formats official telephone line into standard Indian display format (+91 98200 00000).
 */
export function formatIndianDisplayPhone(phone?: string): string {
  const digits = (phone || getWhatsAppNumber()).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return `+${digits}`;
}

export const WHATSAPP_DISPLAY_PHONE = formatIndianDisplayPhone();

export function getIndianWhatsAppUrl(customText?: string): string {
  const phone = getWhatsAppNumber();
  const text = customText || 'Hello Sanskruti Arts, I am interested in your picture frame mouldings.';
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Formats a clean, structured quotation inquiry message for WhatsApp tailored for Indian customers.
 */
export function formatWhatsAppOrderText(params: WhatsAppQuoteParams): string {
  const priceDisplay = formatINR(params.estimatedPrice);
  const baseDisplay = params.basePrice ? formatINR(params.basePrice) : null;
  const gstDisplay = params.gstAmount ? formatINR(params.gstAmount) : null;

  return [
    `*Sanskruti Arts Atelier — Picture Frame Quotation Request*`,
    `----------------------------------------`,
    `*Moulding:* ${params.frameName} (#${params.frameId})`,
    `*Face Width:* ${params.profileWidth.toFixed(2)}" face (${(params.profileWidth * 25.4).toFixed(0)} mm)`,
    `*Artwork Opening:* ${params.width} × ${params.height} ${params.unit}`,
    `*Archival Mat:* ${params.matName}`,
    params.glazingName ? `*Conservation Glazing:* ${params.glazingName}` : null,
    params.mountingName ? `*Hanging Hardware:* ${params.mountingName}` : null,
    `----------------------------------------`,
    baseDisplay ? `*Base Subtotal:* ${baseDisplay}` : null,
    gstDisplay ? `*GST (18% HSN 4414):* ${gstDisplay}` : null,
    `*Estimated Total:* ${priceDisplay}`,
    `----------------------------------------`,
    params.customerName ? `*Client Name:* ${params.customerName}` : null,
    params.customerCity || params.customerPin ? `*Destination:* ${[params.customerCity, params.customerState, params.customerPin ? `PIN: ${params.customerPin}` : null].filter(Boolean).join(', ')}` : null,
    params.shareUrl ? `*Live Studio Spec:* ${params.shareUrl}` : null,
    `\nNamaste! Please advise on manufacturing schedule and insured transit to our delivery address.`
  ].filter(Boolean).join('\n');
}

/**
 * Generates the full WhatsApp click-to-chat URL.
 */
export function formatWhatsAppQuoteUrl(params: WhatsAppQuoteParams): string {
  const phone = getWhatsAppNumber();
  const text = formatWhatsAppOrderText(params);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
