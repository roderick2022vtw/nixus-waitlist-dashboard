import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-white font-medium">{label}</p>
      <p className="text-indigo-400">{payload[0]?.value} signups</p>
    </div>
  )
}

const RADIAN = Math.PI / 180
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.04) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>
      {Math.round(percent * 100)}%
    </text>
  )
}

export default function Geography({ stats, colors }) {
  const { langData, regionData } = stats

  return (
    <div className="space-y-6">
      {/* Language bar chart */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <p className="text-sm font-medium text-white/70 mb-1">Browser Language</p>
        <p className="text-xs text-white/30 mb-4">Proxy for audience nationality — top 10</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={langData.slice(0, 10)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {langData.slice(0, 10).map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Region pie */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <p className="text-sm font-medium text-white/70 mb-4">World Region (from Timezone)</p>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={regionData} cx="50%" cy="50%" outerRadius={95}
                dataKey="value" labelLine={false} label={renderLabel}
              >
                {regionData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
                    <p className="text-white font-medium">{payload[0].name}</p>
                    <p className="text-white/50">{payload[0].value} signups</p>
                  </div>
                )
              }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 min-w-[160px]">
            {regionData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                  <span className="text-white/70">{d.name}</span>
                </div>
                <span className="text-white font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
