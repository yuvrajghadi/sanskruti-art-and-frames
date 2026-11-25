import React, { useEffect } from 'react';
import { FrameSample } from '../types';
import { X, Check, ShieldCheck, Sparkles, Ruler, ArrowRight, MessageCircle } from 'lucide-react';
import { getMouldingFootRateINR } from '../utils/pricing';
import { getIndianWhatsAppUrl } from '../utils/whatsapp';

interface FrameDetailModalProps {
  frame: FrameSample | null;
  isSelected: boolean;
  onSelect: (frame: FrameSample) => void;
  onClose: () => void;
}

export const FrameDetailModal: React.FC<FrameDetailModalProps> = ({
  frame,
  isSelected,
  onSelect,
  onClose,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!frame) return null;

  const inrRate = getMouldingFootRateINR(frame);
  const rabbetDepth = (frame.depth * 0.55).toFixed(2);
  const photo = frame.cornerDetailUrl || frame.thumbnailUrl;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-light-surface-container-lowest rounded-sm shadow-2xl border border-light-outline-variant/60 overflow-hidden flex flex-col md:flex-row max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-light-on-surface-variant hover:text-light-primary bg-light-surface-container-lowest/90 hover:bg-light-surface border border-light-outline-variant/60 hover:border-accent rounded-sm transition-colors shadow-xs"
          title="Close specification view"
        >
          <X className="w-4 h-4" />
        </button>

        {/* High-Resolution Moulding Photography Stage */}
        <div className="md:w-1/2 relative bg-light-surface-container-low min-h-[280px] sm:min-h-[360px] md:min-h-[480px] overflow-hidden flex items-center justify-center border-b md:border-b-0 md:border-r border-light-outline-variant/60">
          <img
            src={photo}
            alt={`${frame.name} Picture Frame Moulding Profile`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25 pointer-events-none" />

          {/* Top Floating Badge Strip */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="bg-light-primary/90 backdrop-blur-xs text-light-on-primary text-xs font-mono px-3 py-1 rounded-xs border border-white/20">
              #{frame.id}
            </span>
            {frame.isWorkshopSample && (
              <span className="bg-accent text-light-on-primary text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-xs shadow-xs font-label">
                Workshop Original
              </span>
            )}
          </div>

          {/* Bottom Floating Material Callout */}
          <div className="absolute bottom-4 left-4 right-4 bg-light-surface-container-lowest/95 backdrop-blur-md text-light-on-surface text-xs p-3.5 rounded-sm shadow-xs flex items-center justify-between border border-light-outline-variant/60">
            <div className="flex items-center gap-2.5">
              <span 
                className="w-4 h-4 rounded-full border border-black/10 shadow-xs shrink-0" 
                style={{ backgroundColor: frame.colorHex }} 
              />
              <div>
                <span className="font-headline font-bold text-sm truncate max-w-[190px] block text-light-primary">
                  {frame.finish}
                </span>
                <span className="text-[10px] text-light-secondary font-mono block">
                  {frame.textureDetails.filigreeStyle}
                </span>
              </div>
            </div>
            <span className="font-mono text-[11px] text-light-secondary font-bold bg-light-surface-container-low px-2.5 py-1 rounded-xs border border-light-outline-variant/60">
              45° Mitre
            </span>
          </div>
        </div>

        {/* Technical Architectural Dossier */}
        <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-light-surface-container-lowest">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-light-secondary text-xs font-bold uppercase tracking-widest mb-1 font-label">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>{frame.style} Profile</span>
              </div>

              <h2 className="font-headline text-2xl sm:text-3xl font-bold text-light-primary tracking-tight leading-snug">
                {frame.name}
              </h2>

              <p className="font-body text-xs sm:text-sm text-light-on-surface-variant mt-2 leading-relaxed">
                {frame.description}
              </p>
            </div>

            {/* Spec Details Table */}
            <div className="pt-2 border-t border-light-outline-variant/60 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-light-outline-variant/40">
                <span className="text-light-on-surface-variant flex items-center gap-1.5 font-label uppercase tracking-wider text-[11px]">
                  <Ruler className="w-3.5 h-3.5 text-accent" />
                  Profile Face Width
                </span>
                <span className="font-mono font-bold text-light-primary">
                  {frame.profileWidth.toFixed(2)}" ({Math.round(frame.profileWidth * 25.4)} mm)
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-light-outline-variant/40">
                <span className="text-light-on-surface-variant font-label uppercase tracking-wider text-[11px]">Total Depth</span>
                <span className="font-mono font-bold text-light-primary">
                  {frame.depth.toFixed(2)}" ({Math.round(frame.depth * 25.4)} mm)
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-light-outline-variant/40">
                <span className="text-light-on-surface-variant font-label uppercase tracking-wider text-[11px]">Rabbet Depth</span>
                <span className="font-mono font-bold text-light-primary">{rabbetDepth}"</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-light-outline-variant/40">
                <span className="text-light-on-surface-variant font-label uppercase tracking-wider text-[11px]">Core Material</span>
                <span className="font-body font-semibold text-light-primary text-right">{frame.material}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-light-outline-variant/40">
                <span className="text-light-on-surface-variant font-label uppercase tracking-wider text-[11px]">Carving Pattern</span>
                <span className="font-headline italic text-sm text-light-primary">{frame.textureDetails.filigreeStyle}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-light-outline-variant/40">
                <span className="text-light-on-surface-variant font-label uppercase tracking-wider text-[11px]">Joinery Readiness</span>
                <span className="font-mono text-light-secondary font-bold">Precision 45° Mitre-Ready</span>
              </div>

              <div className="flex items-center justify-between py-2.5 bg-light-surface-container-low px-3 rounded-sm border border-light-outline-variant/60">
                <div>
                  <span className="font-label uppercase tracking-wider text-[11px] text-light-secondary block">Direct Factory Tariff</span>
                  <span className="font-mono text-[10px] text-light-outline block">+18% GST (HSN 4414)</span>
                </div>
                <div className="text-right">
                  <span className="font-headline font-bold text-light-primary text-2xl">
                    ₹{inrRate}
                  </span>
                  <span className="font-mono text-xs text-light-secondary ml-1">/ linear ft</span>
                </div>
              </div>
            </div>

            {/* Quality Guarantee badge */}
            <div className="p-3 rounded-sm bg-light-surface-container-low border border-light-outline-variant/60 flex items-center gap-2.5 text-xs text-light-on-surface-variant">
              <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0" />
              <span>Includes zero-tearout pneumatic miter cuts, internal spline reinforcements, and full Pan-India transit insurance.</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-6 pt-4 border-t border-light-outline-variant/60 flex flex-col sm:flex-row items-center gap-3">
            <a
              href={getIndianWhatsAppUrl(`Namaste Sanskruti Arts, I am inquiring about moulding profile #${frame.id} (${frame.name}). Profile face width: ${frame.profileWidth}", Finish: ${frame.finish}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-3 rounded-sm bg-[#25D366] hover:bg-[#20ba59] text-white font-label text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Inquiry</span>
            </a>

            <button
              type="button"
              onClick={() => {
                onSelect(frame);
                onClose();
              }}
              className={`flex-1 w-full py-3 px-4 rounded-sm font-label text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${
                isSelected
                  ? 'bg-accent text-light-on-primary'
                  : 'bg-light-primary hover:bg-forest-deep text-light-on-primary shadow-xs'
              }`}
            >
              {isSelected ? (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Currently Selected</span>
                </>
              ) : (
                <>
                  <span>Select Profile &amp; Customize</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
