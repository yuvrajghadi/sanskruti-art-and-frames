import { FrameSample } from '../types';
import { WORKSHOP_MOULDINGS } from '../data/workshopSamples';
import { LEGACY_FRAME_SAMPLES } from '../data/frames';

const STORAGE_KEY = 'sanskruti_workshop_mouldings_v3';

/**
 * Initializes and returns the active moulding list.
 * Priority:
 * 1. Checks localStorage for existing user-modified or cached workshop mouldings.
 * 2. Merges in any newly added default workshop mouldings so all catalog items remain accessible.
 * 3. If none exist, initializes localStorage with the real workshop moulding samples
 *    followed by the curated archival collection.
 */
export function getInitialMouldings(): FrameSample[] {
  const allDefaults = [...WORKSHOP_MOULDINGS, ...LEGACY_FRAME_SAMPLES];
  if (typeof window === 'undefined') {
    return allDefaults;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure all default mouldings (like newly added SAA-MHG-23) are present in the list
        const existingIds = new Set(parsed.map((f: FrameSample) => f?.id));
        const missing = allDefaults.filter((f) => !existingIds.has(f.id));
        if (missing.length > 0) {
          const merged = [...parsed, ...missing];
          saveMouldingsToStorage(merged);
          return merged;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse workshop mouldings from localStorage:', err);
  }

  // Seed localStorage with workshop mouldings + archive
  saveMouldingsToStorage(allDefaults);
  return allDefaults;
}

/**
 * Persists the active mouldings array into browser localStorage.
 */
export function saveMouldingsToStorage(mouldings: FrameSample[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mouldings));
  } catch (err) {
    console.error('Failed to save mouldings to localStorage:', err);
  }
}

/**
 * Resets localStorage back to the official guild workshop default collection.
 */
export function resetMouldingsStorage(): FrameSample[] {
  if (typeof window === 'undefined') {
    return [...WORKSHOP_MOULDINGS, ...LEGACY_FRAME_SAMPLES];
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Ignore
  }

  const defaultList = [...WORKSHOP_MOULDINGS, ...LEGACY_FRAME_SAMPLES];
  saveMouldingsToStorage(defaultList);
  return defaultList;
}

/**
 * Checks whether the browser localStorage currently holds the active moulding collection.
 */
export function isUsingStoredMouldings(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

