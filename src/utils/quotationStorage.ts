import { QuotationSnapshot, validateQuotationSnapshot } from '../types/quotation';
import {
  saveCustomArtworkAsset,
  loadCustomArtworkAsset,
  LEGACY_INLINE_ARTWORK_THRESHOLD_BYTES,
} from './artworkStorage';

export const QUOTATION_STORAGE_KEY = 'sanskruti_quotations_v1';
export const QUOTATION_RECOVERY_BACKUP_KEY = 'sanskruti_quotations_recovery_backup_v1';
export const MAX_STORED_QUOTATIONS = 50;

export interface StorageSaveResult {
  success: boolean;
  status:
    | 'saved'
    | 'updated'
    | 'capacity_reached'
    | 'quota_error'
    | 'invalid_data'
    | 'malformed_storage'
    | 'unavailable';
  message: string;
  quotationId?: string;
  count?: number;
}

export interface StorageMetadata {
  count: number;
  maxCapacity: number;
  isAtCapacity: boolean;
  approximateStorageBytes: number;
}

export interface CorruptedQuotationEntry {
  index: number;
  idAttempt?: string;
  errors: string[];
  rawEntry: unknown;
}

export interface QuotationLedgerInspection {
  status: 'ok' | 'partial_corruption' | 'malformed_json' | 'storage_error';
  validQuotations: QuotationSnapshot[];
  corruptedCount: number;
  corruptedEntries: CorruptedQuotationEntry[];
  errorMessage?: string;
}

/**
 * Inspects the LocalStorage quotation ledger without silently discarding corrupted entries.
 * Preserves all valid records even when individual entries are corrupted.
 */
export function inspectSavedQuotationsLedger(): QuotationLedgerInspection {
  if (typeof window === 'undefined') {
    return {
      status: 'storage_error',
      validQuotations: [],
      corruptedCount: 0,
      corruptedEntries: [],
      errorMessage: 'Browser storage unavailable.',
    };
  }

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(QUOTATION_STORAGE_KEY);
  } catch (err: any) {
    return {
      status: 'storage_error',
      validQuotations: [],
      corruptedCount: 0,
      corruptedEntries: [],
      errorMessage: err?.message || 'Unable to access browser storage.',
    };
  }

  if (!raw) {
    return {
      status: 'ok',
      validQuotations: [],
      corruptedCount: 0,
      corruptedEntries: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: any) {
    return {
      status: 'malformed_json',
      validQuotations: [],
      corruptedCount: 1,
      corruptedEntries: [],
      errorMessage:
        'Local quotation storage contains malformed JSON and could not be parsed automatically.',
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      status: 'malformed_json',
      validQuotations: [],
      corruptedCount: 1,
      corruptedEntries: [],
      errorMessage: 'Local quotation ledger root value is not a valid list.',
    };
  }

  const validQuotations: QuotationSnapshot[] = [];
  const corruptedEntries: CorruptedQuotationEntry[] = [];

  parsed.forEach((item, index) => {
    const check = validateQuotationSnapshot(item);
    if (check.valid) {
      validQuotations.push(item as QuotationSnapshot);
    } else {
      const idAttempt =
        item && typeof item === 'object'
          ? String((item as any).quotationNumber || (item as any).id || '') || undefined
          : undefined;
      corruptedEntries.push({
        index,
        idAttempt,
        errors: check.errors,
        rawEntry: item,
      });
    }
  });

  return {
    status: corruptedEntries.length > 0 ? 'partial_corruption' : 'ok',
    validQuotations,
    corruptedCount: corruptedEntries.length,
    corruptedEntries,
  };
}

/**
 * Retrieves all valid quotation dossiers from browser localStorage.
 */
export function getSavedQuotations(): QuotationSnapshot[] {
  return inspectSavedQuotationsLedger().validQuotations;
}

/**
 * Retrieves a specific quotation dossier by its unique ID or reference number.
 */
export function getQuotationById(id: string): QuotationSnapshot | null {
  if (!id) return null;
  const list = getSavedQuotations();
  return list.find((q) => q.id === id || q.quotationNumber === id) || null;
}

export interface QuotationLookupResult {
  status: 'found' | 'not_found' | 'corrupted' | 'missing_id' | 'storage_error';
  quotation: QuotationSnapshot | null;
  errors?: string[];
}

/**
 * Loads and strictly validates a quotation dossier by ID or reference number.
 * Never silently falls back to another quotation when an ID is invalid or missing.
 */
export function loadValidatedQuotationById(id?: string): QuotationLookupResult {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return { status: 'missing_id', quotation: null };
  }
  if (typeof window === 'undefined') {
    return { status: 'storage_error', quotation: null, errors: ['Browser storage unavailable'] };
  }

  try {
    const raw = localStorage.getItem(QUOTATION_STORAGE_KEY);
    if (!raw) {
      return { status: 'not_found', quotation: null };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return {
        status: 'corrupted',
        quotation: null,
        errors: ['Saved quotation store is not an array'],
      };
    }

    const candidate = parsed.find(
      (item: any) =>
        item && typeof item === 'object' && (item.id === id || item.quotationNumber === id)
    );

    if (!candidate) {
      return { status: 'not_found', quotation: null };
    }

    const validation = validateQuotationSnapshot(candidate);
    if (!validation.valid) {
      return {
        status: 'corrupted',
        quotation: null,
        errors: validation.errors,
      };
    }

    return {
      status: 'found',
      quotation: candidate as QuotationSnapshot,
    };
  } catch (err: any) {
    return {
      status: 'storage_error',
      quotation: null,
      errors: [err?.message || 'Failed to read or parse browser LocalStorage'],
    };
  }
}

/**
 * Returns current storage volume and capacity limits.
 */
export function getStorageMetadata(): StorageMetadata {
  if (typeof window === 'undefined') {
    return {
      count: 0,
      maxCapacity: MAX_STORED_QUOTATIONS,
      isAtCapacity: false,
      approximateStorageBytes: 0,
    };
  }
  try {
    const raw = localStorage.getItem(QUOTATION_STORAGE_KEY) || '[]';
    const list = getSavedQuotations();
    return {
      count: list.length,
      maxCapacity: MAX_STORED_QUOTATIONS,
      isAtCapacity: list.length >= MAX_STORED_QUOTATIONS,
      approximateStorageBytes: new Blob([raw]).size,
    };
  } catch {
    return {
      count: 0,
      maxCapacity: MAX_STORED_QUOTATIONS,
      isAtCapacity: false,
      approximateStorageBytes: 0,
    };
  }
}

/**
 * Prepares a quotation for safe LocalStorage persistence by offloading large Base64 blobs
 * ONLY when an IndexedDB assetId has already been persisted and referenced.
 * Never silently strips an un-migrated inline artwork copy lacking customArtAssetId.
 */
function sanitizeSnapshotForLocalStorage(quotation: QuotationSnapshot): QuotationSnapshot {
  const spec = quotation.specifications;
  if (!spec.customArtAssetId) {
    return quotation;
  }

  return {
    ...quotation,
    specifications: {
      ...spec,
      customArtUrl: null,
    },
  };
}

export interface LegacyArtworkMigrationResult {
  quotation: QuotationSnapshot;
  migrated: boolean;
  warning: string | null;
}

/**
 * Safely migrates a quotation containing a legacy large (>32 KB) inline customArtUrl
 * and no customArtAssetId into IndexedDB, verifying readback before stripping inline Base64.
 * If migration fails, preserves the original inline customArtUrl untouched and returns a warning.
 */
export async function migrateLegacyQuotationArtwork(
  quotation: QuotationSnapshot
): Promise<LegacyArtworkMigrationResult> {
  const spec = quotation.specifications;
  const inlineUrl = spec.customArtUrl;

  if (
    !inlineUrl ||
    spec.customArtAssetId ||
    inlineUrl.length <= LEGACY_INLINE_ARTWORK_THRESHOLD_BYTES
  ) {
    return { quotation, migrated: false, warning: null };
  }

  const artSave = await saveCustomArtworkAsset(inlineUrl);
  if (!artSave.ok || !artSave.assetId) {
    return {
      quotation,
      migrated: false,
      warning: `Legacy artwork migration to IndexedDB failed (${artSave.error || 'IndexedDB unavailable'}). Original inline artwork data has been preserved.`,
    };
  }

  const readBack = await loadCustomArtworkAsset(artSave.assetId);
  if (readBack !== inlineUrl) {
    return {
      quotation,
      migrated: false,
      warning: 'Migrated artwork could not be verified in IndexedDB. Original inline artwork data has been preserved.',
    };
  }

  const updatedSnapshot: QuotationSnapshot = {
    ...quotation,
    specifications: {
      ...spec,
      customArtAssetId: artSave.assetId,
      customArtUrl: null,
    },
  };

  return { quotation: updatedSnapshot, migrated: true, warning: null };
}

/**
 * Migrates any legacy large customArtUrl quotations currently stored in LocalStorage
 * into IndexedDB without silently dropping unmigrated copies on failure.
 */
export async function migrateLegacyLedgerArtworks(): Promise<{
  migratedCount: number;
  warnings: string[];
}> {
  const inspection = inspectSavedQuotationsLedger();
  let migratedCount = 0;
  const warnings: string[] = [];

  for (const q of inspection.validQuotations) {
    if (
      q.specifications.customArtUrl &&
      !q.specifications.customArtAssetId &&
      q.specifications.customArtUrl.length > LEGACY_INLINE_ARTWORK_THRESHOLD_BYTES
    ) {
      const mig = await migrateLegacyQuotationArtwork(q);
      if (mig.migrated) {
        const res = saveQuotation(mig.quotation);
        if (res.success) migratedCount++;
        else warnings.push(res.message);
      } else if (mig.warning) {
        warnings.push(mig.warning);
      }
    }
  }

  return { migratedCount, warnings };
}

/**
 * Saves or updates a quotation after ensuring any large un-migrated inline custom artwork
 * is safely migrated and verified in IndexedDB first.
 */
export async function saveQuotationWithArtworkMigration(
  quotation: QuotationSnapshot
): Promise<StorageSaveResult & { artworkWarning?: string | null }> {
  const mig = await migrateLegacyQuotationArtwork(quotation);
  const saveRes = saveQuotation(mig.quotation);
  return {
    ...saveRes,
    artworkWarning: mig.warning,
  };
}

/**
 * Saves or updates a quotation dossier in browser localStorage.
 *
 * Safety Guarantees:
 * 1. NEVER silently deletes or evicts existing user quotations via FIFO.
 * 2. Refuses to blindly overwrite malformed JSON storage payloads.
 * 3. Preserves uncorrupted entries and avoids destroying unrelated records on partial corruption.
 * 4. Enforces MAX_STORED_QUOTATIONS (50) cleanly with explicit 'capacity_reached' rejection.
 * 5. Traps QuotaExceededError without data loss.
 */
export function saveQuotation(quotation: QuotationSnapshot): StorageSaveResult {
  if (typeof window === 'undefined') {
    return {
      success: false,
      status: 'unavailable',
      message: 'Browser window is undefined; storage unavailable.',
    };
  }

  const validation = validateQuotationSnapshot(quotation);
  if (!validation.valid) {
    return {
      success: false,
      status: 'invalid_data',
      message: `Invalid quotation data: ${validation.errors.join(', ')}`,
    };
  }

  const inspection = inspectSavedQuotationsLedger();
  if (inspection.status === 'malformed_json') {
    return {
      success: false,
      status: 'malformed_storage',
      message:
        'Existing browser storage contains malformed JSON. Please resolve or clear corrupted storage in Saved Quotations before saving new records.',
    };
  }
  if (inspection.status === 'storage_error') {
    return {
      success: false,
      status: 'unavailable',
      message: inspection.errorMessage || 'Unable to access browser storage.',
    };
  }

  try {
    const existing = inspection.validQuotations;
    const index = existing.findIndex((q) => q.id === quotation.id);

    const sanitized = sanitizeSnapshotForLocalStorage({
      ...quotation,
      updatedAt: new Date().toISOString(),
    });

    let updatedValidList: QuotationSnapshot[];

    if (index >= 0) {
      updatedValidList = [...existing];
      updatedValidList[index] = sanitized;
    } else {
      if (existing.length >= MAX_STORED_QUOTATIONS) {
        return {
          success: false,
          status: 'capacity_reached',
          message: `Atelier quotation ledger has reached the maximum capacity of ${MAX_STORED_QUOTATIONS} saved records. Please open Saved Quotations to delete unwanted drafts before saving a new estimate.`,
          count: existing.length,
        };
      }
      updatedValidList = [sanitized, ...existing];
    }

    // Preserve any unvalidated/corrupted raw entries at the tail so partial corruption
    // never silently wipes recoverable raw entries during unrelated saves.
    const preservedCorruptedRaw = inspection.corruptedEntries.map((c) => c.rawEntry);
    const payloadToWrite =
      preservedCorruptedRaw.length > 0
        ? [...updatedValidList, ...preservedCorruptedRaw]
        : updatedValidList;

    localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(payloadToWrite));

    return {
      success: true,
      status: index >= 0 ? 'updated' : 'saved',
      message: index >= 0 ? 'Quotation updated successfully.' : 'Quotation saved to atelier ledger.',
      quotationId: quotation.id,
      count: updatedValidList.length,
    };
  } catch (err: any) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22;

    if (isQuotaError) {
      console.error('[QuotationStorage] Browser disk quota exceeded:', err);
      return {
        success: false,
        status: 'quota_error',
        message:
          'Browser storage quota exceeded. Please delete older saved quotations before saving a new draft.',
      };
    }

    console.error('[QuotationStorage] Unexpected error while writing to storage:', err);
    return {
      success: false,
      status: 'unavailable',
      message: `Storage write failure: ${err?.message || 'Unknown storage error'}`,
    };
  }
}

/**
 * Deletes a specific quotation dossier by ID while preserving other valid records
 * (and without disturbing unrelated records).
 */
export function deleteQuotation(id: string): boolean {
  if (typeof window === 'undefined' || !id) return false;

  const inspection = inspectSavedQuotationsLedger();
  if (inspection.status === 'malformed_json' || inspection.status === 'storage_error') {
    return false;
  }

  try {
    const existing = inspection.validQuotations;
    const filteredValid = existing.filter((q) => q.id !== id && q.quotationNumber !== id);
    if (filteredValid.length === existing.length) return false;

    const preservedCorruptedRaw = inspection.corruptedEntries.map((c) => c.rawEntry);
    const payload =
      preservedCorruptedRaw.length > 0
        ? [...filteredValid, ...preservedCorruptedRaw]
        : filteredValid;

    localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('[QuotationStorage] Failed to delete quotation from localStorage:', err);
    return false;
  }
}

/**
 * Writes a recovery backup to LocalStorage and reads it back to verify exact raw content
 * parity before allowing any destructive recovery/purge operation to proceed.
 */
function writeAndVerifyRecoveryBackup(
  reason: 'malformed_json_reset' | 'partial_corruption_purge',
  rawOriginalPayload: string
): { success: boolean; error?: string } {
  if (!rawOriginalPayload) {
    return { success: true };
  }
  try {
    const backupEnvelope = JSON.stringify({
      backedUpAt: new Date().toISOString(),
      reason,
      rawPayload: rawOriginalPayload,
    });
    localStorage.setItem(QUOTATION_RECOVERY_BACKUP_KEY, backupEnvelope);

    const readBackRaw = localStorage.getItem(QUOTATION_RECOVERY_BACKUP_KEY);
    if (!readBackRaw) {
      return {
        success: false,
        error:
          'Recovery backup verification failed: backup could not be read back. Original data left untouched — please Download Raw Backup first.',
      };
    }

    const parsedBack = JSON.parse(readBackRaw);
    if (!parsedBack || parsedBack.rawPayload !== rawOriginalPayload) {
      return {
        success: false,
        error:
          'Recovery backup verification failed: read-back contents did not match original data. Original data left untouched — please Download Raw Backup first.',
      };
    }

    return { success: true };
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22;
    return {
      success: false,
      error: isQuota
        ? 'Browser storage quota exceeded while saving recovery backup. Destructive cleanup was aborted so your original data stays intact — please Download Raw Backup first.'
        : `Failed to write recovery backup (${err?.message || 'Unknown error'}). Original data was not cleared — please Download Raw Backup first.`,
    };
  }
}

/**
 * Explicitly strips ONLY invalid/corrupted records while preserving all valid quotations.
 * Aborts without modifying the ledger if recovery backup creation or verification fails.
 */
export function purgeCorruptedLedgerEntries(): {
  success: boolean;
  preservedCount: number;
  removedCount: number;
  error?: string;
} {
  if (typeof window === 'undefined') {
    return { success: false, preservedCount: 0, removedCount: 0, error: 'Browser window unavailable.' };
  }
  const inspection = inspectSavedQuotationsLedger();
  if (inspection.status === 'malformed_json' || inspection.status === 'storage_error') {
    return {
      success: false,
      preservedCount: 0,
      removedCount: 0,
      error: inspection.errorMessage || 'Cannot purge unreadable storage ledger.',
    };
  }
  try {
    const originalRaw = localStorage.getItem(QUOTATION_STORAGE_KEY) || '';
    if (inspection.corruptedEntries.length > 0 && originalRaw) {
      const backupRes = writeAndVerifyRecoveryBackup('partial_corruption_purge', originalRaw);
      if (!backupRes.success) {
        return {
          success: false,
          preservedCount: inspection.validQuotations.length,
          removedCount: 0,
          error: backupRes.error,
        };
      }
    }

    localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(inspection.validQuotations));
    return {
      success: true,
      preservedCount: inspection.validQuotations.length,
      removedCount: inspection.corruptedCount,
    };
  } catch (err: any) {
    return {
      success: false,
      preservedCount: inspection.validQuotations.length,
      removedCount: 0,
      error: err?.message || 'Failed while updating cleaned ledger.',
    };
  }
}

/**
 * Reads the raw storage payload string for recovery download/inspection before reset.
 */
export function getRawLedgerPayloadForRecovery(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(QUOTATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Resets malformed storage ONLY AFTER writing and reading back a verified raw backup.
 * If backup write or readback verification fails, aborts and leaves malformed storage intact.
 */
export function resetMalformedLedgerWithBackup(): {
  success: boolean;
  error?: string;
} {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser window unavailable.' };
  }
  try {
    const raw = localStorage.getItem(QUOTATION_STORAGE_KEY);
    if (raw) {
      const backupRes = writeAndVerifyRecoveryBackup('malformed_json_reset', raw);
      if (!backupRes.success) {
        return { success: false, error: backupRes.error };
      }
    }
    localStorage.removeItem(QUOTATION_STORAGE_KEY);
    if (localStorage.getItem(QUOTATION_STORAGE_KEY) !== null) {
      return {
        success: false,
        error: 'Storage entry persisted after delete attempt. Existing data left unchanged.',
      };
    }
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to reset malformed ledger.',
    };
  }
}

/**
 * Clears valid saved quotation dossiers with explicit confirmation.
 * When corrupted entries exist alongside valid records, valid records are cleared
 * while corrupted entries remain preserved (protecting potentially referenced artwork)
 * until corrupted records are recovered or explicitly purged.
 */
export function clearAllQuotations(): {
  success: boolean;
  preservedCorruptedCount: number;
  error?: string;
} {
  if (typeof window === 'undefined') {
    return { success: false, preservedCorruptedCount: 0, error: 'Browser window unavailable.' };
  }
  const inspection = inspectSavedQuotationsLedger();
  if (inspection.status === 'storage_error') {
    return {
      success: false,
      preservedCorruptedCount: 0,
      error: inspection.errorMessage || 'Unable to access browser storage.',
    };
  }
  try {
    if (inspection.corruptedEntries.length > 0) {
      const preservedCorruptedRaw = inspection.corruptedEntries.map((c) => c.rawEntry);
      localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(preservedCorruptedRaw));
      return {
        success: true,
        preservedCorruptedCount: inspection.corruptedCount,
      };
    }
    localStorage.removeItem(QUOTATION_STORAGE_KEY);
    if (localStorage.getItem(QUOTATION_STORAGE_KEY) !== null) {
      return {
        success: false,
        preservedCorruptedCount: 0,
        error: 'Failed to remove quotation storage key.',
      };
    }
    return { success: true, preservedCorruptedCount: 0 };
  } catch (err: any) {
    console.error('[QuotationStorage] Failed to clear quotations:', err);
    return {
      success: false,
      preservedCorruptedCount: 0,
      error: err?.message || 'Failed to clear quotations from browser storage.',
    };
  }
}
