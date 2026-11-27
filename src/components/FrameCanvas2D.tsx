import React, { useRef, useState, useEffect } from 'react';
import { FrameSample, MatOption, ArtworkOption, DimensionUnit } from '../types';
import { getFrameMaterialProfile } from '../utils/frameRendering';
import { reconstructMouldingTextures, getCachedMouldingDataUrl } from '../utils/mouldingReconstruction';
import { computeSvgGeometry, FrameSide } from '../utils/frameGeometry';
import { Layers, ShieldCheck, Ruler } from 'lucide-react';

interface FrameCanvas2DProps {
  frame: FrameSample;
  width: number;
  height: number;
  unit: DimensionUnit;
  mat: MatOption;
  artwork: ArtworkOption;
  showDimensions?: boolean;
  showGlassGlare?: boolean;
  customArtUrl?: string | null;
  canvasSubMode?: 'blueprint' | 'render' | 'exploded';
  onSubModeChange?: (mode: 'blueprint' | 'render' | 'exploded') => void;
  wallColorHex?: string;
  artworkFit?: 'fit' | 'fill';
  compactStage?: boolean;
}

export const FrameCanvas2D: React.FC<FrameCanvas2DProps> = ({
  frame,
  width,
  height,
  unit,
  mat,
  artwork,
  showDimensions = true,
  showGlassGlare = true,
  customArtUrl,
  canvasSubMode = 'render',
  onSubModeChange,
  wallColorHex = '#e8e4da',
  artworkFit = 'fill',
  compactStage = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const activeMode = canvasSubMode || 'render';

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setViewportSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };

    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener('resize', measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [compactStage]);

  // Photometric Reconstructed Molding Texture with Instant Cache
  const [rectifiedTextureUrl, setRectifiedTextureUrl] = useState<string | null>(
    () => getCachedMouldingDataUrl(frame.id)
  );

  useEffect(() => {
    let active = true;
    const cached = getCachedMouldingDataUrl(frame.id);
    if (cached) {
      setRectifiedTextureUrl(cached);
    }
    reconstructMouldingTextures(frame, { highDpi: true }).then(({ diffuseCanvas }) => {
      if (active) {
        setRectifiedTextureUrl(diffuseCanvas.toDataURL());
      }
    }).catch(() => {
      if (active && !cached) setRectifiedTextureUrl(null);
    });
    return () => { active = false; };
  }, [frame.id, frame.cornerDetailUrl]);

  // Material and physical profile telemetry
  const profile = getFrameMaterialProfile(frame);

  // Single deterministic geometry source of truth (1 unit = 1 physical inch -> normalized SVG viewBox)
  const svgGeom = computeSvgGeometry(frame, width, height, unit, mat);
  const { metrics, vbW, vbH, mouldingFaceSvg: fW, matBorderSvg: mW, artX, artY, artW, artH, outerStepSvg: outerStep, friezeStepSvg: friezeStep, rails } = svgGeom;

  // Outer dimension strings
  const totalWidthInches = metrics.outerWidthIn;
  const totalHeightInches = metrics.outerHeightIn;
  const outerWidthMm = (totalWidthInches * 25.4).toFixed(1);
  const outerHeightMm = (totalHeightInches * 25.4).toFixed(1);
  const outerWidthIn = totalWidthInches.toFixed(2);
  const outerHeightIn = totalHeightInches.toFixed(2);
  const tileLenSvg = metrics.texturePeriodIn * svgGeom.scale;

  // Pad SVG viewBox slightly in exploded mode so shifted rails stay completely inside bounds
  const vbPad = activeMode === 'exploded' ? 28 : 0;
  const effectiveVbW = vbW + vbPad * 2;
  const effectiveVbH = vbH + vbPad * 2;

  // Universal fit-to-container scaling across width & height with balanced whitespace
  const padX = compactStage ? 24 : showDimensions ? 64 : 28;
  const padY = compactStage ? 24 : showDimensions ? 56 : 28;
  const availW = viewportSize.w > 0 ? Math.max(80, viewportSize.w - padX) : 0;
  const availH = viewportSize.h > 0 ? Math.max(80, viewportSize.h - padY) : 0;
  const fittedBoxStyle: React.CSSProperties =
    availW > 0 && availH > 0
      ? (() => {
          const fitScale = Math.min(availW / effectiveVbW, availH / effectiveVbH);
          const fittedW = Math.max(48, Math.floor(effectiveVbW * fitScale));
          const fittedH = Math.max(48, Math.floor(effectiveVbH * fitScale));
          return {
            width: `${fittedW}px`,
            height: `${fittedH}px`,
            aspectRatio: `${effectiveVbW} / ${effectiveVbH}`,
          };
        })()
      : {
          width: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: `${effectiveVbW} / ${effectiveVbH}`,
        };

  const activeArtUrl = customArtUrl || artwork.imageUrl;
  const activeTextureUrl = rectifiedTextureUrl || frame.cornerDetailUrl || frame.thumbnailUrl || '/mouldings/ornate-golden-baroque-picture-frame.png';

  // Unique SVG element IDs namespaced by frame ID
  const cleanId = frame.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const clipTopId = `clip-top-${cleanId}`;
  const clipBottomId = `clip-bottom-${cleanId}`;
  const clipLeftId = `clip-left-${cleanId}`;
  const clipRightId = `clip-right-${cleanId}`;

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col items-center justify-between w-full h-full select-none transition-colors duration-500 overflow-hidden ${
        compactStage ? 'p-2 sm:p-4' : 'p-4 sm:p-6'
      }`}
      style={{ backgroundColor: activeMode === 'blueprint' ? '#FAF8F5' : wallColorHex }}
    >
      {/* Top Header: Frame Info & Outer Dimensions (shown in standalone/review views) */}
      {!compactStage && (
        <div className="w-full max-w-4xl flex items-center justify-between pb-3 border-b border-[#E8E1D8]/60 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl mb-2 shadow-xs shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-[#B47C55]" />
          <span className="font-serif font-bold text-sm sm:text-base text-[#1C1917]">
            {frame.name}
          </span>
          <span className="px-2.5 py-0.5 text-xs font-mono text-[#78716C] bg-[#F4EFEA] rounded-full border border-[#E8E1D8]">
            {frame.profileWidth.toFixed(2)}" Face Width
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSubModeChange && (
            <div className="inline-flex p-0.5 bg-[#F4EFEA] rounded-lg border border-[#E8E1D8] text-[11px] font-mono">
              <button
                type="button"
                onClick={() => onSubModeChange('blueprint')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeMode === 'blueprint'
                    ? 'bg-[#24382F] text-white font-bold shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Blueprint Wireframe
              </button>
              <button
                type="button"
                onClick={() => onSubModeChange('render')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeMode === 'render'
                    ? 'bg-[#B47C55] text-white font-bold shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Realistic Render
              </button>
              <button
                type="button"
                onClick={() => onSubModeChange('exploded')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeMode === 'exploded'
                    ? 'bg-[#24382F] text-white font-bold shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                CAD Exploded
              </button>
            </div>
          )}
          <span className="text-xs font-mono text-[#24382F] bg-white px-3 py-1 rounded-full border border-[#E8E1D8] font-bold shadow-xs">
            Outer Size: {outerWidthIn}" × {outerHeightIn}" ({outerWidthMm} × {outerHeightMm} mm)
          </span>
        </div>
      </div>
      )}

      {/* Main Visualizer Viewport */}
      <div
        ref={viewportRef}
        className={`flex-1 w-full flex items-center justify-center relative overflow-hidden ${
          compactStage ? 'min-h-0' : 'min-h-[260px] sm:min-h-[340px] my-2'
        }`}
      >
        {/* Gallery lighting gradient over wall */}
        {activeMode !== 'blueprint' && (
          <div className="absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/20 pointer-events-none rounded-2xl" />
        )}

        {/* Architectural Background Grid for Blueprint */}
        {activeMode === 'blueprint' && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-40 rounded-2xl"
            style={{
              backgroundImage: 'radial-gradient(#C8933C 0.75px, transparent 0.75px), radial-gradient(#E8E1D8 0.75px, #FAF8F5 0.75px)',
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 12px 12px'
            }}
          />
        )}

        {/* Dimension Annotations Strip (Top Width) */}
        {showDimensions && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur-xs border border-[#E8E1D8] px-3.5 py-1 rounded-full text-xs font-mono text-[#1C1917] shadow-sm z-20">
            <span className="text-[#C8933C] font-bold">Outer Width:</span>
            <span>{outerWidthIn}" ({outerWidthMm} mm)</span>
          </div>
        )}

        {/* Dimension Annotations Strip (Left Height) */}
        {showDimensions && (
          <div className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 origin-center items-center gap-2 bg-white/95 backdrop-blur-xs border border-[#E8E1D8] px-3.5 py-1 rounded-full text-xs font-mono text-[#1C1917] shadow-sm z-20">
            <span className="text-[#C8933C] font-bold">Outer Height:</span>
            <span>{outerHeightIn}" ({outerHeightMm} mm)</span>
          </div>
        )}

        {/* Dynamic SVG Frame Assembly */}
        <div 
          className="relative transition-all duration-300 ease-out z-10 flex items-center justify-center shrink-0"
          style={{
            ...fittedBoxStyle,
            filter: activeMode === 'blueprint' 
              ? 'drop-shadow(0 12px 20px rgba(28,25,23,0.12))' 
              : 'drop-shadow(0 18px 28px rgba(0,0,0,0.32)) drop-shadow(0 8px 12px rgba(0,0,0,0.18))'
          }}
        >
          <svg
            viewBox={`${-vbPad} ${-vbPad} ${effectiveVbW} ${effectiveVbH}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* 0. Seamless Photometric Repeat Patterns — Normalized outer->inner orientation on all 4 rails */}
              <pattern
                id={`moulding-pat-top-${cleanId}`}
                patternUnits="userSpaceOnUse"
                width={tileLenSvg}
                height={fW}
                x={vbW / 2 - tileLenSvg / 2}
                y="0"
              >
                <image
                  href={activeTextureUrl}
                  x="0"
                  y="0"
                  width={tileLenSvg}
                  height={fW}
                  preserveAspectRatio="none"
                />
              </pattern>

              <pattern
                id={`moulding-pat-bot-${cleanId}`}
                patternUnits="userSpaceOnUse"
                width={tileLenSvg}
                height={fW}
                x={vbW / 2 - tileLenSvg / 2}
                y={vbH - fW}
              >
                <image
                  href={activeTextureUrl}
                  x="0"
                  y="0"
                  width={tileLenSvg}
                  height={fW}
                  preserveAspectRatio="none"
                  transform={`translate(0, ${fW}) scale(1, -1)`}
                />
              </pattern>

              <pattern
                id={`moulding-pat-left-${cleanId}`}
                patternUnits="userSpaceOnUse"
                width={fW}
                height={tileLenSvg}
                x="0"
                y={vbH / 2 - tileLenSvg / 2}
              >
                {/* Maps image y=0 (outer rim) -> x_pat=0 (X=0 outer) and y=fW (inner) -> x_pat=fW (X=fW inner) */}
                <image
                  href={activeTextureUrl}
                  x="0"
                  y="0"
                  width={tileLenSvg}
                  height={fW}
                  preserveAspectRatio="none"
                  transform="matrix(0 1 1 0 0 0)"
                />
              </pattern>

              <pattern
                id={`moulding-pat-right-${cleanId}`}
                patternUnits="userSpaceOnUse"
                width={fW}
                height={tileLenSvg}
                x={vbW - fW}
                y={vbH / 2 - tileLenSvg / 2}
              >
                {/* Maps image y=0 (outer rim) -> x_pat=fW (X=vbW outer) and y=fW (inner) -> x_pat=0 (X=vbW-fW inner) */}
                <image
                  href={activeTextureUrl}
                  x="0"
                  y="0"
                  width={tileLenSvg}
                  height={fW}
                  preserveAspectRatio="none"
                  transform={`matrix(0 1 -1 0 ${fW} 0)`}
                />
              </pattern>

              {/* 1. Miter Trapezoid Clip Paths driven from shared geometry */}
              <clipPath id={clipTopId}>
                <polygon points={rails.top.polygonString} />
              </clipPath>
              <clipPath id={clipBottomId}>
                <polygon points={rails.bottom.polygonString} />
              </clipPath>
              <clipPath id={clipLeftId}>
                <polygon points={rails.left.polygonString} />
              </clipPath>
              <clipPath id={clipRightId}>
                <polygon points={rails.right.polygonString} />
              </clipPath>

              {/* 2. Procedural Wood Grain Filters */}
              <filter id={`wood-h-${cleanId}`} x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.45 0.015" numOctaves="4" result="grain" />
                <feColorMatrix type="matrix" values="
                  0.35 0 0 0 0.55
                  0 0.30 0 0 0.42
                  0 0 0.20 0 0.28
                  0 0 0 0.38 0" result="coloredGrain" />
                <feBlend mode="multiply" in="SourceGraphic" in2="coloredGrain" />
              </filter>
              <filter id={`wood-v-${cleanId}`} x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.015 0.45" numOctaves="4" result="grain" />
                <feColorMatrix type="matrix" values="
                  0.35 0 0 0 0.55
                  0 0.30 0 0 0.42
                  0 0 0.20 0 0.28
                  0 0 0 0.38 0" result="coloredGrain" />
                <feBlend mode="multiply" in="SourceGraphic" in2="coloredGrain" />
              </filter>

              {/* 3. Carved Baroque Acanthus Relief Filter */}
              <filter id={`baroque-emboss-${cleanId}`} x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="turbulence" baseFrequency="0.06 0.06" numOctaves="3" result="turb" />
                <feDiffuseLighting in="turb" lightingColor="#ffe7a0" surfaceScale="2.8" result="light">
                  <feDistantLight azimuth="45" elevation="55" />
                </feDiffuseLighting>
                <feComposite operator="arithmetic" k1="1.1" k2="0.4" k3="0.1" k4="0" in="SourceGraphic" in2="light" />
              </filter>

              {/* 4. Distressed Gold Foil Texture Filter */}
              <filter id={`distressed-foil-${cleanId}`} x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.22 0.22" numOctaves="3" result="mottle" />
                <feColorMatrix type="matrix" values="
                  0.6 0 0 0 0.35
                  0 0.5 0 0 0.28
                  0 0 0.2 0 0.12
                  0 0 0 0.45 0" result="mottleColor" />
                <feBlend mode="overlay" in="SourceGraphic" in2="mottleColor" />
              </filter>

              {/* 5. Symmetrical Cross-Sectional Profile Shading (Outer -> Inner identical across all 4 bars) */}
              <linearGradient id={`grad-top-outer-${cleanId}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={outerStep}>
                <stop offset="0%" stopColor={profile.highlightColor} stopOpacity="0.65" />
                <stop offset="100%" stopColor={profile.shadowColor} stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id={`grad-bottom-outer-${cleanId}`} gradientUnits="userSpaceOnUse" x1="0" y1={vbH} x2="0" y2={vbH - outerStep}>
                <stop offset="0%" stopColor={profile.highlightColor} stopOpacity="0.65" />
                <stop offset="100%" stopColor={profile.shadowColor} stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id={`grad-left-outer-${cleanId}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={outerStep} y2="0">
                <stop offset="0%" stopColor={profile.highlightColor} stopOpacity="0.65" />
                <stop offset="100%" stopColor={profile.shadowColor} stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id={`grad-right-outer-${cleanId}`} gradientUnits="userSpaceOnUse" x1={vbW} y1="0" x2={vbW - outerStep} y2="0">
                <stop offset="0%" stopColor={profile.highlightColor} stopOpacity="0.65" />
                <stop offset="100%" stopColor={profile.shadowColor} stopOpacity="0.25" />
              </linearGradient>

              <linearGradient id={`grad-top-frieze-${cleanId}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={fW}>
                <stop offset="0%" stopColor={profile.shadowColor} stopOpacity="0.35" />
                <stop offset="28%" stopColor={profile.baseColor} stopOpacity="0.15" />
                <stop offset="70%" stopColor={profile.highlightColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={profile.shadowColor} stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id={`grad-bottom-frieze-${cleanId}`} gradientUnits="userSpaceOnUse" x1="0" y1={vbH} x2="0" y2={vbH - fW}>
                <stop offset="0%" stopColor={profile.shadowColor} stopOpacity="0.35" />
                <stop offset="28%" stopColor={profile.baseColor} stopOpacity="0.15" />
                <stop offset="70%" stopColor={profile.highlightColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={profile.shadowColor} stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id={`grad-left-frieze-${cleanId}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={fW} y2="0">
                <stop offset="0%" stopColor={profile.shadowColor} stopOpacity="0.35" />
                <stop offset="28%" stopColor={profile.baseColor} stopOpacity="0.15" />
                <stop offset="70%" stopColor={profile.highlightColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={profile.shadowColor} stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id={`grad-right-frieze-${cleanId}`} gradientUnits="userSpaceOnUse" x1={vbW} y1="0" x2={vbW - fW} y2="0">
                <stop offset="0%" stopColor={profile.shadowColor} stopOpacity="0.35" />
                <stop offset="28%" stopColor={profile.baseColor} stopOpacity="0.15" />
                <stop offset="70%" stopColor={profile.highlightColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={profile.shadowColor} stopOpacity="0.45" />
              </linearGradient>

              {/* 6. Museum Glass Glare Gradient */}
              <linearGradient id="glass-glare-linear" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.0" />
                <stop offset="38%" stopColor="#ffffff" stopOpacity="0.0" />
                <stop offset="46%" stopColor="#ffffff" stopOpacity="0.22" />
                <stop offset="54%" stopColor="#ffffff" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>

              {/* 7. Matboard Bevel Core Gradient */}
              <linearGradient id="mat-core-top-left" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="100%" stopColor={mat.coreHex || '#e8e4da'} />
              </linearGradient>
            </defs>

            {/* ================================================================= */}
            {/* MODE 1: BLUEPRINT WIREFRAME                                       */}
            {/* ================================================================= */}
            {activeMode === 'blueprint' ? (
              <g className="font-mono text-[9px]">
                {/* Outer frame border */}
                <rect
                  x="0"
                  y="0"
                  width={vbW}
                  height={vbH}
                  fill="#FFFFFF"
                  stroke="#1C1917"
                  strokeWidth="2.5"
                />

                {/* 45° Miter corner construction lines */}
                <line x1="0" y1="0" x2={fW} y2={fW} stroke="#1C1917" strokeWidth="1.5" strokeDasharray="3 2" />
                <line x1={vbW} y1="0" x2={vbW - fW} y2={fW} stroke="#1C1917" strokeWidth="1.5" strokeDasharray="3 2" />
                <line x1={vbW} y1={vbH} x2={vbW - fW} y2={vbH - fW} stroke="#1C1917" strokeWidth="1.5" strokeDasharray="3 2" />
                <line x1="0" y1={vbH} x2={fW} y2={vbH - fW} stroke="#1C1917" strokeWidth="1.5" strokeDasharray="3 2" />

                {/* Profile Tier Construction Subdivisions */}
                <rect x={outerStep} y={outerStep} width={vbW - 2 * outerStep} height={vbH - 2 * outerStep} fill="none" stroke="#C8933C" strokeWidth="0.75" strokeDasharray="2 2" />
                <rect x={friezeStep} y={friezeStep} width={vbW - 2 * friezeStep} height={vbH - 2 * friezeStep} fill="none" stroke="#C8933C" strokeWidth="0.75" strokeDasharray="2 2" />

                {/* Frame inner sightline boundary */}
                <rect
                  x={fW}
                  y={fW}
                  width={vbW - 2 * fW}
                  height={vbH - 2 * fW}
                  fill="#F4EFEA"
                  stroke="#C8933C"
                  strokeWidth="1.5"
                />

                {/* Mat Border Layer */}
                {mW > 0 && (
                  <rect
                    x={artX}
                    y={artY}
                    width={artW}
                    height={artH}
                    fill="#FAF8F5"
                    stroke="#78716C"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                )}

                {/* Artwork window */}
                <image
                  href={activeArtUrl}
                  x={artX}
                  y={artY}
                  width={artW}
                  height={artH}
                  preserveAspectRatio={artworkFit === 'fit' ? 'xMidYMid meet' : 'xMidYMid slice'}
                  opacity="0.85"
                />

                {/* Center crosshair for precision registration */}
                <line x1={vbW / 2 - 15} y1={vbH / 2} x2={vbW / 2 + 15} y2={vbH / 2} stroke="#C8933C" strokeWidth="1" />
                <line x1={vbW / 2} y1={vbH / 2 - 15} x2={vbW / 2} y2={vbH / 2 + 15} stroke="#C8933C" strokeWidth="1" />
                <circle cx={vbW / 2} cy={vbH / 2} r="6" fill="none" stroke="#C8933C" strokeWidth="1" />
              </g>
            ) : (
              /* ================================================================= */
              /* MODE 2 & 3: REALISTIC RENDER & CAD EXPLODED                      */
              /* ================================================================= */
              <g>
                {/* 1. Archival Matboard Plane */}
                {mW > 0 && (
                  <g className={activeMode === 'exploded' ? 'transition-transform duration-500 origin-center scale-95' : ''}>
                    {/* Full Matboard Base */}
                    <rect
                      x={fW}
                      y={fW}
                      width={vbW - 2 * fW}
                      height={vbH - 2 * fW}
                      fill={mat.colorHex === 'transparent' ? '#F7F5EF' : mat.colorHex}
                    />

                    {/* Subtle Mat Paper Fiber Texture */}
                    <rect
                      x={fW}
                      y={fW}
                      width={vbW - 2 * fW}
                      height={vbH - 2 * fW}
                      fill="rgba(0,0,0,0.015)"
                    />
                  </g>
                )}

                {/* 2. Artwork Canvas with 45° Bevel Cut Frame */}
                <g className={activeMode === 'exploded' ? 'transition-transform duration-500 origin-center scale-90' : ''}>
                  {/* Artwork Image */}
                  <image
                    href={activeArtUrl}
                    x={artX}
                    y={artY}
                    width={artW}
                    height={artH}
                    preserveAspectRatio={artworkFit === 'fit' ? 'xMidYMid meet' : 'xMidYMid slice'}
                  />

                  {/* 45° Archival Mat Bevel Core Cut (Museum 8-Ply Aperture) */}
                  {mW > 0 && (
                    <g>
                      {/* Top & Left Bevel Highlight */}
                      <polyline
                        points={`${artX + artW},${artY} ${artX},${artY} ${artX},${artY + artH}`}
                        fill="none"
                        stroke={mat.coreHex || '#FAF8F5'}
                        strokeWidth="2.5"
                      />
                      {/* Bottom & Right Bevel Shadow */}
                      <polyline
                        points={`${artX},${artY + artH} ${artX + artW},${artY + artH} ${artX + artW},${artY}`}
                        fill="none"
                        stroke="rgba(0,0,0,0.28)"
                        strokeWidth="2.5"
                      />

                      {/* Soft Inner Shadow from Mat onto Art */}
                      <rect
                        x={artX}
                        y={artY}
                        width={artW}
                        height={artH}
                        fill="none"
                        stroke="rgba(0,0,0,0.30)"
                        strokeWidth="3.5"
                        style={{ filter: 'blur(2px)' }}
                      />
                    </g>
                  )}
                </g>

                {/* 3. The 4 Symmetrical Mitered Frame Bars driven uniformly by shared geometry */}
                {(['top', 'bottom', 'left', 'right'] as FrameSide[]).map((side) => {
                  const rail = rails[side];
                  const clipId =
                    side === 'top'
                      ? clipTopId
                      : side === 'bottom'
                        ? clipBottomId
                        : side === 'left'
                          ? clipLeftId
                          : clipRightId;
                  const patKey = side === 'bottom' ? 'bot' : side;
                  return (
                    <g
                      key={side}
                      data-frame-rail={side}
                      clipPath={`url(#${clipId})`}
                      transform={
                        activeMode === 'exploded'
                          ? `translate(${rail.explodedOffset.x}, ${rail.explodedOffset.y})`
                          : undefined
                      }
                      className="transition-transform duration-500"
                    >
                      <polygon points={rail.polygonString} fill="#1C1815" />
                      <polygon points={rail.polygonString} fill={`url(#moulding-pat-${patKey}-${cleanId})`} />
                      <polygon
                        points={rail.polygonString}
                        fill={`url(#grad-${side}-frieze-${cleanId})`}
                        opacity="0.12"
                        style={{ mixBlendMode: 'multiply' }}
                      />
                      <polygon
                        points={rail.outerChamferPointsString}
                        fill={`url(#grad-${side}-outer-${cleanId})`}
                        opacity="0.16"
                      />
                      {profile.hasBeadedFillet && (
                        <line
                          x1={rail.filletLine.x1}
                          y1={rail.filletLine.y1}
                          x2={rail.filletLine.x2}
                          y2={rail.filletLine.y2}
                          stroke={profile.highlightColor}
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          opacity="0.7"
                        />
                      )}
                    </g>
                  );
                })}

                {/* 4. Authentic 45° Miter Corner Hairline Seams */}
                {activeMode !== 'exploded' && (
                  <g>
                    {(['top', 'bottom', 'left', 'right'] as FrameSide[]).map((side) => {
                      const { x1, y1, x2, y2 } = rails[side].miterLine;
                      return (
                        <line
                          key={`miter-${side}`}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="rgba(0,0,0,0.42)"
                          strokeWidth="0.75"
                        />
                      );
                    })}

                    {/* Inner Rabbet Drop Shadow onto Mat/Art */}
                    <rect
                      x={fW}
                      y={fW}
                      width={vbW - 2 * fW}
                      height={vbH - 2 * fW}
                      fill="none"
                      stroke="rgba(0,0,0,0.45)"
                      strokeWidth="5"
                      style={{ filter: 'blur(3px)' }}
                    />
                  </g>
                )}

                {/* 5. Museum Glass Glare Reflection */}
                {showGlassGlare && (
                  <rect
                    x={artX}
                    y={artY}
                    width={artW}
                    height={artH}
                    fill="url(#glass-glare-linear)"
                    style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}
                  />
                )}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Bottom Technical Spec Badges (Stitch Screen 2 Reference) */}
      {!compactStage && (
        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E8E1D8] shrink-0">
          <div className="flex items-center gap-2.5 p-2.5 bg-[#F4EFEA] rounded-xl border border-[#E8E1D8]/60">
            <ShieldCheck className="w-4 h-4 text-[#C8933C] flex-shrink-0" />
            <div className="text-left">
              <span className="text-[11px] font-bold text-[#1C1917] block">100% Cotton Rag Acid-Free</span>
              <span className="text-[10px] text-[#78716C] block">Archival barrier against acid migration</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 bg-[#F4EFEA] rounded-xl border border-[#E8E1D8]/60">
            <Ruler className="w-4 h-4 text-[#C8933C] flex-shrink-0" />
            <div className="text-left">
              <span className="text-[11px] font-bold text-[#1C1917] block">1/32" Precision Miter Cut</span>
              <span className="text-[10px] text-[#78716C] block">Guillotine-pneumatic 45° corner alignment</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 bg-[#F4EFEA] rounded-xl border border-[#E8E1D8]/60">
            <Layers className="w-4 h-4 text-[#C8933C] flex-shrink-0" />
            <div className="text-left">
              <span className="text-[11px] font-bold text-[#1C1917] block">{frame.material}</span>
              <span className="text-[10px] text-[#78716C] block">{frame.finish}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
