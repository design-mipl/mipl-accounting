type Summary = {
  totalBase: number
  totalGst: number
  totalDeduction: number
  totalNet: number
  totalPaid: number
  totalBalance: number
}

const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function SummaryCards({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 border-l-[3px] border-l-slate-400">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Base Amount</p>
        <p className="text-lg font-bold text-gray-900">₹{fmt(summary.totalBase)}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 border-l-[3px] border-l-violet-400">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Total GST</p>
        <p className="text-lg font-bold text-gray-900">₹{fmt(summary.totalGst)}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 border-l-[3px] border-l-orange-400">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Total TDS/PT Deduction</p>
        <p className="text-lg font-bold text-gray-900">₹{fmt(summary.totalDeduction)}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 border-l-[3px] border-l-indigo-500">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Net Payable</p>
        <p className="text-lg font-bold text-indigo-700">₹{fmt(summary.totalNet)}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 border-l-[3px] border-l-emerald-500">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Paid</p>
        <p className="text-lg font-bold text-emerald-700">₹{fmt(summary.totalPaid)}</p>
      </div>
      <div className={`bg-white border border-gray-200 rounded-xl p-3.5 border-l-[3px] ${summary.totalBalance > 0 ? 'border-l-red-400' : 'border-l-gray-300'}`}>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Balance</p>
        <p className={`text-lg font-bold ${summary.totalBalance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          ₹{fmt(summary.totalBalance)}
        </p>
      </div>
    </div>
  )
}
