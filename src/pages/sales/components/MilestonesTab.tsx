import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Save, AlertTriangle, FileText } from 'lucide-react'
import clsx from 'clsx'
import type { Project, Milestone, PIStatus, TIStatus, MilestoneStatus, PaymentStatusSales } from '../../../types/sales'
import { calcMilestone } from '../../../types/sales'
import { fmtINR } from '../../../utils/currency'
import { useSales, newId } from '../../../contexts/SalesContext'
import { StatusBadge, piTone, tiTone, paymentTone, milestoneStatusTone } from './StatusBadge'

type Row = {
  id: string
  number: number
  total: number
  name: string
  percentage: string
  piStatus: PIStatus
  tiStatus: TIStatus
  paymentStatus: PaymentStatusSales
  milestoneStatus: MilestoneStatus
  piFileName?: string
  tiFileName?: string
  amountReceived: number  // derived/manual for preview
}

function toRow(m: Milestone, amountReceived = 0): Row {
  return {
    id: m.id,
    number: m.number,
    total: m.total,
    name: m.name,
    percentage: String(m.percentage),
    piStatus: m.piStatus,
    tiStatus: m.tiStatus,
    paymentStatus: m.paymentStatus,
    milestoneStatus: m.milestoneStatus,
    piFileName: m.piFileName,
    tiFileName: m.tiFileName,
    amountReceived,
  }
}

export function MilestonesTab({ project }: { project: Project }) {
  const { milestones, setMilestonesForProject, pis } = useSales()
  const projectMilestones = milestones.filter(m => m.projectId === project.id).sort((a, b) => a.number - b.number)

  const [rows, setRows] = useState<Row[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setRows(projectMilestones.map(m => {
      const pi = pis.find(p => p.milestoneId === m.id)
      const received = pi?.amountReceived ?? 0
      return toRow(m, received)
    }))
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, milestones.length, pis.length])

  function update(idx: number, patch: Partial<Row>) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
    setDirty(true)
  }

  function addRow() {
    const nextNum = rows.length + 1
    setRows(prev => [
      ...prev.map(r => ({ ...r, total: nextNum })),
      {
        id: newId(),
        number: nextNum,
        total: nextNum,
        name: `Milestone ${nextNum}`,
        percentage: '',
        piStatus: 'Not Raised',
        tiStatus: 'Not Created',
        paymentStatus: 'Pending',
        milestoneStatus: 'Not Started',
        amountReceived: 0,
      },
    ])
    setDirty(true)
  }

  function removeRow(idx: number) {
    setRows(prev => prev
      .filter((_, i) => i !== idx)
      .map((r, i) => ({ ...r, number: i + 1, total: prev.length - 1 })))
    setDirty(true)
  }

  function commit() {
    const toSave: Milestone[] = rows.map(r => ({
      id: r.id,
      projectId: project.id,
      number: r.number,
      total: r.total,
      name: r.name,
      percentage: parseFloat(r.percentage) || 0,
      piStatus: r.piStatus,
      tiStatus: r.tiStatus,
      paymentStatus: r.paymentStatus,
      milestoneStatus: r.milestoneStatus,
      piFileName: r.piFileName,
      tiFileName: r.tiFileName,
    }))
    setMilestonesForProject(project.id, toSave)
    setDirty(false)
  }

  const totalPct = useMemo(() => rows.reduce((s, r) => s + (parseFloat(r.percentage) || 0), 0), [rows])
  const pctOff = Math.abs(totalPct - 100) > 0.01

  const totals = useMemo(() => {
    return rows.reduce((acc, r) => {
      const c = calcMilestone(project.totalValue, parseFloat(r.percentage) || 0, project.gstPercent, project.tdsPercent, r.amountReceived)
      acc.base += c.baseAmount
      acc.gst += c.gstAmount
      acc.gross += c.grossAmount
      acc.tds += c.tdsAmount
      acc.expected += c.expectedReceipt
      acc.received += c.amountReceived
      acc.outstanding += c.outstandingBeyondTds
      return acc
    }, { base: 0, gst: 0, gross: 0, tds: 0, expected: 0, received: 0, outstanding: 0 })
  }, [rows, project.totalValue, project.gstPercent, project.tdsPercent])

  return (
    <div className="space-y-3">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Milestones</h3>
          <span className={clsx(
            'text-[11px] font-medium px-2 py-0.5 rounded',
            pctOff ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
          )}>
            Total {totalPct.toFixed(2)}%
          </span>
          {pctOff && (
            <span className="flex items-center gap-1 text-[11px] text-amber-600">
              <AlertTriangle size={11} />
              should equal 100%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addRow} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Plus size={12} />
            Add milestone
          </button>
          {dirty && (
            <button onClick={commit} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
              <Save size={12} />
              Save changes
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-xs" style={{ minWidth: '1300px' }}>
          <thead className="bg-gray-50">
            <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
              <th className="py-2 pl-3 pr-2 font-semibold">#</th>
              <th className="py-2 pr-2 font-semibold">Milestone Name</th>
              <th className="py-2 pr-2 font-semibold text-right">%</th>
              <th className="py-2 pr-2 font-semibold text-right">Base</th>
              <th className="py-2 pr-2 font-semibold text-right">GST</th>
              <th className="py-2 pr-2 font-semibold text-right">Gross</th>
              <th className="py-2 pr-2 font-semibold text-right">TDS</th>
              <th className="py-2 pr-2 font-semibold text-right">Expected</th>
              <th className="py-2 pr-2 font-semibold text-right">Received</th>
              <th className="py-2 pr-2 font-semibold text-right">Outstanding</th>
              <th className="py-2 pr-2 font-semibold">PI</th>
              <th className="py-2 pr-2 font-semibold">TI</th>
              <th className="py-2 pr-2 font-semibold">Payment</th>
              <th className="py-2 pr-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const c = calcMilestone(project.totalValue, parseFloat(r.percentage) || 0, project.gstPercent, project.tdsPercent, r.amountReceived)
              return (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                  <td className="py-2 pl-3 pr-2 text-gray-500">{r.number} of {r.total}</td>
                  <td className="py-1.5 pr-2">
                    <input
                      value={r.name}
                      onChange={e => update(idx, { name: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-right">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={r.percentage}
                      onChange={e => update(idx, { percentage: e.target.value })}
                      className="w-[60px] px-2 py-1 text-xs text-right border border-gray-200 rounded focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                    />
                  </td>
                  <td className="py-2 pr-2 text-right text-gray-900">{fmtINR(c.baseAmount)}</td>
                  <td className="py-2 pr-2 text-right text-violet-700">{fmtINR(c.gstAmount)}</td>
                  <td className="py-2 pr-2 text-right text-gray-900 font-medium">{fmtINR(c.grossAmount)}</td>
                  <td className="py-2 pr-2 text-right text-orange-700">{fmtINR(c.tdsAmount)}</td>
                  <td className="py-2 pr-2 text-right text-indigo-700 font-semibold">{fmtINR(c.expectedReceipt)}</td>
                  <td className="py-2 pr-2 text-right text-emerald-700">{fmtINR(c.amountReceived)}</td>
                  <td className={clsx('py-2 pr-2 text-right font-medium', c.outstandingBeyondTds > 0 ? 'text-red-600' : 'text-gray-300')}>
                    {c.outstandingBeyondTds > 0 ? fmtINR(c.outstandingBeyondTds) : '—'}
                  </td>
                  <td className="py-2 pr-2"><StatusBadge label={r.piStatus} tone={piTone(r.piStatus)} size="xs" /></td>
                  <td className="py-2 pr-2"><StatusBadge label={r.tiStatus} tone={tiTone(r.tiStatus)} size="xs" /></td>
                  <td className="py-2 pr-2"><StatusBadge label={r.paymentStatus} tone={paymentTone(r.paymentStatus)} size="xs" /></td>
                  <td className="py-1.5 pr-3 text-right">
                    <button onClick={() => removeRow(idx)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600" title="Remove">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={14} className="py-8 text-center text-xs text-gray-400">No milestones yet. Click "Add milestone" to start.</td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-[11px]">
                <td className="py-2 pl-3 pr-2 text-gray-700" colSpan={2}>TOTALS</td>
                <td className="py-2 pr-2 text-right text-gray-700">{totalPct.toFixed(2)}%</td>
                <td className="py-2 pr-2 text-right text-gray-900">{fmtINR(totals.base)}</td>
                <td className="py-2 pr-2 text-right text-violet-700">{fmtINR(totals.gst)}</td>
                <td className="py-2 pr-2 text-right text-gray-900">{fmtINR(totals.gross)}</td>
                <td className="py-2 pr-2 text-right text-orange-700">{fmtINR(totals.tds)}</td>
                <td className="py-2 pr-2 text-right text-indigo-700">{fmtINR(totals.expected)}</td>
                <td className="py-2 pr-2 text-right text-emerald-700">{fmtINR(totals.received)}</td>
                <td className={clsx('py-2 pr-2 text-right', totals.outstanding > 0 ? 'text-red-600' : 'text-gray-300')}>
                  {totals.outstanding > 0 ? fmtINR(totals.outstanding) : '—'}
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Per-milestone action chips */}
      <div className="space-y-2">
        {rows.map((r, idx) => (
          <div key={r.id} className="flex items-center gap-2 px-3 py-2 border border-gray-100 rounded-lg bg-gray-50/50">
            <span className="text-[11px] text-gray-500 font-medium min-w-[120px]">{r.name}</span>
            <StatusBadge label={r.milestoneStatus} tone={milestoneStatusTone(r.milestoneStatus)} size="xs" />
            <div className="ml-auto flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => update(idx, { piStatus: 'Sent' })}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] border border-gray-200 rounded bg-white hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
              >
                <FileText size={10} />
                Create PI
              </button>
              <button
                onClick={() => update(idx, { tiStatus: 'Draft' })}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] border border-gray-200 rounded bg-white hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
              >
                <FileText size={10} />
                Create Tax Invoice
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
