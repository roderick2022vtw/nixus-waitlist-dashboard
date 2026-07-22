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
  if (n.includes('final design') || n.includes('confirmed') || n.includes('launch') || n.includes('ready for') || n.includes('go live') || n.includes('summer')) return 'launch'
  return 'other'
}

function n(v) {
  if (!v || v === '') return 0
  return parseFloat(String(v).replace(',', '.')) || 0
}

// Detect format: alleMETADATA has 'Campagne-ID' column
function isNewFormat(headers) {
  return headers.some(h => h.replace(/^﻿/, '').trim() === 'Campagne-ID')
}

// ── New format: alleMETADATA ──────────────────────────────────────────────────
function parseNewFormat(data) {
  const validRows = data.filter(r => {
    const cid = r['Campagne-ID']?.trim()
    return cid && cid.length > 10
  })

  // Aggregate per campaign ID
  const campMap = {}
  const demoRows = []

  validRows.forEach(r => {
    const cid   = r['Campagne-ID'].trim()
    const name  = r['Campagnenaam'] || ''
    const age   = r['Leeftijd'] || 'unknown'
    const gender = r['Geslacht'] || 'unknown'
    const spend  = n(r['Besteed bedrag (EUR)'])
    const reach  = n(r['Bereik'])
    const imp    = n(r['Weergaven'])

    if (!campMap[cid]) {
      campMap[cid] = {
        id: cid,
        name: name.replace(/^Instagram-bericht:\s*/i, '').replace(/\n.*/s, '').trim(),
        fullName: name,
        autoAngle: classifyAngle(name),
        spend: 0, reach: 0, impressions: 0,
      }
    }
    campMap[cid].spend       += spend
    campMap[cid].reach       += reach
    campMap[cid].impressions += imp

    demoRows.push({ campaignId: cid, age, gender, spend, reach, impressions: imp })
  })

  const campaigns = Object.values(campMap).sort((a, b) => b.spend - a.spend)
  const totals = {
    spend:       campaigns.reduce((s, c) => s + c.spend, 0),
    reach:       campaigns.reduce((s, c) => s + c.reach, 0),
    impressions: campaigns.reduce((s, c) => s + c.impressions, 0),
  }
  totals.cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0

  return { campaigns, demoRows, totals, format: 'alleMETADATA' }
}

// ── Old format: Campagnes CSV (fallback) ──────────────────────────────────────
function parseOldFormat(data) {
  const rows = data.filter(r => n(r['Besteed bedrag (EUR)']) > 0).map(r => {
    const name = r['Campagnenaam'] || ''
    return {
      id: null,
      name: name.replace(/^Instagram-bericht:\s*/i, '').replace(/\n.*/s, '').trim(),
      fullName: name,
      autoAngle: classifyAngle(name),
      spend:        n(r['Besteed bedrag (EUR)']),
      reach:        n(r['Bereik']),
      impressions:  n(r['Weergaven']),
      clicks:       n(r['Klikken op links']),
      cpc:          n(r['CPC (kosten per klik op link) (EUR)']),
      ctr:          n(r['CTR (doorklikratio voor klikken op link)']),
      landingViews: n(r['Weergaven van landingspagina']),
      status:       r['Campagneweergave'] || '',
    }
  })

  const totals = {
    spend:       rows.reduce((s, r) => s + r.spend, 0),
    reach:       rows.reduce((s, r) => s + r.reach, 0),
    impressions: rows.reduce((s, r) => s + r.impressions, 0),
    clicks:      rows.reduce((s, r) => s + (r.clicks || 0), 0),
  }
  totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0
  totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  totals.cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0

  return { campaigns: rows, demoRows: [], totals, format: 'old' }
}

export function parseMetaCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.replace(/^﻿/, '').trim(),
      complete: ({ data, errors }) => {
        if (errors.length && !data.length) return reject(errors[0])
        const headers = Object.keys(data[0] || {})
        const result = isNewFormat(headers) ? parseNewFormat(data) : parseOldFormat(data)
        resolve(result)
      },
      error: reject,
    })
  })
}

// Build angle-level aggregation given campaigns + manual labels + waitlist signups
export function buildAngleStats(campaigns, labels, waitlistSignupsByCampaign = {}) {
  const angleMap = {}

  campaigns.forEach(c => {
    const angle = labels[c.id] || c.autoAngle || 'other'
    if (!angleMap[angle]) {
      angleMap[angle] = {
        angle,
        color: ANGLE_COLORS[angle] || '#6b7280',
        spend: 0, reach: 0, impressions: 0, clicks: 0, signups: 0, campaigns: 0,
      }
    }
    const a = angleMap[angle]
    a.spend       += c.spend
    a.reach       += c.reach
    a.impressions += c.impressions
    a.clicks      += c.clicks || 0
    a.signups     += waitlistSignupsByCampaign[c.id] || 0
    a.campaigns   += 1
  })

  return Object.values(angleMap).map(a => ({
    ...a,
    cpl: a.signups > 0 ? a.spend / a.signups : null,
    cpc: a.clicks  > 0 ? a.spend / a.clicks  : null,
    cpm: a.impressions > 0 ? (a.spend / a.impressions) * 1000 : null,
  })).sort((a, b) => b.signups - a.signups || b.spend - a.spend)
}
