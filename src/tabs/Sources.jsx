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
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, percent }) => {
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

export default function Sources({ stats, colors }) {
  const { sourceData, deviceData, formData } = stats
  const total = sourceData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Sources pie */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-sm font-medium text-white/70 mb-4">Traffic Sources</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={sourceData} cx="50%" cy="50%" outerRadius={100}
                dataKey="value" labelLine={false} label={renderLabel}
              >
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {sourceData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                <span className="text-white/60">{d.name}</span>
                <span className="text-white/30">({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Devices pie */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-sm font-medium text-white/70 mb-4">Device Type</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={deviceData} cx="50%" cy="50%" outerRadius={100}
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

      {/* Form placement */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <p className="text-sm font-medium text-white/70 mb-4">Signup Form Placement</p>
        <ResponsiveContainer width="100%" height={180}>
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
