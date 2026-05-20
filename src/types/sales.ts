// ───────────────────────────────────────────────────────────
// Sales module types
// Customer → Project → Milestone → PI → Receipt → Tax Invoice
// Customer → Project → Milestone → Tax Invoice (direct)
// ───────────────────────────────────────────────────────────

export const PROJECT_TYPES = [
  'Website', 'Web App', 'Mobile App', 'Software Development',
  'Digital Marketing', 'Branding', 'AMC', 'Retainer', 'One-time', 'Other',
] as const
export type ProjectType = typeof PROJECT_TYPES[number]

export const BILLING_TYPES = ['Milestone Based', 'AMC', 'One-time', 'Monthly Retainer'] as const
export type BillingType = typeof BILLING_TYPES[number]

export const PROJECT_STATUSES = ['Upcoming', 'Active', 'On Hold', 'Completed', 'Cancelled'] as const
export type ProjectStatus = typeof PROJECT_STATUSES[number]

export const AMC_FREQUENCIES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'] as const
export type AMCFrequency = typeof AMC_FREQUENCIES[number]

export const AMC_STATUSES = ['Active', 'Expired', 'On Hold', 'Cancelled'] as const
export type AMCStatus = typeof AMC_STATUSES[number]

export const PI_STATUSES = ['Not Raised', 'Draft', 'Sent', 'Uploaded', 'Cancelled'] as const
export type PIStatus = typeof PI_STATUSES[number]

export const TI_STATUSES = ['Not Created', 'Draft', 'Sent', 'Uploaded', 'Cancelled'] as const
export type TIStatus = typeof TI_STATUSES[number]

export const PAYMENT_STATUSES_SALES = [
  'Pending', 'Partial', 'Matched', 'Shortfall', 'Excess Received',
] as const
export type PaymentStatusSales = typeof PAYMENT_STATUSES_SALES[number]

export const MILESTONE_STATUSES = [
  'Not Started', 'PI Pending', 'PI Uploaded', 'Payment Pending',
  'Payment Partially Received', 'Payment Matched', 'Payment Shortfall',
  'Tax Invoice Uploaded', 'Closed',
] as const
export type MilestoneStatus = typeof MILESTONE_STATUSES[number]

export const PI_DOC_STATUSES = ['Pending', 'Paid', 'Shortfall', 'Draft', 'Sent', 'Cancelled'] as const
export type PIDocStatus = typeof PI_DOC_STATUSES[number]

export const TI_DOC_STATUSES = ['Pending', 'Paid', 'Shortfall', 'Draft', 'Sent', 'Cancelled'] as const
export type TIDocStatus = typeof TI_DOC_STATUSES[number]

export const PAYMENT_MODES_SALES = ['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Other'] as const
export type PaymentModeSales = typeof PAYMENT_MODES_SALES[number]

// ───────────────────────────────────────────────────────────
// Project + Milestones
// ───────────────────────────────────────────────────────────

export type Milestone = {
  id: string
  projectId: string
  number: number          // 1, 2, 3...
  total: number           // total milestones in this project (1 of N)
  name: string
  percentage: number      // 0-100
  description?: string
  expectedDate?: string   // YYYY-MM-DD — due/expected date
  notes?: string
  piStatus: PIStatus
  tiStatus: TIStatus
  paymentStatus: PaymentStatusSales
  milestoneStatus: MilestoneStatus
  piFileName?: string
  tiFileName?: string
}

export type Project = {
  id: string
  customerId: string
  customerName: string    // denormalized for table display
  name: string
  projectType: ProjectType
  startDate: string       // YYYY-MM-DD
  endDate: string
  totalValue: number
  gstPercent: number
  tdsPercent: number
  billingType: BillingType
  projectStatus: ProjectStatus
  amcFrequency?: AMCFrequency
  expectedBillingDate?: string   // AMC: expected billing date
  notes?: string
  createdAt: string
  updatedAt?: string
}

// ───────────────────────────────────────────────────────────
// AMC
// ───────────────────────────────────────────────────────────

export type AMCBillingCycle = {
  id: string
  amcId: string
  period: string          // e.g. "April 2026"
  dueDate: string         // YYYY-MM-DD
  baseAmount: number
  gstAmount: number
  grossAmount: number
  tdsAmount: number
  expectedReceipt: number
  amountReceived: number
  piStatus: PIStatus
  tiStatus: TIStatus
  paymentStatus: PaymentStatusSales
  piFileName?: string
  tiFileName?: string
}

export type AMC = {
  id: string
  customerId: string
  customerName: string
  name: string
  startDate: string
  endDate: string
  frequency: AMCFrequency
  baseAmount: number
  gstPercent: number
  tdsPercent: number
  nextBillingDate: string
  status: AMCStatus
  notes?: string
  createdAt: string
}

// ───────────────────────────────────────────────────────────
// Proforma Invoice (PI)
// ───────────────────────────────────────────────────────────

export type ProformaInvoice = {
  id: string
  piNumber: string
  piDate: string
  clientId: string
  clientName: string
  projectType: ProjectType | ''
  projectId?: string
  projectName?: string
  milestoneId?: string
  milestoneLabel?: string
  amcId?: string
  amcCycleId?: string
  baseAmount: number
  gstPercent: number
  gstAmount: number
  grossAmount: number
  amountReceived: number
  tdsPercent: number
  tdsAmount: number
  outstandingBeyondTds: number
  status: PIDocStatus
  piSent: boolean
  fileName?: string
  notes?: string
  createdAt: string
}

// ───────────────────────────────────────────────────────────
// Tax Invoice
// ───────────────────────────────────────────────────────────

export type TaxInvoice = {
  id: string
  tiNumber: string
  tiDate: string
  linkedPiId?: string
  linkedPiNumber?: string
  clientId: string
  clientName: string
  projectType: ProjectType | ''
  projectId?: string
  projectName?: string
  milestoneId?: string
  milestoneLabel?: string
  amcId?: string
  amcCycleId?: string
  baseAmount: number
  gstPercent: number
  gstAmount: number
  grossAmount: number
  amountReceived: number
  tdsPercent: number
  tdsAmount: number
  outstandingBeyondTds: number
  status: TIDocStatus
  invoiceSent: boolean
  fileName?: string
  notes?: string
  createdAt: string
}


// ───────────────────────────────────────────────────────────
// Calculation helpers
// ───────────────────────────────────────────────────────────

export type MilestoneCalc = {
  baseAmount: number
  gstAmount: number
  grossAmount: number
  tdsAmount: number
  expectedReceipt: number
  amountReceived: number
  outstandingBeyondTds: number
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function calcMilestone(
  totalValue: number,
  percentage: number,
  gstPercent: number,
  tdsPercent: number,
  amountReceived = 0,
): MilestoneCalc {
  const baseAmount = round2(totalValue * percentage / 100)
  const gstAmount = round2(baseAmount * gstPercent / 100)
  const grossAmount = round2(baseAmount + gstAmount)
  const tdsAmount = round2(baseAmount * tdsPercent / 100)
  const expectedReceipt = round2(grossAmount - tdsAmount)
  const outstandingBeyondTds = round2(expectedReceipt - amountReceived)
  return { baseAmount, gstAmount, grossAmount, tdsAmount, expectedReceipt, amountReceived, outstandingBeyondTds }
}

export function calcPaymentStatus(amountReceived: number, expectedReceipt: number): PaymentStatusSales {
  const received = Math.round(amountReceived * 100) / 100
  const expected = Math.round(expectedReceipt * 100) / 100
  if (received === 0) return 'Pending'
  if (received < expected) return 'Shortfall'
  if (received > expected) return 'Excess Received'
  return 'Matched'
}
