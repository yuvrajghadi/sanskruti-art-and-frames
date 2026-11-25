import React, { useRef, useState, useEffect } from 'react';
import { FrameSample, MatOption, ArtworkOption, DimensionUnit } from '../types';
import { getFrameMaterialProfile } from '../utils/frameRendering';
import { reconstructMouldingTextures, getCachedMouldingDataUrl } from '../utils/mouldingReconstruction';
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeMode = canvasSubMode || 'render';

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

  // Normalize dimensions to calculate proportional border thickness
  const wInches = unit === 'cm' ? width / 2.54 : width;
  const hInches = unit === 'cm' ? height / 2.54 : height;

  const matWInches = mat.id === 'mat-none' ? 0 : mat.borderWidth;
  const frameWInches = frame.profileWidth;

  const totalWidthInches = wInches + (frameWInches + matWInches) * 2;
  const totalHeightInches = hInches + (frameWInches + matWInches) * 2;

  // Outer dimension strings
  const outerWidthMm = (totalWidthInches * 25.4).toFixed(1);
  const outerHeightMm = (totalHeightInches * 25.4).toFixed(1);
  const outerWidthIn = totalWidthInches.toFixed(2);
  const outerHeightIn = totalHeightInches.toFixed(2);

  // Viewbox coordinates (normalized to 750px standard architectural viewport)
  const maxDim = Math.max(totalWidthInches, totalHeightInches);
  const scale = 750 / maxDim;

  const vbW = totalWidthInches * scale;
  const vbH = totalHeightInches * scale;
  const fW = frameWInches * scale;
  const mW = matWInches * scale;

  const artX = fW + mW;
  const artY = fW + mW;
  const artW = vbW - 2 * (fW + mW);
  const artH = vbH - 2 * (fW + mW);

  const activeArtUrl = customArtUrl || artwork.imageUrl;
  const activeTextureUrl = rectifiedTextureUrl || frame.cornerDetailUrl || frame.thumbnailUrl || '/mouldings/moulding-1.jpg';

  // Unique SVG element IDs namespaced by frame ID
  const cleanId = frame.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const clipTopId = `clip-top-${cleanId}`;
  const clipBottomId = `clip-bottom-${cleanId}`;
  const clipLeftId = `clip-left-${cleanId}`;
  const clipRightId = `clip-right-${cleanId}`;

  // Stepped profile tier offsets
  const outerStep = fW * 0.16;
  const friezeStep = fW * 0.80;

  return (
    <div 
      ref={containerRef}
      className="relative flex flex-col items-center justify-between w-full h-full p-4 sm:p-6 select-none transition-colors duration-500 overflow-hidden"
      style={{ backgroundColor: activeMode === 'blueprint' ? '#FAF8F5' : wallColorHex }}
    >
      {/* Top Header: Frame Info & Outer Dimensions */}
      <div className="w-full max-w-4xl flex items-center justify-between pb-3 border-b border-[#E8E1D8]/60 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl mb-2 shadow-xs">
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

      {/* Main Visualizer Viewport */}
      <div className="flex-1 w-full flex items-center justify-center my-4 relative">
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
          className={`relative transition-all duration-500 ease-out z-10 ${
            activeMode === 'exploded' ? 'scale-90' : ''
          }`}
          style={{
            width: '100%',
            maxWidth: '640px',
            maxHeight: '530px',
            aspectRatio: `${totalWidthInches} / ${totalHeightInches}`,
            filter: activeMode === 'blueprint' 
              ? 'drop-shadow(0 15px 25px rgba(28,25,23,0.12))' 
              : 'drop-shadow(0 25px 35px rgba(0,0,0,0.35)) drop-shadow(0 10px 15px rgba(0,0,0,0.2))'
          }}
        >
          <svg
            viewBox={`0 0 ${vbW} ${vbH}`}
            className="w-full h-full overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* 0. Seamless Photometric Repeat Patterns */}
              <pattern
                id={`moulding-pat-top-${cleanId}`}
                patternUnits="userSpaceOnUse"
                width={fW * 3.5}
                height={fW}
                x="0"
                y="0"
              >
                <image
                  href={activeTextureUrl}
                  x="0"
                  y="0"
                  width={fW * 3.5}
                  height={fW}
                  preserveAspectRatio="none"
                />
              </pattern>

              <pattern
                id={`moulding-pat-bot-${cleanId}`}
                patternUnits="userSpaceOnUse"
                width={fW * 3.5}
                height={fW}
                x="0"
                y={vbH - fW}
              >
                <image
                  href={activeTextureUrl}
                  x="0"
                  y="0"
                  width={fW * 3.5}
                  height={fW}
                  preserveAspectRatio="none"
                  transform={`translate(0, ${fW}) scale(1, -1)`}
                />
              </pattern>

              <pattern
                id={`moulding-pat-left-${cleanId}`}
                patternUnits="userSpaceOnUse"
                width={fW}
                height={fW * 3.5}
                x="0"
                y="0"
              >
                <image
                  href={activeTextureUrl}
                  x="0"
                  y="0"
                  width={fW * 3.5}
                  height={fW}
                  preserveAspectRatio="none"
                  transform={`rotate(90) translate(0, -${fW})`}
                />
              </pattern>

              <pattern
                id={`moulding-pat-right-${cleanId}`}
                patternUnits="userSpaceOnUse"
                width={fW}
                height={fW * 3.5}
                x={vbW - fW}
                y="0"
              >
                <image
                  href={activeTextureUrl}
                  x="0"
                  y="0"
                  width={fW * 3.5}
                  height={fW}
                  preserveAspectRatio="none"
                  transform={`rotate(270) translate(-${fW * 3.5}, 0)`}
                />
              </pattern>

              {/* 1. Miter Trapezoid Clip Paths */}
              <clipPath id={clipTopId}>
                <polygon points={`0,0 ${vbW},0 ${vbW - fW},${fW} ${fW},${fW}`} />
              </clipPath>
              <clipPath id={clipBottomId}>
                <polygon points={`0,${vbH} ${vbW},${vbH} ${vbW - fW},${vbH - fW} ${fW},${vbH - fW}`} />
              </clipPath>
              <clipPath id={clipLeftId}>
                <polygon points={`0,0 ${fW},${fW} ${fW},${vbH - fW} 0,${vbH}`} />
              </clipPath>
              <clipPath id={clipRightId}>
                <polygon points={`${vbW},0 ${vbW},${vbH} ${vbW - fW},${vbH - fW} ${vbW - fW},${fW}`} />
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

              {/* 5. Directional Multi-Tier Architectural Lighting Gradients */}
              {/* Top Bar (Key light from top-left: bright upper chamfer, softly modeled cove, darker rabbet) */}
              <linearGradient id={`grad-top-outer-${cleanId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={profile.highlightColor} stopOpacity="0.95" />
                <stop offset="60%" stopColor={profile.baseColor} />
                <stop offset="100%" stopColor={profile.shadowColor} />
              </linearGradient>
              <linearGradient id={`grad-top-frieze-${cleanId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={profile.shadowColor} stopOpacity="0.6" />
                <stop offset="25%" stopColor={profile.baseColor} />
                <stop offset="65%" stopColor={profile.highlightColor} stopOpacity="0.85" />
                <stop offset="100%" stopColor={profile.shadowColor} />
              </linearGradient>

              {/* Bottom Bar (Indirect ambient bounce: richer shadow tones, gold reflection) */}
              <linearGradient id={`grad-bot-frieze-${cleanId}`} x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor={profile.shadowColor} />
                <stop offset="35%" stopColor={profile.baseColor} />
                <stop offset="70%" stopColor={profile.patinaColor} />
                <stop offset="100%" stopColor={profile.baseColor} />
              </linearGradient>

              {/* Left Bar (Direct side key light) */}
              <linearGradient id={`grad-left-frieze-${cleanId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={profile.highlightColor} stopOpacity="0.9" />
                <stop offset="40%" stopColor={profile.baseColor} />
                <stop offset="85%" stopColor={profile.shadowColor} />
                <stop offset="100%" stopColor={profile.baseColor} />
              </linearGradient>

              {/* Right Bar (Cast side shadow) */}
              <linearGradient id={`grad-right-frieze-${cleanId}`} x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor={profile.shadowColor} />
                <stop offset="50%" stopColor={profile.baseColor} />
                <stop offset="90%" stopColor={profile.patinaColor} />
                <stop offset="100%" stopColor={profile.baseColor} />
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

                {/* 3. The 4 Mitered Frame Bars (Top, Bottom, Left, Right) */}
                {/* --- BAR 1: TOP BAR --- */}
                <g 
                  clipPath={`url(#${clipTopId})`}
                  transform={activeMode === 'exploded' ? 'translate(0, -24)' : undefined}
                  className="transition-transform duration-500"
                >
                  {/* Substrate Base */}
                  <polygon
                    points={`0,0 ${vbW},0 ${vbW - fW},${fW} ${fW},${fW}`}
                    fill="#1C1815"
                  />

                  {/* Photometric Molding Pattern */}
                  <polygon
                    points={`0,0 ${vbW},0 ${vbW - fW},${fW} ${fW},${fW}`}
                    fill={`url(#moulding-pat-top-${cleanId})`}
                  />

                  {/* Directional Key Light Overlay */}
                  <polygon
                    points={`0,0 ${vbW},0 ${vbW - fW},${fW} ${fW},${fW}`}
                    fill={`url(#grad-top-frieze-${cleanId})`}
                    opacity="0.14"
                    style={{ mixBlendMode: 'multiply' }}
                  />

                  {/* Outer Chamfer Lip Highlight */}
                  <polygon
                    points={`0,0 ${vbW},0 ${vbW - outerStep},${outerStep} ${outerStep},${outerStep}`}
                    fill={`url(#grad-top-outer-${cleanId})`}
                    opacity="0.25"
                  />

                  {/* Inner Sightline Beaded Fillet (for Baroque Gold / Acanthus) */}
                  {profile.hasBeadedFillet && (
                    <line
                      x1={fW * 0.9}
                      y1={fW * 0.9}
                      x2={vbW - fW * 0.9}
                      y2={fW * 0.9}
                      stroke={profile.highlightColor}
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                  )}
                </g>

                {/* --- BAR 2: BOTTOM BAR --- */}
                <g 
                  clipPath={`url(#${clipBottomId})`}
                  transform={activeMode === 'exploded' ? 'translate(0, 24)' : undefined}
                  className="transition-transform duration-500"
                >
                  <polygon
                    points={`0,${vbH} ${vbW},${vbH} ${vbW - fW},${vbH - fW} ${fW},${vbH - fW}`}
                    fill="#1C1815"
                  />

                  <polygon
                    points={`0,${vbH} ${vbW},${vbH} ${vbW - fW},${vbH - fW} ${fW},${vbH - fW}`}
                    fill={`url(#moulding-pat-bot-${cleanId})`}
                  />

                  <polygon
                    points={`0,${vbH} ${vbW},${vbH} ${vbW - fW},${vbH - fW} ${fW},${vbH - fW}`}
                    fill={`url(#grad-bot-frieze-${cleanId})`}
                    opacity="0.14"
                    style={{ mixBlendMode: 'multiply' }}
                  />

                  {profile.hasBeadedFillet && (
                    <line
                      x1={fW * 0.9}
                      y1={vbH - fW * 0.9}
                      x2={vbW - fW * 0.9}
                      y2={vbH - fW * 0.9}
                      stroke={profile.highlightColor}
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                  )}
                </g>

                {/* --- BAR 3: LEFT BAR --- */}
                <g 
                  clipPath={`url(#${clipLeftId})`}
                  transform={activeMode === 'exploded' ? 'translate(-24, 0)' : undefined}
                  className="transition-transform duration-500"
                >
                  <polygon
                    points={`0,0 ${fW},${fW} ${fW},${vbH - fW} 0,${vbH}`}
                    fill="#1C1815"
                  />

                  <polygon
                    points={`0,0 ${fW},${fW} ${fW},${vbH - fW} 0,${vbH}`}
                    fill={`url(#moulding-pat-left-${cleanId})`}
                  />

                  <polygon
                    points={`0,0 ${fW},${fW} ${fW},${vbH - fW} 0,${vbH}`}
                    fill={`url(#grad-left-frieze-${cleanId})`}
                    opacity="0.14"
                    style={{ mixBlendMode: 'multiply' }}
                  />

                  {profile.hasBeadedFillet && (
                    <line
                      x1={fW * 0.9}
                      y1={fW * 0.9}
                      x2={fW * 0.9}
                      y2={vbH - fW * 0.9}
                      stroke={profile.highlightColor}
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                  )}
                </g>

                {/* --- BAR 4: RIGHT BAR --- */}
                <g 
                  clipPath={`url(#${clipRightId})`}
                  transform={activeMode === 'exploded' ? 'translate(24, 0)' : undefined}
                  className="transition-transform duration-500"
                >
                  <polygon
                    points={`${vbW},0 ${vbW},${vbH} ${vbW - fW},${vbH - fW} ${vbW - fW},${fW}`}
                    fill="#1C1815"
                  />

                  <polygon
                    points={`${vbW},0 ${vbW},${vbH} ${vbW - fW},${vbH - fW} ${vbW - fW},${fW}`}
                    fill={`url(#moulding-pat-right-${cleanId})`}
                  />

                  <polygon
                    points={`${vbW},0 ${vbW},${vbH} ${vbW - fW},${vbH - fW} ${vbW - fW},${fW}`}
                    fill={`url(#grad-right-frieze-${cleanId})`}
                    opacity="0.14"
                    style={{ mixBlendMode: 'multiply' }}
                  />

                  {profile.hasBeadedFillet && (
                    <line
                      x1={vbW - fW * 0.9}
                      y1={fW * 0.9}
                      x2={vbW - fW * 0.9}
                      y2={vbH - fW * 0.9}
                      stroke={profile.highlightColor}
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                  )}
                </g>

                {/* 4. Authentic 45° Miter Corner Hairline Seams */}
                {activeMode !== 'exploded' && (
                  <g>
                    {/* Top-Left Corner 45° Joint */}
                    <line x1="0" y1="0" x2={fW} y2={fW} stroke="rgba(0,0,0,0.50)" strokeWidth="0.8" />
                    <line x1="0.6" y1="0" x2={fW + 0.6} y2={fW} stroke="rgba(255,255,255,0.40)" strokeWidth="0.5" />

                    {/* Top-Right Corner 45° Joint */}
                    <line x1={vbW} y1="0" x2={vbW - fW} y2={fW} stroke="rgba(0,0,0,0.50)" strokeWidth="0.8" />
                    <line x1={vbW - 0.6} y1="0" x2={vbW - fW - 0.6} y2={fW} stroke="rgba(255,255,255,0.40)" strokeWidth="0.5" />

                    {/* Bottom-Right Corner 45° Joint */}
                    <line x1={vbW} y1={vbH} x2={vbW - fW} y2={vbH - fW} stroke="rgba(0,0,0,0.50)" strokeWidth="0.8" />
                    <line x1={vbW - 0.6} y1={vbH} x2={vbW - fW - 0.6} y2={vbH - fW} stroke="rgba(255,255,255,0.40)" strokeWidth="0.5" />

                    {/* Bottom-Left Corner 45° Joint */}
                    <line x1="0" y1={vbH} x2={fW} y2={vbH - fW} stroke="rgba(0,0,0,0.50)" strokeWidth="0.8" />
                    <line x1="0.6" y1={vbH} x2={fW + 0.6} y2={vbH - fW} stroke="rgba(255,255,255,0.40)" strokeWidth="0.5" />

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
      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E8E1D8]">
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
    </div>
  );
};
