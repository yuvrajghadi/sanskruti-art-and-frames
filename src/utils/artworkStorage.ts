/**
 * IndexedDB Asset Persistence for Customer-Uploaded Custom Artwork (Phase 5 Stage 6)
 *
 * Design:
 * - Stores uploaded artwork Data URLs separately from LocalStorage quotation metadata.
 * - Uses deterministic FNV-1a content hashing so identical images share one stable assetId
 *   (avoiding duplicate large blobs across multiple quotations).
 * - Gracefully degrades to null if IndexedDB is unavailable, blocked, or asset was deleted.
 */

const DB_NAME = 'sanskruti_artwork_assets_v1';
const STORE_NAME = 'artworks';
const DB_VERSION = 1;
export const LEGACY_INLINE_ARTWORK_THRESHOLD_BYTES = 32768;

/**
 * Shared inline SVG fallback rendered when custom uploaded artwork cannot be hydrated
 * from IndexedDB or inline snapshot data.
 */
export const DOSSIER_ARTWORK_UNAVAILABLE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
    <rect width="400" height="500" fill="#F9F7F2"/>
    <rect x="24" y="24" width="352" height="452" fill="none" stroke="#9C7A3C" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="200" y="218" font-family="Georgia, serif" font-size="18" fill="#1B3B2B" text-anchor="middle" font-weight="bold">Original Artwork Unavailable</text>
    <text x="200" y="248" font-family="sans-serif" font-size="12" fill="#424844" text-anchor="middle">Original uploaded artwork cannot be restored</text>
    <text x="200" y="268" font-family="sans-serif" font-size="12" fill="#424844" text-anchor="middle">and may need to be uploaded again.</text>
    <text x="200" y="300" font-family="monospace" font-size="11" fill="#9C7A3C" text-anchor="middle">Frame &amp; opening specifications preserved</text>
  </svg>`
)}`;

export interface StoredArtworkRecord {
  id: string;
  dataUrl: string;
  byteSize: number;
  createdAt: string;
}

export interface SaveArtworkResult {
  ok: boolean;
  assetId: string | null;
  deduplicated?: boolean;
  collisionResolved?: boolean;
  error?: string;
}

/**
 * Generates a stable, deterministic content-hash identifier for a Data URL.
 */
export function computeArtworkAssetId(dataUrl: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  const len = dataUrl.length;
  const step = Math.max(1, Math.floor(len / 4096));

  for (let i = 0; i < len; i += step) {
    const c = dataUrl.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c ^ (i & 0xff);
    h2 = Math.imul(h2, 0x01000193);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `art-asset-${hex1}${hex2}-${len}`;
}

function openArtworkDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open artwork IndexedDB'));
  });
}

/**
 * Persists a custom artwork image into IndexedDB keyed by content hash.
 * Avoids duplicating identical uploaded artwork images.
 */
export async function saveCustomArtworkAsset(dataUrl: string): Promise<SaveArtworkResult> {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { ok: false, assetId: null, error: 'Empty artwork data' };
  }
  if (typeof indexedDB === 'undefined') {
    return { ok: false, assetId: null, error: 'IndexedDB unavailable' };
  }

  const baseAssetId = computeArtworkAssetId(dataUrl);

  const storeGet = (db: IDBDatabase, id: string): Promise<StoredArtworkRecord | undefined> =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as StoredArtworkRecord | undefined);
      req.onerror = () => reject(req.error);
    });

  const storePut = (db: IDBDatabase, record: StoredArtworkRecord): Promise<void> =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

  try {
    const db = await openArtworkDB();
    try {
      const maxCollisionAttempts = 64;
      for (let attempt = 0; attempt <= maxCollisionAttempts; attempt++) {
        const candidateId = attempt === 0 ? baseAssetId : `${baseAssetId}-c${attempt}`;
        const existing = await storeGet(db, candidateId);

        if (existing && existing.dataUrl) {
          // Verify exact artwork bytes before claiming deduplication
          if (existing.dataUrl === dataUrl) {
            return {
              ok: true,
              assetId: candidateId,
              deduplicated: true,
              collisionResolved: attempt > 0,
            };
          }
          // Identifier collision with different image bytes: preserve existing record, probe next suffix
          continue;
        }

        const record: StoredArtworkRecord = {
          id: candidateId,
          dataUrl,
          byteSize: dataUrl.length,
          createdAt: new Date().toISOString(),
        };

        await storePut(db, record);

        // Read back to verify written content integrity
        const verified = await storeGet(db, candidateId);
        if (!verified || verified.dataUrl !== dataUrl) {
          return {
            ok: false,
            assetId: null,
            error: 'IndexedDB artwork write verification failed.',
          };
        }

        return {
          ok: true,
          assetId: candidateId,
          deduplicated: false,
          collisionResolved: attempt > 0,
        };
      }

      return {
        ok: false,
        assetId: null,
        error: 'Unable to allocate non-colliding artwork identifier after hash collision.',
      };
    } finally {
      db.close();
    }
  } catch (err: any) {
    return {
      ok: false,
      assetId: null,
      error: err?.message || 'Failed to persist artwork in IndexedDB',
    };
  }
}

/**
 * Retrieves a persisted custom artwork Data URL by its stable assetId.
 * Returns null gracefully if missing, deleted, or IndexedDB is unavailable.
 */
export async function loadCustomArtworkAsset(assetId?: string | null): Promise<string | null> {
  if (!assetId || typeof indexedDB === 'undefined') return null;

  try {
    const db = await openArtworkDB();
    try {
      const record = await new Promise<StoredArtworkRecord | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(assetId);
        req.onsuccess = () => resolve(req.result as StoredArtworkRecord | undefined);
        req.onerror = () => reject(req.error);
      });
      return record?.dataUrl || null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/**
 * Explicitly removes an artwork asset from IndexedDB.
 */
export async function deleteCustomArtworkAsset(assetId: string): Promise<boolean> {
  if (!assetId || typeof indexedDB === 'undefined') return false;

  try {
    const db = await openArtworkDB();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(assetId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    return true;
  } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

/**
 * Checks if any saved quotation still references the given assetId, deleting it
 * from IndexedDB ONLY when zero references remain.
 */
export async function deleteArtworkAssetIfUnreferenced(
  assetId: string | null | undefined,
  ledgerState: {
    validQuotations: Array<{ specifications?: { customArtAssetId?: string | null } }>;
    hasCorruptedEntries?: boolean;
  }
): Promise<{
  deleted: boolean;
  reason: 'deleted' | 'still_referenced' | 'uncertain_corrupted_ledger' | 'no_asset' | 'delete_failed';
}> {
  if (!assetId) return { deleted: false, reason: 'no_asset' };
  if (ledgerState.hasCorruptedEntries) {
    return { deleted: false, reason: 'uncertain_corrupted_ledger' };
  }
  const stillUsed = ledgerState.validQuotations.some(
    (q) => q.specifications?.customArtAssetId === assetId
  );
  if (stillUsed) {
    return { deleted: false, reason: 'still_referenced' };
  }
  const ok = await deleteCustomArtworkAsset(assetId);
  return { deleted: ok, reason: ok ? 'deleted' : 'delete_failed' };
}
