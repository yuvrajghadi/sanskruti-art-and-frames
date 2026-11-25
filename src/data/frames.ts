import { FrameSample, ArtworkOption, MatOption, WallColor } from '../types';
import { WORKSHOP_MOULDINGS } from './workshopSamples';

export const LEGACY_FRAME_SAMPLES: FrameSample[] = [
  {
    id: "GLD-401",
    name: "Versailles Baroque Gilt",
    description: "Hand-carved acanthus leaf motif with 24k Florentine gold leaf finish, deep scoop profile, and antique burnished patina.",
    thumbnailUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    cornerDetailUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=85",
    category: "ornate-gold",
    profileWidth: 3.5,
    depth: 2.25,
    finish: "24k Florentine Gold Leaf with Antiquing",
    material: "Solid Jelutong Hardwood & Gesso",
    style: "French Baroque",
    basePricePerFoot: 48,
    colorHex: "#d4af37",
    innerBevelHex: "#f3e5ab",
    outerBevelHex: "#856214",
    goldTone: true,
    textureDetails: {
      reliefHeight: 0.8,
      filigreeStyle: "Acanthus & Fleur-de-lis",
      carvingPattern: "baroque",
      sheen: "aged-patina"
    }
  },
  {
    id: "WOD-102",
    name: "Tuscan Heirloom Walnut",
    description: "Solid American Black Walnut with hand-rubbed Danish oil finish, gentle cove silhouette, and prominent figured grain.",
    thumbnailUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
    cornerDetailUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=85",
    category: "classic-wood",
    profileWidth: 2.75,
    depth: 1.5,
    finish: "Hand-rubbed Satin Danish Oil",
    material: "Grade-A American Walnut",
    style: "Traditional Renaissance",
    basePricePerFoot: 36,
    colorHex: "#4a3525",
    innerBevelHex: "#694a32",
    outerBevelHex: "#2b1c11",
    woodGrain: true,
    textureDetails: {
      reliefHeight: 0.3,
      filigreeStyle: "Subtle Step-Cove",
      carvingPattern: "smooth-miter",
      sheen: "satin-varnish"
    }
  },
  {
    id: "GLD-408",
    name: "Imperial Roman Fluted Gilt",
    description: "Classic Neoclassical fluting flanked by beaded pearl borders, bathed in warm champagne gold with subtle red clay undertones.",
    thumbnailUrl: "https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=600&q=80",
    cornerDetailUrl: "https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=1200&q=85",
    category: "antique-gilt",
    profileWidth: 3.0,
    depth: 1.85,
    finish: "Champagne Leaf with Bole Undercoat",
    material: "Fine Grain Basswood & Cast Resin Relief",
    style: "Neoclassical",
    basePricePerFoot: 42,
    colorHex: "#e5c158",
    innerBevelHex: "#f9e8a2",
    outerBevelHex: "#9b781e",
    goldTone: true,
    textureDetails: {
      reliefHeight: 0.6,
      filigreeStyle: "Ionic Fluting & Pearl Astragal",
      carvingPattern: "fluted",
      sheen: "satin-varnish"
    }
  },
  {
    id: "WOD-109",
    name: "Viennese Burl & Ebony Liner",
    description: "Rare Carpathian elm burl veneer with warm honey amber tones, complemented by an inset matte ebony sight-line fillet.",
    thumbnailUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80",
    cornerDetailUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85",
    category: "classic-wood",
    profileWidth: 3.25,
    depth: 2.0,
    finish: "High-Gloss Piano Lacquer over Natural Burl",
    material: "Carpathian Elm Burl & African Ebony",
    style: "Biedermeier / Art Deco",
    basePricePerFoot: 52,
    colorHex: "#7c4a22",
    innerBevelHex: "#1a1a1a",
    outerBevelHex: "#4d290e",
    woodGrain: true,
    textureDetails: {
      reliefHeight: 0.2,
      filigreeStyle: "Bookmatched Burl with Inlay",
      carvingPattern: "distressed-burl",
      sheen: "high-gloss"
    }
  },
  {
    id: "GLD-415",
    name: "Palazzo Rococo Filigree",
    description: "Dramatic pierced openwork corner cartouche featuring scrolling vines, scallop shells, and lustrous warm gold leaf.",
    thumbnailUrl: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=600&q=80",
    cornerDetailUrl: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1200&q=85",
    category: "ornate-gold",
    profileWidth: 4.25,
    depth: 2.75,
    finish: "Antiqued Gold Leaf with Bitumen Glaze",
    material: "Carved Limewood & Hand-Gilded Gesso",
    style: "Italian Rococo",
    basePricePerFoot: 65,
    colorHex: "#cfa63a",
    innerBevelHex: "#f0d57e",
    outerBevelHex: "#6e4e0b",
    goldTone: true,
    textureDetails: {
      reliefHeight: 1.1,
      filigreeStyle: "Pierced Shell & Rocaille Scroll",
      carvingPattern: "acanthus",
      sheen: "aged-patina"
    }
  },
  {
    id: "MOD-201",
    name: "SoHo Minimalist White Oak",
    description: "Clean deep-profile floating gallery frame in rift-sawn natural white oak with razor-sharp 45° miters and minimalist face.",
    thumbnailUrl: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=600&q=80",
    cornerDetailUrl: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=85",
    category: "modern-gallery",
    profileWidth: 1.25,
    depth: 2.1,
    finish: "Invisible Matte Sealant (Raw Oak Look)",
    material: "Rift-Sawn North American White Oak",
    style: "Contemporary Museum Gallery",
    basePricePerFoot: 28,
    colorHex: "#b89f7f",
    innerBevelHex: "#d6c5ad",
    outerBevelHex: "#8f7657",
    woodGrain: true,
    textureDetails: {
      reliefHeight: 0.05,
      filigreeStyle: "Flat Face / Deep Shadowbox",
      carvingPattern: "smooth-miter",
      sheen: "matte"
    }
  },
  {
    id: "WOD-114",
    name: "Manor Cerused Rustic Ash",
    description: "Deep wire-brushed ash wood highlighting the grain texture with a white ceruse pigment against a warm weathered umber ground.",
    thumbnailUrl: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=600&q=80",
    cornerDetailUrl: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1200&q=85",
    category: "classic-wood",
    profileWidth: 2.5,
    depth: 1.6,
    finish: "Wire-brushed & Cerused Weathered Umber",
    material: "Kiln-Dried European Ash",
    style: "Rustic Modern Craftsman",
    basePricePerFoot: 32,
    colorHex: "#5c4d43",
    innerBevelHex: "#7b695e",
    outerBevelHex: "#3d322b",
    woodGrain: true,
    textureDetails: {
      reliefHeight: 0.4,
      filigreeStyle: "Wire-brushed Organic Grain",
      carvingPattern: "smooth-miter",
      sheen: "matte"
    }
  },
  {
    id: "GLD-422",
    name: "Venetian Beaded Cassetta",
    description: "Classical Italian Cassetta profile with a recessed frieze panel, fine beaded inner liner, and burnished Dutch gold leaf.",
    thumbnailUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80",
    cornerDetailUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85",
    category: "antique-gilt",
    profileWidth: 3.1,
    depth: 1.9,
    finish: "Burnished Dutch Metal Leaf with Ochre Bole",
    material: "Hand-Milled Poplar & Composition Ornament",
    style: "Italian Cassetta",
    basePricePerFoot: 44,
    colorHex: "#caa035",
    innerBevelHex: "#e8c35f",
    outerBevelHex: "#825d10",
    goldTone: true,
    textureDetails: {
      reliefHeight: 0.5,
      filigreeStyle: "Pearl Bead & Recessed Frieze",
      carvingPattern: "beaded-pearl",
      sheen: "satin-varnish"
    }
  }
];

export const FRAME_SAMPLES: FrameSample[] = [
  ...WORKSHOP_MOULDINGS,
  ...LEGACY_FRAME_SAMPLES
];

export const ARTWORK_OPTIONS: ArtworkOption[] = [
  {
    id: "art-1",
    title: "Girl with a Pearl Earring",
    artist: "Johannes Vermeer (c. 1665)",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=85",
    aspectRatio: 0.82
  },
  {
    id: "art-2",
    title: "Alpine Lake Reflection at Sunset",
    artist: "Fine Art Photography Collection",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
    aspectRatio: 1.5
  },
  {
    id: "art-3",
    title: "Golden Hour Botanical Study",
    artist: "Archival Herbarium Etching",
    imageUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=85",
    aspectRatio: 0.75
  },
  {
    id: "art-4",
    title: "Abstract Terracotta Minimal",
    artist: "Contemporary Studio Edition",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=85",
    aspectRatio: 1.0
  }
];

export const MAT_OPTIONS: MatOption[] = [
  {
    id: "mat-offwhite",
    name: "Museum Cotton Rag (Off-White)",
    colorHex: "#f5f3ec",
    coreHex: "#eae6dc",
    borderWidth: 2.5
  },
  {
    id: "mat-warm-linen",
    name: "Natural Textured Linen",
    colorHex: "#ede4d4",
    coreHex: "#dfd2bd",
    borderWidth: 3.0
  },
  {
    id: "mat-charcoal",
    name: "Archival Charcoal Black",
    colorHex: "#2b2a29",
    coreHex: "#ffffff", // white core bevel contrast
    borderWidth: 2.0
  },
  {
    id: "mat-none",
    name: "Full Bleed (No Mat)",
    colorHex: "transparent",
    coreHex: "transparent",
    borderWidth: 0
  }
];

export const WALL_COLORS: { id: WallColor; label: string; bgClass: string; hex: string }[] = [
  { id: 'gallery-white', label: 'Gallery Crisp White', bgClass: 'bg-[#faf9f6]', hex: '#faf9f6' },
  { id: 'warm-stone', label: 'Warm French Stone', bgClass: 'bg-[#eeebe3]', hex: '#eeebe3' },
  { id: 'charcoal-museum', label: 'Dark Museum Slate', bgClass: 'bg-[#212328]', hex: '#212328' },
  { id: 'sage-botanical', label: 'Verdant Botanical Sage', bgClass: 'bg-[#3b473e]', hex: '#3b473e' },
  { id: 'navy-library', label: 'Heritage Library Navy', bgClass: 'bg-[#1e2838]', hex: '#1e2838' },
];

export const PRESET_DIMENSIONS = [
  { label: '8 × 10"', width: 8, height: 10, note: 'Desk / Small Portrait' },
  { label: '11 × 14"', width: 11, height: 14, note: 'Standard Wall Print' },
  { label: '16 × 20"', width: 16, height: 20, note: 'Medium Gallery Art' },
  { label: '20 × 24"', width: 20, height: 24, note: 'Large Portrait' },
  { label: '24 × 36"', width: 24, height: 36, note: 'Statement Feature Art' },
];
