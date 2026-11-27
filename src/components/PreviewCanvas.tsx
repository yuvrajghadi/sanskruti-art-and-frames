import React, { useState, useEffect } from 'react';
import { FrameSample, DimensionUnit, ViewMode, GeneratedMockup, MatOption, ArtworkOption } from '../types';
import { FrameCanvas2D } from './FrameCanvas2D';
import { ThreeFrameViewer, LightingEnv, CameraAngle, PatinaMode } from './ThreeFrameViewer';
import { GenerativeLoadingOverlay } from './GenerativeLoadingOverlay';
import { 
  Box, 
  Image as ImageIcon, 
  RotateCw, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Sun, 
  Flame, 
  CloudSun, 
  Download, 
  Check, 
  Compass,
  FileDown,
  Ruler
} from 'lucide-react';

interface PreviewCanvasProps {
  selectedFrame: FrameSample | null;
  width: number;
  height: number;
  unit: DimensionUnit;
  selectedMat?: MatOption;
  selectedArtwork?: ArtworkOption;
  isGenerating: boolean;
  generatedMockup: GeneratedMockup | null;
  customArtUrl: string | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onRegenerate: () => void;
  onProceedToReview?: () => void;
  artworkFit?: 'fit' | 'fill';
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  selectedFrame,
  width,
  height,
  unit,
  selectedMat,
  selectedArtwork,
  isGenerating,
  customArtUrl,
  viewMode,
  onViewModeChange,
  onRegenerate,
  artworkFit = 'fill',
}) => {
  // Mobile-first 2D default (< 768px) to avoid blocking mobile paint with immediate WebGL init
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [mobile3DApproved, setMobile3DApproved] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const effectiveViewMode: ViewMode =
    viewMode === '3d' && isMobileViewport && !mobile3DApproved ? '2d' : viewMode;

  // 3D Studio Settings
  const [lighting, setLighting] = useState<LightingEnv>('3000k');
  const [cameraPreset, setCameraPreset] = useState<CameraAngle>('corner');
  const [patina, setPatina] = useState<PatinaMode>('pristine');
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2D View Settings
  const [canvasSubMode, setCanvasSubMode] = useState<'blueprint' | 'render' | 'exploded'>('render');
  const [wallColor, setWallColor] = useState<'stone' | 'forest' | 'linen' | 'alabaster' | 'obsidian'>('stone');

  const WALL_COLORS: Record<'stone' | 'forest' | 'linen' | 'alabaster' | 'obsidian', { label: string; hex: string }> = {
    stone: { label: 'Warm Stone', hex: '#E8E4DA' },
    forest: { label: 'Deep Forest', hex: '#24382F' },
    linen: { label: 'Raw Linen', hex: '#F5F3ED' },
    alabaster: { label: 'Gallery Alabaster', hex: '#FAF9F6' },
    obsidian: { label: 'Obsidian Slate', hex: '#1C1917' },
  };

  // Trigger feedback toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!selectedFrame) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#FAF9F6]">
        <div className="text-center p-8 bg-white rounded-2xl border border-dashed border-[#E8E4DA] max-w-sm shadow-subtle-card">
          <Box className="w-10 h-10 text-[#B47C55]/50 mx-auto mb-3" />
          <h4 className="font-serif text-lg font-bold text-[#24382F]">No Moulding Selected</h4>
          <p className="text-xs text-[#5A615C] mt-1 leading-relaxed">
            Choose a decorative moulding from the catalogue to initialize real-time 2D elevations and the 3D raytracing studio.
          </p>
        </div>
      </div>
    );
  }

  // Active mat and artwork fallbacks
  const currentMat: MatOption = selectedMat || {
    id: 'mat-offwhite',
    name: 'Museum Cotton Rag',
    colorHex: '#F5F3EC',
    coreHex: '#EAE6DC',
    borderWidth: 2.5
  };

  const currentArtwork: ArtworkOption = selectedArtwork || {
    id: 'art-default',
    title: 'Johannes Vermeer',
    artist: 'Girl with a Pearl Earring',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=85',
    aspectRatio: 0.82
  };

  // Weight estimation based on physical dimensions
  const totalPerimeterFt = ((width + height) * 2) / (unit === 'cm' ? 30.48 : 12);
  const estimatedWeightLbs = (totalPerimeterFt * (selectedFrame.depth * selectedFrame.profileWidth * 0.45)).toFixed(1);
  const estimatedWeightKg = (parseFloat(estimatedWeightLbs) * 0.453592).toFixed(1);

  // Outer overall dimensions calculation
  const matBorderWidth = currentMat.id === 'mat-none' ? 0 : currentMat.borderWidth;
  const addedPerSide = selectedFrame.profileWidth + matBorderWidth;
  const outerWidth = unit === 'in'
    ? (width + addedPerSide * 2).toFixed(1)
    : (width + addedPerSide * 2 * 2.54).toFixed(1);
  const outerHeight = unit === 'in'
    ? (height + addedPerSide * 2).toFixed(1)
    : (height + addedPerSide * 2 * 2.54).toFixed(1);

  return (
    <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden relative ${isFullscreen ? 'fixed inset-0 z-50 bg-[#1C1917]' : 'bg-[#FAF9F6]'}`}>
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#24382F] text-white px-4 py-3 rounded-xl shadow-2xl font-mono text-xs flex items-center gap-2.5 border border-[#B47C55]/50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-[#B47C55]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TOP STUDIO NAVIGATION & TOOLBAR                               */}
      {/* ------------------------------------------------------------- */}
      <div className="px-4 py-2.5 sm:px-6 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E8E4DA] flex flex-wrap items-center justify-between gap-3 z-20">
        {/* Left: View Mode Toggle (Realistic 2D View vs 3D Interactive Studio) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-0.5 bg-[#E8E4DA]/60 rounded-xl border border-[#E8E4DA] text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMobile3DApproved(false);
                onViewModeChange('2d');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                effectiveViewMode === '2d'
                  ? 'bg-[#24382F] text-white shadow-xs font-semibold'
                  : 'text-[#5A615C] hover:text-[#24382F]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Realistic 2D</span>
            </button>
            <button
              type="button"
              data-testid="preview-canvas-inspect-3d-btn"
              onClick={() => {
                setMobile3DApproved(true);
                onViewModeChange('3d');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                effectiveViewMode === '3d'
                  ? 'bg-[#24382F] text-white shadow-xs font-semibold'
                  : 'text-[#5A615C] hover:text-[#24382F]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{isMobileViewport && effectiveViewMode === '2d' ? 'Inspect in 3D Studio' : '3D Studio'}</span>
            </button>
          </div>

          {/* Active Moulding Status Chip */}
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-[#7A4B28] bg-white border border-[#E8E4DA] px-2.5 py-1 rounded-full font-semibold shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Selected: #{selectedFrame.id}
          </span>

          {/* 2D Sub-mode Switcher */}
          {effectiveViewMode === '2d' && (
            <div className="hidden md:inline-flex p-0.5 bg-[#E8E4DA]/60 rounded-xl border border-[#E8E4DA] text-xs font-medium">
              <button
                type="button"
                onClick={() => setCanvasSubMode('render')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  canvasSubMode === 'render'
                    ? 'bg-white text-[#24382F] font-bold shadow-2xs'
                    : 'text-[#5A615C] hover:text-[#24382F]'
                }`}
              >
                Realistic Render
              </button>
              <button
                type="button"
                onClick={() => setCanvasSubMode('blueprint')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  canvasSubMode === 'blueprint'
                    ? 'bg-white text-[#24382F] font-bold shadow-2xs'
                    : 'text-[#5A615C] hover:text-[#24382F]'
                }`}
              >
                Blueprint CAD
              </button>
              <button
                type="button"
                onClick={() => setCanvasSubMode('exploded')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  canvasSubMode === 'exploded'
                    ? 'bg-white text-[#24382F] font-bold shadow-2xs'
                    : 'text-[#5A615C] hover:text-[#24382F]'
                }`}
              >
                Exploded Miter
              </button>
            </div>
          )}

          {/* Studio Wall Color Switcher */}
          {effectiveViewMode === '2d' && (
            <div className="hidden lg:flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E8E4DA] text-xs shadow-2xs">
              <span className="text-[11px] text-[#727874] px-1.5 font-medium">Wall:</span>
              {(['stone', 'forest', 'linen', 'alabaster', 'obsidian'] as const).map((colorKey) => (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() => setWallColor(colorKey)}
                  className={`px-2 py-0.5 rounded-lg text-xs transition-all ${
                    wallColor === colorKey
                      ? 'bg-[#24382F] text-white font-semibold shadow-2xs'
                      : 'text-[#5A615C] hover:text-[#24382F]'
                  }`}
                >
                  {WALL_COLORS[colorKey].label.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Tools / Action CTAs */}
        <div className="flex items-center gap-2">
          {effectiveViewMode === '3d' && (
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-[#5A615C] hover:text-[#24382F] bg-white hover:bg-[#FAF9F6] rounded-xl border border-[#E8E4DA] text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs"
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand 3D Studio'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isFullscreen ? 'Exit Fullscreen' : 'Expand 3D'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onRegenerate();
              triggerToast('Generating photorealistic architectural snapshot...');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#24382F] hover:bg-[#1A2922] text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#C8933C]" />
            <span>Save Snapshot</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN VIEWPORT CONTENT                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-40 bg-white/85 backdrop-blur-xs flex items-center justify-center p-4">
            <GenerativeLoadingOverlay
              frame={selectedFrame}
              width={width}
              height={height}
              unit={unit}
            />
          </div>
        )}

        {/* ============================================================= */}
        {/* VIEW 1: 3D INTERACTIVE RAYTRACING STUDIO                      */}
        {/* ============================================================= */}
        {effectiveViewMode === '3d' ? (
          <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-gradient-to-b from-[#1C1917] via-[#141312] to-[#0A0A09] text-white">
            {/* 3D WebGL Canvas Viewport */}
            <div className="flex-1 relative flex flex-col justify-between p-4 sm:p-6 overflow-hidden min-h-[460px]">
              {/* Radial Spotlight & Micro-Grid Halo Backdrop */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-25"
                style={{
                  backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(200, 147, 60, 0.25) 0%, transparent 65%)',
                }}
              />
              <div 
                className="absolute inset-0 pointer-events-none opacity-15"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                  backgroundSize: '32px 32px'
                }}
              />

              {/* Top Viewport Header Strip: Quick Angle Selector */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs">
                  {[
                    { id: 'corner', label: 'Macro Corner (45°)' },
                    { id: 'front', label: 'Full Elevation' },
                    { id: 'cross-section', label: 'Cross-Section CAD' },
                    { id: 'perspective', label: 'Wall Perspective' },
                  ].map((ang) => (
                    <button
                      key={ang.id}
                      type="button"
                      onClick={() => setCameraPreset(ang.id as CameraAngle)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                        cameraPreset === ang.id
                          ? 'bg-[#B47C55] text-white font-bold shadow-xs'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {ang.label}
                    </button>
                  ))}
                </div>

                {/* Camera Orbit Toolbar */}
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAutoRotate(!isAutoRotate)}
                    title={isAutoRotate ? 'Pause Rotation' : 'Auto Rotate'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isAutoRotate ? 'bg-[#B47C55] text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraPreset('corner');
                      triggerToast('Camera view reset to corner elevation');
                    }}
                    title="Reset Camera View"
                    className="p-1.5 text-white/70 hover:text-white rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 3D WebGL Model */}
              <div className="flex-1 w-full relative z-0 flex items-center justify-center">
                <ThreeFrameViewer
                  frame={selectedFrame}
                  width={width}
                  height={height}
                  unit={unit}
                  mat={currentMat}
                  artwork={currentArtwork}
                  customArtUrl={customArtUrl}
                  lighting={lighting}
                  cameraPreset={cameraPreset}
                  patina={patina}
                  isAutoRotate={isAutoRotate}
                  artworkFit={artworkFit}
                />
              </div>

              {/* Bottom Viewport Strip: Lighting & Patina Controls */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                {/* Lighting Presets */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-white/60 font-semibold">
                    Studio Lighting:
                  </span>
                  <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs font-mono">
                    {[
                      { id: '3000k', label: '3000K Museum', icon: Flame },
                      { id: '5500k', label: '5500K Daylight', icon: Sun },
                      { id: '2400k', label: '2400K Candle', icon: Flame },
                      { id: 'studio', label: 'Studio Neutral', icon: CloudSun },
                    ].map((lgt) => {
                      const Icon = lgt.icon;
                      return (
                        <button
                          key={lgt.id}
                          type="button"
                          onClick={() => setLighting(lgt.id as LightingEnv)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                            lighting === lgt.id
                              ? 'bg-white text-[#24382F] font-bold shadow-xs'
                              : 'text-white/70 hover:text-white'
                          }`}
                        >
                          <Icon className="w-3 h-3 text-[#B47C55]" />
                          <span>{lgt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Patina / Wear Level */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-white/60 font-semibold">
                    Finish Patina:
                  </span>
                  <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs font-mono">
                    {[
                      { id: 'pristine', label: 'Pristine Gilt' },
                      { id: 'antiqued', label: 'Light Relic' },
                      { id: 'aged', label: 'Museum Patina' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPatina(p.id as PatinaMode)}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          patina === p.id
                            ? 'bg-[#B47C55] text-white font-bold shadow-xs'
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Technical Inspector Dock */}
            <div className="w-full xl:w-[360px] p-5 sm:p-6 bg-[#141312] border-t xl:border-t-0 xl:border-l border-white/10 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Compass className="w-4 h-4 text-[#B47C55]" />
                    <h3 className="font-serif text-lg font-bold text-white tracking-tight">
                      Technical Inspector
                    </h3>
                  </div>
                  <p className="text-xs text-white/60">
                    Real-time CAD spline telemetry &amp; architectural tolerances
                  </p>
                </div>

                {/* Micrometer Spec Table */}
                <div className="bg-black/40 rounded-xl p-4 border border-white/10 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-white/10">
                    <span className="text-white/60">Profile Face Width</span>
                    <span className="text-white font-bold">{selectedFrame.profileWidth.toFixed(2)} in ({(selectedFrame.profileWidth * 25.4).toFixed(1)} mm)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/10">
                    <span className="text-white/60">Total Depth</span>
                    <span className="text-white font-bold">{selectedFrame.depth.toFixed(2)} in ({(selectedFrame.depth * 25.4).toFixed(1)} mm)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/10">
                    <span className="text-white/60">Rabbet Depth</span>
                    <span className="text-white font-bold">{(selectedFrame.depth * 0.55).toFixed(3)} in</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/10">
                    <span className="text-white/60">Corner Miter Joint</span>
                    <span className="text-emerald-400 font-bold">45.00° Hairline CAD</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/10">
                    <span className="text-white/60">Internal Reinforcement</span>
                    <span className="text-white">Hardwood Biscuit Spline × 4</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/10">
                    <span className="text-white/60">Assembled Weight</span>
                    <span className="text-white font-bold">≈ {estimatedWeightKg} kg ({estimatedWeightLbs} lbs)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-white/60">Stretcher Tension</span>
                    <span className="text-amber-300 font-bold">180 PSI Uniform</span>
                  </div>
                </div>

                {/* Craftsmanship Protocol */}
                <div className="p-3 bg-black/30 rounded-xl border border-white/10 text-xs text-white/70 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#B47C55] block">
                    Sanskruti Arts Craftsmanship Protocol
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Water-gilded and hand-finished in our Indian workshop. Verified under 3000K museum lighting. Zero tear-out pneumatic 45° miter guarantee.
                  </p>
                </div>
              </div>

              {/* Export Actions Strip */}
              <div className="pt-6 border-t border-white/10 space-y-2">
                <button
                  type="button"
                  onClick={() => triggerToast('Exporting 3D OBJ & CAD Mesh Package...')}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-white/15"
                >
                  <FileDown className="w-4 h-4 text-[#B47C55]" />
                  <span>Export CAD Mesh (.OBJ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerToast('Building Apple QuickLook AR (.USDZ) Model...')}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-white/15"
                >
                  <Box className="w-4 h-4 text-[#B47C55]" />
                  <span>Apple QuickLook AR (.USDZ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onRegenerate();
                    triggerToast('Rendering 4K Architectural Snapshot...');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#B47C55] hover:bg-[#9D6842] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Render 4K Architectural Snapshot</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================= */
          /* VIEW 2: 2D ARCHITECTURAL BLUEPRINT & REALISTIC ELEVATION      */
          /* ============================================================= */
          <div className="flex-1 flex flex-col h-full bg-[#FAF9F6] relative">
            <FrameCanvas2D
              frame={selectedFrame}
              width={width}
              height={height}
              unit={unit}
              mat={currentMat}
              artwork={currentArtwork}
              customArtUrl={customArtUrl}
              canvasSubMode={canvasSubMode}
              onSubModeChange={setCanvasSubMode}
              wallColorHex={WALL_COLORS[wallColor].hex}
              artworkFit={artworkFit}
            />

            {/* Bottom-left Outer Dimension Telemetry Pill */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none hidden sm:flex items-center gap-2 bg-[#24382F]/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl border border-white/15 shadow-lg font-mono text-[11px]">
              <Ruler className="w-3.5 h-3.5 text-[#B47C55]" />
              <span className="text-white/70">Outer Wall Footprint:</span>
              <span className="font-bold text-[#E8E4DA]">{outerWidth} × {outerHeight} {unit}</span>
              <span className="text-white/40">|</span>
              <span className="text-white/70">Moulding:</span>
              <span className="text-[#B47C55] font-bold">{selectedFrame.profileWidth.toFixed(2)}"</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
