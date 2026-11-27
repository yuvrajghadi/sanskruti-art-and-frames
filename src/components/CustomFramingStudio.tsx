import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FrameSample, 
  DimensionUnit, 
  MatOption, 
  ArtworkOption, 
  ViewMode,
  ArtworkFitMode 
} from '../types';
import { MAT_OPTIONS, ARTWORK_OPTIONS } from '../data/frames';
import { FrameCanvas2D } from './FrameCanvas2D';
import { ThreeFrameViewer, LightingEnv, CameraAngle, PatinaMode } from './ThreeFrameViewer';
import { 
  calculateFramePrice, 
  formatINR, 
  getMouldingFootRateINR, 
  GST_RATE, 
  getAspectRatioLabel 
} from '../utils/pricing';
import { formatWhatsAppQuoteUrl } from '../utils/whatsapp';
import { 
  ArrowRight, 
  MessageCircle, 
  Share2, 
  RotateCcw, 
  Box, 
  Eye, 
  Ruler, 
  ShieldCheck, 
  ExternalLink,
  Upload,
  Trash2
} from 'lucide-react';

export interface GlazingOption {
  id: string;
  name: string;
  specs: string;
  priceDelta: number;
}

export interface MountingOption {
  id: string;
  name: string;
  specs: string;
  priceDelta: number;
}

export const GLAZING_OPTIONS: GlazingOption[] = [
  { 
    id: 'optium', 
    name: 'Tru-Vue® Optium Museum Acrylic', 
    specs: '99% UV Protection • Anti-Reflective • Shatterproof 3.0mm', 
    priceDelta: 1800 
  },
  { 
    id: 'ultravue', 
    name: 'UltraVue® 70 Water White', 
    specs: '70% UV Filter • Water-white crystal optical clarity', 
    priceDelta: 950 
  },
  { 
    id: 'clear', 
    name: 'Standard Conservation Lucite', 
    specs: 'Crystal Clear Museum Grade Acrylic • 45% UV Resistance', 
    priceDelta: 0 
  },
  { 
    id: 'none', 
    name: 'Stretched Canvas • Open Face', 
    specs: 'Direct surface exposure with heavy impasto protection cleats', 
    priceDelta: -500 
  },
];

export const MOUNTING_OPTIONS: MountingOption[] = [
  { 
    id: 'french-cleat', 
    name: 'Heavy-Duty French Cleat', 
    specs: 'Extruded aluminum wall bar. Flush exhibition mount (Included)', 
    priceDelta: 0 
  },
  { 
    id: 'aircraft-wire', 
    name: 'Stainless D-Rings & Wire', 
    specs: 'Poly-coated stainless braided wire & felt wall bumpers (Included)', 
    priceDelta: 0 
  },
];

export type WallColorPreset = 'warm-ivory' | 'soft-stone' | 'deep-forest' | 'prussian';

export const WALL_COLOR_MAP: Record<WallColorPreset, { label: string; hex: string }> = {
  'warm-ivory': { label: 'Warm Ivory', hex: '#F7F5EF' },
  'soft-stone': { label: 'Soft Stone', hex: '#E8E4DA' },
  'deep-forest': { label: 'Deep Forest', hex: '#1B3B2B' },
  'prussian': { label: 'Prussian Slate', hex: '#1E293B' },
};

export type FrameOrientation = 'portrait' | 'landscape' | 'square';

export interface RectangularMemory {
  width: number;
  height: number;
  unit: DimensionUnit;
}

/**
 * Derives orientation strictly from current physical width and height.
 */
export function getFrameOrientation(width: number, height: number): FrameOrientation {
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

function clampStudioDimension(val: number, unit: DimensionUnit): number {
  const minVal = unit === 'in' ? 4 : 10;
  const maxVal = unit === 'in' ? 96 : 244;
  return Math.round(Math.min(maxVal, Math.max(minVal, val)) * 10) / 10;
}

function convertDimensionBetweenUnits(
  val: number,
  fromUnit: DimensionUnit,
  toUnit: DimensionUnit
): number {
  if (fromUnit === toUnit) return val;
  return toUnit === 'cm' ? val * 2.54 : val / 2.54;
}

/**
 * Resolves next width/height when switching between Portrait, Landscape, and Square,
 * preserving rectangular memory across Square toggles and honoring unit bounds.
 */
export function resolveOrientationDimensions(
  target: FrameOrientation,
  currentWidth: number,
  currentHeight: number,
  unit: DimensionUnit,
  lastRect: RectangularMemory | null
): { width: number; height: number; nextLastRect: RectangularMemory | null } {
  const currentOrientation = getFrameOrientation(currentWidth, currentHeight);
  const updatedLastRect: RectangularMemory | null =
    currentWidth !== currentHeight
      ? { width: currentWidth, height: currentHeight, unit }
      : lastRect;

  if (target === currentOrientation) {
    return { width: currentWidth, height: currentHeight, nextLastRect: updatedLastRect };
  }

  if (target === 'square') {
    const side = clampStudioDimension(Math.min(currentWidth, currentHeight), unit);
    return { width: side, height: side, nextLastRect: updatedLastRect };
  }

  // Portrait <-> Landscape swap when non-square
  if (currentWidth !== currentHeight) {
    return {
      width: clampStudioDimension(currentHeight, unit),
      height: clampStudioDimension(currentWidth, unit),
      nextLastRect: updatedLastRect,
    };
  }

  // Switching out of Square: restore saved rectangular proportions if available
  if (updatedLastRect && updatedLastRect.width !== updatedLastRect.height) {
    const wConverted = clampStudioDimension(
      convertDimensionBetweenUnits(updatedLastRect.width, updatedLastRect.unit, unit),
      unit
    );
    const hConverted = clampStudioDimension(
      convertDimensionBetweenUnits(updatedLastRect.height, updatedLastRect.unit, unit),
      unit
    );
    const shortSide = Math.min(wConverted, hConverted);
    const longSide = Math.max(wConverted, hConverted);
    if (longSide > shortSide) {
      return target === 'portrait'
        ? { width: shortSide, height: longSide, nextLastRect: updatedLastRect }
        : { width: longSide, height: shortSide, nextLastRect: updatedLastRect };
    }
  }

  // Direct Square fallback (e.g. opened via ?w=12&h=12): derive a valid 4:5 / 5:4 rectangle within bounds
  const side = clampStudioDimension(currentWidth, unit);
  const expanded = clampStudioDimension(side * 1.25, unit);
  const contracted = clampStudioDimension(side * 0.8, unit);
  const shortSide = expanded > side ? side : contracted;
  const longSide = expanded > side ? expanded : side;

  return target === 'portrait'
    ? { width: shortSide, height: longSide, nextLastRect: updatedLastRect }
    : { width: longSide, height: shortSide, nextLastRect: updatedLastRect };
}

interface CustomFramingStudioProps {
  selectedFrame: FrameSample | null;
  allFrames: FrameSample[];
  onSelectFrame: (frame: FrameSample) => void;
  width: number;
  height: number;
  unit: DimensionUnit;
  onWidthChange: (w: number) => void;
  onHeightChange: (h: number) => void;
  onUnitChange: (u: DimensionUnit) => void;
  selectedMat: MatOption;
  onMatChange: (mat: MatOption) => void;
  selectedArtwork: ArtworkOption;
  onArtworkChange: (art: ArtworkOption) => void;
  customArtUrl: string | null;
  onCustomArtUpload: (url: string | null) => void;
  artworkFit: ArtworkFitMode;
  onArtworkFitChange: (fit: ArtworkFitMode) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onProceedToReview: () => void;
  onProceedToCatalog: () => void;
  onReset?: () => void;
  selectedGlazing?: GlazingOption;
  onGlazingChange?: (glazing: GlazingOption) => void;
  selectedMounting?: MountingOption;
  onMountingChange?: (mounting: MountingOption) => void;
}

export const CustomFramingStudio: React.FC<CustomFramingStudioProps> = ({
  selectedFrame,
  allFrames,
  onSelectFrame,
  width,
  height,
  unit,
  onWidthChange,
  onHeightChange,
  onUnitChange,
  selectedMat,
  onMatChange,
  selectedArtwork,
  onArtworkChange,
  customArtUrl,
  onCustomArtUpload,
  artworkFit,
  onArtworkFitChange,
  viewMode,
  onViewModeChange,
  onProceedToReview,
  onProceedToCatalog,
  onReset,
  selectedGlazing: propGlazing,
  onGlazingChange,
  selectedMounting: propMounting,
  onMountingChange,
}) => {
  // Stage controls
  const [stageMode, setStageMode] = useState<'render' | 'blueprint' | '3d'>(() => 
    viewMode === '3d' ? '3d' : 'render'
  );

  // Sync stageMode cleanly whenever top-level route/viewMode changes (e.g., Header 2D <-> 3D tab navigation)
  useEffect(() => {
    setStageMode((prev) => {
      if (viewMode === '3d') return '3d';
      return prev === '3d' ? 'render' : prev;
    });
  }, [viewMode]);
  const [wallColorPreset, setWallColorPreset] = useState<WallColorPreset>('warm-ivory');
  const [copiedLink, setCopiedLink] = useState(false);

  // 3D parameters
  const [lighting, setLighting] = useState<LightingEnv>('3000k');
  const [cameraPreset, setCameraPreset] = useState<CameraAngle>('corner');
  const [patina, setPatina] = useState<PatinaMode>('pristine');
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onCustomArtUpload(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Glazing & Mounting state (Controlled or Uncontrolled fallback)
  const [internalGlazing, setInternalGlazing] = useState<GlazingOption>(GLAZING_OPTIONS[0]);
  const [internalMounting, setInternalMounting] = useState<MountingOption>(MOUNTING_OPTIONS[0]);

  const selectedGlazing = propGlazing || internalGlazing;
  const selectedMounting = propMounting || internalMounting;

  const handleGlazingSelect = (opt: GlazingOption) => {
    setInternalGlazing(opt);
    if (onGlazingChange) onGlazingChange(opt);
  };

  const handleMountingSelect = (mnt: MountingOption) => {
    setInternalMounting(mnt);
    if (onMountingChange) onMountingChange(mnt);
  };

  // Moulding category filter
  const [mouldingCategory, setMouldingCategory] = useState<string>('all');

  // Filtered moulding list
  const filteredMouldings = useMemo(() => {
    if (mouldingCategory === 'all') return allFrames;
    if (mouldingCategory === 'workshop') {
      return allFrames.filter(f => f.isWorkshopSample || f.id.startsWith('SAA-'));
    }
    return allFrames.filter(f => f.category === mouldingCategory);
  }, [allFrames, mouldingCategory]);

  // Current active frame fallback
  const activeFrame = selectedFrame || allFrames[0];

  // Pricing calculations
  const footRateINR = activeFrame ? getMouldingFootRateINR(activeFrame) : 320;
  const baseEstimate = activeFrame 
    ? calculateFramePrice(activeFrame, width, height, unit, selectedMat, 'INR')
    : null;

  const linearFeet = baseEstimate?.linearFeet || 4.5;
  const moldingCost = baseEstimate?.moldingCost || 1440;
  const matCost = selectedMat.id === 'mat-none' ? 0 : (baseEstimate?.matCost || 520);
  const rawSubtotalBeforeGlazing = baseEstimate?.subtotal || (moldingCost + matCost + 750);
  const glazingDelta = selectedGlazing.priceDelta;
  const subtotal = Math.max(0, rawSubtotalBeforeGlazing + glazingDelta);
  const gstAmount = Math.round(subtotal * GST_RATE);
  const totalPrice = subtotal + gstAmount;

  // Outer frame dimensions
  const matBorderWidth = selectedMat.id === 'mat-none' ? 0 : selectedMat.borderWidth;
  const profileFaceWidth = activeFrame ? activeFrame.profileWidth : 2.5;
  const addedPerSide = profileFaceWidth + matBorderWidth;
  
  const outerWidthNum = unit === 'in' 
    ? width + addedPerSide * 2
    : width + addedPerSide * 2 * 2.54;
  const outerHeightNum = unit === 'in' 
    ? height + addedPerSide * 2
    : height + addedPerSide * 2 * 2.54;

  const outerWidthStr = outerWidthNum.toFixed(2);
  const outerHeightStr = outerHeightNum.toFixed(2);
  const aspectRatio = getAspectRatioLabel(width, height);
  const currentOrientation = getFrameOrientation(width, height);
  const lastRectRef = useRef<RectangularMemory | null>(
    width !== height ? { width, height, unit } : null
  );

  // Remember latest non-square dimensions so Square -> Portrait/Landscape restores them cleanly
  useEffect(() => {
    if (width !== height) {
      lastRectRef.current = { width, height, unit };
    }
  }, [width, height, unit]);

  const handleOrientationChange = (target: FrameOrientation) => {
    const resolved = resolveOrientationDimensions(
      target,
      width,
      height,
      unit,
      lastRectRef.current
    );
    lastRectRef.current = resolved.nextLastRect;
    if (resolved.width !== width) onWidthChange(resolved.width);
    if (resolved.height !== height) onHeightChange(resolved.height);
  };

  // Unit toggle handler
  const handleUnitToggle = (targetUnit: DimensionUnit) => {
    if (targetUnit === unit) return;
    if (targetUnit === 'cm') {
      onWidthChange(Math.round(width * 2.54 * 10) / 10);
      onHeightChange(Math.round(height * 2.54 * 10) / 10);
    } else {
      onWidthChange(Math.round((width / 2.54) * 10) / 10);
      onHeightChange(Math.round((height / 2.54) * 10) / 10);
    }
    onUnitChange(targetUnit);
  };

  // Stepper adjustments with bounds clamping
  const handleAdjustWidth = (delta: number) => {
    onWidthChange(clampStudioDimension(width + delta, unit));
  };

  const handleAdjustHeight = (delta: number) => {
    onHeightChange(clampStudioDimension(height + delta, unit));
  };

  // Copy shareable link
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }).catch(() => {
        setCopiedLink(false);
      });
    }
  };

  // WhatsApp order URL generator
  const whatsappUrl = activeFrame ? formatWhatsAppQuoteUrl({
    frameId: activeFrame.id,
    frameName: activeFrame.name,
    profileWidth: activeFrame.profileWidth,
    width,
    height,
    unit,
    matName: selectedMat.name,
    glazingName: selectedGlazing.name,
    mountingName: selectedMounting.name,
    basePrice: subtotal,
    gstAmount,
    estimatedPrice: totalPrice,
    shareUrl: typeof window !== 'undefined' ? window.location.href : undefined,
  }) : `https://wa.me/919820000000?text=${encodeURIComponent('Hello Sanskruti Arts, I would like to enquire about bespoke custom framing.')}`;

  return (
    <div className="flex-1 flex flex-col bg-[#F7F5EF] text-[#191C1A] font-body">
      {/* ------------------------------------------------------------- */}
      {/* TOP ATELIER STATUS & ENGINEERING DOSSIER BAR                  */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full bg-[#F1F4EF] px-4 sm:px-6 lg:px-12 py-3 border-b border-[#E8E4DA] z-20">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Dossier Project Title */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-headline text-lg sm:text-xl font-bold text-[#1B3B2B] leading-tight">
              Custom Framing Studio
            </h1>
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-sm border border-[#E8E4DA] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#1B3B2B] animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#191C1A] font-semibold">
                Atelier Draft · Dossier Studio #BA-842
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#424844]">
              <span className="text-[#727874]">/</span>
              <span>Selected Moulding:</span>
              <span className="font-serif text-sm font-bold text-[#1B3B2B] truncate max-w-xs">
                {activeFrame.name} (#{activeFrame.id})
              </span>
            </div>
          </div>

          {/* Unit Toggle & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Units Switcher */}
            <div className="flex items-center bg-white border border-[#E8E4DA] rounded-sm p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => handleUnitToggle('in')}
                className={`min-h-[34px] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-xs transition-all ${
                  unit === 'in'
                    ? 'bg-[#1B3B2B] text-white shadow-xs'
                    : 'text-[#424844] hover:text-[#191C1A]'
                }`}
              >
                Inches
              </button>
              <button
                type="button"
                onClick={() => handleUnitToggle('cm')}
                className={`min-h-[34px] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-xs transition-all ${
                  unit === 'cm'
                    ? 'bg-[#1B3B2B] text-white shadow-xs'
                    : 'text-[#424844] hover:text-[#191C1A]'
                }`}
              >
                Centimeters
              </button>
            </div>

            <div className="h-4 w-px bg-[#E8E4DA] hidden md:block" />

            {/* Reset Button */}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider text-[#424844] hover:text-[#191C1A] hover:bg-white rounded-sm border border-transparent hover:border-[#E8E4DA] transition-all"
                title="Reset dimensions and configuration to standard defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Specs</span>
              </button>
            )}

            {/* Share Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8E4DA] text-xs uppercase tracking-wider text-[#1B3B2B] hover:bg-[#ECEFEA] rounded-sm shadow-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-[#9C7A3C]" />
              <span>{copiedLink ? 'Copied URL!' : 'Share Spec'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRIMARY INTERACTIVE SPLIT WORKSPACE (7 Cols / 5 Cols)         */}
      {/* ------------------------------------------------------------- */}
      <div className="max-w-[1600px] w-full mx-auto px-4 lg:px-8 py-6 flex-1 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">

          {/* =========================================================== */}
          {/* LEFT / CENTER STAGE (7 Columns): Live Simulation Viewport  */}
          {/* =========================================================== */}
          <div className="lg:col-span-7 flex flex-col gap-4 lg:sticky lg:top-20 z-10">

            {/* Viewport Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-sm border border-[#E8E4DA] shadow-xs">
              {/* View Modes */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setStageMode('render');
                    onViewModeChange('2d');
                  }}
                  className={`px-3 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                    stageMode === 'render'
                      ? 'bg-[#1B3B2B] text-white shadow-xs'
                      : 'text-[#424844] hover:bg-[#F1F4EF]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Realistic 2D</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStageMode('blueprint');
                    onViewModeChange('2d');
                  }}
                  className={`px-3 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                    stageMode === 'blueprint'
                      ? 'bg-[#1B3B2B] text-white shadow-xs'
                      : 'text-[#424844] hover:bg-[#F1F4EF]'
                  }`}
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>2D Wireframe</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStageMode('3d');
                    onViewModeChange('3d');
                  }}
                  className={`px-3 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                    stageMode === '3d'
                      ? 'bg-[#1B3B2B] text-white shadow-xs'
                      : 'text-[#424844] hover:bg-[#F1F4EF]'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>3D Perspective</span>
                </button>
              </div>

              {/* Wall Background Selector (2D Mode) */}
              {stageMode !== '3d' && (
                <div className="flex items-center gap-2 pl-2 border-l border-[#E8E4DA]">
                  <span className="text-[11px] uppercase tracking-wider text-[#727874] hidden sm:inline font-mono">
                    Wall:
                  </span>
                  <div className="flex items-center gap-2">
                    {(Object.keys(WALL_COLOR_MAP) as WallColorPreset[]).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWallColorPreset(preset)}
                        aria-label={`Wall backdrop: ${WALL_COLOR_MAP[preset].label}`}
                        className={`w-7 h-7 rounded-full border transition-all ${
                          wallColorPreset === preset
                            ? 'ring-2 ring-[#1B3B2B] ring-offset-1 scale-105'
                            : 'border-[#E8E4DA] hover:scale-105'
                        }`}
                        style={{ backgroundColor: WALL_COLOR_MAP[preset].hex }}
                        title={WALL_COLOR_MAP[preset].label}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 3D Lighting Selector (3D Mode) */}
              {stageMode === '3d' && (
                <div className="flex items-center flex-wrap gap-1.5 pl-2 border-l border-[#E8E4DA]">
                  <span className="text-[11px] uppercase tracking-wider text-[#727874] hidden sm:inline font-mono">
                    Light:
                  </span>
                  {(['3000k', '5500k', '2400k'] as LightingEnv[]).map((env) => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setLighting(env)}
                      className={`min-h-[32px] px-2.5 py-1 text-[11px] font-mono uppercase rounded-xs transition-colors ${
                        lighting === env
                          ? 'bg-[#1B3B2B] text-white font-bold'
                          : 'bg-[#F1F4EF] text-[#424844] hover:bg-[#E8E4DA]'
                      }`}
                    >
                      {env === '3000k' ? 'Halogen' : env === '5500k' ? 'Daylight' : 'Candle'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Render Stage Canvas Container (Bounded Universal Fit-to-Container Viewport) */}
            <div 
              data-testid="studio-preview-stage"
              className="relative w-full h-[360px] sm:h-[430px] md:h-[470px] lg:h-[480px] xl:h-[540px] 2xl:h-[580px] rounded-sm overflow-hidden flex flex-col transition-colors duration-500 shadow-subtle-card border border-[#E8E4DA]"
              style={{ backgroundColor: WALL_COLOR_MAP[wallColorPreset].hex }}
            >
              {/* Non-Overlapping Top Stage Telemetry Strip */}
              <div className="shrink-0 bg-white/95 backdrop-blur-xs border-b border-[#E8E4DA] px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-10">
                <div className="bg-[#FAF8F5] px-2.5 py-1 rounded-sm border border-[#E8E4DA] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1B3B2B]" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#191C1A] font-semibold">
                    2D/3D Atelier Preview
                  </span>
                </div>

                <div className="bg-[#FAF8F5] px-2.5 py-1 rounded-sm border border-[#E8E4DA] text-[#191C1A] text-[11px] font-mono tracking-wider flex items-center gap-1.5">
                  <Ruler className="w-3 h-3 text-[#727874]" />
                  <span>
                    Outer: <strong className="font-bold text-[#1B3B2B]">{outerWidthStr} × {outerHeightStr} {unit}</strong>
                  </span>
                </div>

                <div className="bg-[#1B3B2B] text-white px-2.5 py-1 rounded-sm font-mono text-[10px] tracking-widest uppercase font-semibold">
                  Scale: 1:1 Proportions
                </div>
              </div>

              {/* Active Renderer Sub-Component Stage Viewport */}
              <div className="flex-1 min-h-0 w-full relative overflow-hidden flex items-center justify-center">
                {/* Archival Track Lighting Atmospheric Haze */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/5 via-transparent to-white/30 pointer-events-none z-0" />
                <div className="relative z-10 w-full h-full flex items-center justify-center">
                  {stageMode === '3d' ? (
                    <ThreeFrameViewer
                      frame={activeFrame}
                      width={width}
                      height={height}
                      unit={unit}
                      mat={selectedMat}
                      artwork={selectedArtwork}
                      customArtUrl={customArtUrl}
                      artworkFit={artworkFit}
                      lighting={lighting}
                      cameraPreset={cameraPreset}
                      patina={patina}
                      isAutoRotate={isAutoRotate}
                    />
                  ) : (
                    <FrameCanvas2D
                      frame={activeFrame}
                      width={width}
                      height={height}
                      unit={unit}
                      mat={selectedMat}
                      artwork={selectedArtwork}
                      customArtUrl={customArtUrl}
                      canvasSubMode={stageMode}
                      artworkFit={artworkFit}
                      wallColorHex={WALL_COLOR_MAP[wallColorPreset].hex}
                      showDimensions={false}
                      compactStage={true}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 3D Camera Angles Toolbar (Only visible when in 3D Mode) */}
            {stageMode === '3d' && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white px-3 py-2.5 rounded-sm border border-[#E8E4DA] text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] uppercase text-[#727874]">Angle:</span>
                  {(['corner', 'front', 'cross-section', 'perspective'] as CameraAngle[]).map((angle) => (
                    <button
                      key={angle}
                      type="button"
                      onClick={() => setCameraPreset(angle)}
                      className={`min-h-[34px] px-2.5 py-1 text-[11px] font-semibold uppercase rounded-xs transition-colors ${
                        cameraPreset === angle
                          ? 'bg-[#1B3B2B] text-white shadow-xs'
                          : 'bg-[#F1F4EF] text-[#424844] hover:bg-[#E8E4DA]'
                      }`}
                    >
                      {angle}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:pl-2 sm:border-l sm:border-[#E8E4DA]">
                  <span className="font-mono text-[11px] uppercase text-[#727874]">Patina:</span>
                  {(['pristine', 'antiqued', 'aged'] as PatinaMode[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPatina(p)}
                      className={`min-h-[32px] px-2.5 py-1 text-[10px] font-mono uppercase rounded-xs transition-colors ${
                        patina === p
                          ? 'bg-[#1B3B2B] text-white font-bold'
                          : 'bg-[#F1F4EF] text-[#424844] hover:bg-[#E8E4DA]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 min-h-[32px] text-xs text-[#424844] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAutoRotate}
                    onChange={(e) => setIsAutoRotate(e.target.checked)}
                    className="accent-[#1B3B2B] rounded-xs"
                  />
                  <span>Auto-Rotate</span>
                </label>
              </div>
            )}
          </div>

          {/* =========================================================== */}
          {/* RIGHT COLUMN (5 Columns): 6-Step Atelier Specification     */}
          {/* =========================================================== */}
          <div className="lg:col-span-5 flex flex-col gap-5 pb-20">

            {/* --------------------------------------------------------- */}
            {/* STEP 1: ARCHITECTURAL DIMENSIONS & ORIENTATION            */}
            {/* --------------------------------------------------------- */}
            <div className="bg-white rounded-sm border border-[#E8E4DA] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#1B3B2B] text-white font-mono text-xs flex items-center justify-center font-bold">
                    1
                  </span>
                  <h2 className="font-serif text-lg font-bold text-[#191C1A]">
                    Frame Dimensions &amp; Cavity
                  </h2>
                </div>
                <span className="font-mono text-xs text-[#727874] uppercase tracking-wider">
                  {aspectRatio}
                </span>
              </div>

              {/* Frame Orientation Segmented Control (Portrait / Landscape / Square) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    id="frame-orientation-label"
                    className="text-xs uppercase font-semibold tracking-wider text-[#424844]"
                  >
                    Orientation
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#727874]">
                    {currentOrientation === 'portrait'
                      ? 'Height > Width'
                      : currentOrientation === 'landscape'
                      ? 'Width > Height'
                      : 'Width = Height'}
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-labelledby="frame-orientation-label"
                  className="grid grid-cols-3 gap-1.5 bg-[#F1F4EF] p-1 rounded-sm border border-[#E8E4DA]"
                >
                  {(
                    [
                      {
                        id: 'portrait' as FrameOrientation,
                        label: 'Portrait',
                        iconClass: 'w-2.5 h-3.5',
                        title: 'Portrait orientation (Height greater than Width)',
                      },
                      {
                        id: 'landscape' as FrameOrientation,
                        label: 'Landscape',
                        iconClass: 'w-3.5 h-2.5',
                        title: 'Landscape orientation (Width greater than Height)',
                      },
                      {
                        id: 'square' as FrameOrientation,
                        label: 'Square',
                        iconClass: 'w-3 h-3',
                        title: 'Square orientation (Width equals Height)',
                      },
                    ]
                  ).map((opt) => {
                    const isSelected = currentOrientation === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        data-testid={`orientation-${opt.id}`}
                        title={opt.title}
                        onClick={() => handleOrientationChange(opt.id)}
                        className={`min-h-[40px] px-2 py-2 rounded-xs text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[#1B3B2B] text-white shadow-xs'
                            : 'text-[#424844] hover:text-[#191C1A] hover:bg-white/70'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`${opt.iconClass} border-[1.5px] border-current rounded-[1px] shrink-0`}
                        />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dimensions Inputs with Steppers */}
              <div className="grid grid-cols-2 gap-4">
                {/* Width Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="art-w-input" className="text-xs uppercase font-semibold tracking-wider text-[#424844]">
                      Artwork Width
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Decrease artwork width"
                        onClick={() => handleAdjustWidth(unit === 'in' ? -0.5 : -1)}
                        className="w-8 h-8 rounded-xs bg-[#F1F4EF] hover:bg-[#E8E4DA] text-[#191C1A] text-sm font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        aria-label="Increase artwork width"
                        onClick={() => handleAdjustWidth(unit === 'in' ? 0.5 : 1)}
                        className="w-8 h-8 rounded-xs bg-[#F1F4EF] hover:bg-[#E8E4DA] text-[#191C1A] text-sm font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      id="art-w-input"
                      type="number"
                      step={unit === 'in' ? '0.5' : '1'}
                      min={unit === 'in' ? 4 : 10}
                      max={unit === 'in' ? 96 : 244}
                      value={width}
                      onChange={(e) => onWidthChange(parseFloat(e.target.value) || (unit === 'in' ? 16 : 40))}
                      className="w-full bg-[#F7F5EF] border border-[#E8E4DA] rounded-sm px-3 py-2 text-sm font-mono text-[#191C1A] focus:outline-hidden focus:border-[#1B3B2B]"
                    />
                    <span className="absolute right-3 top-2 text-xs font-mono text-[#727874]">
                      {unit}
                    </span>
                  </div>
                </div>

                {/* Height Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="art-h-input" className="text-xs uppercase font-semibold tracking-wider text-[#424844]">
                      Artwork Height
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Decrease artwork height"
                        onClick={() => handleAdjustHeight(unit === 'in' ? -0.5 : -1)}
                        className="w-8 h-8 rounded-xs bg-[#F1F4EF] hover:bg-[#E8E4DA] text-[#191C1A] text-sm font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        aria-label="Increase artwork height"
                        onClick={() => handleAdjustHeight(unit === 'in' ? 0.5 : 1)}
                        className="w-8 h-8 rounded-xs bg-[#F1F4EF] hover:bg-[#E8E4DA] text-[#191C1A] text-sm font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      id="art-h-input"
                      type="number"
                      step={unit === 'in' ? '0.5' : '1'}
                      min={unit === 'in' ? 4 : 10}
                      max={unit === 'in' ? 96 : 244}
                      value={height}
                      onChange={(e) => onHeightChange(parseFloat(e.target.value) || (unit === 'in' ? 20 : 50))}
                      className="w-full bg-[#F7F5EF] border border-[#E8E4DA] rounded-sm px-3 py-2 text-sm font-mono text-[#191C1A] focus:outline-hidden focus:border-[#1B3B2B]"
                    />
                    <span className="absolute right-3 top-2 text-xs font-mono text-[#727874]">
                      {unit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Outer Dimensions Computed Notice */}
              <div className="p-3 bg-[#F7F5EF] rounded-sm border border-[#E8E4DA] flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[#727874] block text-[10px] uppercase">Opening (Sight)</span>
                  <span className="font-bold text-[#191C1A]">{width} × {height} {unit}</span>
                </div>
                <div className="h-6 w-px bg-[#E8E4DA]" />
                <div>
                  <span className="text-[#727874] block text-[10px] uppercase">Finished Outer Frame</span>
                  <span className="font-bold text-[#1B3B2B]">{outerWidthStr} × {outerHeightStr} {unit}</span>
                </div>
                <div className="h-6 w-px bg-[#E8E4DA]" />
                <div>
                  <span className="text-[#727874] block text-[10px] uppercase">Face Relief</span>
                  <span className="font-bold text-[#191C1A]">{profileFaceWidth}" ({Math.round(profileFaceWidth * 25.4)} mm)</span>
                </div>
              </div>

              {/* Artwork Aperture & Upload Source */}
              <div className="pt-3 border-t border-[#E8E4DA] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-semibold tracking-wider text-[#424844]">
                    Artwork Print / Canvas Plate
                  </span>
                  {/* Fit mode toggle */}
                  <div className="flex items-center bg-[#F1F4EF] p-0.5 rounded-xs border border-[#E8E4DA]">
                    <button
                      type="button"
                      onClick={() => onArtworkFitChange('fill')}
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded-xs transition-colors ${
                        artworkFit === 'fill' ? 'bg-[#1B3B2B] text-white shadow-xs' : 'text-[#424844] hover:text-[#191C1A]'
                      }`}
                    >
                      Fill
                    </button>
                    <button
                      type="button"
                      onClick={() => onArtworkFitChange('fit')}
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded-xs transition-colors ${
                        artworkFit === 'fit' ? 'bg-[#1B3B2B] text-white shadow-xs' : 'text-[#424844] hover:text-[#191C1A]'
                      }`}
                    >
                      Fit (Letterbox)
                    </button>
                  </div>
                </div>

                {/* Gallery Stock Art Swatches + Custom Upload */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {/* Custom Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-12 px-3 rounded-sm border flex items-center gap-2 flex-shrink-0 transition-colors ${
                      customArtUrl
                        ? 'bg-[#F7F5EB] border-[#1B3B2B] text-[#1B3B2B]'
                        : 'bg-[#F7F5EF] border-[#E8E4DA] text-[#424844] hover:bg-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">
                      {customArtUrl ? 'Change Art' : 'Upload Art'}
                    </span>
                  </button>

                  {customArtUrl && (
                    <button
                      type="button"
                      onClick={() => onCustomArtUpload(null)}
                      className="h-12 w-9 rounded-sm border border-[#BA1A1A]/30 bg-[#BA1A1A]/10 text-[#BA1A1A] flex items-center justify-center flex-shrink-0 hover:bg-[#BA1A1A]/20"
                      title="Clear custom art and use master artwork"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    aria-label="Upload custom artwork image"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="h-6 w-px bg-[#E8E4DA] flex-shrink-0" />

                  {/* Curated Master Artwork Options */}
                  {ARTWORK_OPTIONS.map((art) => {
                    const isArtSelected = !customArtUrl && selectedArtwork.id === art.id;
                    return (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => {
                          onCustomArtUpload(null);
                          onArtworkChange(art);
                        }}
                        className={`h-12 w-12 rounded-sm overflow-hidden border flex-shrink-0 relative transition-transform ${
                          isArtSelected
                            ? 'ring-2 ring-[#1B3B2B] scale-105 border-transparent shadow-xs'
                            : 'border-[#E8E4DA] hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        title={`${art.title} — ${art.artist}`}
                      >
                        <img
                          src={art.imageUrl}
                          alt={art.title}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* STEP 2: MOULDING PROFILE SELECTION (ALL 25 PROFILES)       */}
            {/* --------------------------------------------------------- */}
            <div className="bg-white rounded-sm border border-[#E8E4DA] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#1B3B2B] text-white font-mono text-xs flex items-center justify-center font-bold">
                    2
                  </span>
                  <h2 className="font-serif text-lg font-bold text-[#191C1A]">
                    Moulding Profile
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#9C7A3C] font-semibold">
                    {allFrames.length} Profiles
                  </span>
                  <button
                    type="button"
                    onClick={onProceedToCatalog}
                    className="text-xs text-[#1B3B2B] hover:text-[#9C7A3C] underline flex items-center gap-1 font-semibold"
                  >
                    <span>Full Catalogue</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: `All (${allFrames.length})` },
                  { id: 'workshop', label: 'Workshop Originals' },
                  { id: 'ornate-gold', label: 'Ornate Gold' },
                  { id: 'antique-gilt', label: 'Antique Gilt' },
                  { id: 'classic-wood', label: 'Classic Wood' },
                  { id: 'modern-gallery', label: 'Modern Gallery' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setMouldingCategory(cat.id)}
                    className={`min-h-[34px] px-2.5 py-1.5 text-xs uppercase tracking-wider rounded-xs font-semibold transition-all ${
                      mouldingCategory === cat.id
                        ? 'bg-[#1B3B2B] text-white shadow-xs'
                        : 'bg-[#F7F5EF] border border-[#E8E4DA] text-[#424844] hover:text-[#191C1A]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Profiles List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredMouldings.map((frame) => {
                  const isSelected = activeFrame.id === frame.id;
                  const rate = getMouldingFootRateINR(frame);
                  return (
                    <label
                      key={frame.id}
                      onClick={() => onSelectFrame(frame)}
                      className={`flex items-center justify-between p-2.5 rounded-sm border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#F7F5EB] border-l-4 border-l-[#1B3B2B] border-[#1B3B2B] shadow-xs'
                          : 'bg-[#F7F5EF] border-[#E8E4DA] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="radio"
                          name="moulding-choice"
                          checked={isSelected}
                          onChange={() => onSelectFrame(frame)}
                          className="accent-[#1B3B2B] w-4 h-4 flex-shrink-0"
                        />
                        <div className="w-10 h-10 rounded-sm overflow-hidden bg-[#ECEFEA] border border-[#E8E4DA] flex-shrink-0 relative">
                          <img
                            src={frame.thumbnailUrl || frame.cornerDetailUrl}
                            alt={frame.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-[#1B3B2B] bg-white px-1 py-0.2 rounded border border-[#E8E4DA]">
                              #{frame.id}
                            </span>
                            <span className="text-[10px] uppercase font-semibold text-[#7A4B28]">
                              {frame.style}
                            </span>
                          </div>
                          <p className="font-serif text-sm font-bold text-[#191C1A] truncate">
                            {frame.name}
                          </p>
                          <p className="text-[11px] text-[#424844] font-mono">
                            {frame.profileWidth.toFixed(2)}" face · {frame.depth.toFixed(2)}" depth
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 pl-2">
                        <p className="font-serif text-sm font-bold text-[#1B3B2B]">
                          ₹{rate}<span className="text-[10px] font-normal text-[#727874]">/ft</span>
                        </p>
                        <span className="text-[10px] font-mono font-semibold text-[#1B3B2B]">
                          Atelier Crafted
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* STEP 3: ARCHIVAL MATBOARD (8-PLY COTTON)                  */}
            {/* --------------------------------------------------------- */}
            <div className="bg-white rounded-sm border border-[#E8E4DA] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#1B3B2B] text-white font-mono text-xs flex items-center justify-center font-bold">
                    3
                  </span>
                  <h2 className="font-serif text-lg font-bold text-[#191C1A]">
                    Archival Matboard (8-Ply Cotton)
                  </h2>
                </div>
                <span className="font-mono text-xs text-[#1B3B2B] font-semibold">
                  Archival Acid-Free Core
                </span>
              </div>

              {/* Matboard Swatches */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {MAT_OPTIONS.map((mat) => {
                  const isMatSelected = selectedMat.id === mat.id;
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => onMatChange(mat)}
                      className={`p-2.5 rounded-sm border text-left flex flex-col items-center gap-1.5 transition-all ${
                        isMatSelected
                          ? 'bg-[#F7F5EB] border-2 border-[#1B3B2B] shadow-xs'
                          : 'bg-[#F7F5EF] border-[#E8E4DA] hover:bg-white'
                      }`}
                    >
                      <span
                        className="w-7 h-7 rounded-full border border-[#E8E4DA] shadow-xs"
                        style={{ backgroundColor: mat.colorHex }}
                      />
                      <span className="text-xs font-semibold text-[#191C1A] text-center leading-tight">
                        {mat.name}
                      </span>
                      <span className="text-[10px] text-[#727874] font-mono">
                        {mat.id === 'mat-none' ? 'No Border' : '8-Ply Cotton'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Mat Reveal Width Slider (Only when mat is enabled) */}
              {selectedMat.id !== 'mat-none' && (
                <div className="space-y-1.5 pt-2 border-t border-[#E8E4DA]">
                  <div className="flex items-center justify-between">
                    <label htmlFor="mat-reveal-slider" className="text-xs uppercase font-semibold tracking-wider text-[#424844]">
                      Mat Border Reveal (Uniform)
                    </label>
                    <span className="font-mono text-xs font-bold text-[#1B3B2B]">
                      {selectedMat.borderWidth.toFixed(2)} in ({Math.round(selectedMat.borderWidth * 25.4)} mm)
                    </span>
                  </div>
                  <input
                    id="mat-reveal-slider"
                    type="range"
                    min="0.5"
                    max="6.0"
                    step="0.25"
                    value={selectedMat.borderWidth}
                    onChange={(e) => {
                      const bw = parseFloat(e.target.value);
                      onMatChange({ ...selectedMat, borderWidth: bw });
                    }}
                    className="w-full accent-[#1B3B2B] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#727874]">
                    <span>0.50"</span>
                    <span>2.00"</span>
                    <span>4.00"</span>
                    <span>6.00"</span>
                  </div>
                </div>
              )}
            </div>

            {/* --------------------------------------------------------- */}
            {/* STEP 4: CONSERVATION GLAZING                              */}
            {/* --------------------------------------------------------- */}
            <div className="bg-white rounded-sm border border-[#E8E4DA] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#1B3B2B] text-white font-mono text-xs flex items-center justify-center font-bold">
                    4
                  </span>
                  <h2 className="font-serif text-lg font-bold text-[#191C1A]">
                    Conservation Glazing
                  </h2>
                </div>
                <span className="font-mono text-xs text-[#1B3B2B] uppercase tracking-widest font-semibold">
                  99% UV Barrier
                </span>
              </div>

              <div className="space-y-2">
                {GLAZING_OPTIONS.map((opt) => {
                  const isGlazingSelected = selectedGlazing.id === opt.id;
                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleGlazingSelect(opt)}
                      className={`flex items-center justify-between p-3 rounded-sm border cursor-pointer transition-all ${
                        isGlazingSelected
                          ? 'bg-[#F7F5EB] border-l-4 border-l-[#1B3B2B] border-[#1B3B2B] shadow-xs'
                          : 'bg-[#F7F5EF] border-[#E8E4DA] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="glazing-choice"
                          checked={isGlazingSelected}
                          onChange={() => handleGlazingSelect(opt)}
                          className="accent-[#1B3B2B] w-4 h-4"
                        />
                        <div>
                          <p className="font-serif text-sm font-bold text-[#191C1A]">
                            {opt.name}
                          </p>
                          <p className="text-xs text-[#424844]">
                            {opt.specs}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#1B3B2B] pl-2 flex-shrink-0">
                        {opt.priceDelta > 0 
                          ? `+₹${opt.priceDelta}` 
                          : opt.priceDelta < 0 
                          ? `-₹${Math.abs(opt.priceDelta)}` 
                          : 'Included'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* STEP 5: MUSEUM HANGING HARDWARE                           */}
            {/* --------------------------------------------------------- */}
            <div className="bg-white rounded-sm border border-[#E8E4DA] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#1B3B2B] text-white font-mono text-xs flex items-center justify-center font-bold">
                    5
                  </span>
                  <h2 className="font-serif text-lg font-bold text-[#191C1A]">
                    Hanging &amp; Wall Anchor Hardware
                  </h2>
                </div>
                <span className="font-mono text-xs text-[#727874] uppercase tracking-wider">
                  Load Rated
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MOUNTING_OPTIONS.map((mnt) => {
                  const isMountSelected = selectedMounting.id === mnt.id;
                  return (
                    <label
                      key={mnt.id}
                      onClick={() => handleMountingSelect(mnt)}
                      className={`flex items-start gap-2.5 p-3 rounded-sm border cursor-pointer transition-all ${
                        isMountSelected
                          ? 'bg-[#F7F5EB] border-l-4 border-l-[#1B3B2B] border-[#1B3B2B] shadow-xs'
                          : 'bg-[#F7F5EF] border-[#E8E4DA] hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="mounting-choice"
                        checked={isMountSelected}
                        onChange={() => handleMountingSelect(mnt)}
                        className="accent-[#1B3B2B] w-4 h-4 mt-0.5"
                      />
                      <div>
                        <p className="font-serif text-sm font-bold text-[#191C1A]">
                          {mnt.name}
                        </p>
                        <p className="text-[11px] text-[#424844] leading-snug">
                          {mnt.specs}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* STEP 6: ATELIER VALUATION & DIRECT WHATSAPP ACTION CARD   */}
            {/* --------------------------------------------------------- */}
            <div className="bg-[#1B3B2B] text-[#F7F3EB] rounded-sm p-6 shadow-card space-y-5">
              <div className="flex items-center justify-between border-b border-[#2C523F] pb-4">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#9C7A3C] block font-semibold">
                    Step 6 • Specification Valuation
                  </span>
                  <h3 className="font-serif text-xl font-bold text-white">
                    Atelier Quotation Breakdown
                  </h3>
                </div>
                <span className="font-mono text-xs bg-[#2C523F] px-2.5 py-1 rounded-sm text-[#F7F3EB]">
                  Provisional · HSN 4414 (18% GST)
                </span>
              </div>

              {/* Line Item Ledger */}
              <div className="space-y-2 text-xs font-mono text-[#D1E8DB]/90">
                <div className="flex justify-between items-center">
                  <span>Moulding ({linearFeet} ft @ ₹{footRateINR}/ft):</span>
                  <span className="text-white font-semibold">{formatINR(moldingCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Archival Mat ({selectedMat.name}):</span>
                  <span className="text-white font-semibold">{formatINR(matCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Glazing ({selectedGlazing.name}):</span>
                  <span className="text-white font-semibold">
                    {glazingDelta >= 0 ? `+${formatINR(glazingDelta)}` : `-${formatINR(Math.abs(glazingDelta))}`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Assembly &amp; Anchors ({selectedMounting.name}):</span>
                  <span className="text-white font-semibold">Included</span>
                </div>
                <div className="pt-2 border-t border-[#2C523F] flex justify-between items-center text-sm font-bold text-white">
                  <span>Base Subtotal:</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#D4B06A]">
                  <span>GST (Provisional 18% Est.):</span>
                  <span>{formatINR(gstAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#D1E8DB]/80">
                  <span>Delivery &amp; Crating:</span>
                  <span>Quoted by workshop (TBD)</span>
                </div>
              </div>

              {/* Total Estimated Price */}
              <div className="pt-3 border-t border-[#2C523F] flex items-end justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#CCA563] block font-semibold">
                    Bespoke Atelier Estimate
                  </span>
                  <span className="font-serif text-2xl sm:text-3xl font-bold text-white leading-none">
                    {formatINR(totalPrice)}
                  </span>
                </div>
                <span className="text-[10px] text-[#D1E8DB]/85 font-mono text-right max-w-[175px]">
                  Excludes delivery · Tax &amp; freight confirmed on workshop quotation
                </span>
              </div>

              {/* Primary Call to Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onProceedToReview}
                  className="flex-1 bg-[#9C7A3C] hover:bg-[#85662E] text-white py-3 px-4 rounded-sm text-xs font-semibold uppercase tracking-wider text-center transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Request Quotation Dossier</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white border border-[#2C523F] py-3 px-4 rounded-sm text-xs font-semibold uppercase tracking-wider text-center transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>WhatsApp Atelier</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM STICKY ATELIER VALUATION & CONVERSION ACTION BAR        */}
      {/* ------------------------------------------------------------- */}
      <div className="sticky bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-[#E8E4DA] py-2.5 sm:py-3.5 px-4 sm:px-6 lg:px-12 shadow-[0_-8px_24px_rgba(25,28,26,0.06)] z-30">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Cost Ledger Summary */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 sm:gap-x-6 text-xs text-[#191C1A] font-mono">
            <div className="flex items-center gap-1">
              <span className="text-[#727874]">Profile:</span>
              <span className="font-bold">{formatINR(moldingCost)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#727874]">Mat:</span>
              <span className="font-bold">{formatINR(matCost)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#727874]">Glaze:</span>
              <span className="font-bold">
                {glazingDelta >= 0 ? `+${formatINR(glazingDelta)}` : `-${formatINR(Math.abs(glazingDelta))}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#727874]">GST (Prov. 18%):</span>
              <span className="font-bold text-[#9C7A3C]">{formatINR(gstAmount)}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-[#727874]">Delivery:</span>
              <span className="font-semibold text-[#1B3B2B]">TBD</span>
            </div>
          </div>

          {/* Action Total & Primary CTAs */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right pr-2">
              <p className="text-[10px] uppercase tracking-widest text-[#727874] font-mono">
                Bespoke Total
              </p>
              <p className="font-serif text-xl sm:text-2xl font-bold text-[#1B3B2B] leading-none">
                {formatINR(totalPrice)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center justify-center gap-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#1B3B2B] px-3.5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors border border-[#25D366]/30"
                title="Direct consultation on WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span className="hidden md:inline">WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={onProceedToReview}
                className="inline-flex items-center justify-center gap-2 bg-[#1B3B2B] hover:bg-[#0f231a] text-white px-5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
              >
                <span>Request Quotation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
