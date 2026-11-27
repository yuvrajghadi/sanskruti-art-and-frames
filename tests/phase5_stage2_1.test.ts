import assert from 'assert';
import { 
  createQuotationSnapshot, 
  calculateQuotationPricing, 
  validateQuotationSnapshot, 
  generateQuotationIdentifiers,
  CreateQuotationInput 
} from '../src/types/quotation';
import { 
  saveQuotation, 
  getSavedQuotations, 
  getQuotationById, 
  deleteQuotation, 
  clearAllQuotations, 
  getStorageMetadata,
  MAX_STORED_QUOTATIONS,
  QUOTATION_STORAGE_KEY 
} from '../src/utils/quotationStorage';
import { WORKSHOP_MOULDINGS } from '../src/data/workshopSamples';
import { MAT_OPTIONS, ARTWORK_OPTIONS } from '../src/data/frames';
import { GLAZING_OPTIONS, MOUNTING_OPTIONS } from '../src/components/CustomFramingStudio';
import { GST_RATE } from '../src/utils/pricing';

console.log('\n=============================================================');
console.log('   PHASE 5 STAGE 2.1: COMMERCIAL INTEGRITY & SNAPSHOT AUDIT   ');
console.log('=============================================================');

// Mock localStorage environment
const storageMap: Record<string, string> = {};
(global as any).window = {
  location: {
    origin: 'http://localhost:5173',
    pathname: '/studio',
    search: '',
  }
};
(global as any).localStorage = {
  getItem: (key: string) => storageMap[key] || null,
  setItem: (key: string, val: string) => { storageMap[key] = String(val); },
  removeItem: (key: string) => { delete storageMap[key]; },
  clear: () => { Object.keys(storageMap).forEach(k => delete storageMap[k]); }
};

// -------------------------------------------------------------
// TEST GROUP 1: TAX & GST CONFIGURATION TRACE
// -------------------------------------------------------------
console.log('\n--- 1. TAX & GST COMMERCIAL SEPARATION ---');
const sampleFrame = WORKSHOP_MOULDINGS.find((f) => f.id === 'SAA-ABS-13')!; // 3.25" @ ₹48 base tier
const sampleMat = MAT_OPTIONS[0]; // Museum Cotton Rag 2.5"
const sampleArt = ARTWORK_OPTIONS[0]; // Vermeer
const optiumGlazing = GLAZING_OPTIONS[0]; // Tru-Vue Optium (+1800)

const pricingOptium = calculateQuotationPricing(
  sampleFrame,
  16,
  20,
  'in',
  sampleMat,
  optiumGlazing,
  'standard'
);

assert.strictEqual(pricingOptium.gstRate, GST_RATE, 'Tax rate must match pricing.ts GST_RATE (0.18)');
assert.strictEqual(pricingOptium.gstAmount, Math.round(pricingOptium.subtotal * GST_RATE), 'Tax amount must be calculated from subtotal');
assert.strictEqual(pricingOptium.tax.status, 'provisional-estimate', 'Tax status must be explicitly marked as provisional-estimate');
assert(pricingOptium.tax.taxRuleDescription.includes('provisional estimate'), 'Tax note must disclaim provisional status');
console.log(`[PASS] Tax ledger verified: Subtotal ₹${pricingOptium.subtotal}, Tax ₹${pricingOptium.gstAmount} (${pricingOptium.tax.status})`);

// -------------------------------------------------------------
// TEST GROUP 2: SHIPPING LOGIC & EXCLUSION OF INVENTED RATES
// -------------------------------------------------------------
console.log('\n--- 2. SHIPPING LOGIC & RATE UNCONFIRMED DISCLOSURE ---');
assert.strictEqual(pricingOptium.shippingCost, null, 'shippingCost must be null (unconfirmed), NOT invented ₹450 or ₹1,200');
assert.strictEqual(pricingOptium.delivery.status, 'to-be-confirmed-by-workshop', 'Delivery must be to-be-confirmed-by-workshop');
assert.strictEqual(
  pricingOptium.totalEstimatedAmount,
  pricingOptium.subtotal + pricingOptium.gstAmount,
  'totalEstimatedAmount must strictly equal subtotal + gstAmount without invented delivery surcharges'
);
assert.strictEqual(pricingOptium.totalEstimatedAmount, 7180 + 1292, 'Total must be ₹8,472 without delivery additions');
console.log(`[PASS] Shipping excluded from estimate total: Subtotal ₹${pricingOptium.subtotal} + Tax ₹${pricingOptium.gstAmount} = Total ₹${pricingOptium.totalEstimatedAmount} (Delivery: ${pricingOptium.delivery.formattedDelivery})`);

// -------------------------------------------------------------
// TEST GROUP 3: SNAPSHOT INTEGRITY & DEEP COPY IMMUTABILITY
// -------------------------------------------------------------
console.log('\n--- 3. SNAPSHOT DEEP COPY & STATE IMMUTABILITY ---');
const mutableFrame = { ...sampleFrame };
const mutableCustomer = {
  fullName: 'Arun Kulkarni',
  phone: '9820011223',
  addressLine1: 'MG Road',
  city: 'Pune',
  state: 'Maharashtra',
  postalCode: '411001'
};

const input: CreateQuotationInput = {
  frame: mutableFrame,
  width: 16,
  height: 20,
  unit: 'in',
  aspectRatioLabel: '4:5 Standard Portrait',
  mat: sampleMat,
  artwork: sampleArt,
  artworkFit: 'fill',
  glazing: optiumGlazing,
  mounting: MOUNTING_OPTIONS[0],
  customer: mutableCustomer,
};

const snapshot = createQuotationSnapshot(input);

// Mutate source inputs after snapshot creation
mutableFrame.name = 'CORRUPTED FRAME NAME';
mutableFrame.profileWidth = 999;
mutableCustomer.fullName = 'CORRUPTED CUSTOMER';
(input as any).width = 999;

// Assert snapshot remains 100% pristine
assert.strictEqual(snapshot.specifications.frameName, 'Ornate Antique Bronze & Silver Leaf', 'Snapshot frameName must not mutate');
assert.strictEqual(snapshot.specifications.profileWidth, 3.25, 'Snapshot profileWidth must not mutate');
assert.strictEqual(snapshot.customer.fullName, 'Arun Kulkarni', 'Snapshot customer fullName must not mutate');
assert.strictEqual(snapshot.specifications.width, 16, 'Snapshot opening width must not mutate');
console.log('[PASS] Full deep-clone immutability verified: Runtime object mutations do NOT contaminate created snapshot');

// Verify glazing & mounting preservation
assert.strictEqual(snapshot.specifications.glazingId, 'optium', 'Glazing ID preserved');
assert.strictEqual(snapshot.specifications.glazingPriceDelta, 1800, 'Glazing delta preserved');
assert.strictEqual(snapshot.specifications.mountingId, 'french-cleat', 'Mounting ID preserved');
console.log('[PASS] Glazing & Mounting specifications faithfully preserved in snapshot');

// Verify finished outer dimensions
// 16 + 2 * (2.5 + 3.25) = 27.5
// 20 + 2 * (2.5 + 3.25) = 31.5
assert.strictEqual(snapshot.specifications.finishedOuterWidth, 27.5, 'Finished outer width correctly computed');
assert.strictEqual(snapshot.specifications.finishedOuterHeight, 31.5, 'Finished outer height correctly computed');
console.log('[PASS] Finished outer frame dimensions verified: 27.50 × 31.50 in');

// -------------------------------------------------------------
// TEST GROUP 4: SNAPSHOT VALIDATION
// -------------------------------------------------------------
console.log('\n--- 4. UNTRUSTED SNAPSHOT SCHEMA VALIDATION ---');
const validResult = validateQuotationSnapshot(snapshot);
assert.strictEqual(validResult.valid, true, 'Valid snapshot must pass validation');

const invalidSnapshot = { ...snapshot, id: '', specifications: { width: -10 } };
const invalidResult = validateQuotationSnapshot(invalidSnapshot);
assert.strictEqual(invalidResult.valid, false, 'Corrupted snapshot must fail validation');
assert(invalidResult.errors.length >= 2, 'Must report multiple errors for corrupt fields');
console.log(`[PASS] Snapshot validator correctly rejects corrupt/missing fields (${invalidResult.errors.length} errors caught)`);

// -------------------------------------------------------------
// TEST GROUP 5: STORAGE CAPACITY SAFETY (ZERO SILENT EVICTION)
// -------------------------------------------------------------
console.log('\n--- 5. STORAGE CAPACITY SAFETY & ZERO SILENT FIFO EVICTION ---');
clearAllQuotations();

// Save up to MAX_STORED_QUOTATIONS (50)
for (let i = 0; i < MAX_STORED_QUOTATIONS; i++) {
  const q = createQuotationSnapshot({
    ...input,
    existingId: `quot-seed-${i}`,
    existingQuotationNumber: `SA-Q-2026-${String(i).padStart(4, '0')}`,
    customer: { ...mutableCustomer, fullName: `Client ${i}` }
  });
  const res = saveQuotation(q);
  assert.strictEqual(res.success, true, `Item ${i} must save successfully`);
}

const metaAtCapacity = getStorageMetadata();
assert.strictEqual(metaAtCapacity.count, 50, 'Storage count must be exactly 50');
assert.strictEqual(metaAtCapacity.isAtCapacity, true, 'Storage must report isAtCapacity: true');

// Attempt to save 51st new quotation
const overflowQuote = createQuotationSnapshot({
  ...input,
  existingId: 'quot-overflow-51',
  existingQuotationNumber: 'SA-Q-2026-9999',
  customer: { ...mutableCustomer, fullName: 'Overflow Client' }
});

const overflowResult = saveQuotation(overflowQuote);
assert.strictEqual(overflowResult.success, false, 'Overflow quotation must be rejected');
assert.strictEqual(overflowResult.status, 'capacity_reached', 'Status must be capacity_reached');

// CRUCIAL AUDIT CHECK: Verify NO silent FIFO eviction occurred!
const allAfterOverflow = getSavedQuotations();
assert.strictEqual(allAfterOverflow.length, 50, 'Total count must remain exactly 50');
const oldestPreserved = getQuotationById('quot-seed-0');
assert(oldestPreserved !== null, 'OLDEST QUOTATION MUST STILL EXIST: ZERO SILENT FIFO DELETION');
console.log('[PASS] Storage capacity verified: 51st item rejected with capacity_reached; 0 older items evicted silently');

// Updating existing quotation at capacity must succeed without increasing count
const updateResult = saveQuotation({
  ...oldestPreserved!,
  customer: { ...oldestPreserved!.customer, notes: 'Updated notes at capacity' }
});
assert.strictEqual(updateResult.success, true, 'Updating existing item at capacity must succeed');
assert.strictEqual(updateResult.status, 'updated', 'Status must be updated');
assert.strictEqual(getSavedQuotations().length, 50, 'Count must still remain 50 after update');
console.log('[PASS] Update in-place at capacity succeeds without growing storage ledger');

// Explicit user-confirmed deletion
const deleteResult = deleteQuotation('quot-seed-0');
assert.strictEqual(deleteResult, true, 'Explicit deletion must succeed');
assert.strictEqual(getSavedQuotations().length, 49, 'Count must drop to 49 after explicit deletion');
console.log('[PASS] Explicit deletion confirmed: Count safely decremented to 49');

// -------------------------------------------------------------
// TEST GROUP 6: RAPID GENERATION & IDENTIFIER UNIQUENESS
// -------------------------------------------------------------
console.log('\n--- 6. RAPID REFERENCE GENERATION & COLLISION RESISTANCE ---');
const generatedIds = new Set<string>();
const generatedRefs = new Set<string>();
const ITERATIONS = 100;

for (let i = 0; i < ITERATIONS; i++) {
  const ids = generateQuotationIdentifiers(generatedIds, generatedRefs);
  assert(!generatedIds.has(ids.id), `Duplicate ID generated: ${ids.id}`);
  assert(!generatedRefs.has(ids.quotationNumber), `Duplicate reference number generated: ${ids.quotationNumber}`);
  generatedIds.add(ids.id);
  generatedRefs.add(ids.quotationNumber);
}

assert.strictEqual(generatedIds.size, ITERATIONS, `Must generate ${ITERATIONS} unique IDs`);
assert.strictEqual(generatedRefs.size, ITERATIONS, `Must generate ${ITERATIONS} unique reference numbers`);
console.log(`[PASS] Generated ${ITERATIONS} rapid quotations in tight loop: 100% collision-free uniqueness`);

// -------------------------------------------------------------
// TEST GROUP 7: STORAGE QUOTA EXCEEDED ERROR ISOLATION
// -------------------------------------------------------------
console.log('\n--- 7. STORAGE QUOTA EXCEEDED ERROR ISOLATION ---');
// Mock QuotaExceededError
(global as any).localStorage.setItem = () => {
  const quotaErr: any = new Error('The quota has been exceeded.');
  quotaErr.name = 'QuotaExceededError';
  quotaErr.code = 22;
  throw quotaErr;
};

const quotaTestResult = saveQuotation(snapshot);
assert.strictEqual(quotaTestResult.success, false, 'Must fail on QuotaExceededError');
assert.strictEqual(quotaTestResult.status, 'quota_error', 'Must report quota_error status');
assert(quotaTestResult.message.includes('Browser storage quota exceeded'), 'Must provide clear user-facing error message');
console.log('[PASS] QuotaExceededError trapped and reported cleanly without data corruption');

console.log('\n=============================================================');
console.log('ALL PHASE 5 STAGE 2.1 BEHAVIORAL RUNTIME TESTS PASSED (7/7)');
console.log('=============================================================\n');
