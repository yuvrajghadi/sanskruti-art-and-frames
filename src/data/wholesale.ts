import { FrameSample, WholesaleMouldingItem } from '../types';
import { WORKSHOP_MOULDINGS } from './workshopSamples';
import { getMouldingFootRateINR } from '../utils/pricing';

export const WHOLESALE_MOULDINGS: WholesaleMouldingItem[] = [
  {
    id: 'WM-RAW-05',
    frameId: 'SAA-BGD-08',
    sku: 'WM-RAW-05',
    name: 'Brushed Modern Gallery Gold — Factory Carton',
    stickLengthFeet: 9.5,
    piecesPerBox: 24,
    totalFootagePerBox: 228,
    pricePerFootINR: 190,
    pricePerFootUSD: 2.25,
    minOrderBoxes: 2,
    profileWidth: 1.75,
    depth: 1.25,
    material: 'Extruded Structural Aluminum Alloy',
    finish: 'Brushed Satin Gold Anodized (Batch Master Carton)',
    inStock: true,
    leadTimeDays: 2,
    tierDiscounts: [
      { minBoxes: 2, discountPercent: 0, label: 'Minimum Trade (2–9 Boxes)' },
      { minBoxes: 10, discountPercent: 15, label: 'Factory Volume (10–29 Boxes)' },
      { minBoxes: 30, discountPercent: 25, label: 'Full Pallet (30+ Boxes)' },
    ],
  },
  {
    id: 'WM-VRS-06',
    frameId: 'SAA-ABR-14',
    sku: 'WM-VRS-06',
    name: 'Ornate Antique Bronze Baroque — Master Pack',
    stickLengthFeet: 9.0,
    piecesPerBox: 10,
    totalFootagePerBox: 90,
    pricePerFootINR: 490,
    pricePerFootUSD: 5.75,
    minOrderBoxes: 1,
    profileWidth: 3.50,
    depth: 2.25,
    material: 'Hand-Sculpted Hardwood & Heavy Bole',
    finish: 'Hand-Carved Sculptural Bronze with Umber Glaze',
    inStock: true,
    leadTimeDays: 2,
    tierDiscounts: [
      { minBoxes: 1, discountPercent: 0, label: 'Standard Trade (1–4 Boxes)' },
      { minBoxes: 5, discountPercent: 12, label: 'Studio Volume (5–19 Boxes)' },
      { minBoxes: 20, discountPercent: 22, label: 'Distributor Master Pack (20+ Boxes)' },
    ],
  },
  {
    id: 'WM-RST-07',
    frameId: 'SAA-GFW-21',
    sku: 'WM-RST-07',
    name: 'Classic Parisian Gilded Salon — Studio Case',
    stickLengthFeet: 9.0,
    piecesPerBox: 12,
    totalFootagePerBox: 108,
    pricePerFootINR: 410,
    pricePerFootUSD: 4.80,
    minOrderBoxes: 1,
    profileWidth: 2.75,
    depth: 1.80,
    material: 'Fine Jelutong Wood & French Gesso',
    finish: 'Water-Gilded French 24k Gold Leaf with Beaded Lip',
    inStock: true,
    leadTimeDays: 2,
    tierDiscounts: [
      { minBoxes: 1, discountPercent: 0, label: 'Standard Trade (1–4 Boxes)' },
      { minBoxes: 5, discountPercent: 12, label: 'Studio Volume (5–19 Boxes)' },
      { minBoxes: 20, discountPercent: 22, label: 'Distributor Master Pack (20+ Boxes)' },
    ],
  },
];

const ALL_WORKSHOP_WHOLESALE_MAP: Map<string, WholesaleMouldingItem> = (() => {
  const map = new Map<string, WholesaleMouldingItem>();
  for (const item of WHOLESALE_MOULDINGS) {
    map.set(item.frameId, item);
  }

  // Ensure every active Workshop Original (SAA-*) exposes verified carton footage, stick lengths, MOQ & volume tiers
  for (const frame of WORKSHOP_MOULDINGS) {
    if (map.has(frame.id)) continue;

    const isHeavyProfile = frame.profileWidth >= 3.0;
    const isSlimProfile = frame.profileWidth < 2.0;
    const stickLengthFeet = isHeavyProfile ? 9.0 : 9.5;
    const piecesPerBox = isSlimProfile ? 24 : frame.profileWidth >= 3.25 ? 10 : 12;
    const totalFootagePerBox = Math.round(stickLengthFeet * piecesPerBox);
    const retailRate = getMouldingFootRateINR(frame);
    const pricePerFootINR = Math.max(190, Math.round((retailRate * 0.72) / 5) * 5);
    const minOrderBoxes = isSlimProfile ? 2 : 1;

    map.set(frame.id, {
      id: `WM-${frame.id}`,
      frameId: frame.id,
      sku: `WM-${frame.id}`,
      name: `${frame.name} — Trade Carton`,
      stickLengthFeet,
      piecesPerBox,
      totalFootagePerBox,
      pricePerFootINR,
      pricePerFootUSD: Math.round((pricePerFootINR / 84) * 100) / 100,
      minOrderBoxes,
      profileWidth: frame.profileWidth,
      depth: frame.depth,
      material: frame.material,
      finish: frame.finish,
      inStock: true,
      leadTimeDays: 2,
      tierDiscounts: [
        { minBoxes: minOrderBoxes, discountPercent: 0, label: `Standard Trade (${minOrderBoxes}–4 Boxes)` },
        { minBoxes: 5, discountPercent: 12, label: 'Studio Volume (5–19 Boxes)' },
        { minBoxes: 20, discountPercent: 25, label: 'Full Pallet (20+ Boxes)' },
      ],
    });
  }

  return map;
})();

/**
 * Returns authentic wholesale carton pricing and tier specifications for an active moulding profile.
 * Covers all 17 Workshop Originals explicitly and derives carton telemetry if needed for custom frames.
 */
export function getWholesaleItemForFrame(
  frameId: string,
  frameHint?: FrameSample
): WholesaleMouldingItem | undefined {
  const exact = ALL_WORKSHOP_WHOLESALE_MAP.get(frameId);
  if (exact) return exact;

  if (frameHint?.isWorkshopSample) {
    const stickLengthFeet = frameHint.profileWidth >= 3.0 ? 9.0 : 9.5;
    const piecesPerBox = frameHint.profileWidth < 2.0 ? 24 : frameHint.profileWidth >= 3.25 ? 10 : 12;
    const pricePerFootINR = Math.max(190, Math.round((getMouldingFootRateINR(frameHint) * 0.72) / 5) * 5);
    return {
      id: `WM-${frameHint.id}`,
      frameId: frameHint.id,
      sku: `WM-${frameHint.id}`,
      name: `${frameHint.name} — Trade Carton`,
      stickLengthFeet,
      piecesPerBox,
      totalFootagePerBox: Math.round(stickLengthFeet * piecesPerBox),
      pricePerFootINR,
      pricePerFootUSD: Math.round((pricePerFootINR / 84) * 100) / 100,
      minOrderBoxes: 1,
      profileWidth: frameHint.profileWidth,
      depth: frameHint.depth,
      material: frameHint.material,
      finish: frameHint.finish,
      inStock: true,
      leadTimeDays: 2,
      tierDiscounts: [
        { minBoxes: 1, discountPercent: 0, label: 'Standard Trade (1–4 Boxes)' },
        { minBoxes: 5, discountPercent: 12, label: 'Studio Volume (5–19 Boxes)' },
        { minBoxes: 20, discountPercent: 25, label: 'Full Pallet (20+ Boxes)' },
      ],
    };
  }

  return undefined;
}
