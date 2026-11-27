export const LEADS_STORAGE_KEY = 'sanskruti_leads_v1';
export const MAX_STORED_LEADS = 100;

export type LeadType = 'sample_kit' | 'quick_quote' | 'formal_dossier';

export interface SavedLeadEntry {
  id: string;
  createdAt: string;
  leadType: LeadType;
  clientName: string;
  mobile: string;
  cityOrPin: string;
  skus: string[];
  configurationUrl: string;
  estimatedTotalINR: number | null;
  notes?: string;
}

export interface SaveLeadInput {
  leadType: LeadType;
  clientName?: string;
  mobile?: string;
  cityOrPin?: string;
  skus: string[];
  configurationUrl?: string;
  estimatedTotalINR?: number | null;
  notes?: string;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getSavedLeads(): SavedLeadEntry[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(LEADS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedLeadEntry =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.createdAt === 'string' &&
        typeof item.leadType === 'string' &&
        Array.isArray(item.skus)
    );
  } catch {
    return [];
  }
}

export function saveLead(input: SaveLeadInput): {
  success: boolean;
  entry?: SavedLeadEntry;
  error?: string;
} {
  const storage = getStorage();
  const cleanSkus = Array.from(
    new Set((input.skus || []).map((s) => String(s).trim()).filter(Boolean))
  );

  const entry: SavedLeadEntry = {
    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    leadType: input.leadType,
    clientName: (input.clientName || '').trim() || 'Atelier Visitor',
    mobile: (input.mobile || '').trim() || 'Not provided',
    cityOrPin: (input.cityOrPin || '').trim() || 'India',
    skus: cleanSkus.length > 0 ? cleanSkus : ['CUSTOM-SPEC'],
    configurationUrl:
      input.configurationUrl ||
      (typeof window !== 'undefined' ? window.location.href : '/configurator'),
    estimatedTotalINR:
      typeof input.estimatedTotalINR === 'number' && Number.isFinite(input.estimatedTotalINR)
        ? Math.round(input.estimatedTotalINR)
        : null,
    notes: input.notes?.trim() ? input.notes.trim().slice(0, 300) : undefined,
  };

  if (!storage) {
    return { success: false, error: 'Browser LocalStorage unavailable.' };
  }

  try {
    const existing = getSavedLeads();
    const updated = [entry, ...existing].slice(0, MAX_STORED_LEADS);
    storage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updated));
    return { success: true, entry };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unable to persist enquiry in browser LocalStorage.',
    };
  }
}

export function deleteSavedLead(leadId: string): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const existing = getSavedLeads();
    const filtered = existing.filter((l) => l.id !== leadId);
    storage.setItem(LEADS_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedLeads(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(LEADS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getLeadTypeLabel(leadType: LeadType): string {
  switch (leadType) {
    case 'sample_kit':
      return 'Trade Sample Kit';
    case 'formal_dossier':
      return 'Formal Dossier';
    case 'quick_quote':
    default:
      return 'Quick Quote';
  }
}

const FORMULA_INJECTION_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Neutralizes spreadsheet formula triggers (`=`, `+`, `-`, `@`, leading tab/CR or space-prefixed operators)
 * exclusively in exported CSV cells without altering stored LocalStorage records.
 */
export function sanitizeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (!str) return str;
  if (FORMULA_INJECTION_PREFIX_RE.test(str) || /^[ ]+[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const safe = sanitizeCsvCell(value);
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function exportLeadsToCsv(leads: SavedLeadEntry[]): string {
  const headers = [
    'Lead ID',
    'Created At (ISO)',
    'Lead Type',
    'Client Name',
    'Mobile / Contact',
    'City / PIN',
    'SKU(s)',
    'Estimated Total (INR)',
    'Configuration URL',
    'Notes',
  ];

  const rows = leads.map((lead) =>
    [
      lead.id,
      lead.createdAt,
      getLeadTypeLabel(lead.leadType),
      lead.clientName,
      lead.mobile,
      lead.cityOrPin,
      lead.skus.join('; '),
      lead.estimatedTotalINR !== null ? lead.estimatedTotalINR : '',
      lead.configurationUrl,
      lead.notes || '',
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
}
