import { FrameCustomizationConfig, DimensionUnit, ArtworkFitMode } from '../types';

export const DEFAULT_FRAME_CONFIG: FrameCustomizationConfig = {
  frameId: 'SAA-FLR-01',
  width: 16,
  height: 20,
  unit: 'in',
  matEnabled: true,
  matId: 'mat-offwhite',
  matColorHex: '#f5f3ec',
  matWidth: 2.5,
  artworkId: 'art-vermeer',
  customArtUrl: null,
  artworkFit: 'fill',
  glazingId: 'optium',
  mountingId: 'french-cleat',
  wallColor: 'stone',
};

/**
 * Validates and clamps a partial configuration to ensure consistent, safe bounds.
 */
export function validateFrameConfig(
  input: Partial<FrameCustomizationConfig>,
  fallbackFrameId = 'SAA-FLR-01'
): FrameCustomizationConfig {
  const unit: DimensionUnit = input.unit === 'cm' ? 'cm' : 'in';
  const minDim = unit === 'cm' ? 10 : 4;
  const maxDim = unit === 'cm' ? 245 : 96;

  let w = typeof input.width === 'number' && !isNaN(input.width) ? input.width : (unit === 'cm' ? 40 : 16);
  let h = typeof input.height === 'number' && !isNaN(input.height) ? input.height : (unit === 'cm' ? 50 : 20);

  w = Math.min(Math.max(w, minDim), maxDim);
  h = Math.min(Math.max(h, minDim), maxDim);

  const matWidthRaw = typeof input.matWidth === 'number' && !isNaN(input.matWidth) ? input.matWidth : 2.5;
  const matWidth = Math.min(Math.max(matWidthRaw, 0.5), 6.0);

  const artworkFit: ArtworkFitMode = input.artworkFit === 'fit' ? 'fit' : 'fill';
  const wallColor = input.wallColor === 'forest' || input.wallColor === 'linen' ? input.wallColor : 'stone';

  return {
    frameId: input.frameId || fallbackFrameId,
    width: Math.round(w * 10) / 10,
    height: Math.round(h * 10) / 10,
    unit,
    matEnabled: input.matEnabled !== false && input.matId !== 'mat-none',
    matId: input.matId || (input.matEnabled === false ? 'mat-none' : 'mat-offwhite'),
    matColorHex: input.matColorHex || '#f5f3ec',
    matWidth: input.matId === 'mat-none' || input.matEnabled === false ? 0 : matWidth,
    artworkId: input.artworkId || 'art-vermeer',
    customArtUrl: typeof input.customArtUrl === 'string' && input.customArtUrl.length > 0 ? input.customArtUrl : null,
    artworkFit,
    glazingId: input.glazingId || 'optium',
    mountingId: input.mountingId || 'french-cleat',
    wallColor,
  };
}

/**
 * Serializes custom configuration state into safe URL search parameters.
 * Note: Never serializes large Base64/Blob artwork data to avoid URL length overflows.
 */
export function serializeConfigToQuery(config: FrameCustomizationConfig): string {
  const params = new URLSearchParams();

  if (config.width !== 16) params.set('w', config.width.toString());
  if (config.height !== 20) params.set('h', config.height.toString());
  if (config.unit !== 'in') params.set('unit', config.unit);
  if (!config.matEnabled || config.matId === 'mat-none') {
    params.set('mat', 'none');
  } else {
    if (config.matId && config.matId !== 'mat-offwhite') params.set('mat', config.matId);
    if (config.matWidth && config.matWidth !== 2.5) params.set('bw', config.matWidth.toString());
  }
  if (config.artworkFit && config.artworkFit !== 'fill') params.set('fit', config.artworkFit);
  if (config.artworkId && config.artworkId !== 'art-vermeer') params.set('art', config.artworkId);
  if (config.glazingId && config.glazingId !== 'optium') params.set('glz', config.glazingId);
  if (config.wallColor && config.wallColor !== 'stone') params.set('wall', config.wallColor);

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Deserializes URL search parameters back into a partial FrameCustomizationConfig.
 */
export function deserializeConfigFromQuery(
  search: string,
  fallbackFrameId = 'SAA-FLR-01'
): Partial<FrameCustomizationConfig> {
  if (!search) return { frameId: fallbackFrameId };

  try {
    const params = new URLSearchParams(search);
    const result: Partial<FrameCustomizationConfig> = { frameId: fallbackFrameId };

    const w = parseFloat(params.get('w') || '');
    if (!isNaN(w)) result.width = w;

    const h = parseFloat(params.get('h') || '');
    if (!isNaN(h)) result.height = h;

    const unit = params.get('unit');
    if (unit === 'in' || unit === 'cm') result.unit = unit;

    const mat = params.get('mat');
    if (mat) {
      if (mat === 'none') {
        result.matEnabled = false;
        result.matId = 'mat-none';
        result.matWidth = 0;
      } else {
        result.matEnabled = true;
        result.matId = mat;
      }
    }

    const bw = parseFloat(params.get('bw') || '');
    if (!isNaN(bw) && bw > 0) result.matWidth = bw;

    const fit = params.get('fit');
    if (fit === 'fill' || fit === 'fit') result.artworkFit = fit;

    const art = params.get('art');
    if (art) result.artworkId = art;

    const glz = params.get('glz');
    if (glz) result.glazingId = glz;

    const wall = params.get('wall');
    if (wall === 'stone' || wall === 'forest' || wall === 'linen') result.wallColor = wall;

    return result;
  } catch (err) {
    console.warn('Failed to parse URL config query string:', err);
    return { frameId: fallbackFrameId };
  }
}

/**
 * Converts a configuration between Inches and Centimeters cleanly.
 */
export function convertConfigUnit(
  config: FrameCustomizationConfig,
  targetUnit: DimensionUnit
): FrameCustomizationConfig {
  if (config.unit === targetUnit) return config;

  if (targetUnit === 'cm') {
    return {
      ...config,
      unit: 'cm',
      width: Math.round(config.width * 2.54 * 10) / 10,
      height: Math.round(config.height * 2.54 * 10) / 10,
    };
  } else {
    return {
      ...config,
      unit: 'in',
      width: Math.round((config.width / 2.54) * 10) / 10,
      height: Math.round((config.height / 2.54) * 10) / 10,
    };
  }
}
