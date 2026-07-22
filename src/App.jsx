import { useState, useCallback } from 'react'
import { parseWaitlistCSV, computeStats } from './utils/parseCSV'
import { parseMetaCSV } from './utils/parseMetaCSV'
import { autoFillLabels } from './utils/campaignStorage'
import Overview from './tabs/Overview'
import Sources from './tabs/Sources'
import Geography from './tabs/Geography'
import Survey from './tabs/Survey'
import People from './tabs/People'
import Ads from './tabs/Ads'
import { Upload, BarChart2, Globe, TrendingUp, Users, ClipboardList, Megaphone, X, CheckCircle } from 'lucide-react'

const CHART_COLORS = ['#6366f1', '#22d3ee', '#a3e635', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']

function UploadZone({ label, sublabel, fileName, onFile, accept = '.csv', onClear }) {
  const [dragging, setDragging] = useState(false)
  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) onFile(f)
  }, [onFile])
  return (
    <label
      onDrop={onDrop}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      className={`relative cursor-pointer flex flex-col items-center gap-3 border-2 border-dashed rounded-xl p-8 transition-all
        ${fileName ? 'border-green-500/40 bg-green-500/5' : dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}
    >
      {fileName ? (
        <>
          <CheckCircle size={28} className="text-green-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-green-300">{label}</p>
            <p className="text-xs text-white/40 mt-0.5 truncate max-w-[200px]">{fileName}</p>
          </div>
          <button
            type="button"
            onClick={e => { e.preventDefault(); onClear() }}
            className="absolute top-2 right-2 text-white/20 hover:text-white/60 transition-colors"
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <Upload size={24} className="text-white/30" />
          <div className="text-center">
            <p className="text-sm font-medium text-white">{label}</p>
            <p className="text-xs text-white/30 mt-0.5">{sublabel}</p>
          </div>
        </>
      )}
      <input type="file" accept={accept} className="hidden" onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]) }} />
    </label>
  )
}

export default function App() {
  const [waitlist, setWaitlist]   = useState(null)  // { rows, stats, fileName }
  const [metaAds, setMetaAds]     = useState(null)  // { rows, byAngle, totals, fileName }
  const [tab, setTab]             = useState(null)
  const [errors, setErrors]       = useState({})
  const [loading, setLoading]     = useState({})

  async function handleWaitlist(file) {
    setLoading(l => ({ ...l, waitlist: true }))
    setErrors(e => ({ ...e, waitlist: null }))
    try {
      const rows = await parseWaitlistCSV(file)
      const stats = computeStats(rows)
      setWaitlist({ rows, stats, fileName: file.name })
      setTab(t => t || 'overview')
    } catch (e) {
      setErrors(er => ({ ...er, waitlist: e.message || String(e) }))
    } finally { setLoading(l => ({ ...l, waitlist: false })) }
  }

  async function handleMeta(file) {
    setLoading(l => ({ ...l, meta: true }))
    setErrors(e => ({ ...e, meta: null }))
    try {
      const result = await parseMetaCSV(file)
      autoFillLabels(result.campaigns)
      setMetaAds({ ...result, fileName: file.name })
      setTab(t => t || 'ads')
    } catch (e) {
      setErrors(er => ({ ...er, meta: e.message || String(e) }))
    } finally { setLoading(l => ({ ...l, meta: false })) }
  }

  const hasWaitlist = !!waitlist
  const hasMeta     = !!metaAds

  const TABS = [
    { id: 'overview', label: 'Overview',  icon: TrendingUp,   show: hasWaitlist },
    { id: 'ads',      label: 'Ad Performance', icon: Megaphone, show: hasMeta },
    { id: 'sources',  label: 'Sources',   icon: BarChart2,    show: hasWaitlist },
    { id: 'geo',      label: 'Geography', icon: Globe,        show: hasWaitlist },
    { id: 'survey',   label: 'Survey',    icon: ClipboardList, show: hasWaitlist },
    { id: 'people',   label: 'People',    icon: Users,        show: hasWaitlist },
  ].filter(t => t.show)

  const showDashboard = hasWaitlist || hasMeta
  const activeTab = tab && TABS.find(t => t.id === tab) ? tab : TABS[0]?.id

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-xs font-bold">N</div>
          <span className="font-semibold tracking-tight">NIXUS Marketing Dashboard</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="cursor-pointer flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition-colors">
            <Upload size={12} />
            {waitlist ? 'Re-upload waitlist' : 'Waitlist CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && handleWaitlist(e.target.files[0])} />
          </label>
          <label className="cursor-pointer flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition-colors">
            <Upload size={12} />
            {metaAds ? 'Re-upload Meta ads' : 'Meta Ads CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && handleMeta(e.target.files[0])} />
          </label>
          {waitlist && <span className="text-xs text-white/20">{waitlist.stats.total} signups</span>}
          {metaAds && <span className="text-xs text-white/20">€{metaAds.totals.spend.toFixed(0)} spend</span>}
        </div>
      </header>

      {!showDashboard ? (
        /* Upload screen */
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-6">
          <p className="text-white/40 text-sm mb-8">Upload one or both files to get started</p>
          <div className="grid md:grid-cols-2 gap-4 w-full max-w-xl">
            <div>
              <UploadZone
                label="Waitlist CSV"
                sublabel="Export from nixussports.com"
                fileName={waitlist?.fileName}
                onFile={handleWaitlist}
                onClear={() => setWaitlist(null)}
              />
              {loading.waitlist && <p className="text-xs text-white/30 text-center mt-2">Parsing…</p>}
              {errors.waitlist && <p className="text-xs text-red-400 text-center mt-2">{errors.waitlist}</p>}
            </div>
            <div>
              <UploadZone
                label="Meta Ads CSV"
                sublabel="Export from Meta Ads Manager"
                fileName={metaAds?.fileName}
                onFile={handleMeta}
                onClear={() => setMetaAds(null)}
              />
              {loading.meta && <p className="text-xs text-white/30 text-center mt-2">Parsing…</p>}
              {errors.meta && <p className="text-xs text-red-400 text-center mt-2">{errors.meta}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Tabs */}
          <div className="border-b border-white/10 px-6">
            <nav className="flex gap-1 overflow-x-auto">
              {TABS.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                      ${activeTab === t.id ? 'border-indigo-500 text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}
                  >
                    <Icon size={13} />{t.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Upload banners if one file is missing */}
          {showDashboard && (!hasWaitlist || !hasMeta) && (
            <div className="mx-6 mt-4">
              {!hasWaitlist && (
                <label className="cursor-pointer flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-4 py-2.5 hover:bg-indigo-500/20 transition-colors">
                  <Upload size={13} />
                  Also upload Waitlist CSV to unlock signups, geography, survey, and people tabs
                  <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && handleWaitlist(e.target.files[0])} />
                </label>
              )}
              {!hasMeta && (
                <label className="cursor-pointer flex items-center gap-2 text-xs text-pink-300 bg-pink-500/10 border border-pink-500/20 rounded-lg px-4 py-2.5 hover:bg-pink-500/20 transition-colors">
                  <Upload size={13} />
                  Also upload Meta Ads CSV to unlock ad spend, CPC, CTR, and angle ROI
                  <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && handleMeta(e.target.files[0])} />
                </label>
              )}
            </div>
          )}

          <div className="p-6 max-w-7xl mx-auto">
            {activeTab === 'overview' && waitlist && <Overview stats={waitlist.stats} metaAds={metaAds} colors={CHART_COLORS} />}
            {activeTab === 'ads'      && metaAds  && <Ads meta={metaAds} waitlist={waitlist} />}
            {activeTab === 'sources'  && waitlist  && <Sources stats={waitlist.stats} metaAds={metaAds} colors={CHART_COLORS} />}
            {activeTab === 'geo'      && waitlist  && <Geography stats={waitlist.stats} colors={CHART_COLORS} />}
            {activeTab === 'survey'   && waitlist  && <Survey stats={waitlist.stats} colors={CHART_COLORS} />}
            {activeTab === 'people'   && waitlist  && <People rows={waitlist.rows} />}
          </div>
        </div>
      )}
    </div>
  )
}
