import {
  QuotationSnapshot,
  getQuotationStatusLabel,
  validateQuotationSnapshot,
} from '../types/quotation';
import { formatINR } from './pricing';
import { getWhatsAppNumber } from './whatsapp';

export const MAX_WHATSAPP_URL_LENGTH = 2000;

export interface WhatsAppPhoneValidation {
  valid: boolean;
  digits: string;
  error?: string;
}

/**
 * Validates the destination WhatsApp business phone number before building a deep link.
 */
export function validateWhatsAppDestination(phoneOverride?: string): WhatsAppPhoneValidation {
  const raw = phoneOverride !== undefined ? phoneOverride : getWhatsAppNumber();
  const digits = (raw || '').replace(/\D/g, '');

  if (!digits || digits.length < 10 || digits.length > 15) {
    return {
      valid: false,
      digits,
      error: 'Workshop WhatsApp number is missing or invalid. Please check configuration.',
    };
  }

  // Reject degenerate repeated zeroes like 0000000000
  if (/^0+$/.test(digits)) {
    return {
      valid: false,
      digits,
      error: 'Destination WhatsApp number cannot be all zeroes.',
    };
  }

  return { valid: true, digits };
}

/**
 * Formats an exact, structured WhatsApp quotation enquiry message directly from a saved QuotationSnapshot.
 * Strictly reads frozen snapshot specifications and pricing—never recalculates prices.
 */
export function formatQuotationWhatsAppMessage(
  snapshot: QuotationSnapshot,
  options: { compact?: boolean } = {}
): string {
  const validation = validateQuotationSnapshot(snapshot);
  if (!validation.valid) {
    throw new Error(`Invalid quotation snapshot: ${validation.errors.join(', ')}`);
  }

  const { specifications: spec, pricing, customer } = snapshot;
  const compact = Boolean(options.compact);

  const formattedDate = new Date(snapshot.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const matText =
    spec.matId === 'mat-none'
      ? 'Full Bleed (No Mat)'
      : `${spec.matName} (${spec.matBorderWidth}" border)`;

  const glazingDeltaText =
    pricing.glazingDelta > 0
      ? `+${formatINR(pricing.glazingDelta)}`
      : pricing.glazingDelta < 0
      ? `-${formatINR(Math.abs(pricing.glazingDelta))}`
      : 'Included (₹0)';

  const destinationParts = [
    customer.city?.trim(),
    customer.state?.trim(),
    customer.postalCode?.trim() ? `PIN ${customer.postalCode.trim()}` : null,
  ].filter(Boolean);

  const truncatedNotes =
    !compact && customer.notes?.trim()
      ? customer.notes.trim().slice(0, 140)
      : null;

  const lines: (string | null)[] = [
    `Namaste Sanskruti Arts Atelier,`,
    `I would like to send a custom framing quotation enquiry.`,
    ``,
    `*Quotation Reference*`,
    `Ref: #${snapshot.quotationNumber}`,
    `Date: ${formattedDate}`,
    `Estimate Status: ${getQuotationStatusLabel(snapshot.status)}`,
    ``,
    `*Frame Specifications*`,
    `Moulding: ${spec.frameName} (SKU: ${spec.frameId})`,
    `Dimensions: ${spec.width} × ${spec.height} ${spec.unit} (Outer: ${spec.finishedOuterWidth.toFixed(2)} × ${spec.finishedOuterHeight.toFixed(2)} ${spec.unit})`,
    `Matboard: ${matText}`,
    `Artwork: ${spec.artworkTitle} (${spec.artworkFit === 'fit' ? 'Contain' : 'Cover'})`,
    `Glazing: ${spec.glazingName}`,
    `Mounting: ${spec.mountingName}`,
    ``,
    `*Financial Summary (INR)*`,
    `Moulding (${pricing.linearFeet.toFixed(1)} ft): ${formatINR(pricing.mouldingCost)}`,
    `Matboard: ${pricing.matCost === 0 ? '₹0' : formatINR(pricing.matCost)}`,
    `Glass & Assembly: ${formatINR(pricing.assemblyCost)}`,
    `Glazing Adjustment: ${glazingDeltaText}`,
    `Taxable Subtotal: ${pricing.formattedSubtotal}`,
    `GST — Provisional Estimate (${Math.round(pricing.gstRate * 100)}%): ${pricing.formattedGst}`,
    `Delivery: To be confirmed by workshop (Excluded)`,
    `*Estimated Total (Excl. Delivery): ${pricing.formattedTotal}*`,
    ``,
    `*Customer Details*`,
    customer.fullName?.trim() ? `Name: ${customer.fullName.trim()}` : null,
    customer.phone?.trim() ? `Mobile: ${customer.phone.trim()}` : null,
    !compact && customer.email?.trim() ? `Email: ${customer.email.trim()}` : null,
    customer.addressLine1?.trim() ? `Address: ${customer.addressLine1.trim()}` : null,
    destinationParts.length > 0 ? `Destination: ${destinationParts.join(', ')}` : null,
    truncatedNotes ? `Notes: ${truncatedNotes}` : null,
    ``,
    `*Disclosures:* GST shown is a provisional estimate subject to workshop confirmation. Delivery is excluded and will be confirmed by Sanskruti Arts. This is an enquiry, not a confirmed order.`,
  ];

  return lines.filter((line) => line !== null).join('\n');
}

export interface WhatsAppHandoffResult {
  ok: boolean;
  url: string | null;
  message: string | null;
  usedCompactFallback: boolean;
  error?: string;
}

/**
 * Validates both snapshot and destination phone, generates the message directly
 * from the saved snapshot, encodes for WhatsApp, and verifies URL length bounds.
 */
export function buildQuotationWhatsAppHandoff(
  snapshot: QuotationSnapshot | null | undefined,
  recipientPhoneOverride?: string
): WhatsAppHandoffResult {
  if (!snapshot) {
    return {
      ok: false,
      url: null,
      message: null,
      usedCompactFallback: false,
      error: 'No saved quotation snapshot is available for enquiry.',
    };
  }

  const snapCheck = validateQuotationSnapshot(snapshot);
  if (!snapCheck.valid) {
    return {
      ok: false,
      url: null,
      message: null,
      usedCompactFallback: false,
      error: `Cannot generate WhatsApp enquiry from an invalid quotation snapshot (${snapCheck.errors.join(', ')}).`,
    };
  }

  const phoneCheck = validateWhatsAppDestination(recipientPhoneOverride);
  if (!phoneCheck.valid) {
    return {
      ok: false,
      url: null,
      message: null,
      usedCompactFallback: false,
      error: phoneCheck.error || 'Invalid workshop WhatsApp destination number.',
    };
  }

  let usedCompactFallback = false;
  let message = formatQuotationWhatsAppMessage(snapshot, { compact: false });
  let url = `https://wa.me/${phoneCheck.digits}?text=${encodeURIComponent(message)}`;

  if (url.length > MAX_WHATSAPP_URL_LENGTH) {
    usedCompactFallback = true;
    message = formatQuotationWhatsAppMessage(snapshot, { compact: true });
    url = `https://wa.me/${phoneCheck.digits}?text=${encodeURIComponent(message)}`;
  }

  if (url.length > MAX_WHATSAPP_URL_LENGTH) {
    return {
      ok: false,
      url: null,
      message,
      usedCompactFallback,
      error: 'Generated WhatsApp enquiry URL exceeds safe browser URL limits. Please shorten address or notes.',
    };
  }

  return {
    ok: true,
    url,
    message,
    usedCompactFallback,
  };
}
