export type VendorStatus = 'ACTIVE' | 'INACTIVE'

export type Vendor = {
  id: string
  vendorType: 'individual' | 'company'
  companyName: string
  name: string
  phone: string
  email: string
  ccEmails?: string[]
  gstApplicable: boolean
  gstin: string
  pan: string
  panName: string
  tdsApplicable: boolean
  tdsSection: string
  tdsPercentage: string
  address1: string
  address2: string
  city: string
  state: string
  country: string
  pincode: string
  accountHolderName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  swiftCode: string
  branchName: string
  status: VendorStatus
  createdAt: string
  updatedAt?: string
  deletedAt?: string
  clientLogo?: string
}

export type VendorGroup = {
  id: string
  name: string
  vendorCount: number
  createdAt: string
}
