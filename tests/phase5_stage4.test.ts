import assert from 'assert';
import { parseRoute, getRoutePath } from '../src/utils/routes';
import {
  saveQuotation,
  loadValidatedQuotationById,
  clearAllQuotations,
  QUOTATION_STORAGE_KEY,
} from '../src/utils/quotationStorage';
import { createQuotationSnapshot } from '../src/types/quotation';
import { WORKSHOP_MOULDINGS } from '../src/data/workshopSamples';
import { MAT_OPTIONS, ARTWORK_OPTIONS } from '../src/data/frames';
import { GLAZING_OPTIONS, MOUNTING_OPTIONS } from '../src/components/CustomFramingStudio';

console.log('\n=============================================================');
console.log('   PHASE 5 STAGE 4: DOSSIER & PRINT BEHAVIORAL TESTS         ');
console.log('=============================================================');

// Mock window & localStorage
const storageMap: Record<string, string> = {};
(global as any).window = {
  location: {
    origin: 'http://localhost:5173',
    pathname: '/',
    search: '',
  },
};
(global as any).localStorage = {
  getItem: (key: string) => storageMap[key] || null,
  setItem: (key: string, val: string) => {
    storageMap[key] = String(val);
  },
  removeItem: (key: string) => {
    delete storageMap[key];
  },
  clear: () => {
    Object.keys(storageMap).forEach((k) => delete storageMap[k]);
  },
};

// 1. Route Parsing Tests
console.log('\n--- 1. QUOTATION DOSSIER ROUTE PARSING ---');
const rDossier = parseRoute('/quotation/quot-173248-ABCD');
assert.strictEqual(rDossier.route, 'quotation');
assert.strictEqual(rDossier.quotationId, 'quot-173248-ABCD');
assert.strictEqual(rDossier.isPrintMode, false);

const rPrint = parseRoute('/quotation/SA-Q-2026-8842/print');
assert.strictEqual(rPrint.route, 'quotation');
assert.strictEqual(rPrint.quotationId, 'SA-Q-2026-8842');
assert.strictEqual(rPrint.isPrintMode, true);

const rMissing = parseRoute('/quotation');
assert.strictEqual(rMissing.route, 'quotation');
assert.strictEqual(rMissing.quotationId, undefined);
assert.strictEqual(rMissing.isPrintMode, false);

assert.strictEqual(getRoutePath('quotation', 'quot-99'), '/quotation/quot-99');
console.log('[PASS] Parsed /quotation/:id, /quotation/:id/print, and bare /quotation cleanly');

// 2. Load Validated Quotation by ID & Zero Silent Fallback
console.log('\n--- 2. STRICT ID LOOKUP & CORRUPTION HANDLING ---');
clearAllQuotations();

const snap1 = createQuotationSnapshot({
  frame: WORKSHOP_MOULDINGS[0],
  width: 20,
  height: 24,
  unit: 'in',
  aspectRatioLabel: '4:5',
  mat: MAT_OPTIONS[0],
  artwork: ARTWORK_OPTIONS[0],
  artworkFit: 'fill',
  glazing: GLAZING_OPTIONS[1], // UltraVue (+950)
  mounting: MOUNTING_OPTIONS[0],
  customer: {
    fullName: 'Vikram Mehta',
    phone: '9820054321',
    email: 'vikram@example.com',
    addressLine1: '21 Marine Drive',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400020',
  },
  existingId: 'quot-stage4-valid',
  existingQuotationNumber: 'SA-Q-2026-4401',
});

saveQuotation(snap1);

const foundRes = loadValidatedQuotationById('quot-stage4-valid');
assert.strictEqual(foundRes.status, 'found');
assert.strictEqual(foundRes.quotation?.id, 'quot-stage4-valid');
assert.strictEqual(foundRes.quotation?.pricing.totalEstimatedAmount, 8454);
assert.strictEqual(foundRes.quotation?.pricing.shippingCost, null);
console.log('[PASS] Valid quotation loads cleanly by ID with exact historical pricing (₹8,454)');

const foundByRef = loadValidatedQuotationById('SA-Q-2026-4401');
assert.strictEqual(foundByRef.status, 'found');
assert.strictEqual(foundByRef.quotation?.id, 'quot-stage4-valid');
console.log('[PASS] Valid quotation also resolves by customer-facing reference number');

const notFoundRes = loadValidatedQuotationById('NON-EXISTENT-ID-999');
assert.strictEqual(notFoundRes.status, 'not_found');
assert.strictEqual(notFoundRes.quotation, null, 'Must never silently substitute another quotation');
console.log('[PASS] Invalid ID returns not_found with null quotation (zero silent substitution)');

const missingIdRes = loadValidatedQuotationById('');
assert.strictEqual(missingIdRes.status, 'missing_id');
assert.strictEqual(missingIdRes.quotation, null);
console.log('[PASS] Empty ID returns missing_id');

// Corrupt record test
const rawList = JSON.parse(storageMap[QUOTATION_STORAGE_KEY]);
rawList.push({
  id: 'quot-corrupt-entry',
  quotationNumber: 'SA-Q-2026-9999',
  createdAt: new Date().toISOString(),
  specifications: { frameId: 'SAA-FLR-01', width: -5, height: 10 },
  pricing: { subtotal: -100, totalEstimatedAmount: -118 },
});
storageMap[QUOTATION_STORAGE_KEY] = JSON.stringify(rawList);

const corruptRes = loadValidatedQuotationById('quot-corrupt-entry');
assert.strictEqual(corruptRes.status, 'corrupted');
assert.strictEqual(corruptRes.quotation, null);
assert(corruptRes.errors && corruptRes.errors.length >= 2);
console.log(`[PASS] Corrupted snapshot detected and rejected (${corruptRes.errors.length} schema violations caught)`);

// Malformed JSON storage error test
storageMap[QUOTATION_STORAGE_KEY] = '{not valid json!!!';
const storageErrRes = loadValidatedQuotationById('quot-stage4-valid');
assert.strictEqual(storageErrRes.status, 'storage_error');
assert.strictEqual(storageErrRes.quotation, null);
console.log('[PASS] Malformed LocalStorage JSON handled gracefully with storage_error');

console.log('\n=============================================================');
console.log('ALL PHASE 5 STAGE 4 BEHAVIORAL TESTS PASSED');
console.log('=============================================================\n');
