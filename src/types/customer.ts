export type CustomerStatus = 'Active' | 'Inactive'

export type ContactPerson = {
  id: string
  name: string
  designation?: string
  email?: string
  phone?: string
  isPrimary: boolean
}

export type Customer = {
  id: string
  companyName: string
  ownerName: string
  emails: string[]      // array of email addresses
  phones: string[]      // array of phone numbers
  website?: string
  gstNumber: string
  gstApplicable: boolean
  tdsNumber: string
  tdsApplicable: boolean
  panNumber?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pincode: string
  country?: string
  contactPersons: ContactPerson[]
  notes?: string
  status: CustomerStatus
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
