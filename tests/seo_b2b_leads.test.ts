import assert from 'assert';

const memoryStorage = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string) => (memoryStorage.has(k) ? memoryStorage.get(k)! : null),
    setItem: (k: string, v: string) => memoryStorage.set(k, String(v)),
    removeItem: (k: string) => memoryStorage.delete(k),
    clear: () => memoryStorage.clear(),
  },
  location: { search: '', pathname: '/', origin: 'https://sanskrutiarts.com', href: 'https://sanskrutiarts.com/configurator' },
};
(globalThis as unknown as Record<string, unknown>).localStorage = (
  globalThis as unknown as { window: { localStorage: Storage } }
).window.localStorage;

import { FRAME_SAMPLES } from '../src/data/frames';
import { WHOLESALE_MOULDINGS, getWholesaleItemForFrame } from '../src/data/wholesale';
import { parseRoute } from '../src/utils/routes';
import {
  computeRouteMeta,
  buildLocalBusinessSchema,
  buildProductSchema,
  buildFaqSchema,
} from '../src/utils/seo';
import {
  saveLead,
  getSavedLeads,
  deleteSavedLead,
  exportLeadsToCsv,
  LEADS_STORAGE_KEY,
  MAX_STORED_LEADS,
} from '../src/utils/leadStorage';
import {
  getWhatsAppNumber,
  isPlaceholderWhatsAppConfigured,
  DEFAULT_OFFICIAL_WHATSAPP,
  formatIndianDisplayPhone,
} from '../src/utils/whatsapp';

console.log('\n=============================================================');
console.log('   SEO, B2B WHOLESALE & LOCALSTORAGE LEAD PIPELINE SUITE     ');
console.log('=============================================================');

// 1. B2B Wholesale SKU alignment with active Workshop Originals
const activeIds = new Set(FRAME_SAMPLES.map((f) => f.id));
for (const ws of WHOLESALE_MOULDINGS) {
  assert(activeIds.has(ws.frameId), `Wholesale item ${ws.sku} must point to active frameId (${ws.frameId})`);
}
const workshopFrames = FRAME_SAMPLES.filter((f) => f.isWorkshopSample);
assert.strictEqual(workshopFrames.length, 17, '17 Workshop Originals expected');
for (const wf of workshopFrames) {
  const ws = getWholesaleItemForFrame(wf.id, wf);
  assert(ws, `Workshop Original ${wf.id} must resolve explicit wholesale carton item`);
  assert(ws.stickLengthFeet === 9.0 || ws.stickLengthFeet === 9.5);
  assert(ws.totalFootagePerBox > 0 && ws.minOrderBoxes >= 1);
  assert(ws.tierDiscounts && ws.tierDiscounts.length >= 2);
}
const legacyFrames = FRAME_SAMPLES.filter((f) => !f.isWorkshopSample);
assert.strictEqual(legacyFrames.length, 8, '8 legacy heritage profiles expected');
console.log('[PASS] 1. All 3 explicit wholesale cartons + all 17 Workshop Originals aligned cleanly');

// 2. High-intent SEO entry routes
const photoRoute = parseRoute('/custom-photo-framing');
assert.strictEqual(photoRoute.route, 'configure');
assert.strictEqual(photoRoute.presetIntent, 'custom-photo-framing');

const canvasRoute = parseRoute('/canvas-framing');
assert.strictEqual(canvasRoute.route, 'configure');
assert.strictEqual(canvasRoute.presetIntent, 'canvas-framing');

const wholesaleRoute = parseRoute('/wholesale-mouldings');
assert.strictEqual(wholesaleRoute.route, 'catalog');
assert.strictEqual(wholesaleRoute.presetIntent, 'wholesale-mouldings');
console.log('[PASS] 2. High-intent SEO entry routes parsed cleanly');

// 3. Dynamic Document Meta & Structured Data JSON-LD
const homeMeta = computeRouteMeta(parseRoute('/'), FRAME_SAMPLES[0]);
assert.strictEqual(homeMeta.title, 'Sanskruti Arts Atelier | Custom Picture Framing & Moulding Manufacturer India');
assert.strictEqual(homeMeta.robots, 'index, follow');

const catMeta = computeRouteMeta(parseRoute('/catalog'), FRAME_SAMPLES[0]);
assert.strictEqual(catMeta.title, 'Picture Frame Moulding Catalogue — Retail & B2B Wholesale Cartons | Sanskruti Arts');

const prodMeta = computeRouteMeta(parseRoute(`/product/${workshopFrames[0].id}`), workshopFrames[0], workshopFrames[0]);
assert(prodMeta.title.includes(workshopFrames[0].name) && prodMeta.title.includes(`#${workshopFrames[0].id}`));

const reviewMeta = computeRouteMeta(parseRoute('/review'), workshopFrames[0]);
assert.strictEqual(reviewMeta.robots, 'noindex, nofollow');
const ledgerMeta = computeRouteMeta(parseRoute('/quotations'), workshopFrames[0]);
assert.strictEqual(ledgerMeta.robots, 'noindex, nofollow');

const lbSchema = buildLocalBusinessSchema();
assert.strictEqual(lbSchema.currenciesAccepted, 'INR');
const prodSchema = buildProductSchema(workshopFrames[0]);
assert.strictEqual((prodSchema.offers as { priceCurrency: string }).priceCurrency, 'INR');
const faqSchema = buildFaqSchema();
assert.strictEqual((faqSchema.mainEntity as unknown[]).length, 3);
console.log('[PASS] 3. Dynamic route metadata, noindex protection, and JSON-LD schemas verified');

// 4. LocalStorage Lead Pipeline & CSV Export
assert.strictEqual(getWhatsAppNumber(), DEFAULT_OFFICIAL_WHATSAPP);
assert.strictEqual(getWhatsAppNumber(), '918793242979');
assert.strictEqual(formatIndianDisplayPhone(), '+91 87932 42979');
assert.strictEqual(isPlaceholderWhatsAppConfigured(), false);

const saved1 = saveLead({
  leadType: 'sample_kit',
  clientName: 'Ar. Meera Nair',
  mobile: '+91 9820199001',
  cityOrPin: 'Mumbai, Maharashtra',
  skus: ['SAA-AGB-15', 'SAA-MHG-23'],
  configurationUrl: 'https://sanskrutiarts.com/catalog',
  notes: 'Architect Chevron Kit',
});
assert.strictEqual(saved1.success, true);

const saved2 = saveLead({
  leadType: 'quick_quote',
  clientName: 'Rohan Kulkarni',
  mobile: '9820122334',
  cityOrPin: 'Pune, 411004',
  skus: ['SAA-MHG-23'],
  configurationUrl: 'https://sanskrutiarts.com/custom-photo-framing',
  estimatedTotalINR: 7450,
});
assert.strictEqual(saved2.success, true);

const leads = getSavedLeads();
assert.strictEqual(leads.length, 2);
assert.strictEqual(leads[0].clientName, 'Rohan Kulkarni');
assert(memoryStorage.get(LEADS_STORAGE_KEY)?.includes('SAA-MHG-23'));

const csv = exportLeadsToCsv(leads);
assert(csv.includes('Lead Type') && csv.includes('Trade Sample Kit') && csv.includes('Quick Quote') && csv.includes('7450'));

// Capacity clamp test (max 100 entries)
for (let i = 0; i < MAX_STORED_LEADS + 5; i++) {
  saveLead({ leadType: 'quick_quote', clientName: `Lead ${i}`, skus: ['SAA-BGD-08'] });
}
assert.strictEqual(getSavedLeads().length, MAX_STORED_LEADS);
assert.strictEqual(deleteSavedLead(getSavedLeads()[0].id), true);
assert.strictEqual(getSavedLeads().length, MAX_STORED_LEADS - 1);
console.log('[PASS] 4. LocalStorage lead persistence, CSV export, and 100-entry bound verified');

console.log('\n[SUCCESS] All SEO, B2B Wholesale & LocalStorage Lead Pipeline checks passed.\n');
