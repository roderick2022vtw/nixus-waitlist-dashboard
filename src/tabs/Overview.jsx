import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function KPI({ label, value, sub, accent }) {
  return (
    <div className={`border rounded-xl p-5 ${accent ? 'bg-pink-500/10 border-pink-500/30' : 'bg-white/5 border-white/10'}`}>
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-bold ${accent ? 'text-pink-300' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const paid = payload.find(p => p.dataKey === 'totalPaid')
  const organic = payload.find(p => p.dataKey === 'totalOrganic')
  const dpaid = payload.find(p => p.dataKey === 'dailyPaid')
  const dorganic = payload.find(p => p.dataKey === 'dailyOrganic')
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm space-y-1">
      <p className="text-white/40 text-xs">{label}</p>
      <p className="text-pink-400">Paid: {paid?.value} total <span className="text-white/30">(+{dpaid?.value})</span></p>
      <p className="text-indigo-400">Organic: {organic?.value} total <span className="text-white/30">(+{dorganic?.value})</span></p>
    </div>
  )
}

export default function Overview({ stats, metaAds }) {
  const { total, confirmed, withSurvey, growthData, paid, igOrganic, google, direct, channelData } = stats
  const organic = total - paid
  const paidPct = total ? Math.round((paid / total) * 100) : 0
  const confirmRate = total ? Math.round((confirmed / total) * 100) : 0
  const surveyRate = total ? Math.round((withSurvey / total) * 100) : 0

  const last7 = growthData.slice(-7).reduce((s, d) => s + d.daily, 0)
  const prev7 = growthData.slice(-14, -7).reduce((s, d) => s + d.daily, 0)
  const wow = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null

  const cpl = metaAds && paid > 0 ? (metaAds.totals.spend / paid).toFixed(2) : null

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className={`grid grid-cols-2 gap-4 ${metaAds ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
        <KPI label="Total Signups" value={total.toLocaleString()} />
        <KPI label="From Paid Ads" value={paid} sub={`${paidPct}% of total`} accent />
        <KPI label="Organic" value={organic} sub={`${100 - paidPct}% of total`} />
        <KPI
          label="Last 7 days"
          value={last7}
          sub={wow !== null ? `${wow >= 0 ? '+' : ''}${wow}% vs prior week` : 'No prior data'}
        />
        {metaAds && <KPI label="Cost per Lead" value={cpl ? `€${cpl}` : '—'} sub={`€${metaAds.totals.spend.toFixed(0)} total spend`} accent />}
      </div>

      {/* Channel breakdown bar */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <p className="text-sm font-medium text-white/70 mb-4">Traffic Channel Breakdown</p>
        <div className="flex h-8 rounded-lg overflow-hidden gap-0.5">
          {channelData.map(ch => (
            <div
              key={ch.name}
              style={{ width: `${(ch.value / total) * 100}%`, background: ch.color }}
              className="h-full transition-all"
              title={`${ch.name}: ${ch.value}`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {channelData.map(ch => (
            <div key={ch.name} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ch.color }} />
              <span className="text-white/70">{ch.name}</span>
              <span className="text-white font-medium">{ch.value}</span>
              <span className="text-white/30">({Math.round((ch.value / total) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Growth chart — paid vs organic */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-white/70">Cumulative Growth — Paid vs Organic</p>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-pink-400 inline-block rounded" />Paid</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-400 inline-block rounded" />Organic</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gpaid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gorganic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              tickLine={false} axisLine={false}
              tickFormatter={d => d.slice(5)}
              interval={Math.max(1, Math.floor(growthData.length / 8))}
            />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="totalOrganic" stroke="#6366f1" fill="url(#gorganic)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="totalPaid" stroke="#ec4899" fill="url(#gpaid)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPI label="Email Confirmed" value={`${confirmRate}%`} sub={`${confirmed} of ${total}`} />
        <KPI label="Survey Completed" value={`${surveyRate}%`} sub={`${withSurvey} responses`} />
        <KPI label="Instagram Organic" value={igOrganic} sub="link in bio / shared posts" />
      </div>
    </div>
  )
}
