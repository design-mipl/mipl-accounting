// Indian rupee formatting helpers.
// fmt(150000) => "₹1,50,000"
// fmt(1500000) => "₹15,00,000"

export function fmtINR(n: number, opts: { withSymbol?: boolean; maxDigits?: number } = {}) {
  const { withSymbol = true, maxDigits = 2 } = opts
  const s = n.toLocaleString('en-IN', { maximumFractionDigits: maxDigits })
  return withSymbol ? `₹${s}` : s
}

export function fmtCompactINR(n: number) {
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  return fmtINR(n)
}
