import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-white font-medium">{name}</p>
      <p className="text-white/50">{value} signups</p>
    </div>
  )
}

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-white/60 mb-1">{label}</p>
      <p className="text-indigo-400">{payload[0]?.value} signups</p>
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
  const { channelData, campaignData, deviceData, formData, total, paid } = stats

  return (
    <div className="space-y-6">

      {/* Paid vs organic pie + devices */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-sm font-medium text-white/70 mb-4">Traffic Channels</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={channelData} cx="50%" cy="50%" outerRadius={95}
                dataKey="value" labelLine={false} label={renderLabel}
              >
                {channelData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {channelData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-white/60">{d.name}</span>
                <span className="text-white/30">({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-sm font-medium text-white/70 mb-4">Device Type</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={deviceData} cx="50%" cy="50%" outerRadius={95}
                dataKey="value" labelLine={false} label={renderLabel}
              >
                {deviceData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {deviceData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                <span className="text-white/60">{d.name}</span>
                <span className="text-white/30">({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign IDs table */}
      {campaignData.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-white/70">Meta Ad Campaigns</p>
            <span className="text-xs text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full">{paid} paid signups total</span>
          </div>
          <p className="text-xs text-white/30 mb-4">
            Match these Campaign IDs in Meta Ads Manager → Campaigns tab → add "Campaign ID" column.
            Once you know the angle, you can label them.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-xs text-white/40 font-medium uppercase tracking-wider">Campaign ID</th>
                  <th className="text-left py-2 px-3 text-xs text-white/40 font-medium uppercase tracking-wider">Signups</th>
                  <th className="text-left py-2 px-3 text-xs text-white/40 font-medium uppercase tracking-wider">Share of paid</th>
                  <th className="text-left py-2 px-3 text-xs text-white/40 font-medium uppercase tracking-wider">Bar</th>
                </tr>
              </thead>
              <tbody>
                {campaignData.map((c, i) => {
                  const pct = paid ? Math.round((c.signups / paid) * 100) : 0
                  return (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2.5 px-3 font-mono text-xs text-white/60">{c.id}</td>
                      <td className="py-2.5 px-3 text-white font-medium">{c.signups}</td>
                      <td className="py-2.5 px-3 text-white/40">{pct}%</td>
                      <td className="py-2.5 px-3 w-40">
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-pink-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
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
        <ResponsiveContainer width="100%" height={140}>
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
