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
 * Procedural HTML5 Canvas Texture Generator
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

  if (mapType === 'diffuse') {
    // 1. Base Fill
    ctx.fillStyle = profile.baseColor;
    ctx.fillRect(0, 0, width, height);

    if (profile.type === 'natural-wood' || profile.type === 'cerused-ash') {
      // Draw authentic longitudinal wood grain fibers
      const isHoriz = barOrientation === 'horizontal';
      const fiberCount = 180;
      
      for (let i = 0; i < fiberCount; i++) {
        const pos = Math.random() * (isHoriz ? height : width);
        const thickness = 0.5 + Math.random() * 2.2;
        const alpha = 0.08 + Math.random() * 0.25;
        const isHighlight = Math.random() > 0.65;
        
        ctx.strokeStyle = isHighlight 
          ? profile.highlightColor 
          : profile.shadowColor;
        ctx.globalAlpha = profile.type === 'cerused-ash' && isHighlight ? alpha * 1.8 : alpha;
        ctx.lineWidth = thickness;
        
        ctx.beginPath();
        if (isHoriz) {
          ctx.moveTo(0, pos);
          // Add subtle natural growth wave
          for (let x = 0; x <= width; x += 40) {
            const wave = Math.sin((x + i * 30) * 0.02) * 2.5;
            ctx.lineTo(x, pos + wave);
          }
        } else {
          ctx.moveTo(pos, 0);
          for (let y = 0; y <= height; y += 40) {
            const wave = Math.sin((y + i * 30) * 0.02) * 2.5;
            ctx.lineTo(pos + wave, y);
          }
        }
        ctx.stroke();
      }

      // Add natural timber medullary rays & pores
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = profile.shadowColor;
      for (let j = 0; j < 600; j++) {
        const rx = Math.random() * width;
        const ry = Math.random() * height;
        const rw = isHoriz ? 8 + Math.random() * 16 : 1.5;
        const rh = isHoriz ? 1.5 : 8 + Math.random() * 16;
        ctx.fillRect(rx, ry, rw, rh);
      }
    } else if (profile.type === 'carved-gold') {
      // Draw ornate baroque acanthus leaf scrolls & crosshatching
      // Crosshatching background
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = profile.shadowColor;
      ctx.lineWidth = 1;
      const step = 8;
      for (let x = -height; x < width + height; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + height, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + height, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Acanthus relief leaf scrolls
      ctx.globalAlpha = 0.45;
      const scrollStep = 64;
      for (let x = 0; x < width + scrollStep; x += scrollStep) {
        // Shadow leaf curve
        ctx.strokeStyle = profile.shadowColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x + 20, height * 0.45 + 2, 22, 0.2 * Math.PI, 1.2 * Math.PI);
        ctx.stroke();

        // Highlight leaf crest
        ctx.strokeStyle = profile.highlightColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x + 20, height * 0.45, 22, 0.2 * Math.PI, 1.2 * Math.PI);
        ctx.stroke();

        // Florets & rosettes
        ctx.fillStyle = profile.highlightColor;
        ctx.beginPath();
        ctx.arc(x + 20, height * 0.45, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else if (profile.type === 'distressed-gilt') {
      // Mottled gold foil with Venetian red bole peek-through
      // Bole undertone spots
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = profile.boleColor;
      for (let b = 0; b < 120; b++) {
        const bx = Math.random() * width;
        const by = Math.random() * height;
        const br = 2 + Math.random() * 12;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Irregular gold foil leaf cracks & burnish
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = profile.highlightColor;
      for (let g = 0; g < 400; g++) {
        const gx = Math.random() * width;
        const gy = Math.random() * height;
        const gw = 1 + Math.random() * 8;
        const gh = 1 + Math.random() * 8;
        ctx.fillRect(gx, gy, gw, gh);
      }
    } else if (profile.type === 'silver-leaf') {
      // Antiqued silver with graphite wash
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = profile.shadowColor;
      for (let s = 0; s < 300; s++) {
        const sx = Math.random() * width;
        const sy = Math.random() * height;
        ctx.fillRect(sx, sy, 3 + Math.random() * 14, 1.5);
      }
    }
  } else if (mapType === 'bump') {
    // Grayscale bump/displacement map (50% gray is neutral)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, width, height);

    if (profile.type === 'natural-wood' || profile.type === 'cerused-ash') {
      const isHoriz = barOrientation === 'horizontal';
      for (let i = 0; i < 150; i++) {
        const pos = Math.random() * (isHoriz ? height : width);
        const isRidge = Math.random() > 0.5;
        ctx.strokeStyle = isRidge ? '#b0b0b0' : '#505050';
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 1 + Math.random() * 3;
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
      // High contrast bump map for acanthus relief
      ctx.globalAlpha = 0.7;
      const scrollStep = 64;
      for (let x = 0; x < width + scrollStep; x += scrollStep) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x + 20, height * 0.45, 22, 0.2 * Math.PI, 1.2 * Math.PI);
        ctx.stroke();

        ctx.strokeStyle = '#202020';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + 20, height * 0.45 + 3, 22, 0.2 * Math.PI, 1.2 * Math.PI);
        ctx.stroke();
      }
    } else {
      // Noise grain bump
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      for (let k = 0; k < data.length; k += 4) {
        const noise = (Math.random() - 0.5) * 40;
        const val = Math.min(255, Math.max(0, 128 + noise));
        data[k] = val;
        data[k + 1] = val;
        data[k + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);
    }
  } else if (mapType === 'roughness') {
    // Roughness map (darker = glossier/smoother, brighter = rougher/matte)
    const baseRoughVal = Math.round(profile.roughness * 255);
    ctx.fillStyle = `rgb(${baseRoughVal}, ${baseRoughVal}, ${baseRoughVal})`;
    ctx.fillRect(0, 0, width, height);

    if (profile.type === 'distressed-gilt' || profile.type === 'carved-gold') {
      // Recesses are rougher (patina), crests are glossier (burnished gold leaf)
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#101010'; // glossy spots
      for (let r = 0; r < 200; r++) {
        ctx.fillRect(Math.random() * width, Math.random() * height, 12, 12);
      }
    }
  }

  return canvas;
}

