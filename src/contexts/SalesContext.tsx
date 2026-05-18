import { createContext, useContext, useState, type ReactNode } from 'react'
import type {
  Project, Milestone, AMC, AMCBillingCycle,
  ProformaInvoice, TaxInvoice,
} from '../types/sales'
import {
  DUMMY_PROJECTS, DUMMY_MILESTONES, DUMMY_AMCS, DUMMY_AMC_CYCLES,
  DUMMY_PIS, DUMMY_TIS,
} from '../data/sales'

type SalesState = {
  projects: Project[]
  milestones: Milestone[]
  amcs: AMC[]
  amcCycles: AMCBillingCycle[]
  pis: ProformaInvoice[]
  tis: TaxInvoice[]

  upsertProject: (p: Project) => void
  deleteProject: (id: string) => void

  upsertMilestone: (m: Milestone) => void
  deleteMilestone: (id: string) => void
  setMilestonesForProject: (projectId: string, milestones: Milestone[]) => void

  upsertAMC: (a: AMC) => void
  deleteAMC: (id: string) => void

  upsertAMCCycle: (c: AMCBillingCycle) => void
  deleteAMCCycle: (id: string) => void

  upsertPI: (pi: ProformaInvoice) => void
  deletePI: (id: string) => void

  upsertTI: (ti: TaxInvoice) => void
  deleteTI: (id: string) => void
}

const SalesContext = createContext<SalesState | null>(null)

export function SalesProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(DUMMY_PROJECTS)
  const [milestones, setMilestones] = useState<Milestone[]>(DUMMY_MILESTONES)
  const [amcs, setAMCs] = useState<AMC[]>(DUMMY_AMCS)
  const [amcCycles, setAMCCycles] = useState<AMCBillingCycle[]>(DUMMY_AMC_CYCLES)
  const [pis, setPIs] = useState<ProformaInvoice[]>(DUMMY_PIS)
  const [tis, setTIs] = useState<TaxInvoice[]>(DUMMY_TIS)

  const upsert = <T extends { id: string }>(arr: T[], item: T) => {
    const idx = arr.findIndex(x => x.id === item.id)
    if (idx === -1) return [...arr, item]
    const next = arr.slice()
    next[idx] = item
    return next
  }

  const value: SalesState = {
    projects, milestones, amcs, amcCycles, pis, tis,

    upsertProject: p => setProjects(prev => upsert(prev, p)),
    deleteProject: id => {
      setProjects(prev => prev.filter(p => p.id !== id))
      setMilestones(prev => prev.filter(m => m.projectId !== id))
    },

    upsertMilestone: m => setMilestones(prev => upsert(prev, m)),
    deleteMilestone: id => setMilestones(prev => prev.filter(m => m.id !== id)),
    setMilestonesForProject: (projectId, newMs) =>
      setMilestones(prev => [...prev.filter(m => m.projectId !== projectId), ...newMs]),

    upsertAMC: a => setAMCs(prev => upsert(prev, a)),
    deleteAMC: id => {
      setAMCs(prev => prev.filter(a => a.id !== id))
      setAMCCycles(prev => prev.filter(c => c.amcId !== id))
    },

    upsertAMCCycle: c => setAMCCycles(prev => upsert(prev, c)),
    deleteAMCCycle: id => setAMCCycles(prev => prev.filter(c => c.id !== id)),

    upsertPI: pi => setPIs(prev => upsert(prev, pi)),
    deletePI: id => setPIs(prev => prev.filter(p => p.id !== id)),

    upsertTI: ti => setTIs(prev => upsert(prev, ti)),
    deleteTI: id => setTIs(prev => prev.filter(t => t.id !== id)),
  }

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>
}

export function useSales() {
  const ctx = useContext(SalesContext)
  if (!ctx) throw new Error('useSales must be used inside <SalesProvider>')
  return ctx
}

export function newId() {
  return Math.random().toString(36).slice(2, 10)
}
