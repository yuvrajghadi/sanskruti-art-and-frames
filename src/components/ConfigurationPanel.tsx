import React, { useState } from 'react';
import { FrameSample, DimensionUnit, MatOption, ArtworkOption, CurrencyCode } from '../types';
import { MAT_OPTIONS, ARTWORK_OPTIONS, PRESET_DIMENSIONS } from '../data/frames';
import { calculateFramePrice, getAspectRatioLabel, formatINR, getMouldingFootRateINR, GST_RATE } from '../utils/pricing';
import { formatWhatsAppQuoteUrl, getIndianWhatsAppUrl } from '../utils/whatsapp';
import { saveLead } from '../utils/leadStorage';
import { 
  Sparkles, 
  Upload, 
  ArrowRight, 
  Check, 
  Box, 
  Sliders,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Share2,
  Minus,
  Plus,
  RefreshCw,
  Maximize2
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
  { id: 'optium', name: 'Tru-Vue Optium Museum Acrylic', specs: '99% UV Blocking, Anti-Reflective, Shatterproof', priceDelta: 1800 },
  { id: 'ultravue', name: 'UltraVue 70 Anti-Reflective', specs: '70% UV Protection, Water-White Glass', priceDelta: 950 },
  { id: 'clear', name: 'Standard Conservation Lucite', specs: 'Crystal Clear Museum Grade Acrylic', priceDelta: 0 },
  { id: 'none', name: 'No Glazing (Open Canvas / Oil)', specs: 'Direct Surface View with Stretcher Cleats', priceDelta: -500 },
];

export const MOUNTING_OPTIONS: MountingOption[] = [
  { id: 'french-cleat', name: 'Precision Z-Bar French Cleat', specs: 'Extruded aluminum, zero-sag wall anchor, integrated bubble level', priceDelta: 0 },
  { id: 'aircraft-wire', name: 'Braided Aircraft Cable & D-Rings', specs: 'Stainless steel 100 lb test wire with felt wall bumpers', priceDelta: 0 },
];

interface ConfigurationPanelProps {
  selectedFrame: FrameSample | null;
  width: number;
  height: number;
  unit: DimensionUnit;
  isGenerating: boolean;
  selectedMat: MatOption;
  selectedArtwork: ArtworkOption;
  customArtUrl: string | null;
  onWidthChange: (val: number) => void;
  onHeightChange: (val: number) => void;
  onUnitChange: (unit: DimensionUnit) => void;
  onMatChange: (mat: MatOption) => void;
  onArtworkChange: (art: ArtworkOption) => void;
  onCustomArtUpload: (url: string | null) => void;
  onGenerate: () => void;
  onProceedToStudio?: () => void;
  onProceedToReview?: () => void;
  onProceedToCatalog?: () => void;
  artworkFit?: 'fit' | 'fill';
  onArtworkFitChange?: (fit: 'fit' | 'fill') => void;
  currency?: CurrencyCode;
  onCurrencyChange?: (c: CurrencyCode) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  selectedFrame,
  width,
  height,
  unit,
  isGenerating,
  selectedMat,
  selectedArtwork,
  customArtUrl,
  onWidthChange,
  onHeightChange,
  onUnitChange,
  onMatChange,
  onArtworkChange,
  onCustomArtUpload,
  onGenerate,
  onProceedToStudio,
  onProceedToReview,
  onProceedToCatalog,
  artworkFit = 'fill',
  onArtworkFitChange,
  currency = 'INR',
}) => {
  const [selectedGlazing, setSelectedGlazing] = useState<GlazingOption>(GLAZING_OPTIONS[0]);
  const [selectedMounting, setSelectedMounting] = useState<MountingOption>(MOUNTING_OPTIONS[0]);
  const [matReveal, setMatReveal] = useState<number>(selectedMat.borderWidth || 2.5);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  if (!selectedFrame) {
    return (
      <div className="p-8 bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E8E4DA] text-center text-[#5A615C]">
        <Sliders className="w-10 h-10 text-[#B47C55]/50 mx-auto mb-3" />
        <h4 className="font-serif text-lg font-bold text-[#24382F]">Select a Moulding Profile</h4>
        <p className="text-xs text-[#5A615C] mt-1 max-w-xs mx-auto leading-relaxed">
          Please select a decorative moulding profile from our workshop catalogue to begin configuring dimensions and archival finishes.
        </p>
        {onProceedToCatalog && (
          <button
            type="button"
            onClick={onProceedToCatalog}
            className="mt-4 px-4 py-2 bg-[#24382F] hover:bg-[#B47C55] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            Explore Workshop Mouldings →
          </button>
        )}
      </div>
    );
  }

  // Unit conversion helper
  const handleUnitToggle = (newUnit: DimensionUnit) => {
    if (newUnit === unit) return;
    if (newUnit === 'cm') {
      onWidthChange(Math.round(width * 2.54 * 10) / 10);
      onHeightChange(Math.round(height * 2.54 * 10) / 10);
    } else {
      onWidthChange(Math.round((width / 2.54) * 10) / 10);
      onHeightChange(Math.round((height / 2.54) * 10) / 10);
    }
    onUnitChange(newUnit);
  };

  // Price estimate calculation with glazing delta and 100% INR currency
  const baseEstimate = calculateFramePrice(
    selectedFrame,
    width,
    height,
    unit,
    selectedMat,
    'INR'
  );
  const glazingDelta = selectedGlazing.priceDelta;
  const rawSubtotal = Math.max(0, (baseEstimate.subtotal || baseEstimate.totalPrice) + glazingDelta);
  const calculatedGst = Math.round(rawSubtotal * GST_RATE);
  const totalPrice = rawSubtotal + calculatedGst;
  const aspectRatio = getAspectRatioLabel(width, height);

  // Outer overall assembled frame dimensions including moulding face width
  const matBorderWidth = selectedMat.id === 'mat-none' ? 0 : matReveal;
  const addedPerSide = selectedFrame.profileWidth + matBorderWidth;
  const outerWidth = unit === 'in' 
    ? (width + addedPerSide * 2).toFixed(1)
    : (width + addedPerSide * 2 * 2.54).toFixed(1);
  const outerHeight = unit === 'in' 
    ? (height + addedPerSide * 2).toFixed(1)
    : (height + addedPerSide * 2 * 2.54).toFixed(1);

  // Stepper increment/decrement
  const stepAmount = unit === 'in' ? 0.5 : 1.0;
  const handleAdjustWidth = (delta: number) => {
    const minVal = unit === 'in' ? 4 : 10;
    const maxVal = unit === 'in' ? 96 : 244;
    const newVal = Math.min(maxVal, Math.max(minVal, width + delta));
    onWidthChange(Math.round(newVal * 10) / 10);
  };
  const handleAdjustHeight = (delta: number) => {
    const minVal = unit === 'in' ? 4 : 10;
    const maxVal = unit === 'in' ? 96 : 244;
    const newVal = Math.min(maxVal, Math.max(minVal, height + delta));
    onHeightChange(Math.round(newVal * 10) / 10);
  };

  // Copy shareable link helper
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

  // File upload handler
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

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DA] shadow-subtle-card overflow-hidden flex flex-col">
      {/* ------------------------------------------------------------- */}
      {/* ATELIER PROFILE HERO STRIP                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 bg-[#FAF9F6] border-b border-[#E8E4DA] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-13 h-13 rounded-xl overflow-hidden border border-[#B47C55]/30 relative bg-[#ECEFEA] flex-shrink-0 shadow-xs group">
            <img
              src={selectedFrame.cornerDetailUrl || selectedFrame.thumbnailUrl}
              alt={selectedFrame.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-xl pointer-events-none" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase bg-[#24382F] text-[#F7F5EF] px-1.5 py-0.5 rounded font-semibold tracking-wider">
                #{selectedFrame.id}
              </span>
              <span className="text-[11px] text-[#7A4B28] font-bold uppercase tracking-wider">
                {selectedFrame.style}
              </span>
              {onProceedToCatalog && (
                <button
                  type="button"
                  onClick={onProceedToCatalog}
                  className="text-[11px] text-[#B47C55] font-semibold hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Switch</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#24382F] leading-tight truncate">
              {selectedFrame.name}
            </h3>
            <p className="text-[11px] text-[#5A615C] font-mono mt-0.5">
              Face: {selectedFrame.profileWidth.toFixed(2)}" ({(selectedFrame.profileWidth * 25.4).toFixed(1)} mm) · Depth: {selectedFrame.depth.toFixed(2)}"
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <span className="font-serif text-lg sm:text-xl font-bold text-[#24382F] block">
            ₹{getMouldingFootRateINR(selectedFrame)}
          </span>
          <span className="text-[10px] text-[#727874] font-mono block">per linear ft</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5-STEP STUDIO WORKFLOW BODY                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
        {/* ============================================================= */}
        {/* STEP 1: ARCHITECTURAL DIMENSIONS & ORIENTATION                */}
        {/* ============================================================= */}
        <section className="space-y-3.5 pb-6 border-b border-[#E8E4DA]/80">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#24382F] text-[#F7F5EF] flex items-center justify-center text-xs font-bold font-mono">
                1
              </span>
              <h4 className="font-serif text-base sm:text-lg font-bold text-[#24382F]">
                Frame Dimensions &amp; Cavity
              </h4>
            </div>

            {/* Controls: Unit & Orientation */}
            <div className="flex items-center gap-2">
              {/* Orientation Buttons: Portrait vs Landscape */}
              <div className="flex items-center p-0.5 bg-[#FAF9F6] rounded-lg border border-[#E8E4DA]">
                <button
                  type="button"
                  onClick={() => {
                    if (width > height) {
                      const temp = width;
                      onWidthChange(height);
                      onHeightChange(temp);
                    }
                  }}
                  title="Portrait Orientation (Height ≥ Width)"
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                    height >= width
                      ? 'bg-[#24382F] text-white shadow-xs'
                      : 'text-[#5A615C] hover:text-[#24382F]'
                  }`}
                >
                  <span className="w-2.5 h-3.5 border-2 border-current rounded-[1px] inline-block" />
                  <span>Portrait</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (height > width) {
                      const temp = width;
                      onWidthChange(height);
                      onHeightChange(temp);
                    }
                  }}
                  title="Landscape Orientation (Width ≥ Height)"
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                    width >= height
                      ? 'bg-[#24382F] text-white shadow-xs'
                      : 'text-[#5A615C] hover:text-[#24382F]'
                  }`}
                >
                  <span className="w-3.5 h-2.5 border-2 border-current rounded-[1px] inline-block" />
                  <span>Landscape</span>
                </button>
              </div>

              {/* Measurement Unit Toggle */}
              <div className="flex items-center p-0.5 bg-[#FAF9F6] rounded-lg border border-[#E8E4DA]">
                <button
                  type="button"
                  onClick={() => handleUnitToggle('in')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    unit === 'in'
                      ? 'bg-[#24382F] text-white shadow-xs'
                      : 'text-[#5A615C] hover:text-[#24382F]'
                  }`}
                >
                  IN
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitToggle('cm')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    unit === 'cm'
                      ? 'bg-[#24382F] text-white shadow-xs'
                      : 'text-[#5A615C] hover:text-[#24382F]'
                  }`}
                >
                  CM
                </button>
              </div>
            </div>
          </div>

          {/* Width & Height Inputs with Steppers */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Width Card */}
            <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E8E4DA] focus-within:border-[#B47C55] transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#727874]">
                  Cavity Width ({unit})
                </label>
                <span className="text-[10px] font-mono text-[#5A615C]">
                  {unit === 'in' ? `${(width * 25.4).toFixed(0)} mm` : `${(width / 2.54).toFixed(1)}"`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAdjustWidth(-stepAmount)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-[#E8E4DA] text-[#24382F] border border-[#E8E4DA] flex items-center justify-center transition-colors shadow-2xs"
                  title="Decrease width"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={unit === 'in' ? 4 : 10}
                  max={unit === 'in' ? 96 : 244}
                  step={unit === 'in' ? 0.5 : 1}
                  value={width}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed)) onWidthChange(parsed);
                  }}
                  className="w-full text-center text-lg font-mono font-bold text-[#24382F] bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAdjustWidth(stepAmount)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-[#E8E4DA] text-[#24382F] border border-[#E8E4DA] flex items-center justify-center transition-colors shadow-2xs"
                  title="Increase width"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Height Card */}
            <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E8E4DA] focus-within:border-[#B47C55] transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#727874]">
                  Cavity Height ({unit})
                </label>
                <span className="text-[10px] font-mono text-[#5A615C]">
                  {unit === 'in' ? `${(height * 25.4).toFixed(0)} mm` : `${(height / 2.54).toFixed(1)}"`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAdjustHeight(-stepAmount)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-[#E8E4DA] text-[#24382F] border border-[#E8E4DA] flex items-center justify-center transition-colors shadow-2xs"
                  title="Decrease height"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={unit === 'in' ? 4 : 10}
                  max={unit === 'in' ? 96 : 244}
                  step={unit === 'in' ? 0.5 : 1}
                  value={height}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed)) onHeightChange(parsed);
                  }}
                  className="w-full text-center text-lg font-mono font-bold text-[#24382F] bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAdjustHeight(stepAmount)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-[#E8E4DA] text-[#24382F] border border-[#E8E4DA] flex items-center justify-center transition-colors shadow-2xs"
                  title="Increase height"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Architectural Wall Footprint Badge */}
          <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E8E4DA] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#24382F]">
              <Maximize2 className="w-3.5 h-3.5 text-[#B47C55]" />
              <span className="font-semibold">Outer Wall Footprint:</span>
              <span className="font-bold text-[#7A4B28]">{outerWidth} × {outerHeight} {unit}</span>
            </div>
            <div className="text-[#5A615C] text-[11px]">
              <span>Ratio: </span>
              <span className="font-bold text-[#24382F]">{aspectRatio}</span>
            </div>
          </div>

          {/* Museum Cavity Presets */}
          <div className="pt-1">
            <span className="text-[10px] uppercase font-bold text-[#727874] tracking-wider block mb-1">
              Standard Museum Cavity Sizes:
            </span>
            <p className="text-[11px] text-[#5A615C] mb-2 leading-snug">
              Measure only your artwork sheet or canvas; any mat border and frame relief are added outward automatically.
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_DIMENSIONS.map((p) => {
                const targetW = unit === 'cm' ? Math.round(p.width * 2.54) : p.width;
                const targetH = unit === 'cm' ? Math.round(p.height * 2.54) : p.height;
                const isSelectedPreset = width === targetW && height === targetH;

                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      onWidthChange(targetW);
                      onHeightChange(targetH);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-center border text-[11px] font-mono font-bold transition-all ${
                      isSelectedPreset
                        ? 'bg-[#24382F] text-white border-[#24382F] shadow-xs'
                        : 'bg-[#FAF9F6] text-[#24382F] border-[#E8E4DA] hover:bg-white hover:border-[#B47C55]'
                    }`}
                  >
                    {p.width}×{p.height}"
                  </button>
                );
              })}
            </div>

            <a
              href={getIndianWhatsAppUrl(
                `Namaste Sanskruti Arts! I need help measuring my artwork size for custom framing (considering #${selectedFrame.id} — ${selectedFrame.name}). Can I share a photo of my artwork?`
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                saveLead({
                  leadType: 'quick_quote',
                  clientName: 'Sizing Help Visitor',
                  skus: [selectedFrame.id],
                  configurationUrl: typeof window !== 'undefined' ? window.location.href : '/configurator',
                  notes: 'Requested sizing guidance via WhatsApp from Step 1',
                })
              }
              data-testid="sizing-whatsapp-help"
              className="mt-2.5 w-full py-2 px-3 rounded-lg border border-[#E8E4DA] bg-[#FAF9F6] hover:bg-white text-[11px] font-semibold text-[#24382F] flex items-center justify-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
              <span>Not sure about size? Send artwork photo on WhatsApp</span>
            </a>
          </div>
        </section>

        {/* ============================================================= */}
        {/* STEP 2: ARCHIVAL MATBOARD TIER                                */}
        {/* ============================================================= */}
        <section className="space-y-3.5 pb-6 border-b border-[#E8E4DA]/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#24382F] text-[#F7F5EF] flex items-center justify-center text-xs font-bold font-mono">
                2
              </span>
              <h4 className="font-serif text-base sm:text-lg font-bold text-[#24382F]">
                Archival Matboard &amp; Reveal
              </h4>
            </div>
            <span className="text-[11px] font-mono text-[#7A4B28] font-bold">
              {selectedMat.id === 'mat-none' ? 'Full Bleed' : `${matReveal.toFixed(2)}" (${(matReveal * 25.4).toFixed(0)}mm)`}
            </span>
          </div>
          <p className="text-[11px] text-[#5A615C] leading-snug">
            Acid-free cotton board frames the art cleanly and creates an air gap so paper prints never stick to the glazing.
          </p>

          {/* Mat Option Cards */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {MAT_OPTIONS.map((m) => {
              const isSelectedMat = selectedMat.id === m.id;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onMatChange(m);
                    if (m.borderWidth > 0) {
                      setMatReveal(m.borderWidth);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    isSelectedMat
                      ? 'bg-white border-[#B47C55] ring-2 ring-[#B47C55]/30 shadow-xs'
                      : 'bg-[#FAF9F6] border-[#E8E4DA] hover:bg-white hover:border-[#B47C55]/60'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-md border border-[#E8E4DA] flex-shrink-0 mt-0.5 shadow-xs"
                    style={{
                      backgroundColor: m.id === 'mat-none' ? '#FAF9F6' : m.colorHex,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#24382F] block truncate">
                      {m.name.split('(')[0]}
                    </span>
                    <span className="text-[10px] text-[#727874] block truncate">
                      {m.id === 'mat-none' ? 'Direct full-bleed' : 'Acid-free 4-ply cotton'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mat Reveal Slider */}
          {selectedMat.id !== 'mat-none' && (
            <div className="pt-2 bg-[#FAF9F6] p-3 rounded-xl border border-[#E8E4DA]">
              <div className="flex justify-between text-xs text-[#5A615C] mb-2 font-medium">
                <span className="text-[#24382F] font-semibold">Custom Mat Reveal Width</span>
                <span className="font-mono text-[#7A4B28] font-bold">{matReveal.toFixed(2)} inches</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={0.25}
                value={matReveal}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setMatReveal(val);
                  onMatChange({ ...selectedMat, borderWidth: val });
                }}
                className="w-full accent-[#B47C55] h-1.5 bg-[#E8E4DA] rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#727874] font-mono mt-1.5">
                <span>1.0" Modern Slim</span>
                <span>2.5" Standard Gallery</span>
                <span>5.0" Dramatic Exhibition</span>
              </div>
            </div>
          )}
        </section>

        {/* ============================================================= */}
        {/* STEP 3: ARTWORK IN FRAME                                      */}
        {/* ============================================================= */}
        <section className="space-y-3.5 pb-6 border-b border-[#E8E4DA]/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#24382F] text-[#F7F5EF] flex items-center justify-center text-xs font-bold font-mono">
                3
              </span>
              <h4 className="font-serif text-base sm:text-lg font-bold text-[#24382F]">
                Artwork in Cavity
              </h4>
            </div>

            {/* Custom Photo Upload Button */}
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#24382F] hover:bg-[#B47C55] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              <span>{customArtUrl ? 'Replace Photo' : 'Upload Your Photo'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Uploaded Art Active Banner */}
          {customArtUrl && (
            <div className="p-2.5 bg-[#FAF9F6] rounded-xl border border-[#B47C55]/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={customArtUrl}
                  alt="Custom uploaded artwork"
                  className="w-8 h-8 rounded-lg object-cover border border-[#E8E4DA]"
                />
                <div>
                  <span className="text-xs font-bold text-[#24382F] block">Your Custom Artwork</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Active in Frame Preview</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCustomArtUpload(null)}
                className="text-[11px] text-[#B47C55] hover:text-[#7A4B28] font-semibold flex items-center gap-1"
                title="Reset to classical museum artworks"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset to Gallery</span>
              </button>
            </div>
          )}

          {/* Masterpiece presets */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {ARTWORK_OPTIONS.map((art) => {
              const isSelectedArt = !customArtUrl && selectedArtwork.id === art.id;

              return (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => {
                    onCustomArtUpload(null);
                    onArtworkChange(art);
                  }}
                  className={`relative rounded-xl overflow-hidden h-16 border transition-all group ${
                    isSelectedArt
                      ? 'border-[#B47C55] ring-2 ring-[#B47C55]/40 shadow-xs scale-102'
                      : 'border-[#E8E4DA] opacity-75 hover:opacity-100 hover:border-[#B47C55]/50'
                  }`}
                  title={`${art.title} by ${art.artist}`}
                >
                  <img
                    src={art.imageUrl}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {isSelectedArt && (
                    <div className="absolute inset-0 bg-[#B47C55]/30 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Artwork Fit Switcher */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="font-semibold text-[#5A615C]">Artwork Fit:</span>
            <div className="inline-flex p-0.5 bg-[#FAF9F6] rounded-lg border border-[#E8E4DA] text-[11px] font-bold">
              <button
                type="button"
                onClick={() => onArtworkFitChange?.('fill')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  artworkFit === 'fill' ? 'bg-[#24382F] text-white shadow-xs' : 'text-[#5A615C]'
                }`}
              >
                Fill Frame (Crop)
              </button>
              <button
                type="button"
                onClick={() => onArtworkFitChange?.('fit')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  artworkFit === 'fit' ? 'bg-[#24382F] text-white shadow-xs' : 'text-[#5A615C]'
                }`}
              >
                Fit Full Art (Letterbox)
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* STEP 4: CONSERVATION GLAZING & MOUNTING HARDWARE              */}
        {/* ============================================================= */}
        <section className="border border-[#E8E4DA] rounded-xl overflow-hidden bg-[#FAF9F6]">
          <button
            type="button"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#F4EFEA] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#24382F] text-[#F7F5EF] flex items-center justify-center text-xs font-bold font-mono">
                4
              </span>
              <div>
                <span className="font-serif font-bold text-sm text-[#24382F] block">
                  Conservation Glazing &amp; Mounting Hardware
                </span>
                <span className="text-[11px] text-[#727874]">
                  {selectedGlazing.name.split('(')[0]} · {selectedMounting.name.split('(')[0]}
                </span>
              </div>
            </div>
            {showAdvancedOptions ? (
              <ChevronUp className="w-4 h-4 text-[#5A615C]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#5A615C]" />
            )}
          </button>

          {showAdvancedOptions && (
            <div className="p-4 pt-1 space-y-4 border-t border-[#E8E4DA] bg-white">
              {/* Conservation Glazing */}
              <div>
                <span className="text-xs font-bold text-[#24382F] block mb-0.5">
                  Conservation Glazing Tier
                </span>
                <p className="text-[11px] text-[#5A615C] mb-2 leading-snug">
                  Choose shatterproof Museum UV Acrylic to stop fading and reflections, Standard Lucite for everyday prints, or Open Canvas for oils.
                </p>
                <div className="space-y-1.5">
                  {GLAZING_OPTIONS.map((g) => {
                    const isSelectedGlazing = selectedGlazing.id === g.id;

                    return (
                      <label
                        key={g.id}
                        onClick={() => setSelectedGlazing(g)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelectedGlazing
                            ? 'bg-[#FAF9F6] border-[#B47C55] ring-1 ring-[#B47C55]/30'
                            : 'bg-white border-[#E8E4DA] hover:border-[#B47C55]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="conservation_glazing"
                            checked={isSelectedGlazing}
                            onChange={() => setSelectedGlazing(g)}
                            className="accent-[#B47C55] w-3.5 h-3.5"
                          />
                          <div>
                            <span className="text-xs font-bold text-[#24382F] block leading-tight">{g.name}</span>
                            <span className="text-[10px] text-[#727874] block">{g.specs}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#24382F] ml-2 flex-shrink-0">
                          {g.priceDelta === 0 ? 'Included' : g.priceDelta > 0 ? `+${formatINR(g.priceDelta)}` : `-${formatINR(Math.abs(g.priceDelta))}`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Mounting Hardware */}
              <div>
                <span className="text-xs font-bold text-[#24382F] block mb-2">
                  Precision Suspension Hardware
                </span>
                <div className="space-y-1.5">
                  {MOUNTING_OPTIONS.map((m) => {
                    const isSelectedMounting = selectedMounting.id === m.id;

                    return (
                      <label
                        key={m.id}
                        onClick={() => setSelectedMounting(m)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelectedMounting
                            ? 'bg-[#FAF9F6] border-[#B47C55] ring-1 ring-[#B47C55]/30'
                            : 'bg-white border-[#E8E4DA] hover:border-[#B47C55]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="mounting_hardware"
                            checked={isSelectedMounting}
                            onChange={() => setSelectedMounting(m)}
                            className="accent-[#B47C55] w-3.5 h-3.5"
                          />
                          <div>
                            <span className="text-xs font-bold text-[#24382F] block leading-tight">{m.name}</span>
                            <span className="text-[10px] text-[#727874] block">{m.specs}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-700 ml-2 flex-shrink-0">
                          Included
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ============================================================= */}
      {/* STEP 5: ATELIER QUOTATION & VALUATION (INDIAN MARKET ONLY)    */}
      {/* ============================================================= */}
      <div className="p-4 sm:p-5 bg-[#FAF9F6] border-t border-[#E8E4DA] space-y-3">
        {/* Direct Indian Workshop Badge & Share Link */}
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E4DA]/70">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-[11px] font-mono font-semibold text-[#24382F]">
              Direct Factory Tariff · Pan-India Delivery
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#FAF9F6] text-[#24382F] border border-[#E8E4DA] rounded-lg text-xs font-semibold transition-all shadow-xs"
            title="Copy shareable configuration link with all dimensions and options"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#B47C55]" />
                <span>Share Spec</span>
              </>
            )}
          </button>
        </div>

        {/* Itemized Valuation Breakdown */}
        <div className="space-y-1.5 py-1 text-xs">
          <div className="flex justify-between text-[#5A615C]">
            <span>Base Custom Frame + Glazing:</span>
            <span className="font-mono font-medium text-[#24382F]">{formatINR(rawSubtotal)}</span>
          </div>
          <div className="flex justify-between text-[#5A615C]">
            <span>GST @ 18% (HSN 4414):</span>
            <span className="font-mono font-medium text-[#24382F]">{formatINR(calculatedGst)}</span>
          </div>
          <div className="flex justify-between text-[#5A615C]">
            <span>Pan-India Safe Transit:</span>
            <span className="font-mono font-medium text-emerald-700">
              {totalPrice >= 5000 ? 'FREE (Orders > ₹5,000)' : '₹450'}
            </span>
          </div>
        </div>

        {/* Total Price Hero */}
        <div className="flex items-baseline justify-between pt-2 border-t border-[#E8E4DA]">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#727874] block">
              Estimated Total (Incl. 18% GST)
            </span>
            <span className="text-[11px] text-[#5A615C] font-mono">
              {baseEstimate.linearFeet.toFixed(2)} linear ft · Sanskruti Arts Atelier
            </span>
          </div>
          <div className="text-right">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#24382F]">
              {formatINR(totalPrice)}
            </span>
          </div>
        </div>

        {/* Studio & Review Navigation Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {onProceedToStudio && (
            <button
              type="button"
              onClick={onProceedToStudio}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#FAF9F6] text-[#24382F] border border-[#E8E4DA] hover:border-[#B47C55] font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Box className="w-4 h-4 text-[#B47C55]" />
              <span>3D Studio</span>
            </button>
          )}

          {onProceedToReview ? (
            <button
              type="button"
              onClick={onProceedToReview}
              className="py-2.5 px-3 rounded-xl bg-[#24382F] hover:bg-[#1A2922] text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Review Quote</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="py-2.5 px-3 rounded-xl bg-[#24382F] hover:bg-[#1A2922] text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-[#C8933C]" />
              <span>{isGenerating ? 'Simulating...' : 'Simulate 3D'}</span>
            </button>
          )}
        </div>

        {/* WhatsApp Direct Manufacturer Enquiry CTA */}
        <a
          href={formatWhatsAppQuoteUrl({
            frameId: selectedFrame.id,
            frameName: selectedFrame.name,
            profileWidth: selectedFrame.profileWidth,
            width,
            height,
            unit,
            matName: selectedMat.name,
            glazingName: selectedGlazing.name,
            mountingName: selectedMounting.name,
            estimatedPrice: totalPrice,
            currency,
            shareUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          })}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            saveLead({
              leadType: 'quick_quote',
              clientName: 'Studio Configurator Client',
              skus: [selectedFrame.id],
              configurationUrl: typeof window !== 'undefined' ? window.location.href : '/configurator',
              estimatedTotalINR: totalPrice,
              notes: `${width}×${height} ${unit} · ${selectedMat.name} · ${selectedGlazing.name}`,
            })
          }
          className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Enquire on WhatsApp (#{selectedFrame.id})</span>
        </a>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE STICKY BOTTOM BAR (Small viewports)                    */}
      {/* ------------------------------------------------------------- */}
      <div className="lg:hidden sticky bottom-0 left-0 right-0 z-30 bg-[#24382F] text-white p-3 border-t border-[#B47C55]/40 shadow-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={selectedFrame.cornerDetailUrl || selectedFrame.thumbnailUrl}
            alt={selectedFrame.name}
            className="w-10 h-10 rounded-lg object-cover border border-[#B47C55]/50 flex-shrink-0"
          />
          <div className="min-w-0">
            <span className="text-xs font-bold font-serif text-white block truncate leading-tight">
              {selectedFrame.name}
            </span>
            <span className="text-[10px] font-mono text-[#E8E4DA] block">
              {width} × {height} {unit} · {formatINR(totalPrice)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onProceedToStudio && (
            <button
              type="button"
              onClick={onProceedToStudio}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              title="3D Studio"
            >
              <Box className="w-4 h-4 text-[#B47C55]" />
            </button>
          )}
          {onProceedToReview ? (
            <button
              type="button"
              onClick={onProceedToReview}
              className="px-3.5 py-2 rounded-lg bg-[#B47C55] hover:bg-[#9D6842] text-white font-bold text-xs flex items-center gap-1"
            >
              <span>Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onGenerate}
              className="px-3.5 py-2 rounded-lg bg-[#B47C55] hover:bg-[#9D6842] text-white font-bold text-xs flex items-center gap-1"
            >
              <span>Render</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
