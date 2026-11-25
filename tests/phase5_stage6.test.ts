import assert from 'assert';

// Minimal localStorage & window shim for headless Node behavioral testing
const memoryStorage = new Map<string, string>();
let quotaTrapEnabled = false;

const localStorageMock = {
  getItem: (k: string) => (memoryStorage.has(k) ? memoryStorage.get(k)! : null),
  setItem: (k: string, v: string) => {
    if (quotaTrapEnabled) {
      const err = new Error('QuotaExceededError') as Error & { name: string };
      err.name = 'QuotaExceededError';
      throw err;
    }
    memoryStorage.set(k, String(v));
  },
  removeItem: (k: string) => {
    memoryStorage.delete(k);
  },
  clear: () => {
    memoryStorage.clear();
  },
};

(globalThis as unknown as Record<string, unknown>).window = {
  localStorage: localStorageMock,
  location: { search: '', pathname: '/' },
};
(globalThis as unknown as Record<string, unknown>).localStorage = localStorageMock;

import {
  createQuotationSnapshot,
  generateQuotationIdentifiers,
  getQuotationStatusLabel,
  CustomerDetails,
} from '../src/types/quotation';
import {
  QUOTATION_STORAGE_KEY,
  QUOTATION_RECOVERY_BACKUP_KEY,
  MAX_STORED_QUOTATIONS,
  getSavedQuotations,
  saveQuotation,
  getQuotationById,
  loadValidatedQuotationById,
  deleteQuotation,
  clearAllQuotations,
  inspectSavedQuotationsLedger,
  purgeCorruptedLedgerEntries,
  resetMalformedLedgerWithBackup,
} from '../src/utils/quotationStorage';
import {
  computeArtworkAssetId,
  loadCustomArtworkAsset,
  deleteArtworkAssetIfUnreferenced,
} from '../src/utils/artworkStorage';
import { parseRoute, getRoutePath } from '../src/utils/routes';
import {
  filterAndSortQuotations,
  normalizeQuotationStatus,
} from '../src/components/SavedQuotationsPage';
import { WORKSHOP_MOULDINGS } from '../src/data/workshopSamples';
import { MAT_OPTIONS, ARTWORK_OPTIONS } from '../src/data/frames';
import { GLAZING_OPTIONS, MOUNTING_OPTIONS } from '../src/components/CustomFramingStudio';

function makeCustomer(name: string, city = 'Mumbai'): CustomerDetails {
  return {
    fullName: name,
    phone: '9820012345',
    email: 'atelier@example.com',
    addressLine1: '14 Kala Ghoda Lane',
    city,
    state: 'Maharashtra',
    postalCode: '400001',
    notes: '',
  };
}

function makeSnapshot(opts: {
  id: string;
  num: string;
  frameIdx?: number;
  width?: number;
  height?: number;
  customerName?: string;
  status?: 'draft' | 'ready' | 'whatsapp_opened' | 'issued' | 'enquired';
  createdAt?: string;
  customArtUrl?: string | null;
  customArtAssetId?: string | null;
}) {
  const snap = createQuotationSnapshot({
    frame: WORKSHOP_MOULDINGS[opts.frameIdx ?? 0],
    width: opts.width ?? 16,
    height: opts.height ?? 20,
    unit: 'in',
    aspectRatioLabel: '4:5',
    mat: MAT_OPTIONS[0],
    artwork: opts.customArtAssetId
      ? {
          id: 'custom-upload',
          title: 'Custom Uploaded Artwork',
          artist: 'Customer Asset',
          imageUrl: '',
          aspectRatio: 0.8,
        }
      : ARTWORK_OPTIONS[0],
    customArtUrl: opts.customArtUrl ?? null,
    customArtAssetId: opts.customArtAssetId ?? null,
    artworkFit: 'fill',
    glazing: GLAZING_OPTIONS[0],
    mounting: MOUNTING_OPTIONS[0],
    customer: makeCustomer(opts.customerName ?? 'Aarav Kulkarni'),
    existingId: opts.id,
    existingQuotationNumber: opts.num,
  });
  snap.status = opts.status ?? 'draft';
  if (opts.createdAt) {
    snap.createdAt = opts.createdAt;
    snap.updatedAt = opts.createdAt;
  }
  return snap;
}

async function run() {
  console.log('\n=============================================================');
  console.log('   PHASE 5 STAGE 6: MULTI-QUOTATION & PERSISTENCE QA TESTS   ');
  console.log('=============================================================');

  // 1. Routing & Route Path Generation
  assert.strictEqual(parseRoute('/quotations').route, 'quotations');
  assert.strictEqual(parseRoute('/saved-quotations').route, 'quotations');
  assert.strictEqual(getRoutePath('quotations'), '/quotations');
  console.log('[PASS] 1. Multi-draft /quotations route parsing and formatting');

  // 2. Multi-Quotation Independence & Retrieval
  memoryStorage.clear();
  const q1 = makeSnapshot({
    id: 'q-stage6-01',
    num: 'SA-Q-2026-6001',
    frameIdx: 0,
    width: 12,
    height: 16,
    customerName: 'Kavita Rao',
    status: 'draft',
    createdAt: '2026-11-20T10:00:00.000Z',
  });
  const q2 = makeSnapshot({
    id: 'q-stage6-02',
    num: 'SA-Q-2026-6002',
    frameIdx: 2,
    width: 24,
    height: 36,
    customerName: 'Rohan Desai',
    status: 'ready',
    createdAt: '2026-11-22T10:00:00.000Z',
  });
  const q3 = makeSnapshot({
    id: 'q-stage6-03',
    num: 'SA-Q-2026-6003',
    frameIdx: 3,
    width: 18,
    height: 24,
    customerName: 'Meera Nair',
    status: 'whatsapp_opened',
    createdAt: '2026-11-24T10:00:00.000Z',
  });

  assert.strictEqual(saveQuotation(q1).success, true);
  assert.strictEqual(saveQuotation(q2).success, true);
  assert.strictEqual(saveQuotation(q3).success, true);

  const savedAll = getSavedQuotations();
  assert.strictEqual(savedAll.length, 3, 'All 3 distinct quotations should coexist independently');
  assert.strictEqual(getQuotationById('q-stage6-02')?.quotationNumber, 'SA-Q-2026-6002');
  assert.strictEqual(loadValidatedQuotationById('SA-Q-2026-6001').status, 'found');

  // Updating Q1 does not touch Q2 pricing or specs
  const q1Updated = { ...q1, customer: makeCustomer('Kavita Rao-Shah', 'Pune') };
  assert.strictEqual(saveQuotation(q1Updated).success, true);
  assert.strictEqual(getQuotationById('q-stage6-02')?.customer.fullName, 'Rohan Desai');
  assert.strictEqual(getQuotationById('q-stage6-02')?.pricing.totalEstimatedAmount, q2.pricing.totalEstimatedAmount);
  console.log('[PASS] 2. Multi-quotation coexistence, lookup by ID/Ref, and update isolation');

  // 3. Search, Status Filtering, Sorting & Honest Status Labels
  assert.strictEqual(normalizeQuotationStatus('issued'), 'ready');
  assert.strictEqual(normalizeQuotationStatus('enquired'), 'whatsapp_opened');
  assert.strictEqual(getQuotationStatusLabel('draft'), 'Draft');
  assert.strictEqual(getQuotationStatusLabel('ready'), 'Ready to Send');
  assert.strictEqual(getQuotationStatusLabel('whatsapp_opened'), 'WhatsApp Opened — Awaiting Customer Send');

  const list = getSavedQuotations();
  assert.strictEqual(
    filterAndSortQuotations(list, { searchQuery: '6002' }).map((q) => q.id).join(','),
    'q-stage6-02',
    'Search by quotation reference should match SA-Q-2026-6002'
  );
  assert.strictEqual(
    filterAndSortQuotations(list, { searchQuery: 'meera' }).map((q) => q.id).join(','),
    'q-stage6-03',
    'Search by customer name should match Meera Nair'
  );
  assert.strictEqual(
    filterAndSortQuotations(list, { statusFilter: 'whatsapp_opened' }).length,
    1
  );
  assert.deepStrictEqual(
    filterAndSortQuotations(list, { sortBy: 'newest' }).map((q) => q.id),
    ['q-stage6-03', 'q-stage6-02', 'q-stage6-01']
  );
  assert.deepStrictEqual(
    filterAndSortQuotations(list, { sortBy: 'oldest' }).map((q) => q.id),
    ['q-stage6-01', 'q-stage6-02', 'q-stage6-03']
  );
  const byAmountDesc = filterAndSortQuotations(list, { sortBy: 'amount_desc' });
  assert(
    byAmountDesc[0].pricing.totalEstimatedAmount >= byAmountDesc[1].pricing.totalEstimatedAmount &&
      byAmountDesc[1].pricing.totalEstimatedAmount >= byAmountDesc[2].pricing.totalEstimatedAmount,
    'amount_desc must order highest total first'
  );
  console.log('[PASS] 3. Search, status filter, sort ordering, and honest status normalization');

  // 4. Individual Delete & Edit-as-New Distinct ID Generation
  const delRes = deleteQuotation('q-stage6-02');
  assert.strictEqual(delRes, true);
  assert.strictEqual(getSavedQuotations().length, 2);
  assert.strictEqual(getQuotationById('q-stage6-02'), null);

  const idsSet = new Set(getSavedQuotations().map((q) => q.id));
  const numsSet = new Set(getSavedQuotations().map((q) => q.quotationNumber));
  const freshIds = generateQuotationIdentifiers(idsSet, numsSet);
  assert(!idsSet.has(freshIds.id), 'Edit-as-new must never collide with existing IDs');
  assert(!numsSet.has(freshIds.quotationNumber), 'Edit-as-new must produce a fresh reference number');
  console.log('[PASS] 4. Individual deletion and non-colliding new quotation ID generation');

  // 5. Capacity 50 Enforcement — Zero Silent FIFO Eviction
  clearAllQuotations();
  for (let i = 1; i <= MAX_STORED_QUOTATIONS; i++) {
    const pad = String(i).padStart(4, '0');
    const r = saveQuotation(
      makeSnapshot({
        id: `cap-${pad}`,
        num: `SA-Q-2026-${pad}`,
        customerName: `Client ${i}`,
      })
    );
    assert.strictEqual(r.success, true, `Save #${i} under cap should succeed`);
  }
  assert.strictEqual(getSavedQuotations().length, MAX_STORED_QUOTATIONS);

  const overflowRes = saveQuotation(
    makeSnapshot({
      id: 'cap-0051',
      num: 'SA-Q-2026-0051',
      customerName: 'Overflow Client',
    })
  );
  assert.strictEqual(overflowRes.success, false, '51st quotation must fail cleanly when at cap');
  assert.strictEqual(overflowRes.status, 'capacity_reached');
  assert.notStrictEqual(getQuotationById('cap-0001'), null, 'Oldest quotation must NOT be silently evicted');

  // Updating an existing item at 50/50 must still succeed
  const updateAtCap = saveQuotation(
    makeSnapshot({
      id: 'cap-0001',
      num: 'SA-Q-2026-0001',
      customerName: 'Client 1 Edited',
    })
  );
  assert.strictEqual(updateAtCap.success, true, 'Updating an existing quotation while at cap=50 must succeed');
  console.log('[PASS] 5. Max 50 capacity limit blocks overflow without silent eviction');

  // 6. Malformed JSON Protection & Single Corrupted Record Isolation
  memoryStorage.set(QUOTATION_STORAGE_KEY, '{corrupted_json: [1, 2');
  const malformedInspect = inspectSavedQuotationsLedger();
  assert.strictEqual(malformedInspect.status, 'malformed_json');
  const blockedSave = saveQuotation(q1);
  assert.strictEqual(blockedSave.success, false);
  assert.strictEqual(blockedSave.status, 'malformed_storage');
  assert.strictEqual(memoryStorage.get(QUOTATION_STORAGE_KEY), '{corrupted_json: [1, 2', 'Malformed storage must not be silently overwritten');

  // Partial corruption: 1 valid record + 1 corrupted entry
  const partialPayload = JSON.stringify([q1, { id: 'broken-entry', specifications: null }]);
  memoryStorage.set(QUOTATION_STORAGE_KEY, partialPayload);
  const partialInspect = inspectSavedQuotationsLedger();
  assert.strictEqual(partialInspect.status, 'partial_corruption');
  assert.strictEqual(partialInspect.validQuotations.length, 1);
  assert.strictEqual(partialInspect.corruptedCount, 1);

  // Saving another valid record keeps both valid records AND preserves the unreadable raw entry until purged
  assert.strictEqual(saveQuotation(q2).success, true);
  assert.strictEqual(getSavedQuotations().length, 2);
  assert.strictEqual(inspectSavedQuotationsLedger().corruptedCount, 1);

  const purgeRes = purgeCorruptedLedgerEntries();
  assert.strictEqual(purgeRes.success, true);
  assert.strictEqual(purgeRes.removedCount, 1);
  assert.strictEqual(inspectSavedQuotationsLedger().status, 'ok');
  assert.strictEqual(getSavedQuotations().length, 2);
  console.log('[PASS] 6. Malformed JSON guard, single-record corruption isolation, and explicit purge');

  // 7. QuotaExceededError Trapping
  quotaTrapEnabled = true;
  const quotaRes = saveQuotation(q3);
  assert.strictEqual(quotaRes.success, false);
  assert.strictEqual(quotaRes.status, 'quota_error');
  quotaTrapEnabled = false;
  console.log('[PASS] 7. QuotaExceededError caught and surfaced safely');

  // 8. Custom Artwork Storage Safety & Fallback Recovery
  clearAllQuotations();
  const oversizedBase64 = `data:image/png;base64,${'A'.repeat(40000)}`;
  const assetId = computeArtworkAssetId(oversizedBase64);
  assert.strictEqual(assetId, computeArtworkAssetId(oversizedBase64), 'Asset ID must be deterministic');
  assert(assetId.startsWith('art-asset-'), 'Asset ID should have art-asset- prefix');

  const artQuotation = makeSnapshot({
    id: 'q-art-01',
    num: 'SA-Q-2026-7001',
    customArtUrl: oversizedBase64,
    customArtAssetId: assetId,
  });
  assert.strictEqual(saveQuotation(artQuotation).success, true);

  const rawStored = JSON.parse(memoryStorage.get(QUOTATION_STORAGE_KEY) || '[]');
  assert.strictEqual(rawStored[0].specifications.customArtUrl, null, 'Large Base64 must be stripped from LocalStorage');
  assert.strictEqual(rawStored[0].specifications.customArtAssetId, assetId, 'Asset ID reference must be preserved in LocalStorage');

  const missingAssetResult = await loadCustomArtworkAsset(assetId);
  assert.strictEqual(missingAssetResult, null, 'Missing/unavailable IndexedDB returns null cleanly for fallback UI');
  console.log('[PASS] 8. Large Base64 omitted from LocalStorage, deterministic asset ID retained, missing IndexedDB recovers null');

  // 9. Reference-Counted Artwork Deletion Safety
  const artQuotation2 = makeSnapshot({
    id: 'q-art-02',
    num: 'SA-Q-2026-7002',
    customArtAssetId: assetId,
  });
  assert.strictEqual(saveQuotation(artQuotation2).success, true);
  deleteQuotation('q-art-01');
  const sharedRes = await deleteArtworkAssetIfUnreferenced(assetId, {
    validQuotations: getSavedQuotations(),
    hasCorruptedEntries: false,
  });
  assert.strictEqual(sharedRes.reason, 'still_referenced', 'Asset referenced by remaining quotation must NOT be deleted');
  deleteQuotation('q-art-02');
  const unrefRes = await deleteArtworkAssetIfUnreferenced(assetId, {
    validQuotations: getSavedQuotations(),
    hasCorruptedEntries: false,
  });
  assert(
    unrefRes.reason === 'deleted' || unrefRes.reason === 'delete_failed',
    'Asset with zero remaining references triggers IndexedDB cleanup'
  );
  console.log('[PASS] 9. Reference-counted artwork cleanup preserves shared assets');

  // 10. Existing Stage 3/4/5 Inline Snapshot Migration Compatibility
  clearAllQuotations();
  const smallLegacyDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const legacySnap = makeSnapshot({
    id: 'q-legacy-01',
    num: 'SA-Q-2026-4001',
    customArtUrl: smallLegacyDataUrl,
    customArtAssetId: null,
  });
  assert.strictEqual(saveQuotation(legacySnap).success, true);
  assert.strictEqual(getQuotationById('q-legacy-01')?.specifications.customArtUrl, smallLegacyDataUrl);
  console.log('[PASS] 10. Legacy inline customArtUrl snapshots (<32KB) remain backwards-compatible');

  // 11. Recovery Backup Retention Before Resetting Malformed Storage
  memoryStorage.set(QUOTATION_STORAGE_KEY, '{broken: true');
  assert.strictEqual(resetMalformedLedgerWithBackup().success, true);
  assert.strictEqual(memoryStorage.get(QUOTATION_STORAGE_KEY), undefined);
  const backupRaw = memoryStorage.get(QUOTATION_RECOVERY_BACKUP_KEY);
  assert(backupRaw && backupRaw.includes('{broken: true'), 'Recoverable backup payload must be saved prior to reset');
  console.log('[PASS] 11. Malformed ledger reset retains recoverable raw payload backup');

  // 12. Storage Access Error Trapping
  const origGetItem = localStorageMock.getItem;
  localStorageMock.getItem = () => {
    throw new Error('SecurityError: storage blocked');
  };
  const errInspect = inspectSavedQuotationsLedger();
  assert.strictEqual(errInspect.status, 'storage_error');
  assert(errInspect.errorMessage?.includes('SecurityError'));
  localStorageMock.getItem = origGetItem;
  console.log('[PASS] 12. Storage access SecurityError reported via storage_error inspection status');

  console.log('\n[SUCCESS] All Phase 5 Stage 6 behavioral unit tests passed.\n');
}

run().catch((err) => {
  console.error('Stage 6 Test Failure:', err);
  process.exit(1);
});
