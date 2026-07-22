import { useState, useCallback } from 'react'
import { parseWaitlistCSV, computeStats } from './utils/parseCSV'
import { parseMetaCSV, mergeMetaData } from './utils/parseMetaCSV'
import { autoFillLabels, loadLabels } from './utils/campaignStorage'
import { buildAngleStats } from './utils/parseMetaCSV'
import { generateReport } from './utils/generateReport'
import Overview from './tabs/Overview'
import Sources from './tabs/Sources'
import Geography from './tabs/Geography'
import Survey from './tabs/Survey'
import People from './tabs/People'
import Ads from './tabs/Ads'
import { Upload, BarChart2, Globe, TrendingUp, Users, ClipboardList, Megaphone, X, CheckCircle, FileDown } from 'lucide-react'

const CHART_COLORS = ['#6366f1', '#22d3ee', '#a3e635', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']

function UploadZone({ label, sublabel, fileName, onFile, accept = '.csv', onClear, small }) {
  const [dragging, setDragging] = useState(false)
  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) onFile(f)
  }, [onFile])
  if (small) {
    return (
      <label className="cursor-pointer flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition-colors">
        <Upload size={12} />
        {fileName ? `Re-upload: ${label}` : label}
        <input type="file" accept={accept} className="hidden" onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      </label>
    )
  }
  return (
    <label
      onDrop={onDrop}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      className={`relative cursor-pointer flex flex-col items-center gap-3 border-2 border-dashed rounded-xl p-7 transition-all
        ${fileName ? 'border-green-500/40 bg-green-500/5' : dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}
    >
      {fileName ? (
        <>
          <CheckCircle size={26} className="text-green-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-green-300">{label}</p>
            <p className="text-xs text-white/40 mt-0.5 truncate max-w-[200px]">{fileName}</p>
          </div>
          <button type="button" onClick={e => { e.preventDefault(); onClear() }}
            className="absolute top-2 right-2 text-white/20 hover:text-white/60 transition-colors">
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <Upload size={22} className="text-white/30" />
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
  const [waitlist,   setWaitlist]   = useState(null)
  const [metaAds,    setMetaAds]    = useState(null)   // alleMETADATA (demographics + IDs)
  const [campagnes,  setCampagnes]  = useState(null)   // Campagnes CSV (clicks + CPC + CTR)
  const [tab,        setTab]        = useState(null)
  const [errors,     setErrors]     = useState({})
  const [loading,    setLoading]    = useState({})

  async function handleWaitlist(file) {
    setLoading(l => ({ ...l, waitlist: true }))
    setErrors(e => ({ ...e, waitlist: null }))
    try {
      const rows  = await parseWaitlistCSV(file)
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
      if (result.format === 'alleMETADATA') {
        autoFillLabels(result.campaigns)
        setMetaAds({ ...result, fileName: file.name })
      } else {
        // Old Campagnes format uploaded into main meta slot — treat as campagnes
        setCampagnes({ ...result, fileName: file.name })
      }
      setTab(t => t || 'ads')
    } catch (e) {
      setErrors(er => ({ ...er, meta: e.message || String(e) }))
    } finally { setLoading(l => ({ ...l, meta: false })) }
  }

  async function handleCampagnes(file) {
    setLoading(l => ({ ...l, campagnes: true }))
    setErrors(e => ({ ...e, campagnes: null }))
    try {
      const result = await parseMetaCSV(file)
      setCampagnes({ ...result, fileName: file.name })
    } catch (e) {
      setErrors(er => ({ ...er, campagnes: e.message || String(e) }))
    } finally { setLoading(l => ({ ...l, campagnes: false })) }
  }

  // Merged meta: alleMETADATA + Campagnes click data
  const mergedMeta = metaAds ? mergeMetaData(metaAds, campagnes) : campagnes || null

  const hasWaitlist = !!waitlist
  const hasMeta     = !!mergedMeta

  function handleDownloadReport() {
    const labels = loadLabels()
    const signupsByCampaign = {}
    if (waitlist) {
      waitlist.rows.forEach(r => {
        if (r.trafficType !== 'paid' || !r.campaignId) return
        signupsByCampaign[r.campaignId] = (signupsByCampaign[r.campaignId] || 0) + 1
      })
    }
    const angleStats = mergedMeta
      ? buildAngleStats(mergedMeta.campaigns, labels, signupsByCampaign)
      : []

    generateReport({
      waitlist,
      meta: mergedMeta,
      angleStats,
      signupsByCampaign,
      labels,
      date: new Date().toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' }),
    })
  }

  const TABS = [
    { id: 'overview', label: 'Overview',      icon: TrendingUp,    show: hasWaitlist },
    { id: 'ads',      label: 'Ad Performance', icon: Megaphone,    show: hasMeta },
    { id: 'sources',  label: 'Sources',        icon: BarChart2,    show: hasWaitlist },
    { id: 'geo',      label: 'Geography',      icon: Globe,        show: hasWaitlist },
    { id: 'survey',   label: 'Survey',         icon: ClipboardList, show: hasWaitlist },
    { id: 'people',   label: 'People',         icon: Users,        show: hasWaitlist },
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
          <UploadZone small label="Waitlist" fileName={waitlist?.fileName} onFile={handleWaitlist} onClear={() => setWaitlist(null)} />
          <UploadZone small label="Meta Metadata (alleMETADATA)" fileName={metaAds?.fileName} onFile={handleMeta} onClear={() => setMetaAds(null)} />
          <UploadZone small label="Meta Performance (Campagnes)" fileName={campagnes?.fileName} onFile={handleCampagnes} onClear={() => setCampagnes(null)} />
          {waitlist && <span className="text-xs text-white/20">{waitlist.stats.total} signups</span>}
          {mergedMeta && <span className="text-xs text-white/20">€{mergedMeta.totals.spend.toFixed(0)} spend</span>}
          {showDashboard && (
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-indigo-500/30 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
            >
              <FileDown size={12} />
              Download Report
            </button>
          )}
        </div>
      </header>

      {!showDashboard ? (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-6">
          <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-sm font-bold mb-6">N</div>
          <h1 className="text-xl font-semibold mb-1">NIXUS Marketing Dashboard</h1>
          <p className="text-white/40 text-sm mb-8">Upload your data files to get started</p>
          <div className="grid md:grid-cols-3 gap-4 w-full max-w-2xl">
            <div>
              <UploadZone
                label="Waitlist Export"
                sublabel="CSV from nixussports.com"
                fileName={waitlist?.fileName}
                onFile={handleWaitlist}
                onClear={() => setWaitlist(null)}
              />
              {loading.waitlist && <p className="text-xs text-white/30 text-center mt-2">Parsing…</p>}
              {errors.waitlist && <p className="text-xs text-red-400 text-center mt-2">{errors.waitlist}</p>}
            </div>
            <div>
              <UploadZone
                label="Meta Metadata"
                sublabel="alleMETADATA.csv — demographics + IDs"
                fileName={metaAds?.fileName}
                onFile={handleMeta}
                onClear={() => setMetaAds(null)}
              />
              {loading.meta && <p className="text-xs text-white/30 text-center mt-2">Parsing…</p>}
              {errors.meta && <p className="text-xs text-red-400 text-center mt-2">{errors.meta}</p>}
            </div>
            <div>
              <UploadZone
                label="Meta Performance"
                sublabel="Campagnes CSV — clicks, CPC, CTR"
                fileName={campagnes?.fileName}
                onFile={handleCampagnes}
                onClear={() => setCampagnes(null)}
              />
              {loading.campagnes && <p className="text-xs text-white/30 text-center mt-2">Parsing…</p>}
              {errors.campagnes && <p className="text-xs text-red-400 text-center mt-2">{errors.campagnes}</p>}
            </div>
          </div>
          <p className="text-xs text-white/20 mt-6">You can upload one file or all three — each unlocks more insights</p>
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

          <div className="p-6 max-w-7xl mx-auto">
            {activeTab === 'overview' && waitlist  && <Overview stats={waitlist.stats} metaAds={mergedMeta} colors={CHART_COLORS} />}
            {activeTab === 'ads'      && mergedMeta && <Ads meta={mergedMeta} waitlist={waitlist} />}
            {activeTab === 'sources'  && waitlist  && <Sources stats={waitlist.stats} metaAds={mergedMeta} colors={CHART_COLORS} />}
            {activeTab === 'geo'      && waitlist  && <Geography stats={waitlist.stats} colors={CHART_COLORS} />}
            {activeTab === 'survey'   && waitlist  && <Survey stats={waitlist.stats} colors={CHART_COLORS} />}
            {activeTab === 'people'   && waitlist  && <People rows={waitlist.rows} />}
          </div>
        </div>
      )}
    </div>
  )
}
