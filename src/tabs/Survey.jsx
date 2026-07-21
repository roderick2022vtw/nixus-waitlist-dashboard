import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-white/60 mb-1">{label}</p>
      <p className="text-indigo-400">{payload[0]?.value} people</p>
    </div>
  )
}

function StatBox({ label, value, sub }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  )
}

export default function Survey({ stats, colors }) {
  const { withSurvey, total, cansData, ballsData, avgCans, avgBalls } = stats
  const rate = total ? Math.round((withSurvey / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatBox label="Survey Completion" value={`${rate}%`} sub={`${withSurvey} of ${total} responded`} />
        <StatBox label="Avg Cans / Month" value={avgCans} sub="ball cans used per month" />
        <StatBox label="Avg Balls / Year" value={avgBalls} sub="tennis/padel balls used" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-sm font-medium text-white/70 mb-1">Cans of Balls per Month</p>
          <p className="text-xs text-white/30 mb-4">How many cans respondents go through monthly</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cansData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {cansData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-sm font-medium text-white/70 mb-1">Balls per Year</p>
          <p className="text-xs text-white/30 mb-4">Total balls used annually</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ballsData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {ballsData.map((_, i) => (
                  <Cell key={i} fill={colors[(i + 2) % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
