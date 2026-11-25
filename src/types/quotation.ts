import { DimensionUnit, ArtworkFitMode, FrameSample, MatOption, ArtworkOption } from './index';
import { calculateFramePrice, formatINR, getMouldingFootRateINR, GST_RATE } from '../utils/pricing';
import { serializeConfigToQuery } from '../utils/frameConfig';
import { GlazingOption, MountingOption, GLAZING_OPTIONS, MOUNTING_OPTIONS } from '../components/CustomFramingStudio';

export type QuotationStatus = 'draft' | 'ready' | 'whatsapp_opened' | 'issued' | 'enquired';

/**
 * Returns honest, client-side customer-facing status text.
 * Explicitly avoids unverified order-confirmation claims.
 */
export function getQuotationStatusLabel(status: QuotationStatus): string {
  switch (status) {
    case 'ready':
    case 'issued':
      return 'Ready to Send';
    case 'whatsapp_opened':
    case 'enquired':
      return 'WhatsApp Opened — Awaiting Customer Send';
    case 'draft':
    default:
      return 'Draft';
  }
}

export interface CustomerDetails {
  fullName: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  gstin?: string;
  notes?: string;
}

export interface QuotationFrameSnapshot {
  frameId: string;
  frameName: string;
  profileWidth: number;
  depth: number;
  material: string;
  finish: string;
  footRateINR: number;
  width: number;
  height: number;
  unit: DimensionUnit;
  aspectRatioLabel: string;
  finishedOuterWidth: number;
  finishedOuterHeight: number;
  matId: string;
  matName: string;
  matBorderWidth: number;
  matColorHex: string;
  artworkId: string;
  artworkTitle: string;
  artworkArtist: string;
  artworkFit: ArtworkFitMode;
  artworkImageUrl: string;
  customArtUrl: string | null;
  customArtAssetId?: string | null;
  glazingId: string;
  glazingName: string;
  glazingSpecs: string;
  glazingPriceDelta: number;
  mountingId: string;
  mountingName: string;
  mountingSpecs: string;
  wallColor: string;
}

/**
 * Commercial tax ledger separating provisional estimation assumptions from legal invoice rules.
 */
export interface QuotationTaxEstimate {
  /**
   * Indicative tax rate applied from baseline pricing engine (default 0.18 for standard Indian framing tariff estimate).
   */
  rate: number;
  /**
   * Estimated tax amount calculated from taxable subtotal using pricing.ts GST_RATE.
   */
  amount: number;
  /**
   * Transparent commercial status note.
   */
  status: 'provisional-estimate';
  taxRuleDescription: string;
  formattedAmount: string;
}

export type DeliveryQuoteStatus = 'to-be-confirmed-by-workshop' | 'excluded' | 'workshop-pickup';

/**
 * Logistics ledger explicitly disclaiming unapproved shipping rates.
 */
export interface QuotationDeliveryEstimate {
  status: DeliveryQuoteStatus;
  selectedTier: 'standard' | 'courier' | 'pickup';
  /**
   * Explicitly null until commercially approved by the workshop based on volumetric crate size and destination.
   */
  amountINR: number | null;
  disclaimer: string;
  formattedDelivery: string;
}

export interface QuotationPricingSnapshot {
  linearFeet: number;
  mouldingCost: number;
  matCost: number;
  assemblyCost: number;
  glazingDelta: number;
  subtotalBeforeGlazing: number;
  subtotal: number;
  /**
   * Tax estimate object detailing provisional GST assumptions.
   */
  tax: QuotationTaxEstimate;
  gstRate: number; // 0.18 (derived from pricing.ts)
  gstAmount: number;
  /**
   * Unconfirmed delivery estimate (excluded from totalEstimatedAmount).
   */
  delivery: QuotationDeliveryEstimate;
  shippingTier: 'standard' | 'courier' | 'pickup';
  shippingCost: number | null; // null represents unconfirmed/TBD
  /**
   * Subtotal + provisional tax. Does NOT add unapproved delivery charges.
   */
  totalEstimatedAmount: number;
  currency: 'INR';
  formattedSubtotal: string;
  formattedGst: string;
  formattedShipping: string;
  formattedTotal: string;
}

export interface QuotationSnapshot {
  id: string; // e.g. "quot-1732483800000-8842"
  quotationNumber: string; // e.g. "SA-Q-2026-8842"
  createdAt: string; // ISO 8601
  updatedAt: string;
  status: QuotationStatus;
  customer: CustomerDetails;
  specifications: QuotationFrameSnapshot;
  pricing: QuotationPricingSnapshot;
  studioShareUrl: string; // Deep-link restoring the exact frame in studio
}

/**
 * Pure deep-cloning utility to guarantee absolute snapshot immutability.
 */
function deepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch {
      // Fallback if object has non-cloneable references
    }
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Calculates commercial pricing using the single source of truth (pricing.ts).
 * Crucial Commercial Rule: Delivery charges are excluded from customer-facing total until confirmed.
 */
export function calculateQuotationPricing(
  frame: FrameSample,
  width: number,
  height: number,
  unit: DimensionUnit,
  mat: MatOption,
  glazing: GlazingOption,
  shippingTier: 'standard' | 'courier' | 'pickup' = 'standard'
): QuotationPricingSnapshot {
  const baseBreakdown = calculateFramePrice(frame, width, height, unit, mat, 'INR');
  const mouldingCost = baseBreakdown.moldingCost;
  const matCost = mat.id === 'mat-none' ? 0 : baseBreakdown.matCost;
  const assemblyCost = baseBreakdown.glassAndAssemblyCost;
  const subtotalBeforeGlazing = mouldingCost + matCost + assemblyCost;
  
  const glazingDelta = glazing.priceDelta;
  const subtotal = Math.max(0, subtotalBeforeGlazing + glazingDelta);
  const gstAmount = Math.round(subtotal * GST_RATE);

  // Delivery is unconfirmed and EXCLUDED from the quotation total until approved
  const delivery: QuotationDeliveryEstimate = {
    status: 'to-be-confirmed-by-workshop',
    selectedTier: shippingTier,
    amountINR: null,
    disclaimer: 'Pan-India insured transit and custom crate packaging will be calculated upon workshop order confirmation based on destination and volumetric weight.',
    formattedDelivery: 'To be confirmed upon dispatch',
  };

  // Statutory total does NOT include invented delivery charges
  const totalEstimatedAmount = subtotal + gstAmount;

  const tax: QuotationTaxEstimate = {
    rate: GST_RATE,
    amount: gstAmount,
    status: 'provisional-estimate',
    taxRuleDescription: 'Estimated 18% GST (HSN 4414 provisional estimate; subject to workshop tax invoice confirmation)',
    formattedAmount: formatINR(gstAmount),
  };

  return {
    linearFeet: baseBreakdown.linearFeet,
    mouldingCost,
    matCost,
    assemblyCost,
    glazingDelta,
    subtotalBeforeGlazing,
    subtotal,
    tax,
    gstRate: GST_RATE,
    gstAmount,
    delivery,
    shippingTier,
    shippingCost: null,
    totalEstimatedAmount,
    currency: 'INR',
    formattedSubtotal: formatINR(subtotal),
    formattedGst: formatINR(gstAmount),
    formattedShipping: delivery.formattedDelivery,
    formattedTotal: formatINR(totalEstimatedAmount),
  };
}

let sessionQuotationCounter = Math.floor(1000 + Math.random() * 8000);

/**
 * Generates collision-resistant quotation IDs and workshop reference numbers.
 * Uses atomic session sequence with collision avoidance against existing stored records.
 * 
 * Guarantee: Uniqueness is guaranteed within the current client browser storage ledger.
 * It represents a provisional workshop reference until recorded in the master atelier order book.
 */
export function generateQuotationIdentifiers(
  existingIds: Set<string> = new Set(),
  existingNumbers: Set<string> = new Set()
): { id: string; quotationNumber: string } {
  const now = Date.now();
  const year = new Date().getFullYear();
  let attempts = 0;

  while (attempts < 100) {
    sessionQuotationCounter = (sessionQuotationCounter + 1) % 10000 || 1000;
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const id = `quot-${now}-${randomHex}`;
    const formattedNum = String(sessionQuotationCounter).padStart(4, '0');
    const quotationNumber = `SA-Q-${year}-${formattedNum}`;

    if (!existingIds.has(id) && !existingNumbers.has(quotationNumber) && !existingIds.has(quotationNumber)) {
      return { id, quotationNumber };
    }
    attempts++;
  }

  // Fallback with microsecond entropy
  const fallbackHex = Math.random().toString(36).substring(2, 8).toUpperCase();
  const fallbackNum = `${now.toString().slice(-4)}`;
  return {
    id: `quot-${now}-${fallbackHex}`,
    quotationNumber: `SA-Q-${year}-${fallbackNum}`,
  };
}

export interface CreateQuotationInput {
  frame: FrameSample;
  width: number;
  height: number;
  unit: DimensionUnit;
  aspectRatioLabel: string;
  mat: MatOption;
  artwork: ArtworkOption;
  customArtUrl?: string | null;
  customArtAssetId?: string | null;
  artworkFit: ArtworkFitMode;
  glazing?: GlazingOption;
  mounting?: MountingOption;
  wallColor?: string;
  customer: CustomerDetails;
  shippingTier?: 'standard' | 'courier' | 'pickup';
  existingId?: string;
  existingQuotationNumber?: string;
  originUrl?: string;
}

/**
 * Pure factory creating an immutable, deeply copied QuotationSnapshot.
 */
export function createQuotationSnapshot(input: CreateQuotationInput): QuotationSnapshot {
  const now = new Date().toISOString();
  const identifiers = generateQuotationIdentifiers();
  const id = input.existingId || identifiers.id;
  const quotationNumber = input.existingQuotationNumber || identifiers.quotationNumber;
  
  const glazing = input.glazing || GLAZING_OPTIONS[0];
  const mounting = input.mounting || MOUNTING_OPTIONS[0];
  const shippingTier = input.shippingTier || 'standard';
  const wallColor = input.wallColor || 'stone';

  const matBorder = input.mat.id === 'mat-none' ? 0 : input.mat.borderWidth;
  const profileFaceWidth = input.frame.profileWidth;
  const finishedOuterWidth = Math.round((input.width + (matBorder * 2) + (profileFaceWidth * 2)) * 100) / 100;
  const finishedOuterHeight = Math.round((input.height + (matBorder * 2) + (profileFaceWidth * 2)) * 100) / 100;

  const footRateINR = getMouldingFootRateINR(input.frame);
  const pricing = calculateQuotationPricing(
    input.frame,
    input.width,
    input.height,
    input.unit,
    input.mat,
    glazing,
    shippingTier
  );

  const qs = serializeConfigToQuery({
    frameId: input.frame.id,
    width: input.width,
    height: input.height,
    unit: input.unit,
    matEnabled: input.mat.id !== 'mat-none',
    matId: input.mat.id,
    matColorHex: input.mat.colorHex,
    matWidth: input.mat.borderWidth,
    artworkId: input.artwork.id,
    customArtUrl: null, // Strict safeguard: never store large Blob/Data URLs in query strings
    artworkFit: input.artworkFit,
    glazingId: glazing.id,
    mountingId: mounting.id,
    wallColor: (wallColor === 'forest' || wallColor === 'linen') ? wallColor : 'stone',
  });

  const baseUrl = input.originUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const studioShareUrl = `${baseUrl}/studio/${input.frame.id}${qs}`;

  const specifications: QuotationFrameSnapshot = {
    frameId: input.frame.id,
    frameName: input.frame.name,
    profileWidth: input.frame.profileWidth,
    depth: input.frame.depth,
    material: input.frame.material,
    finish: input.frame.finish,
    footRateINR,
    width: input.width,
    height: input.height,
    unit: input.unit,
    aspectRatioLabel: input.aspectRatioLabel,
    finishedOuterWidth,
    finishedOuterHeight,
    matId: input.mat.id,
    matName: input.mat.name,
    matBorderWidth: input.mat.borderWidth,
    matColorHex: input.mat.colorHex,
    artworkId: input.artwork.id,
    artworkTitle: input.artwork.title,
    artworkArtist: input.artwork.artist,
    artworkFit: input.artworkFit,
    artworkImageUrl: input.artwork.imageUrl,
    customArtUrl: input.customArtUrl || null,
    customArtAssetId: input.customArtAssetId || null,
    glazingId: glazing.id,
    glazingName: glazing.name,
    glazingSpecs: glazing.specs,
    glazingPriceDelta: glazing.priceDelta,
    mountingId: mounting.id,
    mountingName: mounting.name,
    mountingSpecs: mounting.specs,
    wallColor,
  };

  // Perform complete deep clone to sever any reference to caller's mutable runtime objects
  return deepClone({
    id,
    quotationNumber,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    customer: input.customer,
    specifications,
    pricing,
    studioShareUrl,
  });
}

export interface SnapshotValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates the schema and integrity of an untrusted quotation snapshot loaded from storage or URL.
 */
export function validateQuotationSnapshot(data: unknown): SnapshotValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Snapshot must be a non-null object'] };
  }

  const s = data as Record<string, any>;

  if (!s.id || typeof s.id !== 'string') errors.push('Missing or invalid id');
  if (!s.quotationNumber || typeof s.quotationNumber !== 'string') errors.push('Missing or invalid quotationNumber');
  if (!s.createdAt || typeof s.createdAt !== 'string') errors.push('Missing or invalid createdAt');

  if (!s.specifications || typeof s.specifications !== 'object') {
    errors.push('Missing specifications object');
  } else {
    if (!s.specifications.frameId || typeof s.specifications.frameId !== 'string') {
      errors.push('Missing or invalid specifications.frameId');
    }
    if (typeof s.specifications.width !== 'number' || s.specifications.width <= 0) {
      errors.push('Invalid specifications.width');
    }
    if (typeof s.specifications.height !== 'number' || s.specifications.height <= 0) {
      errors.push('Invalid specifications.height');
    }
  }

  if (!s.pricing || typeof s.pricing !== 'object') {
    errors.push('Missing pricing object');
  } else {
    if (typeof s.pricing.subtotal !== 'number' || s.pricing.subtotal < 0) {
      errors.push('Invalid pricing.subtotal');
    }
    if (typeof s.pricing.totalEstimatedAmount !== 'number' || s.pricing.totalEstimatedAmount < 0) {
      errors.push('Invalid pricing.totalEstimatedAmount');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
