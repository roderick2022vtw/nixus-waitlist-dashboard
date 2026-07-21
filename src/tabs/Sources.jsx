import { useState, useEffect, useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { loadLabels, saveLabel, ANGLES, ANGLE_COLORS } from '../utils/campaignStorage'

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-white font-medium">{payload[0].name}</p>
      <p className="text-white/50">{payload[0].value} signups</p>
    </div>
  )
}

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-white font-medium">{label}</p>
      <p className="text-white/50">{payload[0]?.value} signups</p>
    </div>
  )
}

const RADIAN = Math.PI / 180
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>
      {Math.round(percent * 100)}%
    </text>
  )
}

export default function Sources({ stats, colors }) {
  const { channelData, campaignData, deviceData, formData, paid } = stats
  const [labels, setLabels] = useState({})

  useEffect(() => { setLabels(loadLabels()) }, [])

  function handleLabel(id, value) {
    saveLabel(id, value)
    setLabels(loadLabels())
  }

  // Build angle chart data from labeled campaigns
  const angleData = useMemo(() => {
    const map = {}
    campaignData.forEach(c => {
      const angle = labels[c.id]
      if (!angle) return
      map[angle] = (map[angle] || 0) + c.signups
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, signups]) => ({ name, signups, color: ANGLE_COLORS[name] || '#6366f1' }))
  }, [campaignData, labels])

  const labeledCount = campaignData.filter(c => labels[c.id]).length
  const unlabeledCount = campaignData.length - labeledCount

  return (
    <div className="space-y-6">

      {/* Paid vs organic + devices */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-sm font-medium text-white/70 mb-4">Traffic Channels</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={channelData} cx="50%" cy="50%" outerRadius={85} dataKey="value" labelLine={false} label={renderLabel}>
                {channelData.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {channelData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-white/60">{d.name}</span>
                <span className="text-white/30">({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-sm font-medium text-white/70 mb-4">Device Type</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={deviceData} cx="50%" cy="50%" outerRadius={85} dataKey="value" labelLine={false} label={renderLabel}>
                {deviceData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {deviceData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
                <span className="text-white/60">{d.name}</span>
                <span className="text-white/30">({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ad Angle Performance chart — only when labels exist */}
      {angleData.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-white/70">Ad Angle Performance</p>
            {unlabeledCount > 0 && (
              <span className="text-xs text-white/30">{unlabeledCount} campaign{unlabeledCount > 1 ? 's' : ''} not yet labeled</span>
            )}
          </div>
          <p className="text-xs text-white/30 mb-4">Signups generated per ad angle (paid only)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={angleData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="signups" radius={[4, 4, 0, 0]}>
                {angleData.map(d => <Cell key={d.name} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Angle legend */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {angleData.map(d => (
              <div key={d.name} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <div>
                  <p className="text-xs text-white/50 capitalize">{d.name}</p>
                  <p className="text-sm font-bold text-white">{d.signups}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign ID labeling table */}
      {campaignData.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-white/70">Label Ad Campaigns</p>
            <span className="text-xs text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full">{paid} paid signups total</span>
          </div>
          <p className="text-xs text-white/30 mb-4">
            Select the angle for each campaign ID. Labels are saved in your browser automatically.
            Find IDs in Meta Ads Manager → Ad Sets tab → Column "Ad Set ID".
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-xs text-white/40 font-medium uppercase tracking-wider">Ad Set ID</th>
                  <th className="text-left py-2 px-3 text-xs text-white/40 font-medium uppercase tracking-wider">Angle</th>
                  <th className="text-left py-2 px-3 text-xs text-white/40 font-medium uppercase tracking-wider">Signups</th>
                  <th className="text-left py-2 px-3 text-xs text-white/40 font-medium uppercase tracking-wider w-36">Share</th>
                </tr>
              </thead>
              <tbody>
                {campaignData.map(c => {
                  const pct = paid ? Math.round((c.signups / paid) * 100) : 0
                  const angle = labels[c.id] || ''
                  const color = ANGLE_COLORS[angle]
                  return (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2.5 px-3 font-mono text-xs text-white/40">{c.id}</td>
                      <td className="py-2.5 px-3">
                        <select
                          value={angle}
                          onChange={e => handleLabel(c.id, e.target.value)}
                          className="bg-[#1a1a24] border border-white/10 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-indigo-500 w-36"
                          style={{ color: color || 'rgba(255,255,255,0.5)' }}
                        >
                          <option value="" className="text-white/30">— label —</option>
                          {ANGLES.map(a => (
                            <option key={a} value={a} className="text-white">{a}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-white font-medium">{c.signups}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: color || '#ec4899' }}
                            />
                          </div>
                          <span className="text-xs text-white/30 w-6 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form placement */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <p className="text-sm font-medium text-white/70 mb-1">Signup Form Placement</p>
        <p className="text-xs text-white/30 mb-4">Where on the site people clicked to join</p>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={formData} layout="vertical" margin={{ left: 20, right: 20, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickLine={false} axisLine={false} width={90} />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
