import { FrameSample, DimensionUnit, MatOption } from '../types';

/**
 * Standard Indian GST Rate on Wooden / Composite Picture Frame Moulding Manufacturing (HSN 4414)
 */
export const GST_RATE = 0.18;

export interface PriceBreakdown {
  unitedInches: number;
  linearFeet: number;
  moldingCost: number;       // Base moulding in ₹
  matCost: number;           // Archival mat in ₹
  glassAndAssemblyCost: number; // Glass and assembly in ₹
  basePrice: number;         // Subtotal before GST in ₹
  subtotal?: number;         // Alias for basePrice before GST in ₹
  gstAmount: number;         // 18% GST in ₹
  totalPrice: number;        // Final total (Base + GST) in ₹
  currency: 'INR';
  formattedBase: string;
  formattedGst: string;
  formattedTotal: string;
  formattedMolding: string;
  formattedMat: string;
  formattedGlass: string;
}

/**
 * Centralized Indian Rupee (INR) Formatter following Indian Numbering Convention (e.g. ₹3,850, ₹1,25,000)
 */
export const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const inrFormatterWithPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatINR(amount: number, showPaise = false): string {
  if (showPaise && amount % 1 !== 0) {
    return inrFormatterWithPaise.format(amount);
  }
  return inrFormatter.format(Math.round(amount));
}

/**
 * Backward-compatible helper for existing component calls
 */
export function formatCurrency(amount: number, _currency = 'INR'): string {
  return formatINR(amount);
}

/**
 * Resolves verified Indian Rupee price per linear foot for any catalog moulding.
 * Standard domestic rates: ₹280 to ₹490 per running foot based on carving relief and finish.
 */
export function getMouldingFootRateINR(frame: FrameSample): number {
  if (frame.pricePerFootINR && frame.pricePerFootINR > 0) {
    return frame.pricePerFootINR;
  }
  // Standard conversion from baseline index to calibrated domestic Indian framing tariff
  const rate = Math.round((frame.basePricePerFoot || 40) * 8.75 / 10) * 10;
  return Math.max(250, rate);
}

/**
 * Computes bespoke picture frame manufacturing cost in Indian Rupees (₹).
 * Incorporates perimeter sizing, 4-corner 45° miter waste allowance, archival materials, and 18% GST.
 */
export function calculateFramePrice(
  frame: FrameSample,
  width: number,
  height: number,
  unit: DimensionUnit,
  mat: MatOption,
  _currency = 'INR'
): PriceBreakdown {
  // Convert cm to inches if needed for calculations
  const widthInches = unit === 'cm' ? width / 2.54 : width;
  const heightInches = unit === 'cm' ? height / 2.54 : height;

  // United Inches is standard in custom framing (Width + Height)
  const unitedInches = Math.round((widthInches + heightInches) * 10) / 10;
  
  // Linear feet needed for perimeter plus corner miter allowance (4 corners * 2 * profileWidth)
  const perimeterInches = (widthInches + heightInches) * 2;
  const miterWasteInches = frame.profileWidth * 8; // standard 4 corners allowance
  const totalLinearInches = perimeterInches + miterWasteInches;
  const linearFeet = Math.max(2, Math.round((totalLinearInches / 12) * 10) / 10);

  // Domestic Indian pricing breakdown in ₹
  const footRateINR = getMouldingFootRateINR(frame);
  const moldingCost = Math.round(linearFeet * footRateINR);
  const matCost = mat.id === 'mat-none' ? 0 : Math.round(260 + unitedInches * 14);
  const glassAndAssemblyCost = Math.round(380 + unitedInches * 22);

  // Base price (Moulding + Mat + Glass/Hardware)
  const basePrice = moldingCost + matCost + glassAndAssemblyCost;

  // Indian GST @ 18% (HSN 4414)
  const gstAmount = Math.round(basePrice * GST_RATE);

  // Total Estimated Price
  const totalPrice = basePrice + gstAmount;

  return {
    unitedInches,
    linearFeet,
    moldingCost,
    matCost,
    glassAndAssemblyCost,
    basePrice,
    subtotal: basePrice,
    gstAmount,
    totalPrice,
    currency: 'INR',
    formattedBase: formatINR(basePrice),
    formattedGst: formatINR(gstAmount),
    formattedTotal: formatINR(totalPrice),
    formattedMolding: formatINR(moldingCost),
    formattedMat: formatINR(matCost),
    formattedGlass: formatINR(glassAndAssemblyCost),
  };
}

export function formatDimensions(w: number, h: number, unit: DimensionUnit): string {
  return `${w} × ${h} ${unit}`;
}

export function getAspectRatioLabel(w: number, h: number): string {
  if (!w || !h) return 'Custom';
  const ratio = w / h;
  if (Math.abs(ratio - 1) < 0.05) return '1:1 Square';
  if (Math.abs(ratio - 1.25) < 0.05 || Math.abs(ratio - 0.8) < 0.05) return '4:5 Standard Portrait';
  if (Math.abs(ratio - 1.33) < 0.05 || Math.abs(ratio - 0.75) < 0.05) return '3:4 Classic';
  if (Math.abs(ratio - 1.5) < 0.05 || Math.abs(ratio - 0.66) < 0.05) return '2:3 Archival';
  if (Math.abs(ratio - 1.77) < 0.05 || Math.abs(ratio - 0.56) < 0.05) return '16:9 Panoramic';
  return `${w.toFixed(1)}:${h.toFixed(1)}`;
}

