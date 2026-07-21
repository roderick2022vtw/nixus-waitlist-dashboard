import { useState, useCallback } from 'react'
import { parseWaitlistCSV, computeStats } from './utils/parseCSV'
import Overview from './tabs/Overview'
import Sources from './tabs/Sources'
import Geography from './tabs/Geography'
import Survey from './tabs/Survey'
import People from './tabs/People'
import { Upload, BarChart2, Globe, TrendingUp, Users, ClipboardList } from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'sources', label: 'Sources', icon: BarChart2 },
  { id: 'geography', label: 'Geography', icon: Globe },
  { id: 'survey', label: 'Survey', icon: ClipboardList },
  { id: 'people', label: 'People', icon: Users },
]

const CHART_COLORS = ['#6366f1', '#22d3ee', '#a3e635', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']

export default function App() {
  const [rows, setRows] = useState(null)
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('overview')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState(null)

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const parsed = await parseWaitlistCSV(file)
      const computed = computeStats(parsed)
      setRows(parsed)
      setStats(computed)
      setFileName(file.name)
      setTab('overview')
    } catch (e) {
      setError('Failed to parse CSV: ' + (e.message || e))
    } finally {
      setLoading(false)
    }
  }

  const onDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const onDragOver = useCallback(e => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])
  const onInputChange = e => { if (e.target.files[0]) handleFile(e.target.files[0]) }

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-sm font-bold">N</div>
          <span className="font-semibold text-white tracking-tight">NIXUS Waitlist Dashboard</span>
          {stats && (
            <span className="text-xs text-white/30 ml-2">{stats.total} signups</span>
          )}
        </div>
        <label className="cursor-pointer flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30">
          <Upload size={14} />
          {fileName ? 'Re-upload CSV' : 'Upload CSV'}
          <input type="file" accept=".csv" className="hidden" onChange={onInputChange} />
        </label>
      </header>

      {!stats ? (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] px-6">
          <label
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`cursor-pointer flex flex-col items-center gap-4 w-full max-w-md border-2 border-dashed rounded-2xl p-12 transition-all
              ${dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
              <Upload size={24} className="text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-white mb-1">Drop your Waitlist CSV here</p>
              <p className="text-sm text-white/40">or click to browse — exported from nixussports.com</p>
            </div>
            <input type="file" accept=".csv" className="hidden" onChange={onInputChange} />
          </label>
          {loading && <p className="mt-6 text-white/50 text-sm">Parsing…</p>}
          {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
        </div>
      ) : (
        <div>
          <div className="border-b border-white/10 px-6">
            <nav className="flex gap-1">
              {TABS.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                      ${tab === t.id
                        ? 'border-indigo-500 text-white'
                        : 'border-transparent text-white/40 hover:text-white/70'}`}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                )
              })}
            </nav>
          </div>
          <div className="p-6 max-w-7xl mx-auto">
            {tab === 'overview' && <Overview stats={stats} colors={CHART_COLORS} />}
            {tab === 'sources' && <Sources stats={stats} colors={CHART_COLORS} />}
            {tab === 'geography' && <Geography stats={stats} colors={CHART_COLORS} />}
            {tab === 'survey' && <Survey stats={stats} colors={CHART_COLORS} />}
            {tab === 'people' && <People rows={rows} />}
          </div>
        </div>
      )}
    </div>
  )
}
