import React, { useState, useMemo, useEffect } from 'react';
import { FrameSample, FrameCategory } from '../types';
import { getWholesaleItemForFrame } from '../data/wholesale';
import { getWhatsAppNumber } from '../utils/whatsapp';
import { getMouldingFootRateINR } from '../utils/pricing';
import { resolveProfile } from '../utils/productMapping';
import { 
  Search, 
  Check, 
  Eye, 
  ArrowRight, 
  Sparkles, 
  Camera, 
  RotateCcw,
  Box,
  Truck,
  MessageCircle,
  SlidersHorizontal,
  ShieldCheck,
  ChevronDown,
  X
} from 'lucide-react';

interface SidebarCatalogProps {
  frames: FrameSample[];
  selectedFrame: FrameSample | null;
  onSelectFrame: (frame: FrameSample) => void;
  onInspectFrame: (frame: FrameSample) => void;
  onProceedToConfigure?: (frame?: FrameSample) => void;
  onResetStorage?: () => void;
  onNavigateHome?: () => void;
  externalSearchQuery?: string;
  onExternalSearchChange?: (query: string) => void;
  isFullView?: boolean;
}

type SortOption = 'default' | 'name-asc' | 'price-asc' | 'price-desc' | 'width-asc' | 'width-desc';

export const SidebarCatalog: React.FC<SidebarCatalogProps> = ({
  frames,
  selectedFrame,
  onSelectFrame,
  onInspectFrame,
  onProceedToConfigure,
  onResetStorage,
  onNavigateHome,
  externalSearchQuery,
  onExternalSearchChange,
  isFullView = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<FrameCategory>('all');
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [isWholesaleMode, setIsWholesaleMode] = useState<boolean>(false);
  const [isSampleKitModalOpen, setIsSampleKitModalOpen] = useState(false);
  const [kitForm, setKitForm] = useState({ name: '', organization: '', city: '', phone: '' });

  useEffect(() => {
    if (!isSampleKitModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSampleKitModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSampleKitModalOpen]);

  // Synchronize external global header search queries into catalogue search state
  useEffect(() => {
    if (typeof externalSearchQuery === 'string' && externalSearchQuery !== searchQuery) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  const updateSearchQuery = (nextQuery: string) => {
    setSearchQuery(nextQuery);
    onExternalSearchChange?.(nextQuery);
  };

  // Workshop samples count
  const workshopCount = useMemo(() => frames.filter(f => f.isWorkshopSample).length, [frames]);

  // Filtered & Sorted frames
  const filteredAndSortedFrames = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const aliasMatched = query ? resolveProfile(query, frames) : undefined;

    const filtered = frames.filter((frame) => {
      const matchesCategory =
        activeCategory === 'all' ||
        (activeCategory === 'workshop' ? Boolean(frame.isWorkshopSample) : frame.category === activeCategory);
      
      if (!query) return matchesCategory;

      const matchesSearch =
        frame.name.toLowerCase().includes(query) ||
        frame.id.toLowerCase().includes(query) ||
        frame.finish.toLowerCase().includes(query) ||
        frame.style.toLowerCase().includes(query) ||
        frame.material.toLowerCase().includes(query) ||
        (aliasMatched ? aliasMatched.id === frame.id : false);

      return matchesCategory && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'price-asc':
          return getMouldingFootRateINR(a) - getMouldingFootRateINR(b);
        case 'price-desc':
          return getMouldingFootRateINR(b) - getMouldingFootRateINR(a);
        case 'width-asc':
          return a.profileWidth - b.profileWidth;
        case 'width-desc':
          return b.profileWidth - a.profileWidth;
        case 'default':
        default:
          // Keep workshop samples prioritized at the top, then default order
          if (a.isWorkshopSample && !b.isWorkshopSample) return -1;
          if (!a.isWorkshopSample && b.isWorkshopSample) return 1;
          return 0;
      }
    });
  }, [frames, activeCategory, searchQuery, sortOption]);

  const categories = [
    { id: 'all', label: 'All Mouldings', count: frames.length },
    { id: 'workshop', label: 'Workshop Originals', count: workshopCount },
    { id: 'ornate-gold', label: 'Ornate Gold', count: frames.filter(f => f.category === 'ornate-gold').length },
    { id: 'classic-wood', label: 'Classic Hardwood', count: frames.filter(f => f.category === 'classic-wood').length },
    { id: 'antique-gilt', label: 'Venetian & Antique Gilt', count: frames.filter(f => f.category === 'antique-gilt').length },
    { id: 'modern-gallery', label: 'Modern Gallery', count: frames.filter(f => f.category === 'modern-gallery').length },
  ];

  const handleKitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = `Namaste Sanskruti Arts! I would like to request an Architect's Trade Sample Kit:\n\n• Name: ${kitForm.name}\n• Studio/Firm: ${kitForm.organization || 'Independent'}\n• City: ${kitForm.city}\n• Contact: ${kitForm.phone}\n\nPlease share kit details and courier tracking information.`;
    window.open(`https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(msg)}`, '_blank');
    setIsSampleKitModalOpen(false);
  };

  return (
    <div className={`flex flex-col bg-light-surface ${isFullView ? 'min-h-screen w-full' : 'w-full lg:w-[410px] xl:w-[450px] flex-shrink-0 border-r border-light-outline-variant/60'}`}>
      
      {/* ========================================================================= */}
      {/* 1. ATELIER EDITORIAL BANNER (Full View Only)                               */}
      {/* ========================================================================= */}
      {isFullView && (
        <section className="bg-light-surface-container-low border-b border-light-outline-variant/60 py-10 lg:py-14">
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-gutter-sm mb-4 font-label text-label-sm uppercase tracking-widest text-light-on-surface-variant flex-wrap">
              {onNavigateHome ? (
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="hover:text-light-primary transition-colors cursor-pointer py-1 min-h-[36px]"
                >
                  Home
                </button>
              ) : (
                <span>Home</span>
              )}
              <span className="text-light-outline" aria-hidden="true">/</span>
              <span className="text-light-primary font-bold">Moulding Collections</span>
              <span className="text-light-outline" aria-hidden="true">/</span>
              <span className="font-mono text-mono-sm text-light-secondary">{frames.length} Architectural Profiles</span>
            </nav>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-3xl space-y-3">
                <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span>Indian Atelier Manufacturing • HSN 4414</span>
                </span>
                <h1 className="font-display text-display-lg-mobile lg:text-display-lg text-light-primary leading-tight">
                  Moulding Profiles &amp; Architectural Chevrons
                </h1>
                <p className="font-body text-body-md text-light-on-surface-variant leading-relaxed">
                  Precision-milled hardwood substrates, hand-burnished 24k gold leaf gilding, and bespoke mitre-ready chevrons engineered for art galleries, framing ateliers, and interior designers across India.
                </p>
              </div>

              {/* Atelier Metric Highlights */}
              <div className="flex items-center gap-4 border border-light-outline-variant/60 bg-light-surface p-3 sm:p-4 rounded-sm">
                <div className="text-center px-3 border-r border-light-outline-variant/60">
                  <span className="font-headline text-2xl font-bold text-light-primary block">{frames.length}</span>
                  <span className="font-label text-[10px] uppercase tracking-wider text-light-secondary block">Profiles</span>
                </div>
                <div className="text-center px-3 border-r border-light-outline-variant/60">
                  <span className="font-headline text-2xl font-bold text-accent block">{workshopCount}</span>
                  <span className="font-label text-[10px] uppercase tracking-wider text-light-secondary block">Workshop</span>
                </div>
                <div className="text-center px-3">
                  <span className="font-mono text-sm font-bold text-light-primary block">100% INR</span>
                  <span className="font-label text-[10px] uppercase tracking-wider text-light-secondary block">Pan-India</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. FILTER & SORT CONTROL TOOLBAR                                          */}
      {/* ========================================================================= */}
      <div className={`sticky top-20 z-30 bg-light-surface/95 backdrop-blur-md border-b border-light-outline-variant/60 ${isFullView ? 'py-4' : 'p-4'}`}>
        <div className={`${isFullView ? 'max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin' : ''} space-y-3.5`}>
          
          {/* Top Row: Search Input + Sort Dropdown + Mode Switcher */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Bar */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-light-outline absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => updateSearchQuery(e.target.value)}
                aria-label="Search moulding profiles by name, wood species, finish, or SKU"
                placeholder="Search profiles by name, wood species, gold finish, or SKU..."
                className="w-full min-h-[42px] pl-10 pr-16 py-2.5 text-xs sm:text-sm font-body bg-light-surface border border-light-outline-variant/60 rounded-sm text-light-on-surface placeholder:text-light-outline focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => updateSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 font-label text-xs uppercase tracking-wider text-light-secondary hover:text-light-primary cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Controls: Segmented Mode + Sort + Reset */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Segmented Retail Custom vs B2B Wholesale Toggle */}
              <div className="inline-flex p-0.5 bg-light-surface-container-low border border-light-outline-variant/60 rounded-sm text-xs">
                <button
                  type="button"
                  onClick={() => setIsWholesaleMode(false)}
                  className={`px-3 py-1.5 rounded-sm font-label uppercase tracking-wider text-[11px] transition-colors ${
                    !isWholesaleMode
                      ? 'bg-light-primary text-light-on-primary font-bold shadow-xs'
                      : 'text-light-on-surface-variant hover:text-light-primary'
                  }`}
                >
                  Custom Framing
                </button>
                <button
                  type="button"
                  onClick={() => setIsWholesaleMode(true)}
                  className={`px-3 py-1.5 rounded-sm font-label uppercase tracking-wider text-[11px] transition-colors flex items-center gap-1.5 ${
                    isWholesaleMode
                      ? 'bg-accent text-light-on-primary font-bold shadow-xs'
                      : 'text-light-on-surface-variant hover:text-light-primary'
                  }`}
                >
                  <Box className="w-3 h-3" />
                  <span>B2B Wholesale</span>
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  aria-label="Sort moulding profiles"
                  className="appearance-none min-h-[38px] bg-light-surface border border-light-outline-variant/60 rounded-sm pl-3 pr-8 py-2 text-xs font-label uppercase tracking-wider text-light-on-surface focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value="default">Curated Order</option>
                  <option value="name-asc">Name: A to Z</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="width-asc">Face Width: Narrow to Wide</option>
                  <option value="width-desc">Face Width: Wide to Narrow</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-light-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Reset Storage Button (if enabled) */}
              {onResetStorage && (
                <button
                  type="button"
                  onClick={onResetStorage}
                  title="Reset catalogue defaults"
                  className="p-2 text-light-on-surface-variant hover:text-light-primary hover:bg-light-surface-container rounded-sm border border-light-outline-variant/60 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Category Filter Pills & Dynamic Profile Count */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id as FrameCategory)}
                    className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 text-xs font-label uppercase tracking-wider rounded-sm whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-light-primary text-light-on-primary font-bold'
                        : 'bg-light-surface-container-low text-light-on-surface-variant hover:text-light-primary border border-light-outline-variant/60 hover:border-accent'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-xs ${
                      isActive ? 'bg-light-on-primary/20 text-light-on-primary' : 'bg-light-surface text-light-secondary border border-light-outline-variant/40'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Live Count Badge */}
            <span className="hidden sm:inline-block font-mono text-xs text-light-secondary whitespace-nowrap bg-light-surface-container-low px-3 py-1 rounded-sm border border-light-outline-variant/60">
              Showing <strong className="text-light-primary">{filteredAndSortedFrames.length}</strong> of {frames.length}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PRODUCT CATALOGUE GRID                                                 */}
      {/* ========================================================================= */}
      <div className={`flex-1 ${isFullView ? 'max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin py-8 w-full' : 'p-4 overflow-y-auto space-y-4'}`}>
        
        {filteredAndSortedFrames.length === 0 ? (
          <div className="text-center py-20 px-4 bg-light-surface-container-low border border-dashed border-light-outline-variant/60 rounded-sm">
            <SlidersHorizontal className="w-10 h-10 text-light-outline/60 mx-auto mb-3" />
            <h3 className="font-headline text-2xl text-light-primary font-bold">No Moulding Profiles Match Your Search</h3>
            <p className="font-body text-sm text-light-on-surface-variant mt-1.5 max-w-md mx-auto">
              Try adjusting your search terms or switch to "All Mouldings" to explore the complete Sanskruti Arts atelier collection.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                updateSearchQuery('');
                setSortOption('default');
              }}
              className="mt-5 px-5 py-2.5 rounded-sm bg-light-primary text-light-on-primary font-label text-xs uppercase tracking-widest hover:bg-forest-deep transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className={isFullView ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter-lg' : 'space-y-4'}>
            {filteredAndSortedFrames.map((frame) => {
              const isSelected = selectedFrame?.id === frame.id;
              const inrRate = getMouldingFootRateINR(frame);
              const rabbetDepth = (frame.depth * 0.55).toFixed(2);
              const photo = frame.cornerDetailUrl || frame.thumbnailUrl;
              const wholesaleItem = getWholesaleItemForFrame(frame.id);

              return (
                <div
                  key={frame.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select moulding profile ${frame.name} (#${frame.id})`}
                  onClick={() => onSelectFrame(frame)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectFrame(frame);
                    }
                  }}
                  className={`group relative flex flex-col bg-light-surface-container-lowest border rounded-sm transition-all duration-state-change cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'border-accent ring-1 ring-accent shadow-sm'
                      : 'border-light-outline-variant/60 hover:border-accent hover:shadow-subtle-card'
                  }`}
                >
                  {/* Moulding Photograph View */}
                  <div className={`relative w-full ${isFullView ? 'aspect-[4/3]' : 'h-48'} bg-light-surface-container-low overflow-hidden border-b border-light-outline-variant/60`}>
                    <img
                      src={photo}
                      alt={`${frame.name} Picture Frame Moulding`}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-surface-enter"
                      loading="lazy"
                    />

                    {/* Gradient Overlay for Contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none" />

                    {/* Top Tag Strip */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between z-10 gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-mono-sm bg-light-primary/90 backdrop-blur-xs text-light-on-primary px-2 py-0.5 rounded-xs border border-white/20">
                          #{frame.id}
                        </span>
                        {frame.isWorkshopSample && (
                          <span className="bg-accent text-light-on-primary font-label text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs flex items-center gap-1 shadow-xs">
                            <Camera className="w-2.5 h-2.5" />
                            <span>Workshop Original</span>
                          </span>
                        )}
                      </div>

                      {/* Finish Swatch Pip */}
                      <span
                        className="w-4 h-4 rounded-full border-2 border-white shadow-xs shrink-0"
                        style={{ backgroundColor: frame.colorHex }}
                        title={`${frame.finish} (${frame.material})`}
                      />
                    </div>

                    {/* Bottom Inset Style Caption */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between text-white text-xs">
                      <span className="font-label text-[10px] uppercase font-bold tracking-widest text-[#FED48D] truncate max-w-[150px]">
                        {frame.style}
                      </span>
                      <span className="font-headline italic text-xs text-white/95 truncate max-w-[130px] text-right">
                        {frame.textureDetails.filigreeStyle}
                      </span>
                    </div>
                  </div>

                  {/* Card Content & Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-label text-[10px] uppercase tracking-widest text-light-secondary font-bold truncate">
                          {frame.material}
                        </span>
                        <span className="font-mono text-[11px] text-light-outline">
                          45° Mitre
                        </span>
                      </div>

                      <h2 className="font-headline text-lg sm:text-xl font-bold text-light-primary group-hover:text-accent transition-colors line-clamp-1 leading-snug">
                        {frame.name}
                      </h2>

                      <p className="font-body text-xs text-light-on-surface-variant line-clamp-2 leading-relaxed">
                        {frame.description}
                      </p>
                    </div>

                    {/* Technical Profile Dimensions Grid */}
                    <div className="grid grid-cols-3 gap-1.5 py-2.5 px-2 bg-light-surface-container-low border border-light-outline-variant/60 rounded-sm text-center">
                      <div>
                        <span className="font-label text-[9px] uppercase tracking-wider text-light-secondary block">Face</span>
                        <span className="font-mono text-xs font-bold text-light-primary">{frame.profileWidth.toFixed(2)}″</span>
                      </div>
                      <div className="border-x border-light-outline-variant/40">
                        <span className="font-label text-[9px] uppercase tracking-wider text-light-secondary block">Depth</span>
                        <span className="font-mono text-xs font-bold text-light-primary">{frame.depth.toFixed(2)}″</span>
                      </div>
                      <div>
                        <span className="font-label text-[9px] uppercase tracking-wider text-light-secondary block">Rabbet</span>
                        <span className="font-mono text-xs font-bold text-light-primary">{rabbetDepth}″</span>
                      </div>
                    </div>

                    {/* Pricing Information (Custom vs B2B Wholesale) */}
                    <div className="pt-2 border-t border-light-outline-variant/60 flex items-baseline justify-between gap-2">
                      {isWholesaleMode ? (
                        (() => {
                          const ws = wholesaleItem;
                          const inrFt = ws ? ws.pricePerFootINR : Math.round(inrRate * 0.75);
                          const boxFt = ws ? ws.totalFootagePerBox : 108;
                          return (
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="font-headline text-2xl font-bold text-accent">
                                  ₹{inrFt}
                                </span>
                                <span className="font-mono text-xs text-light-secondary">/ linear ft</span>
                              </div>
                              <span className="font-mono text-[10px] text-light-on-surface-variant block">
                                ₹{(inrFt * boxFt).toLocaleString('en-IN')} / carton ({boxFt} ft)
                              </span>
                            </div>
                          );
                        })()
                      ) : (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="font-headline text-2xl font-bold text-light-primary">
                              ₹{inrRate}
                            </span>
                            <span className="font-mono text-xs text-light-secondary">/ linear ft</span>
                          </div>
                          <span className="font-mono text-[10px] text-light-on-surface-variant block">
                            + Prov. 18% GST Est. · Excl. Delivery
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions: Detail Specs & Customization Button */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectFrame(frame);
                        }}
                        className="flex-1 min-h-[38px] py-2 px-3 border border-light-outline-variant/60 hover:border-accent text-light-on-surface hover:text-light-primary rounded-sm font-label text-[11px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                        title="View architectural cross section and technical specifications"
                      >
                        <Eye className="w-3.5 h-3.5 text-accent" />
                        <span>Inspect Specs</span>
                      </button>

                      {isWholesaleMode ? (
                        <a
                          href={`https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(
                            `Namaste Sanskruti Arts! I am inquiring about B2B wholesale moulding supply for:\n\n• Moulding: ${frame.name} (SKU: #${frame.id})\n• Profile Face Width: ${frame.profileWidth}"\n• Material: ${frame.material}\n\nPlease share carton MOQ and dispatch timeline.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="py-2 px-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-sm font-label text-[11px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Wholesale</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFrame(frame);
                            onProceedToConfigure?.(frame);
                          }}
                          className={`flex-1 py-2 px-3 rounded-sm font-label text-[11px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-accent text-light-on-primary'
                              : 'bg-light-primary hover:bg-forest-deep text-light-on-primary'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Selected</span>
                            </>
                          ) : (
                            <>
                              <span>Customize</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. B2B TRADE & ARCHITECTURAL SAMPLE KIT SECTION (Full View Only)           */}
      {/* ========================================================================= */}
      {isFullView && (
        <section className="bg-forest-deep text-light-on-primary py-12 lg:py-16 border-t border-accent/40 mt-12">
          <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-8 space-y-3">
                <span className="font-label text-label-sm uppercase tracking-widest text-bronze-bright flex items-center gap-2">
                  <Box className="w-4 h-4 text-accent" />
                  <span>Trade Verification &amp; Corner Samples</span>
                </span>
                <h2 className="font-headline text-display-lg-mobile lg:text-headline-lg text-light-on-primary leading-tight">
                  Need Physical Corner Chevrons for Your Studio or Gallery?
                </h2>
                <p className="font-body text-body-md text-light-on-primary-container max-w-2xl leading-relaxed">
                  Our trade sample box includes 6 hand-finished 6-inch mitered corner chevrons, profile specifications, and domestic B2B wholesale tariff guidance (HSN 4414 reference).
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-bronze-bright pt-1">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-accent" />
                    <span>Hand-Finished Sample Chevrons</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-accent" />
                    <span>Pan-India Sample Dispatch (Confirmed via WhatsApp)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                    <span>Workshop-Confirmed Tax Invoice</span>
                  </span>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setIsSampleKitModalOpen(true)}
                  className="w-full inline-flex items-center justify-center bg-accent text-light-on-primary px-6 py-3.5 rounded-sm font-label text-label-lg uppercase tracking-widest hover:bg-bronze-bright hover:text-light-primary transition-colors"
                >
                  Request Trade Sample Kit
                </button>
                <a
                  href={`https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(
                    'Namaste Sanskruti Arts! I am an architect / art gallery inquiring about your Trade Sample Kit and wholesale moulding catalogue.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center border border-light-on-primary/40 text-light-on-primary hover:bg-light-on-primary hover:text-light-primary px-6 py-3.5 rounded-sm font-label text-label-lg uppercase tracking-widest transition-colors gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Trade Desk</span>
                </a>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 5. TRADE SAMPLE KIT POPUP MODAL                                           */}
      {/* ========================================================================= */}
      {isSampleKitModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="catalog-kit-modal-title"
          onClick={() => setIsSampleKitModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-lg bg-light-surface-container-lowest border border-light-outline-variant/60 rounded-sm shadow-2xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsSampleKitModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-light-on-surface-variant hover:text-light-primary border border-light-outline-variant/60 rounded-sm cursor-pointer"
              aria-label="Close sample kit modal"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2 mb-6">
              <span className="font-label text-label-sm uppercase tracking-widest text-light-secondary">
                India Trade Sample Program
              </span>
              <h3 id="catalog-kit-modal-title" className="font-headline text-2xl font-bold text-light-primary">
                Order Architectural Sample Kit
              </h3>
              <p className="font-body text-xs sm:text-sm text-light-on-surface-variant leading-relaxed">
                Provide your studio or business credentials below to dispatch 6 mitered sample chevrons and our factory catalogue.
              </p>
            </div>

            <form onSubmit={handleKitSubmit} className="space-y-4">
              <div>
                <label htmlFor="catalog-kit-name" className="font-label text-xs uppercase tracking-wider text-light-on-surface block mb-1">
                  Full Name *
                </label>
                <input
                  id="catalog-kit-name"
                  type="text"
                  required
                  value={kitForm.name}
                  onChange={(e) => setKitForm({ ...kitForm, name: e.target.value })}
                  placeholder="e.g. Ar. Rajesh Mehta"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-body bg-light-surface border border-light-outline-variant/60 rounded-sm text-light-on-surface focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label htmlFor="catalog-kit-org" className="font-label text-xs uppercase tracking-wider text-light-on-surface block mb-1">
                  Studio / Firm / Gallery Name
                </label>
                <input
                  id="catalog-kit-org"
                  type="text"
                  value={kitForm.organization}
                  onChange={(e) => setKitForm({ ...kitForm, organization: e.target.value })}
                  placeholder="e.g. Studio Vista Architecture"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-body bg-light-surface border border-light-outline-variant/60 rounded-sm text-light-on-surface focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="catalog-kit-city" className="font-label text-xs uppercase tracking-wider text-light-on-surface block mb-1">
                    City / State *
                  </label>
                  <input
                    id="catalog-kit-city"
                    type="text"
                    required
                    value={kitForm.city}
                    onChange={(e) => setKitForm({ ...kitForm, city: e.target.value })}
                    placeholder="e.g. Mumbai, Maharashtra"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-body bg-light-surface border border-light-outline-variant/60 rounded-sm text-light-on-surface focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="catalog-kit-phone" className="font-label text-xs uppercase tracking-wider text-light-on-surface block mb-1">
                    WhatsApp Phone *
                  </label>
                  <input
                    id="catalog-kit-phone"
                    type="tel"
                    required
                    value={kitForm.phone}
                    onChange={(e) => setKitForm({ ...kitForm, phone: e.target.value })}
                    placeholder="e.g. +91 98200 00000"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-body bg-light-surface border border-light-outline-variant/60 rounded-sm text-light-on-surface focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-light-primary text-light-on-primary hover:bg-forest-deep rounded-sm font-label text-label-lg uppercase tracking-widest transition-colors"
                >
                  Confirm &amp; Message on WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
