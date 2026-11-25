import React, { useMemo, useState, useEffect } from 'react';
import { FrameSample, MatOption, ArtworkOption } from '../types';
import { QuotationSnapshot, QuotationStatus, getQuotationStatusLabel } from '../types/quotation';
import {
  loadValidatedQuotationById,
  saveQuotation,
  migrateLegacyQuotationArtwork,
} from '../utils/quotationStorage';
import { loadCustomArtworkAsset, DOSSIER_ARTWORK_UNAVAILABLE_SVG } from '../utils/artworkStorage';
import { formatINR } from '../utils/pricing';
import { WHATSAPP_DISPLAY_PHONE } from '../utils/whatsapp';
import { buildQuotationWhatsAppHandoff } from '../utils/quotationEnquiry';
import { validateCustomerDetails } from './QuotationReviewPage';
import { MAT_OPTIONS, ARTWORK_OPTIONS } from '../data/frames';
import { FrameCanvas2D } from './FrameCanvas2D';
import { EyebrowBadge } from './ui/LuxuryPrimitives';
import {
  Printer,
  ArrowLeft,
  AlertTriangle,
  FileSearch,
  ImageOff,
  ShieldAlert,
  Info,
  FileText,
  ExternalLink,
  MessageCircle,
  Bookmark,
} from 'lucide-react';

export interface QuotationDossierViewProps {
  quotationId?: string;
  isPrintMode?: boolean;
  allFrames: FrameSample[];
  onNavigateReview: () => void;
  onNavigatePrint: (id: string) => void;
  onNavigateDossier: (id: string) => void;
  onNavigateStudio: () => void;
  onNavigateCatalog: () => void;
  onNavigateQuotations?: () => void;
  onQuotationUpdated?: (updated: QuotationSnapshot) => void;
}

export const QuotationDossierView: React.FC<QuotationDossierViewProps> = ({
  quotationId,
  isPrintMode = false,
  allFrames,
  onNavigateReview,
  onNavigatePrint,
  onNavigateDossier,
  onNavigateStudio,
  onNavigateCatalog,
  onNavigateQuotations,
  onQuotationUpdated,
}) => {
  const [artworkLoadFailed, setArtworkLoadFailed] = useState(false);
  const [hydratedCustomArtUrl, setHydratedCustomArtUrl] = useState<string | null>(null);
  const [artworkHydrationAttempted, setArtworkHydrationAttempted] = useState(false);
  const [legacyMigrationWarning, setLegacyMigrationWarning] = useState<string | null>(null);
  const [dossierStatusOverride, setDossierStatusOverride] = useState<QuotationStatus | null>(null);
  const [whatsappPromptMessage, setWhatsappPromptMessage] = useState<string | null>(null);
  const [whatsappOpenedBanner, setWhatsappOpenedBanner] = useState(false);

  // Strict ID lookup and schema validation (never falls back to an unrelated quotation)
  const lookup = useMemo(() => loadValidatedQuotationById(quotationId), [quotationId]);

  const quotation: QuotationSnapshot | null = lookup.status === 'found' ? lookup.quotation : null;
  const spec = quotation?.specifications;

  useEffect(() => {
    setArtworkLoadFailed(false);
    setLegacyMigrationWarning(null);
    setDossierStatusOverride(null);
    setWhatsappPromptMessage(null);
    setWhatsappOpenedBanner(false);
  }, [quotationId]);

  // Hydrate persistent custom artwork from IndexedDB & migrate legacy large inline artwork safely
  useEffect(() => {
    let cancelled = false;
    if (spec?.customArtUrl) {
      setHydratedCustomArtUrl(spec.customArtUrl);
      setArtworkHydrationAttempted(true);

      // Migrate legacy (>32 KB) inline customArtUrl lacking an IndexedDB assetId
      if (quotation && !spec.customArtAssetId && spec.customArtUrl.length > 32768) {
        void migrateLegacyQuotationArtwork(quotation).then((mig) => {
          if (cancelled) return;
          if (mig.migrated) {
            const res = saveQuotation(mig.quotation);
            if (res.success && onQuotationUpdated) {
              onQuotationUpdated(mig.quotation);
            }
          } else if (mig.warning) {
            setLegacyMigrationWarning(mig.warning);
          }
        });
      }
      return () => {
        cancelled = true;
      };
    }
    if (spec?.customArtAssetId) {
      setHydratedCustomArtUrl(null);
      setArtworkHydrationAttempted(false);
      loadCustomArtworkAsset(spec.customArtAssetId)
        .then((dataUrl) => {
          if (cancelled) return;
          setHydratedCustomArtUrl(dataUrl);
          setArtworkHydrationAttempted(true);
        })
        .catch(() => {
          if (cancelled) return;
          setHydratedCustomArtUrl(null);
          setArtworkHydrationAttempted(true);
        });
      return () => {
        cancelled = true;
      };
    }
    setHydratedCustomArtUrl(null);
    setArtworkHydrationAttempted(true);
    return () => {
      cancelled = true;
    };
  }, [quotationId, spec?.customArtAssetId, spec?.customArtUrl]);

  const pricing = quotation?.pricing;
  const customer = quotation?.customer;
  const activeStatus: QuotationStatus = dossierStatusOverride || quotation?.status || 'draft';

  // Unconditional hooks for FrameSample, MatOption, and ArtworkOption reconstruction
  const snapshotFrame: FrameSample = useMemo(() => {
    const base = (spec ? allFrames.find((f) => f.id === spec.frameId) : null) || allFrames[0];
    if (!spec) return base;
    return {
      ...base,
      id: spec.frameId,
      name: spec.frameName,
      profileWidth: spec.profileWidth,
      depth: spec.depth,
      material: spec.material,
      finish: spec.finish,
      pricePerFootINR: spec.footRateINR,
    };
  }, [allFrames, spec]);

  const snapshotMat: MatOption = useMemo(() => {
    if (!spec) return MAT_OPTIONS[0];
    const matched = MAT_OPTIONS.find((m) => m.id === spec.matId);
    if (matched) {
      return {
        ...matched,
        name: spec.matName,
        colorHex: spec.matColorHex,
        borderWidth: spec.matBorderWidth,
      };
    }
    return {
      id: spec.matId,
      name: spec.matName,
      colorHex: spec.matColorHex,
      coreHex: '#eae6dc',
      borderWidth: spec.matBorderWidth,
    };
  }, [spec]);

  const resolvedCustomArtUrl = spec?.customArtUrl || hydratedCustomArtUrl;
  const isCustomArtworkSpec = Boolean(
    spec && (spec.artworkId === 'custom-upload' || !ARTWORK_OPTIONS.some((a) => a.id === spec.artworkId))
  );
  const isWaitingCustomArtHydration = Boolean(
    isCustomArtworkSpec && !spec?.customArtUrl && spec?.customArtAssetId && !artworkHydrationAttempted
  );

  const isCustomArtMissing = Boolean(
    isCustomArtworkSpec && !isWaitingCustomArtHydration && !resolvedCustomArtUrl
  );

  const snapshotArtwork: ArtworkOption = useMemo(() => {
    if (!spec) return ARTWORK_OPTIONS[0];
    if (artworkLoadFailed || isCustomArtMissing) {
      return {
        id: spec.artworkId || 'artwork-unavailable',
        title: spec.artworkTitle || 'Original Uploaded Artwork',
        artist: 'Asset unavailable for restoration',
        imageUrl: DOSSIER_ARTWORK_UNAVAILABLE_SVG,
        aspectRatio: spec.width / (spec.height || 1),
      };
    }
    const matched = ARTWORK_OPTIONS.find((a) => a.id === spec.artworkId);
    return {
      id: spec.artworkId,
      title: spec.artworkTitle,
      artist: spec.artworkArtist,
      imageUrl: spec.artworkImageUrl || matched?.imageUrl || DOSSIER_ARTWORK_UNAVAILABLE_SVG,
      aspectRatio: matched?.aspectRatio || spec.width / (spec.height || 1),
    };
  }, [spec, artworkLoadFailed, isCustomArtMissing]);

  // ---------------------------------------------------------------------------
  // ERROR & NOT-FOUND STATES (ZERO SILENT FALLBACK)
  // ---------------------------------------------------------------------------
  if (lookup.status === 'missing_id' || lookup.status === 'not_found') {
    return (
      <div
        className="flex-1 bg-[#F7F5EF] py-16 px-4 flex items-center justify-center"
        data-testid="quotation-not-found"
      >
        <div className="max-w-lg w-full bg-white border border-[#C1C8C2]/80 rounded-sm p-8 text-center space-y-5 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#F7F3EB] border border-[#9C7A3C]/40 flex items-center justify-center mx-auto text-[#9C7A3C]">
            <FileSearch className="w-6 h-6" />
          </div>
          <EyebrowBadge variant="bronze">Quotation Lookup</EyebrowBadge>
          <h1 className="font-headline text-3xl text-[#1B3B2B] font-semibold">
            {lookup.status === 'missing_id'
              ? 'Quotation Identifier Required'
              : 'Quotation Reference Not Found'}
          </h1>
          <p className="text-sm text-[#424844] leading-relaxed">
            {lookup.status === 'missing_id' ? (
              'No quotation ID or reference number was specified in the URL.'
            ) : (
              <>
                No saved quotation matching{' '}
                <span className="font-mono font-bold text-[#1B3B2B] bg-[#F7F3EB] px-1.5 py-0.5 rounded-sm">
                  {quotationId}
                </span>{' '}
                was found in this browser&apos;s local storage.
              </>
            )}
          </p>
          <div className="p-3 bg-[#FAF8F5] border border-[#E8E4DA] rounded-sm text-xs text-[#5A615C] text-left flex items-start gap-2">
            <Info className="w-4 h-4 text-[#9C7A3C] flex-shrink-0 mt-0.5" />
            <span>
              Saved quotations are stored locally in the current browser on this device and are not synced across separate devices or browsers.
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={onNavigateReview}
              className="px-5 py-2.5 min-h-[42px] bg-[#1B3B2B] hover:bg-[#032517] text-white font-label text-xs uppercase tracking-widest font-semibold rounded-sm transition-colors cursor-pointer"
            >
              Go to Quotation Review
            </button>
            {onNavigateQuotations && (
              <button
                type="button"
                onClick={onNavigateQuotations}
                className="px-5 py-2.5 min-h-[42px] border border-[#9C7A3C] text-[#1B3B2B] bg-[#F7F3EB] hover:bg-[#EDE4D4] font-label text-xs uppercase tracking-widest font-semibold rounded-sm transition-colors cursor-pointer"
              >
                Open Saved Quotations
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateStudio}
              className="px-5 py-2.5 min-h-[42px] border border-[#1B3B2B] text-[#1B3B2B] hover:bg-[#F7F3EB] font-label text-xs uppercase tracking-widest font-semibold rounded-sm transition-colors cursor-pointer"
            >
              Open Framing Studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (lookup.status === 'corrupted' || lookup.status === 'storage_error' || !quotation || !spec || !pricing || !customer) {
    return (
      <div
        className="flex-1 bg-[#F7F5EF] py-16 px-4 flex items-center justify-center"
        data-testid="quotation-corrupted"
      >
        <div className="max-w-lg w-full bg-white border border-red-300 rounded-sm p-8 text-center space-y-5 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-700">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <EyebrowBadge variant="amber">Data Integrity Notice</EyebrowBadge>
          <h1 className="font-headline text-3xl text-[#1B3B2B] font-semibold">
            Unable to Load Quotation Record
          </h1>
          <p className="text-sm text-[#424844] leading-relaxed">
            The quotation record{' '}
            {quotationId && <span className="font-mono font-bold">{quotationId}</span>} could not be validated or browser storage could not be read cleanly. To protect commercial accuracy, partial or corrupted pricing data is never displayed.
          </p>
          {lookup.errors && lookup.errors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-900 text-left font-mono">
              {lookup.errors.join(' · ')}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={onNavigateReview}
              className="px-5 py-2.5 bg-[#1B3B2B] hover:bg-[#032517] text-white font-label text-xs uppercase tracking-widest font-semibold rounded-sm transition-colors cursor-pointer"
            >
              Return to Review
            </button>
            <button
              type="button"
              onClick={onNavigateCatalog}
              className="px-5 py-2.5 border border-[#C1C8C2] text-[#424844] hover:bg-[#F7F3EB] font-label text-xs uppercase tracking-widest font-semibold rounded-sm transition-colors cursor-pointer"
            >
              Browse Mouldings
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(quotation.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const hasCustomerInfo = Boolean(
    customer.fullName.trim() ||
      customer.phone.trim() ||
      customer.email?.trim() ||
      customer.addressLine1.trim() ||
      customer.city.trim() ||
      customer.state.trim() ||
      customer.postalCode.trim()
  );

  const handleNativePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div
      className={`flex-1 ${isPrintMode ? 'bg-[#EAE7DF]' : 'bg-[#F7F5EF]'} print:bg-white py-6 sm:py-8 px-3 sm:px-6 print:p-0 print-flow-reset`}
      data-testid="quotation-dossier-view"
    >
      {/* Hidden preloader to detect broken artwork URLs safely */}
      {!isWaitingCustomArtHydration && !artworkLoadFailed && (resolvedCustomArtUrl || spec.artworkImageUrl) && (
        <img
          src={resolvedCustomArtUrl || spec.artworkImageUrl}
          alt=""
          className="hidden"
          onError={() => setArtworkLoadFailed(true)}
        />
      )}

      {/* ===================================================================== */}
      {/* SCREEN TOOLBAR (OUTSIDE PRINTED DOCUMENT — HIDDEN ON PRINT)           */}
      {/* ===================================================================== */}
      <div
        className="max-w-[210mm] mx-auto mb-5 bg-white border border-[#C1C8C2]/80 rounded-sm p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs no-print print:hidden"
        data-testid="dossier-action-toolbar"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onNavigateReview}
            data-testid="dossier-return-review-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-[#C1C8C2] bg-[#FAF8F5] hover:bg-[#F7F3EB] text-xs font-semibold text-[#1B3B2B] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Quotation Review</span>
          </button>

          {onNavigateQuotations && (
            <button
              type="button"
              onClick={onNavigateQuotations}
              data-testid="dossier-saved-quotations-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-[#C1C8C2] bg-white hover:bg-[#F7F3EB] text-xs font-semibold text-[#1B3B2B] transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#9C7A3C]" />
              <span>Saved Quotes</span>
            </button>
          )}

          {isPrintMode ? (
            <button
              type="button"
              onClick={() => onNavigateDossier(quotation.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-[#C1C8C2] bg-white hover:bg-[#F7F3EB] text-xs font-semibold text-[#424844] transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Standard Dossier View</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigatePrint(quotation.id)}
              data-testid="dossier-open-print-route-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-[#9C7A3C] bg-[#F7F3EB] hover:bg-[#EDE4D4] text-xs font-semibold text-[#1B3B2B] transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#9C7A3C]" />
              <span>A4 Print View</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isPrintMode && (
            <button
              type="button"
              onClick={() => {
                const custCheck = validateCustomerDetails(customer);
                if (!custCheck.isValid) {
                  setWhatsappPromptMessage(
                    'Please complete required customer details (Name, Mobile, Address, City, State, PIN) in Quotation Review before continuing to WhatsApp.'
                  );
                  return;
                }
                const updatedForEnquiry: QuotationSnapshot = {
                  ...quotation,
                  status: 'whatsapp_opened',
                };
                const handoff = buildQuotationWhatsAppHandoff(updatedForEnquiry);
                if (!handoff.ok || !handoff.url) {
                  setWhatsappPromptMessage(handoff.error || 'Could not generate WhatsApp enquiry link.');
                  return;
                }
                // Preserve exact specifications & pricing while updating honest client-side status
                saveQuotation(updatedForEnquiry);
                if (onQuotationUpdated) onQuotationUpdated(updatedForEnquiry);
                setDossierStatusOverride('whatsapp_opened');
                setWhatsappPromptMessage(null);
                setWhatsappOpenedBanner(true);
                if (typeof window !== 'undefined') {
                  window.open(handoff.url, '_blank', 'noopener,noreferrer');
                }
              }}
              data-testid="dossier-whatsapp-btn"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-[#25D366] hover:bg-[#1EB958] text-white font-label text-xs uppercase tracking-wider font-bold transition-colors shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Continue to WhatsApp Enquiry</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleNativePrint}
            data-testid="dossier-print-btn"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm bg-[#1B3B2B] hover:bg-[#032517] text-white font-label text-xs uppercase tracking-widest font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#CCA563]" />
            <span>Print / Save as PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* Legacy Migration Warning (Hidden in Print) */}
      {legacyMigrationWarning && (
        <div
          className="max-w-[210mm] mx-auto mb-4 p-3 rounded-sm bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-center gap-2 no-print print:hidden"
          data-testid="dossier-migration-warning"
        >
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>{legacyMigrationWarning}</span>
        </div>
      )}

      {/* Inline WhatsApp Guidance / Honest Handoff Notices (Hidden in Print) */}
      {whatsappPromptMessage && (
        <div
          className="max-w-[210mm] mx-auto mb-4 p-3.5 rounded-sm bg-[#FFFBEB] border border-[#D97706]/40 text-xs text-[#78350F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print print:hidden"
          data-testid="dossier-whatsapp-incomplete-notice"
        >
          <span>{whatsappPromptMessage}</span>
          <button
            type="button"
            onClick={onNavigateReview}
            className="px-3 py-1.5 rounded-sm bg-[#1B3B2B] text-white font-semibold text-[11px] flex-shrink-0 cursor-pointer"
          >
            Complete Details in Review
          </button>
        </div>
      )}

      {whatsappOpenedBanner && (
        <div
          className="max-w-[210mm] mx-auto mb-4 p-3.5 rounded-sm bg-white border border-[#9C7A3C]/60 text-xs text-[#191C1A] space-y-1 no-print print:hidden"
          data-testid="dossier-whatsapp-opened-banner"
        >
          <div className="flex items-center gap-2 font-bold text-[#1B3B2B]">
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
            <span>WhatsApp Opened — Awaiting Customer Send</span>
          </div>
          <p className="text-[11px] text-[#424844]">
            Please review and press Send inside WhatsApp ({WHATSAPP_DISPLAY_PHONE}). Your quotation dossier remains saved in this browser and is not an order confirmation until confirmed by Sanskruti Arts.
          </p>
        </div>
      )}

      {/* ===================================================================== */}
      {/* A4 PORTRAIT DOCUMENT SHEET                                            */}
      {/* ===================================================================== */}
      <article
        className="a4-dossier-sheet max-w-[210mm] mx-auto bg-white border border-[#C1C8C2] shadow-md print:shadow-none print:border-none p-6 sm:p-10 lg:p-12 print:p-0 text-[#191C1A] space-y-7 print:space-y-4"
        aria-label="Official Quotation Dossier"
      >
        {/* ------------------------------------------------------------------- */}
        {/* 1. DOCUMENT HEADER                                                  */}
        {/* ------------------------------------------------------------------- */}
        <header className="dossier-section-card print-break-inside-avoid border-b-2 border-[#1B3B2B] pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <svg
                width="30"
                height="30"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
                className="text-[#9C7A3C] shrink-0"
              >
                <rect x="2" y="2" width="28" height="28" stroke="#1B3B2B" strokeWidth="1.5" />
                <rect x="6" y="6" width="20" height="20" stroke="#9C7A3C" strokeWidth="1.2" />
                <path d="M2 2L6 6M30 2L26 6M2 30L6 26M30 30L26 26" stroke="#1B3B2B" strokeWidth="1" />
              </svg>
              <div>
                <span className="font-headline text-2xl font-bold text-[#1B3B2B] leading-none block">
                  Sanskruti Arts
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#9C7A3C] font-semibold">
                  India · Moulding Atelier
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[#424844] font-body space-y-0.5 pt-1">
              <p>Atelier Location: Mumbai &amp; Gujarat, India</p>
              <p>Workshop Hours: Mon – Sat, 9:30 AM – 7:00 PM IST</p>
              <p>WhatsApp Enquiry Desk: {WHATSAPP_DISPLAY_PHONE}</p>
            </div>
          </div>

          <div className="sm:text-right space-y-1.5">
            <span className="inline-block font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 border border-[#9C7A3C] text-[#9C7A3C] rounded-sm font-bold">
              Quotation Estimate
            </span>
            <h1 className="font-headline text-3xl sm:text-4xl font-bold text-[#1B3B2B] tracking-tight leading-none">
              QUOTATION
            </h1>
            <div className="text-xs font-mono text-[#191C1A] space-y-0.5 pt-1">
              <p>
                <span className="text-[#5A615C]">Reference:</span>{' '}
                <strong data-testid="dossier-quotation-number">#{quotation.quotationNumber}</strong>
              </p>
              <p>
                <span className="text-[#5A615C]">Date Issued:</span> {formattedDate}
              </p>
              <p>
                <span className="text-[#5A615C]">Status:</span>{' '}
                <span>{getQuotationStatusLabel(activeStatus)}</span>
              </p>
            </div>
          </div>
        </header>

        {/* ------------------------------------------------------------------- */}
        {/* 2. CUSTOMER INFORMATION (DISPLAYS ONLY PROVIDED DETAILS)            */}
        {/* ------------------------------------------------------------------- */}
        <section
          className="dossier-section-card print-break-inside-avoid print-ink-clean bg-[#FAF8F5] border border-[#C1C8C2]/80 rounded-sm p-4 sm:p-5 space-y-2.5"
          aria-label="Customer Information"
          data-testid="dossier-customer-section"
        >
          <h2 className="font-mono text-[11px] uppercase tracking-widest font-bold text-[#1B3B2B] border-b border-[#E8E4DA] pb-1.5">
            Prepared For (Customer &amp; Delivery Destination)
          </h2>

          {hasCustomerInfo ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
              <div className="space-y-0.5">
                {customer.fullName.trim() && (
                  <p className="font-bold text-sm text-[#191C1A]">{customer.fullName}</p>
                )}
                {customer.phone.trim() && (
                  <p>
                    <span className="text-[#5A615C]">Mobile:</span> {customer.phone}
                  </p>
                )}
                {customer.email?.trim() && (
                  <p>
                    <span className="text-[#5A615C]">Email:</span> {customer.email}
                  </p>
                )}
              </div>

              <div className="space-y-0.5">
                {customer.addressLine1.trim() && <p>{customer.addressLine1}</p>}
                {customer.addressLine2?.trim() && <p>{customer.addressLine2}</p>}
                {(customer.city.trim() || customer.state.trim() || customer.postalCode.trim()) && (
                  <p>
                    {[customer.city.trim(), customer.state.trim()].filter(Boolean).join(', ')}
                    {customer.postalCode.trim() ? ` — PIN ${customer.postalCode.trim()}` : ''}
                  </p>
                )}
              </div>

              {customer.notes?.trim() && (
                <div className="sm:col-span-2 pt-1.5 border-t border-[#E8E4DA] text-[11px] text-[#424844]">
                  <span className="font-semibold text-[#1B3B2B]">Project Notes:</span> {customer.notes}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#5A615C] italic">
              Customer contact and destination details were not supplied when this quotation snapshot was recorded.
            </p>
          )}
        </section>

        {/* ------------------------------------------------------------------- */}
        {/* 3. VISUAL PROOF (STRICTLY FROM SAVED QUOTATION SNAPSHOT)            */}
        {/* ------------------------------------------------------------------- */}
        <section
          className="dossier-section-card print-break-inside-avoid border border-[#C1C8C2]/80 rounded-sm overflow-hidden"
          aria-label="Frame Visual Proof"
          data-testid="dossier-visual-proof"
        >
          <div className="px-4 py-2.5 bg-[#FAF8F5] print-ink-clean border-b border-[#E8E4DA] flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-widest font-bold text-[#1B3B2B]">
              Visual Specification Proof
            </span>
            <span className="font-mono text-[11px] text-[#5A615C]">
              SKU: {spec.frameId} · {spec.width} × {spec.height} {spec.unit}
            </span>
          </div>

          <div className="w-full bg-[#F7F3EB] print-ink-clean flex items-center justify-center py-2 px-2">
            <div className="w-full max-w-[580px] print:max-w-[410px]">
              <FrameCanvas2D
                frame={snapshotFrame}
                width={spec.width}
                height={spec.height}
                unit={spec.unit}
                mat={snapshotMat}
                artwork={snapshotArtwork}
                customArtUrl={artworkLoadFailed ? DOSSIER_ARTWORK_UNAVAILABLE_SVG : resolvedCustomArtUrl}
                artworkFit={spec.artworkFit}
                canvasSubMode="render"
                wallColorHex="#FAF8F5"
                showDimensions={false}
                showGlassGlare={spec.glazingId !== 'none'}
              />
            </div>
          </div>

          {(artworkLoadFailed || isCustomArtMissing) && (
            <div
              className="px-4 py-2 bg-[#FFFBEB] print-ink-clean border-t border-[#E8E4DA] flex items-center gap-2 text-[11px] text-[#78350F]"
              data-testid="dossier-artwork-fallback-notice"
            >
              <ImageOff className="w-3.5 h-3.5 text-[#9C7A3C] flex-shrink-0" />
              <span>
                Original uploaded artwork is unavailable and may need to be uploaded again. Frame profile and dimensions remain accurate.
              </span>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------------- */}
        {/* 4. FRAME SPECIFICATION TABLE                                        */}
        {/* ------------------------------------------------------------------- */}
        <section
          className="dossier-section-card print-break-inside-avoid space-y-2.5"
          aria-label="Frame Specifications"
          data-testid="dossier-specs-table"
        >
          <h2 className="font-mono text-[11px] uppercase tracking-widest font-bold text-[#1B3B2B] print-break-after-avoid">
            Technical Framing Specifications
          </h2>

          <div className="overflow-x-auto border border-[#C1C8C2] rounded-sm">
            <table className="w-full border-collapse text-xs text-left">
              <tbody>
                <tr className="border-b border-[#E8E4DA]">
                  <th className="py-2.5 px-3.5 bg-[#FAF8F5] print-ink-clean font-semibold text-[#1B3B2B] w-1/3 border-r border-[#E8E4DA]">
                    Moulding Profile
                  </th>
                  <td className="py-2.5 px-3.5 text-[#191C1A]">
                    <strong>{spec.frameName}</strong>{' '}
                    <span className="font-mono text-[11px] text-[#5A615C]">(SKU: {spec.frameId})</span>
                  </td>
                </tr>
                <tr className="border-b border-[#E8E4DA]">
                  <th className="py-2.5 px-3.5 bg-[#FAF8F5] print-ink-clean font-semibold text-[#1B3B2B] border-r border-[#E8E4DA]">
                    Material &amp; Finish
                  </th>
                  <td className="py-2.5 px-3.5 text-[#191C1A]">
                    {spec.material} · {spec.finish}
                  </td>
                </tr>
                <tr className="border-b border-[#E8E4DA]">
                  <th className="py-2.5 px-3.5 bg-[#FAF8F5] print-ink-clean font-semibold text-[#1B3B2B] border-r border-[#E8E4DA]">
                    Profile Geometry
                  </th>
                  <td className="py-2.5 px-3.5 font-mono text-[#191C1A]">
                    {spec.profileWidth.toFixed(2)}&quot; face width × {spec.depth.toFixed(2)}&quot; rabbet depth
                  </td>
                </tr>
                <tr className="border-b border-[#E8E4DA]">
                  <th className="py-2.5 px-3.5 bg-[#FAF8F5] print-ink-clean font-semibold text-[#1B3B2B] border-r border-[#E8E4DA]">
                    Artwork Opening
                  </th>
                  <td className="py-2.5 px-3.5 font-mono text-[#191C1A]">
                    {spec.width} × {spec.height} {spec.unit}{' '}
                    <span className="font-sans text-[#5A615C]">({spec.aspectRatioLabel})</span>
                  </td>
                </tr>
                <tr className="border-b border-[#E8E4DA]">
                  <th className="py-2.5 px-3.5 bg-[#FAF8F5] print-ink-clean font-semibold text-[#1B3B2B] border-r border-[#E8E4DA]">
                    Finished Outer Size
                  </th>
                  <td className="py-2.5 px-3.5 font-mono text-[#191C1A]">
                    {spec.finishedOuterWidth.toFixed(2)} × {spec.finishedOuterHeight.toFixed(2)} {spec.unit}
                  </td>
                </tr>
                <tr className="border-b border-[#E8E4DA]">
                  <th className="py-2.5 px-3.5 bg-[#FAF8F5] print-ink-clean font-semibold text-[#1B3B2B] border-r border-[#E8E4DA]">
                    Archival Matboard
                  </th>
                  <td className="py-2.5 px-3.5 text-[#191C1A]">
                    {spec.matId === 'mat-none'
                      ? 'Full Bleed (No Mat Selected)'
                      : `${spec.matName} (${spec.matBorderWidth}" border reveal)`}
                  </td>
                </tr>
                <tr className="border-b border-[#E8E4DA]">
                  <th className="py-2.5 px-3.5 bg-[#FAF8F5] print-ink-clean font-semibold text-[#1B3B2B] border-r border-[#E8E4DA]">
                    Conservation Glazing
                  </th>
                  <td className="py-2.5 px-3.5 text-[#191C1A]">
                    {spec.glazingName}{' '}
                    <span className="text-[#5A615C]">({spec.glazingSpecs})</span>
                  </td>
                </tr>
                <tr className="border-b border-[#E8E4DA]">
                  <th className="py-2.5 px-3.5 bg-[#FAF8F5] print-ink-clean font-semibold text-[#1B3B2B] border-r border-[#E8E4DA]">
                    Hanging Hardware
                  </th>
                  <td className="py-2.5 px-3.5 text-[#191C1A]">
                    {spec.mountingName}{' '}
                    <span className="text-[#5A615C]">({spec.mountingSpecs})</span>
                  </td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3.5 bg-[#FAF8F5] print-ink-clean font-semibold text-[#1B3B2B] border-r border-[#E8E4DA]">
                    Artwork Reference
                  </th>
                  <td className="py-2.5 px-3.5 text-[#191C1A]">
                    {spec.artworkTitle} · {spec.artworkArtist} (Fit:{' '}
                    {spec.artworkFit === 'fit' ? 'Contain Full Image' : 'Cover / Fill'})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------------------------- */}
        {/* 5. ITEMIZED PRICING SNAPSHOT TABLE (EXACT HISTORICAL VALUES)        */}
        {/* ------------------------------------------------------------------- */}
        <section
          className="dossier-section-card print-break-inside-avoid space-y-2.5"
          aria-label="Itemized Commercial Valuation"
          data-testid="dossier-pricing-table"
        >
          <div className="flex items-center justify-between print-break-after-avoid">
            <h2 className="font-mono text-[11px] uppercase tracking-widest font-bold text-[#1B3B2B]">
              Itemized Commercial Valuation (INR)
            </h2>
            <span className="font-mono text-[10px] text-[#5A615C]">
              Snapshot Currency: INR (₹)
            </span>
          </div>

          <div className="overflow-x-auto border border-[#1B3B2B]/40 rounded-sm">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8F5] print-ink-clean border-b border-[#1B3B2B]/30 text-[#1B3B2B] font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3.5 text-left">Line Item &amp; Allocation Basis</th>
                  <th className="py-2.5 px-3.5 text-right w-36">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DA]">
                <tr>
                  <td className="py-2.5 px-3.5">
                    <strong className="text-[#191C1A]">Moulding Profile ({spec.frameId})</strong>
                    <div className="text-[11px] text-[#5A615C]">
                      {pricing.linearFeet.toFixed(1)} linear ft (incl. 45° miter allowance) @ {formatINR(spec.footRateINR)}/ft
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#191C1A]">
                    {formatINR(pricing.mouldingCost)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-3.5">
                    <strong className="text-[#191C1A]">Archival Matboard</strong>
                    <div className="text-[11px] text-[#5A615C]">
                      {spec.matId === 'mat-none'
                        ? 'Full Bleed (No Mat Selected)'
                        : `${spec.matName} (${spec.matBorderWidth}" border)`}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#191C1A]">
                    {pricing.matCost === 0 ? '₹0' : formatINR(pricing.matCost)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-3.5">
                    <strong className="text-[#191C1A]">Glass &amp; Workshop Assembly</strong>
                    <div className="text-[11px] text-[#5A615C]">
                      Backing board, sealing, and {spec.mountingName}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#191C1A]">
                    {formatINR(pricing.assemblyCost)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-3.5">
                    <strong className="text-[#191C1A]">Selected Glazing Adjustment</strong>
                    <div className="text-[11px] text-[#5A615C]">{spec.glazingName}</div>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#191C1A]">
                    {pricing.glazingDelta > 0
                      ? `+${formatINR(pricing.glazingDelta)}`
                      : pricing.glazingDelta < 0
                      ? `-${formatINR(Math.abs(pricing.glazingDelta))}`
                      : 'Included (₹0)'}
                  </td>
                </tr>

                <tr className="bg-[#FAF8F5] print-ink-clean">
                  <td className="py-2.5 px-3.5 font-bold text-[#1B3B2B]">Taxable Subtotal</td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#1B3B2B]">
                    {pricing.formattedSubtotal}
                  </td>
                </tr>

                <tr className="bg-[#FAF8F5] print-ink-clean">
                  <td className="py-2.5 px-3.5">
                    <strong className="text-[#1B3B2B]">
                      GST — Provisional Estimate ({Math.round(pricing.gstRate * 100)}%)
                    </strong>
                    <div className="text-[11px] text-[#5A615C]">
                      Provisional tax estimate only. Final tax treatment, classification, and tax amounts are subject to Sanskruti Arts workshop confirmation.
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#1B3B2B]">
                    {pricing.formattedGst}
                  </td>
                </tr>

                <tr className="bg-[#FAF8F5] print-ink-clean">
                  <td className="py-2.5 px-3.5">
                    <strong className="text-[#1B3B2B]">
                      Delivery — To be confirmed by workshop.
                    </strong>
                    <div className="text-[11px] text-[#5A615C]">
                      Preferred dispatch:{' '}
                      <strong>
                        {pricing.delivery.selectedTier === 'courier'
                          ? 'Art Crate Express'
                          : pricing.delivery.selectedTier === 'pickup'
                          ? 'Mumbai Workshop Pickup'
                          : 'Insured Parcel'}
                      </strong>{' '}
                      · Excluded from estimated total; transit charges confirmed separately by the workshop.
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-[#9C7A3C]">
                    TBD
                  </td>
                </tr>

                <tr className="bg-[#F7F3EB] print-ink-clean border-t-2 border-[#1B3B2B]">
                  <td className="py-3.5 px-3.5">
                    <strong className="font-serif text-base text-[#1B3B2B]">
                      Estimated Total (Excl. Delivery)
                    </strong>
                  </td>
                  <td
                    className="py-3.5 px-3.5 text-right font-serif text-xl sm:text-2xl font-bold text-[#1B3B2B]"
                    data-testid="dossier-estimated-total"
                  >
                    {pricing.formattedTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------------------------- */}
        {/* 6. COMMERCIAL TERMS & LOCAL STORAGE PRIVACY NOTICE                  */}
        {/* ------------------------------------------------------------------- */}
        <footer className="dossier-section-card print-break-inside-avoid pt-4 border-t border-[#C1C8C2] text-[11px] text-[#424844] space-y-2 leading-relaxed">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#9C7A3C] flex-shrink-0 mt-0.5" />
            <p>
              <strong>Quotation Estimate Disclosure:</strong> This document is a{' '}
              <strong>Quotation Estimate</strong> and does not constitute a Tax Invoice or binding production contract. Final pricing, statutory tax classification, and delivery logistics will be confirmed by Sanskruti Arts prior to manufacturing allocation.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#5A615C] flex-shrink-0 mt-0.5" />
            <p>
              <strong>Local Storage Notice:</strong> Locally saved quotations are stored exclusively in this browser&apos;s storage on your current device; they are not backed up to remote servers or synchronized across browsers.
            </p>
          </div>
        </footer>
      </article>
    </div>
  );
};
