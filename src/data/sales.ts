import type {
  Project, Milestone, AMC, AMCBillingCycle,
  ProformaInvoice, TaxInvoice,
} from '../types/sales'

// Sales-side customer list (subset of customer master with display names).
// For the demo we keep an inline list so dropdowns don't depend on Customer Master loading.
// GST/TDS defaults stand in for Client Master values (auto-filled on customer select).
export const SALES_CUSTOMERS = [
  { id: 'c1', name: 'Interics Design Consultants', gstPercent: 18, tdsPercent: 10 },
  { id: 'c2', name: 'Client A', gstPercent: 18, tdsPercent: 10 },
  { id: 'c3', name: 'Client B', gstPercent: 18, tdsPercent: 2 },
  { id: 'c4', name: 'Client C', gstPercent: 18, tdsPercent: 10 },
]

// ─── Projects ───────────────────────────────────────────────
export const DUMMY_PROJECTS: Project[] = []

// ─── Milestones ────────────────────────────────────────────
export const DUMMY_MILESTONES: Milestone[] = []

// ─── AMCs ──────────────────────────────────────────────────
export const DUMMY_AMCS: AMC[] = []

export const DUMMY_AMC_CYCLES: AMCBillingCycle[] = []

// ─── Proforma Invoices ─────────────────────────────────────
export const DUMMY_PIS: ProformaInvoice[] = []

// ─── Tax Invoices ─────────────────────────────────────────
export const DUMMY_TIS: TaxInvoice[] = []

