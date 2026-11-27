import assert from 'assert';

const memoryStorage = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string) => (memoryStorage.has(k) ? memoryStorage.get(k)! : null),
    setItem: (k: string, v: string) => memoryStorage.set(k, String(v)),
    removeItem: (k: string) => memoryStorage.delete(k),
    clear: () => memoryStorage.clear(),
  },
  location: { search: '', pathname: '/', origin: 'http://localhost:4173' },
};
(globalThis as unknown as Record<string, unknown>).localStorage = (
  globalThis as unknown as { window: { localStorage: Storage } }
).window.localStorage;

import {
  getFrameOrientation,
  resolveOrientationDimensions,
  RectangularMemory,
} from '../src/components/CustomFramingStudio';
import {
  calculateFramePrice,
  getAspectRatioLabel,
} from '../src/utils/pricing';
import {
  serializeConfigToQuery,
  deserializeConfigFromQuery,
  validateFrameConfig,
} from '../src/utils/frameConfig';
import {
  createQuotationSnapshot,
  calculateQuotationPricing,
  CustomerDetails,
} from '../src/types/quotation';
import { computePhysicalMetrics, computeSvgGeometry } from '../src/utils/frameGeometry';
import { FRAME_SAMPLES, MAT_OPTIONS, ARTWORK_OPTIONS } from '../src/data/frames';
import { GLAZING_OPTIONS, MOUNTING_OPTIONS } from '../src/components/CustomFramingStudio';

console.log('\n=============================================================');
console.log('   ORIENTATION CONTROL & ASPECT PARITY REGRESSION SUITE      ');
console.log('=============================================================');

// 1. Active orientation derivation
assert.strictEqual(getFrameOrientation(16, 20), 'portrait');
assert.strictEqual(getFrameOrientation(20, 16), 'landscape');
assert.strictEqual(getFrameOrientation(16, 16), 'square');
console.log('[PASS] 1. Orientation derivation strictly satisfies H>W, W>H, W===H');

// 2. User flow: 16x20 -> 20x16 -> 16x16 -> restored 16x20
let mem: RectangularMemory | null = null;
const step1Landscape = resolveOrientationDimensions('landscape', 16, 20, 'in', mem);
assert.strictEqual(step1Landscape.width, 20);
assert.strictEqual(step1Landscape.height, 16);
mem = step1Landscape.nextLastRect;

const step2Square = resolveOrientationDimensions('square', step1Landscape.width, step1Landscape.height, 'in', mem);
assert.strictEqual(step2Square.width, 16);
assert.strictEqual(step2Square.height, 16);
mem = step2Square.nextLastRect;

const step3RestoredPortrait = resolveOrientationDimensions('portrait', step2Square.width, step2Square.height, 'in', mem);
assert.strictEqual(step3RestoredPortrait.width, 16);
assert.strictEqual(step3RestoredPortrait.height, 20);

// Round-trip from 16x16 back to landscape should also work cleanly
const step4Landscape = resolveOrientationDimensions('landscape', 16, 16, 'in', mem);
assert.strictEqual(step4Landscape.width, 20);
assert.strictEqual(step4Landscape.height, 16);
console.log('[PASS] 2. Cycle 16x20 -> 20x16 -> 16x16 -> restored 16x20 verified');

// 3. Direct square URL fallback without rectangular history + bounds edge cases
const directPortrait = resolveOrientationDimensions('portrait', 12, 12, 'in', null);
assert(directPortrait.height > directPortrait.width, 'Direct square -> portrait must have height > width');
assert.strictEqual(directPortrait.width, 12);
assert.strictEqual(directPortrait.height, 15);

const directLandscape = resolveOrientationDimensions('landscape', 12, 12, 'in', null);
assert(directLandscape.width > directLandscape.height, 'Direct square -> landscape must have width > height');
assert.strictEqual(directLandscape.width, 15);
assert.strictEqual(directLandscape.height, 12);

const maxPortrait = resolveOrientationDimensions('portrait', 96, 96, 'in', null);
assert(maxPortrait.height > maxPortrait.width && maxPortrait.height <= 96 && maxPortrait.width >= 4);

const maxLandscape = resolveOrientationDimensions('landscape', 96, 96, 'in', null);
assert(maxLandscape.width > maxLandscape.height && maxLandscape.width <= 96 && maxLandscape.height >= 4);

// Cross-unit rectangular restoration: 16x20 in -> square 16x16 in -> converted to cm (40.6x40.6) -> portrait
const crossUnitPortrait = resolveOrientationDimensions(
  'portrait',
  40.6,
  40.6,
  'cm',
  { width: 20, height: 16, unit: 'in' }
);
assert.strictEqual(crossUnitPortrait.width, 40.6);
assert.strictEqual(crossUnitPortrait.height, 50.8);
console.log('[PASS] 3. Direct square URLs, min/max clamping, and cm/in memory conversion verified');

// 4. Orientation-aware aspect-ratio labeling
assert.strictEqual(getAspectRatioLabel(16, 20), '4:5 Standard Portrait');
assert.strictEqual(getAspectRatioLabel(20, 16), '5:4 Landscape');
assert.strictEqual(getAspectRatioLabel(12, 16), '3:4 Classic');
assert.strictEqual(getAspectRatioLabel(16, 12), '4:3 Classic Landscape');
assert.strictEqual(getAspectRatioLabel(24, 36), '2:3 Archival');
assert.strictEqual(getAspectRatioLabel(36, 24), '3:2 Archival Landscape');
assert.strictEqual(getAspectRatioLabel(16, 9), '16:9 Panoramic Landscape');
assert.strictEqual(getAspectRatioLabel(9, 16), '9:16 Vertical Portrait');
assert.strictEqual(getAspectRatioLabel(16, 16), '1:1 Square');
assert.strictEqual(getAspectRatioLabel(22, 10), '22.0:10.0 Landscape');
assert.strictEqual(getAspectRatioLabel(10, 22), '10.0:22.0 Portrait');
console.log('[PASS] 4. Orientation-aware aspect ratio labels verified');

// 5. Shared geometry parity & pricing symmetry for Portrait vs Landscape
const frame = FRAME_SAMPLES[0];
const mat = MAT_OPTIONS[0];
const portraitPhys = computePhysicalMetrics(frame, 16, 20, 'in', mat);
const landscapePhys = computePhysicalMetrics(frame, 20, 16, 'in', mat);
assert.strictEqual(portraitPhys.outerWidthIn, landscapePhys.outerHeightIn);
assert.strictEqual(portraitPhys.outerHeightIn, landscapePhys.outerWidthIn);

const landscapeSvg = computeSvgGeometry(frame, 20, 16, 'in', mat);
assert(landscapeSvg.vbW > landscapeSvg.vbH, 'Landscape SVG viewBox width must exceed height');
assert.strictEqual(landscapeSvg.artW > landscapeSvg.artH, true);

const portraitPrice = calculateFramePrice(frame, 16, 20, 'in', mat, 'INR');
const landscapePrice = calculateFramePrice(frame, 20, 16, 'in', mat, 'INR');
assert.strictEqual(portraitPrice.linearFeet, landscapePrice.linearFeet);
assert.strictEqual(portraitPrice.totalPrice, landscapePrice.totalPrice);
console.log('[PASS] 5. 2D/3D shared geometry parity and Portrait/Landscape pricing symmetry verified');

// 6. URL query sync & Quotation Snapshot integrity for Landscape and Square
const qs = serializeConfigToQuery({
  frameId: frame.id,
  width: 20,
  height: 16,
  unit: 'in',
  matEnabled: true,
  matId: mat.id,
  matColorHex: mat.colorHex,
  matWidth: mat.borderWidth,
  artworkId: ARTWORK_OPTIONS[0].id,
  customArtUrl: null,
  artworkFit: 'fit',
  glazingId: GLAZING_OPTIONS[1].id,
  mountingId: MOUNTING_OPTIONS[0].id,
  wallColor: 'stone',
});
assert(qs.includes('w=20') && qs.includes('h=16'), `Query string should encode landscape dimensions: ${qs}`);
const parsed = validateFrameConfig(deserializeConfigFromQuery(qs, frame.id), frame.id);
assert.strictEqual(parsed.width, 20);
assert.strictEqual(parsed.height, 16);
assert.strictEqual(getFrameOrientation(parsed.width, parsed.height), 'landscape');

const customer: CustomerDetails = {
  fullName: 'Vikram Sethi',
  phone: '+91 9820199887',
  addressLine1: '42 Marine Drive',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400020',
};
const quoteLandscape = createQuotationSnapshot({
  frame,
  width: 20,
  height: 16,
  unit: 'in',
  aspectRatioLabel: getAspectRatioLabel(20, 16),
  mat,
  artwork: ARTWORK_OPTIONS[0],
  artworkFit: 'fill',
  glazing: GLAZING_OPTIONS[0],
  mounting: MOUNTING_OPTIONS[0],
  customer,
  existingId: 'quot-orient-1',
  existingQuotationNumber: 'SA-Q-2026-9901',
});
assert.strictEqual(quoteLandscape.specifications.aspectRatioLabel, '5:4 Landscape');
assert(quoteLandscape.specifications.finishedOuterWidth > quoteLandscape.specifications.finishedOuterHeight);
assert(quoteLandscape.studioShareUrl.includes('w=20') && quoteLandscape.studioShareUrl.includes('h=16'));
const directQuotePricing = calculateQuotationPricing(frame, 16, 20, 'in', mat, GLAZING_OPTIONS[0], 'standard');
assert.strictEqual(quoteLandscape.pricing.totalEstimatedAmount, directQuotePricing.totalEstimatedAmount);
console.log('[PASS] 6. URL query sync and Landscape quotation snapshot consistency verified');

console.log('\n[SUCCESS] All orientation control & aspect parity unit/integration tests passed.\n');
