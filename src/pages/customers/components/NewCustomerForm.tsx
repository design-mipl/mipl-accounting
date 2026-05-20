import { useState, forwardRef, useImperativeHandle, useEffect } from 'react'
import {
  FileText, ChevronDown, Plus, Upload, X, Eye, Pencil,
  MapPin, Paperclip, Image as ImageIcon, Check,
} from 'lucide-react'
import clsx from 'clsx'
import type { Customer } from '../../../types/customer'

export type NewCustomerFormRef = {
  handleSave: () => void
}

type Tab = 'basic' | 'tax' | 'docs'

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
  companyName: string
  contactPerson: string
  phone: string
  email: string
  ccEmails: string[]
  website: string
  gstinApplicable: boolean
  gstin: string
  gstinName: string
  pan: string
  panName: string
  tdsApplicable: boolean
  tdsPercentage: string
  address1: string
  address2: string
  city: string
  state: string
  country: string
  pincode: string
  status: 'active' | 'inactive'
  documents: Document[]
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'basic', label: 'Basic Details', icon: <FileText size={14} /> },
  { key: 'tax', label: 'Tax Details', icon: <FileText size={14} /> },
  { key: 'docs', label: 'Documents', icon: <Paperclip size={14} /> },
]

const DOCUMENT_TYPES = [
  'PAN Document', 'GSTIN Certificate', 'TDS Declaration', 'MSME Certificate',
  'PO Document', 'Agreement / Contract', 'Invoice', 'Bank Details',
  'Aadhaar / ID', 'Other Documents',
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

const NewCustomerForm = forwardRef<NewCustomerFormRef, { onSave?: (customer: Customer, logoFile?: File, newDocs?: any[], deletedDocIds?: string[]) => void; onClose?: () => void; initialCustomer?: Customer | null; open?: boolean }>(
  function NewCustomerForm({ onSave, onClose, initialCustomer, open }, ref) {
  const [tab, setTab] = useState<Tab>('basic')
  const [form, setForm] = useState<FormData>({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    ccEmails: [],
    website: '',
    gstinApplicable: false,
    gstin: '',
    gstinName: '',
    pan: '',
    panName: '',
    tdsApplicable: false,
    tdsPercentage: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    status: 'active',
    documents: [],
  })
  const [docTypeDropdown, setDocTypeDropdown] = useState(false)
  const [newDocType, setNewDocType] = useState('')
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [deletedDocIds, setDeletedDocIds] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setDeletedDocIds([])
      if (initialCustomer) {
        setForm({
          logoPreview: initialCustomer.clientLogo || undefined,
          companyName: initialCustomer.companyName,
          contactPerson: initialCustomer.contactPerson || '',
          phone: initialCustomer.phoneNumber || '',
          email: initialCustomer.email || '',
          ccEmails: initialCustomer.ccEmails || [],
          website: '',
          gstinApplicable: initialCustomer.gstApplicable,
          gstin: initialCustomer.gstinNumber || '',
          gstinName: initialCustomer.verifiedGstinName || '',
          pan: initialCustomer.panNumber || '',
          panName: '',
          tdsApplicable: initialCustomer.tdsApplicable,
          tdsPercentage: initialCustomer.tdsPercentage ? String(initialCustomer.tdsPercentage) : '',
          address1: initialCustomer.addressLine1 || '',
          address2: initialCustomer.addressLine2 || '',
          city: initialCustomer.city || '',
          state: initialCustomer.state || '',
          country: initialCustomer.country || 'India',
          pincode: initialCustomer.pincode || '',
          status: (initialCustomer.status?.toLowerCase() as 'active' | 'inactive') || 'active',
          documents: [],
        })

        // Fetch documents
        const token = sessionStorage.getItem('token')
        fetch(`/api/customers/${initialCustomer.id}/documents`, {
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
          .catch(err => console.error('Failed to load customer documents:', err))
      } else {
        setForm({
          companyName: '',
          contactPerson: '',
          phone: '',
          email: '',
          ccEmails: [],
          website: '',
          gstinApplicable: false,
          gstin: '',
          gstinName: '',
          pan: '',
          panName: '',
          tdsApplicable: false,
          tdsPercentage: '',
          address1: '',
          address2: '',
          city: '',
          state: '',
          country: 'India',
          pincode: '',
          status: 'active',
          documents: [],
        })
      }
    }
  }, [initialCustomer, open])

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
      const customer: Customer = {
        id: initialCustomer?.id || Math.random().toString(36).slice(2),
        companyName: form.companyName,
        contactPerson: form.contactPerson,
        phoneNumber: form.phone.trim(),
        email: form.email,
        ccEmails: form.ccEmails.filter(e => e.trim()),
        gstinNumber: form.gstin,
        verifiedGstinName: form.gstinName,
        gstApplicable: form.gstinApplicable,
        tdsPercentage: form.tdsPercentage ? parseFloat(form.tdsPercentage) : undefined,
        tdsApplicable: form.tdsApplicable,
        panNumber: form.pan,
        addressLine1: form.address1,
        addressLine2: form.address2,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: form.country,
        status: form.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        createdAt: initialCustomer?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: initialCustomer?.deletedAt,
      }
      const logoFile = form.logoFile
      const newDocs = form.documents.filter(d => d.file)
      onSave(customer, logoFile, newDocs, deletedDocIds)
    }
  }

  useImperativeHandle(ref, () => ({
    handleSave,
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-gray-200 px-5 -mx-5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
              tab === t.key
                ? 'text-indigo-600 border-indigo-600'
                : 'text-gray-400 border-transparent hover:text-gray-600',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* BASIC DETAILS */}
        {tab === 'basic' && (
          <div className="space-y-4 max-w-2xl">
            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Client Logo</label>
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

            {/* Company Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Company Name *</label>
              <input type="text" value={form.companyName}
                onChange={e => updateForm('companyName', e.target.value)}
                placeholder="ABC Corporation Ltd" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Contact Person *</label>
              <input type="text" value={form.contactPerson}
                onChange={e => updateForm('contactPerson', e.target.value)}
                placeholder="Full name" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number *</label>
              <div className="flex gap-2">
                <select className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-200">
                  <option>+91</option>
                  <option>+1</option>
                  <option>+44</option>
                </select>
                <input type="tel" value={form.phone}
                  onChange={e => updateForm('phone', e.target.value)}
                  placeholder="9876543210" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email ID *</label>
              <input type="email" value={form.email}
                onChange={e => updateForm('email', e.target.value)}
                placeholder="name@company.com" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
            </div>

            {/* CC Email IDs */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">CC Email ID</label>
              <div className="space-y-2">
                {form.ccEmails.map((email, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input type="email" value={email}
                      onChange={e => {
                        const newCcEmails = [...form.ccEmails]
                        newCcEmails[idx] = e.target.value
                        updateForm('ccEmails', newCcEmails)
                      }}
                      placeholder="cc@company.com" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
                    <button onClick={() => updateForm('ccEmails', form.ccEmails.filter((_, i) => i !== idx))}
                      className="px-3 py-2 text-gray-400 hover:text-red-600 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={() => updateForm('ccEmails', [...form.ccEmails, ''])}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                  <Plus size={14} />
                  Add CC Email
                </button>
              </div>
            </div>

            {/* Address */}
            <div className="pt-2 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Address</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address Line 1 *</label>
                  <input type="text" value={form.address1}
                    onChange={e => updateForm('address1', e.target.value)}
                    placeholder="Street address" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address Line 2</label>
                  <input type="text" value={form.address2}
                    onChange={e => updateForm('address2', e.target.value)}
                    placeholder="Suite, floor, etc." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Country *</label>
                  <select value={form.country}
                    onChange={e => updateForm('country', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400">
                    <option>India</option>
                    <option>USA</option>
                    <option>UK</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">City *</label>
                    <input type="text" value={form.city}
                      onChange={e => updateForm('city', e.target.value)}
                      placeholder="Mumbai" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">State *</label>
                    <select value={form.state}
                      onChange={e => updateForm('state', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400">
                      <option value="">Select a state</option>
                      {(STATES_BY_COUNTRY[form.country] || []).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pincode *</label>
                  <input type="text" value={form.pincode}
                    onChange={e => updateForm('pincode', e.target.value)}
                    placeholder="400001" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 mb-2">Status *</label>
              <div className="flex gap-2">
                {['active', 'inactive'].map(s => (
                  <label key={s} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors"
                    style={{ borderColor: form.status === s ? '#4f46e5' : '#e5e7eb', backgroundColor: form.status === s ? '#eef2ff' : 'transparent' }}>
                    <input type="radio" name="status" value={s} checked={form.status === s}
                      onChange={() => updateForm('status', s as 'active' | 'inactive')} className="accent-indigo-600" />
                    <span className="text-xs font-medium text-gray-700 capitalize">{s === 'active' ? 'Active' : 'Inactive'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAX DETAILS */}
        {tab === 'tax' && (
          <div className="space-y-4 max-w-2xl">
            {/* GSTIN Applicable */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.gstinApplicable}
                  onChange={e => updateForm('gstinApplicable', e.target.checked)} className="accent-indigo-600" />
                <span className="text-sm font-medium text-gray-700">GSTIN Applicable</span>
              </label>
            </div>

            {/* GSTIN Number & Name */}
            {form.gstinApplicable && (
              <div className="space-y-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">GSTIN No. *</label>
                  <input type="text" value={form.gstin}
                    onChange={e => updateForm('gstin', e.target.value)}
                    placeholder="27AABCU9603R1ZX" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-mono text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Verified GSTIN Name</label>
                  <input type="text" value={form.gstinName}
                    onChange={e => updateForm('gstinName', e.target.value)}
                    placeholder="Legal entity name as per GST" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
                </div>
              </div>
            )}

            {/* PAN */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">PAN No.</label>
              <input type="text" value={form.pan}
                onChange={e => updateForm('pan', e.target.value)}
                placeholder="AABCU9603R" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-mono text-xs" />
            </div>

            {/* PAN Name */}
            {form.pan && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">PAN Name</label>
                <input type="text" value={form.panName}
                  onChange={e => updateForm('panName', e.target.value)}
                  placeholder="As per PAN certificate" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
              </div>
            )}

            {/* TDS Applicable */}
            <div className="pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.tdsApplicable}
                  onChange={e => updateForm('tdsApplicable', e.target.checked)} className="accent-indigo-600" />
                <span className="text-sm font-medium text-gray-700">TDS Applicable</span>
              </label>
            </div>

            {/* TDS Percentage */}
            {form.tdsApplicable && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">TDS Percentage *</label>
                <div className="flex gap-1">
                  <input type="number" value={form.tdsPercentage}
                    onChange={e => updateForm('tdsPercentage', e.target.value)}
                    placeholder="2" min="0" max="100" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
                  <span className="px-3 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200">%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS */}
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
                    <button key={type} onClick={() => addDocument(type)}
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
  }
)

export default NewCustomerForm
