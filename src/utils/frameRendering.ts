import { FrameSample } from '../types';

export type FrameMaterialType = 
  | 'carved-gold' 
  | 'distressed-gilt' 
  | 'natural-wood' 
  | 'cerused-ash' 
  | 'burl-walnut' 
  | 'silver-leaf' 
  | 'modern-lacquer';

export interface FrameMaterialProfile {
  type: FrameMaterialType;
  metalness: number;
  roughness: number;
  bumpScale: number;
  baseColor: string;
  highlightColor: string;
  shadowColor: string;
  patinaColor: string;
  boleColor: string;
  hasBeadedFillet: boolean;
  hasCrossHatching: boolean;
  grainOrientation: 'horizontal' | 'vertical' | 'radial';
  description: string;
}

/**
 * Classifies a frame profile and computes physical rendering parameters
 * based on the frame's style, category, finish, and textureDetails.
 */
export function getFrameMaterialProfile(frame: FrameSample): FrameMaterialProfile {
  const id = frame.id.toUpperCase();
  const cat = frame.category;
  const finish = (frame.finish || '').toLowerCase();
  const name = (frame.name || '').toLowerCase();
  const pattern = frame.textureDetails?.carvingPattern;

  // 1. Florentine Acanthus Baroque Gilt (SAA-FLR-01) or high-relief baroque gold
  if (id === 'SAA-FLR-01' || id === 'SAA-VER-05' || pattern === 'baroque' || pattern === 'acanthus') {
    return {
      type: 'carved-gold',
      metalness: 0.90,
      roughness: 0.28,
      bumpScale: 0.10,
      baseColor: frame.colorHex || '#c99738',
      highlightColor: '#f7e199',
      shadowColor: '#4e330d',
      patinaColor: '#362409',
      boleColor: '#631d10',
      hasBeadedFillet: true,
      hasCrossHatching: true,
      grainOrientation: 'radial',
      description: 'Ornate guild-carved acanthus relief with burnished gold leaf & burnt umber glaze'
    };
  }

  // 2. Venetian Distressed Gold Leaf (SAA-VEN-02) or antique gold foil
  if (id === 'SAA-VEN-02' || cat === 'antique-gilt' || pattern === 'distressed-burl') {
    return {
      type: 'distressed-gilt',
      metalness: 0.84,
      roughness: 0.38,
      bumpScale: 0.05,
      baseColor: frame.colorHex || '#b39235',
      highlightColor: '#ecd57f',
      shadowColor: '#45320e',
      patinaColor: '#2b1c04',
      boleColor: '#7a2b1b', // authentic Venetian red clay bole
      hasBeadedFillet: false,
      hasCrossHatching: false,
      grainOrientation: 'radial',
      description: 'Hand-distressed gold foil patina with warm Venetian red clay bole rub-through'
    };
  }

  // 3. Scandinavian Natural White Oak (SAA-OAK-03) or natural blonde oak
  if (id === 'SAA-OAK-03' || name.includes('oak') || finish.includes('oak')) {
    return {
      type: 'natural-wood',
      metalness: 0.04,
      roughness: 0.68,
      bumpScale: 0.04,
      baseColor: frame.colorHex || '#d7b782',
      highlightColor: '#f0ddb7',
      shadowColor: '#785b2e',
      patinaColor: '#533c1a',
      boleColor: 'transparent',
      hasBeadedFillet: false,
      hasCrossHatching: false,
      grainOrientation: 'horizontal',
      description: 'Quarter-sawn solid white oak with prominent linear grain lines & organic beeswax matte finish'
    };
  }

  // 4. Atelier Cerused Driftwood Ash (SAA-CRU-04)
  if (id === 'SAA-CRU-04' || finish.includes('ceruse') || name.includes('ash')) {
    return {
      type: 'cerused-ash',
      metalness: 0.06,
      roughness: 0.72,
      bumpScale: 0.08,
      baseColor: frame.colorHex || '#c2ab8a',
      highlightColor: '#ede2d1', // white ceruse lime wash
      shadowColor: '#63513a',
      patinaColor: '#443625',
      boleColor: 'transparent',
      hasBeadedFillet: false,
      hasCrossHatching: false,
      grainOrientation: 'horizontal',
      description: 'Wire-brushed European ash with contrasting white ceruse lime wash open grain fissures'
    };
  }

  // 5. Rich Mahogany with Gold Egg-and-Dart (SAA-MHG-23)
  if (id === 'SAA-MHG-23' || name.includes('mahogany')) {
    return {
      type: 'burl-walnut',
      metalness: 0.55,
      roughness: 0.38,
      bumpScale: 0.09,
      baseColor: frame.colorHex || '#421a14',
      highlightColor: frame.innerBevelHex || '#cca249',
      shadowColor: frame.outerBevelHex || '#210906',
      patinaColor: '#150604',
      boleColor: '#3d120a',
      hasBeadedFillet: true,
      hasCrossHatching: false,
      grainOrientation: 'horizontal',
      description: 'Lustrous ribbon Honduran mahogany with gilded egg-and-dart carving & warm amber varnish'
    };
  }

  // 6. Bolognese Umber & Antiqued Gold Fillet (SAA-BOL-06) or walnut burl
  if (id === 'SAA-BOL-06' || pattern === 'fluted' || name.includes('walnut') || name.includes('burl')) {
    return {
      type: 'burl-walnut',
      metalness: 0.25,
      roughness: 0.45,
      bumpScale: 0.06,
      baseColor: frame.colorHex || '#3a2518',
      highlightColor: '#c89e47', // gold fillet highlight
      shadowColor: '#1d120a',
      patinaColor: '#120b06',
      boleColor: '#522013',
      hasBeadedFillet: true,
      hasCrossHatching: false,
      grainOrientation: 'radial',
      description: 'Deep hand-rubbed burnt umber burl walnut with gilded acanthus inner lip'
    };
  }

  // 6. Castilian Oxidized Silver Leaf (SAA-SIL-07) or silver leaf
  if (id === 'SAA-SIL-07' || cat === 'modern-gallery' && name.includes('silver') || finish.includes('silver')) {
    return {
      type: 'silver-leaf',
      metalness: 0.88,
      roughness: 0.32,
      bumpScale: 0.07,
      baseColor: frame.colorHex || '#b8b5b0',
      highlightColor: '#f2f1ee',
      shadowColor: '#454341',
      patinaColor: '#21201f',
      boleColor: '#2b2a29',
      hasBeadedFillet: true,
      hasCrossHatching: false,
      grainOrientation: 'radial',
      description: 'Antiqued oxidized silver leaf with graphite wash & baroque bead-and-reel relief'
    };
  }

  // 7. General Wood Frames (Walnut, Mahogany, Ebonized)
  if (frame.woodGrain || cat === 'classic-wood') {
    return {
      type: 'natural-wood',
      metalness: 0.05,
      roughness: 0.62,
      bumpScale: 0.04,
      baseColor: frame.colorHex || '#4A3728',
      highlightColor: frame.innerBevelHex || '#684d38',
      shadowColor: frame.outerBevelHex || '#2b1f16',
      patinaColor: '#1a130d',
      boleColor: 'transparent',
      hasBeadedFillet: false,
      hasCrossHatching: false,
      grainOrientation: 'horizontal',
      description: 'Fine architectural hardwood with organic grain pores & satin luster'
    };
  }

  // 8. General Gold Tone Frames
  if (frame.goldTone || cat === 'ornate-gold') {
    return {
      type: 'carved-gold',
      metalness: 0.86,
      roughness: 0.30,
      bumpScale: 0.08,
      baseColor: frame.colorHex || '#D4AF37',
      highlightColor: frame.innerBevelHex || '#f3d97f',
      shadowColor: frame.outerBevelHex || '#6b5110',
      patinaColor: '#3d2e08',
      boleColor: '#631d10',
      hasBeadedFillet: true,
      hasCrossHatching: true,
      grainOrientation: 'radial',
      description: 'Classic gilded moulding with ornamental bevels & metallic luster'
    };
  }

  // Default: Modern Gallery Lacquer
  return {
    type: 'modern-lacquer',
    metalness: 0.08,
    roughness: 0.50,
    bumpScale: 0.02,
    baseColor: frame.colorHex || '#2B2B2A',
    highlightColor: frame.innerBevelHex || '#4A4A48',
    shadowColor: frame.outerBevelHex || '#151514',
    patinaColor: '#0a0a09',
    boleColor: 'transparent',
    hasBeadedFillet: false,
    hasCrossHatching: false,
    grainOrientation: 'horizontal',
    description: 'Precision museum gallery profile with satin architectural finish'
  };
}

/**
 * Deterministic PRNG (FNV-1a hash + Mulberry32) so procedural textures are reproducible per profile.
 */
function createSeededRng(seedKey: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedKey.length; i++) {
    h ^= seedKey.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let state = h || 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws a horizontally/vertically periodic bevel profile shading band derived strictly
 * from documented outerBevelHex, baseColor, and innerBevelHex attributes.
 */
function drawDocumentedBevelBands(
  ctx: CanvasRenderingContext2D,
  frame: FrameSample,
  profile: FrameMaterialProfile,
  width: number,
  height: number,
  isHoriz: boolean
): void {
  const outerHex = frame.outerBevelHex || profile.shadowColor;
  const innerHex = frame.innerBevelHex || profile.highlightColor;
  const grad = isHoriz
    ? ctx.createLinearGradient(0, 0, 0, height)
    : ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0.0, outerHex);
  grad.addColorStop(0.14, profile.baseColor);
  grad.addColorStop(0.5, profile.baseColor);
  grad.addColorStop(0.86, profile.baseColor);
  grad.addColorStop(1.0, innerHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle architectural ridge separator along outer and inner step bounds
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = profile.shadowColor;
  if (isHoriz) {
    ctx.fillRect(0, Math.round(height * 0.14), width, Math.max(1, Math.round(height * 0.015)));
    ctx.fillRect(0, Math.round(height * 0.84), width, Math.max(1, Math.round(height * 0.015)));
  } else {
    ctx.fillRect(Math.round(width * 0.14), 0, Math.max(1, Math.round(width * 0.015)), height);
    ctx.fillRect(Math.round(width * 0.84), 0, Math.max(1, Math.round(width * 0.015)), height);
  }
  ctx.restore();
}

/**
 * Deterministic, Seamlessly Tileable HTML5 Canvas Texture Generator
 * Creates dedicated texture maps (diffuse, bump, roughness) for Three.js WebGL and SVG patterns.
 */
export function generateProceduralFrameCanvas(
  frame: FrameSample,
  mapType: 'diffuse' | 'bump' | 'roughness' = 'diffuse',
  width: number = 512,
  height: number = 512,
  barOrientation: 'horizontal' | 'vertical' = 'horizontal'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const profile = getFrameMaterialProfile(frame);
  const rng = createSeededRng(`${frame.id}:${mapType}:${barOrientation}`);
  const isHoriz = barOrientation === 'horizontal';
  const spanLen = isHoriz ? width : height;

  const drawWrapped = (fn: (offset: number) => void) => {
    fn(-spanLen);
    fn(0);
    fn(spanLen);
  };

  if (mapType === 'diffuse') {
    // 1. Documented Bevel Base Fill (outer -> center frieze -> inner sightline)
    drawDocumentedBevelBands(ctx, frame, profile, width, height, isHoriz);

    if (profile.type === 'natural-wood' || profile.type === 'cerused-ash' || profile.type === 'burl-walnut') {
      const fiberCount = 160;
      const harmonicCycles = 2; // Integer period guarantees C1 wrap continuity at x=0 and x=width

      for (let i = 0; i < fiberCount; i++) {
        const pos = rng() * (isHoriz ? height : width);
        const thickness = 0.5 + rng() * 2.0;
        const alpha = 0.07 + rng() * 0.22;
        const isHighlight = rng() > 0.65;
        const phase = rng() * Math.PI * 2;
        const amp = 1.2 + rng() * 1.8;

        ctx.strokeStyle = isHighlight ? profile.highlightColor : profile.shadowColor;
        ctx.globalAlpha = profile.type === 'cerused-ash' && isHighlight ? alpha * 1.7 : alpha;
        ctx.lineWidth = thickness;

        ctx.beginPath();
        if (isHoriz) {
          for (let x = 0; x <= width; x += 16) {
            const wave = Math.sin((x / width) * Math.PI * 2 * harmonicCycles + phase) * amp;
            if (x === 0) ctx.moveTo(x, pos + wave);
            else ctx.lineTo(x, pos + wave);
          }
        } else {
          for (let y = 0; y <= height; y += 16) {
            const wave = Math.sin((y / height) * Math.PI * 2 * harmonicCycles + phase) * amp;
            if (y === 0) ctx.moveTo(pos + wave, y);
            else ctx.lineTo(pos + wave, y);
          }
        }
        ctx.stroke();
      }

      // Periodically wrapped timber pores
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = profile.shadowColor;
      for (let j = 0; j < 420; j++) {
        const rx = rng() * width;
        const ry = rng() * height;
        const rw = isHoriz ? 8 + rng() * 14 : 1.5;
        const rh = isHoriz ? 1.5 : 8 + rng() * 14;
        drawWrapped((off) => {
          if (isHoriz) ctx.fillRect(rx + off, ry, rw, rh);
          else ctx.fillRect(rx, ry + off, rw, rh);
        });
      }
    } else if (profile.type === 'carved-gold') {
      // Soft periodic woven stipple waves (integer period = C1 continuous wrap, zero 1px diagonal seam aliasing)
      ctx.globalAlpha = 0.14;
      for (let i = 0; i < 42; i++) {
        const y0 = height * (0.14 + (i / 42) * 0.72);
        const phase = rng() * Math.PI * 2;
        const cycles = 4 + (i % 4) * 2;
        ctx.strokeStyle = i % 2 === 0 ? profile.shadowColor : profile.highlightColor;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 8) {
          const wy = y0 + Math.sin((x / width) * Math.PI * 2 * cycles + phase) * 3.0;
          if (x === 0) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }

      // Organic seeded relief motifs placed cleanly across periodic span with varied radius/phase
      ctx.globalAlpha = 0.36;
      const scrollStep = 64;
      const count = Math.max(1, Math.round(spanLen / scrollStep));
      const exactStep = spanLen / count;
      for (let i = 0; i < count; i++) {
        const cx = (i + 0.32 + rng() * 0.36) * exactStep;
        const rad = Math.min(20, height * (0.13 + rng() * 0.05));
        drawWrapped((off) => {
          const px = cx + off;
          ctx.strokeStyle = profile.shadowColor;
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.arc(px, height * 0.48 + 2, rad, 0.2 * Math.PI, 1.2 * Math.PI);
          ctx.stroke();

          ctx.strokeStyle = profile.highlightColor;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(px, height * 0.48, rad, 0.2 * Math.PI, 1.2 * Math.PI);
          ctx.stroke();

          ctx.fillStyle = profile.highlightColor;
          ctx.beginPath();
          ctx.arc(px, height * 0.48, Math.min(4.5, height * 0.038), 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    } else if (profile.type === 'distressed-gilt') {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = profile.boleColor;
      for (let b = 0; b < 90; b++) {
        const bx = rng() * width;
        const by = rng() * height;
        const br = 2 + rng() * 8;
        drawWrapped((off) => {
          ctx.beginPath();
          ctx.arc(isHoriz ? bx + off : bx, isHoriz ? by : by + off, br, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      ctx.globalAlpha = 0.14;
      ctx.fillStyle = profile.highlightColor;
      for (let g = 0; g < 260; g++) {
        const gx = rng() * width;
        const gy = rng() * height;
        const gr = 1.5 + rng() * 3.5;
        drawWrapped((off) => {
          ctx.beginPath();
          ctx.arc(isHoriz ? gx + off : gx, isHoriz ? gy : gy + off, gr, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    } else if (profile.type === 'silver-leaf') {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = profile.shadowColor;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      for (let s = 0; s < 240; s++) {
        const sx = rng() * width;
        const sy = rng() * height;
        const sw = 3 + rng() * 14;
        drawWrapped((off) => {
          ctx.beginPath();
          ctx.moveTo(isHoriz ? sx + off : sx, isHoriz ? sy : sy + off);
          ctx.lineTo(isHoriz ? sx + off + sw : sx, isHoriz ? sy : sy + off + sw);
          ctx.stroke();
        });
      }
    }
    ctx.globalAlpha = 1;
  } else if (mapType === 'bump') {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, width, height);

    // Subtle transverse bevel height profile aligned with documented inner/outer steps
    const bevelGrad = isHoriz
      ? ctx.createLinearGradient(0, 0, 0, height)
      : ctx.createLinearGradient(0, 0, width, 0);
    bevelGrad.addColorStop(0.0, '#626262');
    bevelGrad.addColorStop(0.14, '#929292');
    bevelGrad.addColorStop(0.50, '#808080');
    bevelGrad.addColorStop(0.86, '#8c8c8c');
    bevelGrad.addColorStop(1.0, '#5c5c5c');
    ctx.fillStyle = bevelGrad;
    ctx.fillRect(0, 0, width, height);

    if (profile.type === 'natural-wood' || profile.type === 'cerused-ash' || profile.type === 'burl-walnut') {
      for (let i = 0; i < 140; i++) {
        const pos = rng() * (isHoriz ? height : width);
        const isRidge = rng() > 0.5;
        ctx.strokeStyle = isRidge ? '#a6a6a6' : '#585858';
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = 1 + rng() * 2.5;
        ctx.beginPath();
        if (isHoriz) {
          ctx.moveTo(0, pos);
          ctx.lineTo(width, pos);
        } else {
          ctx.moveTo(pos, 0);
          ctx.lineTo(pos, height);
        }
        ctx.stroke();
      }
    } else if (profile.type === 'carved-gold') {
      ctx.globalAlpha = 0.55;
      const count = Math.max(1, Math.round(spanLen / 64));
      const exactStep = spanLen / count;
      for (let i = 0; i < count; i++) {
        const cx = (i + 0.32 + rng() * 0.36) * exactStep;
        const rad = Math.min(20, height * (0.13 + rng() * 0.05));
        drawWrapped((off) => {
          const px = cx + off;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.arc(px, height * 0.48, rad, 0.2 * Math.PI, 1.2 * Math.PI);
          ctx.stroke();

          ctx.strokeStyle = '#202020';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(px, height * 0.48 + 3, rad, 0.2 * Math.PI, 1.2 * Math.PI);
          ctx.stroke();
        });
      }
    } else {
      ctx.globalAlpha = 0.12;
      for (let k = 0; k < 220; k++) {
        const x = rng() * width;
        const y = rng() * height;
        ctx.fillStyle = rng() > 0.5 ? '#9c9c9c' : '#646464';
        drawWrapped((off) => {
          ctx.beginPath();
          ctx.arc(isHoriz ? x + off : x, isHoriz ? y : y + off, 2.5, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    }
    ctx.globalAlpha = 1;
  } else if (mapType === 'roughness') {
    const baseRoughVal = Math.round(profile.roughness * 255);
    ctx.fillStyle = `rgb(${baseRoughVal}, ${baseRoughVal}, ${baseRoughVal})`;
    ctx.fillRect(0, 0, width, height);

    if (profile.type === 'distressed-gilt' || profile.type === 'carved-gold') {
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = '#181818';
      for (let r = 0; r < 180; r++) {
        const rx = rng() * width;
        const ry = rng() * height;
        const rr = 3 + rng() * 5;
        drawWrapped((off) => {
          ctx.beginPath();
          ctx.arc(isHoriz ? rx + off : rx, isHoriz ? ry : ry + off, rr, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    } else {
      ctx.globalAlpha = 0.10;
      ctx.strokeStyle = `rgb(${Math.max(20, baseRoughVal - 28)}, ${Math.max(20, baseRoughVal - 28)}, ${Math.max(20, baseRoughVal - 28)})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let r = 0; r < 140; r++) {
        const rx = rng() * width;
        const ry = rng() * height;
        drawWrapped((off) => {
          ctx.beginPath();
          ctx.moveTo(isHoriz ? rx + off : rx, isHoriz ? ry : ry + off);
          ctx.lineTo(isHoriz ? rx + off + 16 : rx, isHoriz ? ry : ry + off + 16);
          ctx.stroke();
        });
      }
    }
    ctx.globalAlpha = 1;
  }

  return canvas;
}

