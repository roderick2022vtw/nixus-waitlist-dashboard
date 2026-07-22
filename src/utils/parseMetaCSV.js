import Papa from 'papaparse'

export const ANGLE_COLORS = {
  'performance':    '#f59e0b',
  'cost saving':    '#22d3ee',
  'sustainability': '#a3e635',
  'gadget/tech':    '#6366f1',
  'launch':         '#ec4899',
  'other':          '#6b7280',
}

export const ANGLES = Object.keys(ANGLE_COLORS)

export function classifyAngle(name = '') {
  const n = name.toLowerCase()
  if (n.includes('flat') || n.includes('can you see')) return 'performance'
  if (n.includes('buying air') || n.includes('keep buying')) return 'cost saving'
  if (n.includes('500 million') || n.includes('million tennis') || n.includes('million padel')) return 'sustainability'
  if (n.includes('world') || n.includes('first ball') || n.includes('charge') || n.includes('charger')) return 'gadget/tech'
  if (n.includes('final design') || n.includes('confirmed') || n.includes('launch') || n.includes('ready for')) return 'launch'
  return 'other'
}

function parseNum(v) {
  if (!v || v === '') return 0
  return parseFloat(String(v).replace(',', '.')) || 0
}

export function parseMetaCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length && !data.length) return reject(errors[0])

        const rows = data
          .filter(r => parseNum(r['Besteed bedrag (EUR)']) > 0)
          .map(r => {
            const name = r['Campagnenaam'] || ''
            const angle = classifyAngle(name)
            const caption = name.replace(/^Instagram-bericht:\s*/i, '').replace(/\n.*/s, '').trim()
            return {
              name,
              caption,
              angle,
              status: r['Campagneweergave'] || '',
              spend:        parseNum(r['Besteed bedrag (EUR)']),
              reach:        parseNum(r['Bereik']),
              impressions:  parseNum(r['Weergaven']),
              frequency:    parseNum(r['Frequentie']),
              results:      parseNum(r['Resultaten']),
              clicks:       parseNum(r['Klikken op links']),
              cpc:          parseNum(r['CPC (kosten per klik op link) (EUR)']),
              ctr:          parseNum(r['CTR (doorklikratio voor klikken op link)']),
              cpm:          parseNum(r['CPM (kosten per 1000 weergaven) (EUR)']),
              landingViews: parseNum(r['Weergaven van landingspagina']),
              costPerLanding: parseNum(r['Kosten per weergave van landingspagina (EUR)']),
              budget:       parseNum(r['Budget advertentieset']),
              startDate:    r['Start rapportage'] || '',
              endDate:      r['Einde rapportage'] || '',
            }
          })

        // Group by angle
        const angleMap = {}
        rows.forEach(r => {
          if (!angleMap[r.angle]) {
            angleMap[r.angle] = {
              angle: r.angle,
              spend: 0, reach: 0, impressions: 0, clicks: 0,
              landingViews: 0, campaigns: 0,
            }
          }
          const a = angleMap[r.angle]
          a.spend        += r.spend
          a.reach        += r.reach
          a.impressions  += r.impressions
          a.clicks       += r.clicks
          a.landingViews += r.landingViews
          a.campaigns    += 1
        })

        const byAngle = Object.values(angleMap).map(a => ({
          ...a,
          cpc: a.clicks > 0 ? a.spend / a.clicks : 0,
          ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
          cpm: a.impressions > 0 ? (a.spend / a.impressions) * 1000 : 0,
          color: ANGLE_COLORS[a.angle] || '#6b7280',
        })).sort((a, b) => b.clicks - a.clicks)

        const totals = {
          spend:       rows.reduce((s, r) => s + r.spend, 0),
          reach:       rows.reduce((s, r) => s + r.reach, 0),
          clicks:      rows.reduce((s, r) => s + r.clicks, 0),
          impressions: rows.reduce((s, r) => s + r.impressions, 0),
        }
        totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0
        totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
        totals.cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0

        resolve({ rows, byAngle, totals })
      },
      error: reject,
    })
  })
}
