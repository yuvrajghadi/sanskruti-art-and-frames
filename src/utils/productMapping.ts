import { FrameSample } from '../types';

/**
 * Mapping between Google Stitch showcase alias SKUs and real application catalogue profiles.
 */
export const STITCH_SHOWCASE_MAPPINGS: Record<string, string> = {
  'SA-BG-402': 'SAA-AGB-15', // Baroque Espresso & Gold -> Ornate Antique Gold Baroque Masterpiece
  'SA-AG-118': 'SAA-AGP-16', // Acanthus Burnished Gold -> Ornate Royal Gold Leaf Gallery
  'SA-MG-204': 'SAA-MHG-23', // Mahogany & Gold Bead -> Rich Mahogany with Gold Egg-and-Dart
  'SA-CB-309': 'SAA-BVG-19', // Crimson & Braided Bronze -> Ornate Burgundy Bole & Vintage Gold
};

/**
 * Resolves any SKU, ID, or Stitch alias to the authentic FrameSample in the active catalogue.
 */
export function resolveProfile(idOrAlias: string | undefined, frames: FrameSample[]): FrameSample | undefined {
  if (!idOrAlias) return undefined;
  const cleanId = idOrAlias.trim();
  if (!cleanId) return undefined;
  
  // 1. Direct match by exact ID
  const directMatch = frames.find(f => f.id.toLowerCase() === cleanId.toLowerCase());
  if (directMatch) return directMatch;

  // 2. Stitch alias match
  const aliasTargetId = STITCH_SHOWCASE_MAPPINGS[cleanId.toUpperCase()];
  if (aliasTargetId) {
    const aliasMatch = frames.find(f => f.id.toLowerCase() === aliasTargetId.toLowerCase());
    if (aliasMatch) return aliasMatch;
  }

  // 3. Exact name match (case-insensitive)
  return frames.find(f => f.name.toLowerCase() === cleanId.toLowerCase());
}

/**
 * Retrieves harmonizing companion profiles for related moulding suggestions.
 * Prioritizes profiles in the same category or with matching finish/style.
 */
export function getCompanionProfiles(
  currentFrame: FrameSample,
  allFrames: FrameSample[],
  limit = 3
): FrameSample[] {
  const others = allFrames.filter(f => f.id !== currentFrame.id);
  
  // 1. Same category
  const sameCategory = others.filter(f => f.category === currentFrame.category);
  
  // 2. Same material or gold tone
  const similarMaterial = others.filter(f => 
    f.category !== currentFrame.category && 
    (f.material === currentFrame.material || f.goldTone === currentFrame.goldTone)
  );

  const combined = [...sameCategory, ...similarMaterial, ...others];
  
  // Unique by ID
  const uniqueMap = new Map<string, FrameSample>();
  for (const item of combined) {
    if (!uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, item);
    }
    if (uniqueMap.size >= limit) break;
  }

  return Array.from(uniqueMap.values());
}
