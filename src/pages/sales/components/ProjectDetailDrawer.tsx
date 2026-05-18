import { useState } from 'react'
import { X, Briefcase } from 'lucide-react'
import clsx from 'clsx'
import type { Project } from '../../../types/sales'
import { fmtINR } from '../../../utils/currency'
import { useSales } from '../../../contexts/SalesContext'
import { MilestonesTab } from './MilestonesTab'
import { StatusBadge, projectStatusTone } from './StatusBadge'

type Tab = 'overview' | 'milestones' | 'pis' | 'tis' | 'documents'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'milestones', label: 'Milestones / Upcoming Payments' },
  { key: 'pis', label: 'Proforma Invoices' },
  { key: 'tis', label: 'Tax Invoices' },
  { key: 'documents', label: 'Documents' },
]

export function ProjectDetailDrawer({ project, onClose }: {
  project: Project | null
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const { milestones, pis, tis } = useSales()

  if (!project) return null

  const projectMilestones = milestones.filter(m => m.projectId === project.id)
  const projectPIs = pis.filter(p => p.projectId === project.id)
  const projectTIs = tis.filter(t => t.projectId === project.id)

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[900px] bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Briefcase size={15} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{project.name}</h2>
              <p className="text-xs text-gray-400">{project.customerName} · {project.projectType}</p>
            </div>
            <StatusBadge label={project.projectStatus} tone={projectStatusTone(project.projectStatus)} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-5 shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'px-4 py-3 text-xs font-medium border-b-2 transition-colors',
                tab === t.key ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Customer Name" value={project.customerName} />
                <Field label="Project Name" value={project.name} />
                <Field label="Project Type" value={project.projectType} />
                <Field label="Billing Type" value={project.billingType} />
                <Field label="Total Project Value" value={<span className="font-semibold text-gray-900">{fmtINR(project.totalValue)}</span>} />
                <Field label="Status" value={
                  <StatusBadge label={project.projectStatus} tone={projectStatusTone(project.projectStatus)} />
                } />
                <Field label="Start Date" value={project.startDate || '—'} />
                {project.billingType === 'AMC' && <Field label="End Date" value={project.endDate || '—'} />}
                <Field label="GST %" value={`${project.gstPercent}%`} />
                <Field label="TDS %" value={`${project.tdsPercent}%`} />
                {project.billingType === 'AMC' && project.amcFrequency && (
                  <Field label="Billing Frequency" value={project.amcFrequency} />
                )}
              </div>
              {project.notes && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{project.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                <SummaryCard label="Milestones" value={String(projectMilestones.length)} />
                <SummaryCard label="PIs Raised" value={String(projectPIs.length)} />
                <SummaryCard label="Tax Invoices" value={String(projectTIs.length)} />
              </div>
            </div>
          )}

          {tab === 'milestones' && <MilestonesTab project={project} />}

          {tab === 'pis' && <BillingSummary project={project} mode="pis" />}
          {tab === 'tis' && <BillingSummary project={project} mode="tis" />}

          {tab === 'documents' && (
            <DocumentList projectId={project.id} />
          )}
        </div>
      </div>
    </>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  )
}

function BillingSummary({ project, mode }: { project: Project; mode: 'pis' | 'tis' }) {
  const { milestones, pis, tis } = useSales()
  const ms = milestones.filter(m => m.projectId === project.id)
  const projectPIs = pis.filter(p => p.projectId === project.id)
  const projectTIs = tis.filter(t => t.projectId === project.id)

  const totalBilled = projectPIs.reduce((s, p) => s + p.grossAmount, 0)
  const totalReceived = projectPIs.reduce((s, p) => s + p.amountReceived, 0)
  const totalOutstanding = projectPIs.reduce((s, p) => s + p.outstandingBeyondTds, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard label="Project Value" value={fmtINR(project.totalValue)} />
        <SummaryCard label="PI Raised" value={fmtINR(totalBilled)} />
        <SummaryCard label="Received" value={fmtINR(totalReceived)} />
        <SummaryCard label="Outstanding" value={fmtINR(totalOutstanding)} />
      </div>

      <div className={mode === 'pis' ? '' : 'hidden'}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Proforma Invoices ({projectPIs.length})</p>
        {projectPIs.length === 0
          ? <p className="text-xs text-gray-400">No PIs yet.</p>
          : (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="text-left py-2 pl-3">PI #</th>
                    <th className="text-left py-2">Milestone</th>
                    <th className="text-right py-2">Gross</th>
                    <th className="text-right py-2">Received</th>
                    <th className="text-right py-2 pr-3">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {projectPIs.map(p => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="py-2 pl-3 font-mono">{p.piNumber}</td>
                      <td className="py-2 text-gray-600">{p.milestoneLabel || '—'}</td>
                      <td className="py-2 text-right">{fmtINR(p.grossAmount)}</td>
                      <td className="py-2 text-right text-emerald-700">{fmtINR(p.amountReceived)}</td>
                      <td className="py-2 pr-3 text-right text-red-600">{fmtINR(p.outstandingBeyondTds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <div className={mode === 'tis' ? '' : 'hidden'}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tax Invoices ({projectTIs.length})</p>
        {projectTIs.length === 0
          ? <p className="text-xs text-gray-400">No tax invoices yet.</p>
          : (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="text-left py-2 pl-3">TI #</th>
                    <th className="text-left py-2">Linked PI</th>
                    <th className="text-right py-2 pr-3">Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {projectTIs.map(t => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="py-2 pl-3 font-mono">{t.tiNumber}</td>
                      <td className="py-2 text-gray-600 font-mono">{t.linkedPiNumber || '—'}</td>
                      <td className="py-2 pr-3 text-right">{fmtINR(t.grossAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* unused but keep imports lint-quiet */}
      <p className="hidden">{ms.length}</p>
    </div>
  )
}

function DocumentList({ projectId }: { projectId: string }) {
  const { pis, tis, milestones } = useSales()
  const ms = milestones.filter(m => m.projectId === projectId)
  const docs = [
    ...pis.filter(p => p.projectId === projectId && p.fileName).map(p => ({ label: `PI · ${p.piNumber}`, file: p.fileName! })),
    ...tis.filter(t => t.projectId === projectId && t.fileName).map(t => ({ label: `TI · ${t.tiNumber}`, file: t.fileName! })),
    ...ms.filter(m => m.piFileName).map(m => ({ label: `PI · ${m.name}`, file: m.piFileName! })),
    ...ms.filter(m => m.tiFileName).map(m => ({ label: `TI · ${m.name}`, file: m.tiFileName! })),
  ]
  if (docs.length === 0) return <Empty title="No documents" subtitle="Attach PI / TI files to milestones to see them here." />
  return (
    <ul className="space-y-2">
      {docs.map((d, i) => (
        <li key={i} className="flex items-center justify-between px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50/50">
          <span className="text-xs text-gray-700">{d.label}</span>
          <span className="text-xs text-gray-500 font-mono">{d.file}</span>
        </li>
      ))}
    </ul>
  )
}
