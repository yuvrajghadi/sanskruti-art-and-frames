export type DimensionUnit = 'in' | 'cm';

export type CurrencyCode = 'INR' | 'USD';

export type ArtworkFitMode = 'fill' | 'fit';

export type ViewMode = '2d' | '3d';

export type FrameCategory = 'all' | 'workshop' | 'ornate-gold' | 'classic-wood' | 'antique-gilt' | 'modern-gallery';

export interface FrameSample {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  cornerDetailUrl: string;
  category: 'ornate-gold' | 'classic-wood' | 'antique-gilt' | 'modern-gallery';
  isWorkshopSample?: boolean;
  profileWidth: number; // in inches
  depth: number; // in inches
  finish: string;
  material: string;
  style: string;
  basePricePerFoot: number; // default USD or baseline
  pricePerFootINR?: number; // Verified Indian Rupees rate per running foot
  colorHex: string;
  innerBevelHex: string;
  outerBevelHex: string;
  goldTone?: boolean;
  woodGrain?: boolean;
  textureDetails: {
    reliefHeight: number;
    filigreeStyle: string;
    carvingPattern: 'acanthus' | 'fluted' | 'baroque' | 'smooth-miter' | 'beaded-pearl' | 'distressed-burl';
    sheen: 'high-gloss' | 'satin-varnish' | 'aged-patina' | 'matte';
  };
}

export type WallColor = 'gallery-white' | 'warm-stone' | 'charcoal-museum' | 'sage-botanical' | 'navy-library';

export interface MatOption {
  id: string;
  name: string;
  colorHex: string;
  coreHex: string; // beveled inner edge
  borderWidth: number; // inches
}

export interface ArtworkOption {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  aspectRatio: number; // w / h
}

export interface FrameCustomizationConfig {
  frameId: string;
  width: number;
  height: number;
  unit: DimensionUnit;
  matEnabled: boolean;
  matId: string;
  matColorHex: string;
  matWidth: number; // in inches
  artworkId: string;
  customArtUrl: string | null;
  artworkFit: ArtworkFitMode;
  glazingId: string;
  mountingId: string;
  wallColor: 'stone' | 'forest' | 'linen';
}

export interface WholesaleMouldingItem {
  id: string;
  frameId: string;
  name: string;
  sku: string;
  stickLengthFeet: number; // Standard 8.0 ft or 9.5 ft
  piecesPerBox: number; // e.g. 24 or 36 pieces
  totalFootagePerBox: number; // e.g. 192 or 288 linear ft
  pricePerFootINR: number;
  pricePerFootUSD: number;
  minOrderBoxes: number;
  finish: string;
  material: string;
  profileWidth: number;
  depth: number;
  inStock: boolean;
  leadTimeDays: number;
  tierDiscounts?: Array<{ minBoxes: number; discountPercent: number; label: string }>;
}

export interface GeneratedMockup {
  frame: FrameSample;
  width: number;
  height: number;
  unit: DimensionUnit;
  matOption: MatOption;
  artwork: ArtworkOption;
  wallColor: WallColor;
  generatedAt: string;
  estimatedPrice: number;
  aiPromptUsed: string;
  aspectRatioLabel: string;
  pixelWidth: number;
  pixelHeight: number;
}

