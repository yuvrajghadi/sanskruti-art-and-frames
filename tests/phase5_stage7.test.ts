import assert from 'assert';

const memoryStorage = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string) => (memoryStorage.has(k) ? memoryStorage.get(k)! : null),
    setItem: (k: string, v: string) => memoryStorage.set(k, String(v)),
    removeItem: (k: string) => memoryStorage.delete(k),
    clear: () => memoryStorage.clear(),
  },
  location: { search: '', pathname: '/' },
};
(globalThis as unknown as Record<string, unknown>).localStorage = (
  globalThis as unknown as { window: { localStorage: Storage } }
).window.localStorage;

import {
  createQuotationSnapshot,
  calculateQuotationPricing,
  CustomerDetails,
} from '../src/types/quotation';
import { saveQuotation, getQuotationById } from '../src/utils/quotationStorage';
import { buildQuotationWhatsAppHandoff } from '../src/utils/quotationEnquiry';
import { resolveProfile } from '../src/utils/productMapping';
import { getIndianWhatsAppUrl } from '../src/utils/whatsapp';
import { WORKSHOP_MOULDINGS } from '../src/data/workshopSamples';
import { FRAME_SAMPLES, MAT_OPTIONS } from '../src/data/frames';
import { ARTWORK_OPTIONS } from '../src/data/frames';
import { GLAZING_OPTIONS, MOUNTING_OPTIONS } from '../src/components/CustomFramingStudio';

const customer: CustomerDetails = {
  fullName: 'Ananya Deshmukh',
  phone: '+91 98201-12233',
  email: 'ananya@example.com',
  addressLine1: '18 Prabhat Road',
  city: 'Pune',
  state: 'Maharashtra',
  postalCode: '411004',
  notes: '',
};

console.log('\n=============================================================');
console.log('   PHASE 5 STAGE 7: INTEGRATION & COMMERCIAL PARITY TESTS    ');
console.log('=============================================================');

// 1. Catalogue Search Alias Resolution Parity (SA-BG-402 -> SAA-AGB-15)
const aliasTarget = resolveProfile('SA-BG-402', FRAME_SAMPLES);
assert(aliasTarget && aliasTarget.id === 'SAA-AGB-15', 'Alias SA-BG-402 must resolve cleanly to SAA-AGB-15');
assert.strictEqual(FRAME_SAMPLES.length, 25, 'All 25 active moulding profiles must remain intact');
console.log('[PASS] 1. Alias resolution and 25 moulding catalogue record integrity verified');

// 2. Non-Monetary Shipping Preference Persistence Without Changing Frozen Total
const standardPricing = calculateQuotationPricing(
  WORKSHOP_MOULDINGS[0],
  16,
  20,
  'in',
  MAT_OPTIONS[0],
  GLAZING_OPTIONS[0],
  'standard'
);
const pickupPricing = calculateQuotationPricing(
  WORKSHOP_MOULDINGS[0],
  16,
  20,
  'in',
  MAT_OPTIONS[0],
  GLAZING_OPTIONS[0],
  'pickup'
);
assert.strictEqual(standardPricing.totalEstimatedAmount, pickupPricing.totalEstimatedAmount);
assert.strictEqual(pickupPricing.shippingCost, null);
assert.strictEqual(pickupPricing.delivery.selectedTier, 'pickup');
assert.strictEqual(pickupPricing.tax.status, 'provisional-estimate');

const snap = createQuotationSnapshot({
  frame: WORKSHOP_MOULDINGS[0],
  width: 16,
  height: 20,
  unit: 'in',
  aspectRatioLabel: '4:5',
  mat: MAT_OPTIONS[0],
  artwork: ARTWORK_OPTIONS[0],
  artworkFit: 'fill',
  glazing: GLAZING_OPTIONS[0],
  mounting: MOUNTING_OPTIONS[0],
  shippingTier: 'standard',
  customer,
  existingId: 'quot-s7-1',
  existingQuotationNumber: 'SA-Q-2026-7101',
});
// Simulate user changing non-monetary dispatch preference to 'pickup' and saving
const updatedWithPickup = {
  ...snap,
  pricing: {
    ...snap.pricing,
    shippingTier: 'pickup' as const,
    delivery: {
      ...snap.pricing.delivery,
      selectedTier: 'pickup' as const,
    },
  },
};
assert.strictEqual(saveQuotation(updatedWithPickup).success, true);
const loaded = getQuotationById('quot-s7-1')!;
assert.strictEqual(loaded.pricing.shippingTier, 'pickup');
assert.strictEqual(loaded.pricing.delivery.selectedTier, 'pickup');
assert.strictEqual(loaded.pricing.totalEstimatedAmount, snap.pricing.totalEstimatedAmount);
assert.strictEqual(loaded.pricing.shippingCost, null);

const wa = buildQuotationWhatsAppHandoff({ ...loaded, status: 'whatsapp_opened' });
assert.strictEqual(wa.ok, true);
assert(wa.message?.includes('Workshop Pickup'), 'WhatsApp handoff must reflect persisted pickup dispatch preference');
console.log('[PASS] 2. Non-monetary dispatch tier preference persists across save & WhatsApp without mutating totals');

// 3. Genuine Sample Kit WhatsApp Handoff URL
const sampleUrl = getIndianWhatsAppUrl('Namaste Sanskruti Arts! Request Trade Sample Kit for Pune.');
assert(sampleUrl.startsWith('https://wa.me/918793242979?text='));
assert(decodeURIComponent(sampleUrl).includes('Trade Sample Kit'));
console.log('[PASS] 3. Sample kit enquiry URL uses verified WhatsApp builder cleanly');

console.log('\n[SUCCESS] All Phase 5 Stage 7 targeted integration tests passed.\n');
