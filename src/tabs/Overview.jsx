import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'

function KPI({ label, value, sub }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-white/50 mb-1">{label}</p>
      <p className="text-indigo-400">+{payload[0]?.value} that day</p>
      <p className="text-white">Total: {payload[1]?.value}</p>
    </div>
  )
}

export default function Overview({ stats, colors }) {
  const { total, confirmed, withSurvey, growthData } = stats
  const confirmRate = total ? Math.round((confirmed / total) * 100) : 0
  const surveyRate = total ? Math.round((withSurvey / total) * 100) : 0

  // Week-over-week: last 7 days vs prior 7
  const last7 = growthData.slice(-7).reduce((s, d) => s + d.daily, 0)
  const prev7 = growthData.slice(-14, -7).reduce((s, d) => s + d.daily, 0)
  const wow = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Total Signups" value={total.toLocaleString()} />
        <KPI label="Confirmed" value={`${confirmRate}%`} sub={`${confirmed} emails confirmed`} />
        <KPI label="Survey Completed" value={`${surveyRate}%`} sub={`${withSurvey} responses`} />
        <KPI
          label="Last 7 days"
          value={last7}
          sub={wow !== null ? `${wow >= 0 ? '+' : ''}${wow}% vs prior week` : 'No prior data'}
        />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <p className="text-sm font-medium text-white/70 mb-4">Cumulative Signups Over Time</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="indigo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={d => d.slice(5)} interval={Math.max(1, Math.floor(growthData.length / 8))} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="daily" stroke="rgba(99,102,241,0.4)" fill="none" strokeWidth={1} dot={false} />
            <Area type="monotone" dataKey="total" stroke="#6366f1" fill="url(#indigo)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
