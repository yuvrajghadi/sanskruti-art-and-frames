import React, { CSSProperties, useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  ArrowRight,
  Phone,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  SlidersHorizontal,
  FileText,
  Box,
  ChevronDown,
  Ruler,
  Eye,
} from 'lucide-react';
import { FRAME_SAMPLES } from '../data/frames';
import { FrameCategory, FrameSample } from '../types';
import { getMouldingFootRateINR, formatINR } from '../utils/pricing';
import { getIndianWhatsAppUrl, WHATSAPP_DISPLAY_PHONE } from '../utils/whatsapp';
import { saveLead } from '../utils/leadStorage';
import { LANDING_FAQS } from '../utils/seo';
import { useEditorialReveal } from '../hooks/useEditorialReveal';
import { Header } from './Header';
import { Footer } from './Footer';
import { FrameDetailModal } from './FrameDetailModal';

const revealStyle = (delayMs: number): CSSProperties =>
  ({ '--reveal-delay': `${delayMs}ms` }) as CSSProperties;

export type LandingNavigateTarget =
  | 'home'
  | 'catalog'
  | 'configure'
  | 'studio3d'
  | 'review'
  | 'quotations'
  | 'product'
  | 'wholesale';

interface LandingPageProps {
  onNavigateToConfigurator: (
    initialFrameId?: string,
    initialTab?: LandingNavigateTarget,
    initialCategory?: FrameCategory
  ) => void;
  savedQuotationsCount?: number;
  searchQuery?: string;
  onSearchQuery?: (query: string) => void;
}

interface CollectionCardConfig {
  id: string;
  title: string;
  subtitle: string;
  category: FrameCategory;
  imageSrc: string;
  alt: string;
}

const COLLECTION_CARDS: CollectionCardConfig[] = [
  {
    id: 'col-classic-wood',
    title: 'Classic Wooden Frames',
    subtitle: 'Hand-rubbed walnut, honey oak & ebony ash',
    category: 'classic-wood',
    imageSrc: '/mouldings/elegant-dark-wood-frame-with-gold-trim.png',
    alt: 'Solid dark walnut wooden frame corner detail with Florentine gold trim',
  },
  {
    id: 'col-antique-gold',
    title: 'Antique Gold Frames',
    subtitle: 'Burnished metal leaf, bronze & burgundy bole',
    category: 'antique-gilt',
    imageSrc: '/mouldings/ornate-antique-bronze-and-silver-frame.png',
    alt: 'Antique patinated bronze and burnished leaf picture frame profile',
  },
  {
    id: 'col-modern-minimalist',
    title: 'Modern Minimalist Frames',
    subtitle: 'Architectural brushed gold & gallery aluminum',
    category: 'modern-gallery',
    imageSrc: '/mouldings/brushed-gold-picture-frame-on-white.png',
    alt: 'Sleek brushed satin gold contemporary gallery frame moulding',
  },
  {
    id: 'col-decorative',
    title: 'Decorative Frames',
    subtitle: 'Sculpted baroque scrollwork & deep coves',
    category: 'ornate-gold',
    imageSrc: '/mouldings/ornate-antique-gold-baroque-frame.png',
    alt: 'Hand-carved ornate antique gold baroque decorative frame',
  },
  {
    id: 'col-gallery-collections',
    title: 'Gallery Collections',
    subtitle: 'Curated pairings across all 25 active profiles',
    category: 'all',
    imageSrc: '/interiors/space-gallery-wall.jpg',
    alt: 'Curated modern residence gallery wall showcasing four distinct frame finishes',
  },
];

interface InteriorSpaceCard {
  id: string;
  spaceLabel: string;
  headline: string;
  caption: string;
  imageSrc: string;
  alt: string;
  targetFrameId: string;
  aspectClass: string;
  width: number;
  height: number;
}

const INTERIOR_SPACES: InteriorSpaceCard[] = [
  {
    id: 'space-living',
    spaceLabel: 'Living Room',
    headline: 'Living Room Statements',
    caption: 'Warm walnut and antique bronze framing proportioned for wide seating walls.',
    imageSrc: '/interiors/hero-living-room.jpg',
    alt: 'Large walnut-and-bronze framed fine art painting above a warm sand linen sofa',
    targetFrameId: 'SAA-WGD-11',
    aspectClass: 'aspect-[16/10]',
    width: 1376,
    height: 768,
  },
  {
    id: 'space-bedroom',
    spaceLabel: 'Bedroom',
    headline: 'Minimalist Bedrooms',
    caption: 'Quiet natural timber and pale linen mats that preserve serene daylight.',
    imageSrc: '/interiors/space-bedroom.jpg',
    alt: 'Pair of natural oak framed botanical studies hanging above a minimalist linen bed',
    targetFrameId: 'SAA-EWG-12',
    aspectClass: 'aspect-[3/4]',
    width: 896,
    height: 1200,
  },
  {
    id: 'space-office',
    spaceLabel: 'Office',
    headline: 'Contemporary Studios & Offices',
    caption: 'Ebony hardwood with restrained brass reveal lines for quiet workspaces.',
    imageSrc: '/interiors/space-office.jpg',
    alt: 'Upright matte black and brass-fillet framed architectural composition in a private office',
    targetFrameId: 'SAA-BLK-10',
    aspectClass: 'aspect-[3/4]',
    width: 896,
    height: 1200,
  },
  {
    id: 'space-gallery',
    spaceLabel: 'Gallery Wall',
    headline: 'Curated Gallery Walls',
    caption: 'Harmonized finishes and wide cotton mats unified above timber consoles.',
    imageSrc: '/interiors/space-gallery-wall.jpg',
    alt: 'Four custom framed prints arranged harmoniously above a fluted oak console table',
    targetFrameId: 'SAA-BGD-08',
    aspectClass: 'aspect-[4/3]',
    width: 1200,
    height: 896,
  },
];

const FEATURED_FRAME_CONFIGS: Array<{
  sku: string;
  collectionTag: 'all' | 'ornate-gold' | 'classic-wood' | 'modern-gallery';
  aliasSku?: string;
}> = [
  { sku: 'SAA-AGB-15', collectionTag: 'ornate-gold', aliasSku: 'SA-BG-402' },
  { sku: 'SAA-AGP-16', collectionTag: 'ornate-gold', aliasSku: 'SA-AG-118' },
  { sku: 'SAA-MHG-23', collectionTag: 'classic-wood', aliasSku: 'SA-MG-204' },
  { sku: 'SAA-BVG-19', collectionTag: 'ornate-gold', aliasSku: 'SA-CB-309' },
  { sku: 'SAA-WGD-11', collectionTag: 'classic-wood' },
  { sku: 'SAA-BGD-08', collectionTag: 'modern-gallery' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToConfigurator,
  savedQuotationsCount = 0,
  searchQuery,
  onSearchQuery,
}) => {
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'ornate-gold' | 'classic-wood' | 'modern-gallery'>('all');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [studioPreviewTab, setStudioPreviewTab] = useState<'2d' | '3d'>('2d');

  // Inspection & Consultation Modals
  const [inspectingFrame, setInspectingFrame] = useState<FrameSample | null>(null);
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [consultName, setConsultName] = useState('');
  const [consultEmail, setConsultEmail] = useState('');
  const [consultNotes, setConsultNotes] = useState('');
  const [consultSuccess, setConsultSuccess] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  useEditorialReveal(mainRef, [featuredFilter]);

  useEffect(() => {
    if (!consultationModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConsultationModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [consultationModalOpen]);

  const featuredProducts = useMemo(() => {
    const resolved = FEATURED_FRAME_CONFIGS.map((cfg) => {
      const frame = FRAME_SAMPLES.find((f) => f.id === cfg.sku);
      return frame ? { ...cfg, frame } : null;
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (featuredFilter === 'all') return resolved;
    return resolved.filter((item) => item.collectionTag === featuredFilter);
  }, [featuredFilter]);

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
      skus: FEATURED_FRAME_CONFIGS.slice(0, 4).map((c) => c.sku),
      configurationUrl: typeof window !== 'undefined' ? window.location.href : '/',
      notes: consultNotes || 'Landing Page Trade Sample Kit enquiry',
    });
    setConsultSuccess(true);
    if (typeof window !== 'undefined') {
      window.open(sampleKitWhatsAppUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-light-surface text-light-on-surface font-body min-h-screen antialiased selection:bg-light-primary selection:text-light-on-primary">
      {/* ===================================================================== */}
      {/* HEADER (SHARED ACROSS ALL ROUTES)                                     */}
      {/* ===================================================================== */}
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

      <main ref={mainRef} className="flex-1">
        {/* =================================================================== */}
        {/* SECTION 1 — PREMIUM INTERIOR HERO                                   */}
        {/* =================================================================== */}
        <section
          id="home"
          className="relative overflow-hidden bg-[#F7F3EB] border-b border-light-outline-variant/60"
        >
          {/* Mobile Hero Clean Top Image (avoids busy text overlap on narrow phones) */}
          <div className="md:hidden w-full aspect-[16/10] bg-[#ECE8E0] overflow-hidden border-b border-light-outline-variant/50">
            <img
              src="/interiors/hero-living-room.jpg"
              alt="Sunlit luxury living room with walnut and bronze custom-framed landscape painting above a warm linen sofa"
              width={1376}
              height={768}
              decoding="sync"
              className="w-full h-full object-cover object-center atelier-hero-image"
              fetchPriority="high"
            />
          </div>

          <div className="relative md:min-h-[580px] lg:min-h-[680px] flex items-center overflow-hidden">
            <img
              src="/interiors/hero-living-room.jpg"
              alt="Sunlit luxury living room with walnut and bronze custom-framed landscape painting above a warm linen sofa"
              width={1376}
              height={768}
              decoding="sync"
              className="hidden md:block absolute inset-0 w-full h-full object-cover object-center atelier-hero-image"
              fetchPriority="high"
            />
            {/* Restrained warm ivory legibility scrim on desktop/tablet keeping art on right crisp */}
            <div
              aria-hidden="true"
              className="hidden md:block absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, rgba(253,249,241,0.97) 0%, rgba(253,249,241,0.91) 42%, rgba(253,249,241,0.58) 64%, rgba(253,249,241,0) 86%)',
              }}
            />

            <div className="relative z-10 max-w-[1360px] w-full mx-auto px-4 sm:px-gutter-lg md:px-page-margin py-10 sm:py-16 lg:py-24">
              <div className="max-w-xl space-y-5 sm:space-y-6">
                <div className="flex items-center gap-3 atelier-hero-eyebrow">
                  <span className="w-6 sm:w-8 h-px bg-accent inline-block shrink-0" aria-hidden="true" />
                  <span className="font-label text-[11px] sm:text-label-sm uppercase tracking-widest text-light-secondary font-semibold">
                    Sanskruti Arts Atelier · Custom Framing &amp; Mouldings
                  </span>
                </div>

                <h1 className="font-display text-[36px] leading-[1.08] sm:text-[52px] lg:text-[68px] text-light-primary tracking-tight text-balance atelier-hero-title">
                  Give Your Art a Place to Belong.
                </h1>

                <p className="font-body text-base sm:text-lg text-[#363B37] max-w-md leading-relaxed text-pretty atelier-hero-copy">
                  Thoughtfully crafted frames and custom framing solutions that bring your favourite artwork to life.
                </p>

                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-3.5 pt-2 atelier-hero-actions">
                  <button
                    type="button"
                    data-testid="hero-design-frame-cta"
                    onClick={() => onNavigateToConfigurator(undefined, 'configure')}
                    className="atelier-btn-glide min-h-[48px] inline-flex items-center justify-center gap-2 bg-light-primary text-light-on-primary px-7 py-3.5 rounded-sm font-label text-label-lg uppercase tracking-widest transition-all duration-state-change hover:bg-forest-deep hover:shadow-md active:scale-[0.985] shadow-xs cursor-pointer"
                  >
                    <span>Design Your Frame</span>
                    <ArrowRight className="w-4 h-4 atelier-arrow" />
                  </button>

                  <button
                    type="button"
                    data-testid="hero-explore-collections-cta"
                    onClick={() => onNavigateToConfigurator(undefined, 'catalog')}
                    className="min-h-[48px] inline-flex items-center justify-center border border-light-primary text-light-primary bg-[#FDF9F1]/90 hover:bg-light-primary hover:text-light-on-primary active:scale-[0.985] px-7 py-3.5 rounded-sm font-label text-label-lg uppercase tracking-widest transition-all duration-state-change cursor-pointer"
                  >
                    <span>Explore Collections</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-light-primary/15 flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1.5 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#4A4E49] atelier-hero-meta">
                  <span>{FRAME_SAMPLES.length} Curated Moulding Profiles</span>
                  <span aria-hidden="true">·</span>
                  <span>2D Blueprint &amp; 3D Studio</span>
                  <span aria-hidden="true">·</span>
                  <span>Mumbai &amp; Gujarat, India</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 2 — SHOP BY COLLECTION (5 ARCHITECTURAL PORTRAIT CARDS)     */}
        {/* =================================================================== */}
        <section
          id="collections"
          className="bg-light-surface py-16 sm:py-20 lg:py-24 border-b border-light-outline-variant/60"
        >
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
            <div
              data-reveal=""
              className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-light-outline-variant/60"
            >
              <div className="space-y-2">
                <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold block">
                  Architectural Directory
                </span>
                <h2 className="font-display text-display-lg-mobile lg:text-display-lg text-light-primary text-balance">
                  Shop by Collection
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToConfigurator(undefined, 'catalog')}
                className="font-label text-label-md uppercase tracking-widest text-light-primary hover:text-light-secondary underline self-start md:self-auto transition-colors duration-state-change cursor-pointer"
              >
                View All {FRAME_SAMPLES.length} Profiles →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {COLLECTION_CARDS.map((card, idx) => {
                const count =
                  card.category === 'all'
                    ? FRAME_SAMPLES.length
                    : FRAME_SAMPLES.filter((f) => f.category === card.category).length;
                const isInteriorCard = card.imageSrc.startsWith('/interiors/');

                return (
                  <button
                    key={card.id}
                    type="button"
                    data-testid={card.id}
                    data-reveal=""
                    style={revealStyle(idx * 75)}
                    onClick={() => onNavigateToConfigurator(undefined, 'catalog', card.category)}
                    className="group atelier-card-hover text-left bg-light-surface-container-lowest border border-light-outline-variant/70 hover:border-accent rounded-sm overflow-hidden flex flex-col cursor-pointer shadow-2xs hover:shadow-luxury active:scale-[0.99]"
                  >
                    <div
                      className={`relative aspect-[4/3] w-full overflow-hidden border-b border-light-outline-variant/50 ${
                        isInteriorCard
                          ? 'bg-[#ECE8E0]'
                          : 'bg-[#EFEAE0] p-4 sm:p-5 flex items-center justify-center'
                      }`}
                    >
                      {isInteriorCard ? (
                        <img
                          src={card.imageSrc}
                          alt={card.alt}
                          width={1200}
                          height={896}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover atelier-img-zoom"
                        />
                      ) : (
                        <div className="w-full bg-white p-2 border border-[#DFD8CA] shadow-[0_6px_18px_rgba(28,25,23,0.06)] atelier-img-zoom">
                          <img
                            src={card.imageSrc}
                            alt={card.alt}
                            width={1536}
                            height={1024}
                            loading="lazy"
                            decoding="async"
                            className="w-full aspect-[3/2] object-contain block"
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between gap-2">
                      <div>
                        <h3 className="font-headline text-xl text-light-primary group-hover:text-light-secondary transition-colors leading-snug">
                          {card.title}
                        </h3>
                        <p className="font-body text-xs text-light-on-surface-variant mt-1 leading-relaxed">
                          {card.subtitle}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-light-outline-variant/40 flex items-center justify-between font-mono text-[11px] text-light-secondary">
                        <span>{count} Profiles</span>
                        <ArrowRight className="w-3.5 h-3.5 atelier-arrow" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 3 — ART IN BEAUTIFUL SPACES (LIFESTYLE INTERIOR GRID)       */}
        {/* =================================================================== */}
        <section
          id="spaces"
          className="bg-light-surface-container-low py-16 sm:py-20 lg:py-24 border-b border-light-outline-variant/60"
        >
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
            <div data-reveal="" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-12">
              <div className="lg:col-span-7 space-y-2">
                <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold block">
                  Living Interiors
                </span>
                <h2 className="font-display text-display-lg-mobile lg:text-display-lg text-light-primary text-balance">
                  Art in Beautiful Spaces
                </h2>
              </div>
              <p className="lg:col-span-5 font-body text-body-md text-light-on-surface-variant leading-relaxed lg:text-right">
                Explore how proportion, timber tone, and archival matting bring calm visual balance across residential and private architectural spaces.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Row 1 Left: Living Room (7 cols landscape) */}
              <article className="md:col-span-7 group atelier-hover-group flex flex-col gap-3">
                <button
                  type="button"
                  data-reveal=""
                  onClick={() => onNavigateToConfigurator(INTERIOR_SPACES[0].targetFrameId, 'configure')}
                  className="w-full overflow-hidden border border-light-outline-variant/70 bg-white rounded-sm cursor-pointer block shadow-2xs hover:shadow-subtle-card transition-shadow duration-surface-enter"
                >
                  <img
                    src={INTERIOR_SPACES[0].imageSrc}
                    alt={INTERIOR_SPACES[0].alt}
                    width={INTERIOR_SPACES[0].width}
                    height={INTERIOR_SPACES[0].height}
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[16/10] object-cover atelier-img-zoom"
                  />
                </button>
                <div data-reveal="" style={revealStyle(85)} className="flex items-baseline justify-between gap-4 pt-1">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-light-secondary font-bold">
                      {INTERIOR_SPACES[0].spaceLabel}
                    </span>
                    <h3 className="font-headline text-2xl text-light-primary">
                      {INTERIOR_SPACES[0].headline}
                    </h3>
                    <p className="font-body text-sm text-light-on-surface-variant mt-0.5">
                      {INTERIOR_SPACES[0].caption}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToConfigurator(INTERIOR_SPACES[0].targetFrameId, 'configure')}
                    className="font-label text-xs uppercase tracking-widest text-light-primary border-b border-accent pb-0.5 shrink-0 hover:text-light-secondary transition-colors cursor-pointer"
                  >
                    Try Pairing →
                  </button>
                </div>
              </article>

              {/* Row 1 Right: Bedroom (5 cols portrait) */}
              <article className="md:col-span-5 group atelier-hover-group flex flex-col gap-3">
                <button
                  type="button"
                  data-reveal=""
                  style={revealStyle(100)}
                  onClick={() => onNavigateToConfigurator(INTERIOR_SPACES[1].targetFrameId, 'configure')}
                  className="w-full overflow-hidden border border-light-outline-variant/70 bg-white rounded-sm cursor-pointer block shadow-2xs hover:shadow-subtle-card transition-shadow duration-surface-enter"
                >
                  <img
                    src={INTERIOR_SPACES[1].imageSrc}
                    alt={INTERIOR_SPACES[1].alt}
                    width={INTERIOR_SPACES[1].width}
                    height={INTERIOR_SPACES[1].height}
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[4/5] sm:aspect-[3/4] md:aspect-[4/4] lg:aspect-[5/4] object-cover atelier-img-zoom"
                  />
                </button>
                <div data-reveal="" style={revealStyle(175)} className="flex items-baseline justify-between gap-4 pt-1">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-light-secondary font-bold">
                      {INTERIOR_SPACES[1].spaceLabel}
                    </span>
                    <h3 className="font-headline text-2xl text-light-primary">
                      {INTERIOR_SPACES[1].headline}
                    </h3>
                    <p className="font-body text-sm text-light-on-surface-variant mt-0.5">
                      {INTERIOR_SPACES[1].caption}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToConfigurator(INTERIOR_SPACES[1].targetFrameId, 'configure')}
                    className="font-label text-xs uppercase tracking-widest text-light-primary border-b border-accent pb-0.5 shrink-0 hover:text-light-secondary transition-colors cursor-pointer"
                  >
                    Try Pairing →
                  </button>
                </div>
              </article>

              {/* Row 2 Left: Office (5 cols upright) */}
              <article className="md:col-span-5 group atelier-hover-group flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  data-reveal=""
                  onClick={() => onNavigateToConfigurator(INTERIOR_SPACES[2].targetFrameId, 'configure')}
                  className="w-full overflow-hidden border border-light-outline-variant/70 bg-white rounded-sm cursor-pointer block shadow-2xs hover:shadow-subtle-card transition-shadow duration-surface-enter"
                >
                  <img
                    src={INTERIOR_SPACES[2].imageSrc}
                    alt={INTERIOR_SPACES[2].alt}
                    width={INTERIOR_SPACES[2].width}
                    height={INTERIOR_SPACES[2].height}
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[4/4] lg:aspect-[5/4] object-cover atelier-img-zoom"
                  />
                </button>
                <div data-reveal="" style={revealStyle(85)} className="flex items-baseline justify-between gap-4 pt-1">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-light-secondary font-bold">
                      {INTERIOR_SPACES[2].spaceLabel}
                    </span>
                    <h3 className="font-headline text-2xl text-light-primary">
                      {INTERIOR_SPACES[2].headline}
                    </h3>
                    <p className="font-body text-sm text-light-on-surface-variant mt-0.5">
                      {INTERIOR_SPACES[2].caption}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToConfigurator(INTERIOR_SPACES[2].targetFrameId, 'configure')}
                    className="font-label text-xs uppercase tracking-widest text-light-primary border-b border-accent pb-0.5 shrink-0 hover:text-light-secondary transition-colors cursor-pointer"
                  >
                    Try Pairing →
                  </button>
                </div>
              </article>

              {/* Row 2 Right: Gallery Wall (7 cols wide) */}
              <article className="md:col-span-7 group atelier-hover-group flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  data-reveal=""
                  style={revealStyle(100)}
                  onClick={() => onNavigateToConfigurator(INTERIOR_SPACES[3].targetFrameId, 'configure')}
                  className="w-full overflow-hidden border border-light-outline-variant/70 bg-white rounded-sm cursor-pointer block shadow-2xs hover:shadow-subtle-card transition-shadow duration-surface-enter"
                >
                  <img
                    src={INTERIOR_SPACES[3].imageSrc}
                    alt={INTERIOR_SPACES[3].alt}
                    width={INTERIOR_SPACES[3].width}
                    height={INTERIOR_SPACES[3].height}
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[16/10] object-cover atelier-img-zoom"
                  />
                </button>
                <div data-reveal="" style={revealStyle(175)} className="flex items-baseline justify-between gap-4 pt-1">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-light-secondary font-bold">
                      {INTERIOR_SPACES[3].spaceLabel}
                    </span>
                    <h3 className="font-headline text-2xl text-light-primary">
                      {INTERIOR_SPACES[3].headline}
                    </h3>
                    <p className="font-body text-sm text-light-on-surface-variant mt-0.5">
                      {INTERIOR_SPACES[3].caption}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToConfigurator(INTERIOR_SPACES[3].targetFrameId, 'configure')}
                    className="font-label text-xs uppercase tracking-widest text-light-primary border-b border-accent pb-0.5 shrink-0 hover:text-light-secondary cursor-pointer"
                  >
                    Try Pairing →
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 4 — FEATURED FRAMES (REAL ACTIVE CATALOGUE SKUS)            */}
        {/* =================================================================== */}
        <section
          id="featured-frames"
          className="bg-light-surface py-16 sm:py-20 lg:py-24 border-b border-light-outline-variant/60"
        >
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
            <div data-reveal="" className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 pb-6 border-b border-light-outline-variant/60">
              <div className="space-y-2">
                <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold block">
                  Workshop Originals
                </span>
                <h2 className="font-display text-display-lg-mobile lg:text-display-lg text-light-primary text-balance">
                  Featured Frames
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-4" role="tablist" aria-label="Filter featured frames">
                {[
                  { id: 'all', label: 'All Featured' },
                  { id: 'ornate-gold', label: 'Ornate Gold' },
                  { id: 'classic-wood', label: 'Hardwood' },
                  { id: 'modern-gallery', label: 'Modern Gallery' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={featuredFilter === tab.id}
                    onClick={() => setFeaturedFilter(tab.id as typeof featuredFilter)}
                    className={`font-label text-xs uppercase tracking-widest pb-1.5 border-b-2 transition-colors cursor-pointer ${
                      featuredFilter === tab.id
                        ? 'text-light-primary border-accent font-bold'
                        : 'text-light-on-surface-variant border-transparent hover:text-light-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {featuredProducts.map(({ frame, aliasSku }, idx) => {
                const rateINR = getMouldingFootRateINR(frame);
                return (
                  <article
                    key={frame.id}
                    data-testid={`featured-frame-${frame.id}`}
                    data-reveal=""
                    style={revealStyle((idx % 3) * 85)}
                    className="group atelier-card-hover bg-light-surface-container-lowest border border-light-outline-variant/70 hover:border-accent rounded-sm overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-luxury"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => onNavigateToConfigurator(frame.id, 'product')}
                        className="w-full block bg-[#EFEAE0] p-4 sm:p-5 border-b border-light-outline-variant/50 overflow-hidden cursor-pointer"
                        aria-label={`View Details for ${frame.name}`}
                      >
                        <div className="w-full bg-white p-2 border border-[#DFD8CA] shadow-[0_6px_18px_rgba(28,25,23,0.06)] atelier-img-zoom">
                          <img
                            src={frame.thumbnailUrl}
                            alt={`${frame.name} (#${frame.id}) Workshop Sample`}
                            width={1536}
                            height={1024}
                            loading="lazy"
                            decoding="async"
                            className="w-full aspect-[3/2] object-contain block"
                          />
                        </div>
                      </button>

                      <div className="p-5 space-y-2">
                        <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-light-secondary">
                          <span className="font-bold">
                            SKU: #{frame.id}
                            {aliasSku ? ` (${aliasSku})` : ''}
                          </span>
                          <span className="whitespace-nowrap">
                            {frame.profileWidth.toFixed(2)}″ face · {frame.depth.toFixed(2)}″ depth
                          </span>
                        </div>

                        <h3 className="font-headline text-2xl text-light-primary leading-snug">
                          {frame.name}
                        </h3>

                        <p className="font-body text-xs text-light-on-surface-variant line-clamp-2 leading-relaxed">
                          {frame.finish} — {frame.material}.
                        </p>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-3 border-t border-light-outline-variant/40 flex flex-wrap items-center justify-between gap-2">
                      <div className="whitespace-nowrap">
                        <span className="font-headline text-xl sm:text-2xl font-semibold text-light-primary">
                          {formatINR(rateINR)}
                        </span>
                        <span className="font-mono text-[11px] text-light-secondary"> / linear ft</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onNavigateToConfigurator(frame.id, 'product')}
                          className="min-h-[38px] px-2.5 sm:px-3 py-2 border border-light-primary text-light-primary hover:bg-light-primary hover:text-light-on-primary active:scale-[0.98] rounded-sm font-label text-[10px] sm:text-[11px] uppercase tracking-[0.09em] whitespace-nowrap transition-all duration-state-change cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateToConfigurator(frame.id, 'configure')}
                          className="min-h-[38px] px-2.5 py-2 text-light-secondary hover:text-light-primary active:scale-[0.98] font-label text-[10px] sm:text-[11px] uppercase tracking-[0.09em] whitespace-nowrap underline transition-all duration-state-change cursor-pointer"
                        >
                          Customize
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 5 — CUSTOM FRAMING EXPERIENCE (2D & 3D STUDIO PREVIEW)      */}
        {/* =================================================================== */}
        <section
          id="custom-framing"
          className="bg-light-surface-container-low py-16 sm:py-20 lg:py-24 border-b border-light-outline-variant/60"
        >
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Copy Column */}
              <div data-reveal="" className="lg:col-span-5 space-y-6 order-2 lg:order-1">
                <div className="space-y-3">
                  <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold block">
                    Interactive 2D &amp; 3D Studio
                  </span>
                  <h2 className="font-display text-display-lg-mobile lg:text-display-lg text-light-primary leading-tight text-balance">
                    Your Artwork. Your Frame. Your Vision.
                  </h2>
                  <p className="font-body text-body-md text-light-on-surface-variant leading-relaxed text-pretty">
                    Upload your own artwork or painting, choose portrait, landscape, or square proportions in inches or centimeters, compare neutral wall palettes, and inspect every corner miter live in 2D elevation and 3D WebGL lighting.
                  </p>
                </div>

                {/* Interactive Mode Preview Switcher */}
                <div className="bg-white border border-light-outline-variant/70 p-4 rounded-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-light-secondary font-bold">
                      Dual Studio Modes
                    </span>
                    <div className="inline-flex border border-light-outline-variant/70 rounded-sm p-0.5 bg-light-surface-container-low">
                      <button
                        type="button"
                        onClick={() => setStudioPreviewTab('2d')}
                        className={`px-3 py-1 text-[11px] font-mono uppercase rounded-xs transition-colors cursor-pointer ${
                          studioPreviewTab === '2d'
                            ? 'bg-light-primary text-light-on-primary font-bold'
                            : 'text-light-on-surface-variant hover:text-light-primary'
                        }`}
                      >
                        2D Elevation
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudioPreviewTab('3d')}
                        className={`px-3 py-1 text-[11px] font-mono uppercase rounded-xs transition-colors cursor-pointer ${
                          studioPreviewTab === '3d'
                            ? 'bg-light-primary text-light-on-primary font-bold'
                            : 'text-light-on-surface-variant hover:text-light-primary'
                        }`}
                      >
                        3D Perspective
                      </button>
                    </div>
                  </div>
                  <p className="font-body text-xs text-light-on-surface-variant leading-relaxed">
                    {studioPreviewTab === '2d'
                      ? 'Measure exact sightline opening and finished wall footprint with 8-ply cotton rag matboard borders and realistic flat lighting.'
                      : 'Orbit miter joints in real-time Three.js lighting across halogen (3000K), daylight (5500K), and antique candle glow (2400K).'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3.5 pt-1">
                  <button
                    type="button"
                    data-testid="studio-start-cta"
                    onClick={() =>
                      onNavigateToConfigurator(undefined, studioPreviewTab === '3d' ? 'studio3d' : 'configure')
                    }
                    className="atelier-btn-glide min-h-[48px] inline-flex items-center justify-center gap-2 bg-light-primary text-light-on-primary px-8 py-3.5 rounded-sm font-label text-label-lg uppercase tracking-widest hover:bg-forest-deep hover:shadow-md active:scale-[0.985] transition-all duration-state-change shadow-xs cursor-pointer"
                  >
                    <span>Start Custom Framing</span>
                    <ArrowRight className="w-4 h-4 atelier-arrow" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateToConfigurator(undefined, 'studio3d')}
                    className="min-h-[48px] inline-flex items-center justify-center gap-2 border border-light-outline-variant bg-white text-light-primary hover:border-accent active:scale-[0.985] px-6 py-3.5 rounded-sm font-label text-xs uppercase tracking-widest transition-all duration-state-change cursor-pointer"
                  >
                    <Box className="w-4 h-4 text-accent" />
                    <span>Launch 3D Studio</span>
                  </button>
                </div>
              </div>

              {/* Right Interactive Visual Preview Composition */}
              <div data-reveal="fade" style={revealStyle(110)} className="lg:col-span-7 order-1 lg:order-2">
                <div className="bg-white border border-light-outline-variant/70 p-4 sm:p-6 rounded-sm shadow-subtle-card space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-light-outline-variant/50 font-mono text-[11px] text-light-on-surface-variant">
                    <span className="flex items-center gap-1.5 text-light-primary font-bold">
                      {studioPreviewTab === '3d' ? (
                        <Box className="w-3.5 h-3.5 text-accent" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-accent" />
                      )}
                      <span>
                        {studioPreviewTab === '3d' ? '3D WebGL Lighting Studio Preview' : '2D Architectural Studio Preview'}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-accent" />
                      <span>Scale 1:1 Proportions · IN / CM</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-light-surface-container-low p-4 border border-light-outline-variant/40">
                    <div className="sm:col-span-8 bg-[#EFEAE0] p-2.5 sm:p-3 border border-[#DFD8CA]">
                      <div className="bg-white p-2 border border-[#DFD8CA] shadow-[0_6px_18px_rgba(28,25,23,0.06)]">
                        <img
                          src={
                            studioPreviewTab === '3d'
                              ? '/mouldings/ornate-mahogany-and-gold-frame.png'
                              : '/mouldings/ornate-empty-antique-gold-frame.png'
                          }
                          alt={
                            studioPreviewTab === '3d'
                              ? 'Rich mahogany and gold fillet moulding detail ready for 3D perspective studio preview'
                              : 'Ornate antique gold frame moulding shown with gallery lighting in 2D configurator'
                          }
                          width={1536}
                          height={1024}
                          loading="lazy"
                          decoding="async"
                          className="w-full aspect-[3/2] object-contain block"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-4 space-y-3 font-mono text-xs">
                      <div className="bg-white p-3 border border-light-outline-variant/60">
                        <span className="text-[10px] uppercase text-light-secondary block">Orientation</span>
                        <span className="font-bold text-light-primary">Portrait · Landscape · Square</span>
                      </div>
                      <div className="bg-white p-3 border border-light-outline-variant/60">
                        <span className="text-[10px] uppercase text-light-secondary block">Archival Matting</span>
                        <span className="font-bold text-light-primary">Cotton Rag · Linen · Full Bleed</span>
                      </div>
                      <div className="bg-white p-3 border border-light-outline-variant/60">
                        <span className="text-[10px] uppercase text-light-secondary block">Glazing Options</span>
                        <span className="font-bold text-light-primary">Museum UV · UltraVue · Lucite</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 6 — OUR CRAFTSMANSHIP (WORKSHOP IMAGERY & HONEST SPECS)     */}
        {/* =================================================================== */}
        <section
          id="craftsmanship"
          className="bg-forest-deep text-light-on-primary py-16 sm:py-20 lg:py-24 border-b border-accent/30"
        >
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div data-reveal="" className="lg:col-span-7">
                <div className="border border-accent/40 p-2 sm:p-3 bg-light-primary/40 overflow-hidden">
                  <img
                    src="/interiors/craft-atelier-workshop.jpg"
                    alt="Sanskruti Arts framing workbench with precision 45-degree mitered corner chevrons, archival matboard chips, and brass calipers"
                    width={1200}
                    height={896}
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[4/3] object-cover"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                <div data-reveal="" style={revealStyle(80)} className="space-y-2.5">
                  <span className="font-label text-label-sm uppercase tracking-widest text-bronze-bright font-semibold block">
                    Our Craftsmanship
                  </span>
                  <h2 className="font-display text-display-lg-mobile lg:text-display-lg text-light-on-primary leading-tight text-balance">
                    Measured Joinery. Honest Finishes.
                  </h2>
                  <p className="font-body text-body-md text-light-on-primary-container leading-relaxed text-pretty">
                    From architectural wall profiles to heirloom baronial carvings, every moulding length is cut and finished to maintain consistent shadow relief and corner alignment.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-accent/30">
                  <div data-reveal="" style={revealStyle(120)} className="space-y-1">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-bronze-bright font-bold block">
                      01 · Frame Construction
                    </span>
                    <p className="font-body text-xs text-light-on-primary-container leading-relaxed">
                      Clean 45-degree mitred corner joinery engineered with calibrated rabbet depths.
                    </p>
                  </div>
                  <div data-reveal="" style={revealStyle(180)} className="space-y-1">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-bronze-bright font-bold block">
                      02 · Materials &amp; Finishes
                    </span>
                    <p className="font-body text-xs text-light-on-primary-container leading-relaxed">
                      Seasoned hardwoods, anodized structural metals, hand-rubbed walnut, and antique leaf tones.
                    </p>
                  </div>
                  <div data-reveal="" style={revealStyle(240)} className="space-y-1">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-bronze-bright font-bold block">
                      03 · Custom Sizing
                    </span>
                    <p className="font-body text-xs text-light-on-primary-container leading-relaxed">
                      Calculated to exact inch and centimeter sightlines with custom cotton rag mat widths.
                    </p>
                  </div>
                  <div data-reveal="" style={revealStyle(300)} className="space-y-1">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-bronze-bright font-bold block">
                      04 · Attention to Detail
                    </span>
                    <p className="font-body text-xs text-light-on-primary-container leading-relaxed">
                      Paired with archival backing, French cleat hardware, and crated inspection prior to dispatch.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 7 — HOW IT WORKS (4 CLEAR STEPS)                            */}
        {/* =================================================================== */}
        <section
          id="how-it-works"
          className="bg-light-surface py-16 sm:py-20 lg:py-24 border-b border-light-outline-variant/60"
        >
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
            <div data-reveal="" className="max-w-2xl mb-12 space-y-2">
              <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold block">
                Framing Process
              </span>
              <h2 className="font-display text-display-lg-mobile lg:text-display-lg text-light-primary text-balance">
                How It Works
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {[
                {
                  step: '01',
                  title: 'Choose Your Artwork',
                  desc: 'Upload a personal photo or painting, or preview with our studio gallery studies.',
                  Icon: ImageIcon,
                },
                {
                  step: '02',
                  title: 'Select Your Frame',
                  desc: 'Compare classic timber, antique gold leaf, decorative baroque, and minimalist profiles.',
                  Icon: Layers,
                },
                {
                  step: '03',
                  title: 'Customize Your Design',
                  desc: 'Adjust orientation, dimensions, cotton mat borders, and UV glazing in live 2D and 3D.',
                  Icon: SlidersHorizontal,
                },
                {
                  step: '04',
                  title: 'Request Your Quotation',
                  desc: 'Generate a printable A4 specification dossier or send your exact specs to WhatsApp.',
                  Icon: FileText,
                },
              ].map(({ step, title, desc, Icon }, idx) => (
                <div
                  key={step}
                  data-reveal=""
                  style={revealStyle(idx * 75)}
                  className="bg-light-surface-container-low border-t-2 border-accent border-x border-b border-x-light-outline-variant/50 border-b-light-outline-variant/50 p-6 flex flex-col gap-3 rounded-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-light-secondary">
                      STEP {step}
                    </span>
                    <Icon className="w-5 h-5 text-accent" aria-hidden="true" />
                  </div>
                  <h3 className="font-headline text-2xl text-light-primary font-semibold leading-snug">
                    {title}
                  </h3>
                  <p className="font-body text-sm text-light-on-surface-variant leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 8 — WHOLESALE AND TRADE (DESIGNERS, GALLERIES & STUDIOS)    */}
        {/* =================================================================== */}
        <section
          id="wholesale-trade"
          className="bg-light-surface-container-low py-16 sm:py-20 lg:py-24 border-b border-light-outline-variant/60"
        >
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
            <div className="bg-white border border-light-outline-variant/70 p-6 sm:p-10 lg:p-14 rounded-sm shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div data-reveal="" className="lg:col-span-7 space-y-5">
                <div className="space-y-2">
                  <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold block">
                    B2B Trade &amp; Interior Specifiers
                  </span>
                  <h2 className="font-display text-display-lg-mobile lg:text-display-lg text-light-primary text-balance leading-tight">
                    Designed for Interior Designers, Galleries &amp; Framing Studios.
                  </h2>
                </div>

                <p className="font-body text-body-md text-light-on-surface-variant leading-relaxed max-w-prose">
                  Order sealed workshop cartons (9.0 ft and 9.5 ft sticks, 90–228 linear ft per carton) with transparent volume tier discounts, 2-day dispatch readiness, physical corner chevron sample kits, and GST billing under HSN 4414.
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <button
                    type="button"
                    data-testid="wholesale-explore-cta"
                    onClick={() => onNavigateToConfigurator(undefined, 'wholesale')}
                    className="atelier-btn-glide min-h-[48px] inline-flex items-center justify-center gap-2 bg-light-primary text-light-on-primary px-7 py-3.5 rounded-sm font-label text-label-lg uppercase tracking-widest hover:bg-forest-deep hover:shadow-md active:scale-[0.985] transition-all duration-state-change shadow-xs cursor-pointer"
                  >
                    <span>Explore Wholesale Collections</span>
                    <ArrowRight className="w-4 h-4 atelier-arrow" />
                  </button>

                  <button
                    type="button"
                    data-testid="trade-sample-kit-cta"
                    onClick={() => setConsultationModalOpen(true)}
                    className="min-h-[48px] inline-flex items-center justify-center border border-light-primary text-light-primary bg-transparent hover:bg-light-primary hover:text-light-on-primary active:scale-[0.985] px-7 py-3.5 rounded-sm font-label text-label-lg uppercase tracking-widest transition-all duration-state-change cursor-pointer"
                  >
                    <span>Request Sample Kit</span>
                  </button>
                </div>
              </div>

              <div data-reveal="fade" style={revealStyle(100)} className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
                <div className="bg-light-surface-container-low p-4 border border-light-outline-variant/60 rounded-sm">
                  <span className="font-mono text-[11px] uppercase text-light-secondary font-bold block">
                    Carton Supply &amp; Tier Pricing
                  </span>
                  <span className="font-headline text-xl text-light-primary font-semibold block mt-0.5">
                    12% – 25% Trade Volume Discounts
                  </span>
                </div>
                <div className="bg-light-surface-container-low p-4 border border-light-outline-variant/60 rounded-sm">
                  <span className="font-mono text-[11px] uppercase text-light-secondary font-bold block">
                    Workshop Sample Program
                  </span>
                  <span className="font-headline text-xl text-light-primary font-semibold block mt-0.5">
                    6 Hand-Finished Mitered Corner Chevrons
                  </span>
                </div>
                <div className="bg-light-surface-container-low p-4 border border-light-outline-variant/60 rounded-sm sm:col-span-2 lg:col-span-1">
                  <span className="font-mono text-[11px] uppercase text-light-secondary font-bold block">
                    Documentation &amp; Dispatch
                  </span>
                  <span className="font-headline text-xl text-light-primary font-semibold block mt-0.5">
                    HSN 4414 GST Invoicing · 2-Day Box Dispatch
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 9 — FINAL EDITORIAL CTA                                     */}
        {/* =================================================================== */}
        <section
          id="final-cta"
          className="relative overflow-hidden bg-[#F7F3EB] border-b border-light-outline-variant/60"
        >
          <div className="md:hidden w-full aspect-[16/10] bg-[#ECE8E0] overflow-hidden border-b border-light-outline-variant/50">
            <img
              src="/interiors/final-cta-console.jpg"
              alt="Statement walnut-and-gold framed painting hanging above a dark oak console in a serene sunlit hallway"
              width={1376}
              height={768}
              loading="lazy"
              decoding="async"
              data-reveal="image-zoom"
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="relative md:min-h-[460px] lg:min-h-[520px] flex items-center overflow-hidden">
            <img
              src="/interiors/final-cta-console.jpg"
              alt="Statement walnut-and-gold framed painting hanging above a dark oak console in a serene sunlit hallway"
              width={1376}
              height={768}
              loading="lazy"
              decoding="async"
              data-reveal="image-zoom"
              className="hidden md:block absolute inset-0 w-full h-full object-cover object-center"
            />
            <div
              aria-hidden="true"
              className="hidden md:block absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, rgba(253,249,241,0.97) 0%, rgba(253,249,241,0.89) 42%, rgba(253,249,241,0.55) 64%, rgba(253,249,241,0) 85%)',
              }}
            />

            <div className="relative z-10 max-w-[1360px] w-full mx-auto px-4 sm:px-gutter-lg md:px-page-margin py-10 sm:py-16 lg:py-20">
              <div data-reveal="" style={revealStyle(90)} className="max-w-lg space-y-5">
                <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold block">
                  Sanskruti Arts Atelier
                </span>
                <h2 className="font-display text-display-lg-mobile sm:text-display-lg text-light-primary leading-tight text-balance">
                  Make Your Walls More Personal.
                </h2>
                <p className="font-body text-base text-[#363B37] leading-relaxed">
                  Explore authentic decorative mouldings crafted in India or preview your artwork framed in real-time proportions.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3.5 pt-2">
                  <button
                    type="button"
                    data-testid="final-explore-cta"
                    onClick={() => onNavigateToConfigurator(undefined, 'catalog')}
                    className="atelier-btn-glide min-h-[48px] inline-flex items-center justify-center gap-2 bg-light-primary text-light-on-primary px-8 py-3.5 rounded-sm font-label text-label-lg uppercase tracking-widest hover:bg-forest-deep hover:shadow-md active:scale-[0.985] transition-all duration-state-change shadow-xs cursor-pointer"
                  >
                    <span>Explore Sanskruti Arts</span>
                    <ArrowRight className="w-4 h-4 atelier-arrow" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* COMPACT EDITORIAL FAQ (MATCHING FAQPAGE JSON-LD SCHEMA)             */}
        {/* =================================================================== */}
        <section id="faq" className="bg-light-surface py-14 sm:py-16 border-b border-light-outline-variant/60">
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-4 space-y-2">
                <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary font-semibold block">
                  Framing &amp; Trade Guidance
                </span>
                <h2 className="font-headline text-headline-lg-mobile lg:text-headline-lg text-light-primary">
                  Common Questions
                </h2>
              </div>
              <div className="lg:col-span-8 divide-y divide-light-outline-variant/60 border-t border-b border-light-outline-variant/60">
                {LANDING_FAQS.map((faq, idx) => {
                  const isOpen = openFaqIdx === idx;
                  return (
                    <div key={faq.question} className="py-4">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between gap-4 text-left font-headline text-xl text-light-primary font-semibold cursor-pointer"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-light-secondary shrink-0 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <p className="font-body text-sm text-light-on-surface-variant leading-relaxed mt-2.5 pr-6">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===================================================================== */}
      {/* SECTION 10 — SHARED FOOTER                                            */}
      {/* ===================================================================== */}
      <Footer
        onNavigateHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onNavigateCatalog={() => onNavigateToConfigurator(undefined, 'catalog')}
        onNavigateConfigurator={() => onNavigateToConfigurator(undefined, 'configure')}
        onNavigateStudio={() => onNavigateToConfigurator(undefined, 'studio3d')}
        onNavigateReview={() => onNavigateToConfigurator(undefined, 'review')}
        onNavigateQuotations={() => onNavigateToConfigurator(undefined, 'quotations')}
      />

      {/* MODAL 1: PROFILE SPECIFICATION MODAL */}
      <FrameDetailModal
        frame={inspectingFrame}
        isSelected={false}
        onSelect={(frame) => {
          setInspectingFrame(null);
          onNavigateToConfigurator(frame.id, 'configure');
        }}
        onClose={() => setInspectingFrame(null)}
      />

      {/* MODAL 2: TRADE SAMPLE KIT & ENQUIRY MODAL */}
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
                  <div className="p-3.5 bg-[#25D366]/10 border border-[#25D366]/30 rounded-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#1B5E20]">Direct Workshop WhatsApp</p>
                      <p className="text-[11px] text-[#2E7D32]">Chat with our framers on {WHATSAPP_DISPLAY_PHONE}</p>
                    </div>
                    <a
                      href={getIndianWhatsAppUrl('Hello Sanskruti Arts, I am requesting physical sample kit chevrons for my studio/gallery.')}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        saveLead({
                          leadType: 'sample_kit',
                          clientName: 'Trade Sample Direct Visitor',
                          skus: FEATURED_FRAME_CONFIGS.slice(0, 4).map((c) => c.sku),
                          configurationUrl: typeof window !== 'undefined' ? window.location.href : '/',
                          notes: 'Direct WhatsApp Trade Sample banner click',
                        })
                      }
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
