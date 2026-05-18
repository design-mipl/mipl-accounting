export const EXPENSE_TYPES = [
  'Rent', 'Utilities', 'Software', 'Travel', 'Office Supplies',
  'Professional Fees', 'Salary', 'Reimbursement', 'Statutory',
  'Grocery', 'Household', 'Other',
] as const
export type ExpenseType = typeof EXPENSE_TYPES[number]

export const PARTY_TYPES = ['Vendor', 'Employee', 'Household', 'Other'] as const
export type PartyType = typeof PARTY_TYPES[number]

export const PAYMENT_STATUSES = ['Pending', 'Part Paid', 'Paid'] as const
export type PaymentStatus = typeof PAYMENT_STATUSES[number]

export const PAYMENT_MODES = ['Bank Transfer', 'UPI', 'Cash', 'Card', 'Cheque'] as const
export type PaymentMode = typeof PAYMENT_MODES[number]

export const DEDUCTION_TYPES = ['None', 'TDS', 'PT', 'Other'] as const
export type DeductionType = typeof DEDUCTION_TYPES[number]

export type Payment = {
  id: string
  expenseDate: string   // 'YYYY-MM-DD'
  month: string         // 'YYYY-MM'
  expenseType: ExpenseType
  partyType: PartyType
  partyName: string
  notes: string
  recurring: boolean
  baseAmount: number
  gstApplicable: boolean
  gstPercent: number    // 0, 5, 12, 18, 28
  gstAmount: number
  deductionType: DeductionType
  deductionPercent: number
  deductionAmount: number
  netPayable: number
  paidAmount: number
  paymentStatus: PaymentStatus
  balanceAmount: number
  paymentMode?: PaymentMode
  referenceNumber?: string
  paymentDate?: string
  attachmentName?: string
  createdAt: string
  updatedAt?: string
}

export const DUMMY_VENDOR_NAMES = [
  'TechSupply Solutions', 'Global Supplies Inc', 'Industrial Parts Ltd',
  'City Electric Board', 'Office Space Rentals Ltd', 'Cloud Services Inc',
]

export const DUMMY_EMPLOYEE_NAMES = [
  'Arjun Sharma', 'Priya Mehta', 'Rahul Verma', 'Sneha Patel', 'Kiran Nair',
]
