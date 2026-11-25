import React, { useState } from 'react';
import { FrameSample, DimensionUnit } from '../types';
import { 
  RotateCcw, 
  Search, 
  X, 
  Menu, 
  MessageCircle,
  SlidersHorizontal,
  Layers,
  Box,
  FileText,
  Home
} from 'lucide-react';
import { getIndianWhatsAppUrl, WHATSAPP_DISPLAY_PHONE } from '../utils/whatsapp';

export type AppWorkflowTab = 'home' | 'catalog' | 'configure' | 'studio3d' | 'review' | 'quotations';

export interface HeaderProps {
  selectedFrame: FrameSample | null;
  width: number;
  height: number;
  unit: DimensionUnit;
  activeTab: AppWorkflowTab;
  onTabChange: (tab: AppWorkflowTab) => void;
  onQuickPreset?: (frameId: string, w: number, h: number) => void;
  onReset: () => void;
  onNavigateHome?: () => void;
  catalogCount?: number;
  savedQuotationsCount?: number;
  searchQuery?: string;
  onSearchQuery?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedFrame,
  width,
  height,
  unit,
  activeTab,
  onTabChange,
  onReset,
  onNavigateHome,
  catalogCount = 32,
  savedQuotationsCount = 0,
  searchQuery: externalSearchQuery,
  onSearchQuery,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState(externalSearchQuery || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (typeof externalSearchQuery === 'string') {
      setSearchVal(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchVal(q);
    if (onSearchQuery) {
      onSearchQuery(q);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchQuery) {
      onSearchQuery(searchVal);
    }
    if (activeTab !== 'catalog') {
      onTabChange('catalog');
    }
    setIsMobileMenuOpen(false);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchVal('');
    if (onSearchQuery) {
      onSearchQuery('');
    }
  };

  const handleTabClick = (tab: AppWorkflowTab) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-light-surface/95 backdrop-blur-md border-b border-light-outline-variant/60 shadow-[0_2px_12px_rgba(3,37,23,0.03)]">
      <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin h-20 flex items-center justify-between gap-gutter-md">
        
        {/* Left: Stitch Sanskruti Arts Brand Logo & Monogram */}
        <button
          type="button"
          onClick={onNavigateHome ? onNavigateHome : () => onTabChange('catalog')}
          className="inline-flex items-center gap-gutter-md cursor-pointer select-none group shrink-0 text-left"
          title="Sanskruti Arts Atelier — Return to Home"
          aria-label="Sanskruti Arts — Return to Home"
        >
          {/* Geometric Stitch Frame Logo SVG */}
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 32 32" 
            fill="none" 
            aria-hidden="true" 
            className="text-light-primary shrink-0 transition-transform duration-state-change group-hover:scale-105"
          >
            <rect x="2" y="2" width="28" height="28" stroke="currentColor" strokeWidth="1.5" />
            <rect x="6" y="6" width="20" height="20" stroke="#9C7A3C" strokeWidth="1" />
            <path d="M2 2L6 6M30 2L26 6M2 30L6 26M30 30L26 26" stroke="currentColor" strokeWidth="1" />
          </svg>

          <div className="flex flex-col">
            <span className="font-headline text-title-lg tracking-wide text-light-primary leading-none">
              Sanskruti Arts
            </span>
            <span className="font-label text-label-sm uppercase text-light-secondary tracking-widest mt-0.5">
              India
            </span>
          </div>
        </button>

        {/* Center: Primary Navigation (Desktop) */}
        <nav aria-label="Primary Navigation" className="hidden xl:flex items-center gap-4 2xl:gap-6 whitespace-nowrap">
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className={`font-label text-label-lg uppercase tracking-widest pb-1 transition-colors duration-state-change border-b-2 ${
                activeTab === 'home'
                  ? 'text-light-primary border-accent font-bold'
                  : 'text-light-on-surface-variant hover:text-light-primary border-transparent hover:border-accent'
              }`}
            >
              <span>Home</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleTabClick('catalog')}
            className={`font-label text-label-lg uppercase tracking-widest pb-1 transition-colors duration-state-change border-b-2 ${
              activeTab === 'catalog'
                ? 'text-light-primary border-accent font-bold'
                : 'text-light-on-surface-variant hover:text-light-primary border-transparent hover:border-accent'
            }`}
          >
            <span>Collections ({catalogCount})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('configure')}
            className={`font-label text-label-lg uppercase tracking-widest pb-1 transition-colors duration-state-change border-b-2 ${
              activeTab === 'configure'
                ? 'text-light-primary border-accent font-bold'
                : 'text-light-on-surface-variant hover:text-light-primary border-transparent hover:border-accent'
            }`}
          >
            <span>Custom Framing</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('studio3d')}
            className={`font-label text-label-lg uppercase tracking-widest pb-1 transition-colors duration-state-change border-b-2 ${
              activeTab === 'studio3d'
                ? 'text-light-primary border-accent font-bold'
                : 'text-light-on-surface-variant hover:text-light-primary border-transparent hover:border-accent'
            }`}
          >
            <span>3D Studio</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('review')}
            className={`font-label text-label-lg uppercase tracking-widest pb-1 transition-colors duration-state-change border-b-2 ${
              activeTab === 'review'
                ? 'text-light-primary border-accent font-bold'
                : 'text-light-on-surface-variant hover:text-light-primary border-transparent hover:border-accent'
            }`}
          >
            <span>Atelier Quote</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('quotations')}
            data-testid="nav-saved-quotations"
            className={`font-label text-label-lg uppercase tracking-widest pb-1 transition-colors duration-state-change border-b-2 inline-flex items-center gap-1.5 ${
              activeTab === 'quotations'
                ? 'text-light-primary border-accent font-bold'
                : 'text-light-on-surface-variant hover:text-light-primary border-transparent hover:border-accent'
            }`}
          >
            <span>Saved Quotes</span>
            {savedQuotationsCount > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-light-surface-container text-light-primary border border-light-outline-variant/70 leading-none">
                {savedQuotationsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Utility Cluster: Search Toggle, Active Frame Chip, Contact Us, Reset, Mobile Menu */}
        <div className="flex items-center gap-gutter-sm sm:gap-gutter-md shrink-0">
          
          {/* Active Selection Chip (Wide Desktop only) */}
          {selectedFrame && (
            <button
              type="button"
              onClick={() => handleTabClick('configure')}
              className="hidden 2xl:flex items-center gap-2 bg-light-surface-container-low border border-light-outline-variant/60 px-3 py-1.5 rounded-sm text-xs cursor-pointer hover:border-accent transition-colors"
              title="Click to customize this selected profile"
              aria-label={`Customize selected frame ${selectedFrame.name} (#${selectedFrame.id})`}
            >
              <span
                className="w-2.5 h-2.5 rounded-none border border-black/20 shadow-xs shrink-0"
                style={{ backgroundColor: selectedFrame.colorHex }}
              />
              <span className="font-headline font-semibold text-light-primary truncate max-w-[120px]">
                {selectedFrame.name}
              </span>
              <span className="text-light-secondary font-mono text-[11px]">
                #{selectedFrame.id}
              </span>
            </button>
          )}

          {/* Search Toggle Button */}
          <button
            id="search-toggle-btn"
            type="button"
            aria-label="Search mouldings"
            aria-expanded={isSearchOpen}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-sm transition-colors duration-state-change ${
              isSearchOpen 
                ? 'bg-light-primary text-light-on-primary' 
                : 'text-light-on-surface hover:text-light-primary hover:bg-light-surface-container-low'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Reset Configuration Button */}
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset to default frame configuration"
            title="Reset to default frame configuration"
            className="p-2 text-light-on-surface-variant hover:text-light-primary hover:bg-light-surface-container-low rounded-sm border border-light-outline-variant/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Contact Us CTA (WhatsApp Direct Link) */}
          <a
            href={getIndianWhatsAppUrl(
              `Hello Sanskruti Arts, I would like to enquire about bespoke picture frame moulding ${selectedFrame?.name || 'custom frame'} (SKU: ${selectedFrame?.id || 'SAA'}), dimension: ${width}×${height} ${unit}.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center border border-light-primary text-light-primary px-3.5 xl:px-4 py-2 rounded-sm font-label text-label-sm uppercase tracking-wider xl:tracking-widest whitespace-nowrap transition-colors duration-state-change hover:bg-light-primary hover:text-light-on-primary"
            title={`Direct WhatsApp Helpline: ${WHATSAPP_DISPLAY_PHONE}`}
          >
            <span>Contact Us</span>
          </a>

          {/* Mobile Navigation Drawer Toggle */}
          <button
            type="button"
            aria-label="Toggle mobile menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden p-2 text-light-on-surface hover:text-light-primary rounded-sm border border-light-outline-variant/60"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Search Drawer */}
      {isSearchOpen && (
        <div id="search-drawer" className="border-t border-light-outline-variant/60 bg-light-surface-container-low animate-fadeIn">
          <form 
            onSubmit={handleSearchSubmit}
            className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin py-gutter-md flex items-center justify-between gap-gutter-md"
          >
            <div className="flex items-center gap-gutter-md flex-1">
              <Search className="w-4 h-4 text-light-secondary shrink-0" />
              <input 
                id="moulding-search-input"
                type="text" 
                value={searchVal}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleCloseSearch();
                }}
                aria-label="Search moulding collections by name or SKU"
                placeholder="Search moulding collections by name or SKU (e.g. SA-BG-402, Baroque, Gold, Walnut)..." 
                className="w-full bg-transparent border-0 focus:ring-0 font-body text-body-md text-light-on-surface placeholder:text-light-outline outline-none"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="search-submit-btn"
                type="submit"
                className="px-3.5 py-1.5 bg-light-primary hover:bg-forest-deep text-light-on-primary font-label text-xs uppercase tracking-wider font-semibold rounded-sm transition-colors cursor-pointer"
              >
                Search
              </button>
              <button 
                id="search-close-btn"
                type="button" 
                aria-label="Close search" 
                onClick={handleCloseSearch}
                className="text-light-on-surface-variant hover:text-light-primary p-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile Slide-down Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="xl:hidden border-t border-light-outline-variant/60 bg-light-surface px-gutter-lg py-gutter-lg flex flex-col gap-gutter-md shadow-lg">
          <div className="flex flex-col gap-1 border-b border-light-outline-variant/40 pb-gutter-md">
            {onNavigateHome && (
              <button
                type="button"
                onClick={() => {
                  onNavigateHome();
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 py-2 text-left font-label text-label-lg uppercase tracking-widest ${
                  activeTab === 'home' ? 'text-light-primary font-bold' : 'text-light-on-surface-variant'
                }`}
              >
                <Home className="w-4 h-4 text-light-secondary" />
                <span>Home</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleTabClick('catalog')}
              className={`flex items-center gap-2 py-2 text-left font-label text-label-lg uppercase tracking-widest ${
                activeTab === 'catalog' ? 'text-light-primary font-bold' : 'text-light-on-surface-variant'
              }`}
            >
              <Layers className="w-4 h-4 text-light-secondary" />
              <span>Collections ({catalogCount})</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('configure')}
              className={`flex items-center gap-2 py-2 text-left font-label text-label-lg uppercase tracking-widest ${
                activeTab === 'configure' ? 'text-light-primary font-bold' : 'text-light-on-surface-variant'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-light-secondary" />
              <span>Custom Framing ({width}×{height}")</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('studio3d')}
              className={`flex items-center gap-2 py-2 text-left font-label text-label-lg uppercase tracking-widest ${
                activeTab === 'studio3d' ? 'text-light-primary font-bold' : 'text-light-on-surface-variant'
              }`}
            >
              <Box className="w-4 h-4 text-light-secondary" />
              <span>3D Studio</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('review')}
              className={`flex items-center gap-2 py-2 text-left font-label text-label-lg uppercase tracking-widest ${
                activeTab === 'review' ? 'text-light-primary font-bold' : 'text-light-on-surface-variant'
              }`}
            >
              <FileText className="w-4 h-4 text-light-secondary" />
              <span>Atelier Quote</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('quotations')}
              data-testid="mobile-nav-saved-quotations"
              className={`flex items-center justify-between gap-2 py-2 text-left font-label text-label-lg uppercase tracking-widest ${
                activeTab === 'quotations' ? 'text-light-primary font-bold' : 'text-light-on-surface-variant'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-light-secondary" />
                <span>Saved Quotes</span>
              </span>
              {savedQuotationsCount > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-light-surface-container text-light-primary border border-light-outline-variant/70">
                  {savedQuotationsCount}
                </span>
              )}
            </button>
          </div>

          {/* Active selection summary on mobile */}
          {selectedFrame && (
            <div className="bg-light-surface-container-low p-3 rounded-sm border border-light-outline-variant/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-none border border-black/20 shrink-0"
                  style={{ backgroundColor: selectedFrame.colorHex }}
                />
                <div>
                  <span className="font-headline font-semibold text-xs text-light-primary block">
                    {selectedFrame.name}
                  </span>
                  <span className="text-[10px] font-mono text-light-secondary">
                    SKU: {selectedFrame.id} • {width}×{height} {unit}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-light-secondary underline"
              >
                Reset
              </button>
            </div>
          )}

          {/* WhatsApp Action on mobile */}
          <a
            href={getIndianWhatsAppUrl(
              `Hello Sanskruti Arts, I am contacting you regarding custom picture frame mouldings.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-sm font-label text-label-sm uppercase tracking-widest font-semibold"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      )}
    </header>
  );
};
