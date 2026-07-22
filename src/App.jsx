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

// Accept multiple files and auto-detect format for each
function MetaUploadZone({ metaAds, campagnes, onFiles, onClearMeta, onClearCampagnes, small }) {
  const [dragging, setDragging] = useState(false)

  async function processFiles(files) {
    for (const f of Array.from(files)) onFiles(f)
  }

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    processFiles(e.dataTransfer.files)
  }, [onFiles])

  const loaded = [metaAds && 'demographics', campagnes && 'performance'].filter(Boolean)

  if (small) {
    return (
      <label className="cursor-pointer flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition-colors">
        <Upload size={12} />
        {loaded.length ? `Meta CSV (${loaded.join(' + ')})` : 'Meta Ads CSV'}
        <input type="file" accept=".csv" multiple className="hidden"
          onChange={e => { if (e.target.files.length) processFiles(e.target.files) }} />
      </label>
    )
  }

  return (
    <label
      onDrop={onDrop}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      className={`relative cursor-pointer flex flex-col items-center gap-3 border-2 border-dashed rounded-xl p-7 transition-all
        ${loaded.length ? 'border-green-500/40 bg-green-500/5' : dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}
    >
      {loaded.length > 0 ? (
        <>
          <CheckCircle size={26} className="text-green-400" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-green-300">Meta Ads CSV</p>
            {metaAds && (
              <div className="flex items-center gap-1 justify-center">
                <p className="text-xs text-white/40 truncate max-w-[180px]">{metaAds.fileName}</p>
                <button type="button" onClick={e => { e.preventDefault(); onClearMeta() }} className="text-white/20 hover:text-white/60">
                  <X size={11} />
                </button>
              </div>
            )}
            {campagnes && (
              <div className="flex items-center gap-1 justify-center">
                <p className="text-xs text-white/40 truncate max-w-[180px]">{campagnes.fileName}</p>
                <button type="button" onClick={e => { e.preventDefault(); onClearCampagnes() }} className="text-white/20 hover:text-white/60">
                  <X size={11} />
                </button>
              </div>
            )}
            {loaded.length < 2 && (
              <p className="text-xs text-indigo-400 mt-1">Drop 2nd file to add {loaded.includes('demographics') ? 'CPC/CTR' : 'demographics'}</p>
            )}
          </div>
        </>
      ) : (
        <>
          <Upload size={22} className="text-white/30" />
          <div className="text-center">
            <p className="text-sm font-medium text-white">Meta Ads CSV</p>
            <p className="text-xs text-white/30 mt-0.5">Export from Meta Ads Manager</p>
            <p className="text-xs text-white/20 mt-1">Drop 1 or 2 files — format auto-detected</p>
          </div>
        </>
      )}
      <input type="file" accept=".csv" multiple className="hidden"
        onChange={e => { if (e.target.files.length) processFiles(e.target.files) }} />
    </label>
  )
}

function UploadZone({ label, sublabel, fileName, onFile, onClear, small }) {
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
        <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
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
      <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]) }} />
    </label>
  )
}

export default function App() {
  const [waitlist,  setWaitlist]  = useState(null)
  const [metaAds,   setMetaAds]   = useState(null)   // alleMETADATA (demographics + IDs)
  const [campagnes, setCampagnes] = useState(null)   // Campagnes CSV (clicks + CPC + CTR)
  const [tab,       setTab]       = useState(null)
  const [errors,    setErrors]    = useState({})
  const [loading,   setLoading]   = useState({})

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

  // Single handler for any Meta CSV — auto-detects format
  async function handleMetaFile(file) {
    setLoading(l => ({ ...l, meta: true }))
    setErrors(e => ({ ...e, meta: null }))
    try {
      const result = await parseMetaCSV(file)
      if (result.format === 'alleMETADATA') {
        autoFillLabels(result.campaigns)
        setMetaAds({ ...result, fileName: file.name })
      } else {
        setCampagnes({ ...result, fileName: file.name })
      }
      setTab(t => t || 'ads')
    } catch (e) {
      setErrors(er => ({ ...er, meta: e.message || String(e) }))
    } finally { setLoading(l => ({ ...l, meta: false })) }
  }

  // Merged meta: alleMETADATA + Campagnes click data joined by campaign name
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
    { id: 'overview', label: 'Overview',       icon: TrendingUp,    show: hasWaitlist },
    { id: 'ads',      label: 'Ad Performance', icon: Megaphone,     show: hasMeta },
    { id: 'sources',  label: 'Sources',        icon: BarChart2,     show: hasWaitlist },
    { id: 'geo',      label: 'Geography',      icon: Globe,         show: hasWaitlist },
    { id: 'survey',   label: 'Survey',         icon: ClipboardList, show: hasWaitlist },
    { id: 'people',   label: 'People',         icon: Users,         show: hasWaitlist },
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
          <UploadZone small label="Waitlist CSV" fileName={waitlist?.fileName} onFile={handleWaitlist} onClear={() => setWaitlist(null)} />
          <MetaUploadZone small
            metaAds={metaAds} campagnes={campagnes}
            onFiles={handleMetaFile}
            onClearMeta={() => setMetaAds(null)}
            onClearCampagnes={() => setCampagnes(null)}
          />
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
          <p className="text-white/40 text-sm mb-8">Upload your data to get started</p>
          <div className="grid md:grid-cols-2 gap-4 w-full max-w-xl">
            <div>
              <UploadZone
                label="Waitlist Export"
                sublabel="CSV from nixussports.com"
                fileName={waitlist?.fileName}
                onFile={handleWaitlist}
                onClear={() => setWaitlist(null)}
              />
              {loading.waitlist && <p className="text-xs text-white/30 text-center mt-2">Parsing…</p>}
              {errors.waitlist  && <p className="text-xs text-red-400 text-center mt-2">{errors.waitlist}</p>}
            </div>
            <div>
              <MetaUploadZone
                metaAds={metaAds} campagnes={campagnes}
                onFiles={handleMetaFile}
                onClearMeta={() => setMetaAds(null)}
                onClearCampagnes={() => setCampagnes(null)}
              />
              {loading.meta && <p className="text-xs text-white/30 text-center mt-2">Parsing…</p>}
              {errors.meta  && <p className="text-xs text-red-400 text-center mt-2">{errors.meta}</p>}
            </div>
          </div>
          <p className="text-xs text-white/20 mt-5">
            Meta slot accepts up to 2 files (alleMETADATA + Campagnes) — format auto-detected
          </p>
        </div>
      ) : (
        <div>
          <div className="border-b border-white/10 px-6">
            <nav className="flex gap-1 overflow-x-auto">
              {TABS.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
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
            {activeTab === 'overview' && waitlist   && <Overview stats={waitlist.stats} metaAds={mergedMeta} colors={CHART_COLORS} />}
            {activeTab === 'ads'      && mergedMeta && <Ads meta={mergedMeta} waitlist={waitlist} />}
            {activeTab === 'sources'  && waitlist   && <Sources stats={waitlist.stats} metaAds={mergedMeta} colors={CHART_COLORS} />}
            {activeTab === 'geo'      && waitlist   && <Geography stats={waitlist.stats} colors={CHART_COLORS} />}
            {activeTab === 'survey'   && waitlist   && <Survey stats={waitlist.stats} colors={CHART_COLORS} />}
            {activeTab === 'people'   && waitlist   && <People rows={waitlist.rows} />}
          </div>
        </div>
      )}
    </div>
  )
}
