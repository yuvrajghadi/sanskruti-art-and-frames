import assert from 'assert';
import { validateCustomerDetails } from '../src/components/QuotationReviewPage';
import { createQuotationSnapshot, CustomerDetails } from '../src/types/quotation';
import { WORKSHOP_MOULDINGS } from '../src/data/workshopSamples';
import { MAT_OPTIONS, ARTWORK_OPTIONS } from '../src/data/frames';
import { GLAZING_OPTIONS, MOUNTING_OPTIONS } from '../src/components/CustomFramingStudio';
import { calculateFramePrice, GST_RATE } from '../src/utils/pricing';

console.log('\n=============================================================');
console.log('   PHASE 5 STAGE 3: BEHAVIORAL UNIT TESTS                    ');
console.log('=============================================================');

// 1. Customer Validation Tests
console.log('\n--- 1. CUSTOMER DETAILS VALIDATION ---');
const invalidCustomer: CustomerDetails = {
  fullName: 'A',
  phone: '12345',
  email: 'not-an-email',
  addressLine1: '12',
  city: '',
  state: '',
  postalCode: '000012',
};
const invalidRes = validateCustomerDetails(invalidCustomer);
assert.strictEqual(invalidRes.isValid, false, 'Must reject invalid customer fields');
assert(invalidRes.errors.fullName, 'Must validate minimum name length');
assert(invalidRes.errors.phone, 'Must reject invalid Indian mobile starting with <6 or <10 digits');
assert(invalidRes.errors.email, 'Must reject malformed email');
assert(invalidRes.errors.addressLine1, 'Must reject too-short street address');
assert(invalidRes.errors.city, 'Must reject empty city');
assert(invalidRes.errors.state, 'Must reject empty state');
assert(invalidRes.errors.postalCode, 'Must reject PIN starting with 0');
console.log('[PASS] Rejects invalid name, phone, email, address, city, state, and PIN');

const validCustomerWithPrefix: CustomerDetails = {
  fullName: 'Ananya Deshmukh',
  phone: '+91 98200-12345',
  email: 'ananya@sanskruti.example.com',
  addressLine1: '14 Kala Ghoda, Fort',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400001',
};
const validRes = validateCustomerDetails(validCustomerWithPrefix);
assert.strictEqual(validRes.isValid, true, 'Must accept valid +91 formatted phone and 6-digit PIN');
assert.strictEqual(Object.keys(validRes.errors).length, 0);
console.log('[PASS] Accepts valid Indian customer profile with +91 prefix and 400001 PIN');

// 2. Snapshot Pricing Parity with pricing.ts & Delivery Exclusion
console.log('\n--- 2. SNAPSHOT PRICING PARITY & COMMERCIAL INTEGRITY ---');
const frame = WORKSHOP_MOULDINGS[0]; // SAA-FLR-01
const mat = MAT_OPTIONS[0]; // Museum Cotton Rag
const glazing = GLAZING_OPTIONS[1]; // UltraVue (+950)
const mounting = MOUNTING_OPTIONS[1]; // Aircraft wire

const base = calculateFramePrice(frame, 18, 24, 'in', mat, 'INR');
const expectedSub = base.subtotal! + glazing.priceDelta;
const expectedGst = Math.round(expectedSub * GST_RATE);

const snap = createQuotationSnapshot({
  frame,
  width: 18,
  height: 24,
  unit: 'in',
  aspectRatioLabel: '3:4 Classic',
  mat,
  artwork: ARTWORK_OPTIONS[0],
  artworkFit: 'fit',
  glazing,
  mounting,
  customer: validCustomerWithPrefix,
});

assert.strictEqual(snap.pricing.mouldingCost, base.moldingCost);
assert.strictEqual(snap.pricing.matCost, base.matCost);
assert.strictEqual(snap.pricing.assemblyCost, base.glassAndAssemblyCost);
assert.strictEqual(snap.pricing.glazingDelta, 950);
assert.strictEqual(snap.pricing.subtotal, expectedSub);
assert.strictEqual(snap.pricing.gstAmount, expectedGst);
assert.strictEqual(snap.pricing.shippingCost, null, 'Delivery must remain null/excluded');
assert.strictEqual(snap.pricing.totalEstimatedAmount, expectedSub + expectedGst, 'Grand total excludes unapproved delivery');
assert.strictEqual(snap.pricing.tax.status, 'provisional-estimate');
assert.strictEqual(snap.pricing.delivery.status, 'to-be-confirmed-by-workshop');
console.log(`[PASS] Snapshot pricing matches pricing.ts 100%: Subtotal ₹${expectedSub} + Provisional GST ₹${expectedGst} = ₹${snap.pricing.totalEstimatedAmount}`);

console.log('\n=============================================================');
console.log('ALL PHASE 5 STAGE 3 BEHAVIORAL UNIT TESTS PASSED');
console.log('=============================================================\n');
