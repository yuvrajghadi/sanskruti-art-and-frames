import assert from 'assert';

// =============================================================================
// IN-MEMORY LOCALSTORAGE + INDEXEDDB SHIMS FOR DETERMINISTIC STAGE 6.1 TESTS
// =============================================================================
const memoryStorage = new Map<string, string>();
let blockBackupWrites = false;
let corruptBackupReadback = false;
let failLedgerRemove = false;

const localStorageMock = {
  getItem: (k: string) => {
    if (corruptBackupReadback && k === 'sanskruti_quotations_recovery_backup_v1') {
      const val = memoryStorage.get(k);
      return val ? JSON.stringify({ rawPayload: 'TRUNCATED_CORRUPT' }) : null;
    }
    return memoryStorage.has(k) ? memoryStorage.get(k)! : null;
  },
  setItem: (k: string, v: string) => {
    if (blockBackupWrites && k === 'sanskruti_quotations_recovery_backup_v1') {
      const err = new Error('QuotaExceededError') as Error & { name: string };
      err.name = 'QuotaExceededError';
      throw err;
    }
    memoryStorage.set(k, String(v));
  },
  removeItem: (k: string) => {
    if (failLedgerRemove && k === 'sanskruti_quotations_v1') {
      throw new Error('Simulated removeItem lock');
    }
    memoryStorage.delete(k);
  },
  clear: () => {
    memoryStorage.clear();
  },
};

// Minimal async IndexedDB mock supporting open/objectStoreNames/transaction/get/put/delete
const idbStores = new Map<string, Map<string, any>>();
let idbFailOpen = false;

function makeIdbRequest<T>(executor: () => T) {
  const req: any = {
    result: undefined,
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  };
  queueMicrotask(() => {
    try {
      req.result = executor();
      if (req.onsuccess) req.onsuccess({ target: req });
    } catch (e: any) {
      req.error = e;
      if (req.onerror) req.onerror({ target: req });
    }
  });
  return req;
}

const indexedDBMock = {
  open: (name: string) => {
    const req: any = {
      result: null,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };
    queueMicrotask(() => {
      if (idbFailOpen) {
        req.error = new Error('IndexedDB blocked in private session');
        if (req.onerror) req.onerror({ target: req });
        return;
      }
      if (!idbStores.has(name)) {
        idbStores.set(name, new Map());
      }
      const dbData = idbStores.get(name)!;
      const dbObj: any = {
        objectStoreNames: {
          contains: (_s: string) => true,
        },
        createObjectStore: () => ({}),
        close: () => {},
        transaction: (_storeName: string, _mode: string) => ({
          objectStore: () => ({
            get: (key: string) => makeIdbRequest(() => dbData.get(key)),
            put: (record: any) =>
              makeIdbRequest(() => {
                dbData.set(record.id, record);
                return record.id;
              }),
            delete: (key: string) =>
              makeIdbRequest(() => {
                dbData.delete(key);
                return undefined;
              }),
          }),
        }),
      };
      req.result = dbObj;
      if (req.onupgradeneeded) req.onupgradeneeded({ target: req });
      if (req.onsuccess) req.onsuccess({ target: req });
    });
    return req;
  },
};

(globalThis as unknown as Record<string, unknown>).window = {
  localStorage: localStorageMock,
  location: { search: '', pathname: '/' },
};
(globalThis as unknown as Record<string, unknown>).localStorage = localStorageMock;
(globalThis as unknown as Record<string, unknown>).indexedDB = indexedDBMock;

import { createQuotationSnapshot, CustomerDetails } from '../src/types/quotation';
import {
  QUOTATION_STORAGE_KEY,
  QUOTATION_RECOVERY_BACKUP_KEY,
  saveQuotation,
  getQuotationById,
  deleteQuotation,
  clearAllQuotations,
  inspectSavedQuotationsLedger,
  purgeCorruptedLedgerEntries,
  resetMalformedLedgerWithBackup,
  migrateLegacyQuotationArtwork,
  migrateLegacyLedgerArtworks,
  saveQuotationWithArtworkMigration,
} from '../src/utils/quotationStorage';
import {
  computeArtworkAssetId,
  saveCustomArtworkAsset,
  loadCustomArtworkAsset,
  deleteArtworkAssetIfUnreferenced,
} from '../src/utils/artworkStorage';
import { WORKSHOP_MOULDINGS } from '../src/data/workshopSamples';
import { MAT_OPTIONS, ARTWORK_OPTIONS } from '../src/data/frames';
import { GLAZING_OPTIONS, MOUNTING_OPTIONS } from '../src/components/CustomFramingStudio';

function makeCustomer(name = 'Stage 6.1 Client'): CustomerDetails {
  return {
    fullName: name,
    phone: '9820012345',
    email: 'client@example.com',
    addressLine1: '101 Heritage Row',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    notes: '',
  };
}

function makeSnapshot(opts: {
  id: string;
  num: string;
  customArtUrl?: string | null;
  customArtAssetId?: string | null;
}) {
  return createQuotationSnapshot({
    frame: WORKSHOP_MOULDINGS[0],
    width: 16,
    height: 20,
    unit: 'in',
    aspectRatioLabel: '4:5',
    mat: MAT_OPTIONS[0],
    artwork:
      opts.customArtUrl || opts.customArtAssetId
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
    customer: makeCustomer(),
    existingId: opts.id,
    existingQuotationNumber: opts.num,
  });
}

async function run() {
  console.log('\n=============================================================');
  console.log('   PHASE 5 STAGE 6.1: FINAL DATA INTEGRITY REMEDIATION QA    ');
  console.log('=============================================================');

  // =========================================================================
  // 1. VERIFIED RECOVERY BACKUP (QUOTA EXHAUSTION & VERIFICATION MISMATCH)
  // =========================================================================
  memoryStorage.clear();
  const malformedRaw = '{ "broken_ledger": [1, 2';
  memoryStorage.set(QUOTATION_STORAGE_KEY, malformedRaw);

  // 1a. Quota failure while writing recovery backup -> MUST ABORT & preserve malformedRaw
  blockBackupWrites = true;
  const resetQuotaRes = resetMalformedLedgerWithBackup();
  assert.strictEqual(resetQuotaRes.success, false, 'Reset must abort when backup hits quota');
  assert(resetQuotaRes.error && resetQuotaRes.error.toLowerCase().includes('quota'));
  assert.strictEqual(
    memoryStorage.get(QUOTATION_STORAGE_KEY),
    malformedRaw,
    'Original malformed ledger must remain completely untouched if backup fails'
  );
  blockBackupWrites = false;

  // 1b. Backup readback verification mismatch -> MUST ABORT & preserve ledger
  corruptBackupReadback = true;
  const resetMismatchRes = resetMalformedLedgerWithBackup();
  assert.strictEqual(resetMismatchRes.success, false, 'Reset must abort on readback verification mismatch');
  assert(resetMismatchRes.error && resetMismatchRes.error.toLowerCase().includes('verification'));
  assert.strictEqual(memoryStorage.get(QUOTATION_STORAGE_KEY), malformedRaw);

  // Partial corruption purge must ALSO abort on backup verification failure
  const validSnap = makeSnapshot({ id: 'q-valid-1', num: 'SA-Q-2026-9001' });
  const partialRaw = JSON.stringify([validSnap, { id: 'corrupt-rec', specifications: null }]);
  memoryStorage.set(QUOTATION_STORAGE_KEY, partialRaw);
  const purgeMismatchRes = purgeCorruptedLedgerEntries();
  assert.strictEqual(purgeMismatchRes.success, false, 'Purge must abort when backup readback fails');
  assert.strictEqual(memoryStorage.get(QUOTATION_STORAGE_KEY), partialRaw);
  corruptBackupReadback = false;

  // 1c. Happy path: verified readback succeeds and clears/purges safely
  const purgeOkRes = purgeCorruptedLedgerEntries();
  assert.strictEqual(purgeOkRes.success, true);
  assert.strictEqual(purgeOkRes.removedCount, 1);
  assert.strictEqual(purgeOkRes.preservedCount, 1);
  const parsedBackup = JSON.parse(memoryStorage.get(QUOTATION_RECOVERY_BACKUP_KEY) || '{}');
  assert.strictEqual(parsedBackup.rawPayload, partialRaw, 'Backup must match exact raw payload');

  memoryStorage.set(QUOTATION_STORAGE_KEY, malformedRaw);
  const resetOkRes = resetMalformedLedgerWithBackup();
  assert.strictEqual(resetOkRes.success, true);
  assert.strictEqual(memoryStorage.get(QUOTATION_STORAGE_KEY), undefined);
  assert.strictEqual(JSON.parse(memoryStorage.get(QUOTATION_RECOVERY_BACKUP_KEY)!).rawPayload, malformedRaw);
  console.log('[PASS] 1. Recovery backup verifies write + readback & aborts safely on quota/mismatch');

  // =========================================================================
  // 2. CONSERVATIVE ARTWORK CLEANUP WHEN CORRUPTION EXISTS
  // =========================================================================
  memoryStorage.clear();
  idbStores.clear();
  const sharedArtwork = `data:image/png;base64,${'B'.repeat(40000)}`;
  const savedShared = await saveCustomArtworkAsset(sharedArtwork);
  assert.strictEqual(savedShared.ok, true);
  const sharedId = savedShared.assetId!;

  const qValidRef = makeSnapshot({
    id: 'q-shared-valid',
    num: 'SA-Q-2026-9101',
    customArtAssetId: sharedId,
  });
  // Corrupted record that also internally references sharedId in its unvalidated payload
  const corruptedRecordWithRef = {
    id: 'q-corrupted-ref',
    quotationNumber: 'SA-Q-2026-9102',
    specifications: { customArtAssetId: sharedId }, // Invalid/missing required quotation fields
  };
  memoryStorage.set(QUOTATION_STORAGE_KEY, JSON.stringify([qValidRef, corruptedRecordWithRef]));

  // Delete the valid quotation; corrupted record still exists
  assert.strictEqual(deleteQuotation('q-shared-valid'), true);
  const afterDelInsp = inspectSavedQuotationsLedger();
  assert.strictEqual(afterDelInsp.status, 'partial_corruption');
  assert.strictEqual(afterDelInsp.corruptedCount, 1);

  const conservativeCheck = await deleteArtworkAssetIfUnreferenced(sharedId, {
    validQuotations: afterDelInsp.validQuotations,
    hasCorruptedEntries: afterDelInsp.corruptedCount > 0,
  });
  assert.strictEqual(conservativeCheck.deleted, false);
  assert.strictEqual(conservativeCheck.reason, 'uncertain_corrupted_ledger');
  assert.strictEqual(
    await loadCustomArtworkAsset(sharedId),
    sharedArtwork,
    'Artwork must be preserved while corrupted ledger entries exist'
  );

  // Also test Delete-All preserving corrupted entries & refusing artwork deletion until purged
  memoryStorage.set(QUOTATION_STORAGE_KEY, JSON.stringify([qValidRef, corruptedRecordWithRef]));
  const clearPartial = clearAllQuotations();
  assert.strictEqual(clearPartial.success, true);
  assert.strictEqual(clearPartial.preservedCorruptedCount, 1);
  assert.strictEqual(inspectSavedQuotationsLedger().corruptedCount, 1);

  // Also test failed ledger deletion never touches IndexedDB artwork
  memoryStorage.set(QUOTATION_STORAGE_KEY, JSON.stringify([qValidRef]));
  failLedgerRemove = true;
  const failedClear = clearAllQuotations();
  assert.strictEqual(failedClear.success, false);
  failLedgerRemove = false;
  assert.strictEqual(
    await loadCustomArtworkAsset(sharedId),
    sharedArtwork,
    'Failed ledger deletion must retain associated artwork'
  );

  // Once corrupted entries are purged AND no valid quotation references sharedId, cleanup succeeds
  memoryStorage.set(QUOTATION_STORAGE_KEY, JSON.stringify([corruptedRecordWithRef]));
  assert.strictEqual(purgeCorruptedLedgerEntries().success, true);
  const finalCleanup = await deleteArtworkAssetIfUnreferenced(sharedId, {
    validQuotations: inspectSavedQuotationsLedger().validQuotations,
    hasCorruptedEntries: inspectSavedQuotationsLedger().corruptedCount > 0,
  });
  assert.strictEqual(finalCleanup.deleted, true);
  assert.strictEqual(finalCleanup.reason, 'deleted');
  assert.strictEqual(await loadCustomArtworkAsset(sharedId), null);
  console.log('[PASS] 2. Conservative artwork cleanup preserves potentially referenced blobs during corruption or ledger errors');

  // =========================================================================
  // 3. MIGRATE LEGACY LARGE (>32 KB) CUSTOM ARTWORK WITHOUT DATA LOSS
  // =========================================================================
  memoryStorage.clear();
  idbStores.clear();
  const legacyLargeArt = `data:image/png;base64,${'L'.repeat(42000)}`;
  const legacyLargeSnap = makeSnapshot({
    id: 'q-legacy-large-1',
    num: 'SA-Q-2026-9201',
    customArtUrl: legacyLargeArt,
    customArtAssetId: null,
  });

  // 3a. Synchronous saveQuotation MUST NOT silently drop customArtUrl when assetId is null
  assert.strictEqual(saveQuotation(legacyLargeSnap).success, true);
  assert.strictEqual(
    getQuotationById('q-legacy-large-1')?.specifications.customArtUrl,
    legacyLargeArt,
    'Un-migrated large customArtUrl must NOT be silently stripped without assetId'
  );

  // 3b. When IndexedDB migration fails, preserve original inline data and warn user cleanly
  idbFailOpen = true;
  const failedMig = await migrateLegacyQuotationArtwork(legacyLargeSnap);
  assert.strictEqual(failedMig.migrated, false);
  assert(failedMig.warning && failedMig.warning.toLowerCase().includes('preserved'));
  assert.strictEqual(
    failedMig.quotation.specifications.customArtUrl,
    legacyLargeArt,
    'Failed IndexedDB migration must keep original inline copy intact'
  );
  const failedSaveWithMig = await saveQuotationWithArtworkMigration(legacyLargeSnap);
  assert.strictEqual(failedSaveWithMig.success, true);
  assert(failedSaveWithMig.artworkWarning);
  assert.strictEqual(getQuotationById('q-legacy-large-1')?.specifications.customArtUrl, legacyLargeArt);
  idbFailOpen = false;

  // 3c. Once IndexedDB is healthy, migrateLegacyLedgerArtworks migrates, verifies, & persists assetId
  const migRun = await migrateLegacyLedgerArtworks();
  assert.strictEqual(migRun.migratedCount, 1);
  assert.strictEqual(migRun.warnings.length, 0);
  const migratedRecord = getQuotationById('q-legacy-large-1')!;
  assert.strictEqual(migratedRecord.specifications.customArtUrl, null, 'Inline >32KB stripped ONLY after verified migration');
  assert(migratedRecord.specifications.customArtAssetId, 'customArtAssetId must be populated after migration');
  assert.strictEqual(
    await loadCustomArtworkAsset(migratedRecord.specifications.customArtAssetId),
    legacyLargeArt,
    'Migrated artwork must hydrate accurately from IndexedDB'
  );
  console.log('[PASS] 3. Legacy >32 KB artwork migrates safely to IndexedDB and never strips unverified data');

  // =========================================================================
  // 4. DEDUPLICATION COLLISION PROTECTION
  // =========================================================================
  idbStores.clear();
  const imageA = `data:image/png;base64,${'X'.repeat(5000)}IMAGE_A`;
  const imageB = `data:image/png;base64,${'Y'.repeat(5000)}IMAGE_B`;
  const collidingKey = computeArtworkAssetId(imageA);

  // Pre-seed IndexedDB at imageA's exact base hash ID with completely different bytes (imageB)
  const storeNameKey = 'sanskruti_artwork_assets_v1';
  idbStores.set(
    storeNameKey,
    new Map([
      [
        collidingKey,
        {
          id: collidingKey,
          dataUrl: imageB,
          byteSize: imageB.length,
          createdAt: new Date().toISOString(),
        },
      ],
    ])
  );

  // Saving imageA under colliding base ID must NOT reuse imageB or overwrite it
  const colRes = await saveCustomArtworkAsset(imageA);
  assert.strictEqual(colRes.ok, true);
  assert.strictEqual(colRes.deduplicated, false);
  assert.strictEqual(colRes.collisionResolved, true);
  assert.strictEqual(colRes.assetId, `${collidingKey}-c1`);
  assert.strictEqual(await loadCustomArtworkAsset(collidingKey), imageB, 'Existing colliding asset must stay untouched');
  assert.strictEqual(await loadCustomArtworkAsset(`${collidingKey}-c1`), imageA, 'New image must store under suffix slot');

  // Saving imageA a second time verifies exact content match on -c1 slot and deduplicates cleanly
  const dedupAfterCol = await saveCustomArtworkAsset(imageA);
  assert.strictEqual(dedupAfterCol.ok, true);
  assert.strictEqual(dedupAfterCol.deduplicated, true);
  assert.strictEqual(dedupAfterCol.assetId, `${collidingKey}-c1`);
  console.log('[PASS] 4. Content-verified deduplication and collision disambiguation verified');

  console.log('\n[SUCCESS] All Phase 5 Stage 6.1 remediation behavioral tests passed.\n');
}

run().catch((err) => {
  console.error('Stage 6.1 Test Failure:', err);
  process.exit(1);
});
