import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  ArrowRight, 
  Phone,
  CheckCircle2
} from 'lucide-react';
import { FRAME_SAMPLES } from '../data/frames';
import { FrameSample } from '../types';
import { getMouldingFootRateINR, formatINR } from '../utils/pricing';
import { getIndianWhatsAppUrl, WHATSAPP_DISPLAY_PHONE } from '../utils/whatsapp';
import { saveLead } from '../utils/leadStorage';
import { LANDING_FAQS } from '../utils/seo';
import { Header } from './Header';
import { Footer } from './Footer';
import { FrameDetailModal } from './FrameDetailModal';

interface LandingPageProps {
  onNavigateToConfigurator: (initialFrameId?: string, initialTab?: 'home' | 'catalog' | 'configure' | 'studio3d' | 'review' | 'quotations' | 'product') => void;
  savedQuotationsCount?: number;
  searchQuery?: string;
  onSearchQuery?: (query: string) => void;
}

interface FeaturedProfile {
  sku: string;
  name: string;
  category: 'gold' | 'baroque' | 'mahogany';
  categoryFilter: string;
  finishDescription: string;
  imageSrc: string;
  mappedId: string;
  colSpan: string;
  offsetClass?: string;
  aspectClass: string;
}

const FEATURED_STITCH_PROFILES: FeaturedProfile[] = [
  {
    sku: 'SA-BG-402',
    name: 'Baroque Espresso & Gold',
    category: 'baroque',
    categoryFilter: 'baroque gold',
    finishDescription: 'Espresso & Antiqued Gold Leaf',
    imageSrc: '/mouldings/ornate-antique-gold-baroque-frame.png',
    mappedId: 'SAA-AGB-15',
    colSpan: 'lg:col-span-7',
    aspectClass: 'aspect-[16/10]'
  },
  {
    sku: 'SA-AG-118',
    name: 'Acanthus Burnished Gold',
    category: 'gold',
    categoryFilter: 'gold',
    finishDescription: 'Burnished Gold Relief',
    imageSrc: '/mouldings/ornate-antique-gold-picture-frame-1.png',
    mappedId: 'SAA-AGP-16',
    colSpan: 'lg:col-span-5',
    offsetClass: 'lg:mt-16',
    aspectClass: 'aspect-[4/3]'
  },
  {
    sku: 'SA-MG-204',
    name: 'Mahogany & Gold Bead',
    category: 'mahogany',
    categoryFilter: 'mahogany baroque',
    finishDescription: 'Mahogany & Gold Trim',
    imageSrc: '/mouldings/ornate-mahogany-and-gold-frame.png',
    mappedId: 'SAA-MHG-23',
    colSpan: 'lg:col-span-5',
    offsetClass: 'lg:mt-gutter-xl',
    aspectClass: 'aspect-[4/3]'
  },
  {
    sku: 'SA-CB-309',
    name: 'Crimson & Braided Bronze',
    category: 'mahogany',
    categoryFilter: 'mahogany',
    finishDescription: 'Crimson Lacquer & Bronze',
    imageSrc: '/mouldings/ornate-burgundy-and-gold-vintage-frame.png',
    mappedId: 'SAA-BVG-19',
    colSpan: 'lg:col-span-7',
    aspectClass: 'aspect-[16/10]'
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToConfigurator,
  savedQuotationsCount = 0,
  searchQuery,
  onSearchQuery,
}) => {
  // Active collection filter tab ('all' | 'gold' | 'baroque' | 'mahogany')
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  
  // Inspection & Consultation Modals
  const [inspectingFrame, setInspectingFrame] = useState<FrameSample | null>(null);
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [consultName, setConsultName] = useState('');
  const [consultEmail, setConsultEmail] = useState('');
  const [consultNotes, setConsultNotes] = useState('');
  const [consultSuccess, setConsultSuccess] = useState(false);

  useEffect(() => {
    if (!consultationModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConsultationModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [consultationModalOpen]);

  const sampleKitWhatsAppUrl = getIndianWhatsAppUrl(
    `Namaste Sanskruti Arts! I would like to request a Trade Sample Kit:\n• Studio / Name: ${consultName || 'Prospective Client'}\n• Contact: ${consultEmail || 'Not provided'}\n• Requested Profiles & Delivery City: ${consultNotes || 'Curated corner chevrons'}`
  );

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveLead({
      leadType: 'sample_kit',
      clientName: consultName,
      mobile: consultEmail,
      cityOrPin: consultNotes || 'India',
      skus: FEATURED_STITCH_PROFILES.map((p) => p.mappedId),
      configurationUrl: typeof window !== 'undefined' ? window.location.href : '/',
      notes: consultNotes || 'Landing Page Trade Sample Kit enquiry',
    });
    setConsultSuccess(true);
    if (typeof window !== 'undefined') {
      window.open(sampleKitWhatsAppUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Filtered featured profiles according to selected category
  const visibleFeaturedProfiles = useMemo(() => {
    if (activeCategoryFilter === 'all') return FEATURED_STITCH_PROFILES;
    return FEATURED_STITCH_PROFILES.filter(p => p.categoryFilter.includes(activeCategoryFilter));
  }, [activeCategoryFilter]);

  // Find genuine product record for detail inspection or full page navigation
  const handleInspectProfile = (mappedId: string) => {
    onNavigateToConfigurator(mappedId, 'product');
  };

  return (
    <div className="bg-light-surface text-light-on-surface font-body min-h-screen antialiased selection:bg-light-primary selection:text-light-on-primary">
      
      {/* ========================================================================= */}
      {/* 1. SHARED STITCH APPLICATION HEADER                                        */}
      {/* ========================================================================= */}
      <Header
        selectedFrame={FRAME_SAMPLES[0]}
        width={16}
        height={20}
        unit="in"
        activeTab="home"
        catalogCount={FRAME_SAMPLES.length}
        savedQuotationsCount={savedQuotationsCount}
        searchQuery={searchQuery}
        onSearchQuery={onSearchQuery}
        onTabChange={(tab) => onNavigateToConfigurator(undefined, tab)}
        onReset={() => {}}
        onNavigateHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />

      <main className="flex-1">

        {/* ========================================================================= */}
        {/* SECTION 1: EDITORIAL HERO                                                 */}
        {/* ========================================================================= */}
        <section id="home" className="relative bg-light-surface border-b border-light-outline-variant/60">
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin py-gutter-xl lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-xl items-center">

              {/* Left Editorial Copy Column (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-gutter-lg lg:pr-gutter-lg">
                <div className="flex items-center gap-gutter-md">
                  <span className="w-8 h-px bg-accent inline-block" />
                  <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold">
                    Decorative Frame Mouldings
                  </span>
                </div>

                <h1 className="font-display text-display-xl-mobile lg:text-display-xl text-light-primary text-balance leading-none">
                  Where Craftsmanship Frames Art.
                </h1>

                <p className="font-body text-body-lg text-light-on-surface-variant max-w-prose text-pretty leading-relaxed">
                  Discover distinctive decorative mouldings crafted to transform artwork into timeless pieces. Handcrafted in India for art galleries, framing ateliers, and luxury architectural interiors.
                </p>

                <div className="flex flex-wrap items-center gap-gutter-md pt-gutter-sm">
                  {/* Primary CTA: Explore Collections */}
                  <button
                    type="button"
                    onClick={() => onNavigateToConfigurator(undefined, 'catalog')}
                    className="inline-flex items-center justify-center bg-light-primary text-light-on-primary px-8 py-4 rounded-sm font-label text-label-lg uppercase tracking-widest transition-colors duration-state-change ease-state-change hover:bg-forest-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent shadow-xs"
                  >
                    <span>Explore Collections</span>
                  </button>

                  {/* Secondary CTA: Customize Your Frame */}
                  <button
                    type="button"
                    onClick={() => onNavigateToConfigurator(undefined, 'configure')}
                    className="inline-flex items-center justify-center border border-light-primary text-light-primary bg-transparent px-8 py-4 rounded-sm font-label text-label-lg uppercase tracking-widest transition-colors duration-state-change ease-state-change hover:bg-light-primary hover:text-light-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span>Customize Your Frame</span>
                  </button>
                </div>
              </div>

              {/* Right Cinematic Gallery Image Composition (7 cols) */}
              <div className="lg:col-span-7 relative">
                <div className="bg-forest-deep p-gutter-sm md:p-gutter-md border border-accent/40 shadow-subtle-card">
                  <img 
                    src="/mouldings/ornate-antique-gold-baroque-frame.png" 
                    alt="Ornate antique gold and carved wood picture frames arranged in a forest green gallery atelier" 
                    className="w-full aspect-[16/10] object-cover"
                  />
                </div>

                {/* Subtle Architectural Caption Strip */}
                <div className="mt-gutter-md flex items-center justify-between gap-gutter-md border-t border-light-outline-variant/60 pt-gutter-sm">
                  <span className="font-label text-label-sm uppercase tracking-widest text-light-on-surface-variant">
                    Atelier Gallery Composition
                  </span>
                  <span className="font-mono text-mono-sm text-light-secondary font-semibold">
                    Gilded &amp; Carved Hardwood Profiles
                  </span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: FEATURED MOULDING COLLECTIONS — EDITORIAL PRODUCT GRID         */}
        {/* ========================================================================= */}
        <section id="collections" className="bg-light-surface py-section border-b border-light-outline-variant/60">
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">

            {/* Section Header */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-end mb-gutter-lg pb-gutter-lg border-b border-light-outline-variant/60">
              <div className="lg:col-span-7 flex flex-col gap-gutter-sm">
                <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold">
                  Curated Profiles
                </span>
                <h2 className="font-display text-display-lg-mobile lg:text-display-lg text-light-primary text-balance">
                  Featured Moulding Collections
                </h2>
              </div>
              <div className="lg:col-span-5 lg:text-right">
                <p className="font-body text-body-md text-light-on-surface-variant max-w-prose lg:ml-auto text-pretty">
                  Ornamental mouldings engineered for galleries, collectors, and architectural interiors across India.
                </p>
              </div>
            </div>

            {/* Editorial Collection Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-gutter-md mb-gutter-xl pb-gutter-md border-b border-light-outline-variant/40">
              <div className="flex flex-wrap items-center gap-gutter-lg" role="tablist" aria-label="Filter moulding collections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategoryFilter === 'all'}
                  onClick={() => setActiveCategoryFilter('all')}
                  className={`font-label text-label-lg uppercase tracking-widest pb-1.5 transition-colors duration-state-change border-b-2 ${
                    activeCategoryFilter === 'all'
                      ? 'text-light-primary border-accent font-bold'
                      : 'text-light-on-surface-variant hover:text-light-primary border-transparent'
                  }`}
                >
                  <span>All Profiles</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategoryFilter === 'gold'}
                  onClick={() => setActiveCategoryFilter('gold')}
                  className={`font-label text-label-lg uppercase tracking-widest pb-1.5 transition-colors duration-state-change border-b-2 ${
                    activeCategoryFilter === 'gold'
                      ? 'text-light-primary border-accent font-bold'
                      : 'text-light-on-surface-variant hover:text-light-primary border-transparent'
                  }`}
                >
                  <span>Antique Gold</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategoryFilter === 'baroque'}
                  onClick={() => setActiveCategoryFilter('baroque')}
                  className={`font-label text-label-lg uppercase tracking-widest pb-1.5 transition-colors duration-state-change border-b-2 ${
                    activeCategoryFilter === 'baroque'
                      ? 'text-light-primary border-accent font-bold'
                      : 'text-light-on-surface-variant hover:text-light-primary border-transparent'
                  }`}
                >
                  <span>Baroque Scrollwork</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategoryFilter === 'mahogany'}
                  onClick={() => setActiveCategoryFilter('mahogany')}
                  className={`font-label text-label-lg uppercase tracking-widest pb-1.5 transition-colors duration-state-change border-b-2 ${
                    activeCategoryFilter === 'mahogany'
                      ? 'text-light-primary border-accent font-bold'
                      : 'text-light-on-surface-variant hover:text-light-primary border-transparent'
                  }`}
                >
                  <span>Mahogany &amp; Bronze</span>
                </button>
              </div>

              <div className="flex items-center gap-gutter-md">
                <span className="font-mono text-mono-sm text-light-secondary tabular-nums">
                  Showing {visibleFeaturedProfiles.length} of {FEATURED_STITCH_PROFILES.length} Featured Profiles
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateToConfigurator(undefined, 'catalog')}
                  className="font-label text-label-sm uppercase tracking-widest text-light-primary hover:text-light-secondary underline"
                >
                  View All {FRAME_SAMPLES.length} Catalogue Profiles →
                </button>
              </div>
            </div>

            {/* Asymmetric 12-Column Editorial Product Gallery */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-xl items-start">
              {visibleFeaturedProfiles.map((profile) => {
                const matchedFrame = FRAME_SAMPLES.find(f => f.id === profile.mappedId) || FRAME_SAMPLES[0];
                const rateINR = getMouldingFootRateINR(matchedFrame);

                return (
                  <article
                    key={profile.sku}
                    className={`${profile.colSpan} ${profile.offsetClass || ''} group flex flex-col gap-gutter-md`}
                  >
                    {/* Transparent High-Res Frame Showcase Box */}
                    <button
                      type="button"
                      onClick={() => handleInspectProfile(profile.mappedId)}
                      className="w-full text-left bg-light-surface-container-low p-gutter-lg sm:p-gutter-xl border border-light-outline-variant/50 overflow-hidden cursor-pointer block"
                      aria-label={`Inspect ${profile.name} (${profile.sku})`}
                    >
                      <img
                        src={profile.imageSrc}
                        alt={`${profile.name} Decorative Moulding Frame`}
                        className={`w-full ${profile.aspectClass} object-contain transition-transform duration-surface-enter ease-surface-enter group-hover:scale-[1.03]`}
                      />
                    </button>

                    {/* Meta & Navigation Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-gutter-md pt-gutter-xs border-b border-light-outline-variant/60 pb-gutter-md">
                      <div className="flex flex-col gap-gutter-xs">
                        <div className="flex items-center gap-2">
                          <h3 className="font-headline text-headline-md text-light-on-surface">
                            {profile.name}
                          </h3>
                          <span className="font-mono text-xs font-bold text-accent">
                            {formatINR(rateINR)}/ft
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-gutter-md">
                          <span className="font-mono text-mono-sm text-light-secondary tabular-nums font-semibold">
                            SKU: {profile.sku}
                          </span>
                          <span className="font-label text-label-sm uppercase tracking-widest text-light-on-surface-variant">
                            {profile.finishDescription}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-gutter-md">
                        <button
                          type="button"
                          onClick={() => handleInspectProfile(profile.mappedId)}
                          className="min-h-[40px] px-2 py-2 inline-flex items-center font-label text-label-sm uppercase tracking-widest text-light-on-surface-variant hover:text-light-primary transition-colors underline"
                        >
                          Specs
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateToConfigurator(profile.mappedId, 'configure')}
                          className="min-h-[40px] py-2 inline-flex items-center gap-gutter-xs font-label text-label-lg uppercase tracking-widest text-light-primary border-b border-accent transition-colors duration-state-change hover:text-light-secondary"
                        >
                          <span>Customize</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Editorial Trade & Sample Kit Callout */}
            <div className="mt-gutter-xl pt-gutter-xl border-t border-light-outline-variant/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-gutter-lg">
              <div className="flex flex-col gap-gutter-xs">
                <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold">
                  India Trade &amp; Interior Studios
                </span>
                <p className="font-body text-body-lg text-light-on-surface leading-relaxed">
                  Request physical corner chevron samples for gallery curation and architectural specification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConsultationModalOpen(true)}
                className="inline-flex items-center justify-center border border-light-primary text-light-primary bg-transparent px-8 py-4 rounded-sm font-label text-label-lg uppercase tracking-widest transition-colors duration-state-change ease-state-change hover:bg-light-primary hover:text-light-on-primary shrink-0"
              >
                <span>Request Sample Kit</span>
              </button>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: CRAFTSMANSHIP & MANUFACTURING PROCESS (IMMERSIVE FOREST GREEN)  */}
        {/* ========================================================================= */}
        <section id="craftsmanship" className="bg-forest-deep text-light-on-primary py-section">
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-xl items-center">
              {/* Left Primary Macro Craft Photo (7 cols) */}
              <div className="lg:col-span-7">
                <div className="border border-accent/40 p-gutter-sm bg-light-primary/30">
                  <img 
                    src="/mouldings/ornate-golden-baroque-picture-frame.png" 
                    alt="Artisan hand-finishing antique gold leaf decorative picture frame moulding" 
                    className="w-full aspect-[4/3] object-cover"
                  />
                </div>
              </div>

              {/* Right Minimal Editorial Statement + Secondary Corner Photo (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-gutter-xl lg:pl-gutter-lg">
                <div className="flex flex-col gap-gutter-md">
                  <span className="font-label text-label-sm uppercase tracking-widest text-bronze-bright font-semibold">
                    Atelier Manufacturing
                  </span>
                  <h2 className="font-display text-display-lg-mobile lg:text-display-lg text-light-on-primary text-balance leading-tight">
                    Crafted With Detail. Designed to Last.
                  </h2>
                  <p className="font-body text-body-md text-light-on-primary-container max-w-prose text-pretty leading-relaxed">
                    Every length of moulding is shaped for crisp ornamental relief, natural timber depth, and mitre-ready corner precision.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-gutter-lg items-end pt-gutter-md border-t border-accent/30">
                  <div className="border border-accent/30 p-1.5">
                    <img 
                      src="/mouldings/ornate-antique-bronze-baroque-frame.png" 
                      alt="Precision mitred corner joint of carved mahogany and antique bronze moulding" 
                      className="w-full aspect-[3/4] object-cover"
                    />
                  </div>
                  <ul className="flex flex-col gap-gutter-md pb-gutter-sm">
                    <li className="border-b border-accent/30 pb-gutter-sm">
                      <span className="font-label text-label-sm uppercase tracking-widest text-bronze-bright block font-bold">
                        01
                      </span>
                      <span className="font-body text-body-md text-light-on-primary">
                        Antique Gold Leafing
                      </span>
                    </li>
                    <li className="border-b border-accent/30 pb-gutter-sm">
                      <span className="font-label text-label-sm uppercase tracking-widest text-bronze-bright block font-bold">
                        02
                      </span>
                      <span className="font-body text-body-md text-light-on-primary">
                        Ornamental Relief
                      </span>
                    </li>
                    <li className="pb-gutter-xs">
                      <span className="font-label text-label-sm uppercase tracking-widest text-bronze-bright block font-bold">
                        03
                      </span>
                      <span className="font-body text-body-md text-light-on-primary">
                        Precision Corner Joints
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Manufacturing Process 4-Stage Editorial Strip */}
            <div className="mt-gutter-xl pt-gutter-xl border-t border-accent/30">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-gutter-md mb-gutter-xl">
                <div className="flex flex-col gap-gutter-xs">
                  <span className="font-label text-label-sm uppercase tracking-widest text-bronze-bright font-semibold">
                    Manufacturing Process
                  </span>
                  <h3 className="font-headline text-headline-lg-mobile lg:text-headline-lg text-light-on-primary">
                    From Raw Profile to Gallery Finish
                  </h3>
                </div>
                <span className="font-mono text-mono-sm text-light-on-primary-container">
                  In-House Moulding Production • India
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter-lg">
                <div className="border-t border-accent/50 pt-gutter-md flex flex-col gap-gutter-sm">
                  <span className="font-mono text-mono-sm text-bronze-bright font-bold">STAGE 01</span>
                  <h4 className="font-title text-title-lg text-light-on-primary">Timber &amp; Profile Milling</h4>
                  <p className="font-body text-body-md text-light-on-primary-container leading-relaxed">
                    Seasoned substrates are milled to exact architectural widths and rabbet depths for structural stability.
                  </p>
                </div>

                <div className="border-t border-accent/50 pt-gutter-md flex flex-col gap-gutter-sm">
                  <span className="font-mono text-mono-sm text-bronze-bright font-bold">STAGE 02</span>
                  <h4 className="font-title text-title-lg text-light-on-primary">Ornamental Relief</h4>
                  <p className="font-body text-body-md text-light-on-primary-container leading-relaxed">
                    Baroque scrollwork, acanthus leaves, and beaded borders are pressed and refined for sharp shadow definition.
                  </p>
                </div>

                <div className="border-t border-accent/50 pt-gutter-md flex flex-col gap-gutter-sm">
                  <span className="font-mono text-mono-sm text-bronze-bright font-bold">STAGE 03</span>
                  <h4 className="font-title text-title-lg text-light-on-primary">Patina &amp; Gilding</h4>
                  <p className="font-body text-body-md text-light-on-primary-container leading-relaxed">
                    Layered antique gold, espresso, and mahogany tones are burnished by hand for gallery-grade depth.
                  </p>
                </div>

                <div className="border-t border-accent/50 pt-gutter-md flex flex-col gap-gutter-sm">
                  <span className="font-mono text-mono-sm text-bronze-bright font-bold">STAGE 04</span>
                  <h4 className="font-title text-title-lg text-light-on-primary">Corner &amp; Finish Check</h4>
                  <p className="font-body text-body-md text-light-on-primary-container leading-relaxed">
                    Every moulding length is inspected for consistent colour continuity and clean 45-degree mitre joinery.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: CUSTOM FRAMING STUDIO                                          */}
        {/* ========================================================================= */}
        <section id="custom-framing" className="bg-light-surface-container-low py-section border-b border-light-outline-variant/60">
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-xl items-center">

              {/* Left Editorial Copy + Supporting Sample Visual (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-gutter-xl order-2 lg:order-1">
                <div className="flex flex-col gap-gutter-md">
                  <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold">
                    Interactive Studio
                  </span>
                  <h2 className="font-display text-display-lg-mobile lg:text-display-lg text-light-primary text-balance leading-tight">
                    Your Artwork. Your Frame. Your Creation.
                  </h2>
                  <p className="font-body text-body-md text-light-on-surface-variant max-w-prose text-pretty leading-relaxed">
                    Pair your painting, photograph, or architectural print with our decorative moulding profiles, mat proportions, and bronze or gold finishes.
                  </p>
                </div>

                {/* Smaller Supporting Customization Visual */}
                <div className="grid grid-cols-12 gap-gutter-md items-center bg-light-surface p-gutter-md border border-light-outline-variant/60">
                  <div className="col-span-5">
                    <img 
                      src="/mouldings/elegant-dark-wood-frame-with-gold-trim.png" 
                      alt="Decorative picture frame corner chevron samples with precision joinery" 
                      className="w-full aspect-square object-cover"
                    />
                  </div>
                  <div className="col-span-7 flex flex-col gap-gutter-xs">
                    <span className="font-title text-title-lg text-light-on-surface font-semibold">
                      Profile &amp; Mat Studio
                    </span>
                    <span className="font-body text-body-md text-light-on-surface-variant">
                      Preview moulding widths, glazing, and corner finishes before ordering.
                    </span>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => onNavigateToConfigurator(undefined, 'configure')}
                    className="inline-flex items-center justify-center bg-light-primary text-light-on-primary px-8 py-4 rounded-sm font-label text-label-lg uppercase tracking-widest transition-colors duration-state-change ease-state-change hover:bg-forest-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent shadow-xs"
                  >
                    <span>Create Your Frame</span>
                  </button>
                </div>
              </div>

              {/* Right Large Framed Artwork Visual (7 cols) */}
              <div className="lg:col-span-7 order-1 lg:order-2">
                <div className="bg-light-surface p-gutter-md border border-light-outline-variant/60 shadow-subtle-card">
                  <img 
                    src="/mouldings/ornate-empty-antique-gold-frame.png" 
                    alt="Large fine art painting framed in ornate antique bronze moulding inside a warm gallery room" 
                    className="w-full aspect-[4/3] object-cover"
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5: WHY SANSKRUTI ARTS                                             */}
        {/* ========================================================================= */}
        <section id="about" className="bg-light-surface py-section border-b border-light-outline-variant/60">
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-xl items-start">
              <div className="lg:col-span-5 flex flex-col gap-gutter-md">
                <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold">
                  The Manufacturer
                </span>
                <h2 className="font-headline text-headline-lg-mobile lg:text-headline-lg text-light-primary text-balance">
                  Why Sanskruti Arts
                </h2>
                <p className="font-body text-body-lg text-light-on-surface-variant max-w-prose text-pretty leading-relaxed">
                  As an Indian manufacturer of decorative picture frame mouldings, we focus on consistent profile geometry, authentic surface finishes, and dependable supply for framing studios, galleries, and interior architects.
                </p>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-gutter-lg pt-gutter-sm">
                <div className="border-t-2 border-accent pt-gutter-md flex flex-col gap-gutter-sm">
                  <span className="font-mono text-mono-sm text-light-secondary font-bold">01 / CRAFT</span>
                  <h3 className="font-title text-title-lg text-light-on-surface font-semibold">Direct Manufacturing</h3>
                  <p className="font-body text-body-md text-light-on-surface-variant leading-relaxed">
                    Produced in-house for consistent ornamental detail, clean mitre cuts, and reliable batch continuity.
                  </p>
                </div>

                <div className="border-t-2 border-accent pt-gutter-md flex flex-col gap-gutter-sm">
                  <span className="font-mono text-mono-sm text-light-secondary font-bold">02 / FINISH</span>
                  <h3 className="font-title text-title-lg text-light-on-surface font-semibold">Curated Aesthetics</h3>
                  <p className="font-body text-body-md text-light-on-surface-variant leading-relaxed">
                    Antiqued golds, deep mahoganies, and architectural bronze tones tailored for fine art and luxury interiors.
                  </p>
                </div>

                <div className="border-t-2 border-accent pt-gutter-md flex flex-col gap-gutter-sm">
                  <span className="font-mono text-mono-sm text-light-secondary font-bold">03 / INDIA TRADE</span>
                  <h3 className="font-title text-title-lg text-light-on-surface font-semibold">Studio &amp; Trade Focus</h3>
                  <p className="font-body text-body-md text-light-on-surface-variant leading-relaxed">
                    Dedicated support for Indian framing workshops, art galleries, and residential design projects.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5B: FREQUENTLY ASKED QUESTIONS (MATCHING FAQPAGE JSON-LD)         */}
        {/* ========================================================================= */}
        <section id="faq" className="bg-light-surface-container-low py-section border-b border-light-outline-variant/60">
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
            <div className="max-w-2xl mb-gutter-xl space-y-2">
              <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold">
                Framing &amp; Trade Guidance
              </span>
              <h2 className="font-headline text-headline-lg-mobile lg:text-headline-lg text-light-primary text-balance">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-lg">
              {LANDING_FAQS.map((faq) => (
                <article
                  key={faq.question}
                  className="bg-light-surface border border-light-outline-variant/60 rounded-sm p-gutter-lg flex flex-col gap-gutter-sm shadow-xs"
                >
                  <h3 className="font-title text-title-lg text-light-primary font-semibold leading-snug">
                    {faq.question}
                  </h3>
                  <p className="font-body text-body-md text-light-on-surface-variant leading-relaxed">
                    {faq.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* ========================================================================= */}
      {/* SECTION 6: SHARED STITCH FOOTER                                            */}
      {/* ========================================================================= */}
      <Footer
        onNavigateHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onNavigateCatalog={() => onNavigateToConfigurator(undefined, 'catalog')}
        onNavigateConfigurator={() => onNavigateToConfigurator(undefined, 'configure')}
        onNavigateStudio={() => onNavigateToConfigurator(undefined, 'studio3d')}
        onNavigateReview={() => onNavigateToConfigurator(undefined, 'review')}
        onNavigateQuotations={() => onNavigateToConfigurator(undefined, 'quotations')}
      />

      {/* ========================================================================= */}
      {/* MODAL 1: HIGH-RES ARCHITECTURAL SPECIFICATION MODAL                       */}
      {/* ========================================================================= */}
      <FrameDetailModal
        frame={inspectingFrame}
        isSelected={false}
        onSelect={(frame) => {
          setInspectingFrame(null);
          onNavigateToConfigurator(frame.id, 'configure');
        }}
        onClose={() => setInspectingFrame(null)}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: INDIA TRADE SAMPLE KIT & CURATORIAL ENQUIRY MODAL                */}
      {/* ========================================================================= */}
      {consultationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="landing-sample-modal-title"
          onClick={() => setConsultationModalOpen(false)}
        >
          <div
            className="bg-light-surface w-full max-w-lg rounded-sm shadow-2xl border border-accent/40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-light-outline-variant/60 flex items-center justify-between bg-light-surface-container-low">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-accent" />
                <h3 id="landing-sample-modal-title" className="font-headline text-title-lg text-light-primary font-bold">
                  Request Trade Sample Kit &amp; Inquiry
                </h3>
              </div>
              <button 
                type="button"
                aria-label="Close sample kit modal"
                onClick={() => setConsultationModalOpen(false)}
                className="p-2 rounded-sm hover:bg-light-surface-container text-light-on-surface-variant cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {!consultSuccess ? (
                <div className="space-y-4">
                  {/* WhatsApp Quick Connect Banner */}
                  <div className="p-3.5 bg-[#25D366]/10 border border-[#25D366]/30 rounded-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#1B5E20]">Direct Workshop WhatsApp</p>
                      <p className="text-[11px] text-[#2E7D32]">Chat with our framers on {WHATSAPP_DISPLAY_PHONE}</p>
                    </div>
                    <a
                      href={getIndianWhatsAppUrl('Hello Sanskruti Arts, I am requesting physical sample kit chevrons for my studio/gallery.')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs font-bold rounded-sm shadow-xs transition-colors shrink-0"
                    >
                      Chat on WhatsApp
                    </a>
                  </div>

                  <form onSubmit={handleConsultSubmit} className="space-y-4">
                    <p className="text-xs text-light-on-surface-variant leading-relaxed">
                      Share your framing studio, requested profiles, and delivery city below to open a pre-filled WhatsApp enquiry with our workshop desk.
                    </p>
                    <div>
                      <label htmlFor="landing-kit-name" className="block text-xs uppercase tracking-wider font-semibold text-light-primary mb-1">
                        Studio / Client Name
                      </label>
                      <input 
                        id="landing-kit-name"
                        type="text" 
                        required 
                        value={consultName}
                        onChange={(e) => setConsultName(e.target.value)}
                        placeholder="e.g. Art Gallery Mumbai / Rajesh Sharma"
                        className="w-full bg-white border border-light-outline-variant/60 rounded-sm px-4 py-2.5 text-sm text-light-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label htmlFor="landing-kit-contact" className="block text-xs uppercase tracking-wider font-semibold text-light-primary mb-1">
                        Business Email or Phone
                      </label>
                      <input 
                        id="landing-kit-contact"
                        type="text" 
                        required 
                        value={consultEmail}
                        onChange={(e) => setConsultEmail(e.target.value)}
                        placeholder="curator@gallery.in or +91 98200..."
                        className="w-full bg-white border border-light-outline-variant/60 rounded-sm px-4 py-2.5 text-sm text-light-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label htmlFor="landing-kit-notes" className="block text-xs uppercase tracking-wider font-semibold text-light-primary mb-1">
                        Requested Profiles &amp; Delivery City
                      </label>
                      <textarea 
                        id="landing-kit-notes"
                        rows={3} 
                        value={consultNotes}
                        onChange={(e) => setConsultNotes(e.target.value)}
                        placeholder="Specify profile codes (e.g. SA-BG-402, Antique Gold) and shipping address..."
                        className="w-full bg-white border border-light-outline-variant/60 rounded-sm px-4 py-2.5 text-sm text-light-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setConsultationModalOpen(false)}
                        className="px-4 py-2 text-xs uppercase tracking-wider font-semibold text-light-on-surface-variant hover:bg-light-surface-container rounded-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-light-primary text-light-on-primary text-xs uppercase tracking-wider font-bold rounded-sm hover:bg-forest-deep transition-colors"
                      >
                        Submit Sample Request
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="py-6 text-center space-y-4" data-testid="landing-sample-whatsapp-handoff">
                  <CheckCircle2 className="w-12 h-12 text-[#25D366] mx-auto" />
                  <h4 className="font-headline text-xl font-bold text-light-primary">
                    WhatsApp Opened — Please Press Send
                  </h4>
                  <p className="text-xs text-light-on-surface-variant max-w-sm mx-auto leading-relaxed">
                    WhatsApp ({WHATSAPP_DISPLAY_PHONE}) has been opened with your sample kit enquiry for{' '}
                    <strong className="text-light-primary">{consultName}</strong>. Your request is not sent or received by Sanskruti Arts until you press Send inside WhatsApp.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <a
                      href={sampleKitWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
                    >
                      Open WhatsApp Again
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setConsultSuccess(false);
                        setConsultationModalOpen(false);
                        setConsultName('');
                        setConsultEmail('');
                        setConsultNotes('');
                      }}
                      className="px-4 py-2 border border-light-outline-variant text-light-primary text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-light-surface-container cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
