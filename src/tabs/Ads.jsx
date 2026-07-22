import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import { loadLabels, saveLabel, ANGLES, ANGLE_COLORS } from '../utils/campaignStorage'
import { buildAngleStats } from '../utils/parseMetaCSV'
import { Edit2, Check } from 'lucide-react'

const fmt = {
  eur:  v => `€${Number(v).toFixed(2)}`,
  eur0: v => `€${Number(v).toFixed(0)}`,
  pct:  v => `${Number(v).toFixed(2)}%`,
  k:    v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(Math.round(v)),
}

function KPI({ label, value, sub, color, highlight }) {
  return (
    <div className={`border rounded-xl p-4 ${highlight ? 'border-pink-500/30 bg-pink-500/10' : 'border-white/10 bg-white/5'}`}>
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2">{label}</p>
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
      {payload.map(p => <p key={p.dataKey} style={{ color: p.fill || 'white' }}>{p.name}: {fmtFn ? fmtFn(p.value) : p.value}</p>)}
    </div>
  )
}

const RADIAN = Math.PI / 180
const renderPct = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  return <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>{Math.round(percent * 100)}%</text>
}

export default function Ads({ meta, waitlist }) {
  const [labels, setLabels] = useState({})
  const [editingId, setEditingId] = useState(null)

  useEffect(() => { setLabels(loadLabels()) }, [meta])

  function handleLabel(id, value) {
    saveLabel(id, value)
    setLabels(loadLabels())
    setEditingId(null)
  }

  // Waitlist signups per campaign ID
  const signupsByCampaign = useMemo(() => {
    if (!waitlist) return {}
    const map = {}
    waitlist.rows.forEach(r => {
      if (r.trafficType !== 'paid' || !r.campaignId) return
      map[r.campaignId] = (map[r.campaignId] || 0) + 1
    })
    return map
  }, [waitlist])

  // Angle aggregates
  const angleStats = useMemo(() =>
    buildAngleStats(meta.campaigns, labels, signupsByCampaign),
    [meta, labels, signupsByCampaign]
  )

  // Campaign rows with joined data
  const campaignRows = useMemo(() =>
    meta.campaigns.map(c => ({
      ...c,
      angle:   labels[c.id] || c.autoAngle,
      signups: signupsByCampaign[c.id] || 0,
      cpl:     signupsByCampaign[c.id] ? c.spend / signupsByCampaign[c.id] : null,
      isAutoLabel: !labels[c.id],
    })).sort((a, b) => b.signups - a.signups || b.spend - a.spend),
    [meta, labels, signupsByCampaign]
  )

  const { totals } = meta
  const totalSignups = Object.values(signupsByCampaign).reduce((s, v) => s + v, 0)
  const overallCPL   = totalSignups > 0 ? totals.spend / totalSignups : null
  const bestCPL      = angleStats.filter(a => a.cpl).sort((a, b) => a.cpl - b.cpl)[0]
  const autoCount    = campaignRows.filter(r => r.isAutoLabel).length

  // Demographics (age breakdown aggregated across all campaigns)
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPI label="Total Spend" value={fmt.eur0(totals.spend)} sub={`${meta.campaigns.length} campaigns`} color="#ec4899" highlight />
        <KPI label="Total Reach" value={fmt.k(totals.reach)} sub="unique accounts" />
        <KPI label="Paid Signups" value={totalSignups || '—'} sub={waitlist ? 'from waitlist data' : 'upload waitlist CSV'} color={totalSignups ? '#a3e635' : undefined} />
        <KPI label="Cost per Lead" value={overallCPL ? fmt.eur(overallCPL) : '—'} sub="spend ÷ paid signups" color={overallCPL ? '#f59e0b' : undefined} highlight={!!overallCPL} />
        <KPI label="Best Angle CPL" value={bestCPL ? fmt.eur(bestCPL.cpl) : '—'} sub={bestCPL?.angle || 'label campaigns below'} color={bestCPL ? ANGLE_COLORS[bestCPL.angle] : undefined} />
      </div>

      {/* Angle performance comparison */}
      {angleStats.length > 0 && (
        <>
          {/* CPL + Signups — the money chart */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-sm font-medium text-white/70 mb-1">Cost per Lead by Angle</p>
            <p className="text-xs text-white/30 mb-4">Lower = more efficient. Only shows angles with waitlist signups linked.</p>
            {angleStats.filter(a => a.signups > 0).length === 0 ? (
              <p className="text-white/20 text-sm text-center py-8">Upload Waitlist CSV to see CPL per angle</p>
            ) : (
              <div className="space-y-3">
                {angleStats.filter(a => a.signups > 0).map(a => {
                  const maxCPL = Math.max(...angleStats.filter(x => x.cpl).map(x => x.cpl))
                  return (
                    <div key={a.angle} className="grid grid-cols-[130px_1fr_80px_80px_80px] gap-4 items-center">
                      <span className="text-sm font-medium capitalize" style={{ color: a.color }}>{a.angle}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${(a.cpl / maxCPL) * 100}%`, background: a.color }} />
                        </div>
                      </div>
                      <p className="text-sm font-bold text-white text-right">{fmt.eur(a.cpl)}</p>
                      <p className="text-xs text-white/40 text-right">{a.signups} leads</p>
                      <p className="text-xs text-white/40 text-right">{fmt.eur0(a.spend)} spend</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 2×2 angle charts */}
          <div className="grid md:grid-cols-2 gap-6">
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
            <p className="text-xs text-white/30 mb-4">Where Meta is spending your budget</p>
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

      {/* Campaign table with inline angle labeling */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-white/70">Campaigns — Label & Metrics</p>
          {autoCount > 0 && (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              {autoCount} auto-labeled — review below
            </span>
          )}
        </div>
        <p className="text-xs text-white/30 mb-4">
          Angles are auto-suggested from the caption. Click the angle to override. Labels save in your browser.
          {waitlist ? '' : ' Upload Waitlist CSV to see signups and CPL columns.'}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Caption', 'Angle', 'Spend', 'Reach', ...(waitlist ? ['Signups', 'CPL'] : [])].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-white/40 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaignRows.map(c => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2.5 px-3 max-w-[220px]">
                    <p className="text-xs text-white/70 truncate" title={c.name}>{c.name}</p>
                    <p className="text-[10px] text-white/20 font-mono mt-0.5">{c.id}</p>
                  </td>
                  <td className="py-2.5 px-3">
                    {editingId === c.id ? (
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
                      <button
                        onClick={() => setEditingId(c.id)}
                        className="flex items-center gap-1.5 group"
                        title="Click to change angle"
                      >
                        <span
                          className="text-xs px-2 py-0.5 rounded-full capitalize border"
                          style={{
                            background: (ANGLE_COLORS[c.angle] || '#6b7280') + '25',
                            color: ANGLE_COLORS[c.angle] || '#9ca3af',
                            borderColor: (ANGLE_COLORS[c.angle] || '#6b7280') + '50',
                            opacity: c.isAutoLabel ? 0.7 : 1,
                          }}
                        >
                          {c.angle}
                        </span>
                        <Edit2 size={10} className="text-white/20 group-hover:text-white/50 transition-colors" />
                        {c.isAutoLabel && <span className="text-[10px] text-white/20">auto</span>}
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-white font-medium">€{c.spend.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-white/50">{fmt.k(c.reach)}</td>
                  {waitlist && <>
                    <td className="py-2.5 px-3">
                      <span className={`font-medium ${c.signups > 0 ? 'text-green-400' : 'text-white/20'}`}>{c.signups || '—'}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {c.cpl !== null
                        ? <span className="font-medium text-amber-300">€{c.cpl.toFixed(2)}</span>
                        : <span className="text-white/20">—</span>
                      }
                    </td>
                  </>}
                </tr>
              ))}
            </tbody>
            {waitlist && (
              <tfoot>
                <tr className="border-t border-white/10 bg-white/5">
                  <td className="py-2.5 px-3 text-xs text-white/40 font-medium">TOTAL</td>
                  <td />
                  <td className="py-2.5 px-3 text-white font-bold">€{totals.spend.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-white/50">{fmt.k(totals.reach)}</td>
                  <td className="py-2.5 px-3 text-green-400 font-bold">{totalSignups}</td>
                  <td className="py-2.5 px-3 text-amber-300 font-bold">{overallCPL ? `€${overallCPL.toFixed(2)}` : '—'}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
