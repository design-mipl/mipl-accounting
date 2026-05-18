import { useState, forwardRef, useImperativeHandle, useEffect } from 'react'
import {
  FileText, ChevronDown, Plus, Upload, X, Eye, Pencil,
  MapPin, Paperclip, Image as ImageIcon, Check, AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'
import type { Vendor } from '../../../types/vendor'

export type NewVendorFormRef = {
  handleSave: () => void
}

type Tab = 'basic' | 'tax' | 'address' | 'bank' | 'docs' | 'projects'

type Document = {
  id: string
  type: string
  file?: File
  fileName?: string
  isEditing?: boolean
  newType?: string
}

type FormData = {
  vendorType: 'individual' | 'company'
  companyName: string
  vendorName: string
  phone: string
  email: string
  ccEmails: string[]
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
  confirmAccountNumber: string
  ifscCode: string
  swiftCode: string
  branchName: string
  status: 'active' | 'inactive'
  documents: Document[]
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'basic', label: 'Basic Details', icon: <FileText size={14} /> },
  { key: 'tax', label: 'Tax Details', icon: <FileText size={14} /> },
  { key: 'address', label: 'Address', icon: <MapPin size={14} /> },
  { key: 'bank', label: 'Bank Details', icon: <FileText size={14} /> },
  { key: 'docs', label: 'Documents', icon: <Paperclip size={14} /> },
  { key: 'projects', label: 'Projects', icon: <FileText size={14} /> },
]

const DOCUMENT_TYPES = [
  'Vendor Logo', 'PAN Document', 'GST Certificate', 'TDS Declaration', 'MSME Certificate',
  'Agreement / Contract', 'Bank Proof', 'Other Documents',
]

const STATES_BY_COUNTRY: { [key: string]: string[] } = {
  'India': [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh',
    'Puducherry', 'Lakshadweep', 'Daman and Diu', 'Dadra and Nagar Haveli', 'Andaman and Nicobar Islands',
  ],
  'USA': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
    'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
    'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  ],
  'UK': [
    'England', 'Scotland', 'Wales', 'Northern Ireland',
  ],
}

const NewVendorForm = forwardRef<NewVendorFormRef, { onSave?: (vendor: Vendor) => void; onClose?: () => void; initialVendor?: Vendor | null }>(
  function NewVendorForm({ onSave, onClose, initialVendor }, ref) {
  const [tab, setTab] = useState<Tab>('basic')
  const [form, setForm] = useState<FormData>({
    vendorType: 'company',
    companyName: '',
    vendorName: '',
    phone: '',
    email: '',
    ccEmails: [],
    gstApplicable: false,
    gstin: '',
    pan: '',
    panName: '',
    tdsApplicable: false,
    tdsSection: '',
    tdsPercentage: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    swiftCode: '',
    branchName: '',
    status: 'active',
    documents: [],
  })
  const [docTypeDropdown, setDocTypeDropdown] = useState(false)
  const [newDocType, setNewDocType] = useState('')
  const [ccEmailInput, setCcEmailInput] = useState('')

  useEffect(() => {
    if (initialVendor) {
      setForm({
        vendorType: initialVendor.vendorType,
        companyName: initialVendor.companyName,
        vendorName: initialVendor.name,
        phone: initialVendor.phone,
        email: initialVendor.email,
        ccEmails: initialVendor.ccEmails || [],
        gstApplicable: initialVendor.gstApplicable,
        gstin: initialVendor.gstin,
        pan: initialVendor.pan,
        panName: initialVendor.panName,
        tdsApplicable: initialVendor.tdsApplicable,
        tdsSection: initialVendor.tdsSection,
        tdsPercentage: initialVendor.tdsPercentage,
        address1: initialVendor.address1,
        address2: initialVendor.address2,
        city: initialVendor.city,
        state: initialVendor.state,
        country: initialVendor.country || 'India',
        pincode: initialVendor.pincode,
        accountHolderName: initialVendor.accountHolderName,
        bankName: initialVendor.bankName,
        accountNumber: initialVendor.accountNumber,
        confirmAccountNumber: initialVendor.accountNumber,
        ifscCode: initialVendor.ifscCode,
        swiftCode: initialVendor.swiftCode,
        branchName: initialVendor.branchName,
        status: initialVendor.status,
        documents: [],
      })
    }
  }, [initialVendor])

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function addCcEmail() {
    if (ccEmailInput.trim() && !form.ccEmails.includes(ccEmailInput.trim())) {
      updateForm('ccEmails', [...form.ccEmails, ccEmailInput.trim()])
      setCcEmailInput('')
    }
  }

  function removeCcEmail(email: string) {
    updateForm('ccEmails', form.ccEmails.filter(e => e !== email))
  }

  function addDocument(type: string) {
    const newDoc: Document = { id: Math.random().toString(36), type }
    updateForm('documents', [...form.documents, newDoc])
    setDocTypeDropdown(false)
  }

  function removeDocument(id: string) {
    updateForm('documents', form.documents.filter(d => d.id !== id))
  }

  function handleSave() {
    if (onSave) {
      const vendor: Vendor = {
        id: initialVendor?.id || Math.random().toString(36).slice(2),
        vendorType: form.vendorType,
        companyName: form.companyName,
        name: form.vendorName,
        phone: form.phone,
        email: form.email,
        ccEmails: form.ccEmails,
        gstApplicable: form.gstApplicable,
        gstin: form.gstin,
        pan: form.pan,
        panName: form.panName,
        tdsApplicable: form.tdsApplicable,
        tdsSection: form.tdsSection,
        tdsPercentage: form.tdsPercentage,
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        state: form.state,
        country: form.country,
        pincode: form.pincode,
        accountHolderName: form.accountHolderName,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        ifscCode: form.ifscCode,
        swiftCode: form.swiftCode,
        branchName: form.branchName,
        status: form.status,
        createdAt: initialVendor?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: initialVendor?.deletedAt,
      }
      onSave(vendor)
      setForm({
        vendorType: 'company',
        companyName: '',
        vendorName: '',
        phone: '',
        email: '',
        ccEmails: [],
        gstApplicable: false,
        gstin: '',
        pan: '',
        panName: '',
        tdsApplicable: false,
        tdsSection: '',
        tdsPercentage: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        confirmAccountNumber: '',
        ifscCode: '',
        swiftCode: '',
        branchName: '',
        status: 'active',
        documents: [],
      })
    }
  }

  useImperativeHandle(ref, () => ({
    handleSave,
  }))

  const stateOptions = STATES_BY_COUNTRY[form.country] || []

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 px-5 py-0 overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === t.key
                ? 'text-indigo-600 border-indigo-600'
                : 'text-gray-500 border-transparent hover:text-gray-700',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* BASIC DETAILS TAB */}
        {tab === 'basic' && (
          <div className="space-y-4">
            {/* Vendor Type Toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Vendor Type *</label>
              <div className="flex gap-3">
                <button
                  onClick={() => updateForm('vendorType', 'individual')}
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
                    form.vendorType === 'individual'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300',
                  )}
                >
                  Individual
                </button>
                <button
                  onClick={() => updateForm('vendorType', 'company')}
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
                    form.vendorType === 'company'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300',
                  )}
                >
                  Company
                </button>
              </div>
            </div>

            {/* Company Name - show only for Company */}
            {form.vendorType === 'company' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Company Name *</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={e => updateForm('companyName', e.target.value)}
                  placeholder="ABC Corporation Ltd"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
              </div>
            )}

            {/* Vendor Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Vendor Name *</label>
              <input
                type="text"
                value={form.vendorName}
                onChange={e => updateForm('vendorName', e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => updateForm('phone', e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => updateForm('email', e.target.value)}
                placeholder="vendor@company.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>

            {/* CC Emails */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">CC Emails</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={ccEmailInput}
                  onChange={e => setCcEmailInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCcEmail())}
                  placeholder="additional@email.com"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
                <button
                  onClick={addCcEmail}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Add
                </button>
              </div>
              {form.ccEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.ccEmails.map(email => (
                    <div key={email} className="flex items-center gap-2 bg-gray-50 px-2.5 py-1.5 rounded text-xs">
                      {email}
                      <button onClick={() => removeCcEmail(email)} className="text-gray-400 hover:text-gray-600">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Status *</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={form.status === 'active'}
                    onChange={() => updateForm('status', 'active')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={form.status === 'inactive'}
                    onChange={() => updateForm('status', 'inactive')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Inactive</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAX DETAILS TAB */}
        {tab === 'tax' && (
          <div className="space-y-4">
            {/* GST Applicable */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.gstApplicable}
                  onChange={e => updateForm('gstApplicable', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-gray-700">GST Applicable</span>
              </label>
            </div>

            {/* GST Number - show only if GST Applicable */}
            {form.gstApplicable && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">GST Number *</label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={e => updateForm('gstin', e.target.value)}
                  placeholder="27AABCU9603R1ZX"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-mono"
                />
              </div>
            )}

            {/* PAN Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">PAN Number</label>
              <input
                type="text"
                value={form.pan}
                onChange={e => updateForm('pan', e.target.value)}
                placeholder="AABCU9603R"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-mono"
              />
            </div>

            {/* PAN Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">PAN Name</label>
              <input
                type="text"
                value={form.panName}
                onChange={e => updateForm('panName', e.target.value)}
                placeholder="Name as per PAN"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>

            {/* TDS Applicable */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tdsApplicable}
                  onChange={e => updateForm('tdsApplicable', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-gray-700">TDS Applicable</span>
              </label>
            </div>

            {/* TDS Section and Percentage - show only if TDS Applicable */}
            {form.tdsApplicable && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">TDS Section</label>
                  <input
                    type="text"
                    value={form.tdsSection}
                    onChange={e => updateForm('tdsSection', e.target.value)}
                    placeholder="194C"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">TDS Percentage (%)</label>
                  <input
                    type="text"
                    value={form.tdsPercentage}
                    onChange={e => updateForm('tdsPercentage', e.target.value)}
                    placeholder="2"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* ADDRESS TAB */}
        {tab === 'address' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address Line 1</label>
              <input
                type="text"
                value={form.address1}
                onChange={e => updateForm('address1', e.target.value)}
                placeholder="Street address"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address Line 2</label>
              <input
                type="text"
                value={form.address2}
                onChange={e => updateForm('address2', e.target.value)}
                placeholder="Suite, floor, etc."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => updateForm('city', e.target.value)}
                  placeholder="Mumbai"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">State</label>
                <select
                  value={form.state}
                  onChange={e => updateForm('state', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                >
                  <option value="">Select State</option>
                  {stateOptions.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Country</label>
                <select
                  value={form.country}
                  onChange={e => updateForm('country', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                >
                  <option value="India">India</option>
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={e => updateForm('pincode', e.target.value)}
                  placeholder="400001"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* BANK DETAILS TAB */}
        {tab === 'bank' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Account Holder Name</label>
              <input
                type="text"
                value={form.accountHolderName}
                onChange={e => updateForm('accountHolderName', e.target.value)}
                placeholder="Name as per bank account"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bank Name</label>
              <input
                type="text"
                value={form.bankName}
                onChange={e => updateForm('bankName', e.target.value)}
                placeholder="HDFC Bank"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Account Number</label>
              <input
                type="text"
                value={form.accountNumber}
                onChange={e => updateForm('accountNumber', e.target.value)}
                placeholder="Account number"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm Account Number</label>
              <input
                type="text"
                value={form.confirmAccountNumber}
                onChange={e => updateForm('confirmAccountNumber', e.target.value)}
                placeholder="Confirm account number"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">IFSC Code</label>
                <input
                  type="text"
                  value={form.ifscCode}
                  onChange={e => updateForm('ifscCode', e.target.value)}
                  placeholder="HDFC0001234"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">SWIFT Code</label>
                <input
                  type="text"
                  value={form.swiftCode}
                  onChange={e => updateForm('swiftCode', e.target.value)}
                  placeholder="HDBCINBB"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Branch Name</label>
              <input
                type="text"
                value={form.branchName}
                onChange={e => updateForm('branchName', e.target.value)}
                placeholder="Branch name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {tab === 'docs' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Add Documents</label>
              <div className="relative">
                <button
                  onClick={() => setDocTypeDropdown(!docTypeDropdown)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-left flex items-center justify-between outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                >
                  <span className="text-gray-600">Select document type</span>
                  <ChevronDown size={14} className={clsx('text-gray-400 transition-transform', docTypeDropdown && 'rotate-180')} />
                </button>
                {docTypeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {DOCUMENT_TYPES.map(type => (
                      <button key={type} onClick={() => { addDocument(type); setDocTypeDropdown(false) }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Documents List */}
            {form.documents.length > 0 && (
              <div className="space-y-2">
                {form.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between bg-white hover:bg-gray-50 p-4 rounded-lg border border-gray-200 transition-colors">
                    <div className="flex items-center gap-2">
                      <Paperclip size={14} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.type}</p>
                        {doc.fileName && <p className="text-xs text-gray-500">{doc.fileName}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROJECTS TAB */}
        {tab === 'projects' && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <FileText size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">Projects mapped to this vendor will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
},
)

export default NewVendorForm
