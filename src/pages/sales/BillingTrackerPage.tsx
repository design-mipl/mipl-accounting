import { useState, useMemo } from 'react'
import { Search, FileText, ReceiptText, ReceiptIndianRupee } from 'lucide-react'
import clsx from 'clsx'
import { calcMilestone, calcPaymentStatus } from '../../types/sales'
import { useCustomers } from '../../contexts/CustomerContext'
import { useSales } from '../../contexts/SalesContext'
import { fmtINR } from '../../utils/currency'
import { StatusBadge, piTone, tiTone, paymentTone } from './components/StatusBadge'
import { PIFormDrawer } from './components/PIFormDrawer'
import { TIFormDrawer } from './components/TIFormDrawer'

type Row = {
  key: string
  customer: string
  parent: string          // project or AMC name
  unit: string            // milestone / cycle
  billingType: string
  base: number
  gst: number
  gross: number
  tds: number
  expected: number
  received: number
  outstanding: number
  piNumber: string
  piStatus: string
  tiNumber: string
  tiStatus: string
  paymentStatus: string
}

export default function BillingTrackerPage() {
  const { projects, milestones, amcs, amcCycles, pis, tis } = useSales()
  const { customers } = useCustomers()
  const SALES_CUSTOMERS = useMemo(() => {
    return customers.map(c => ({ id: c.id, name: c.companyName }))
  }, [customers])
  const [search, setSearch] = useState('')
  const [fCustomer, setFCustomer] = useState('')
  const [fBilling, setFBilling] = useState('')
  const [fPayment, setFPayment] = useState('')

  const [piOpen, setPiOpen] = useState(false)
  const [tiOpen, setTiOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const rows: Row[] = useMemo(() => {
    const out: Row[] = []

    // Project milestones & direct billing
    for (const proj of projects) {
      const customer = customers.find(c => c.id === proj.customerId)
      const customerName = customer ? customer.companyName : proj.customerName
      const ms = milestones.filter(m => m.projectId === proj.id)

      // 1. Render all milestones
      for (const m of ms) {
        const pi = pis.find(p => p.milestoneId === m.id)
        const received = pi?.amountReceived ?? 0
        const c = calcMilestone(proj.totalValue, m.percentage, proj.gstPercent, proj.tdsPercent, received)
        const ti = tis.find(t => t.milestoneId === m.id)
        out.push({
          key: `m-${m.id}`,
          customer: customerName,
          parent: proj.name,
          unit: `M${m.number}/${m.total} – ${m.name}`,
          billingType: proj.billingType,
          base: c.baseAmount, gst: c.gstAmount, gross: c.grossAmount, tds: c.tdsAmount,
          expected: c.expectedReceipt, received: c.amountReceived, outstanding: c.outstandingBeyondTds,
          piNumber: pi?.piNumber ?? '—',
          piStatus: pi ? pi.status : 'Not Raised',
          tiNumber: ti?.tiNumber ?? '—',
          tiStatus: ti ? ti.status : 'Not Created',
          paymentStatus: c.expectedReceipt === 0 ? 'Pending' : calcPaymentStatus(c.amountReceived, c.expectedReceipt),
        })
      }

      // 2. Render project-level (direct) invoices (those not linked to any milestone)
      const projPis = pis.filter(p => p.projectId === proj.id && !p.milestoneId)
      const projTis = tis.filter(t => t.projectId === proj.id && !t.milestoneId)

      if (projPis.length > 0 || projTis.length > 0) {
        const processedTiIds = new Set<string>()
        for (const pi of projPis) {
          const ti = projTis.find(t => t.linkedPiId === pi.id)
          if (ti) processedTiIds.add(ti.id)
          
          const received = Math.max(pi.amountReceived || 0, ti?.amountReceived || 0)
          const expected = pi.grossAmount - pi.tdsAmount
          const outstanding = expected - received

          out.push({
            key: `pi-${pi.id}`,
            customer: customerName,
            parent: proj.name,
            unit: pi.notes || `Direct Billing – ${pi.piNumber}`,
            billingType: proj.billingType,
            base: pi.baseAmount, gst: pi.gstAmount, gross: pi.grossAmount, tds: pi.tdsAmount,
            expected, received, outstanding,
            piNumber: pi.piNumber,
            piStatus: pi.status,
            tiNumber: ti?.tiNumber ?? '—',
            tiStatus: ti ? ti.status : 'Not Created',
            paymentStatus: expected === 0 ? 'Pending' : calcPaymentStatus(received, expected),
          })
        }

        for (const ti of projTis) {
          if (processedTiIds.has(ti.id)) continue
          
          const received = ti.amountReceived || 0
          const expected = ti.grossAmount - ti.tdsAmount
          const outstanding = expected - received

          out.push({
            key: `ti-${ti.id}`,
            customer: customerName,
            parent: proj.name,
            unit: ti.notes || `Direct Tax Invoice – ${ti.tiNumber}`,
            billingType: proj.billingType,
            base: ti.baseAmount, gst: ti.gstAmount, gross: ti.grossAmount, tds: ti.tdsAmount,
            expected, received, outstanding,
            piNumber: '—',
            piStatus: 'Not Raised',
            tiNumber: ti.tiNumber,
            tiStatus: ti.status,
            paymentStatus: expected === 0 ? 'Pending' : calcPaymentStatus(received, expected),
          })
        }
      } else if (ms.length === 0) {
        // If there are NO milestones AND no direct invoices raised yet, show a project placeholder row
        const c = calcMilestone(proj.totalValue, 100, proj.gstPercent, proj.tdsPercent, 0)
        out.push({
          key: `proj-${proj.id}`,
          customer: customerName,
          parent: proj.name,
          unit: 'Project Payment',
          billingType: proj.billingType,
          base: c.baseAmount, gst: c.gstAmount, gross: c.grossAmount, tds: c.tdsAmount,
          expected: c.expectedReceipt, received: 0, outstanding: c.expectedReceipt,
          piNumber: '—',
          piStatus: 'Not Raised',
          tiNumber: '—',
          tiStatus: 'Not Created',
          paymentStatus: 'Pending',
        })
      }
    }

    // AMC billing cycles
    for (const amc of amcs) {
      const customer = customers.find(c => c.id === amc.customerId)
      const customerName = customer ? customer.companyName : amc.customerName
      const cycles = amcCycles.filter(cc => cc.amcId === amc.id)
      for (const cc of cycles) {
        const pi = pis.find(p => p.amcCycleId === cc.id)
        const ti = tis.find(t => t.amcCycleId === cc.id)
        const outstanding = cc.expectedReceipt - cc.amountReceived
        out.push({
          key: `c-${cc.id}`,
          customer: customerName,
          parent: amc.name,
          unit: cc.period,
          billingType: 'AMC',
          base: cc.baseAmount, gst: cc.gstAmount, gross: cc.grossAmount, tds: cc.tdsAmount,
          expected: cc.expectedReceipt, received: cc.amountReceived, outstanding,
          piNumber: pi?.piNumber ?? '—',
          piStatus: pi ? pi.status : 'Not Raised',
          tiNumber: ti?.tiNumber ?? '—',
          tiStatus: ti ? ti.status : 'Not Created',
          paymentStatus: calcPaymentStatus(cc.amountReceived, cc.expectedReceipt),
        })
      }
    }

    return out
  }, [projects, milestones, amcs, amcCycles, pis, tis, customers])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return rows.filter(r => {
      if (q && !r.customer.toLowerCase().includes(q)
            && !r.parent.toLowerCase().includes(q)
            && !r.unit.toLowerCase().includes(q)) return false
      if (fCustomer) {
        const cust = SALES_CUSTOMERS.find(c => c.id === fCustomer)
        if (cust && r.customer !== cust.name) return false
      }
      if (fBilling && r.billingType !== fBilling) return false
      if (fPayment && r.paymentStatus !== fPayment) return false
      return true
    })
  }, [rows, search, fCustomer, fBilling, fPayment, SALES_CUSTOMERS])

  const summary = useMemo(() => {
    const totalBilling = filtered.reduce((s, r) => s + (Number(r.gross) || 0), 0)
    const totalReceived = filtered.reduce((s, r) => s + (Number(r.received) || 0), 0)
    const totalOutstanding = filtered.reduce((s, r) => s + Math.max(0, Number(r.outstanding) || 0), 0)
    const shortfallCount = filtered.filter(r => r.paymentStatus === 'Shortfall').length
    return {
      totalBilling,
      piRaised: pis.length,
      tiCount: tis.length,
      totalReceived,
      totalOutstanding,
      shortfallCount,
    }
  }, [filtered, pis, tis])

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Billing Tracker</h1>
        <p className="text-xs text-gray-400 mt-0.5">Combined overview of milestones, AMC cycles, PIs, tax invoices, and payments.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <SummaryCard label="Total Billing Value" value={fmtINR(summary.totalBilling)} accent="slate" />
        <SummaryCard label="Total PI Raised" value={String(summary.piRaised)} accent="indigo" />
        <SummaryCard label="Total Tax Invoices" value={String(summary.tiCount)} accent="violet" />
        <SummaryCard label="Total Received" value={fmtINR(summary.totalReceived)} accent="emerald" />
        <SummaryCard label="Outstanding Beyond TDS" value={fmtINR(summary.totalOutstanding)} accent="red" />
        <SummaryCard label="Shortfall Cases" value={String(summary.shortfallCount)} accent="amber" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-wrap">
          <div className="relative" style={{ minWidth: '220px' }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, project, milestone..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
          </div>
          <FilterSelect value={fCustomer} onChange={setFCustomer} placeholder="All Customers" options={SALES_CUSTOMERS.map(c => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={fBilling} onChange={setFBilling} placeholder="All Billing" options={['Milestone Based', 'AMC', 'One-time', 'Monthly Retainer'].map(b => ({ value: b, label: b }))} />
          <FilterSelect value={fPayment} onChange={setFPayment} placeholder="All Payment Status" options={['Pending', 'Partial', 'Matched', 'Shortfall', 'Excess Received'].map(p => ({ value: p, label: p }))} />
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setPiOpen(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-700"><FileText size={12} /> PI</button>
            <button onClick={() => setTiOpen(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-violet-50 hover:text-violet-700"><ReceiptText size={12} /> Tax Invoice</button>
            <button onClick={() => setReceiptOpen(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-emerald-50 hover:text-emerald-700"><ReceiptIndianRupee size={12} /> Receipt</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '1600px' }}>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Project / AMC</th>
                <th className="py-2.5 px-3">Milestone / Cycle</th>
                <th className="py-2.5 px-3">Billing Type</th>
                <th className="py-2.5 px-3 text-right">Base</th>
                <th className="py-2.5 px-3 text-right">GST</th>
                <th className="py-2.5 px-3 text-right">Gross</th>
                <th className="py-2.5 px-3 text-right">TDS</th>
                <th className="py-2.5 px-3 text-right">Expected</th>
                <th className="py-2.5 px-3 text-right">Received</th>
                <th className="py-2.5 px-3 text-right">Outstanding</th>
                <th className="py-2.5 px-3">PI #</th>
                <th className="py-2.5 px-3">PI Status</th>
                <th className="py-2.5 px-3">TI #</th>
                <th className="py-2.5 px-3">TI Status</th>
                <th className="py-2.5 px-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={16} className="py-12 text-center text-xs text-gray-400">No billing items match your filters.</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.key} className="border-b border-gray-50 hover:bg-gray-50/60 text-xs">
                  <td className="py-2.5 px-3 text-gray-700 font-medium">{r.customer}</td>
                  <td className="py-2.5 px-3 text-gray-700">{r.parent}</td>
                  <td className="py-2.5 px-3 text-gray-500 text-[11px]">{r.unit}</td>
                  <td className="py-2.5 px-3"><StatusBadge label={r.billingType} tone="gray" size="xs" /></td>
                  <td className="py-2.5 px-3 text-right">{fmtINR(r.base)}</td>
                  <td className="py-2.5 px-3 text-right text-violet-700">{fmtINR(r.gst)}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{fmtINR(r.gross)}</td>
                  <td className="py-2.5 px-3 text-right text-orange-700">{fmtINR(r.tds)}</td>
                  <td className="py-2.5 px-3 text-right text-indigo-700 font-medium">{fmtINR(r.expected)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-700">{fmtINR(r.received)}</td>
                  <td className={clsx('py-2.5 px-3 text-right font-medium', r.outstanding > 0 ? 'text-red-600' : 'text-gray-300')}>
                    {r.outstanding > 0 ? fmtINR(r.outstanding) : '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-600">{r.piNumber}</td>
                  <td className="py-2.5 px-3"><StatusBadge label={r.piStatus} tone={piTone(r.piStatus)} size="xs" /></td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-violet-600">{r.tiNumber}</td>
                  <td className="py-2.5 px-3"><StatusBadge label={r.tiStatus} tone={tiTone(r.tiStatus)} size="xs" /></td>
                  <td className="py-2.5 px-3"><StatusBadge label={r.paymentStatus} tone={paymentTone(r.paymentStatus)} size="xs" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Combined overview only. Create/edit entries from Proforma Invoices and Tax Invoices pages.</p>
        </div>
      </div>

      <PIFormDrawer open={piOpen} onClose={() => setPiOpen(false)} />
      <TIFormDrawer open={tiOpen} onClose={() => setTiOpen(false)} />
    </div>
  )
}

const accentCls: Record<string, string> = {
  slate: 'border-l-slate-400',
  indigo: 'border-l-indigo-500',
  violet: 'border-l-violet-500',
  emerald: 'border-l-emerald-500',
  red: 'border-l-red-500',
  amber: 'border-l-amber-500',
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={clsx('bg-white rounded-xl border border-gray-200 border-l-[3px] px-3.5 py-3 shadow-sm', accentCls[accent])}>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[]
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={clsx('px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white',
        value ? 'border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600')}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
