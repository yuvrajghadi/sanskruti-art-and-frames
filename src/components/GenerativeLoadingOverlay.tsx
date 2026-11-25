import React, { useEffect, useState } from 'react';
import { FrameSample, DimensionUnit } from '../types';
import { Sparkles, Cpu, Scan, CheckCircle2 } from 'lucide-react';

interface GenerativeLoadingOverlayProps {
  frame: FrameSample;
  width: number;
  height: number;
  unit: DimensionUnit;
  onComplete?: () => void;
}

const GENERATION_STEPS = [
  "Acquiring high-resolution molding profile...",
  "Analyzing corner carving relief and miter angle (45.00°)...",
  "Synthesizing 4-sided structural frame perimeter...",
  "Reconstructing gold leaf patina & continuous grain texture...",
  "Raytracing specular highlights and glass reflection...",
  "Finalizing photorealistic architectural render..."
];

export const GenerativeLoadingOverlay: React.FC<GenerativeLoadingOverlayProps> = ({
  frame,
  width,
  height,
  unit,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    // Progress increment timer
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return 98;
        const jump = Math.floor(Math.random() * 8) + 4;
        return Math.min(98, prev + jump);
      });
    }, 180);

    // Step text timer
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 450);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center p-6 bg-[#1d1d03]/95 text-[#fefccf] rounded-sm overflow-hidden shadow-2xl backdrop-blur-md border border-[#d0c5af]/30">
      {/* Background ambient gold/warm glow */}
      <div 
        className="absolute w-[450px] h-[450px] rounded-full blur-[100px] pointer-events-none opacity-25 animate-pulse"
        style={{ backgroundColor: frame.colorHex }}
      />

      {/* Cyber/Architectural Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#d4af3715_1px,transparent_1px),linear-gradient(to_bottom,#d4af3715_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 pointer-events-none" />

      {/* Centerpiece: Corner Sample with Scanning Line Animation */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        {/* Corner Sample Container */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-sm overflow-hidden border border-[#d4af37]/60 shadow-[0_0_50px_rgba(212,175,55,0.25)] bg-[#1d1d03] group">
          {/* Corner Sample Image */}
          <img
            src={frame.thumbnailUrl}
            alt={frame.name}
            className="w-full h-full object-cover filter brightness-90 contrast-110"
          />

          {/* Holographic HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 bg-gradient-to-t from-[#1d1d03]/80 via-transparent to-[#1d1d03]/60">
            {/* Top HUD Markers */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#ffe088] tracking-wider font-semibold">
              <span className="flex items-center gap-1">
                <Scan className="w-3 h-3 text-[#ffe088] animate-spin" />
                <span>PROFILE SCAN</span>
              </span>
              <span>MITER: 45.00°</span>
            </div>

            {/* Corner Alignment Reticle */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#d4af37]" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#d4af37]" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#d4af37]" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#d4af37]" />

            {/* Bottom HUD Specs */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#fefccf]">
              <span>{frame.id}</span>
              <span className="text-[#ffe088] font-bold">{width} × {height} {unit}</span>
            </div>
          </div>

          {/* Polished Laser Scanning Line Animation */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#ffe088] to-transparent shadow-[0_0_15px_#d4af37,0_0_25px_#ffe088] animate-laser pointer-events-none" />

          {/* Sweeping scan glow shadow underneath */}
          <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-[#d4af37]/25 to-transparent animate-laser pointer-events-none -translate-y-full" />
        </div>

        {/* Generative AI Status Badge */}
        <div className="mt-6 flex items-center gap-2 px-3.5 py-1.5 rounded-sm bg-[#2c160b]/90 border border-[#d4af37]/40 shadow-inner">
          <Cpu className="w-4 h-4 text-[#ffe088] animate-pulse" />
          <span className="text-xs font-medium text-[#fefccf] tracking-wide font-sans">
            Generative Frame Synthesis Engine
          </span>
          <span className="text-[11px] font-mono text-[#ffe088] font-bold ml-1">
            {progress}%
          </span>
        </div>

        {/* Live Step Ticker */}
        <div className="mt-3 text-center min-h-[44px] flex flex-col items-center justify-center">
          <p className="text-sm font-serif font-medium text-[#ffe088] tracking-wide animate-pulse">
            {GENERATION_STEPS[currentStepIndex]}
          </p>
          <p className="text-xs text-[#d0c5af] mt-1 font-sans">
            Synthesizing {frame.name} to {width} × {height} {unit}
          </p>
        </div>

        {/* Progress Bar with Shimmer */}
        <div className="w-full mt-4 bg-[#2c160b] rounded-full h-2 overflow-hidden border border-[#d4af37]/40 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-[#735c00] via-[#d4af37] to-[#ffe088] rounded-full transition-all duration-200 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/30 animate-[shimmer_1.5s_infinite] -skew-x-12" />
          </div>
        </div>

        {/* Step Micro-Indicators */}
        <div className="flex items-center justify-center gap-3 mt-4 text-[11px] text-[#d0c5af]">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Corner Profile
          </span>
          <span className="text-stone-600">→</span>
          <span className={`flex items-center gap-1 ${progress > 40 ? 'text-emerald-400' : 'text-stone-500'}`}>
            <CheckCircle2 className="w-3 h-3" /> Mitering
          </span>
          <span className="text-stone-600">→</span>
          <span className={`flex items-center gap-1 ${progress > 75 ? 'text-emerald-400' : 'text-stone-500'}`}>
            <Sparkles className="w-3 h-3 text-[#ffe088]" /> Photoreal Render
          </span>
        </div>
      </div>
    </div>
  );
};

