

export type ContactPerson = {
  id: string
  name: string
  designation?: string
  email?: string
  phone?: string
  isPrimary: boolean
}

export type CustomerStatus = 'ACTIVE' | 'INACTIVE'

export type Customer = {
  id: string
  companyName: string
  contactPerson: string
  phoneNumber: string
  email: string
  ccEmails: string[]
  clientLogo?: string
  
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  country: string
  pincode: string
  status: CustomerStatus
  
  // Tax details
  gstApplicable: boolean
  gstinNumber?: string
  verifiedGstinName?: string
  panNumber?: string
  tdsApplicable: boolean
  tdsPercentage?: number
  
  createdAt: string
  updatedAt?: string
  deletedAt?: string
}

export type CustomerGroup = {
  id: string
  name: string
  customerCount: number
  createdAt: string
}
