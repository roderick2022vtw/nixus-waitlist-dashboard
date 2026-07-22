import { useState, useEffect, useMemo, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import { loadLabels, saveLabel, ANGLES, ANGLE_COLORS } from '../utils/campaignStorage'
import { buildAngleStats } from '../utils/parseMetaCSV'
import { Edit2, Download, Upload, Info } from 'lucide-react'

const fmt = {
  eur:  v => `€${Number(v).toFixed(2)}`,
  eur0: v => `€${Number(v).toFixed(0)}`,
  pct:  v => `${Number(v).toFixed(1)}%`,
  k:    v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)),
}

function KPI({ label, value, sub, color, highlight, tooltip }) {
  return (
    <div className={`border rounded-xl p-4 relative ${highlight ? 'border-pink-500/30 bg-pink-500/10' : 'border-white/10 bg-white/5'}`}
      title={tooltip}>
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1">
        {label}
        {tooltip && <Info size={10} className="text-white/20" />}
      </p>
      <p className="text-2xl font-bold" style={{ color: color || 'white' }}>{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  )
}

const Tip = ({ active, payload, label, fmtFn }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm space-y-1">
      <p className="text-white font-medium capitalize">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.fill || 'white' }}>
          {p.name}: {fmtFn ? fmtFn(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

const RADIAN = Math.PI / 180
const renderPct = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  return (
    <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)}
      fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {Math.round(percent * 100)}%
    </text>
  )
}

function FunnelStage({ value, label, rate, rateLabel, color }) {
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-center">
        <p className="text-2xl font-bold" style={{ color: color || 'white' }}>{fmt.k(value)}</p>
        <p className="text-xs text-white/40 mt-1">{label}</p>
        {rate != null && (
          <p className="text-xs text-indigo-400 mt-2 font-medium">→ {fmt.pct(rate)} {rateLabel}</p>
        )}
      </div>
    </div>
  )
}

export default function Ads({ meta, waitlist }) {
  const [labels, setLabels] = useState({})
  const [editingId, setEditingId] = useState(null)
  const importRef = useRef()

  useEffect(() => { setLabels(loadLabels()) }, [meta])

  function handleLabel(id, value) {
    saveLabel(id, value)
    setLabels(loadLabels())
    setEditingId(null)
  }

  // ── Label export / import ───────────────────────────────────────────────────
  function exportLabels() {
    const data = JSON.stringify(loadLabels(), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nixus-angle-labels.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function importLabels(file) {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target.result)
        const existing = loadLabels()
        const merged = { ...existing, ...imported }
        localStorage.setItem('nixus_campaign_labels', JSON.stringify(merged))
        setLabels(loadLabels())
      } catch {
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  // ── Computed values ─────────────────────────────────────────────────────────
  const signupsByCampaign = useMemo(() => {
    if (!waitlist) return {}
    const map = {}
    waitlist.rows.forEach(r => {
      if (r.trafficType !== 'paid' || !r.campaignId) return
      map[r.campaignId] = (map[r.campaignId] || 0) + 1
    })
    return map
  }, [waitlist])

  const angleStats = useMemo(() =>
    buildAngleStats(meta.campaigns, labels, signupsByCampaign),
    [meta, labels, signupsByCampaign]
  )

  const campaignRows = useMemo(() =>
    meta.campaigns.map(c => ({
      ...c,
      angle:       labels[c.id] || c.autoAngle,
      signups:     signupsByCampaign[c.id] || 0,
      cpl:         signupsByCampaign[c.id] ? c.spend / signupsByCampaign[c.id] : null,
      isAutoLabel: !labels[c.id],
    })).sort((a, b) => b.signups - a.signups || b.spend - a.spend),
    [meta, labels, signupsByCampaign]
  )

  const { totals } = meta
  const totalSignups  = Object.values(signupsByCampaign).reduce((s, v) => s + v, 0)
  const overallCPL    = totalSignups > 0 ? totals.spend / totalSignups : null
  const overallCPC    = totals.clicks > 0 ? totals.spend / totals.clicks : null
  const overallCPLPV  = totals.landingViews > 0 ? totals.spend / totals.landingViews : null
  const bestCPL       = angleStats.filter(a => a.cpl).sort((a, b) => a.cpl - b.cpl)[0]
  const bestCPC       = angleStats.filter(a => a.cpc).sort((a, b) => a.cpc - b.cpc)[0]
  const autoCount     = campaignRows.filter(r => r.isAutoLabel).length
  const hasCPC        = (totals.clicks || 0) > 0

  const funnelCTR    = totals.impressions > 0 && totals.clicks   ? (totals.clicks / totals.impressions) * 100       : null
  const funnelLPRate = totals.clicks > 0 && totals.landingViews  ? (totals.landingViews / totals.clicks) * 100      : null
  const funnelWLRate = totals.landingViews > 0 && totalSignups   ? (totalSignups / totals.landingViews) * 100       : null

  // Demographics
  const ageMap = {}
  meta.demoRows?.forEach(r => {
    if (!r.age || r.age === 'unknown' || r.age === 'Unknown') return
    if (!ageMap[r.age]) ageMap[r.age] = { age: r.age, spend: 0, reach: 0 }
    ageMap[r.age].spend += r.spend
    ageMap[r.age].reach += r.reach
  })
  const ageData = Object.values(ageMap).sort((a, b) => a.age.localeCompare(b.age))

  const genderMap = {}
  meta.demoRows?.forEach(r => {
    if (!r.gender || r.gender === 'unknown') return
    if (!genderMap[r.gender]) genderMap[r.gender] = { gender: r.gender, spend: 0 }
    genderMap[r.gender].spend += r.spend
  })
  const genderData = Object.values(genderMap).map(g => ({
    name: g.gender.charAt(0).toUpperCase() + g.gender.slice(1),
    value: g.spend,
    color: g.gender === 'male' ? '#6366f1' : g.gender === 'female' ? '#ec4899' : '#6b7280',
  }))

  return (
    <div className="space-y-6">

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPI label="Total Spend"    value={fmt.eur0(totals.spend)}        sub={`${meta.campaigns.length} campaigns`} color="#ec4899" highlight />
        <KPI label="Total Reach"    value={fmt.k(totals.reach)}           sub="unique accounts" />
        {hasCPC && <KPI label="Link Clicks"  value={fmt.k(totals.clicks)}           sub="total clicks" />}
        {hasCPC && <KPI label="CPC"          value={overallCPC ? fmt.eur(overallCPC) : '—'} sub="cost per website visit" color="#6366f1" tooltip="Cost per link click — optimised by Meta" />}
        {hasCPC && <KPI label="Landing Views" value={totals.landingViews ? fmt.k(totals.landingViews) : '—'} sub="saw landing page" />}
        <KPI label="Paid Signups"   value={totalSignups || '—'}           sub={waitlist ? 'from waitlist' : 'upload waitlist'} color={totalSignups ? '#a3e635' : undefined} />
        <KPI label="CPL"            value={overallCPL ? fmt.eur(overallCPL) : '—'} sub="cost per signup" color={overallCPL ? '#f59e0b' : undefined} highlight={!!overallCPL} tooltip="Cost per waitlist lead" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="CPM"            value={totals.impressions > 0 ? fmt.eur((totals.spend / totals.impressions) * 1000) : '—'} sub="per 1k impressions" />
        {hasCPC && <KPI label="CTR"  value={totals.impressions > 0 && totals.clicks ? fmt.pct((totals.clicks / totals.impressions) * 100) : '—'} sub="click-through rate" />}
        {hasCPC && <KPI label="Cost / Landing View" value={overallCPLPV ? fmt.eur(overallCPLPV) : '—'} sub="after LP click-through" />}
        <KPI label="Best Angle CPL" value={bestCPL ? fmt.eur(bestCPL.cpl) : '—'} sub={bestCPL?.angle || 'label campaigns below'} color={bestCPL ? ANGLE_COLORS[bestCPL.angle] : undefined} />
        {hasCPC && bestCPC && <KPI label="Best Angle CPC" value={fmt.eur(bestCPC.cpc)} sub={bestCPC.angle} color={ANGLE_COLORS[bestCPC.angle]} />}
      </div>

      {/* Funnel — only when we have CPC data */}
      {hasCPC && (totals.impressions > 0 || totals.clicks > 0) && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-sm font-medium text-white/70 mb-1">Full Conversion Funnel</p>
          <p className="text-xs text-white/30 mb-5">Where people drop off between seeing the ad and signing up</p>
          <div className="flex items-stretch gap-2">
            <FunnelStage value={totals.impressions} label="Impressions"    rate={funnelCTR}    rateLabel="CTR"          color="#8b5cf6" />
            <div className="self-center text-white/20 text-lg pb-6">→</div>
            <FunnelStage value={totals.clicks}      label="Link Clicks"    rate={funnelLPRate} rateLabel="saw LP"       color="#6366f1" />
            <div className="self-center text-white/20 text-lg pb-6">→</div>
            <FunnelStage value={totals.landingViews || 0} label="Landing Views" rate={funnelWLRate} rateLabel="signed up" color="#14b8a6" />
            <div className="self-center text-white/20 text-lg pb-6">→</div>
            <FunnelStage value={totalSignups}       label="Waitlist Signups" rate={null} rateLabel="" color="#a3e635" />
          </div>
          <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
            <div className="text-xs text-white/40">
              <span className="text-white/60">CPC</span> {overallCPC ? fmt.eur(overallCPC) : '—'}
              <span className="text-white/20 mx-2">·</span>
              <span className="text-white/60">Cost / Landing View</span> {overallCPLPV ? fmt.eur(overallCPLPV) : '—'}
              <span className="text-white/20 mx-2">·</span>
              <span className="text-white/60">CPL</span> {overallCPL ? fmt.eur(overallCPL) : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Angle performance */}
      {angleStats.length > 0 && (
        <>
          {/* CPL + CPC side by side per angle */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-sm font-medium text-white/70 mb-1">Cost Efficiency by Angle</p>
            <p className="text-xs text-white/30 mb-5">Lower = better. CPL = cost per signup, CPC = cost per website visit.</p>
            {angleStats.filter(a => a.signups > 0 || a.clicks > 0).length === 0 ? (
              <p className="text-white/20 text-sm text-center py-8">
                {!waitlist ? 'Upload Waitlist CSV to see CPL per angle' : 'Upload Meta Performance CSV to see CPC per angle'}
              </p>
            ) : (
              <div className="space-y-4">
                {angleStats.filter(a => a.signups > 0 || a.cpc).map(a => {
                  const maxCPL = Math.max(...angleStats.filter(x => x.cpl).map(x => x.cpl), 1)
                  const maxCPC = Math.max(...angleStats.filter(x => x.cpc).map(x => x.cpc), 1)
                  return (
                    <div key={a.angle}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold capitalize w-28" style={{ color: a.color }}>{a.angle}</span>
                        <span className="text-xs text-white/20">{a.campaigns} campaign{a.campaigns !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="grid grid-cols-[1fr_90px] gap-3 items-center mb-1">
                        {a.cpl != null ? <>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/30 w-7">CPL</span>
                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(a.cpl / maxCPL) * 100}%`, background: a.color + 'cc' }} />
                            </div>
                          </div>
                          <span className="text-sm font-bold text-amber-300 text-right">{fmt.eur(a.cpl)} <span className="text-xs text-white/30">({a.signups} leads)</span></span>
                        </> : <><div /><span className="text-xs text-white/20 text-right">no signups</span></>}
                      </div>
                      {a.cpc != null && (
                        <div className="grid grid-cols-[1fr_90px] gap-3 items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/30 w-7">CPC</span>
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(a.cpc / maxCPC) * 100}%`, background: '#6366f1' }} />
                            </div>
                          </div>
                          <span className="text-xs text-indigo-300 text-right">{fmt.eur(a.cpc)} <span className="text-white/20">/ click</span></span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Charts grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* CTR per angle (only if CPC data) */}
            {hasCPC && angleStats.some(a => a.ctr) && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-sm font-medium text-white/70 mb-1">CTR by Angle</p>
                <p className="text-xs text-white/30 mb-4">Which angle captures attention most (higher = better)</p>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={angleStats.filter(a => a.ctr)} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="angle" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
                    <Tooltip content={<Tip fmtFn={fmt.pct} />} />
                    <Bar dataKey="ctr" radius={[4,4,0,0]} name="CTR">
                      {angleStats.filter(a => a.ctr).map(a => <Cell key={a.angle} fill={a.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Spend per angle */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-sm font-medium text-white/70 mb-4">Spend per Angle (€)</p>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={angleStats} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="angle" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v.toFixed(0)}`} />
                  <Tooltip content={<Tip fmtFn={fmt.eur} />} />
                  <Bar dataKey="spend" radius={[4,4,0,0]} name="Spend">
                    {angleStats.map(a => <Cell key={a.angle} fill={a.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Reach per angle */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-sm font-medium text-white/70 mb-4">Reach per Angle</p>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={angleStats} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="angle" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmt.k} />
                  <Tooltip content={<Tip fmtFn={fmt.k} />} />
                  <Bar dataKey="reach" radius={[4,4,0,0]} name="Reach">
                    {angleStats.map(a => <Cell key={a.angle} fill={a.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Demographics */}
      {(ageData.length > 0 || genderData.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-sm font-medium text-white/70 mb-1">Spend by Age Group</p>
            <p className="text-xs text-white/30 mb-4">Where Meta is allocating your budget</p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={ageData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="age" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v.toFixed(0)}`} />
                <Tooltip content={<Tip fmtFn={fmt.eur} />} />
                <Bar dataKey="spend" fill="#6366f1" radius={[4,4,0,0]} name="Spend" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-sm font-medium text-white/70 mb-4">Spend by Gender</p>
            <div className="flex items-center justify-center h-[190px]">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={renderPct}>
                    {genderData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt.eur(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {genderData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-white/60">{d.name}</span>
                  <span className="text-white/30">{fmt.eur(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Campaign table */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium text-white/70">Campaigns — Label & Metrics</p>
            {autoCount > 0 && (
              <p className="text-xs text-amber-400 mt-0.5">{autoCount} auto-labeled — click angle to override</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportLabels}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition-colors"
              title="Download your angle labels as JSON to share with the team or back up"
            >
              <Download size={11} />
              Export labels
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition-colors"
              title="Import angle labels from a previously exported JSON file"
            >
              <Upload size={11} />
              Import labels
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden"
              onChange={e => { if (e.target.files[0]) importLabels(e.target.files[0]); e.target.value = '' }} />
          </div>
        </div>
        <p className="text-xs text-white/20 mb-4">
          Labels save automatically in this browser. Use Export/Import to share with teammates or keep a backup.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Campaign', 'Angle', 'Spend', 'Reach',
                  ...(hasCPC ? ['Clicks', 'Landing Views', 'CTR', 'CPC', 'Cost / LP view'] : []),
                  ...(waitlist ? ['Signups', 'CPL'] : [])
                ].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-white/40 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaignRows.map(c => (
                <tr key={c.id || c.name} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2.5 px-3 max-w-[200px]">
                    <p className="text-xs text-white/70 truncate" title={c.name}>{c.name}</p>
                    {c.id && <p className="text-[10px] text-white/20 font-mono mt-0.5">{c.id}</p>}
                  </td>
                  <td className="py-2.5 px-3">
                    {editingId === (c.id || c.name) ? (
                      <select
                        autoFocus
                        defaultValue={labels[c.id] || c.autoAngle}
                        onChange={e => handleLabel(c.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        className="bg-[#1a1a24] border border-indigo-500 rounded-lg px-2 py-1 text-xs focus:outline-none w-36"
                      >
                        {ANGLES.map(a => <option key={a} value={a} className="text-white">{a}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => setEditingId(c.id || c.name)} className="flex items-center gap-1.5 group" title="Click to change angle">
                        <span className="text-xs px-2 py-0.5 rounded-full capitalize border"
                          style={{
                            background: (ANGLE_COLORS[c.angle] || '#6b7280') + '25',
                            color: ANGLE_COLORS[c.angle] || '#9ca3af',
                            borderColor: (ANGLE_COLORS[c.angle] || '#6b7280') + '50',
                            opacity: c.isAutoLabel ? 0.7 : 1,
                          }}>
                          {c.angle}
                        </span>
                        <Edit2 size={10} className="text-white/20 group-hover:text-white/50 transition-colors" />
                        {c.isAutoLabel && <span className="text-[10px] text-white/20">auto</span>}
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-white font-medium">€{c.spend.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-white/50">{fmt.k(c.reach)}</td>
                  {hasCPC && <>
                    <td className="py-2.5 px-3 text-white/60">{c.clicks > 0 ? fmt.k(c.clicks) : <span className="text-white/20">—</span>}</td>
                    <td className="py-2.5 px-3 text-white/60">{c.landingViews > 0 ? fmt.k(c.landingViews) : <span className="text-white/20">—</span>}</td>
                    <td className="py-2.5 px-3 text-white/60">{c.ctr > 0 ? fmt.pct(c.ctr) : <span className="text-white/20">—</span>}</td>
                    <td className="py-2.5 px-3 text-indigo-300">{c.cpc > 0 ? fmt.eur(c.cpc) : <span className="text-white/20">—</span>}</td>
                    <td className="py-2.5 px-3 text-white/50 text-xs">{c.landingViews > 0 ? fmt.eur(c.spend / c.landingViews) : <span className="text-white/20">—</span>}</td>
                  </>}
                  {waitlist && <>
                    <td className="py-2.5 px-3">
                      <span className={`font-medium ${c.signups > 0 ? 'text-green-400' : 'text-white/20'}`}>{c.signups || '—'}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {c.cpl !== null
                        ? <span className="font-medium text-amber-300">{fmt.eur(c.cpl)}</span>
                        : <span className="text-white/20">—</span>
                      }
                    </td>
                  </>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-white/5">
                <td className="py-2.5 px-3 text-xs text-white/40 font-medium">TOTAL</td>
                <td />
                <td className="py-2.5 px-3 text-white font-bold">€{totals.spend.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-white/50">{fmt.k(totals.reach)}</td>
                {hasCPC && <>
                  <td className="py-2.5 px-3 text-white/60">{totals.clicks ? fmt.k(totals.clicks) : '—'}</td>
                  <td className="py-2.5 px-3 text-white/60">{totals.landingViews ? fmt.k(totals.landingViews) : '—'}</td>
                  <td className="py-2.5 px-3 text-white/60">{totals.impressions > 0 && totals.clicks ? fmt.pct((totals.clicks / totals.impressions) * 100) : '—'}</td>
                  <td className="py-2.5 px-3 text-indigo-300 font-bold">{overallCPC ? fmt.eur(overallCPC) : '—'}</td>
                  <td className="py-2.5 px-3 text-white/50">{totals.landingViews > 0 ? fmt.eur(totals.spend / totals.landingViews) : '—'}</td>
                </>}
                {waitlist && <>
                  <td className="py-2.5 px-3 text-green-400 font-bold">{totalSignups}</td>
                  <td className="py-2.5 px-3 text-amber-300 font-bold">{overallCPL ? fmt.eur(overallCPL) : '—'}</td>
                </>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
