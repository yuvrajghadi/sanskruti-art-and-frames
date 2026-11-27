import React, { useState, useMemo, useEffect } from 'react';
import { FrameSample, MatOption, ArtworkOption, FrameCustomizationConfig } from '../types';
import {
  QuotationSnapshot,
  QuotationStatus,
  CustomerDetails,
  calculateQuotationPricing,
  getQuotationStatusLabel,
} from '../types/quotation';
import { formatINR } from '../utils/pricing';
import { WHATSAPP_DISPLAY_PHONE } from '../utils/whatsapp';
import { buildQuotationWhatsAppHandoff } from '../utils/quotationEnquiry';
import { saveLead } from '../utils/leadStorage';
import { loadCustomArtworkAsset, DOSSIER_ARTWORK_UNAVAILABLE_SVG } from '../utils/artworkStorage';
import { MAT_OPTIONS, ARTWORK_OPTIONS } from '../data/frames';
import { GLAZING_OPTIONS } from './CustomFramingStudio';
import { FrameCanvas2D } from './FrameCanvas2D';
import { EyebrowBadge, SpecPill } from './ui/LuxuryPrimitives';
import {
  ArrowLeft,
  Check,
  AlertCircle,
  MessageCircle,
  ShieldCheck,
  Ruler,
  Layers,
  Sparkles,
  FileText,
  SlidersHorizontal,
  Bookmark,
  RefreshCw,
  Info,
  MapPin,
  Printer,
  ImageOff,
} from 'lucide-react';

export interface CustomerValidationErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export const INDIAN_STATES_LIST = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi NCR',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Chandigarh',
  'Puducherry',
];

/**
 * Pure validator for Indian domestic customer details.
 * Exported for deterministic unit testing and reuse.
 */
export function validateCustomerDetails(customer: CustomerDetails): {
  isValid: boolean;
  errors: CustomerValidationErrors;
} {
  const errors: CustomerValidationErrors = {};

  const name = (customer.fullName || '').trim();
  if (name.length < 2) {
    errors.fullName = 'Please enter your full name (minimum 2 characters).';
  }

  // Strip spaces, dashes, and +91 / leading 0 for Indian 10-digit mobile check
  const rawDigits = (customer.phone || '').replace(/[\s\-()+]/g, '');
  const normalizedPhone = rawDigits.startsWith('91') && rawDigits.length === 12
    ? rawDigits.slice(2)
    : rawDigits.startsWith('0') && rawDigits.length === 11
    ? rawDigits.slice(1)
    : rawDigits;

  if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number (starting with 6–9).';
  }

  const email = (customer.email || '').trim();
  if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address if providing an email for correspondence.';
  }

  const address = (customer.addressLine1 || '').trim();
  if (address.length < 5) {
    errors.addressLine1 = 'Enter your complete street, apartment, or studio address.';
  }

  const city = (customer.city || '').trim();
  if (city.length < 2) {
    errors.city = 'Enter your delivery city.';
  }

  const state = (customer.state || '').trim();
  if (state.length < 2) {
    errors.state = 'Select or enter your state / union territory.';
  }

  const pin = (customer.postalCode || '').trim();
  if (!/^[1-9]\d{5}$/.test(pin)) {
    errors.postalCode = 'Enter a valid 6-digit Indian PIN code (e.g. 400001).';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface QuotationReviewPageProps {
  quotation: QuotationSnapshot | null;
  allFrames: FrameSample[];
  liveStudioConfig: FrameCustomizationConfig;
  hasStudioDiverged: boolean;
  savedQuotationsCount: number;
  storageError: string | null;
  saveFeedback: string | null;
  artworkStorageWarning?: string | null;
  onUpdateCustomer: (customer: CustomerDetails) => void;
  onUpdateShippingTier?: (tier: 'standard' | 'courier' | 'pickup') => void;
  onSaveSnapshot: (statusOverride?: QuotationStatus) => boolean;
  onCreateNewFromStudio: () => void;
  onReturnToStudio: () => void;
  onEditConfigurationFromSnapshot: () => void;
  onNavigateCatalog: () => void;
  onNavigateQuotations?: () => void;
  onOpenDossier?: (id: string) => void;
  onOpenPrintDossier?: (id: string) => void;
}

export const QuotationReviewPage: React.FC<QuotationReviewPageProps> = ({
  quotation,
  allFrames,
  hasStudioDiverged,
  savedQuotationsCount,
  storageError,
  saveFeedback,
  artworkStorageWarning,
  onUpdateCustomer,
  onUpdateShippingTier,
  onSaveSnapshot,
  onCreateNewFromStudio,
  onReturnToStudio,
  onEditConfigurationFromSnapshot,
  onNavigateCatalog,
  onNavigateQuotations,
  onOpenDossier,
  onOpenPrintDossier,
}) => {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [enquiryPrepared, setEnquiryPrepared] = useState(false);
  const [artworkLoadFailed, setArtworkLoadFailed] = useState(false);
  const [hydratedCustomArtUrl, setHydratedCustomArtUrl] = useState<string | null>(null);
  const [artworkHydrationAttempted, setArtworkHydrationAttempted] = useState(false);
  const [shippingTierPref, setShippingTierPref] = useState<'standard' | 'courier' | 'pickup'>(
    quotation?.pricing.shippingTier || 'standard'
  );

  // Sync artwork load failure reset when quotation ID changes
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [copiedEnquiryMsg, setCopiedEnquiryMsg] = useState(false);

  const spec = quotation?.specifications;

  useEffect(() => {
    setArtworkLoadFailed(false);
    setEnquiryPrepared(quotation?.status === 'whatsapp_opened' || quotation?.status === 'enquired');
    setSubmitAttempted(false);
    setTouchedFields({});
    setWhatsappError(null);
    setShippingTierPref(quotation?.pricing.shippingTier || 'standard');
  }, [quotation?.id, quotation?.pricing.shippingTier]);

  // Hydrate persistent custom artwork from IndexedDB when asset ID is referenced
  useEffect(() => {
    let cancelled = false;
    if (spec?.customArtUrl) {
      setHydratedCustomArtUrl(spec.customArtUrl);
      setArtworkHydrationAttempted(true);
      return;
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
  }, [quotation?.id, spec?.customArtAssetId, spec?.customArtUrl]);

  const frozenPricing = quotation?.pricing;
  const customer = quotation?.customer || {
    fullName: '',
    phone: '',
    email: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    notes: '',
  };

  // Reconstruct authentic FrameSample strictly from the frozen quotation snapshot
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

  // Reconstruct authentic MatOption strictly from the frozen quotation snapshot
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

  // Reconstruct ArtworkOption strictly from the frozen quotation snapshot with explicit fallback
  const isCustomArtMissing = Boolean(
    isCustomArtworkSpec && !isWaitingCustomArtHydration && !resolvedCustomArtUrl
  );

  const snapshotArtwork: ArtworkOption = useMemo(() => {
    if (!spec) return ARTWORK_OPTIONS[0];
    if (artworkLoadFailed || isCustomArtMissing) {
      return {
        id: spec.artworkId || 'artwork-fallback',
        title: spec.artworkTitle || 'Artwork Reference Unavailable',
        artist: spec.artworkArtist || 'Configured Opening Preserved',
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

  // Recompute pricing proof ONLY using pricing.ts if verifying against snapshot,
  // while displaying the snapshot's frozen commercial ledger.
  const glazingOption = GLAZING_OPTIONS.find((g) => g.id === spec?.glazingId) || GLAZING_OPTIONS[0];

  const pricingVerification = useMemo(() => {
    if (!spec) return null;
    return calculateQuotationPricing(
      snapshotFrame,
      spec.width,
      spec.height,
      spec.unit,
      snapshotMat,
      glazingOption,
      shippingTierPref
    );
  }, [snapshotFrame, spec, snapshotMat, glazingOption, shippingTierPref]);

  // Use frozen quotation pricing values (guaranteed consistent with pricing.ts)
  const displayPricing = frozenPricing || pricingVerification;

  // Validate Customer Form
  const validation = useMemo(() => validateCustomerDetails(customer), [customer]);

  // Construct snapshot-accurate WhatsApp Enquiry handoff (never recalculates prices)
  const whatsappHandoff = useMemo(() => {
    if (!quotation || !spec || !displayPricing) {
      return { ok: false, url: null, message: null, usedCompactFallback: false, error: 'Missing quotation snapshot.' };
    }
    const effectiveStatus: QuotationStatus =
      quotation.status === 'whatsapp_opened' || quotation.status === 'enquired'
        ? 'whatsapp_opened'
        : validation.isValid
        ? 'ready'
        : 'draft';
    return buildQuotationWhatsAppHandoff({
      ...quotation,
      status: effectiveStatus,
      customer: { ...customer },
      pricing: {
        ...quotation.pricing,
        shippingTier: shippingTierPref,
        delivery: {
          ...quotation.pricing.delivery,
          selectedTier: shippingTierPref,
        },
      },
    });
  }, [quotation, spec, displayPricing, customer, validation.isValid, shippingTierPref]);

  // Empty / fallback state if no quotation exists (AFTER all hooks to satisfy React Rules of Hooks)
  if (!quotation || !spec || !displayPricing) {
    return (
      <div className="flex-1 bg-[#F7F5EF] py-16 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white border border-[#C1C8C2]/70 rounded-sm p-8 text-center space-y-5 shadow-xs">
          <EyebrowBadge variant="bronze">Quotation Dossier</EyebrowBadge>
          <h1 className="font-headline text-3xl text-[#1B3B2B] font-semibold">
            No Active Framing Estimate
          </h1>
          <p className="text-sm text-[#424844] leading-relaxed">
            Configure your bespoke moulding profile, artwork dimensions, archival matboard, and conservation glazing in the Custom Framing Studio to generate an itemized quotation estimate.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={onReturnToStudio}
              className="px-6 py-3 bg-[#1B3B2B] hover:bg-[#032517] text-white font-label text-xs uppercase tracking-widest font-semibold rounded-sm transition-colors cursor-pointer"
            >
              Open Framing Studio
            </button>
            <button
              type="button"
              onClick={onNavigateCatalog}
              className="px-6 py-3 border border-[#1B3B2B] text-[#1B3B2B] hover:bg-[#F7F3EB] font-label text-xs uppercase tracking-widest font-semibold rounded-sm transition-colors cursor-pointer"
            >
              Browse Mouldings
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFieldChange = (field: keyof CustomerDetails, value: string) => {
    onUpdateCustomer({
      ...customer,
      [field]: value,
    });
  };

  const handleFieldBlur = (field: keyof CustomerDetails) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const showError = (field: keyof CustomerValidationErrors): string | undefined => {
    if (submitAttempted || touchedFields[field]) {
      return validation.errors[field];
    }
    return undefined;
  };

  const handleSaveDraftClick = () => {
    setSubmitAttempted(true);
    setWhatsappError(null);
    const targetStatus: QuotationStatus = validation.isValid ? 'ready' : 'draft';
    onSaveSnapshot(targetStatus);
  };

  const handleContinueToEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setWhatsappError(null);

    if (!validation.isValid) {
      // Scroll to first invalid input gently without losing entered form fields
      const firstErrKey = Object.keys(validation.errors)[0];
      if (firstErrKey && typeof document !== 'undefined') {
        const el = document.getElementById(`customer-${firstErrKey}`);
        el?.focus();
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!whatsappHandoff.ok || !whatsappHandoff.url) {
      setWhatsappError(whatsappHandoff.error || 'Could not build WhatsApp enquiry URL.');
      return;
    }

    saveLead({
      leadType: 'formal_dossier',
      clientName: customer.fullName,
      mobile: customer.phone,
      cityOrPin: [customer.city, customer.state, customer.postalCode ? `PIN ${customer.postalCode}` : '']
        .filter(Boolean)
        .join(', '),
      skus: [spec.frameId],
      configurationUrl: quotation.studioShareUrl || (typeof window !== 'undefined' ? window.location.href : '/review'),
      estimatedTotalINR: displayPricing.totalEstimatedAmount,
      notes: `Ref #${quotation.quotationNumber} · ${spec.width}×${spec.height} ${spec.unit}`,
    });

    onSaveSnapshot('whatsapp_opened');
    setEnquiryPrepared(true);

    if (typeof window !== 'undefined') {
      window.open(whatsappHandoff.url, '_blank', 'noopener,noreferrer');
    }
  };

  const liveStatusLabel =
    quotation.status === 'whatsapp_opened' || quotation.status === 'enquired'
      ? getQuotationStatusLabel('whatsapp_opened')
      : validation.isValid
      ? getQuotationStatusLabel('ready')
      : getQuotationStatusLabel('draft');

  const wallHex =
    spec.wallColor === 'forest'
      ? '#1B3B2B'
      : spec.wallColor === 'linen'
      ? '#EDE7DA'
      : '#E8E4DA';

  const formattedCreatedAt = new Date(quotation.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div
      className="flex-1 bg-[#F7F5EF] text-[#191C1A] min-h-full overflow-x-hidden pb-24 lg:pb-16"
      data-testid="quotation-review-page"
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
      {/* TOP EDITORIAL SUBHEADER & NAVIGATION BAR                              */}
      {/* ===================================================================== */}
      <div className="bg-[#FAF8F5] border-b border-[#C1C8C2]/60 print:hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <EyebrowBadge variant="bronze">Quotation Estimate</EyebrowBadge>
              <span
                className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-sm bg-[#1B3B2B] text-white tracking-wider"
                data-testid="quotation-ref-badge"
              >
                #{quotation.quotationNumber}
              </span>
              <span
                className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-sm bg-[#F7F3EB] border border-[#9C7A3C]/40 text-[#1B3B2B]"
                data-testid="quotation-status-badge"
              >
                Status: {liveStatusLabel}
              </span>
              <span className="font-mono text-[11px] text-[#5A615C]">
                Snapshot captured {formattedCreatedAt}
              </span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-semibold text-[#1B3B2B] tracking-tight">
              Quotation Review &amp; Specification Summary
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onReturnToStudio}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-[#C1C8C2] bg-white hover:bg-[#F7F3EB] text-xs font-semibold text-[#1B3B2B] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Studio</span>
            </button>

            <button
              type="button"
              onClick={onEditConfigurationFromSnapshot}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-[#9C7A3C] bg-[#F7F3EB] hover:bg-[#EDE4D4] text-xs font-semibold text-[#1B3B2B] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#9C7A3C]" />
              <span>Edit Configuration</span>
            </button>

            {onOpenDossier && (
              <button
                type="button"
                onClick={() => {
                  const ok = onSaveSnapshot();
                  if (ok || quotation.id) onOpenDossier(quotation.id);
                }}
                data-testid="review-open-dossier-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-[#1B3B2B] bg-white hover:bg-[#F7F3EB] text-xs font-semibold text-[#1B3B2B] transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#1B3B2B]" />
                <span>View Quotation Dossier</span>
              </button>
            )}

            {onNavigateQuotations && (
              <button
                type="button"
                onClick={onNavigateQuotations}
                data-testid="review-saved-quotations-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-[#C1C8C2] bg-white hover:bg-[#F7F3EB] text-xs font-semibold text-[#1B3B2B] transition-colors cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#9C7A3C]" />
                <span>Saved Quotes ({savedQuotationsCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (onOpenPrintDossier) {
                  const ok = onSaveSnapshot();
                  if (ok || quotation.id) onOpenPrintDossier(quotation.id);
                } else if (typeof window !== 'undefined') {
                  window.print();
                }
              }}
              data-testid="review-print-dossier-btn"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-[#1B3B2B] hover:bg-[#032517] text-xs font-semibold text-white transition-colors cursor-pointer"
              title="Open A4 printable quotation dossier"
            >
              <Printer className="w-3.5 h-3.5 text-[#CCA563]" />
              <span>Print Quotation (A4)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* STUDIO DIVERGENCE NOTICE (PROVES SNAPSHOT IMMUTABILITY)               */}
      {/* ===================================================================== */}
      {hasStudioDiverged && (
        <div
          className="bg-[#FFFBEB] border-b border-[#D97706]/30 print:hidden"
          data-testid="studio-diverged-banner"
        >
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5 text-xs text-[#78350F]">
              <Info className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Studio configuration was edited</strong> after quotation{' '}
                <span className="font-mono font-bold">#{quotation.quotationNumber}</span> was captured. Your saved quotation snapshot remains preserved unchanged below.
              </span>
            </div>
            <button
              type="button"
              onClick={onCreateNewFromStudio}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-[#1B3B2B] hover:bg-[#032517] text-white text-xs font-semibold tracking-wide transition-colors flex-shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Create New Quotation from Studio Edits</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STORAGE CAPACITY OR SAVE FEEDBACK NOTICES                             */}
      {/* ===================================================================== */}
      {storageError && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 print:hidden">
          <div className="p-3.5 rounded-sm bg-red-50 border border-red-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-red-900">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{storageError}</span>
            </div>
            {onNavigateQuotations && (
              <button
                type="button"
                onClick={onNavigateQuotations}
                data-testid="review-manage-quotations-btn"
                className="px-3 py-1.5 rounded-sm bg-red-900 hover:bg-red-800 text-white text-[11px] font-semibold flex-shrink-0 cursor-pointer"
              >
                Manage Saved Quotations ({savedQuotationsCount}/50)
              </button>
            )}
          </div>
        </div>
      )}

      {artworkStorageWarning && (
        <div
          className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 print:hidden"
          data-testid="artwork-storage-warning"
        >
          <div className="p-3.5 rounded-sm bg-amber-50 border border-amber-300 flex items-start gap-2.5 text-xs text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <span>{artworkStorageWarning}</span>
          </div>
        </div>
      )}

      {saveFeedback && !storageError && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 print:hidden">
          <div className="p-3 rounded-sm bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-2.5 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>{saveFeedback}</span>
            </div>
            <span className="font-mono text-[11px] text-emerald-800">
              Saved ledger entries: {savedQuotationsCount}/50
            </span>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MAIN RESPONSIVE EDITORIAL WORKSPACE (7/5 DESKTOP, STACKED MOBILE)     */}
      {/* ===================================================================== */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ----------------------------------------------------------------- */}
          {/* LEFT COLUMN (7/12): FRAME PREVIEW & SAVED SPECIFICATION SUMMARY   */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-7 space-y-6">
            {/* Live Snapshot Frame Preview Card */}
            <section
              className="bg-white border border-[#C1C8C2]/70 rounded-sm shadow-xs overflow-hidden"
              aria-label="Saved Quotation Frame Preview"
            >
              <div className="px-4 sm:px-5 py-3 bg-[#FAF8F5] border-b border-[#E8E4DA] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#9C7A3C]" />
                  <span className="font-serif text-sm sm:text-base font-bold text-[#1B3B2B]">
                    Frozen Quotation Visual Proof
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#5A615C] bg-white px-2.5 py-0.5 border border-[#E8E4DA] rounded-sm">
                  SKU: {spec.frameId}
                </span>
              </div>

              <div className="w-full min-h-[300px] sm:min-h-[420px] lg:min-h-[480px] bg-[#F7F3EB] flex flex-col">
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
                  wallColorHex={wallHex}
                  showDimensions={true}
                  showGlassGlare={spec.glazingId !== 'none'}
                />
              </div>

              {(artworkLoadFailed || isCustomArtMissing) && (
                <div
                  className="px-4 py-2.5 bg-[#F7F3EB] border-t border-[#E8E4DA] flex items-center gap-2 text-xs text-[#5A615C]"
                  data-testid="artwork-fallback-notice"
                >
                  <ImageOff className="w-4 h-4 text-[#9C7A3C] flex-shrink-0" />
                  <span>
                    Original uploaded artwork asset cannot be restored in this preview; opening dimensions ({spec.width} × {spec.height} {spec.unit}) and framing specifications remain preserved.
                  </span>
                </div>
              )}
            </section>

            {/* Saved Configuration Specification Summary */}
            <section
              className="bg-white border border-[#C1C8C2]/70 rounded-sm p-5 sm:p-6 shadow-xs space-y-5"
              aria-label="Saved Framing Specifications"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8E4DA]">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#9C7A3C] font-bold block">
                    Workshop Specification Sheet
                  </span>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1B3B2B]">
                    {spec.frameName}
                  </h2>
                </div>
                <div className="font-mono text-xs text-[#1B3B2B] bg-[#F7F3EB] px-3 py-1.5 rounded-sm border border-[#E8E4DA] self-start sm:self-center">
                  Rate: {formatINR(spec.footRateINR)} / linear ft
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#424844] leading-relaxed">
                Crafted in <strong className="text-[#191C1A]">{spec.material}</strong> finished with{' '}
                <strong className="text-[#191C1A]">{spec.finish}</strong>. Precision mitered corners with{' '}
                {spec.profileWidth.toFixed(2)}" face profile and {spec.depth.toFixed(2)}" rabbet depth.
              </p>

              {/* Compact Spec Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SpecPill
                  label="Artwork Opening"
                  value={`${spec.width} × ${spec.height}`}
                  unit={spec.unit}
                />
                <SpecPill
                  label="Outer Frame"
                  value={`${spec.finishedOuterWidth.toFixed(2)} × ${spec.finishedOuterHeight.toFixed(2)}`}
                  unit={spec.unit}
                />
                <SpecPill
                  label="Moulding Profile"
                  value={`${spec.profileWidth.toFixed(2)}"`}
                  unit="face"
                />
                <SpecPill
                  label="Aspect Class"
                  value={spec.aspectRatioLabel}
                />
              </div>

              {/* Detailed Material Breakdown List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="p-3.5 rounded-sm bg-[#FAF8F5] border border-[#E8E4DA] space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#9C7A3C] font-bold">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Archival Matboard</span>
                  </div>
                  <p className="font-serif text-sm font-bold text-[#191C1A]">
                    {spec.matName}
                  </p>
                  <p className="text-[#5A615C]">
                    {spec.matId === 'mat-none'
                      ? 'Full bleed presentation without mat border'
                      : `${spec.matBorderWidth}" border reveal on all 4 sides · Acid-free bevel core`}
                  </p>
                </div>

                <div className="p-3.5 rounded-sm bg-[#FAF8F5] border border-[#E8E4DA] space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#9C7A3C] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Conservation Glazing</span>
                  </div>
                  <p className="font-serif text-sm font-bold text-[#191C1A]">
                    {spec.glazingName}
                  </p>
                  <p className="text-[#5A615C]">{spec.glazingSpecs}</p>
                </div>

                <div className="p-3.5 rounded-sm bg-[#FAF8F5] border border-[#E8E4DA] space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#9C7A3C] font-bold">
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Hanging Hardware</span>
                  </div>
                  <p className="font-serif text-sm font-bold text-[#191C1A]">
                    {spec.mountingName}
                  </p>
                  <p className="text-[#5A615C]">{spec.mountingSpecs}</p>
                </div>

                <div className="p-3.5 rounded-sm bg-[#FAF8F5] border border-[#E8E4DA] space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#9C7A3C] font-bold">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Artwork Subject</span>
                  </div>
                  <p className="font-serif text-sm font-bold text-[#191C1A]">
                    {spec.artworkTitle}
                  </p>
                  <p className="text-[#5A615C]">
                    {spec.artworkArtist} · Fit mode: {spec.artworkFit === 'fit' ? 'Contain (Full Image)' : 'Cover (Crop to Fill)'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* RIGHT COLUMN (5/12): ITEMIZED QUOTATION & CUSTOMER DETAILS FORM   */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-5 space-y-6">
            {/* ITEMIZED QUOTATION BREAKDOWN */}
            <section
              className="bg-white border border-[#C1C8C2]/70 rounded-sm shadow-xs overflow-hidden"
              aria-label="Itemized Quotation Estimate"
              data-testid="itemized-quotation-card"
            >
              <div className="px-5 py-4 bg-[#1B3B2B] text-white flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#CCA563] block">
                    Quotation Estimate
                  </span>
                  <h2 className="font-serif text-xl font-semibold tracking-tight">
                    Itemized Commercial Breakdown
                  </h2>
                </div>
                <span className="font-mono text-xs bg-white/10 px-2.5 py-1 rounded-sm border border-white/20">
                  INR (₹)
                </span>
              </div>

              <div className="divide-y divide-[#E8E4DA] text-xs sm:text-sm">
                {/* 1. Moulding */}
                <div className="px-5 py-3.5 flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold text-[#191C1A]">
                      Moulding Profile ({spec.frameId})
                    </p>
                    <p className="text-[11px] text-[#5A615C]">
                      {displayPricing.linearFeet.toFixed(1)} linear ft (incl. 45° miter allowance) @ {formatINR(spec.footRateINR)}/ft
                    </p>
                  </div>
                  <span className="font-mono font-bold text-[#191C1A] flex-shrink-0">
                    {formatINR(displayPricing.mouldingCost)}
                  </span>
                </div>

                {/* 2. Matboard */}
                <div className="px-5 py-3.5 flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold text-[#191C1A]">Archival Matboard</p>
                    <p className="text-[11px] text-[#5A615C]">
                      {spec.matId === 'mat-none'
                        ? 'Full Bleed (No Mat Selected)'
                        : `${spec.matName} (${spec.matBorderWidth}" border)`}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-[#191C1A] flex-shrink-0">
                    {displayPricing.matCost === 0 ? '₹0' : formatINR(displayPricing.matCost)}
                  </span>
                </div>

                {/* 3. Glass & Assembly */}
                <div className="px-5 py-3.5 flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold text-[#191C1A]">Glass &amp; Workshop Assembly</p>
                    <p className="text-[11px] text-[#5A615C]">
                      Backing board, conservation sealing &amp; {spec.mountingName}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-[#191C1A] flex-shrink-0">
                    {formatINR(displayPricing.assemblyCost)}
                  </span>
                </div>

                {/* 4. Selected Glazing Adjustment */}
                <div className="px-5 py-3.5 flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold text-[#191C1A]">
                      Selected Glazing Adjustment
                    </p>
                    <p className="text-[11px] text-[#5A615C]">{spec.glazingName}</p>
                  </div>
                  <span className="font-mono font-bold text-[#191C1A] flex-shrink-0">
                    {displayPricing.glazingDelta > 0
                      ? `+${formatINR(displayPricing.glazingDelta)}`
                      : displayPricing.glazingDelta < 0
                      ? `-${formatINR(Math.abs(displayPricing.glazingDelta))}`
                      : 'Included (₹0)'}
                  </span>
                </div>

                {/* 5. Taxable Subtotal */}
                <div className="px-5 py-3.5 bg-[#FAF8F5] flex justify-between items-center gap-4">
                  <div>
                    <p className="font-bold text-[#1B3B2B]">Taxable Subtotal</p>
                    <p className="text-[11px] text-[#5A615C]">Before provisional tax estimate</p>
                  </div>
                  <span className="font-mono font-bold text-[#1B3B2B]" data-testid="quote-subtotal">
                    {displayPricing.formattedSubtotal}
                  </span>
                </div>

                {/* 6. GST — Provisional Estimate */}
                <div className="px-5 py-3.5 bg-[#FAF8F5] flex justify-between items-start gap-4">
                  <div>
                    <p className="font-bold text-[#1B3B2B]">
                      GST — Provisional Estimate ({Math.round(displayPricing.gstRate * 100)}%)
                    </p>
                    <p className="text-[11px] text-[#5A615C]">
                      Provisional estimate only (HSN 4414 reference); final tax rules confirmed on workshop invoice
                    </p>
                  </div>
                  <span className="font-mono font-bold text-[#1B3B2B] flex-shrink-0" data-testid="quote-gst">
                    {displayPricing.formattedGst}
                  </span>
                </div>

                {/* 7. Delivery Status (Excluded from Total) */}
                <div className="px-5 py-3.5 bg-[#FAF8F5] flex justify-between items-start gap-4">
                  <div>
                    <p className="font-bold text-[#1B3B2B]">
                      Delivery — To be confirmed by workshop
                    </p>
                    <p className="text-[11px] text-[#5A615C]">
                      Excluded from estimated total. Pan-India crate &amp; insured transit quoted upon destination review.
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-[#9C7A3C] flex-shrink-0" data-testid="quote-delivery-status">
                    TBD
                  </span>
                </div>

                {/* 8. Final Estimated Total */}
                <div className="px-5 py-4 bg-[#F7F3EB] flex justify-between items-baseline gap-4 border-t-2 border-[#1B3B2B]/20">
                  <div>
                    <span className="font-serif text-base sm:text-lg font-bold text-[#1B3B2B] block">
                      Final Estimated Total
                    </span>
                    <span className="text-[11px] text-[#5A615C]">
                      Excludes delivery charges
                    </span>
                  </div>
                  <span
                    className="font-serif text-2xl sm:text-3xl font-bold text-[#1B3B2B]"
                    data-testid="quote-grand-total"
                  >
                    {displayPricing.formattedTotal}
                  </span>
                </div>
              </div>

              <div className="px-5 py-3 bg-[#FAF8F5] border-t border-[#E8E4DA] text-[11px] text-[#424844] flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-[#9C7A3C] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Commercial Notice:</strong> Final pricing and tax details will be confirmed by Sanskruti Arts. Submitting an enquiry does not constitute a binding payment or immediate stock dispatch.
                </span>
              </div>
            </section>

            {/* CUSTOMER DETAILS & ENQUIRY FORM */}
            <section
              className="bg-white border border-[#C1C8C2]/70 rounded-sm p-5 sm:p-6 shadow-xs"
              aria-label="Customer Contact & Delivery Destination"
            >
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#E8E4DA]">
                <MapPin className="w-4 h-4 text-[#9C7A3C]" />
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1B3B2B]">
                    Customer &amp; Delivery Destination
                  </h2>
                  <p className="text-[11px] text-[#5A615C]">
                    Required to prepare your workshop quotation enquiry and estimate transit packaging.
                  </p>
                </div>
              </div>

              <form onSubmit={handleContinueToEnquiry} noValidate className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="customer-fullName"
                      className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#424844] mb-1"
                    >
                      Customer Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="customer-fullName"
                      type="text"
                      required
                      placeholder="e.g. Ananya Deshmukh"
                      value={customer.fullName}
                      onChange={(e) => handleFieldChange('fullName', e.target.value)}
                      onBlur={() => handleFieldBlur('fullName')}
                      aria-invalid={Boolean(showError('fullName'))}
                      className={`w-full min-h-[42px] px-3 py-2 text-sm bg-[#FAF8F5] border rounded-sm focus:outline-none focus:ring-1 ${
                        showError('fullName')
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-[#C1C8C2] focus:border-[#1B3B2B] focus:ring-[#1B3B2B]'
                      }`}
                    />
                    {showError('fullName') && (
                      <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">
                        {showError('fullName')}
                      </p>
                    )}
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label
                      htmlFor="customer-phone"
                      className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#424844] mb-1"
                    >
                      Mobile Number (+91) <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="customer-phone"
                      type="tel"
                      required
                      placeholder="98200 12345"
                      value={customer.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      onBlur={() => handleFieldBlur('phone')}
                      aria-invalid={Boolean(showError('phone'))}
                      className={`w-full min-h-[42px] px-3 py-2 text-sm bg-[#FAF8F5] border rounded-sm focus:outline-none focus:ring-1 ${
                        showError('phone')
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-[#C1C8C2] focus:border-[#1B3B2B] focus:ring-[#1B3B2B]'
                      }`}
                    />
                    {showError('phone') && (
                      <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">
                        {showError('phone')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="customer-email"
                    className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#424844] mb-1"
                  >
                    Email Address <span className="text-[#5A615C] font-normal">(Optional)</span>
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    placeholder="name@example.com"
                    value={customer.email || ''}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => handleFieldBlur('email')}
                    aria-invalid={Boolean(showError('email'))}
                    className={`w-full min-h-[42px] px-3 py-2 text-sm bg-[#FAF8F5] border rounded-sm focus:outline-none focus:ring-1 ${
                      showError('email')
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-[#C1C8C2] focus:border-[#1B3B2B] focus:ring-[#1B3B2B]'
                    }`}
                  />
                  {showError('email') && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">
                      {showError('email')}
                    </p>
                  )}
                </div>

                {/* Delivery Address */}
                <div>
                  <label
                    htmlFor="customer-addressLine1"
                    className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#424844] mb-1"
                  >
                    Delivery Street / Gallery Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="customer-addressLine1"
                    type="text"
                    required
                    placeholder="Building, street name, locality"
                    value={customer.addressLine1}
                    onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
                    onBlur={() => handleFieldBlur('addressLine1')}
                    aria-invalid={Boolean(showError('addressLine1'))}
                    className={`w-full min-h-[42px] px-3 py-2 text-sm bg-[#FAF8F5] border rounded-sm focus:outline-none focus:ring-1 ${
                      showError('addressLine1')
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-[#C1C8C2] focus:border-[#1B3B2B] focus:ring-[#1B3B2B]'
                    }`}
                  />
                  {showError('addressLine1') && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">
                      {showError('addressLine1')}
                    </p>
                  )}
                </div>

                {/* City, State, PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="customer-city"
                      className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#424844] mb-1"
                    >
                      City <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="customer-city"
                      type="text"
                      required
                      placeholder="Mumbai"
                      value={customer.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      onBlur={() => handleFieldBlur('city')}
                      aria-invalid={Boolean(showError('city'))}
                      className={`w-full min-h-[42px] px-3 py-2 text-sm bg-[#FAF8F5] border rounded-sm focus:outline-none focus:ring-1 ${
                        showError('city')
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-[#C1C8C2] focus:border-[#1B3B2B] focus:ring-[#1B3B2B]'
                      }`}
                    />
                    {showError('city') && (
                      <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">
                        {showError('city')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="customer-state"
                      className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#424844] mb-1"
                    >
                      State <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="customer-state"
                      required
                      value={customer.state}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                      onBlur={() => handleFieldBlur('state')}
                      aria-invalid={Boolean(showError('state'))}
                      className={`w-full min-h-[42px] px-2.5 py-2 text-sm bg-[#FAF8F5] border rounded-sm focus:outline-none focus:ring-1 ${
                        showError('state')
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-[#C1C8C2] focus:border-[#1B3B2B] focus:ring-[#1B3B2B]'
                      }`}
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES_LIST.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    {showError('state') && (
                      <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">
                        {showError('state')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="customer-postalCode"
                      className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#424844] mb-1"
                    >
                      PIN Code <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="customer-postalCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      placeholder="400001"
                      value={customer.postalCode}
                      onChange={(e) =>
                        handleFieldChange(
                          'postalCode',
                          e.target.value.replace(/\D/g, '').slice(0, 6)
                        )
                      }
                      onBlur={() => handleFieldBlur('postalCode')}
                      aria-invalid={Boolean(showError('postalCode'))}
                      className={`w-full min-h-[42px] px-3 py-2 text-sm bg-[#FAF8F5] border rounded-sm focus:outline-none focus:ring-1 font-mono ${
                        showError('postalCode')
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-[#C1C8C2] focus:border-[#1B3B2B] focus:ring-[#1B3B2B]'
                      }`}
                    />
                    {showError('postalCode') && (
                      <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">
                        {showError('postalCode')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Logistics Preference (No invented pricing) */}
                <div>
                  <span className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#424844] mb-1.5">
                    Preferred Dispatch Preference (Rates Quoted Separately)
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'standard', label: 'Insured Parcel' },
                      { id: 'courier', label: 'Art Crate Express' },
                      { id: 'pickup', label: 'Mumbai Workshop Pickup' },
                    ].map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          const nextTier = tier.id as 'standard' | 'courier' | 'pickup';
                          setShippingTierPref(nextTier);
                          onUpdateShippingTier?.(nextTier);
                        }}
                        className={`min-h-[42px] px-2.5 py-2 rounded-sm border text-center font-medium transition-colors cursor-pointer ${
                          shippingTierPref === tier.id
                            ? 'bg-[#F7F3EB] border-[#1B3B2B] text-[#1B3B2B] font-semibold'
                            : 'bg-[#FAF8F5] border-[#E8E4DA] text-[#5A615C] hover:bg-white'
                        }`}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Notes */}
                <div>
                  <label
                    htmlFor="customer-notes"
                    className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#424844] mb-1"
                  >
                    Optional Project / Framing Notes
                  </label>
                  <textarea
                    id="customer-notes"
                    rows={2}
                    placeholder="Specific exhibition deadline, hanging wall type, or custom framing instructions..."
                    value={customer.notes || ''}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#C1C8C2] rounded-sm focus:outline-none focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B]"
                  />
                </div>

                {/* WhatsApp Destination / Snapshot Handoff Error */}
                {whatsappError && (
                  <div
                    className="p-3 rounded-sm bg-red-50 border border-red-300 text-xs text-red-900 flex items-start gap-2"
                    role="alert"
                    data-testid="whatsapp-handoff-error"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>{whatsappError}</span>
                  </div>
                )}

                {/* Honest WhatsApp Handoff Status Notice (Never claims confirmed order) */}
                {enquiryPrepared && (
                  <div
                    className="p-4 rounded-sm bg-[#FAF8F5] border border-[#9C7A3C]/60 text-xs text-[#191C1A] space-y-2.5"
                    data-testid="enquiry-prepared-banner"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-[#1B3B2B]">
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />
                        <span>WhatsApp Opened — Awaiting Customer Send</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onSaveSnapshot(validation.isValid ? 'ready' : 'draft');
                          setEnquiryPrepared(false);
                        }}
                        className="text-[11px] underline text-[#5A615C] hover:text-[#1B3B2B] cursor-pointer"
                      >
                        Reset to {validation.isValid ? 'Ready to Send' : 'Draft'}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#424844] leading-relaxed">
                      WhatsApp was opened for reference <strong>#{quotation.quotationNumber}</strong> ({WHATSAPP_DISPLAY_PHONE}). Your enquiry is <strong>not sent or received</strong> by Sanskruti Arts until you press Send inside WhatsApp. If you closed or cancelled before sending, your saved quotation remains intact.
                    </p>
                    {whatsappHandoff.message && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard && whatsappHandoff.message) {
                              navigator.clipboard.writeText(whatsappHandoff.message);
                              setCopiedEnquiryMsg(true);
                              setTimeout(() => setCopiedEnquiryMsg(false), 2500);
                            }
                          }}
                          className="px-3 py-1.5 rounded-sm bg-white border border-[#C1C8C2] hover:bg-[#F7F3EB] text-[11px] font-semibold text-[#1B3B2B] cursor-pointer"
                        >
                          {copiedEnquiryMsg ? 'Copied Enquiry Message' : 'Copy Enquiry Text'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Form Actions */}
                <div className="pt-2 space-y-2.5 print:hidden">
                  <button
                    type="submit"
                    data-testid="continue-to-enquiry-btn"
                    className="w-full min-h-[48px] px-6 py-3 bg-[#25D366] hover:bg-[#1EB958] text-white font-label text-xs sm:text-sm uppercase tracking-widest font-bold rounded-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Continue to WhatsApp Enquiry</span>
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleSaveDraftClick}
                      data-testid="save-quotation-btn"
                      className="min-h-[44px] px-4 py-2.5 bg-[#1B3B2B] hover:bg-[#032517] text-white font-label text-xs uppercase tracking-widest font-semibold rounded-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save Draft Snapshot</span>
                    </button>

                    <button
                      type="button"
                      onClick={onReturnToStudio}
                      className="min-h-[44px] px-4 py-2.5 border border-[#1B3B2B] text-[#1B3B2B] hover:bg-[#F7F3EB] font-label text-xs uppercase tracking-widest font-semibold rounded-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Return to Studio</span>
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* STICKY MOBILE SUMMARY BAR (ACCESSIBLE QUOTATION TOTAL ON MOBILE)      */}
      {/* ===================================================================== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#C1C8C2] px-4 py-3 shadow-lg flex items-center justify-between gap-3 print:hidden">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#5A615C] block">
            Estimated Total (Excl. Delivery)
          </span>
          <span className="font-serif text-xl font-bold text-[#1B3B2B]">
            {displayPricing.formattedTotal}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            const btn = document.querySelector('[data-testid="continue-to-enquiry-btn"]') as HTMLButtonElement | null;
            if (btn) {
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
              btn.click();
            }
          }}
          className="px-4 py-2.5 bg-[#25D366] hover:bg-[#1EB958] text-white font-label text-xs uppercase tracking-wider font-bold rounded-sm flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Enquire</span>
        </button>
      </div>
    </div>
  );
};
