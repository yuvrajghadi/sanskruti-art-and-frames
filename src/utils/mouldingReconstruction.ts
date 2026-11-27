import { FrameSample } from '../types';

export interface ReconstructedMouldingAsset {
  frameId: string;
  sourcePhotoUrl: string;
  profileWidth: number;   // in inches
  depth: number;          // in inches
  rabbetDepth: number;    // in inches
  rabbetWidth: number;    // in inches
  
  // Flag indicating a front-facing studio rectangular frame photograph
  isRectangularFrame?: boolean;

  // Rectangular top-bar crop coordinates: [minX, minY, maxX, maxY] in normalized (0..1) space
  rectCrop?: [number, number, number, number];

  // Quadrilateral segmentation coordinates from original photo [x, y] in normalized (0..1) space (for chevrons)
  segmentationQuad?: {
    apexOuter: [number, number];
    armEndOuter: [number, number];
    armEndInner: [number, number];
    apexInner: [number, number];
  };

  // Reconstructed 2D Cross-Sectional Profile Spline Points: [faceDistance (0..1), height (0..1)]
  // 0 is outer back edge, 1 is inner sightline
  profileCurve: Array<[number, number]>;

  // Material and PBR parameters extracted from original sample
  pbr: {
    baseColor: string;
    metalness: number;
    roughness: number;
    bumpScale: number;
    normalStrength: number;
  };

  metadata: {
    reconstructedAt: string;
    algorithm: string;
    hasOrnamentalRelief: boolean;
    patternPeriodPixels: number;
  };
}

/**
 * Pre-calibrated photometric reconstruction data for catalog mouldings.
 * Derived directly from high-resolution original workshop and studio photography.
 */
export const RECONSTRUCTED_MOULDING_REGISTRY: Record<string, ReconstructedMouldingAsset> = {
  // ==========================================
  // REAL WORKSHOP CORNER CHEVRONS (1 to 7)
  // ==========================================

  // 1. Florentine Acanthus Baroque Gilt (SAA-FLR-01)
  'SAA-FLR-01': {
    frameId: 'SAA-FLR-01',
    sourcePhotoUrl: '/mouldings/moulding-1.jpg',
    profileWidth: 3.25,
    depth: 2.10,
    rabbetDepth: 1.155,
    rabbetWidth: 0.375,
    segmentationQuad: {
      apexOuter: [0.455, 0.345],
      armEndOuter: [0.035, 0.690],
      armEndInner: [0.220, 0.705],
      apexInner: [0.455, 0.470],
    },
    profileCurve: [
      [0.00, 0.90],
      [0.08, 0.98],
      [0.15, 0.78],
      [0.22, 0.65],
      [0.38, 0.82],
      [0.55, 0.95],
      [0.72, 0.70],
      [0.82, 0.88],
      [0.92, 0.60],
      [1.00, 0.55],
    ],
    pbr: {
      baseColor: '#c99738',
      metalness: 0.90,
      roughness: 0.28,
      bumpScale: 0.12,
      normalStrength: 1.8,
    },
    metadata: {
      reconstructedAt: '2026-11-11T23:45:00Z',
      algorithm: 'Photometric Homography & Sobel Gradient Normal Synthesis',
      hasOrnamentalRelief: true,
      patternPeriodPixels: 72,
    }
  },

  // 2. Venetian Distressed Gold Leaf (SAA-VEN-02)
  'SAA-VEN-02': {
    frameId: 'SAA-VEN-02',
    sourcePhotoUrl: '/mouldings/moulding-2.jpg',
    profileWidth: 2.50,
    depth: 1.65,
    rabbetDepth: 0.907,
    rabbetWidth: 0.35,
    segmentationQuad: {
      apexOuter: [0.355, 0.005],
      armEndOuter: [0.710, 0.445],
      armEndInner: [0.590, 0.450],
      apexInner: [0.355, 0.150],
    },
    profileCurve: [
      [0.00, 0.85],
      [0.12, 0.95],
      [0.30, 0.90],
      [0.60, 0.88],
      [0.85, 0.78],
      [1.00, 0.52],
    ],
    pbr: {
      baseColor: '#b39235',
      metalness: 0.84,
      roughness: 0.38,
      bumpScale: 0.06,
      normalStrength: 1.2,
    },
    metadata: {
      reconstructedAt: '2026-11-11T23:45:00Z',
      algorithm: 'Photometric Homography & Bole Saliency Extraction',
      hasOrnamentalRelief: false,
      patternPeriodPixels: 48,
    }
  },

  // 3. Scandinavian Natural White Oak (SAA-OAK-03)
  'SAA-OAK-03': {
    frameId: 'SAA-OAK-03',
    sourcePhotoUrl: '/mouldings/moulding-3.jpg',
    profileWidth: 2.00,
    depth: 1.50,
    rabbetDepth: 0.825,
    rabbetWidth: 0.35,
    segmentationQuad: {
      apexOuter: [0.450, 0.350],
      armEndOuter: [0.038, 0.680],
      armEndInner: [0.225, 0.680],
      apexInner: [0.450, 0.470],
    },
    profileCurve: [
      [0.00, 0.92],
      [0.10, 0.96],
      [0.85, 0.96],
      [0.94, 0.85],
      [1.00, 0.50],
    ],
    pbr: {
      baseColor: '#d7b782',
      metalness: 0.04,
      roughness: 0.68,
      bumpScale: 0.04,
      normalStrength: 0.8,
    },
    metadata: {
      reconstructedAt: '2026-11-11T23:45:00Z',
      algorithm: 'Photometric Homography & Directional Grain Fiber Extraction',
      hasOrnamentalRelief: false,
      patternPeriodPixels: 64,
    }
  },

  // 4. Atelier Cerused Driftwood Ash (SAA-CRU-04)
  'SAA-CRU-04': {
    frameId: 'SAA-CRU-04',
    sourcePhotoUrl: '/mouldings/moulding-4.jpg',
    profileWidth: 2.25,
    depth: 1.55,
    rabbetDepth: 0.85,
    rabbetWidth: 0.35,
    segmentationQuad: {
      apexOuter: [0.475, 0.330],
      armEndOuter: [0.155, 0.620],
      armEndInner: [0.315, 0.605],
      apexInner: [0.485, 0.490],
    },
    profileCurve: [
      [0.00, 0.90],
      [0.20, 0.94],
      [0.75, 0.90],
      [0.92, 0.80],
      [1.00, 0.50],
    ],
    pbr: {
      baseColor: '#c2ab8a',
      metalness: 0.06,
      roughness: 0.72,
      bumpScale: 0.08,
      normalStrength: 1.1,
    },
    metadata: {
      reconstructedAt: '2026-11-11T23:45:00Z',
      algorithm: 'Photometric Homography & Open-Grain Ceruse Masking',
      hasOrnamentalRelief: false,
      patternPeriodPixels: 52,
    }
  },

  // 5. Imperial Gilded Acanthus (SAA-IMP-05)
  'SAA-IMP-05': {
    frameId: 'SAA-IMP-05',
    sourcePhotoUrl: '/mouldings/moulding-5.jpg',
    profileWidth: 3.50,
    depth: 2.25,
    rabbetDepth: 1.20,
    rabbetWidth: 0.375,
    segmentationQuad: {
      apexOuter: [0.505, 0.330],
      armEndOuter: [0.085, 0.650],
      armEndInner: [0.265, 0.655],
      apexInner: [0.510, 0.480],
    },
    profileCurve: [
      [0.00, 0.92],
      [0.15, 0.97],
      [0.35, 0.80],
      [0.60, 0.96],
      [0.85, 0.85],
      [1.00, 0.55],
    ],
    pbr: {
      baseColor: '#cca249',
      metalness: 0.88,
      roughness: 0.30,
      bumpScale: 0.11,
      normalStrength: 1.7,
    },
    metadata: {
      reconstructedAt: '2026-11-11T23:45:00Z',
      algorithm: 'Photometric Homography & High-Relief Rococo Synthesis',
      hasOrnamentalRelief: true,
      patternPeriodPixels: 80,
    }
  },

  // 6. Tuscan Walnut Burl (SAA-TUS-06)
  'SAA-TUS-06': {
    frameId: 'SAA-TUS-06',
    sourcePhotoUrl: '/mouldings/moulding-6.jpg',
    profileWidth: 2.75,
    depth: 1.75,
    rabbetDepth: 0.95,
    rabbetWidth: 0.35,
    segmentationQuad: {
      apexOuter: [0.480, 0.320],
      armEndOuter: [0.180, 0.590],
      armEndInner: [0.330, 0.580],
      apexInner: [0.485, 0.465],
    },
    profileCurve: [
      [0.00, 0.88],
      [0.25, 0.92],
      [0.65, 0.86],
      [0.90, 0.78],
      [1.00, 0.52],
    ],
    pbr: {
      baseColor: '#3d2516',
      metalness: 0.15,
      roughness: 0.55,
      bumpScale: 0.05,
      normalStrength: 0.9,
    },
    metadata: {
      reconstructedAt: '2026-11-11T23:45:00Z',
      algorithm: 'Photometric Homography & Figured Walnut Burl Synthesis',
      hasOrnamentalRelief: false,
      patternPeriodPixels: 58,
    }
  },

  // 7. Castilian Oxidized Silver Leaf (SAA-SIL-07)
  'SAA-SIL-07': {
    frameId: 'SAA-SIL-07',
    sourcePhotoUrl: '/mouldings/moulding-7.jpg',
    profileWidth: 2.65,
    depth: 1.70,
    rabbetDepth: 0.92,
    rabbetWidth: 0.35,
    segmentationQuad: {
      apexOuter: [0.505, 0.350],
      armEndOuter: [0.055, 0.665],
      armEndInner: [0.235, 0.670],
      apexInner: [0.505, 0.490],
    },
    profileCurve: [
      [0.00, 0.90],
      [0.12, 0.96],
      [0.35, 0.82],
      [0.65, 0.94],
      [0.85, 0.80],
      [1.00, 0.54],
    ],
    pbr: {
      baseColor: '#b8b5b0',
      metalness: 0.88,
      roughness: 0.32,
      bumpScale: 0.07,
      normalStrength: 1.3,
    },
    metadata: {
      reconstructedAt: '2026-11-11T23:45:00Z',
      algorithm: 'Photometric Homography & Silver Leaf Oxidation Mapping',
      hasOrnamentalRelief: true,
      patternPeriodPixels: 64,
    }
  },

  // ==========================================
  // REAL STUDIO RECTANGULAR FRAMES (8 to 24)
  // ==========================================

  // 23. Rich Mahogany with Gold Egg-and-Dart (SAA-MHG-23)
  'SAA-MHG-23': {
    frameId: 'SAA-MHG-23',
    sourcePhotoUrl: '/mouldings/ornate-mahogany-and-gold-frame.png',
    profileWidth: 3.00,
    depth: 1.90,
    rabbetDepth: 1.05,
    rabbetWidth: 0.35,
    isRectangularFrame: true,
    rectCrop: [0.18, 0.035, 0.82, 0.202],
    profileCurve: [
      [0.00, 0.88],
      [0.15, 0.95],
      [0.35, 0.82],
      [0.65, 0.98],
      [0.85, 0.78],
      [1.00, 0.65],
    ],
    pbr: {
      baseColor: '#421a14',
      metalness: 0.55,
      roughness: 0.38,
      bumpScale: 0.10,
      normalStrength: 1.7,
    },
    metadata: {
      reconstructedAt: '2026-11-13T23:45:00Z',
      algorithm: 'Rectilinear Studio Extraction & High-Relief Normal Synthesis',
      hasOrnamentalRelief: true,
      patternPeriodPixels: 56,
    }
  },

  // 8. Brushed Champagne Gold (SAA-BGD-08)
  'SAA-BGD-08': {
    frameId: 'SAA-BGD-08',
    sourcePhotoUrl: '/mouldings/brushed-gold-picture-frame-on-white.png',
    profileWidth: 2.25,
    depth: 1.40,
    rabbetDepth: 0.75,
    rabbetWidth: 0.30,
    isRectangularFrame: true,
    rectCrop: [0.20, 0.040, 0.80, 0.171],
    profileCurve: [
      [0.00, 0.92],
      [0.10, 0.96],
      [0.90, 0.96],
      [1.00, 0.50],
    ],
    pbr: {
      baseColor: '#d6b265',
      metalness: 0.85,
      roughness: 0.32,
      bumpScale: 0.03,
      normalStrength: 0.9,
    },
    metadata: {
      reconstructedAt: '2026-11-13T23:45:00Z',
      algorithm: 'Linear Anodized Brush Texture Synthesis',
      hasOrnamentalRelief: false,
      patternPeriodPixels: 40,
    }
  },

  // 10. Archival Matte Black & Gilded Bead (SAA-BLK-10)
  'SAA-BLK-10': {
    frameId: 'SAA-BLK-10',
    sourcePhotoUrl: '/mouldings/elegant-black-and-gold-empty-frame.png',
    profileWidth: 2.75,
    depth: 1.75,
    rabbetDepth: 0.95,
    rabbetWidth: 0.35,
    isRectangularFrame: true,
    rectCrop: [0.20, 0.035, 0.80, 0.128],
    profileCurve: [
      [0.00, 0.90],
      [0.25, 0.94],
      [0.75, 0.90],
      [0.90, 0.98],
      [1.00, 0.55],
    ],
    pbr: {
      baseColor: '#1a1a1a',
      metalness: 0.45,
      roughness: 0.40,
      bumpScale: 0.06,
      normalStrength: 1.3,
    },
    metadata: {
      reconstructedAt: '2026-11-13T23:45:00Z',
      algorithm: 'Dual-Finish Matte & Gilded Bead Extraction',
      hasOrnamentalRelief: true,
      patternPeriodPixels: 48,
    }
  },

  // 11. Deep Ebony Hardwood & Gold Inset (SAA-WGD-11)
  'SAA-WGD-11': {
    frameId: 'SAA-WGD-11',
    sourcePhotoUrl: '/mouldings/elegant-dark-wood-frame-with-gold-trim.png',
    profileWidth: 2.85,
    depth: 1.80,
    rabbetDepth: 1.00,
    rabbetWidth: 0.35,
    isRectangularFrame: true,
    rectCrop: [0.20, 0.035, 0.80, 0.145],
    profileCurve: [
      [0.00, 0.90],
      [0.20, 0.95],
      [0.70, 0.92],
      [0.90, 0.98],
      [1.00, 0.58],
    ],
    pbr: {
      baseColor: '#2b1b17',
      metalness: 0.40,
      roughness: 0.42,
      bumpScale: 0.07,
      normalStrength: 1.4,
    },
    metadata: {
      reconstructedAt: '2026-11-13T23:45:00Z',
      algorithm: 'Hardwood Grain & Gold Leaf Inlay Extraction',
      hasOrnamentalRelief: true,
      patternPeriodPixels: 52,
    }
  },

  // 19. Ornate Burgundy Bole & Vintage Gold (SAA-BVG-19)
  'SAA-BVG-19': {
    frameId: 'SAA-BVG-19',
    sourcePhotoUrl: '/mouldings/ornate-burgundy-and-gold-vintage-frame.png',
    profileWidth: 3.25,
    depth: 2.15,
    rabbetDepth: 1.15,
    rabbetWidth: 0.375,
    isRectangularFrame: true,
    rectCrop: [0.18, 0.026, 0.82, 0.209],
    profileCurve: [
      [0.00, 0.92],
      [0.15, 0.98],
      [0.40, 0.82],
      [0.65, 0.96],
      [0.85, 0.88],
      [1.00, 0.60],
    ],
    pbr: {
      baseColor: '#581822',
      metalness: 0.60,
      roughness: 0.35,
      bumpScale: 0.11,
      normalStrength: 1.7,
    },
    metadata: {
      reconstructedAt: '2026-11-13T23:45:00Z',
      algorithm: 'Enamel Bole & Relief Gilt Extraction',
      hasOrnamentalRelief: true,
      patternPeriodPixels: 64,
    }
  },

  // 22. Ornate Golden Renaissance Acanthus (SAA-GBF-22)
  'SAA-GBF-22': {
    frameId: 'SAA-GBF-22',
    sourcePhotoUrl: '/mouldings/ornate-golden-baroque-picture-frame.png',
    profileWidth: 3.60,
    depth: 2.35,
    rabbetDepth: 1.25,
    rabbetWidth: 0.40,
    isRectangularFrame: true,
    rectCrop: [0.18, 0.066, 0.82, 0.182],
    profileCurve: [
      [0.00, 0.94],
      [0.15, 0.98],
      [0.35, 0.78],
      [0.60, 0.98],
      [0.85, 0.88],
      [1.00, 0.62],
    ],
    pbr: {
      baseColor: '#d6a337',
      metalness: 0.92,
      roughness: 0.26,
      bumpScale: 0.13,
      normalStrength: 1.85,
    },
    metadata: {
      reconstructedAt: '2026-11-13T23:45:00Z',
      algorithm: 'Renaissance Acanthus Undercut Normal Synthesis',
      hasOrnamentalRelief: true,
      patternPeriodPixels: 76,
    }
  },

  // 24. Rustic Whitewashed Nordic Timber (SAA-RWW-24)
  'SAA-RWW-24': {
    frameId: 'SAA-RWW-24',
    sourcePhotoUrl: '/mouldings/rustic-whitewashed-wooden-picture-frame.png',
    profileWidth: 2.50,
    depth: 1.50,
    rabbetDepth: 0.80,
    rabbetWidth: 0.35,
    isRectangularFrame: true,
    rectCrop: [0.20, 0.038, 0.80, 0.165],
    profileCurve: [
      [0.00, 0.90],
      [0.15, 0.94],
      [0.85, 0.92],
      [1.00, 0.50],
    ],
    pbr: {
      baseColor: '#dfdcd5',
      metalness: 0.03,
      roughness: 0.78,
      bumpScale: 0.07,
      normalStrength: 1.2,
    },
    metadata: {
      reconstructedAt: '2026-11-13T23:45:00Z',
      algorithm: 'Wire-Brushed Open Fissure Extraction',
      hasOrnamentalRelief: false,
      patternPeriodPixels: 50,
    }
  }
};

/**
 * Image Cache for Rectified and Seamless Texture Maps
 */
const TEXTURE_CACHE = new Map<string, {
  diffuseCanvas: HTMLCanvasElement;
  normalCanvas: HTMLCanvasElement;
  roughnessCanvas: HTMLCanvasElement;
}>();

const DATA_URL_CACHE = new Map<string, string>();
const IN_FLIGHT_PROMISES = new Map<string, Promise<{
  diffuseCanvas: HTMLCanvasElement;
  normalCanvas: HTMLCanvasElement;
  roughnessCanvas: HTMLCanvasElement;
}>>();

/**
 * Returns immediate synchronous cached data URL for a frame if already generated.
 */
export function getCachedMouldingDataUrl(frameId: string): string | null {
  return DATA_URL_CACHE.get(frameId) || null;
}

/**
 * Pre-warm texture cache in background during idle moments for instantaneous rendering.
 */
export function prewarmMouldingTextures(frames: FrameSample[]): void {
  if (typeof window === 'undefined') return;
  const runner = () => {
    // Warm up first 7 workshop samples sequentially with slight breathing room
    frames.slice(0, 7).forEach((frame, idx) => {
      setTimeout(() => {
        if (!TEXTURE_CACHE.has(frame.id) && !IN_FLIGHT_PROMISES.has(frame.id)) {
          reconstructMouldingTextures(frame).catch(() => {});
        }
      }, idx * 120);
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runner, { timeout: 3000 });
  } else {
    setTimeout(runner, 1000);
  }
}

/**
 * Master Homography & Photometric Texture Rectification Engine.
 * Extracts a rectilinear strip [length x profileWidth] from the original sample photograph.
 * For studio rectangular frames: samples the continuous horizontal top bar with zero perspective distortion.
 * For workshop corner chevrons: applies bilinear homography to unwarp the 45-degree hand-held arm.
 */
export async function reconstructMouldingTextures(
  frame: FrameSample,
  options?: { highDpi?: boolean }
): Promise<{
  diffuseCanvas: HTMLCanvasElement;
  normalCanvas: HTMLCanvasElement;
  roughnessCanvas: HTMLCanvasElement;
}> {
  const cacheKey = frame.id;
  if (TEXTURE_CACHE.has(cacheKey)) {
    return TEXTURE_CACHE.get(cacheKey)!;
  }

  if (IN_FLIGHT_PROMISES.has(cacheKey)) {
    return IN_FLIGHT_PROMISES.get(cacheKey)!;
  }

  const executionPromise = (async () => {
    const asset = RECONSTRUCTED_MOULDING_REGISTRY[frame.id];
    const photoUrl = frame.cornerDetailUrl || frame.thumbnailUrl || asset?.sourcePhotoUrl || '/mouldings/ornate-mahogany-and-gold-frame.png';

    // Support crisp High-DPI texture resolution (1024x256) on retina displays while preserving aspect ratio
    const useHiDpi = options?.highDpi ?? (typeof window !== 'undefined' && (window.devicePixelRatio || 1) >= 1.5);
    const stripW = useHiDpi ? 1024 : 512;
    const stripH = useHiDpi ? 256 : 128;

    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = stripW;
    diffuseCanvas.height = stripH;
    const diffCtx = diffuseCanvas.getContext('2d')!;

  // Load source photo
  const img = await loadImage(photoUrl);
  const srcW = img.naturalWidth || img.width || 1024;
  const srcH = img.naturalHeight || img.height || 1024;

  const isChevron = photoUrl.includes('moulding-1') ||
                    photoUrl.includes('moulding-2') ||
                    photoUrl.includes('moulding-3') ||
                    photoUrl.includes('moulding-4') ||
                    photoUrl.includes('moulding-5') ||
                    photoUrl.includes('moulding-6') ||
                    photoUrl.includes('moulding-7');

  const isRectangular = !isChevron || Boolean(asset?.isRectangularFrame);

  let outData: Uint8ClampedArray;

  if (isRectangular) {
    // -------------------------------------------------------------
    // PATH A: STUDIO RECTILINEAR EXTRACTION (e.g. SAA-MHG-23)
    // Extracts the pristine, unwarped horizontal top bar directly.
    // -------------------------------------------------------------
    let cropMinX = 0.20;
    let cropMaxX = 0.80;
    let cropMinY = 0.035;
    let cropMaxY = 0.180;

    if (asset?.rectCrop) {
      [cropMinX, cropMinY, cropMaxX, cropMaxY] = asset.rectCrop;
    } else {
      // Sustained studio background/opaque boundary detector resistant to specular highlights & alpha edges
      try {
        const probeH = Math.min(srcH, Math.floor(srcH * 0.45));
        const probeCanvas = document.createElement('canvas');
        probeCanvas.width = srcW;
        probeCanvas.height = probeH;
        const pCtx = probeCanvas.getContext('2d');
        if (pCtx) {
          pCtx.drawImage(img, 0, 0);
          const sampleXs = [
            Math.floor(srcW * 0.38),
            Math.floor(srcW * 0.50),
            Math.floor(srcW * 0.62),
          ];
          const cols = sampleXs.map((sx) => pCtx.getImageData(sx, 0, 1, probeH).data);
          const isBgRow = (y: number) => {
            let bgVotes = 0;
            for (const c of cols) {
              const r = c[y * 4];
              const g = c[y * 4 + 1];
              const b = c[y * 4 + 2];
              const a = c[y * 4 + 3];
              if (a < 20 || (r > 238 && g > 238 && b > 238)) {
                bgVotes++;
              }
            }
            return bgVotes >= 2;
          };

          let foundTop = -1;
          let foundInner = -1;
          let opaqueStreak = 0;
          let bgStreak = 0;

          for (let y = 0; y < probeH; y++) {
            const bg = isBgRow(y);
            if (foundTop === -1) {
              opaqueStreak = bg ? 0 : opaqueStreak + 1;
              if (opaqueStreak >= 4) {
                foundTop = y - 3;
              }
            } else if (y > foundTop + 42) {
              bgStreak = bg ? bgStreak + 1 : 0;
              if (bgStreak >= 10) {
                foundInner = y - 9;
                break;
              }
            }
          }
          if (foundTop !== -1 && foundInner !== -1 && foundInner - foundTop >= 36) {
            // Trim strictly 2px inside both edges to guarantee 0% white studio halo
            cropMinY = Math.max(0, (foundTop + 2) / srcH);
            cropMaxY = Math.min(1, (foundInner - 2) / srcH);
          }
        }
      } catch {
        // Fallback to safe defaults
        cropMinY = 0.038;
        cropMaxY = 0.178;
      }
    }

    const cropX = Math.max(0, Math.floor(cropMinX * srcW));
    const cropY = Math.max(0, Math.floor(cropMinY * srcH));
    let cropW = Math.min(srcW - cropX, Math.floor((cropMaxX - cropMinX) * srcW));
    const cropH = Math.max(16, Math.min(srcH - cropY, Math.floor((cropMaxY - cropMinY) * srcH)));

    // Find best autocorrelation periodic crop length so carved/grain motifs meet cleanly at seam
    try {
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = cropW;
      sampleCanvas.height = cropH;
      const sCtx = sampleCanvas.getContext('2d');
      if (sCtx && cropW > 128) {
        sCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const rawPx = sCtx.getImageData(0, 0, cropW, cropH).data;
        const win = 20;
        const minLen = Math.max(win * 3, Math.floor(cropW * 0.62));
        const maxLen = cropW - win;
        let bestLen = cropW;
        let bestErr = Number.POSITIVE_INFINITY;
        const stepY = Math.max(1, Math.floor(cropH / 24));
        for (let cand = minLen; cand <= maxLen; cand += 2) {
          let err = 0;
          let count = 0;
          for (let y = 2; y < cropH - 2; y += stepY) {
            for (let dx = 0; dx < win; dx += 2) {
              const i0 = (y * cropW + dx) * 4;
              const i1 = (y * cropW + (cand - win + dx)) * 4;
              const dr = rawPx[i0] - rawPx[i1];
              const dg = rawPx[i0 + 1] - rawPx[i1 + 1];
              const db = rawPx[i0 + 2] - rawPx[i1 + 2];
              err += dr * dr + dg * dg + db * db;
              count++;
            }
          }
          const mse = err / Math.max(1, count);
          if (mse < bestErr) {
            bestErr = mse;
            bestLen = cand;
          }
        }
        if (bestLen >= minLen) {
          cropW = bestLen;
        }
      }
    } catch {
      // Non-fatal: proceed with nominal cropW
    }

    diffCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, stripW, stripH);
    const imgData = diffCtx.getImageData(0, 0, stripW, stripH);
    outData = imgData.data;

    // Profile-aware gentle longitudinal illumination leveling (removes end-to-end falloff without muting specular relief)
    const hasRelief = Boolean(asset?.metadata?.hasOrnamentalRelief ?? (frame.textureDetails?.reliefHeight && frame.textureDetails.reliefHeight > 0.35));
    const metalness = asset?.pbr?.metalness ?? (frame.goldTone ? 0.85 : 0.08);
    const levelingStrength = hasRelief ? 0.55 : metalness > 0.7 ? 0.45 : 0.72;
    const colLum = new Float32Array(stripW);
    for (let x = 0; x < stripW; x++) {
      let acc = 0;
      for (let y = 0; y < stripH; y++) {
        const idx = (y * stripW + x) * 4;
        acc += outData[idx] * 0.299 + outData[idx + 1] * 0.587 + outData[idx + 2] * 0.114;
      }
      colLum[x] = acc / stripH;
    }
    const smoothRadius = Math.max(32, Math.floor(stripW * 0.12));
    const smoothCol = new Float32Array(stripW);
    let globalLumSum = 0;
    for (let x = 0; x < stripW; x++) {
      let sum = 0;
      let cnt = 0;
      for (let k = -smoothRadius; k <= smoothRadius; k += 4) {
        const sx = (x + k + stripW) % stripW;
        sum += colLum[sx];
        cnt++;
      }
      smoothCol[x] = sum / Math.max(1, cnt);
      globalLumSum += smoothCol[x];
    }
    const targetLum = globalLumSum / stripW;
    for (let x = 0; x < stripW; x++) {
      const ratio = targetLum / Math.max(18, smoothCol[x]);
      const clampedRatio = Math.max(0.86, Math.min(1.16, ratio));
      const gain = 1 + (clampedRatio - 1) * levelingStrength;
      for (let y = 0; y < stripH; y++) {
        const idx = (y * stripW + x) * 4;
        outData[idx] = Math.min(255, Math.max(0, Math.round(outData[idx] * gain)));
        outData[idx + 1] = Math.min(255, Math.max(0, Math.round(outData[idx + 1] * gain)));
        outData[idx + 2] = Math.min(255, Math.max(0, Math.round(outData[idx + 2] * gain)));
      }
    }

    // Apply seamless raised-cosine cross-fade across wrap seam for continuous tiling
    const blendWidth = Math.min(64, Math.floor(stripW * 0.08));
    for (let y = 0; y < stripH; y++) {
      for (let x = 0; x < blendWidth; x++) {
        const t = x / blendWidth;
        const leftIdx = (y * stripW + x) * 4;
        const rightIdx = (y * stripW + (stripW - blendWidth + x)) * 4;
        const factor = 0.5 * (1 - Math.cos(Math.PI * t));
        for (let c = 0; c < 3; c++) {
          const blended = Math.round(outData[rightIdx + c] * (1 - factor) + outData[leftIdx + c] * factor);
          outData[leftIdx + c] = blended;
          outData[rightIdx + c] = blended;
        }
      }
    }
    diffCtx.putImageData(imgData, 0, 0);

  } else {
    // -------------------------------------------------------------
    // PATH B: WORKSHOP CORNER CHEVRON BILINEAR HOMOGRAPHY
    // Unwarps a hand-held 45° corner arm into a horizontal strip.
    // -------------------------------------------------------------
    const q = asset?.segmentationQuad || {
      apexOuter: [0.455, 0.345],
      armEndOuter: [0.035, 0.690],
      armEndInner: [0.220, 0.705],
      apexInner: [0.455, 0.470],
    };

    const p00 = [q.armEndOuter[0] * srcW, q.armEndOuter[1] * srcH];
    const p10 = [q.apexOuter[0] * srcW, q.apexOuter[1] * srcH];
    const p11 = [q.apexInner[0] * srcW, q.apexInner[1] * srcH];
    const p01 = [q.armEndInner[0] * srcW, q.armEndInner[1] * srcH];

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = srcW;
    srcCanvas.height = srcH;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(img, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data;

    const outImgData = diffCtx.createImageData(stripW, stripH);
    outData = outImgData.data;

    for (let y = 0; y < stripH; y++) {
      const v = y / (stripH - 1);
      for (let x = 0; x < stripW; x++) {
        const u = x / (stripW - 1);
        const sx = (1 - u) * (1 - v) * p00[0] + u * (1 - v) * p10[0] + u * v * p11[0] + (1 - u) * v * p01[0];
        const sy = (1 - u) * (1 - v) * p00[1] + u * (1 - v) * p10[1] + u * v * p11[1] + (1 - u) * v * p01[1];

        const isx = Math.min(srcW - 1, Math.max(0, Math.floor(sx)));
        const isy = Math.min(srcH - 1, Math.max(0, Math.floor(sy)));
        const srcIdx = (isy * srcW + isx) * 4;
        const outIdx = (y * stripW + x) * 4;

        outData[outIdx] = srcData[srcIdx];
        outData[outIdx + 1] = srcData[srcIdx + 1];
        outData[outIdx + 2] = srcData[srcIdx + 2];
        outData[outIdx + 3] = 255;
      }
    }

    // Seamless tile blending for chevron strip
    const blendWidth = Math.min(48, Math.floor(stripW * 0.12));
    for (let y = 0; y < stripH; y++) {
      for (let x = 0; x < blendWidth; x++) {
        const t = x / blendWidth;
        const leftIdx = (y * stripW + x) * 4;
        const rightIdx = (y * stripW + (stripW - blendWidth + x)) * 4;
        const factor = 0.5 * (1 - Math.cos(Math.PI * t));
        for (let c = 0; c < 3; c++) {
          const blended = Math.round(outData[rightIdx + c] * (1 - factor) + outData[leftIdx + c] * factor);
          outData[leftIdx + c] = blended;
          outData[rightIdx + c] = blended;
        }
      }
    }
    diffCtx.putImageData(outImgData, 0, 0);
  }

  // -------------------------------------------------------------
  // SURFACE NORMAL MAP GENERATION (Sobel Gradient Filter)
  // -------------------------------------------------------------
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = stripW;
  normalCanvas.height = stripH;
  const normCtx = normalCanvas.getContext('2d')!;
  const normImgData = normCtx.createImageData(stripW, stripH);
  const normData = normImgData.data;

  // Grayscale buffer
  const gray = new Float32Array(stripW * stripH);
  for (let i = 0; i < stripW * stripH; i++) {
    const idx = i * 4;
    gray[i] = (outData[idx] * 0.299 + outData[idx + 1] * 0.587 + outData[idx + 2] * 0.114) / 255.0;
  }

  const strength = asset?.pbr?.normalStrength || 1.6;

  for (let y = 0; y < stripH; y++) {
    const ym1 = Math.max(0, y - 1);
    const yp1 = Math.min(stripH - 1, y + 1);
    for (let x = 0; x < stripW; x++) {
      const xm1 = (x - 1 + stripW) % stripW;
      const xp1 = (x + 1) % stripW;
      const tl = gray[ym1 * stripW + xm1];
      const tc = gray[ym1 * stripW + x];
      const tr = gray[ym1 * stripW + xp1];
      const ml = gray[y * stripW + xm1];
      const mr = gray[y * stripW + xp1];
      const bl = gray[yp1 * stripW + xm1];
      const bc = gray[yp1 * stripW + x];
      const br = gray[yp1 * stripW + xp1];

      const dx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
      const dy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);

      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * stripW + x) * 4;
      normData[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      normData[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normData[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normData[idx + 3] = 255;
    }
  }
  normCtx.putImageData(normImgData, 0, 0);

  // -------------------------------------------------------------
  // ROUGHNESS MAP GENERATION
  // -------------------------------------------------------------
  const roughnessCanvas = document.createElement('canvas');
  roughnessCanvas.width = stripW;
  roughnessCanvas.height = stripH;
  const roughCtx = roughnessCanvas.getContext('2d')!;
  const roughImgData = roughCtx.createImageData(stripW, stripH);
  const roughData = roughImgData.data;

  const baseRough = asset?.pbr?.roughness ?? 0.42;

  for (let i = 0; i < stripW * stripH; i++) {
    const idx = i * 4;
    const lum = gray[i];
    const localRough = Math.min(255, Math.max(20, Math.round((baseRough + (1.0 - lum) * 0.35) * 255)));
    roughData[idx] = localRough;
    roughData[idx + 1] = localRough;
    roughData[idx + 2] = localRough;
    roughData[idx + 3] = 255;
  }
  roughCtx.putImageData(roughImgData, 0, 0);

    const result = { diffuseCanvas, normalCanvas, roughnessCanvas };
    TEXTURE_CACHE.set(cacheKey, result);
    try {
      DATA_URL_CACHE.set(frame.id, diffuseCanvas.toDataURL());
    } catch {
      // Ignore canvas toDataURL errors if tainted
    }
    return result;
  })();

  IN_FLIGHT_PROMISES.set(cacheKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    IN_FLIGHT_PROMISES.delete(cacheKey);
  }
}

/**
 * Robust image loader with CORS handling for external links and clean local loading
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load molding image from: ${src}`));
    img.src = src;
  });
}
