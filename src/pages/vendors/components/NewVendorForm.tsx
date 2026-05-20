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

type Tab = 'basic' | 'tax' | 'address' | 'bank' | 'docs'

type Document = {
  id: string
  type: string
  file?: File
  fileName?: string
  isEditing?: boolean
  newType?: string
}

type FormData = {
  logoFile?: File
  logoPreview?: string
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
]

const DOCUMENT_TYPES = [
  'PAN Document', 'GST Certificate', 'TDS Declaration', 'MSME Certificate',
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

const NewVendorForm = forwardRef<NewVendorFormRef, { onSave?: (vendor: Vendor, logoFile?: File, newDocs?: any[], deletedDocIds?: string[]) => void; onClose?: () => void; initialVendor?: Vendor | null; open?: boolean; error?: string | null }>(
  function NewVendorForm({ onSave, onClose, initialVendor, open, error }, ref) {
  const [tab, setTab] = useState<Tab>('basic')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!error) {
      setFieldErrors({})
      return
    }
    const errors: Record<string, string> = {}
    const lines = error.split('\n')
    lines.forEach(line => {
      const clean = line.replace(/^[•\-\*\s]+/, '').trim()
      const colonIndex = clean.indexOf(':')
      if (colonIndex > 0) {
        const field = clean.substring(0, colonIndex).trim()
        const message = clean.substring(colonIndex + 1).trim()
        if (field && message) {
          if (field === 'phoneNumber') errors['phone'] = message
          else if (field === 'addressLine1') errors['address1'] = message
          else if (field === 'addressLine2') errors['address2'] = message
          else if (field === 'gstinNumber') errors['gstin'] = message
          else if (field === 'panNumber') errors['pan'] = message
          else if (field === 'bankAccountHolderName') errors['accountHolderName'] = message
          else if (field === 'bankAccountNumber') errors['accountNumber'] = message
          else if (field === 'bankIfscCode') errors['ifscCode'] = message
          else if (field === 'bankSwiftCode') errors['swiftCode'] = message
          else if (field === 'bankBranchName') errors['branchName'] = message
          else errors[field] = message
        }
      }
    })
    setFieldErrors(errors)
  }, [error])

  const getTabErrors = (tabKey: Tab) => {
    const tabFields: Record<Tab, string[]> = {
      basic: ['vendorType', 'companyName', 'vendorName', 'phone', 'email'],
      tax: ['gstin', 'pan', 'panName', 'tdsSection', 'tdsPercentage'],
      address: ['address1', 'address2', 'city', 'state', 'country', 'pincode'],
      bank: ['accountHolderName', 'bankName', 'accountNumber', 'ifscCode', 'swiftCode', 'branchName'],
      docs: ['documents'],
    }
    return tabFields[tabKey]?.filter(field => fieldErrors[field]) || []
  }

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
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [deletedDocIds, setDeletedDocIds] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setDeletedDocIds([])
      if (initialVendor) {
        setForm({
          logoPreview: initialVendor.clientLogo || undefined,
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
          status: initialVendor.status === 'ACTIVE' ? 'active' : 'inactive',
          documents: [],
        })

        // Fetch documents
        const token = sessionStorage.getItem('token')
        fetch(`/api/vendors/${initialVendor.id}/documents`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
          .then(res => res.json())
          .then(resData => {
            if (resData.success && resData.data) {
              const loadedDocs: Document[] = []
              Object.entries(resData.data).forEach(([type, docs]) => {
                const anyDocs = docs as any[]
                const latestDoc = anyDocs.find(d => d.isLatest) || anyDocs[0]
                if (latestDoc) {
                  loadedDocs.push({
                    id: latestDoc.id,
                    type: latestDoc.documentType,
                    fileName: latestDoc.originalFileName,
                  })
                }
              })
              setForm(prev => ({ ...prev, documents: loadedDocs }))
            }
          })
          .catch(err => console.error('Failed to load vendor documents:', err))
      } else {
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
  }, [initialVendor, open])

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        updateForm('logoFile', file)
        updateForm('logoPreview', reader.result as string)
      }
      reader.readAsDataURL(file)
    }
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
    const newDoc: Document = { id: Math.random().toString(36), type, isEditing: true }
    updateForm('documents', [...form.documents, newDoc])
    setDocTypeDropdown(false)
  }

  function addCustomDocType() {
    if (newDocType.trim()) {
      addDocument(newDocType)
      setNewDocType('')
    }
  }

  function handleDocFileUpload(docId: string, file: File) {
    updateForm('documents', form.documents.map(d =>
      d.id === docId ? { ...d, file, fileName: file.name } : d,
    ))
  }

  function startEditDoc(docId: string) {
    const doc = form.documents.find(d => d.id === docId)
    if (doc) {
      setEditingDocId(docId)
      setForm(prev => ({
        ...prev,
        documents: prev.documents.map(d =>
          d.id === docId ? { ...d, newType: d.type } : d,
        ),
      }))
    }
  }

  function saveEditDoc(docId: string) {
    updateForm('documents', form.documents.map(d =>
      d.id === docId ? { ...d, type: d.newType || d.type, isEditing: false, newType: undefined } : d,
    ))
    setEditingDocId(null)
  }

  function removeDocument(id: string) {
    const docToRemove = form.documents.find(d => d.id === id)
    if (docToRemove && !docToRemove.file) {
      setDeletedDocIds(prev => [...prev, id])
    }
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
        status: form.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        createdAt: initialVendor?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: initialVendor?.deletedAt,
      }
      const logoFile = form.logoFile
      const newDocs = form.documents.filter(d => d.file)
      onSave(vendor, logoFile, newDocs, deletedDocIds)
    }
  }

  useImperativeHandle(ref, () => ({
    handleSave,
  }))

  const stateOptions = STATES_BY_COUNTRY[form.country] || []

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-5 py-0">
        {TABS.map(t => {
          const errorsOnTab = getTabErrors(t.key)
          const hasErrors = errorsOnTab.length > 0
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 px-1 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                tab === t.key
                  ? 'text-indigo-600 border-indigo-600'
                  : hasErrors
                    ? 'text-red-500 border-transparent hover:text-red-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700',
              )}
            >
              {t.icon}
              {t.label}
              {hasErrors && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          )
        })}
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* BASIC DETAILS TAB */}
        {tab === 'basic' && (
          <div className="space-y-4">
            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Vendor Logo</label>
              <div className="flex gap-3 items-start">
                <div className="relative">
                  <input type="file" accept="image/*" onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
                    {form.logoPreview ? (
                      <img src={form.logoPreview} alt="Logo" className="w-full h-full object-cover rounded-[6px]" />
                    ) : (
                      <ImageIcon size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 pt-1">
                  <p className="font-medium text-gray-600 mb-1">Upload Logo</p>
                  <p>JPG, PNG (Max 5MB)</p>
                </div>
              </div>
            </div>

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
              {fieldErrors.vendorType && (
                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.vendorType}</p>
              )}
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
                {fieldErrors.companyName && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.companyName}</p>
                )}
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
              {fieldErrors.vendorName && (
                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.vendorName}</p>
              )}
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
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.phone}</p>
              )}
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
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.email}</p>
              )}
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
                {fieldErrors.gstin && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.gstin}</p>
                )}
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
              {fieldErrors.pan && (
                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.pan}</p>
              )}
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
              {fieldErrors.panName && (
                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.panName}</p>
              )}
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
                  {fieldErrors.tdsSection && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.tdsSection}</p>
                  )}
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
                  {fieldErrors.tdsPercentage && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.tdsPercentage}</p>
                  )}
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
              {fieldErrors.address1 && (
                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.address1}</p>
              )}
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
              {fieldErrors.address2 && (
                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.address2}</p>
              )}
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
                {fieldErrors.city && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.city}</p>
                )}
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
                {fieldErrors.state && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.state}</p>
                )}
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
                {fieldErrors.country && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.country}</p>
                )}
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
                {fieldErrors.pincode && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.pincode}</p>
                )}
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
              {fieldErrors.accountHolderName && (
                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.accountHolderName}</p>
              )}
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
              {fieldErrors.bankName && (
                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.bankName}</p>
              )}
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
              {fieldErrors.accountNumber && (
                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.accountNumber}</p>
              )}
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
                {fieldErrors.ifscCode && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.ifscCode}</p>
                )}
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
                {fieldErrors.swiftCode && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.swiftCode}</p>
                )}
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
              {fieldErrors.branchName && (
                <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.branchName}</p>
              )}
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {tab === 'docs' && (
          <div className="space-y-3 max-w-2xl">
            {/* Add Document Dropdown */}
            <div className="relative">
              <button onClick={() => setDocTypeDropdown(!docTypeDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <span className="flex items-center gap-1.5">
                  <Plus size={14} className="text-gray-400" />
                  Add Document
                </span>
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
                  <div className="border-t border-gray-100 p-2">
                    <div className="flex gap-1">
                      <input type="text" value={newDocType} onChange={e => setNewDocType(e.target.value)}
                        placeholder="Add custom type" className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:ring-2 focus:ring-indigo-200" />
                      <button onClick={addCustomDocType}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Document List */}
            {form.documents.length > 0 && (
              <div className="space-y-3">
                {form.documents.map(doc => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                    {editingDocId === doc.id ? (
                      /* Edit Mode */
                      <div className="space-y-3">
                        <select value={doc.newType || doc.type}
                          onChange={e => updateForm('documents', form.documents.map(d =>
                            d.id === doc.id ? { ...d, newType: e.target.value } : d))}
                          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-200">
                          {DOCUMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => saveEditDoc(doc.id)}
                            className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1">
                            <Check size={14} />
                            Save
                          </button>
                          <button onClick={() => setEditingDocId(null)}
                            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-900">{doc.type}</p>
                            {doc.fileName && <p className="text-xs text-gray-500 mt-1">{doc.fileName}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {(doc.file || doc.fileName) && <Check size={16} className="text-emerald-500 shrink-0" />}
                            <button onClick={() => startEditDoc(doc.id)} title="Edit"
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => removeDocument(doc.id)} title="Remove"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        {!doc.file && !doc.fileName ? (
                          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer transition-colors">
                            <Upload size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-600 font-medium">Upload file</span>
                            <input type="file" onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) handleDocFileUpload(doc.id, file)
                            }} className="hidden" />
                          </label>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {form.documents.length === 0 && (
              <div className="text-center py-8">
                <Paperclip size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">No documents added yet</p>
              </div>
            )}
          </div>
        )}


      </div>
    </div>
  )
},
)

export default NewVendorForm
