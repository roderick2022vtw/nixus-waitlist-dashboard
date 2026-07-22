import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts'
import { loadLabels } from '../utils/campaignStorage'
import { ANGLE_COLORS } from '../utils/parseMetaCSV'

const fmt = {
  eur:  v => `€${v.toFixed(2)}`,
  pct:  v => `${v.toFixed(2)}%`,
  k:    v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(Math.round(v)),
  cpc:  v => `€${v.toFixed(3)}`,
}

function KPI({ label, value, sub, color }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || 'white' }}>{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  )
}

const ChartTip = ({ active, payload, label, extra }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm space-y-1">
      <p className="text-white font-medium capitalize">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color || 'white' }}>
          {p.name}: {extra ? extra(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

function AngleBar({ data, dataKey, label, format, color, height = 200 }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <p className="text-sm font-medium text-white/70 mb-4">{label}</p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="angle" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={format || (v => v)} />
          <Tooltip content={<ChartTip extra={format} />} />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} name={label}>
            {data.map(d => <Cell key={d.angle} fill={d.color || color || '#6366f1'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Ads({ meta, waitlist }) {
  const { rows, byAngle, totals } = meta
  const bestAngle = [...byAngle].sort((a, b) => b.clicks - a.clicks)[0]
  const lowestCPC = [...byAngle].filter(a => a.cpc > 0).sort((a, b) => a.cpc - b.cpc)[0]

  // Build angle ROI if waitlist is available
  const angleROI = useMemo(() => {
    if (!waitlist) return null
    const labels = loadLabels()

    // Waitlist signups per angle (from labeled campaigns)
    const signupsByAngle = {}
    waitlist.rows.forEach(r => {
      if (r.trafficType !== 'paid') return
      const angle = labels[r.campaignId]
      if (!angle) return
      signupsByAngle[angle] = (signupsByAngle[angle] || 0) + 1
    })

    // Merge with meta byAngle
    const merged = byAngle.map(a => {
      const signups = signupsByAngle[a.angle] || 0
      const cpl = signups > 0 ? a.spend / signups : null
      return { ...a, signups, cpl }
    })

    // Add waitlist angles not in meta
    Object.entries(signupsByAngle).forEach(([angle, signups]) => {
      if (!merged.find(m => m.angle === angle)) {
        merged.push({ angle, signups, spend: 0, clicks: 0, cpl: null, color: ANGLE_COLORS[angle] || '#6b7280' })
      }
    })

    return merged.sort((a, b) => b.signups - a.signups)
  }, [meta, waitlist])

  const unlabeledPaid = waitlist
    ? waitlist.rows.filter(r => r.trafficType === 'paid' && !loadLabels()[r.campaignId]).length
    : 0

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPI label="Total Spend" value={`€${totals.spend.toFixed(0)}`} sub={`${rows.length} campaigns`} color="#ec4899" />
        <KPI label="Total Reach" value={fmt.k(totals.reach)} sub="unique accounts" />
        <KPI label="Link Clicks" value={fmt.k(totals.clicks)} sub={`€${totals.cpc.toFixed(3)} avg CPC`} />
        <KPI label="Avg CTR" value={fmt.pct(totals.ctr)} sub="click-through rate" color={totals.ctr > 3 ? '#a3e635' : totals.ctr > 1 ? '#f59e0b' : '#ef4444'} />
        <KPI label="Best angle" value={bestAngle?.angle || '—'} sub={`${fmt.k(bestAngle?.clicks || 0)} clicks`} color={ANGLE_COLORS[bestAngle?.angle]} />
      </div>

      {/* Angle charts 2x2 */}
      <div className="grid md:grid-cols-2 gap-6">
        <AngleBar data={byAngle} dataKey="spend"  label="Spend per Angle (€)" format={v => `€${v.toFixed(0)}`} />
        <AngleBar data={byAngle} dataKey="clicks" label="Link Clicks per Angle" format={fmt.k} />
        <AngleBar data={byAngle} dataKey="cpc"    label="CPC per Angle (€) — lower = better" format={fmt.cpc} />
        <AngleBar data={byAngle} dataKey="ctr"    label="CTR per Angle (%) — higher = better" format={fmt.pct} />
      </div>

      {/* Angle ROI — only when waitlist is loaded */}
      {angleROI && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-white/70">Angle ROI — Spend vs Waitlist Signups</p>
            {unlabeledPaid > 0 && (
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                {unlabeledPaid} paid signups not yet labeled → Sources tab
              </span>
            )}
          </div>
          <p className="text-xs text-white/30 mb-5">Combines Meta ad spend with waitlist signup data per angle</p>
          <div className="space-y-3">
            {angleROI.map(a => {
              const maxSpend = Math.max(...angleROI.map(x => x.spend))
              const maxSignups = Math.max(...angleROI.map(x => x.signups))
              return (
                <div key={a.angle} className="grid grid-cols-[120px_1fr_1fr_90px] gap-4 items-center">
                  <span className="text-sm font-medium capitalize" style={{ color: a.color || '#fff' }}>{a.angle}</span>
                  <div>
                    <div className="flex items-center justify-between text-xs text-white/30 mb-1">
                      <span>Spend</span><span>€{a.spend.toFixed(0)}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${maxSpend > 0 ? (a.spend / maxSpend) * 100 : 0}%`, background: a.color || '#6366f1' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-white/30 mb-1">
                      <span>Signups</span><span>{a.signups}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-400" style={{ width: `${maxSignups > 0 ? (a.signups / maxSignups) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    {a.cpl !== null
                      ? <><p className="text-sm font-bold text-white">€{a.cpl.toFixed(2)}</p><p className="text-xs text-white/30">per signup</p></>
                      : <p className="text-xs text-white/20">no signups</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reach vs CPC scatter insight */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <p className="text-sm font-medium text-white/70 mb-1">Reach vs CPC by Angle</p>
        <p className="text-xs text-white/30 mb-4">Top-right = high reach + low cost. Ideal angle is bottom-right.</p>
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="reach" type="number" name="Reach" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmt.k} label={{ value: 'Reach →', position: 'insideRight', fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
            <YAxis dataKey="cpc" type="number" name="CPC (€)" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v.toFixed(3)}`} label={{ value: '← CPC', angle: -90, position: 'insideTop', fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
            <ZAxis dataKey="clicks" range={[60, 400]} name="Clicks" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm space-y-0.5">
                  <p className="font-medium capitalize" style={{ color: d.color }}>{d.angle}</p>
                  <p className="text-white/50">Reach: {fmt.k(d.reach)}</p>
                  <p className="text-white/50">CPC: €{d.cpc.toFixed(3)}</p>
                  <p className="text-white/50">Clicks: {fmt.k(d.clicks)}</p>
                </div>
              )
            }} />
            <Scatter data={byAngle} label={{ dataKey: 'angle', fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}>
              {byAngle.map(d => <Cell key={d.angle} fill={d.color} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Campaign table */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <p className="text-sm font-medium text-white/70 mb-4">All Campaigns</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Caption', 'Angle', 'Spend', 'Reach', 'Clicks', 'CPC', 'CTR', 'Landing views', 'Status'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-white/40 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2.5 px-3 text-white/70 max-w-[220px]">
                    <p className="truncate text-xs">{r.caption}</p>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: (ANGLE_COLORS[r.angle] || '#6b7280') + '30', color: ANGLE_COLORS[r.angle] || '#9ca3af' }}>
                      {r.angle}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-white font-medium">€{r.spend.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-white/60">{fmt.k(r.reach)}</td>
                  <td className="py-2.5 px-3 text-white/60">{fmt.k(r.clicks)}</td>
                  <td className="py-2.5 px-3 text-white/60">€{r.cpc.toFixed(3)}</td>
                  <td className="py-2.5 px-3">
                    <span style={{ color: r.ctr > 3 ? '#a3e635' : r.ctr > 1 ? '#f59e0b' : '#ef4444' }}>
                      {r.ctr.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-white/60">{fmt.k(r.landingViews)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs ${r.status === 'active' ? 'text-green-400' : r.status === 'inactive' ? 'text-red-400' : r.status === 'completed' ? 'text-white/30' : 'text-white/30'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
