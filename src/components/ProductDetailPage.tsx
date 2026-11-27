import React, { useState, useEffect } from 'react';
import { FrameSample } from '../types';
import { getMouldingFootRateINR } from '../utils/pricing';
import { getWhatsAppNumber } from '../utils/whatsapp';
import { saveLead } from '../utils/leadStorage';
import { getCompanionProfiles } from '../utils/productMapping';
import { 
  ArrowRight, 
  Sparkles, 
  Ruler, 
  MessageCircle, 
  Camera, 
  Check,
  X,
  Layers
} from 'lucide-react';

interface ProductDetailPageProps {
  frame: FrameSample | null;
  requestedSku?: string;
  allFrames: FrameSample[];
  onCustomize: (frame: FrameSample) => void;
  onNavigateCatalog: () => void;
  onNavigateHome?: () => void;
  onSelectFrame: (frame: FrameSample) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  frame,
  requestedSku,
  allFrames,
  onCustomize,
  onNavigateCatalog,
  onNavigateHome,
  onSelectFrame,
}) => {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [isSampleKitModalOpen, setIsSampleKitModalOpen] = useState(false);
  const [kitForm, setKitForm] = useState({ name: '', organization: '', city: '', phone: '' });

  // Reset gallery index when switching between profiles / companion mouldings
  useEffect(() => {
    setActiveGalleryIndex(0);
  }, [frame?.id]);

  useEffect(() => {
    if (!isSampleKitModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSampleKitModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSampleKitModalOpen]);

  // =========================================================================
  // DEDICATED PRODUCT NOT FOUND STATE (Zero Silent Fallbacks)
  // =========================================================================
  if (!frame) {
    return (
      <div className="min-h-[70vh] bg-light-surface text-light-on-surface font-body antialiased flex items-center justify-center py-16 px-gutter-lg">
        <div className="max-w-xl w-full mx-auto text-center space-y-6 p-8 sm:p-12 bg-light-surface-container-low border border-light-outline-variant/60 rounded-sm shadow-xs">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-light-surface-container border border-light-outline-variant text-light-secondary mx-auto">
            <Layers className="w-8 h-8 text-accent" />
          </div>
          
          <div className="space-y-2">
            <span className="font-mono text-mono-sm text-accent uppercase tracking-widest block font-bold">
              Archival Catalogue Notice
            </span>
            <h1 className="font-display text-display-lg-mobile sm:text-display-lg text-light-primary">
              Profile Not Found
            </h1>
            <p className="font-body text-body-md text-light-on-surface-variant max-w-md mx-auto leading-relaxed">
              {requestedSku 
                ? `The requested moulding profile #${requestedSku} could not be retrieved from the active atelier catalogue. It may have been archived or retired.`
                : `The requested moulding profile could not be located in the active archives.`}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNavigateCatalog}
              className="w-full sm:w-auto inline-flex items-center justify-center bg-light-primary hover:bg-forest-deep text-light-on-primary px-8 py-3.5 rounded-sm font-label text-label-md uppercase tracking-widest transition-colors shadow-xs gap-2 cursor-pointer"
            >
              <span>Explore All {allFrames.length} Moulding Collections</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href={`https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(
                `Namaste Sanskruti Arts! I am enquiring about an archival moulding profile (#${requestedSku || 'custom'}). Is this profile currently available in your workshop archives?`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center border border-light-outline-variant bg-light-surface hover:bg-light-surface-container text-light-on-surface px-6 py-3.5 rounded-sm font-label text-label-md uppercase tracking-widest transition-colors gap-2"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>Ask Atelier Concierge</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const inrRate = getMouldingFootRateINR(frame);
  const rabbetDepth = (frame.depth * 0.55).toFixed(2);
  const companionProfiles = getCompanionProfiles(frame, allFrames, 3);

  // Multi-angle gallery images: only include genuine, distinct images
  const primaryPhoto = frame.thumbnailUrl || frame.cornerDetailUrl;
  const secondaryPhoto = (frame.cornerDetailUrl && frame.cornerDetailUrl !== frame.thumbnailUrl) ? frame.cornerDetailUrl : null;

  const galleryImages: { label: string; src: string; caption: string }[] = [];
  if (primaryPhoto) {
    galleryImages.push({
      label: frame.isWorkshopSample ? 'Workshop Specimen' : 'Moulding Profile',
      src: primaryPhoto,
      caption: `${frame.name} • Physical Workshop Sample`,
    });
  }
  if (secondaryPhoto) {
    galleryImages.push({
      label: 'Corner Chevron',
      src: secondaryPhoto,
      caption: 'Precision Miter Corner Construction',
    });
  }

  const activeImage = galleryImages[activeGalleryIndex] || galleryImages[0] || {
    label: 'Profile',
    src: primaryPhoto,
    caption: frame.name
  };

  const handleKitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveLead({
      leadType: 'sample_kit',
      clientName: kitForm.name,
      mobile: kitForm.phone,
      cityOrPin: [kitForm.organization, kitForm.city].filter(Boolean).join(' · '),
      skus: [frame.id],
      configurationUrl: typeof window !== 'undefined' ? window.location.href : `/product/${frame.id}`,
      estimatedTotalINR: inrRate,
      notes: `Architect Sample Kit requested from Product Detail (${frame.name})`,
    });
    const msg = `Namaste Sanskruti Arts! I would like to request an Architect's Trade Sample Kit for profile ${frame.name} (#${frame.id}):\n\n• Name: ${kitForm.name}\n• Studio/Firm: ${kitForm.organization || 'Independent'}\n• City: ${kitForm.city}\n• Contact: ${kitForm.phone}\n\nPlease share kit details and courier tracking information.`;
    window.open(`https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    setIsSampleKitModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-light-surface text-light-on-surface font-body antialiased">
      
      {/* ========================================================================= */}
      {/* 1. ARTIFACT SHOWCASE HERO (Asymmetric 12-Column Stage)                     */}
      {/* ========================================================================= */}
      <section className="bg-light-surface py-8 lg:py-14 border-b border-light-outline-variant/60">
        <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
          
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-gutter-sm mb-6 lg:mb-8 pb-3 border-b border-light-outline-variant/40 font-label text-label-sm uppercase tracking-widest text-light-on-surface-variant flex-wrap">
            {onNavigateHome && (
              <>
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="hover:text-light-primary transition-colors cursor-pointer py-1 min-h-[36px]"
                >
                  Home
                </button>
                <span className="text-light-outline" aria-hidden="true">/</span>
              </>
            )}
            <button
              type="button"
              onClick={onNavigateCatalog}
              className="hover:text-light-primary transition-colors cursor-pointer py-1 min-h-[36px]"
            >
              Collections
            </button>
            <span className="text-light-outline" aria-hidden="true">/</span>
            <span className="text-light-on-surface-variant">{frame.style}</span>
            <span className="text-light-outline" aria-hidden="true">/</span>
            <span className="font-mono text-mono-sm text-light-secondary font-bold">
              #{frame.id}
            </span>
          </nav>

          {/* Asymmetric 12-Column Artifact Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-gutter-xl items-start">
            
            {/* Left: Gallery Plinth Stage & Interactive Multi-Image Switcher (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              {/* Plinth Image Container */}
              <div className="relative bg-light-surface-container-low p-6 sm:p-10 lg:p-14 border border-light-outline-variant/60 rounded-sm flex items-center justify-center overflow-hidden min-h-[340px] sm:min-h-[440px] lg:min-h-[500px]">
                <img
                  src={activeImage.src}
                  alt={`${frame.name} — ${activeImage.label}`}
                  className="w-full max-h-[440px] object-contain transition-transform duration-surface-enter hover:scale-[1.02]"
                />

                {/* Floating Badges */}
                <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                  <span className="font-mono text-mono-sm bg-light-primary/90 backdrop-blur-xs text-light-on-primary px-3 py-1 rounded-xs border border-white/20">
                    #{frame.id}
                  </span>
                  {frame.isWorkshopSample ? (
                    <span className="bg-accent text-light-on-primary font-label text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-xs flex items-center gap-1 shadow-xs">
                      <Camera className="w-3 h-3" />
                      <span>Workshop Original</span>
                    </span>
                  ) : (
                    <span
                      data-testid="architectural-preview-badge"
                      className="bg-[#FAF8F5]/95 text-[#24382F] border border-[#C1C8C2] font-label text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-xs shadow-xs"
                    >
                      Architectural Finish Preview
                    </span>
                  )}
                </div>

                {/* Finish Swatch Pip */}
                <div className="absolute top-4 right-4 z-10">
                  <span
                    className="w-5 h-5 rounded-full border-2 border-white shadow-xs block"
                    style={{ backgroundColor: frame.colorHex }}
                    title={frame.finish}
                  />
                </div>
              </div>

              {/* Plinth Caption Bar */}
              <div className="flex items-center justify-between border-t border-light-outline-variant/50 pt-2 px-1 text-xs">
                <span className="font-label text-label-sm uppercase tracking-widest text-light-on-surface-variant flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span>{activeImage.caption}</span>
                </span>
                <span className="font-mono text-mono-sm text-light-secondary font-medium truncate max-w-[240px]">
                  {frame.finish}
                </span>
              </div>

              {/* Multi-Angle Gallery Thumbnails Strip (Rendered ONLY when multiple distinct images exist) */}
              {galleryImages.length > 1 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 max-w-md">
                  {galleryImages.map((img, idx) => {
                    const isActive = activeGalleryIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveGalleryIndex(idx)}
                        className={`relative p-2 bg-light-surface-container-low border rounded-sm transition-all text-left group overflow-hidden ${
                          isActive
                            ? 'border-accent ring-1 ring-accent bg-light-surface'
                            : 'border-light-outline-variant/60 hover:border-accent/80'
                        }`}
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden flex items-center justify-center mb-1.5">
                          <img
                            src={img.src}
                            alt={img.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-state-change"
                          />
                        </div>
                        <span className={`block font-label text-[10px] uppercase tracking-wider truncate ${
                          isActive ? 'text-light-primary font-bold' : 'text-light-on-surface-variant'
                        }`}>
                          {img.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Right: Technical Dossier, Pricing, Specs & CTAs (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6 lg:pl-4">
              
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-mono-sm text-light-secondary tabular-nums font-bold">
                    SKU: #{frame.id}
                  </span>
                  <span className="font-mono text-[11px] text-light-outline">
                    Precision 45° Mitre
                  </span>
                </div>

                <h1 className="font-display text-display-lg-mobile lg:text-display-lg text-light-primary leading-tight text-balance">
                  {frame.name}
                </h1>

                <p className="font-body text-body-lg text-light-on-surface-variant leading-relaxed text-pretty pt-1">
                  {frame.description}
                </p>
              </div>

              {/* Retail Tariff Box */}
              <div className="p-4 bg-light-surface-container-low border border-light-outline-variant/60 rounded-sm space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-headline text-3xl sm:text-4xl font-bold text-light-primary">
                      ₹{inrRate}
                    </span>
                    <span className="font-mono text-xs text-light-secondary">/ linear ft</span>
                  </div>
                  <span className="font-mono text-[11px] text-light-on-surface-variant font-semibold text-right">
                    Excl. Prov. 18% GST (HSN 4414 ref.) &amp; Delivery
                  </span>
                </div>

                {/* Stock & Availability Indicator (Verified: Atelier Crafted — Enquire for Availability) */}
                <div className="flex items-center justify-between pt-2 border-t border-light-outline-variant/40 text-xs">
                  <span className="flex items-center gap-2 font-body text-light-on-surface">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    <span className="font-medium text-light-primary">Atelier Crafted — Enquire for Availability</span>
                  </span>
                  <span className="font-mono text-[11px] text-light-secondary font-medium">
                    Bespoke Production
                  </span>
                </div>
              </div>

              {/* Architectural Technical Specification Table */}
              <div className="space-y-2">
                <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary block">
                  Architectural Specifications
                </span>

                <dl className="border-t border-light-outline-variant/60 divide-y divide-light-outline-variant/50 text-xs sm:text-sm">
                  <div className="py-2.5 flex items-baseline justify-between gap-4">
                    <dt className="font-label text-[11px] uppercase tracking-wider text-light-on-surface-variant flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-accent" />
                      <span>Profile Face Width</span>
                    </dt>
                    <dd className="font-mono font-bold text-light-primary text-right">
                      {frame.profileWidth.toFixed(2)}" ({Math.round(frame.profileWidth * 25.4)} mm)
                    </dd>
                  </div>

                  <div className="py-2.5 flex items-baseline justify-between gap-4">
                    <dt className="font-label text-[11px] uppercase tracking-wider text-light-on-surface-variant">
                      Total Outer Depth
                    </dt>
                    <dd className="font-mono font-bold text-light-primary text-right">
                      {frame.depth.toFixed(2)}" ({Math.round(frame.depth * 25.4)} mm)
                    </dd>
                  </div>

                  <div className="py-2.5 flex items-baseline justify-between gap-4">
                    <dt className="font-label text-[11px] uppercase tracking-wider text-light-on-surface-variant">
                      Rabbet Depth
                    </dt>
                    <dd className="font-mono font-bold text-light-primary text-right">
                      {rabbetDepth}"
                    </dd>
                  </div>

                  <div className="py-2.5 flex items-baseline justify-between gap-4">
                    <dt className="font-label text-[11px] uppercase tracking-wider text-light-on-surface-variant">
                      Core Substrate Material
                    </dt>
                    <dd className="font-body font-semibold text-light-primary text-right">
                      {frame.material}
                    </dd>
                  </div>

                  <div className="py-2.5 flex items-baseline justify-between gap-4">
                    <dt className="font-label text-[11px] uppercase tracking-wider text-light-on-surface-variant">
                      Surface Finish
                    </dt>
                    <dd className="font-body font-medium text-light-primary text-right">
                      {frame.finish}
                    </dd>
                  </div>

                  <div className="py-2.5 flex items-baseline justify-between gap-4">
                    <dt className="font-label text-[11px] uppercase tracking-wider text-light-on-surface-variant">
                      Ornamental Motif
                    </dt>
                    <dd className="font-headline italic text-sm text-light-primary text-right">
                      {frame.textureDetails.filigreeStyle}
                    </dd>
                  </div>

                  <div className="py-2.5 flex items-baseline justify-between gap-4">
                    <dt className="font-label text-[11px] uppercase tracking-wider text-light-on-surface-variant">
                      Joinery Geometry
                    </dt>
                    <dd className="font-mono text-light-secondary font-bold text-right">
                      Precision 45° Mitre-Ready
                    </dd>
                  </div>

                  <div className="py-2.5 flex items-baseline justify-between gap-4">
                    <dt className="font-label text-[11px] uppercase tracking-wider text-light-on-surface-variant">
                      Recommended Pairing
                    </dt>
                    <dd className="font-body text-light-on-surface-variant text-right">
                      Canvas Paintings, Fine Art Prints, Statement Mirrors
                    </dd>
                  </div>

                  <div className="py-2.5 flex items-baseline justify-between gap-4">
                    <dt className="font-label text-[11px] uppercase tracking-wider text-light-on-surface-variant">
                      Market &amp; Transit
                    </dt>
                    <dd className="font-mono text-light-secondary text-right">
                      Pan-India Dispatch (Freight Quoted Per Order)
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => onCustomize(frame)}
                    className="flex-1 inline-flex items-center justify-center bg-light-primary hover:bg-forest-deep text-light-on-primary px-8 py-4 rounded-sm font-label text-label-lg uppercase tracking-widest transition-colors shadow-xs gap-2 cursor-pointer"
                  >
                    <span>Customize This Frame</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSampleKitModalOpen(true)}
                    className="inline-flex items-center justify-center border border-light-primary text-light-primary bg-transparent hover:bg-light-primary hover:text-light-on-primary px-6 py-4 rounded-sm font-label text-label-lg uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Request Sample Kit
                  </button>
                </div>

                <a
                  href={`https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(
                    `Namaste Sanskruti Arts! I am interested in moulding profile #${frame.id} (${frame.name}).\n• Face Width: ${frame.profileWidth}"\n• Finish: ${frame.finish}\n• Rate: ₹${inrRate}/ft + 18% GST\n\nPlease share availability and bespoke crafting options.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center bg-[#25D366] hover:bg-[#20ba59] text-white px-6 py-3.5 rounded-sm font-label text-label-lg uppercase tracking-widest transition-colors gap-2 shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Atelier Consultation</span>
                </a>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. MACRO DETAIL & INTERIOR CONTEXT (Deep Forest Green Section)             */}
      {/* ========================================================================= */}
      <section className="bg-forest-deep text-light-on-primary py-section">
        <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-xl items-center">
            
            <div className="lg:col-span-5 flex flex-col gap-4">
              <span className="font-label text-label-sm uppercase tracking-widest text-bronze-bright flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Materiality &amp; Scale</span>
              </span>
              <h2 className="font-headline text-display-lg-mobile lg:text-headline-lg text-light-on-primary leading-tight text-balance">
                Sculpted Relief in Gallery Light
              </h2>
              <p className="font-body text-body-md text-light-on-primary-container max-w-prose leading-relaxed">
                Hand-burnished metallic patinas catch directional gallery lighting along every carved ridge, giving depth to classical portraiture, fine art canvases, and contemporary Indian luxury spaces.
              </p>
              
              <div className="pt-2 space-y-2 text-xs font-mono text-bronze-bright">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent" />
                  <span>Guild-Calibrated Gesso Bole Undercoating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent" />
                  <span>Internal Hardwood Splines for Zero Joint Sag</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent" />
                  <span>Provisional 18% GST Estimate (Confirmed on Workshop Invoice) &amp; Destination Dispatch Quotes</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              {secondaryPhoto ? (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-7 border border-accent/40 p-2 bg-black/20 rounded-sm">
                    <img
                      src={primaryPhoto}
                      alt={`${frame.name} Physical Profile`}
                      className="w-full aspect-[4/3] object-cover"
                    />
                    <span className="block font-mono text-[10px] text-bronze-bright mt-1.5 px-1">
                      Physical Moulding Specimen • Workshop Original
                    </span>
                  </div>
                  <div className="sm:col-span-5 border border-accent/40 p-2 bg-black/20 rounded-sm">
                    <img
                      src={secondaryPhoto}
                      alt={`${frame.name} Miter Joint`}
                      className="w-full aspect-[3/4] object-cover"
                    />
                    <span className="block font-mono text-[10px] text-bronze-bright mt-1.5 px-1">
                      {frame.finish} • Miter Construction
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border border-accent/40 p-3 bg-black/20 rounded-sm max-w-lg mx-auto lg:mx-0">
                  <img
                    src={primaryPhoto}
                    alt={`${frame.name} Authentic Workshop Sample`}
                    className="w-full max-h-[360px] object-contain"
                  />
                  <div className="flex items-center justify-between font-mono text-[10px] text-bronze-bright mt-2 px-1">
                    <span>{frame.isWorkshopSample ? 'Atelier Workshop Original' : 'Fine Art Moulding Profile'}</span>
                    <span>{frame.finish}</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. COMPANION PROFILES / RELATED MOULDINGS SECTION                          */}
      {/* ========================================================================= */}
      <section className="bg-light-surface-container-low py-12 lg:py-16 border-b border-light-outline-variant/60">
        <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-4 border-b border-light-outline-variant/60">
            <div>
              <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary block mb-1">
                Explore Harmonizing Profiles
              </span>
              <h2 className="font-headline text-headline-lg-mobile lg:text-headline-lg text-light-primary">
                Companion Mouldings
              </h2>
            </div>
            <p className="font-body text-body-md text-light-on-surface-variant max-w-md">
              Select any profile below to inspect its architectural specifications and cross-section details.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {companionProfiles.map((companion) => {
              const compRate = getMouldingFootRateINR(companion);
              return (
                <button
                  key={companion.id}
                  type="button"
                  onClick={() => onSelectFrame(companion)}
                  className="text-left group bg-light-surface p-4 sm:p-5 border border-light-outline-variant/60 hover:border-accent transition-all rounded-sm flex flex-col justify-between gap-4 cursor-pointer"
                >
                  <div className="bg-light-surface-container-low p-4 rounded-sm overflow-hidden aspect-[4/3] flex items-center justify-center relative">
                    <img
                      src={companion.cornerDetailUrl || companion.thumbnailUrl}
                      alt={companion.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-surface-enter"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="font-mono text-[11px] bg-light-primary/90 text-light-on-primary px-2 py-0.5 rounded-xs">
                        #{companion.id}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <span className="font-label text-[10px] uppercase tracking-widest text-light-secondary font-bold block">
                      {companion.material}
                    </span>
                    <h3 className="font-headline text-xl font-bold text-light-primary group-hover:text-accent transition-colors">
                      {companion.name}
                    </h3>
                    <p className="font-body text-xs text-light-on-surface-variant line-clamp-2">
                      {companion.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-light-outline-variant/40 flex items-baseline justify-between">
                    <div>
                      <span className="font-headline text-xl font-bold text-light-primary">₹{compRate}</span>
                      <span className="font-mono text-xs text-light-secondary ml-1">/ ft</span>
                    </div>
                    <span className="font-mono text-xs text-light-outline">
                      Face: {companion.profileWidth.toFixed(2)}"
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. TRADE SAMPLE KIT POPUP MODAL                                           */}
      {/* ========================================================================= */}
      {isSampleKitModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdp-kit-modal-title"
          onClick={() => setIsSampleKitModalOpen(false)}
        >
          <div 
            className="bg-light-surface max-w-lg w-full p-6 sm:p-8 rounded-sm border-2 border-light-primary shadow-2xl relative space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsSampleKitModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-light-on-surface-variant hover:text-light-primary transition-colors cursor-pointer"
              aria-label="Close sample kit modal"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <span className="font-mono text-mono-sm text-accent uppercase tracking-widest block font-bold">
                B2B Trade Specifier Programme
              </span>
              <h2 id="pdp-kit-modal-title" className="font-headline text-headline-lg-mobile sm:text-headline-lg text-light-primary">
                Request Architect's 6″ Sample
              </h2>
              <p className="font-body text-sm text-light-on-surface-variant leading-relaxed">
                Receive a hand-milled, finished 6-inch mitered corner chevron sample of <strong className="text-light-primary">{frame.name} (#{frame.id})</strong> for material board presentations and architectural sign-off.
              </p>
            </div>

            <form onSubmit={handleKitSubmit} className="space-y-4">
              <div>
                <label htmlFor="pdp-kit-name" className="font-label text-[11px] uppercase tracking-wider text-light-secondary block mb-1">
                  Contact Name *
                </label>
                <input
                  id="pdp-kit-name"
                  type="text"
                  required
                  value={kitForm.name}
                  onChange={(e) => setKitForm({ ...kitForm, name: e.target.value })}
                  placeholder="e.g. Rajesh Mehta"
                  className="w-full bg-light-surface-container-low border border-light-outline-variant rounded-sm px-3.5 py-2.5 text-sm font-body text-light-on-surface focus:outline-hidden focus:border-light-primary"
                />
              </div>

              <div>
                <label htmlFor="pdp-kit-org" className="font-label text-[11px] uppercase tracking-wider text-light-secondary block mb-1">
                  Architecture / Interior Studio
                </label>
                <input
                  id="pdp-kit-org"
                  type="text"
                  value={kitForm.organization}
                  onChange={(e) => setKitForm({ ...kitForm, organization: e.target.value })}
                  placeholder="e.g. Atelier Studio Mumbai / Independent"
                  className="w-full bg-light-surface-container-low border border-light-outline-variant rounded-sm px-3.5 py-2.5 text-sm font-body text-light-on-surface focus:outline-hidden focus:border-light-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pdp-kit-city" className="font-label text-[11px] uppercase tracking-wider text-light-secondary block mb-1">
                    City *
                  </label>
                  <input
                    id="pdp-kit-city"
                    type="text"
                    required
                    value={kitForm.city}
                    onChange={(e) => setKitForm({ ...kitForm, city: e.target.value })}
                    placeholder="e.g. Mumbai, Bengaluru"
                    className="w-full bg-light-surface-container-low border border-light-outline-variant rounded-sm px-3.5 py-2.5 text-sm font-body text-light-on-surface focus:outline-hidden focus:border-light-primary"
                  />
                </div>

                <div>
                  <label htmlFor="pdp-kit-phone" className="font-label text-[11px] uppercase tracking-wider text-light-secondary block mb-1">
                    Phone / WhatsApp *
                  </label>
                  <input
                    id="pdp-kit-phone"
                    type="tel"
                    required
                    value={kitForm.phone}
                    onChange={(e) => setKitForm({ ...kitForm, phone: e.target.value })}
                    placeholder="+91 98200 00000"
                    className="w-full bg-light-surface-container-low border border-light-outline-variant rounded-sm px-3.5 py-2.5 text-sm font-body text-light-on-surface focus:outline-hidden focus:border-light-primary"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center bg-light-primary hover:bg-forest-deep text-light-on-primary py-3.5 rounded-sm font-label text-label-md uppercase tracking-widest transition-colors shadow-xs gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>Dispatch Sample via WhatsApp Concierge</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
