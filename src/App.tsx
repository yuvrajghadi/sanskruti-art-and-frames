import { useState, useEffect } from 'react';
import { FrameSample, DimensionUnit, MatOption, ArtworkOption, ViewMode, GeneratedMockup } from './types';
import { FRAME_SAMPLES, MAT_OPTIONS, ARTWORK_OPTIONS } from './data/frames';
import { getInitialMouldings, resetMouldingsStorage, saveMouldingsToStorage } from './utils/mouldingStorage';
import { parseRoute } from './utils/routes';
import { prewarmMouldingTextures } from './utils/mouldingReconstruction';
import { serializeConfigToQuery, deserializeConfigFromQuery } from './utils/frameConfig';
import { Header, AppWorkflowTab } from './components/Header';
import { SidebarCatalog } from './components/SidebarCatalog';
import { ProductDetailPage } from './components/ProductDetailPage';
import { resolveProfile } from './utils/productMapping';
import { CustomFramingStudio, GlazingOption, MountingOption, GLAZING_OPTIONS, MOUNTING_OPTIONS } from './components/CustomFramingStudio';
import { FrameDetailModal } from './components/FrameDetailModal';
import { QuotationReviewPage } from './components/QuotationReviewPage';
import { QuotationDossierView } from './components/QuotationDossierView';
import { SavedQuotationsPage } from './components/SavedQuotationsPage';
import { LandingPage } from './components/LandingPage';
import { Footer } from './components/Footer';
import {
  QuotationSnapshot,
  QuotationStatus,
  CustomerDetails,
  createQuotationSnapshot,
  generateQuotationIdentifiers,
} from './types/quotation';
import {
  getSavedQuotations,
  getQuotationById,
  saveQuotation,
} from './utils/quotationStorage';
import {
  computeArtworkAssetId,
  saveCustomArtworkAsset,
  loadCustomArtworkAsset,
} from './utils/artworkStorage';
import { getAspectRatioLabel } from './utils/pricing';
import { SlidersHorizontal, Layers, Home, Bookmark } from 'lucide-react';

const RETIRED_MOULDING_IDS = new Set([
  'SAA-FLR-01',
  'SAA-VEN-02',
  'SAA-OAK-03',
  'SAA-CRU-04',
  'SAA-IMP-05',
  'SAA-TUS-06',
  'SAA-SIL-07',
]);

export function App() {
  // Initial URL query parameter deserialization for deep-linking
  const initialParams = typeof window !== 'undefined' ? deserializeConfigFromQuery(window.location.search) : {};

  // 1. Browser Navigation Path & Route Parsing
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname;
  });

  const routeInfo = parseRoute(currentPath);

  // Sync with browser back/forward buttons (HTML5 History API popstate)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Redirect bare /product to /catalog
  useEffect(() => {
    if (routeInfo.route === 'product' && !routeInfo.frameId) {
      navigateTo('/catalog');
    }
  }, [routeInfo.route, routeInfo.frameId]);

  // 2. Configurator Data & State Management (Synchronized with LocalStorage)
  const [framesList, setFramesList] = useState<FrameSample[]>(() => {
    const loaded = getInitialMouldings();
    const active = loaded.filter((f) => !RETIRED_MOULDING_IDS.has(f.id));
    if (active.length !== loaded.length) {
      saveMouldingsToStorage(active);
    }
    return active;
  });
  const [selectedFrame, setSelectedFrame] = useState<FrameSample | null>(() => {
    const targetId = routeInfo.frameId || initialParams.frameId;
    if (targetId && !RETIRED_MOULDING_IDS.has(targetId)) {
      const matched = framesList.find((f) => f.id === targetId) || FRAME_SAMPLES.find((f) => f.id === targetId);
      if (matched) return matched;
    }
    return framesList[0] || FRAME_SAMPLES[0];
  });

  // Pre-warm primary workshop sample textures in background during idle time
  useEffect(() => {
    prewarmMouldingTextures(framesList);
  }, [framesList]);

  // Deep-linking: sync selected frame if URL contains a specific frameId
  useEffect(() => {
    if (routeInfo.frameId && !RETIRED_MOULDING_IDS.has(routeInfo.frameId)) {
      const matched = resolveProfile(routeInfo.frameId, framesList) || framesList.find((f) => f.id === routeInfo.frameId) || FRAME_SAMPLES.find((f) => f.id === routeInfo.frameId);
      if (matched && matched.id !== selectedFrame?.id) {
        setSelectedFrame(matched);
      }
    }
  }, [routeInfo.frameId, framesList, selectedFrame]);

  const [width, setWidth] = useState<number>(() => initialParams.width || 16);
  const [height, setHeight] = useState<number>(() => initialParams.height || 20);
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>(() => initialParams.unit || 'in');

  // Custom framing configuration state
  const [artworkFit, setArtworkFit] = useState<'fit' | 'fill'>(() => initialParams.artworkFit || 'fill');
  const [selectedMat, setSelectedMat] = useState<MatOption>(() => {
    if (initialParams.matId) {
      const matchedMat = MAT_OPTIONS.find(m => m.id === initialParams.matId);
      if (matchedMat) {
        return initialParams.matWidth ? { ...matchedMat, borderWidth: initialParams.matWidth } : matchedMat;
      }
    }
    return MAT_OPTIONS[0];
  });
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkOption>(() => {
    if (initialParams.artworkId) {
      const matchedArt = ARTWORK_OPTIONS.find(a => a.id === initialParams.artworkId);
      if (matchedArt) return matchedArt;
    }
    return ARTWORK_OPTIONS[0];
  });
  const [customArtUrl, setCustomArtUrl] = useState<string | null>(null);
  const [customArtAssetId, setCustomArtAssetId] = useState<string | null>(null);
  const [artworkStorageWarning, setArtworkStorageWarning] = useState<string | null>(null);

  const handleCustomArtUpload = (url: string | null) => {
    setCustomArtUrl(url);
    if (!url) {
      setCustomArtAssetId(null);
      setArtworkStorageWarning(null);
      return;
    }
    setCustomArtAssetId(null);
    setArtworkStorageWarning(null);
    void saveCustomArtworkAsset(url).then((res) => {
      if (res.ok && res.assetId) {
        setCustomArtAssetId(res.assetId);
        setActiveQuotation((prev) =>
          prev && prev.specifications.customArtUrl === url && !prev.specifications.customArtAssetId
            ? {
                ...prev,
                specifications: {
                  ...prev.specifications,
                  customArtAssetId: res.assetId,
                },
              }
            : prev
        );
      } else {
        setCustomArtAssetId(null);
        setArtworkStorageWarning(
          `Note: Uploaded artwork could not be persisted in IndexedDB (${res.error || 'browser storage restricted'}). Inline artwork data will remain preserved where possible without blocking your quotation.`
        );
      }
    });
  };
  const [selectedGlazing, setSelectedGlazing] = useState<GlazingOption>(() => {
    if (initialParams.glazingId) {
      const matched = GLAZING_OPTIONS.find(g => g.id === initialParams.glazingId);
      if (matched) return matched;
    }
    return GLAZING_OPTIONS[0];
  });
  const [selectedMounting, setSelectedMounting] = useState<MountingOption>(() => {
    if (initialParams.mountingId) {
      const matched = MOUNTING_OPTIONS.find(m => m.id === initialParams.mountingId);
      if (matched) return matched;
    }
    return MOUNTING_OPTIONS[0];
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => (routeInfo.route === 'studio' ? '3d' : '2d'));
  const [generatedMockup, setGeneratedMockup] = useState<GeneratedMockup | null>(null);

  // Synchronize state changes into live shareable URL query parameters without page reload
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (routeInfo.route === 'configure' || routeInfo.route === 'studio') {
      const qs = serializeConfigToQuery({
        frameId: selectedFrame?.id || framesList[0]?.id || 'SAA-BGD-08',
        width,
        height,
        unit: dimensionUnit,
        matEnabled: selectedMat.id !== 'mat-none',
        matId: selectedMat.id,
        matColorHex: selectedMat.colorHex,
        matWidth: selectedMat.borderWidth,
        artworkId: selectedArtwork.id,
        customArtUrl: null,
        artworkFit,
        glazingId: selectedGlazing.id,
        mountingId: selectedMounting.id,
        wallColor: 'stone',
      });
      const basePath = routeInfo.route === 'studio'
        ? (selectedFrame ? `/studio/${selectedFrame.id}` : '/studio')
        : (selectedFrame ? `/configurator/${selectedFrame.id}` : '/configurator');
      const targetUrl = `${basePath}${qs}`;
      if (window.location.pathname + window.location.search !== targetUrl) {
        window.history.replaceState({}, '', targetUrl);
      }
    }
  }, [selectedFrame, width, height, dimensionUnit, selectedMat, artworkFit, selectedArtwork, selectedGlazing, selectedMounting, routeInfo.route]);

  // Sync viewMode with route
  useEffect(() => {
    if (routeInfo.route === 'studio') {
      setViewMode('3d');
    } else if (routeInfo.route === 'configure') {
      setViewMode('2d');
    }
  }, [routeInfo.route]);

  // Modal inspection states
  const [inspectingFrame, setInspectingFrame] = useState<FrameSample | null>(null);

  // Stage 3: Authoritative Quotation Snapshot State (Decoupled from live studio mutations)
  const ACTIVE_QUOTATION_SESSION_KEY = 'sanskruti_active_quotation_id';

  const [customerDraft, setCustomerDraft] = useState<CustomerDetails>({
    fullName: '',
    phone: '',
    email: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    notes: '',
  });

  const [activeQuotation, setActiveQuotation] = useState<QuotationSnapshot | null>(() => {
    if (typeof window === 'undefined') return null;
    const sp = new URLSearchParams(window.location.search);
    const qid = sp.get('qid') || window.sessionStorage.getItem(ACTIVE_QUOTATION_SESSION_KEY);
    if (qid) {
      const existing = getQuotationById(qid);
      if (existing) return existing;
    }
    return null;
  });

  const [storageError, setStorageError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [savedQuotationsCount, setSavedQuotationsCount] = useState<number>(() => getSavedQuotations().length);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('');

  // Hydrate customerDraft and persisted custom artwork when an existing quotation snapshot is loaded on initial mount
  useEffect(() => {
    if (activeQuotation && !customerDraft.fullName && activeQuotation.customer.fullName) {
      setCustomerDraft(activeQuotation.customer);
    }
    if (activeQuotation?.specifications.customArtAssetId && !customArtUrl) {
      const targetAssetId = activeQuotation.specifications.customArtAssetId;
      setCustomArtAssetId(targetAssetId);
      loadCustomArtworkAsset(targetAssetId)
        .then((restored) => {
          if (restored) setCustomArtUrl(restored);
        })
        .catch(() => {
          // Non-fatal: fallback UI handles missing asset cleanly
        });
    }
  }, []);

  const buildSnapshotFromStudio = (customerInfo: CustomerDetails): QuotationSnapshot | null => {
    const targetFrame = selectedFrame || framesList[0] || FRAME_SAMPLES[0];
    if (!targetFrame) return null;

    const existingList = getSavedQuotations();
    const existingIds = new Set(existingList.map((q) => q.id));
    const existingNumbers = new Set(existingList.map((q) => q.quotationNumber));
    const { id, quotationNumber } = generateQuotationIdentifiers(existingIds, existingNumbers);

    const resolvedAssetId = customArtUrl ? customArtAssetId : null;

    const snapshotArtwork: ArtworkOption = customArtUrl
      ? {
          id: 'custom-upload',
          title:
            selectedArtwork?.id === 'custom-upload'
              ? selectedArtwork.title
              : 'Custom Uploaded Artwork',
          artist: 'Customer Artwork Asset',
          imageUrl: '',
          aspectRatio: width / (height || 1),
        }
      : selectedArtwork;

    return createQuotationSnapshot({
      frame: targetFrame,
      width,
      height,
      unit: dimensionUnit,
      aspectRatioLabel: getAspectRatioLabel(width, height),
      mat: selectedMat,
      artwork: snapshotArtwork,
      customArtUrl,
      customArtAssetId: resolvedAssetId,
      artworkFit,
      glazing: selectedGlazing,
      mounting: selectedMounting,
      wallColor: 'stone',
      customer: customerInfo,
      existingId: id,
      existingQuotationNumber: quotationNumber,
    });
  };

  // Ensure /review always displays an active snapshot without silently overwriting an existing one
  useEffect(() => {
    if (routeInfo.route === 'review' && !activeQuotation) {
      const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const qid = sp?.get('qid') || (typeof window !== 'undefined' ? window.sessionStorage.getItem(ACTIVE_QUOTATION_SESSION_KEY) : null);
      if (qid) {
        const stored = getQuotationById(qid);
        if (stored) {
          setActiveQuotation(stored);
          setCustomerDraft(stored.customer);
          return;
        }
      }
      const created = buildSnapshotFromStudio(customerDraft);
      if (created) {
        setActiveQuotation(created);
      }
    }
  }, [routeInfo.route, activeQuotation]);

  const handleUpdateCustomerDraft = (updatedCustomer: CustomerDetails) => {
    setCustomerDraft(updatedCustomer);
    setActiveQuotation((prev) =>
      prev
        ? {
            ...prev,
            customer: { ...updatedCustomer },
            updatedAt: new Date().toISOString(),
          }
        : null
    );
  };

  // Persist non-monetary dispatch preference metadata on the quotation snapshot without altering pricing
  const handleUpdateShippingTier = (tier: 'standard' | 'courier' | 'pickup') => {
    setActiveQuotation((prev) =>
      prev
        ? {
            ...prev,
            pricing: {
              ...prev.pricing,
              shippingTier: tier,
              delivery: {
                ...prev.pricing.delivery,
                selectedTier: tier,
              },
            },
            updatedAt: new Date().toISOString(),
          }
        : null
    );
  };

  const handleSaveActiveSnapshot = (statusOverride?: QuotationStatus): boolean => {
    if (!activeQuotation) return false;
    const toSave: QuotationSnapshot = {
      ...activeQuotation,
      status: statusOverride || activeQuotation.status,
      customer: { ...customerDraft },
      updatedAt: new Date().toISOString(),
    };

    const result = saveQuotation(toSave);
    if (result.success) {
      setActiveQuotation(toSave);
      setStorageError(null);
      setSavedQuotationsCount(getSavedQuotations().length);
      setSaveFeedback(`Saved quotation #${toSave.quotationNumber} to local browser ledger.`);
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(ACTIVE_QUOTATION_SESSION_KEY, toSave.id);
        } catch {
          // Ignore sessionStorage restrictions
        }
      }

      // If this snapshot carries a large un-migrated inline customArtUrl, asynchronously
      // migrate it to IndexedDB (with readback verification) and update the assetId link cleanly.
      if (toSave.specifications.customArtUrl && !toSave.specifications.customArtAssetId) {
        void saveCustomArtworkAsset(toSave.specifications.customArtUrl).then((res) => {
          if (res.ok && res.assetId) {
            setCustomArtAssetId(res.assetId);
            const migratedSnap: QuotationSnapshot = {
              ...toSave,
              specifications: {
                ...toSave.specifications,
                customArtAssetId: res.assetId,
                customArtUrl: null,
              },
            };
            const migSave = saveQuotation(migratedSnap);
            if (migSave.success) {
              setActiveQuotation(migratedSnap);
            }
          } else {
            setArtworkStorageWarning(
              `Note: Custom artwork could not be migrated into IndexedDB (${res.error || 'browser storage restricted'}). Original inline copy was kept intact.`
            );
          }
        });
      }
      return true;
    } else {
      setSaveFeedback(null);
      setStorageError(result.message);
      return false;
    }
  };

  const handleCreateNewFromStudio = () => {
    const fresh = buildSnapshotFromStudio(customerDraft);
    if (fresh) {
      setActiveQuotation(fresh);
      setStorageError(null);
      setSaveFeedback(`Created new quotation snapshot #${fresh.quotationNumber} from studio edits.`);
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(ACTIVE_QUOTATION_SESSION_KEY, fresh.id);
        } catch {
          // Ignore
        }
      }
    }
  };

  const applySpecificationsToStudio = (spec: QuotationSnapshot['specifications']) => {
    const matchedFrame =
      framesList.find((f) => f.id === spec.frameId) ||
      FRAME_SAMPLES.find((f) => f.id === spec.frameId);
    if (matchedFrame) setSelectedFrame(matchedFrame);
    setWidth(spec.width);
    setHeight(spec.height);
    setDimensionUnit(spec.unit);
    const matchedMat = MAT_OPTIONS.find((m) => m.id === spec.matId);
    if (matchedMat) setSelectedMat({ ...matchedMat, borderWidth: spec.matBorderWidth });
    const matchedArt = ARTWORK_OPTIONS.find((a) => a.id === spec.artworkId);
    if (matchedArt) setSelectedArtwork(matchedArt);
    setArtworkFit(spec.artworkFit);
    const matchedGlazing = GLAZING_OPTIONS.find((g) => g.id === spec.glazingId);
    if (matchedGlazing) setSelectedGlazing(matchedGlazing);
    const matchedMounting = MOUNTING_OPTIONS.find((m) => m.id === spec.mountingId);
    if (matchedMounting) setSelectedMounting(matchedMounting);

    if (spec.customArtUrl) {
      setCustomArtUrl(spec.customArtUrl);
      setCustomArtAssetId(spec.customArtAssetId || computeArtworkAssetId(spec.customArtUrl));
    } else if (spec.customArtAssetId) {
      setCustomArtAssetId(spec.customArtAssetId);
      setCustomArtUrl(null);
      loadCustomArtworkAsset(spec.customArtAssetId)
        .then((restored) => {
          if (restored) setCustomArtUrl(restored);
        })
        .catch(() => {
          // Non-fatal fallback
        });
    } else {
      setCustomArtUrl(null);
      setCustomArtAssetId(null);
    }
  };

  const handleEditConfigurationFromSnapshot = () => {
    if (activeQuotation) {
      const spec = activeQuotation.specifications;
      applySpecificationsToStudio(spec);
      navigateTo(`/configurator/${spec.frameId}`);
      return;
    }
    navigateTo(selectedFrame ? `/configurator/${selectedFrame.id}` : '/configurator');
  };

  const handleOpenQuotationInReview = (quotation: QuotationSnapshot) => {
    setActiveQuotation(quotation);
    setCustomerDraft(quotation.customer);
    setStorageError(null);
    setSaveFeedback(null);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(ACTIVE_QUOTATION_SESSION_KEY, quotation.id);
      } catch {
        // Ignore sessionStorage restrictions
      }
    }
    navigateTo('/review');
  };

  const handleEditAsNewFromQuotation = (quotation: QuotationSnapshot) => {
    applySpecificationsToStudio(quotation.specifications);
    setCustomerDraft(quotation.customer);
    setActiveQuotation(null);
    setStorageError(null);
    setSaveFeedback(null);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(ACTIVE_QUOTATION_SESSION_KEY);
      } catch {
        // Ignore
      }
    }
    navigateTo(`/configurator/${quotation.specifications.frameId}`);
  };

  const handleLedgerChanged = () => {
    const latest = getSavedQuotations();
    setSavedQuotationsCount(latest.length);
    if (latest.length < 50 && storageError && storageError.toLowerCase().includes('limit')) {
      setStorageError(null);
    }
    if (activeQuotation && !latest.some((q) => q.id === activeQuotation.id)) {
      setActiveQuotation(null);
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem(ACTIVE_QUOTATION_SESSION_KEY);
        } catch {
          // Ignore
        }
      }
    }
  };

  const hasStudioDiverged = Boolean(
    activeQuotation &&
      selectedFrame &&
      (activeQuotation.specifications.frameId !== selectedFrame.id ||
        activeQuotation.specifications.width !== width ||
        activeQuotation.specifications.height !== height ||
        activeQuotation.specifications.unit !== dimensionUnit ||
        activeQuotation.specifications.matId !== selectedMat.id ||
        activeQuotation.specifications.matBorderWidth !== selectedMat.borderWidth ||
        activeQuotation.specifications.glazingId !== selectedGlazing.id ||
        activeQuotation.specifications.mountingId !== selectedMounting.id ||
        activeQuotation.specifications.artworkId !== (customArtUrl ? 'custom-upload' : selectedArtwork.id) ||
        ((activeQuotation.specifications.customArtAssetId || null) !==
          (customArtUrl ? customArtAssetId : null) &&
          activeQuotation.specifications.customArtUrl !== (customArtUrl || null)) ||
        activeQuotation.specifications.artworkFit !== artworkFit)
  );

  // Navigation from Landing Page to Specific App Pages
  const handleLandingNavigate = (
    initialFrameId?: string,
    initialTab?: 'home' | 'catalog' | 'configure' | 'studio3d' | 'review' | 'quotations' | 'product'
  ) => {
    if (initialTab === 'home') {
      navigateTo('/');
      return;
    }
    if (initialTab === 'quotations') {
      navigateTo('/quotations');
      return;
    }
    if (initialFrameId) {
      const matched = resolveProfile(initialFrameId, framesList) || framesList.find((f) => f.id === initialFrameId) || FRAME_SAMPLES.find((f) => f.id === initialFrameId);
      if (matched) {
        setSelectedFrame(matched);
      }
    }

    if (initialTab === 'product' && initialFrameId) {
      navigateTo(`/product/${initialFrameId}`);
    } else if (initialTab === 'catalog') {
      navigateTo('/catalog');
    } else if (initialTab === 'studio3d') {
      navigateTo(initialFrameId ? `/studio/${initialFrameId}` : '/studio');
    } else if (initialTab === 'review') {
      navigateTo('/review');
    } else {
      navigateTo(initialFrameId ? `/configurator/${initialFrameId}` : '/configurator');
    }
  };

  // Central tab change handler that updates the browser URL
  const handleTabChange = (tab: AppWorkflowTab) => {
    switch (tab) {
      case 'catalog':
        navigateTo('/catalog');
        break;
      case 'configure':
        navigateTo(selectedFrame ? `/configurator/${selectedFrame.id}` : '/configurator');
        break;
      case 'studio3d':
        navigateTo(selectedFrame ? `/studio/${selectedFrame.id}` : '/studio');
        break;
      case 'review':
        navigateTo('/review');
        break;
      case 'quotations':
        navigateTo('/quotations');
        break;
    }
  };

  // Quick preset handler
  const handleQuickPreset = (frameId: string, w: number, h: number) => {
    const target = framesList.find((f) => f.id === frameId) || FRAME_SAMPLES.find((f) => f.id === frameId);
    if (target) {
      setSelectedFrame(target);
      setWidth(w);
      setHeight(h);
      setDimensionUnit('in');
      setGeneratedMockup(null);
      navigateTo(`/configurator/${frameId}`);
    }
  };

  // Reset configuration to default
  const handleReset = () => {
    const def = framesList[0] || FRAME_SAMPLES[0];
    setSelectedFrame(def);
    setWidth(16);
    setHeight(20);
    setDimensionUnit('in');
    setSelectedMat(MAT_OPTIONS[0]);
    setSelectedArtwork(ARTWORK_OPTIONS[0]);
    setSelectedGlazing(GLAZING_OPTIONS[0]);
    setSelectedMounting(MOUNTING_OPTIONS[0]);
    setCustomArtUrl(null);
    setCustomArtAssetId(null);
    setGeneratedMockup(null);
    setViewMode('2d');
    navigateTo(`/configurator/${def.id}`);
  };

  // Map routeInfo.route to Header's activeTab
  const getHeaderActiveTab = (): AppWorkflowTab => {
    switch (routeInfo.route) {
      case 'home':
        return 'home';
      case 'catalog':
      case 'product':
        return 'catalog';
      case 'studio':
        return 'studio3d';
      case 'review':
      case 'quotation':
        return 'review';
      case 'quotations':
        return 'quotations';
      case 'configure':
      default:
        return 'configure';
    }
  };

  // =========================================================================
  // ROUTE 1: HOMEPAGE / LANDING PAGE (/)
  // =========================================================================
  if (routeInfo.route === 'home') {
    return (
      <LandingPage
        onNavigateToConfigurator={handleLandingNavigate}
        savedQuotationsCount={savedQuotationsCount}
        searchQuery={catalogSearchQuery}
        onSearchQuery={setCatalogSearchQuery}
      />
    );
  }

  // =========================================================================
  // ATELIER WORKSPACE: ALL OTHER ROUTES (/catalog, /configurator, /studio, /review, /quotation)
  // =========================================================================
  const isDedicatedPrintView = routeInfo.route === 'quotation' && Boolean(routeInfo.isPrintMode);

  return (
    <div className="flex flex-col min-h-screen bg-light-surface text-light-on-surface font-body antialiased print-flow-reset">
      {/* Top Application Header with Stitch Crest, Home link, and Workflow Pills */}
      {!isDedicatedPrintView && (
        <div className="print:hidden no-print">
          <Header
            selectedFrame={selectedFrame}
            width={width}
            height={height}
            unit={dimensionUnit}
            activeTab={getHeaderActiveTab()}
            catalogCount={framesList.length}
            savedQuotationsCount={savedQuotationsCount}
            searchQuery={catalogSearchQuery}
            onSearchQuery={setCatalogSearchQuery}
            onTabChange={handleTabChange}
            onQuickPreset={handleQuickPreset}
            onReset={handleReset}
            onNavigateHome={() => navigateTo('/')}
          />
        </div>
      )}

      {/* Mobile & Tablet Tab Navigation Bar (Visible on screens < lg, i.e., up to 1023px) */}
      {!isDedicatedPrintView && (
        <div className="xl:hidden flex items-center justify-around bg-light-surface-container-low border-b border-light-outline-variant/60 px-1.5 py-1.5 sticky top-20 z-30 shadow-xs print:hidden no-print">
        <button
          type="button"
          onClick={() => navigateTo('/')}
          className="flex items-center justify-center gap-1 min-h-[38px] px-2 py-1.5 rounded-sm text-[11px] font-semibold text-light-on-surface-variant hover:bg-light-surface-container transition-colors"
          title="Return to Home"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('/catalog')}
          className={`flex items-center justify-center gap-1 min-h-[38px] px-2 py-1.5 rounded-sm text-[11px] font-semibold transition-colors ${
            routeInfo.route === 'catalog'
              ? 'bg-light-primary text-light-on-primary shadow-xs'
              : 'text-light-on-surface-variant hover:bg-light-surface-container'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Mouldings</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo(selectedFrame ? `/configurator/${selectedFrame.id}` : '/configurator')}
          className={`flex items-center justify-center gap-1 min-h-[38px] px-2 py-1.5 rounded-sm text-[11px] font-semibold transition-colors ${
            routeInfo.route === 'configure' || routeInfo.route === 'studio'
              ? 'bg-light-primary text-light-on-primary shadow-xs'
              : 'text-light-on-surface-variant hover:bg-light-surface-container'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Studio</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('/review')}
          className={`flex items-center justify-center gap-1 min-h-[38px] px-2 py-1.5 rounded-sm text-[11px] font-semibold transition-colors ${
            routeInfo.route === 'review' || routeInfo.route === 'quotation'
              ? 'bg-light-primary text-light-on-primary shadow-xs'
              : 'text-light-on-surface-variant hover:bg-light-surface-container'
          }`}
        >
          <span>Review</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('/quotations')}
          data-testid="mobile-bar-saved-quotations"
          className={`flex items-center justify-center gap-1 min-h-[38px] px-2 py-1.5 rounded-sm text-[11px] font-semibold transition-colors ${
            routeInfo.route === 'quotations'
              ? 'bg-light-primary text-light-on-primary shadow-xs'
              : 'text-light-on-surface-variant hover:bg-light-surface-container'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Saved</span>
        </button>
      </div>
      )}

      {/* Main Page Workspace Layout */}
      <div className="flex-1 flex flex-col overflow-hidden relative print-flow-reset">
        {/* ========================================================================= */}
        {/* PAGE 1A: /catalog - FULL MOLDING PROFILES CATALOG                         */}
        {/* ========================================================================= */}
        {routeInfo.route === 'catalog' && !routeInfo.frameId && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1">
              <SidebarCatalog
                frames={framesList}
                selectedFrame={selectedFrame}
                externalSearchQuery={catalogSearchQuery}
                onExternalSearchChange={setCatalogSearchQuery}
                onNavigateHome={() => navigateTo('/')}
                onSelectFrame={(frame) => {
                  setSelectedFrame(frame);
                  if (generatedMockup && generatedMockup.frame.id !== frame.id) {
                    setGeneratedMockup(null);
                  }
                }}
                onInspectFrame={(frame) => {
                  navigateTo(`/product/${frame.id}`);
                }}
                onProceedToConfigure={(targetFrame) => {
                  const f = targetFrame || selectedFrame;
                  if (targetFrame) setSelectedFrame(targetFrame);
                  navigateTo(f ? `/configurator/${f.id}` : '/configurator');
                }}
                onResetStorage={() => {
                  const reset = resetMouldingsStorage().filter((f) => !RETIRED_MOULDING_IDS.has(f.id));
                  saveMouldingsToStorage(reset);
                  setFramesList(reset);
                }}
                isFullView={true}
              />
            </div>
            <Footer
              onNavigateHome={() => navigateTo('/')}
              onNavigateCatalog={() => navigateTo('/catalog')}
              onNavigateConfigurator={() => navigateTo(selectedFrame ? `/configurator/${selectedFrame.id}` : '/configurator')}
              onNavigateStudio={() => navigateTo(selectedFrame ? `/studio/${selectedFrame.id}` : '/studio')}
              onNavigateReview={() => navigateTo('/review')}
              onNavigateQuotations={() => navigateTo('/quotations')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 1B: /product/:id OR /catalog/:id - DEDICATED PRODUCT DETAIL SHOWCASE */}
        {/* ========================================================================= */}
        {(routeInfo.route === 'product' || (routeInfo.route === 'catalog' && Boolean(routeInfo.frameId))) && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1">
              <ProductDetailPage
                frame={routeInfo.frameId ? (resolveProfile(routeInfo.frameId, framesList) || null) : null}
                requestedSku={routeInfo.frameId}
                allFrames={framesList}
                onNavigateHome={() => navigateTo('/')}
                onCustomize={(targetFrame) => {
                  setSelectedFrame(targetFrame);
                  if (generatedMockup && generatedMockup.frame.id !== targetFrame.id) {
                    setGeneratedMockup(null);
                  }
                  navigateTo(`/configurator/${targetFrame.id}`);
                }}
                onNavigateCatalog={() => navigateTo('/catalog')}
                onSelectFrame={(targetFrame) => {
                  setSelectedFrame(targetFrame);
                  navigateTo(`/product/${targetFrame.id}`);
                }}
              />
            </div>
            <Footer
              onNavigateHome={() => navigateTo('/')}
              onNavigateCatalog={() => navigateTo('/catalog')}
              onNavigateConfigurator={() => navigateTo(selectedFrame ? `/configurator/${selectedFrame.id}` : '/configurator')}
              onNavigateStudio={() => navigateTo(selectedFrame ? `/studio/${selectedFrame.id}` : '/studio')}
              onNavigateReview={() => navigateTo('/review')}
              onNavigateQuotations={() => navigateTo('/quotations')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 2 & 3: /configurator & /studio - CUSTOM FRAMING STUDIO               */}
        {/* ========================================================================= */}
        {(routeInfo.route === 'configure' || routeInfo.route === 'studio') && (
          <main className="flex-1 flex flex-col overflow-y-auto">
            <CustomFramingStudio
              selectedFrame={selectedFrame}
              allFrames={framesList}
              onSelectFrame={(frame) => {
                setSelectedFrame(frame);
                if (generatedMockup && generatedMockup.frame.id !== frame.id) {
                  setGeneratedMockup(null);
                }
              }}
              width={width}
              height={height}
              unit={dimensionUnit}
              onWidthChange={setWidth}
              onHeightChange={setHeight}
              onUnitChange={setDimensionUnit}
              selectedMat={selectedMat}
              onMatChange={setSelectedMat}
              selectedArtwork={selectedArtwork}
              onArtworkChange={setSelectedArtwork}
              customArtUrl={customArtUrl}
              onCustomArtUpload={handleCustomArtUpload}
              artworkFit={artworkFit}
              onArtworkFitChange={setArtworkFit}
              viewMode={routeInfo.route === 'studio' ? '3d' : viewMode}
              onViewModeChange={setViewMode}
              onProceedToReview={() => navigateTo('/review')}
              onProceedToCatalog={() => navigateTo('/catalog')}
              onReset={handleReset}
              selectedGlazing={selectedGlazing}
              onGlazingChange={setSelectedGlazing}
              selectedMounting={selectedMounting}
              onMountingChange={setSelectedMounting}
            />
          </main>
        )}

        {/* ========================================================================= */}
        {/* PAGE 4: /review - QUOTATION REVIEW EXPERIENCE (PHASE 5 STAGE 3)           */}
        {/* ========================================================================= */}
        {routeInfo.route === 'review' && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <main className="flex-1 flex flex-col">
              <QuotationReviewPage
                quotation={activeQuotation}
                allFrames={framesList}
                liveStudioConfig={{
                  frameId: selectedFrame?.id || framesList[0]?.id || 'SAA-BGD-08',
                  width,
                  height,
                  unit: dimensionUnit,
                  matEnabled: selectedMat.id !== 'mat-none',
                  matId: selectedMat.id,
                  matColorHex: selectedMat.colorHex,
                  matWidth: selectedMat.borderWidth,
                  artworkId: selectedArtwork.id,
                  customArtUrl,
                  artworkFit,
                  glazingId: selectedGlazing.id,
                  mountingId: selectedMounting.id,
                  wallColor: 'stone',
                }}
                hasStudioDiverged={hasStudioDiverged}
                savedQuotationsCount={savedQuotationsCount}
                storageError={storageError}
                saveFeedback={saveFeedback}
                artworkStorageWarning={artworkStorageWarning}
                onUpdateCustomer={handleUpdateCustomerDraft}
                onUpdateShippingTier={handleUpdateShippingTier}
                onSaveSnapshot={handleSaveActiveSnapshot}
                onCreateNewFromStudio={handleCreateNewFromStudio}
                onReturnToStudio={() =>
                  navigateTo(selectedFrame ? `/studio/${selectedFrame.id}` : '/studio')
                }
                onEditConfigurationFromSnapshot={handleEditConfigurationFromSnapshot}
                onNavigateCatalog={() => navigateTo('/catalog')}
                onNavigateQuotations={() => navigateTo('/quotations')}
                onOpenDossier={(id) => navigateTo(`/quotation/${encodeURIComponent(id)}`)}
                onOpenPrintDossier={(id) => navigateTo(`/quotation/${encodeURIComponent(id)}/print`)}
              />
            </main>
            <div className="print:hidden no-print">
              <Footer
                onNavigateHome={() => navigateTo('/')}
                onNavigateCatalog={() => navigateTo('/catalog')}
                onNavigateConfigurator={() =>
                  navigateTo(selectedFrame ? `/configurator/${selectedFrame.id}` : '/configurator')
                }
                onNavigateStudio={() =>
                  navigateTo(selectedFrame ? `/studio/${selectedFrame.id}` : '/studio')
                }
                onNavigateReview={() => navigateTo('/review')}
                onNavigateQuotations={() => navigateTo('/quotations')}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 5: /quotation/:id & /quotation/:id/print - DOSSIER & PRINT VIEW      */}
        {/* ========================================================================= */}
        {routeInfo.route === 'quotation' && (
          <div className="flex-1 overflow-y-auto flex flex-col print-flow-reset">
            <main className="flex-1 flex flex-col print-flow-reset">
              <QuotationDossierView
                quotationId={routeInfo.quotationId}
                isPrintMode={Boolean(routeInfo.isPrintMode)}
                allFrames={framesList}
                onNavigateReview={() => navigateTo('/review')}
                onNavigatePrint={(id) => navigateTo(`/quotation/${encodeURIComponent(id)}/print`)}
                onNavigateDossier={(id) => navigateTo(`/quotation/${encodeURIComponent(id)}`)}
                onNavigateStudio={() =>
                  navigateTo(selectedFrame ? `/studio/${selectedFrame.id}` : '/studio')
                }
                onNavigateCatalog={() => navigateTo('/catalog')}
                onNavigateQuotations={() => navigateTo('/quotations')}
                onQuotationUpdated={(updated) => {
                  setSavedQuotationsCount(getSavedQuotations().length);
                  if (activeQuotation && activeQuotation.id === updated.id) {
                    setActiveQuotation(updated);
                  }
                }}
              />
            </main>
            {!isDedicatedPrintView && (
              <div className="print:hidden no-print">
                <Footer
                  onNavigateHome={() => navigateTo('/')}
                  onNavigateCatalog={() => navigateTo('/catalog')}
                  onNavigateConfigurator={() =>
                    navigateTo(selectedFrame ? `/configurator/${selectedFrame.id}` : '/configurator')
                  }
                  onNavigateStudio={() =>
                    navigateTo(selectedFrame ? `/studio/${selectedFrame.id}` : '/studio')
                  }
                  onNavigateReview={() => navigateTo('/review')}
                  onNavigateQuotations={() => navigateTo('/quotations')}
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 6: /quotations - SAVED QUOTATIONS MANAGER (PHASE 5 STAGE 6)          */}
        {/* ========================================================================= */}
        {routeInfo.route === 'quotations' && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <main className="flex-1 flex flex-col">
              <SavedQuotationsPage
                activeQuotationId={activeQuotation?.id || null}
                onOpenDossier={(id) => navigateTo(`/quotation/${encodeURIComponent(id)}`)}
                onPrintDossier={(id) => navigateTo(`/quotation/${encodeURIComponent(id)}/print`)}
                onOpenInReview={handleOpenQuotationInReview}
                onEditAsNewFromQuotation={handleEditAsNewFromQuotation}
                onStartNewConfiguration={() =>
                  navigateTo(selectedFrame ? `/configurator/${selectedFrame.id}` : '/configurator')
                }
                onLedgerChanged={handleLedgerChanged}
              />
            </main>
            <div className="print:hidden no-print">
              <Footer
                onNavigateHome={() => navigateTo('/')}
                onNavigateCatalog={() => navigateTo('/catalog')}
                onNavigateConfigurator={() =>
                  navigateTo(selectedFrame ? `/configurator/${selectedFrame.id}` : '/configurator')
                }
                onNavigateStudio={() =>
                  navigateTo(selectedFrame ? `/studio/${selectedFrame.id}` : '/studio')
                }
                onNavigateReview={() => navigateTo('/review')}
                onNavigateQuotations={() => navigateTo('/quotations')}
              />
            </div>
          </div>
        )}
      </div>

      {/* Screen 1 Detail Modal (Inspect craftsmanship, profile cross-section & joinery) */}
      <FrameDetailModal
        frame={inspectingFrame}
        isSelected={selectedFrame?.id === inspectingFrame?.id}
        onSelect={(frame) => {
          setSelectedFrame(frame);
          navigateTo(`/configurator/${frame.id}`);
        }}
        onClose={() => setInspectingFrame(null)}
      />
    </div>
  );
}

export default App;
