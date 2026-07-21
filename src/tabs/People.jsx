import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'

const SOURCE_COLORS = {
  'Instagram Paid': 'bg-pink-500/20 text-pink-300',
  'Instagram Organic': 'bg-orange-500/20 text-orange-300',
  'Google': 'bg-blue-500/20 text-blue-300',
  'LinkedIn': 'bg-sky-500/20 text-sky-300',
  'Facebook': 'bg-indigo-500/20 text-indigo-300',
  'Direct / Type-in': 'bg-white/10 text-white/50',
}

function Badge({ label }) {
  const cls = SOURCE_COLORS[label] || 'bg-white/10 text-white/50'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
  )
}

export default function People({ rows }) {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('All')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const sources = useMemo(() => {
    const s = new Set(rows.map(r => r.source))
    return ['All', ...Array.from(s).sort()]
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return rows.filter(r => {
      if (source !== 'All' && r.source !== source) return false
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        r.lang.toLowerCase().includes(q)
      )
    })
  }, [rows, query, source])

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search name or email…"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(0) }}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={source}
          onChange={e => { setSource(e.target.value); setPage(0) }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          {sources.map(s => <option key={s} value={s} className="bg-[#1a1a24]">{s}</option>)}
        </select>
        <span className="text-sm text-white/30 flex items-center">{filtered.length} results</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">#</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Signed up</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Source</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Lang</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Device</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Survey</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white/20">{page * PAGE_SIZE + i + 1}</td>
                <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                <td className="px-4 py-3 text-white/50">{r.email}</td>
                <td className="px-4 py-3 text-white/50">
                  {r.signupAt ? r.signupAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                </td>
                <td className="px-4 py-3"><Badge label={r.source} /></td>
                <td className="px-4 py-3 text-white/70">{r.langFlag} {r.langName}</td>
                <td className="px-4 py-3 text-white/50">{r.device}</td>
                <td className="px-4 py-3">
                  {r.surveySubmitted
                    ? <span className="text-xs text-green-400">{r.cansPerMonth ?? '?'} cans · {r.ballsPerYear ?? '?'} balls</span>
                    : <span className="text-xs text-white/20">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/30 disabled:opacity-30 transition-colors"
          >
            Previous
          </button>
          <span className="text-white/30">Page {page + 1} of {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/30 disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
