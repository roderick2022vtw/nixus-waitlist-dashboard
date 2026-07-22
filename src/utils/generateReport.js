import { ANGLE_COLORS } from './parseMetaCSV'

const eur  = v => `€${Number(v).toFixed(2)}`
const eur0 = v => `€${Number(v).toFixed(0)}`
const pct  = v => `${Number(v).toFixed(1)}%`
const k    = v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))

function badge(angle) {
  const c = ANGLE_COLORS[angle] || '#6b7280'
  return `<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600;background:${c}22;color:${c};border:1px solid ${c}66">${angle}</span>`
}

function kpiCard(label, value, sub = '', color = '#6366f1') {
  return `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:8px">${label}</div>
    <div style="font-size:22px;font-weight:700;color:${color}">${value}</div>
    ${sub ? `<div style="font-size:11px;color:#999;margin-top:4px">${sub}</div>` : ''}
  </div>`
}

function th(txt) {
  return `<th style="text-align:left;padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#999;border-bottom:2px solid #e5e7eb;white-space:nowrap">${txt}</th>`
}

function td(txt, bold = false, color = '') {
  return `<td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;${bold ? 'font-weight:700;' : ''}${color ? `color:${color};` : ''}">${txt ?? '—'}</td>`
}

export function generateReport({ waitlist, meta, angleStats, signupsByCampaign, labels, date }) {
  const totals  = meta?.totals || {}
  const wStats  = waitlist?.stats

  const totalSignups = Object.values(signupsByCampaign || {}).reduce((s, v) => s + v, 0)
  const overallCPL   = totalSignups > 0 ? totals.spend / totalSignups : null
  const overallCPC   = totals.clicks > 0 ? totals.spend / totals.clicks : null

  // ── Funnel section ──────────────────────────────────────────────────────────
  const imp  = totals.impressions || 0
  const clk  = totals.clicks || 0
  const lpv  = totals.landingViews || 0
  const sgn  = totalSignups

  const ctrVal  = imp  > 0 ? (clk / imp)  * 100 : null
  const lpRate  = clk  > 0 ? (lpv / clk)  * 100 : null
  const wlRate  = lpv  > 0 ? (sgn / lpv)  * 100 : null

  function funnelStage(val, label, rate, rateLabel) {
    return `<div style="flex:1;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#111">${k(val)}</div>
      <div style="font-size:11px;color:#999;margin-top:3px">${label}</div>
      ${rate != null ? `<div style="font-size:10px;color:#6366f1;font-weight:600;margin-top:6px">→ ${pct(rate)} ${rateLabel}</div>` : ''}
    </div>`
  }

  const funnelHTML = `
    <div style="display:flex;align-items:flex-start;gap:0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:8px">
      ${funnelStage(imp,  'Impressions', ctrVal, 'CTR')}
      <div style="color:#d1d5db;font-size:20px;padding:16px 0;flex:0">→</div>
      ${funnelStage(clk,  'Link Clicks', lpRate, 'clicked LP')}
      <div style="color:#d1d5db;font-size:20px;padding:16px 0;flex:0">→</div>
      ${funnelStage(lpv,  'Landing Views', wlRate, 'signed up')}
      <div style="color:#d1d5db;font-size:20px;padding:16px 0;flex:0">→</div>
      ${funnelStage(sgn,  'Waitlist Signups', null, '')}
    </div>
    <p style="font-size:11px;color:#999;margin-top:6px">
      Cost per click: ${overallCPC ? eur(overallCPC) : '—'} &nbsp;·&nbsp;
      Cost per landing view: ${lpv > 0 ? eur(totals.spend / lpv) : '—'} &nbsp;·&nbsp;
      Cost per signup: ${overallCPL ? eur(overallCPL) : '—'}
    </p>`

  // ── Angle performance table ─────────────────────────────────────────────────
  const angleRows = (angleStats || []).map(a => `<tr>
    ${td(badge(a.angle))}
    ${td(a.campaigns)}
    ${td(eur0(a.spend), true, '#111')}
    ${td(k(a.reach))}
    ${td(a.clicks ? k(a.clicks) : '—')}
    ${td(a.ctr != null ? pct(a.ctr) : '—')}
    ${td(a.cpc != null ? eur(a.cpc) : '—', false, a.cpc != null ? '#6366f1' : '')}
    ${td(a.signups || '—', false, a.signups > 0 ? '#16a34a' : '#999')}
    ${td(a.cpl != null ? eur(a.cpl) : '—', a.cpl != null, a.cpl != null ? '#f59e0b' : '')}
    ${td(a.cpm != null ? eur(a.cpm) : '—')}
  </tr>`).join('')

  // ── Campaign table ──────────────────────────────────────────────────────────
  const campaigns = meta?.campaigns || []
  const campRows = campaigns.map(c => {
    const angle  = (labels || {})[c.id] || c.autoAngle || 'other'
    const sups   = (signupsByCampaign || {})[c.id] || 0
    const cpl    = sups > 0 ? c.spend / sups : null
    return `<tr>
      ${td(`<span style="font-size:12px">${c.name}</span>`)}
      ${td(badge(angle))}
      ${td(eur0(c.spend), true)}
      ${td(k(c.reach))}
      ${td(c.clicks ? k(c.clicks) : '—')}
      ${td(c.ctr != null && c.ctr > 0 ? pct(c.ctr) : '—')}
      ${td(c.cpc != null && c.cpc > 0 ? eur(c.cpc) : '—')}
      ${td(sups || '—', false, sups > 0 ? '#16a34a' : '#999')}
      ${td(cpl != null ? eur(cpl) : '—', cpl != null, cpl != null ? '#f59e0b' : '')}
    </tr>`
  }).join('')

  // ── Demographics ────────────────────────────────────────────────────────────
  const ageMap = {}
  ;(meta?.demoRows || []).forEach(r => {
    if (!r.age || r.age === 'unknown' || r.age === 'Unknown') return
    if (!ageMap[r.age]) ageMap[r.age] = { age: r.age, spend: 0, reach: 0 }
    ageMap[r.age].spend += r.spend
    ageMap[r.age].reach += r.reach
  })
  const ageData = Object.values(ageMap).sort((a, b) => a.age.localeCompare(b.age))
  const maxAgeSpend = Math.max(...ageData.map(a => a.spend), 1)

  const ageHTML = ageData.map(a => `
    <div style="display:grid;grid-template-columns:80px 1fr 70px;align-items:center;gap:12px;margin-bottom:8px">
      <span style="font-size:12px;color:#555">${a.age}</span>
      <div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden">
        <div style="height:100%;background:#6366f1;border-radius:4px;width:${(a.spend / maxAgeSpend) * 100}%"></div>
      </div>
      <span style="font-size:12px;font-weight:600;text-align:right">${eur0(a.spend)}</span>
    </div>`).join('')

  const genderMap = {}
  ;(meta?.demoRows || []).forEach(r => {
    if (!r.gender || r.gender === 'unknown') return
    if (!genderMap[r.gender]) genderMap[r.gender] = { gender: r.gender, spend: 0 }
    genderMap[r.gender].spend += r.spend
  })
  const totalGenderSpend = Object.values(genderMap).reduce((s, g) => s + g.spend, 0)
  const genderColors = { male: '#6366f1', female: '#ec4899', unknown: '#9ca3af' }
  const genderHTML = Object.values(genderMap).map(g => `
    <div style="display:grid;grid-template-columns:80px 1fr 70px 50px;align-items:center;gap:12px;margin-bottom:8px">
      <span style="font-size:12px;color:#555;text-transform:capitalize">${g.gender}</span>
      <div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden">
        <div style="height:100%;background:${genderColors[g.gender] || '#6b7280'};border-radius:4px;width:${(g.spend / totalGenderSpend) * 100}%"></div>
      </div>
      <span style="font-size:12px;font-weight:600;text-align:right">${eur0(g.spend)}</span>
      <span style="font-size:11px;color:#999;text-align:right">${pct((g.spend / totalGenderSpend) * 100)}</span>
    </div>`).join('')

  // ── Waitlist section ────────────────────────────────────────────────────────
  const wl = wStats || {}
  const paidPct = wl.total > 0 ? ((wl.paid || 0) / wl.total * 100).toFixed(0) : 0
  const orgPct  = wl.total > 0 ? ((wl.igOrganic || 0) / wl.total * 100).toFixed(0) : 0

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>NIXUS Marketing Report — ${date}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; color: #111; background: white; font-size: 14px; line-height: 1.5; }
    .page { max-width: 960px; margin: 0 auto; padding: 40px 48px; }
    table { width: 100%; border-collapse: collapse; }
    @media print {
      .page { padding: 20px 28px; }
      .pb { page-break-before: always; padding-top: 40px; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="border-bottom:3px solid #6366f1;padding-bottom:24px;margin-bottom:36px;display:flex;align-items:center;gap:16px">
    <div style="width:44px;height:44px;background:#6366f1;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:20px;flex-shrink:0">N</div>
    <div>
      <div style="font-size:26px;font-weight:800;letter-spacing:-.5px">NIXUS Marketing Report</div>
      <div style="font-size:12px;color:#999;margin-top:2px">Generated ${date} &nbsp;·&nbsp; nixussports.com waitlist dashboard</div>
    </div>
  </div>

  <!-- KPI Overview -->
  <div style="margin-bottom:36px">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#111;border-bottom:1px solid #e5e7eb;padding-bottom:10px;margin-bottom:20px">Key Metrics</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
      ${kpiCard('Total Ad Spend', meta ? eur0(totals.spend) : '—', `${campaigns.length} campaigns`, '#ec4899')}
      ${kpiCard('Cost per Lead (CPL)', overallCPL ? eur(overallCPL) : '—', 'spend ÷ paid signups', '#f59e0b')}
      ${kpiCard('Cost per Click (CPC)', overallCPC ? eur(overallCPC) : '—', 'spend ÷ link clicks', '#6366f1')}
      ${kpiCard('Paid Signups', totalSignups || '—', wl.total ? `of ${wl.total} total waitlist` : '', '#16a34a')}
      ${kpiCard('Total Reach', meta ? k(totals.reach) : '—', 'unique accounts on Meta', '#8b5cf6')}
      ${kpiCard('Link Clicks', totals.clicks ? k(totals.clicks) : '—', 'total ad link clicks', '#14b8a6')}
      ${kpiCard('Landing Page Views', totals.landingViews ? k(totals.landingViews) : '—', 'people who saw the landing page', '#f97316')}
      ${kpiCard('Waitlist Total', wl.total || '—', `${wl.confirmed || 0} confirmed emails`, '#6b7280')}
    </div>
  </div>

  ${imp > 0 ? `
  <!-- Funnel -->
  <div style="margin-bottom:36px">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#111;border-bottom:1px solid #e5e7eb;padding-bottom:10px;margin-bottom:20px">Full Conversion Funnel</div>
    ${funnelHTML}
  </div>` : ''}

  <!-- Angle Performance -->
  ${angleStats?.length > 0 ? `
  <div style="margin-bottom:36px">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#111;border-bottom:1px solid #e5e7eb;padding-bottom:10px;margin-bottom:20px">Angle Performance</div>
    <table>
      <thead><tr>${['Angle','#','Spend','Reach','Clicks','CTR','CPC','Signups','CPL','CPM'].map(th).join('')}</tr></thead>
      <tbody>${angleRows}</tbody>
      <tfoot><tr>
        ${td('TOTAL', true)}
        ${td(campaigns.length, true)}
        ${td(eur0(totals.spend), true, '#111')}
        ${td(k(totals.reach), true)}
        ${td(totals.clicks ? k(totals.clicks) : '—', true)}
        ${td(totals.impressions > 0 && totals.clicks ? pct((totals.clicks / totals.impressions) * 100) : '—', true)}
        ${td(overallCPC ? eur(overallCPC) : '—', true, '#6366f1')}
        ${td(totalSignups || '—', true, '#16a34a')}
        ${td(overallCPL ? eur(overallCPL) : '—', true, '#f59e0b')}
        ${td(totals.impressions > 0 ? eur((totals.spend / totals.impressions) * 1000) : '—', true)}
      </tr></tfoot>
    </table>
  </div>` : ''}

  <!-- Campaign Detail — page break -->
  <div class="pb">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#111;border-bottom:1px solid #e5e7eb;padding-bottom:10px;margin-bottom:20px">Campaign Detail</div>
    <table>
      <thead><tr>${['Campaign','Angle','Spend','Reach','Clicks','CTR','CPC','Signups','CPL'].map(th).join('')}</tr></thead>
      <tbody>${campRows}</tbody>
      <tfoot><tr>
        ${td('TOTAL', true)}
        ${td('', true)}
        ${td(eur0(totals.spend), true, '#111')}
        ${td(k(totals.reach), true)}
        ${td(totals.clicks ? k(totals.clicks) : '—', true)}
        ${td(totals.impressions > 0 && totals.clicks ? pct((totals.clicks / totals.impressions) * 100) : '—', true)}
        ${td(overallCPC ? eur(overallCPC) : '—', true, '#6366f1')}
        ${td(totalSignups || '—', true, '#16a34a')}
        ${td(overallCPL ? eur(overallCPL) : '—', true, '#f59e0b')}
      </tr></tfoot>
    </table>
  </div>

  <!-- Demographics -->
  ${ageData.length > 0 || Object.keys(genderMap).length > 0 ? `
  <div style="margin-top:36px">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#111;border-bottom:1px solid #e5e7eb;padding-bottom:10px;margin-bottom:20px">Demographics (Meta Spend Distribution)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px">
      <div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#999;margin-bottom:12px">Spend by Age Group</div>
        ${ageHTML}
      </div>
      <div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#999;margin-bottom:12px">Spend by Gender</div>
        ${genderHTML}
      </div>
    </div>
  </div>` : ''}

  <!-- Waitlist Overview -->
  ${wl.total ? `
  <div style="margin-top:36px;padding-top:36px;border-top:1px solid #e5e7eb">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#111;margin-bottom:20px">Waitlist Overview</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
      ${kpiCard('Total Signups', wl.total, '', '#111')}
      ${kpiCard('Confirmed', wl.confirmed || 0, 'email confirmed', '#16a34a')}
      ${kpiCard('Paid (Meta Ads)', `${wl.paid || 0} (${paidPct}%)`, 'first-touch UTM paid', '#6366f1')}
      ${kpiCard('Organic', `${wl.igOrganic || 0} (${orgPct}%)`, 'IG organic / direct', '#14b8a6')}
    </div>
    ${wl.langData?.length > 0 ? `
    <div style="margin-top:24px">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#999;margin-bottom:12px">Top Languages</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${wl.langData.slice(0, 8).map(l => `
          <span style="border:1px solid #e5e7eb;border-radius:999px;padding:3px 12px;font-size:12px">
            ${l.name} <strong>${l.value}</strong>
          </span>`).join('')}
      </div>
    </div>` : ''}
  </div>` : ''}

  <!-- Footer -->
  <div style="margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:11px;color:#ccc">NIXUS Sports — Confidential</span>
    <span style="font-size:11px;color:#ccc">nixussports.com &nbsp;·&nbsp; ${date}</span>
  </div>

</div>
<script>window.print()</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) { alert('Pop-up blocked — please allow pop-ups for this site and try again.'); return }
  w.document.write(html)
  w.document.close()
}
