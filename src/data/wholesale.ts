import { WholesaleMouldingItem } from '../types';

export const WHOLESALE_MOULDINGS: WholesaleMouldingItem[] = [
  {
    id: 'WM-RAW-05',
    frameId: 'SAA-RAW-05',
    sku: 'WM-RAW-05',
    name: 'Raw Unfinished Profile Core (Stretcher & Moulding)',
    stickLengthFeet: 9.5,
    piecesPerBox: 24,
    totalFootagePerBox: 228,
    pricePerFootINR: 190,
    pricePerFootUSD: 2.25,
    minOrderBoxes: 2,
    profileWidth: 1.75,
    depth: 1.25,
    material: 'Clear-Grade Solid Meranti / Pinewood',
    finish: 'Calibrated Planed Raw Timber for In-House Leafing',
    inStock: true,
    leadTimeDays: 2,
    tierDiscounts: [
      { minBoxes: 2, discountPercent: 0, label: 'Minimum Trade (2–9 Boxes)' },
      { minBoxes: 10, discountPercent: 15, label: 'Factory Volume (10–29 Boxes)' },
      { minBoxes: 30, discountPercent: 25, label: 'Full Pallet (30+ Boxes)' },
    ]
  },
  {
    id: 'WM-VRS-06',
    frameId: 'SAA-VRS-06',
    sku: 'WM-VRS-06',
    name: 'Versailles Baroque Floral Rococo',
    stickLengthFeet: 9.0,
    piecesPerBox: 10,
    totalFootagePerBox: 90,
    pricePerFootINR: 490,
    pricePerFootUSD: 5.75,
    minOrderBoxes: 1,
    profileWidth: 3.50,
    depth: 2.25,
    material: 'Composite Carved Relief Hardwood',
    finish: 'Hand-Burnished French Gilt Bole',
    inStock: true,
    leadTimeDays: 2,
    tierDiscounts: [
      { minBoxes: 1, discountPercent: 0, label: 'Standard Trade (1–4 Boxes)' },
      { minBoxes: 5, discountPercent: 12, label: 'Studio Volume (5–19 Boxes)' },
      { minBoxes: 20, discountPercent: 22, label: 'Distributor Master Pack (20+ Boxes)' },
    ]
  },
  {
    id: 'WM-RST-07',
    frameId: 'SAA-RST-07',
    sku: 'WM-RST-07',
    name: 'Distressed Silver Leaf Baroque',
    stickLengthFeet: 9.0,
    piecesPerBox: 12,
    totalFootagePerBox: 108,
    pricePerFootINR: 410,
    pricePerFootUSD: 4.80,
    minOrderBoxes: 1,
    profileWidth: 2.75,
    depth: 1.85,
    material: 'Hand-Milled Solid Hardwood',
    finish: 'Italian Palladium Silver Leaf & Dark Patina',
    inStock: true,
    leadTimeDays: 2,
    tierDiscounts: [
      { minBoxes: 1, discountPercent: 0, label: 'Standard Trade (1–4 Boxes)' },
      { minBoxes: 5, discountPercent: 12, label: 'Studio Volume (5–19 Boxes)' },
      { minBoxes: 20, discountPercent: 22, label: 'Distributor Master Pack (20+ Boxes)' },
    ]
  }
];

export function getWholesaleItemForFrame(frameId: string): WholesaleMouldingItem | undefined {
  return WHOLESALE_MOULDINGS.find(m => m.frameId === frameId);
}
