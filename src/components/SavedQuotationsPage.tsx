import React, { useState, useMemo, useEffect } from 'react';
import {
  QuotationSnapshot,
  QuotationStatus,
  getQuotationStatusLabel,
} from '../types/quotation';
import {
  inspectSavedQuotationsLedger,
  deleteQuotation,
  clearAllQuotations,
  purgeCorruptedLedgerEntries,
  resetMalformedLedgerWithBackup,
  getRawLedgerPayloadForRecovery,
  migrateLegacyLedgerArtworks,
  saveQuotation,
  MAX_STORED_QUOTATIONS,
} from '../utils/quotationStorage';
import { deleteArtworkAssetIfUnreferenced } from '../utils/artworkStorage';
import { buildQuotationWhatsAppHandoff } from '../utils/quotationEnquiry';
import {
  getSavedLeads,
  deleteSavedLead,
  exportLeadsToCsv,
  getLeadTypeLabel,
} from '../utils/leadStorage';
import { formatINR } from '../utils/pricing';
import { validateCustomerDetails } from './QuotationReviewPage';
import { EyebrowBadge } from './ui/LuxuryPrimitives';
import {
  Search,
  Trash2,
  Printer,
  FileText,
  SlidersHorizontal,
  MessageCircle,
  AlertTriangle,
  Info,
  Plus,
  Check,
  ShieldAlert,
  ArrowUpDown,
  FolderOpen,
  Download,
} from 'lucide-react';

export type QuotationStatusFilter = 'all' | 'draft' | 'ready' | 'whatsapp_opened';
export type QuotationSortOption = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';

/**
 * Normalizes legacy status synonyms into the 3 canonical honest Stage 5/6 statuses.
 */
export function normalizeQuotationStatus(status: QuotationStatus): 'draft' | 'ready' | 'whatsapp_opened' {
  if (status === 'whatsapp_opened' || status === 'enquired') return 'whatsapp_opened';
  if (status === 'ready' || status === 'issued') return 'ready';
  return 'draft';
}

/**
 * Pure filter & sort function exported for both UI and behavioral unit testing.
 */
export function filterAndSortQuotations(
  quotations: QuotationSnapshot[],
  options: {
    searchQuery?: string;
    statusFilter?: QuotationStatusFilter;
    sortBy?: QuotationSortOption;
  }
): QuotationSnapshot[] {
  const query = (options.searchQuery || '').trim().toLowerCase();
  const statusFilter = options.statusFilter || 'all';
  const sortBy = options.sortBy || 'newest';

  const filtered = quotations.filter((q) => {
    if (statusFilter !== 'all') {
      const normalized = normalizeQuotationStatus(q.status);
      if (normalized !== statusFilter) return false;
    }

    if (query.length > 0) {
      const refMatch = q.quotationNumber.toLowerCase().includes(query) || q.id.toLowerCase().includes(query);
      const nameMatch = (q.customer.fullName || '').toLowerCase().includes(query);
      const mouldingMatch =
        q.specifications.frameName.toLowerCase().includes(query) ||
        q.specifications.frameId.toLowerCase().includes(query);
      if (!refMatch && !nameMatch && !mouldingMatch) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'amount_desc':
        return b.pricing.totalEstimatedAmount - a.pricing.totalEstimatedAmount;
      case 'amount_asc':
        return a.pricing.totalEstimatedAmount - b.pricing.totalEstimatedAmount;
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
}

export interface SavedQuotationsPageProps {
  onOpenDossier: (id: string) => void;
  onPrintDossier: (id: string) => void;
  onOpenInReview: (quotation: QuotationSnapshot) => void;
  onEditAsNewFromQuotation: (quotation: QuotationSnapshot) => void;
  onStartNewConfiguration: () => void;
  onLedgerChanged: () => void;
  activeQuotationId?: string | null;
}

export const SavedQuotationsPage: React.FC<SavedQuotationsPageProps> = ({
  onOpenDossier,
  onPrintDossier,
  onOpenInReview,
  onEditAsNewFromQuotation,
  onStartNewConfiguration,
  onLedgerChanged,
  activeQuotationId,
}) => {
  const [ledgerVersion, setLedgerVersion] = useState(0);
  const [activeLedgerTab, setActiveLedgerTab] = useState<'quotations' | 'enquiries'>('quotations');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatusFilter>('all');
  const [sortBy, setSortBy] = useState<QuotationSortOption>('newest');

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmResetMalformed, setConfirmResetMalformed] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Safely migrate any legacy (>32 KB) inline customArtUrl quotations into IndexedDB
  useEffect(() => {
    let active = true;
    void migrateLegacyLedgerArtworks().then((res) => {
      if (!active) return;
      if (res.migratedCount > 0) {
        setLedgerVersion((v) => v + 1);
        onLedgerChanged();
      }
      if (res.warnings.length > 0) {
        setRecoveryError(res.warnings[0]);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const inspection = useMemo(() => {
    void ledgerVersion;
    return inspectSavedQuotationsLedger();
  }, [ledgerVersion]);

  const savedLeads = useMemo(() => {
    void ledgerVersion;
    return getSavedLeads();
  }, [ledgerVersion]);

  const handleExportLeadsCsv = () => {
    if (savedLeads.length === 0 || typeof window === 'undefined') return;
    const csv = exportLeadsToCsv(savedLeads);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanskruti_leads_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setActionNotice(`Exported ${savedLeads.length} local enquiry record(s) to CSV.`);
  };

  const filteredQuotations = useMemo(
    () =>
      filterAndSortQuotations(inspection.validQuotations, {
        searchQuery,
        statusFilter,
        sortBy,
      }),
    [inspection.validQuotations, searchQuery, statusFilter, sortBy]
  );

  const refreshLedger = () => {
    setLedgerVersion((v) => v + 1);
    onLedgerChanged();
  };

  const handleConfirmDeleteSingle = (targetQuotation: QuotationSnapshot) => {
    setRecoveryError(null);
    const assetId = targetQuotation.specifications.customArtAssetId;
    const ok = deleteQuotation(targetQuotation.id);
    setPendingDeleteId(null);
    if (!ok) {
      setRecoveryError(
        `Could not delete quotation #${targetQuotation.quotationNumber} from browser storage. Linked artwork assets were retained.`
      );
      return;
    }

    if (assetId) {
      const afterInspection = inspectSavedQuotationsLedger();
      const hasUncertainCorruption =
        afterInspection.corruptedCount > 0 || afterInspection.status !== 'ok';

      void deleteArtworkAssetIfUnreferenced(assetId, {
        validQuotations: afterInspection.validQuotations,
        hasCorruptedEntries: hasUncertainCorruption,
      }).then((artRes) => {
        if (artRes.reason === 'uncertain_corrupted_ledger') {
          setActionNotice(
            `Deleted quotation #${targetQuotation.quotationNumber}. Linked artwork was preserved because corrupted records remain in the ledger.`
          );
        }
      });
    }

    setActionNotice(
      `Deleted quotation #${targetQuotation.quotationNumber} from this browser's local storage.`
    );
    refreshLedger();
  };

  const handleConfirmDeleteAll = () => {
    setRecoveryError(null);
    const assetIds = Array.from(
      new Set(
        inspection.validQuotations
          .map((q) => q.specifications.customArtAssetId)
          .filter((id): id is string => Boolean(id))
      )
    );
    const clearRes = clearAllQuotations();
    setConfirmDeleteAll(false);
    if (!clearRes.success) {
      setRecoveryError(
        clearRes.error || 'Could not clear saved quotations. All artwork assets remain preserved.'
      );
      return;
    }

    const afterInspection = inspectSavedQuotationsLedger();
    const hasUncertainCorruption =
      afterInspection.corruptedCount > 0 || afterInspection.status !== 'ok';

    assetIds.forEach((assetId) => {
      void deleteArtworkAssetIfUnreferenced(assetId, {
        validQuotations: afterInspection.validQuotations,
        hasCorruptedEntries: hasUncertainCorruption,
      });
    });

    if (clearRes.preservedCorruptedCount > 0) {
      setActionNotice(
        `Removed valid quotations from this browser. ${clearRes.preservedCorruptedCount} corrupted entry(ies) and potentially referenced artwork assets remain preserved for explicit recovery.`
      );
    } else {
      setActionNotice(
        'All locally saved quotations have been removed from this browser.'
      );
    }
    refreshLedger();
  };

  const handleDownloadRawBackup = () => {
    const raw = getRawLedgerPayloadForRecovery();
    if (!raw || typeof window === 'undefined') return;
    const blob = new Blob([raw], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanskruti_quotations_recovery_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePurgeCorrupted = () => {
    setRecoveryError(null);
    const res = purgeCorruptedLedgerEntries();
    if (res.success) {
      setActionNotice(
        `Removed ${res.removedCount} corrupted record(s) while preserving ${res.preservedCount} valid quotation(s) and backing up raw entries.`
      );
      refreshLedger();
    } else {
      setRecoveryError(
        res.error || 'Corrupted entry cleanup aborted because recovery backup verification failed.'
      );
    }
  };

  const handleContinueEnquiry = (q: QuotationSnapshot) => {
    const custCheck = validateCustomerDetails(q.customer);
    if (!custCheck.isValid) {
      onOpenInReview(q);
      return;
    }

    const updated: QuotationSnapshot = {
      ...q,
      status: 'whatsapp_opened',
    };
    const handoff = buildQuotationWhatsAppHandoff(updated);
    if (!handoff.ok || !handoff.url) {
      setActionNotice(handoff.error || 'Could not launch WhatsApp enquiry.');
      return;
    }

    saveQuotation(updated);
    refreshLedger();
    setActionNotice(
      `WhatsApp opened for #${q.quotationNumber} — awaiting your Send inside WhatsApp.`
    );
    if (typeof window !== 'undefined') {
      window.open(handoff.url, '_blank', 'noopener,noreferrer');
    }
  };

  const totalSaved = inspection.validQuotations.length;
  const isAtCapacity = totalSaved >= MAX_STORED_QUOTATIONS;

  return (
    <div
      className="flex-1 bg-[#F7F5EF] text-[#191C1A] min-h-full pb-16 overflow-x-hidden"
      data-testid="saved-quotations-page"
    >
      {/* Top Editorial Header */}
      <div className="bg-[#FAF8F5] border-b border-[#C1C8C2]/60">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <EyebrowBadge variant="bronze">Quotation Ledger</EyebrowBadge>
              <span
                className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-sm border ${
                  isAtCapacity
                    ? 'bg-amber-50 border-amber-400 text-amber-900'
                    : 'bg-white border-[#C1C8C2] text-[#1B3B2B]'
                }`}
                data-testid="ledger-capacity-badge"
              >
                {totalSaved} / {MAX_STORED_QUOTATIONS} Saved
              </span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#1B3B2B] tracking-tight">
              Saved Quotations
            </h1>
            <p className="text-xs sm:text-sm text-[#424844] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#9C7A3C] flex-shrink-0" />
              <span>
                Your saved quotations are stored locally in this browser and are not automatically synchronized across devices.
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div
              role="tablist"
              aria-label="Ledger sections"
              className="inline-flex p-0.5 bg-[#E8E4DA]/70 border border-[#C1C8C2] rounded-sm"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeLedgerTab === 'quotations'}
                data-testid="tab-saved-quotations"
                onClick={() => setActiveLedgerTab('quotations')}
                className={`px-3.5 py-2 rounded-xs font-label text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer ${
                  activeLedgerTab === 'quotations'
                    ? 'bg-[#1B3B2B] text-white shadow-xs'
                    : 'text-[#424844] hover:text-[#1B3B2B]'
                }`}
              >
                Quotations ({totalSaved})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeLedgerTab === 'enquiries'}
                data-testid="tab-saved-enquiries"
                onClick={() => setActiveLedgerTab('enquiries')}
                className={`px-3.5 py-2 rounded-xs font-label text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer ${
                  activeLedgerTab === 'enquiries'
                    ? 'bg-[#1B3B2B] text-white shadow-xs'
                    : 'text-[#424844] hover:text-[#1B3B2B]'
                }`}
              >
                Saved Enquiries ({savedLeads.length})
              </button>
            </div>

            {activeLedgerTab === 'enquiries' && savedLeads.length > 0 && (
              <button
                type="button"
                onClick={handleExportLeadsCsv}
                data-testid="export-leads-csv-btn"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-[#1B3B2B] bg-white hover:bg-[#F7F3EB] text-[#1B3B2B] font-label text-xs uppercase tracking-widest font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#9C7A3C]" />
                <span>Export CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={onStartNewConfiguration}
              data-testid="quotations-new-config-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[#1B3B2B] hover:bg-[#032517] text-white font-label text-xs uppercase tracking-widest font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#CCA563]" />
              <span>New Framing Estimate</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeLedgerTab === 'enquiries' && (
          <section data-testid="saved-enquiries-panel" className="space-y-4">
            <div className="bg-white border border-[#C1C8C2]/80 rounded-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1B3B2B]">
                  Trade Sample Kit &amp; Quick Quote Enquiries ({savedLeads.length} / 100)
                </h2>
                <p className="text-xs text-[#5A615C]">
                  Logged automatically in browser LocalStorage (<code>sanskruti_leads_v1</code>) prior to WhatsApp handoff.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportLeadsCsv}
                disabled={savedLeads.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-[#1B3B2B] hover:bg-[#032517] disabled:opacity-40 text-white font-label text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-[#CCA563]" />
                <span>Export CSV ({savedLeads.length})</span>
              </button>
            </div>

            {savedLeads.length === 0 ? (
              <div className="bg-white border border-[#C1C8C2]/80 rounded-sm p-10 text-center space-y-3">
                <p className="font-headline text-2xl font-semibold text-[#1B3B2B]">
                  No Enquiries Logged Yet
                </p>
                <p className="text-xs sm:text-sm text-[#5A615C] max-w-md mx-auto">
                  Any Trade Sample Kit request, Quick Quote, Sizing Help request, or Formal Dossier enquiry triggered from this browser is recorded here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedLeads.map((lead) => (
                  <article
                    key={lead.id}
                    data-testid="saved-enquiry-card"
                    className="bg-white border border-[#C1C8C2]/80 rounded-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#1B3B2B] text-white rounded-xs">
                          {getLeadTypeLabel(lead.leadType)}
                        </span>
                        <span className="font-mono text-xs text-[#5A615C]">
                          {new Date(lead.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-[#1B3B2B]">
                        {lead.clientName}{' '}
                        <span className="font-mono text-xs font-normal text-[#5A615C]">
                          · {lead.mobile} · {lead.cityOrPin}
                        </span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#424844]">
                        <span className="font-mono font-semibold text-[#7A4B28]">
                          SKU(s): {lead.skus.join(', ')}
                        </span>
                        {lead.notes && <span className="text-[#5A615C]">· {lead.notes}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {lead.estimatedTotalINR !== null && (
                        <span className="font-serif text-xl font-bold text-[#1B3B2B]">
                          {formatINR(lead.estimatedTotalINR)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          deleteSavedLead(lead.id);
                          refreshLedger();
                        }}
                        aria-label="Delete saved enquiry"
                        className="p-2 border border-red-200 text-red-700 hover:bg-red-50 rounded-sm cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeLedgerTab === 'quotations' && (
          <>
        {/* Capacity Reached Guidance */}
        {isAtCapacity && (
          <div
            className="p-4 rounded-sm bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-3"
            data-testid="capacity-limit-banner"
          >
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                Maximum Storage Capacity Reached ({MAX_STORED_QUOTATIONS} Saved Quotations)
              </p>
              <p className="text-amber-900">
                To prevent automatic deletion of your existing estimates, Sanskruti Arts never silently removes older drafts. Please review and explicitly delete any unwanted quotations below before saving a new draft.
              </p>
            </div>
          </div>
        )}

        {/* Storage Access Failure State */}
        {inspection.status === 'storage_error' && (
          <div
            className="p-5 rounded-sm bg-red-50 border border-red-300 text-xs text-red-950 flex items-start gap-3"
            data-testid="storage-error-banner"
          >
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Browser Storage Access Blocked or Unavailable</p>
              <p className="text-red-800">
                {inspection.errorMessage || 'Unable to read or write browser LocalStorage in this browsing context.'}
              </p>
            </div>
          </div>
        )}

        {/* Partial Corruption Notice (Preserves all valid quotations) */}
        {inspection.status === 'partial_corruption' && (
          <div
            className="p-4 rounded-sm bg-amber-50 border border-amber-300 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            data-testid="partial-corruption-banner"
          >
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {inspection.corruptedCount} Corrupted Record(s) Detected &amp; Isolated
                </p>
                <p className="text-amber-900">
                  {inspection.validQuotations.length} valid quotation(s) remain intact below. You may download raw data or remove only invalid entries without affecting valid quotations.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleDownloadRawBackup}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-sm bg-white border border-amber-400 text-amber-950 font-semibold text-[11px] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Raw Backup</span>
              </button>
              <button
                type="button"
                onClick={handlePurgeCorrupted}
                data-testid="purge-corrupted-btn"
                className="px-3.5 py-2 rounded-sm bg-amber-900 hover:bg-amber-950 text-white font-semibold text-[11px] cursor-pointer"
              >
                Remove Corrupted Entries Only
              </button>
            </div>
          </div>
        )}

        {/* Malformed JSON Storage State */}
        {inspection.status === 'malformed_json' && (
          <div
            className="p-6 rounded-sm bg-white border border-red-300 text-xs text-red-950 space-y-4 shadow-xs"
            data-testid="malformed-storage-banner"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="font-serif text-lg font-bold text-red-900">
                  Local Storage Payload Unreadable
                </h2>
                <p className="text-red-800">{inspection.errorMessage}</p>
                <p className="text-[#5A615C]">
                  To prevent accidental data loss, new saves are paused until malformed browser data is explicitly backed up or reset.
                </p>
              </div>
            </div>

            {!confirmResetMalformed ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadRawBackup}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm border border-[#C1C8C2] bg-[#FAF8F5] hover:bg-[#F7F3EB] text-[#1B3B2B] font-semibold text-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#9C7A3C]" />
                  <span>Download Raw Ledger Backup (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetMalformed(true)}
                  className="px-4 py-2 rounded-sm bg-red-700 hover:bg-red-800 text-white font-semibold text-xs cursor-pointer"
                >
                  Reset Corrupted Storage Ledger
                </button>
              </div>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded-sm flex flex-wrap items-center gap-3">
                <span className="font-semibold text-red-900">
                  Confirm resetting malformed browser-local storage? A recovery copy is retained in this browser before clearing.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryError(null);
                    const res = resetMalformedLedgerWithBackup();
                    if (res.success) {
                      setConfirmResetMalformed(false);
                      setActionNotice(
                        'Verified recovery backup saved in browser storage; unreadable ledger cleared.'
                      );
                      refreshLedger();
                    } else {
                      setRecoveryError(
                        res.error ||
                          'Recovery backup failed verification. Malformed ledger was left untouched — please Download Raw Backup.'
                      );
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-sm bg-red-700 text-white font-bold cursor-pointer"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetMalformed(false)}
                  className="px-3.5 py-1.5 rounded-sm bg-white border border-[#C1C8C2] text-[#424844] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recovery / Backup Verification Error Banner */}
        {recoveryError && (
          <div
            className="p-3.5 rounded-sm bg-red-50 border border-red-300 text-xs text-red-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            data-testid="recovery-error-banner"
          >
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
              <span>{recoveryError}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getRawLedgerPayloadForRecovery() && (
                <button
                  type="button"
                  onClick={handleDownloadRawBackup}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-white border border-red-300 text-red-900 font-semibold text-[11px] cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Raw Backup</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setRecoveryError(null)}
                className="text-[11px] underline text-red-800 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Action Feedback Banner */}
        {actionNotice && (
          <div
            role="status"
            aria-live="polite"
            className="p-3.5 rounded-sm bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="text-[11px] underline text-emerald-800 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Controls Bar: Search, Status Filter, Sort & Explicit Clear-All */}
        {totalSaved > 0 && (
          <div className="bg-white border border-[#C1C8C2]/80 rounded-sm p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search by Reference or Customer Name */}
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-[#9C7A3C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by reference (#SA-Q-...) or customer name..."
                  data-testid="quotations-search-input"
                  aria-label="Search saved quotations by reference or customer name"
                  className="w-full min-h-[40px] pl-9 pr-14 py-2 text-xs sm:text-sm bg-[#FAF8F5] border border-[#C1C8C2] rounded-sm focus:outline-none focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear quotation search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wider text-[#9C7A3C] hover:text-[#1B3B2B] px-1.5 py-1 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Filter by Status */}
              <div className="md:col-span-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as QuotationStatusFilter)}
                  data-testid="quotations-status-filter"
                  aria-label="Filter quotations by status"
                  className="w-full min-h-[40px] px-3 py-2 text-xs sm:text-sm bg-[#FAF8F5] border border-[#C1C8C2] rounded-sm focus:outline-none focus:border-[#1B3B2B]"
                >
                  <option value="all">All Statuses ({totalSaved})</option>
                  <option value="draft">Draft</option>
                  <option value="ready">Ready to Send</option>
                  <option value="whatsapp_opened">WhatsApp Opened — Awaiting Send</option>
                </select>
              </div>

              {/* Sort Controls */}
              <div className="md:col-span-3 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-[#5A615C] flex-shrink-0 hidden sm:block" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as QuotationSortOption)}
                  data-testid="quotations-sort-select"
                  aria-label="Sort saved quotations"
                  className="w-full min-h-[40px] px-3 py-2 text-xs sm:text-sm bg-[#FAF8F5] border border-[#C1C8C2] rounded-sm focus:outline-none focus:border-[#1B3B2B]"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="amount_desc">Sort: Highest Estimate (₹)</option>
                  <option value="amount_asc">Sort: Lowest Estimate (₹)</option>
                </select>
              </div>
            </div>

            {/* Delete-All With Explicit Confirmation Step */}
            <div className="pt-2 border-t border-[#E8E4DA] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-mono text-[11px] text-[#5A615C]" aria-live="polite">
                Showing {filteredQuotations.length} of {totalSaved} saved quotation(s)
              </span>

              {!confirmDeleteAll ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAll(true)}
                  data-testid="delete-all-quotations-btn"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-700 hover:text-red-900 underline cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete All Saved Quotations</span>
                </button>
              ) : (
                <div
                  className="flex flex-wrap items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-sm"
                  data-testid="confirm-delete-all-bar"
                >
                  <span className="text-[11px] font-semibold text-red-900">
                    Delete all {totalSaved} browser-local quotation(s) permanently? This clears only data saved on this browser.
                  </span>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteAll}
                    data-testid="confirm-delete-all-yes"
                    className="px-2.5 py-1 bg-red-700 text-white rounded-sm text-[11px] font-bold cursor-pointer"
                  >
                    Yes, Delete All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAll(false)}
                    className="px-2.5 py-1 bg-white border border-[#C1C8C2] text-[#424844] rounded-sm text-[11px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State (Zero Saved Quotations) */}
        {inspection.status !== 'malformed_json' && totalSaved === 0 && (
          <div
            className="bg-white border border-[#C1C8C2]/80 rounded-sm p-10 text-center max-w-xl mx-auto space-y-4 shadow-xs"
            data-testid="quotations-empty-state"
          >
            <div className="w-12 h-12 rounded-full bg-[#F7F3EB] border border-[#9C7A3C]/40 flex items-center justify-center mx-auto text-[#9C7A3C]">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h2 className="font-headline text-2xl sm:text-3xl font-semibold text-[#1B3B2B]">
              You haven&apos;t saved any quotations yet.
            </h2>
            <p className="text-sm text-[#424844] leading-relaxed">
              Configure a custom moulding profile, dimensions, archival matboard, and conservation glazing in our framing studio to save and compare multiple project estimates locally.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onStartNewConfiguration}
                className="px-6 py-3 bg-[#1B3B2B] hover:bg-[#032517] text-white font-label text-xs uppercase tracking-widest font-semibold rounded-sm transition-colors cursor-pointer"
              >
                Start a New Framing Configuration
              </button>
            </div>
          </div>
        )}

        {/* Empty Search / Filter Results State */}
        {totalSaved > 0 && filteredQuotations.length === 0 && (
          <div className="bg-white border border-[#C1C8C2]/80 rounded-sm p-8 text-center space-y-3 shadow-xs">
            <p className="font-serif text-lg font-bold text-[#1B3B2B]">
              No saved quotations match your search or filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 border border-[#1B3B2B] text-[#1B3B2B] hover:bg-[#F7F3EB] text-xs font-semibold rounded-sm cursor-pointer"
            >
              Reset Search &amp; Filters
            </button>
          </div>
        )}

        {/* Saved Quotations Grid / Cards */}
        <div className="space-y-4">
          {filteredQuotations.map((q) => {
            const isConfirmingDelete = pendingDeleteId === q.id;
            const isCurrentActive = activeQuotationId === q.id;
            const statusNorm = normalizeQuotationStatus(q.status);
            const createdFormatted = new Date(q.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            const updatedFormatted = q.updatedAt
              ? new Date(q.updatedAt).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

            return (
              <article
                key={q.id}
                data-testid="saved-quotation-card"
                className={`bg-white border rounded-sm shadow-xs overflow-hidden transition-colors ${
                  isCurrentActive ? 'border-[#9C7A3C] ring-1 ring-[#9C7A3C]/30' : 'border-[#C1C8C2]/80'
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Identity, Customer, Specs */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-[#1B3B2B] text-white rounded-sm">
                        #{q.quotationNumber}
                      </span>
                      <span
                        className={`font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-sm border ${
                          statusNorm === 'whatsapp_opened'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : statusNorm === 'ready'
                            ? 'bg-[#F7F3EB] border-[#9C7A3C]/50 text-[#1B3B2B]'
                            : 'bg-[#FAF8F5] border-[#C1C8C2] text-[#5A615C]'
                        }`}
                      >
                        {getQuotationStatusLabel(q.status)}
                      </span>
                      {isCurrentActive && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#9C7A3C] font-bold">
                          Active Draft
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1B3B2B] truncate">
                        {q.specifications.frameName}{' '}
                        <span className="font-mono text-xs font-normal text-[#5A615C]">
                          ({q.specifications.frameId})
                        </span>
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#424844] mt-1">
                        <span>
                          Opening:{' '}
                          <strong className="font-mono">
                            {q.specifications.width} × {q.specifications.height} {q.specifications.unit}
                          </strong>
                        </span>
                        <span>
                          Customer:{' '}
                          <strong>
                            {q.customer.fullName?.trim() || 'Not specified'}
                          </strong>
                        </span>
                        <span>Created: {createdFormatted}</span>
                        {updatedFormatted && <span>Updated: {updatedFormatted}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Estimated Total & Explicit Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row sm:items-center lg:items-end xl:items-center justify-between gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#E8E4DA]">
                    <div className="sm:text-left lg:text-right">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#5A615C] block">
                        Estimated Total (Excl. Delivery)
                      </span>
                      <span
                        className="font-serif text-2xl font-bold text-[#1B3B2B]"
                        data-testid="card-estimated-total"
                      >
                        {q.pricing.formattedTotal}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDossier(q.id)}
                        data-testid="card-view-dossier-btn"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-[#1B3B2B] hover:bg-[#032517] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#CCA563]" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenInReview(q)}
                        data-testid="card-open-review-btn"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-[#C1C8C2] bg-[#FAF8F5] hover:bg-[#F7F3EB] text-xs font-semibold text-[#1B3B2B] transition-colors cursor-pointer"
                      >
                        <span>Review</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditAsNewFromQuotation(q)}
                        data-testid="card-edit-as-new-btn"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-[#9C7A3C] bg-[#F7F3EB] hover:bg-[#EDE4D4] text-xs font-semibold text-[#1B3B2B] transition-colors cursor-pointer"
                        title="Open specs in studio to create a new quotation without modifying this one"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#9C7A3C]" />
                        <span>Edit as New</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleContinueEnquiry(q)}
                        data-testid="card-enquiry-btn"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-[#25D366] hover:bg-[#1EB958] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Enquiry</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onPrintDossier(q.id)}
                        data-testid="card-print-btn"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-[#C1C8C2] bg-white hover:bg-[#F7F3EB] text-xs font-semibold text-[#424844] transition-colors cursor-pointer"
                        title="Open A4 printable view"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>

                      {!isConfirmingDelete && (
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(q.id)}
                          data-testid="card-delete-btn"
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-sm border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                          title="Delete this saved quotation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isConfirmingDelete && (
                  <div
                    className="px-4 sm:px-5 py-3 bg-red-50 border-t border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                    data-testid="card-delete-confirm-bar"
                  >
                    <span className="text-red-950 font-medium">
                      Confirm permanent deletion of{' '}
                      <strong className="font-mono">#{q.quotationNumber}</strong> (
                      <strong>{q.customer.fullName?.trim() || 'Unnamed customer'}</strong>) from this browser&apos;s local storage?
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleConfirmDeleteSingle(q)}
                        data-testid="card-confirm-delete-btn"
                        className="min-h-[36px] px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-sm text-[11px] font-bold cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className="min-h-[36px] px-3 py-1.5 bg-white border border-[#C1C8C2] text-[#424844] rounded-sm text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
          </>
        )}
      </div>
    </div>
  );
};
