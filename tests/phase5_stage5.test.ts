import assert from 'assert';
import { validateCustomerDetails } from '../src/components/QuotationReviewPage';
import {
  buildQuotationWhatsAppHandoff,
  formatQuotationWhatsAppMessage,
  validateWhatsAppDestination,
  MAX_WHATSAPP_URL_LENGTH,
} from '../src/utils/quotationEnquiry';
import {
  createQuotationSnapshot,
  getQuotationStatusLabel,
  CustomerDetails,
} from '../src/types/quotation';
import { WORKSHOP_MOULDINGS } from '../src/data/workshopSamples';
import { MAT_OPTIONS, ARTWORK_OPTIONS } from '../src/data/frames';
import { GLAZING_OPTIONS, MOUNTING_OPTIONS } from '../src/components/CustomFramingStudio';
import { formatINR } from '../src/utils/pricing';

console.log('\n=============================================================');
console.log('   PHASE 5 STAGE 5: CUSTOMER & WHATSAPP HANDOFF TESTS        ');
console.log('=============================================================');

// 1. Customer Validation Tests (Optional Email + +91 support)
console.log('\n--- 1. CUSTOMER DETAILS VALIDATION ---');
const validNoEmail: CustomerDetails = {
  fullName: 'Meera Nair',
  phone: '+91 98200-54321',
  email: '',
  addressLine1: '42 Indiranagar 100 Feet Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560038',
};
const resNoEmail = validateCustomerDetails(validNoEmail);
assert.strictEqual(resNoEmail.isValid, true, 'Optional empty email should be accepted when other required fields are valid');

const badEmailProvided: CustomerDetails = {
  ...validNoEmail,
  email: 'invalid-email@',
};
const resBadEmail = validateCustomerDetails(badEmailProvided);
assert.strictEqual(resBadEmail.isValid, false, 'Malformed email must be rejected when provided');
assert(resBadEmail.errors.email, 'Inline error must specify email field');

const badFields: CustomerDetails = {
  fullName: 'A',
  phone: '1234567890', // starts with 1 (invalid Indian mobile)
  email: 'ok@example.com',
  addressLine1: 'abc',
  city: 'M',
  state: '',
  postalCode: '012345', // starts with 0 (invalid PIN)
};
const resBadFields = validateCustomerDetails(badFields);
assert.strictEqual(resBadFields.isValid, false);
assert(resBadFields.errors.fullName && resBadFields.errors.phone && resBadFields.errors.addressLine1 && resBadFields.errors.city && resBadFields.errors.state && resBadFields.errors.postalCode);
console.log('[PASS] Indian mobile (+91), 6-digit PIN, required address fields, and optional email validation passed');

// 2. Snapshot-Based WhatsApp Message & Exact Financial Parity
console.log('\n--- 2. WHATSAPP MESSAGE & PRICING PARITY ---');
const validWithEmail: CustomerDetails = {
  ...validNoEmail,
  email: 'meera.nair@example.com',
  notes: 'Please include brass corner hanging hardware.',
};

const snap = createQuotationSnapshot({
  frame: WORKSHOP_MOULDINGS[0], // SAA-FLR-01
  width: 20,
  height: 24,
  unit: 'in',
  aspectRatioLabel: '4:5 Standard Portrait',
  mat: MAT_OPTIONS[0],
  artwork: ARTWORK_OPTIONS[0],
  artworkFit: 'fill',
  glazing: GLAZING_OPTIONS[1], // UltraVue (+950)
  mounting: MOUNTING_OPTIONS[0],
  customer: validWithEmail,
  existingId: 'quot-stage5-test',
  existingQuotationNumber: 'SA-Q-2026-5501',
});

snap.status = 'ready';

const msg = formatQuotationWhatsAppMessage(snap);

// Check Reference, Specs & Customer Info
assert(msg.includes('#SA-Q-2026-5501'), 'Must contain quotation reference number');
assert(msg.includes('Florentine Acanthus Baroque Gilt') && msg.includes('SAA-FLR-01'), 'Must contain moulding name & SKU');
assert(msg.includes('20 × 24 in'), 'Must contain exact opening dimensions & unit');
assert(msg.includes('Museum Cotton Rag (Off-White)'), 'Must contain matboard details');
assert(msg.includes('Girl with a Pearl Earring'), 'Must contain artwork title');
assert(msg.includes(GLAZING_OPTIONS[1].name), 'Must contain glazing name');
assert(msg.includes(MOUNTING_OPTIONS[0].name), 'Must contain mounting hardware');
assert(msg.includes('Meera Nair') && msg.includes('560038'), 'Must contain customer details');

// Exact Financial Parity against frozen snapshot
assert(msg.includes(formatINR(snap.pricing.mouldingCost)), 'Moulding cost must match snapshot');
assert(msg.includes(formatINR(snap.pricing.matCost)), 'Mat cost must match snapshot');
assert(msg.includes(formatINR(snap.pricing.assemblyCost)), 'Assembly cost must match snapshot');
assert(msg.includes(`+${formatINR(snap.pricing.glazingDelta)}`), 'Glazing adjustment must match snapshot');
assert(msg.includes(`Taxable Subtotal: ${snap.pricing.formattedSubtotal}`), 'Subtotal must match snapshot');
assert(msg.includes(`GST — Provisional Estimate (18%): ${snap.pricing.formattedGst}`), 'GST must match snapshot and state provisional');
assert(msg.includes('Delivery: To be confirmed by workshop (Excluded)'), 'Delivery must remain excluded');
assert(msg.includes(`Estimated Total (Excl. Delivery): ${snap.pricing.formattedTotal}`), 'Total must match snapshot');

// Disclosures & Zero False Order Confirmation
assert(msg.includes('This is an enquiry, not a confirmed order'), 'Must disclaim enquiry vs confirmed order');
assert(!msg.toLowerCase().includes('order confirmed'), 'Must never claim order confirmed');
console.log('[PASS] Generated WhatsApp message matches every snapshot specification and INR price line verbatim');

// 3. URL Encoding, Business Phone Validation & Length Safety
console.log('\n--- 3. WHATSAPP DESTINATION VALIDATION & URL ENCODING ---');
const handoff = buildQuotationWhatsAppHandoff(snap, '919820000000');
assert.strictEqual(handoff.ok, true);
assert(handoff.url && handoff.url.startsWith('https://wa.me/919820000000?text='));
assert(handoff.url.length <= MAX_WHATSAPP_URL_LENGTH, `URL length ${handoff.url.length} must stay within safe limit`);

// Decode roundtrip check
const parsedUrl = new URL(handoff.url!);
assert.strictEqual(parsedUrl.searchParams.get('text'), msg, 'URL encoding roundtrip must preserve exact ₹ and × characters');

// Missing / Invalid destination phone checks
assert.strictEqual(validateWhatsAppDestination('').valid, false, 'Empty destination phone rejected');
assert.strictEqual(validateWhatsAppDestination('12345').valid, false, 'Too-short destination phone rejected');
assert.strictEqual(validateWhatsAppDestination('0000000000').valid, false, 'All-zeroes destination phone rejected');
const badPhoneHandoff = buildQuotationWhatsAppHandoff(snap, '123');
assert.strictEqual(badPhoneHandoff.ok, false);
assert.strictEqual(badPhoneHandoff.url, null);
console.log('[PASS] Business phone validation & URL encoding roundtrip verified');

// Invalid / Corrupt Snapshot Rejection
const corruptSnap: any = { id: '', specifications: { width: -5 } };
const corruptHandoff = buildQuotationWhatsAppHandoff(corruptSnap, '919820000000');
assert.strictEqual(corruptHandoff.ok, false);
assert.strictEqual(corruptHandoff.url, null);
console.log('[PASS] Invalid/corrupted snapshot blocked from generating WhatsApp link');

// Long notes compact fallback test
const verboseSnap = createQuotationSnapshot({
  frame: WORKSHOP_MOULDINGS[0],
  width: 20,
  height: 24,
  unit: 'in',
  aspectRatioLabel: '4:5',
  mat: MAT_OPTIONS[0],
  artwork: ARTWORK_OPTIONS[0],
  artworkFit: 'fill',
  glazing: GLAZING_OPTIONS[1],
  mounting: MOUNTING_OPTIONS[0],
  customer: {
    ...validWithEmail,
    notes: 'Detailed gallery exhibition hanging note '.repeat(25),
  },
});
const verboseHandoff = buildQuotationWhatsAppHandoff(verboseSnap, '919820000000');
assert.strictEqual(verboseHandoff.ok, true);
assert(verboseHandoff.url!.length <= MAX_WHATSAPP_URL_LENGTH, 'URL must fit within 2000 chars even with verbose input');
console.log(`[PASS] URL length guardrail verified (${verboseHandoff.url!.length} chars, compact=${verboseHandoff.usedCompactFallback})`);

// 4. Honest Status Labels
assert.strictEqual(getQuotationStatusLabel('draft'), 'Draft');
assert.strictEqual(getQuotationStatusLabel('ready'), 'Ready to Send');
assert.strictEqual(getQuotationStatusLabel('whatsapp_opened'), 'WhatsApp Opened — Awaiting Customer Send');
console.log('[PASS] Honest client-side status descriptions verified');

console.log('\n=============================================================');
console.log('ALL PHASE 5 STAGE 5 BEHAVIORAL TESTS PASSED');
console.log('=============================================================\n');
