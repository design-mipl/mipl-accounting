import clsx from 'clsx'

type Tone = 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'indigo' | 'violet'

const toneCls: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
}

export function StatusBadge({ label, tone = 'gray', size = 'sm' }: {
  label: string
  tone?: Tone
  size?: 'sm' | 'xs'
}) {
  return (
    <span className={clsx(
      'inline-flex items-center rounded border whitespace-nowrap font-medium',
      toneCls[tone],
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]',
    )}>
      {label}
    </span>
  )
}

// ── PI status → tone
export function piTone(s: string): Tone {
  switch (s) {
    case 'Not Raised': return 'gray'
    case 'Draft': return 'amber'
    case 'Sent': return 'blue'
    case 'Uploaded': return 'green'
    case 'Cancelled': return 'red'
    case 'Payment Pending': return 'amber'
    case 'Partially Paid': return 'amber'
    case 'Payment Matched': return 'green'
    case 'Shortfall': return 'red'
    default: return 'gray'
  }
}

export function tiTone(s: string): Tone {
  switch (s) {
    case 'Not Created': return 'gray'
    case 'Draft': return 'amber'
    case 'Sent': return 'blue'
    case 'Uploaded': return 'green'
    case 'Cancelled': return 'red'
    case 'Payment Matched': return 'green'
    case 'Shortfall': return 'red'
    default: return 'gray'
  }
}

export function paymentTone(s: string): Tone {
  switch (s) {
    case 'Pending': return 'gray'
    case 'Partial': return 'amber'
    case 'Matched': return 'green'
    case 'Shortfall': return 'red'
    case 'Excess Received': return 'violet'
    default: return 'gray'
  }
}

export function projectStatusTone(s: string): Tone {
  switch (s) {
    case 'Upcoming': return 'blue'
    case 'Active': return 'indigo'
    case 'On Hold': return 'amber'
    case 'Completed': return 'green'
    case 'Cancelled': return 'red'
    default: return 'gray'
  }
}

export function amcStatusTone(s: string): Tone {
  switch (s) {
    case 'Active': return 'green'
    case 'Expired': return 'gray'
    case 'On Hold': return 'amber'
    case 'Cancelled': return 'red'
    default: return 'gray'
  }
}

export function milestoneStatusTone(s: string): Tone {
  switch (s) {
    case 'Closed': return 'green'
    case 'Payment Matched': return 'green'
    case 'Payment Shortfall': return 'red'
    case 'Tax Invoice Uploaded': return 'indigo'
    case 'PI Uploaded': return 'indigo'
    case 'PI Pending': return 'amber'
    case 'Payment Pending': return 'amber'
    case 'Payment Partially Received': return 'amber'
    case 'Not Started': return 'gray'
    default: return 'gray'
  }
}
