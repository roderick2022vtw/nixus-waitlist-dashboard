import Papa from 'papaparse'

const FLAG_MAP = {
  nl: '🇳🇱', en: '🇬🇧', es: '🇪🇸', de: '🇩🇪', it: '🇮🇹', fr: '🇫🇷',
  pt: '🇵🇹', da: '🇩🇰', pl: '🇵🇱', sv: '🇸🇪', no: '🇳🇴', fi: '🇫🇮',
  zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', ar: '🇸🇦', ru: '🇷🇺', tr: '🇹🇷',
}

const LANG_NAMES = {
  nl: 'Dutch', en: 'English', es: 'Spanish', de: 'German', it: 'Italian',
  fr: 'French', pt: 'Portuguese', da: 'Danish', pl: 'Polish', sv: 'Swedish',
  no: 'Norwegian', fi: 'Finnish', zh: 'Chinese', ja: 'Japanese', ko: 'Korean',
  ar: 'Arabic', ru: 'Russian', tr: 'Turkish',
}

function parseTrafficType(row) {
  // Prefer first-touch UTM (what originally brought them), fall back to last-touch
  const med = row._waitlist_first_utm_medium || row._waitlist_utm_medium || ''
  const src = row._waitlist_first_utm_source || row._waitlist_utm_source || ''
  const camp = row._waitlist_first_utm_campaign || row._waitlist_utm_campaign || ''
  const ref = row._waitlist_first_referrer_host || row._waitlist_referrer_host || ''

  if (med === 'paid' && camp) return 'paid'
  if (src === 'ig' && med === 'social') return 'ig-organic'
  if (ref.includes('google')) return 'google'
  if (ref.includes('linkedin') || ref.includes('com.linkedin')) return 'linkedin'
  if (ref.includes('instagram') || ref.includes('l.instagram')) return 'ig-organic'
  if (ref.includes('facebook') || ref.includes('fb.com')) return 'facebook'
  return 'direct'
}

function parseSource(row) {
  const type = parseTrafficType(row)
  if (type === 'paid') return 'Instagram Paid'
  if (type === 'ig-organic') return 'Instagram Organic'
  if (type === 'google') return 'Google'
  if (type === 'linkedin') return 'LinkedIn'
  if (type === 'facebook') return 'Facebook'
  return 'Direct / Type-in'
}

function parseDevice(row) {
  const ua = row._waitlist_user_agent || ''
  const w = parseInt(row._waitlist_screen_width, 10) || 0
  if (/Mobi|Android|iPhone|iPad/i.test(ua) || w < 768) return 'Mobile'
  if (/Tablet|iPad/i.test(ua)) return 'Tablet'
  return 'Desktop'
}

function parseLang(row) {
  return (row._waitlist_browser_language || 'unknown').slice(0, 2).toLowerCase()
}

export function parseWaitlistCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length && !data.length) return reject(errors[0])

        const rows = data.map(r => ({
          id: r.id,
          name: r._waitlist_name || r.Title?.split(' - ')[0] || 'Unknown',
          email: r._waitlist_email || '',
          signupAt: r._waitlist_signup_time_iso ? new Date(r._waitlist_signup_time_iso) : null,
          firstSeenAt: r._waitlist_first_seen_at ? new Date(r._waitlist_first_seen_at) : null,
          confirmationSent: !!r._waitlist_confirmation_sent_at,
          surveySubmitted: !!r._waitlist_survey_submitted_at,
          cansPerMonth: r._waitlist_cans_per_month ? parseInt(r._waitlist_cans_per_month, 10) : null,
          ballsPerYear: r._waitlist_balls_per_year ? parseInt(r._waitlist_balls_per_year, 10) : null,
          trafficType: parseTrafficType(r),
          source: parseSource(r),
          device: parseDevice(r),
          lang: parseLang(r),
          langName: LANG_NAMES[parseLang(r)] || parseLang(r),
          langFlag: FLAG_MAP[parseLang(r)] || '🌐',
          timezone: r._waitlist_browser_timezone || '',
          formContext: r._waitlist_form_context || '',
          campaignId: r._waitlist_first_utm_campaign || r._waitlist_utm_campaign || '',
          referrerHost: r._waitlist_referrer_host || r._waitlist_first_referrer_host || '',
        }))

        resolve(rows)
      },
      error: reject,
    })
  })
}

export function computeStats(rows) {
  const total = rows.length
  const confirmed = rows.filter(r => r.confirmationSent).length
  const withSurvey = rows.filter(r => r.surveySubmitted).length

  // Paid vs organic counts
  const paid = rows.filter(r => r.trafficType === 'paid').length
  const igOrganic = rows.filter(r => r.trafficType === 'ig-organic').length
  const google = rows.filter(r => r.trafficType === 'google').length
  const direct = rows.filter(r => r.trafficType === 'direct').length
  const other = total - paid - igOrganic - google - direct

  const channelData = [
    { name: 'Instagram Paid', value: paid, color: '#ec4899' },
    { name: 'Instagram Organic', value: igOrganic, color: '#f59e0b' },
    { name: 'Google', value: google, color: '#22d3ee' },
    { name: 'Direct / Type-in', value: direct, color: '#6366f1' },
    ...(other > 0 ? [{ name: 'Other', value: other, color: '#8b5cf6' }] : []),
  ].filter(d => d.value > 0)

  // Campaign ID breakdown (paid only)
  const campaignMap = {}
  rows.filter(r => r.trafficType === 'paid').forEach(r => {
    const id = r.campaignId || 'unknown'
    campaignMap[id] = (campaignMap[id] || 0) + 1
  })
  const campaignData = Object.entries(campaignMap)
    .sort((a, b) => b[1] - a[1])
    .map(([id, signups]) => ({ id, signups }))

  // Growth over time — daily buckets, split paid vs organic
  const byDay = {}
  rows.forEach(r => {
    const d = r.signupAt || r.firstSeenAt
    if (!d) return
    const key = d.toISOString().slice(0, 10)
    if (!byDay[key]) byDay[key] = { paid: 0, organic: 0 }
    if (r.trafficType === 'paid') byDay[key].paid++
    else byDay[key].organic++
  })
  const sortedDays = Object.keys(byDay).sort()
  let cumPaid = 0, cumOrganic = 0
  const growthData = sortedDays.map(date => {
    cumPaid += byDay[date].paid
    cumOrganic += byDay[date].organic
    return {
      date,
      daily: byDay[date].paid + byDay[date].organic,
      dailyPaid: byDay[date].paid,
      dailyOrganic: byDay[date].organic,
      total: cumPaid + cumOrganic,
      totalPaid: cumPaid,
      totalOrganic: cumOrganic,
    }
  })

  // Sources
  const sourceMap = {}
  rows.forEach(r => { sourceMap[r.source] = (sourceMap[r.source] || 0) + 1 })
  const sourceData = Object.entries(sourceMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  // Languages
  const langMap = {}
  rows.forEach(r => {
    const key = `${r.langFlag} ${r.langName}`
    langMap[key] = (langMap[key] || 0) + 1
  })
  const langData = Object.entries(langMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  // Timezones → regions
  const tzMap = {}
  rows.forEach(r => {
    const tz = r.timezone || 'Unknown'
    const region = tz.startsWith('Europe/') ? 'Europe'
      : tz.startsWith('America/') ? 'Americas'
      : tz.startsWith('Asia/') ? 'Asia'
      : tz.startsWith('Australia/') ? 'Oceania'
      : tz.startsWith('Africa/') ? 'Africa'
      : 'Other'
    tzMap[region] = (tzMap[region] || 0) + 1
  })
  const regionData = Object.entries(tzMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  // Devices
  const deviceMap = {}
  rows.forEach(r => { deviceMap[r.device] = (deviceMap[r.device] || 0) + 1 })
  const deviceData = Object.entries(deviceMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  // Survey: cans per month buckets
  const cansBuckets = { '0': 0, '1': 0, '2-3': 0, '4-6': 0, '7-12': 0, '13+': 0 }
  rows.filter(r => r.cansPerMonth !== null).forEach(r => {
    const c = r.cansPerMonth
    if (c === 0) cansBuckets['0']++
    else if (c === 1) cansBuckets['1']++
    else if (c <= 3) cansBuckets['2-3']++
    else if (c <= 6) cansBuckets['4-6']++
    else if (c <= 12) cansBuckets['7-12']++
    else cansBuckets['13+']++
  })
  const cansData = Object.entries(cansBuckets).map(([name, value]) => ({ name, value }))

  // Survey: balls per year
  const ballsBuckets = { '0-24': 0, '25-48': 0, '49-72': 0, '73-120': 0, '120+': 0 }
  rows.filter(r => r.ballsPerYear !== null).forEach(r => {
    const b = r.ballsPerYear
    if (b <= 24) ballsBuckets['0-24']++
    else if (b <= 48) ballsBuckets['25-48']++
    else if (b <= 72) ballsBuckets['49-72']++
    else if (b <= 120) ballsBuckets['73-120']++
    else ballsBuckets['120+']++
  })
  const ballsData = Object.entries(ballsBuckets).map(([name, value]) => ({ name, value }))

  // Average cans/balls
  const cansArr = rows.filter(r => r.cansPerMonth !== null).map(r => r.cansPerMonth)
  const ballsArr = rows.filter(r => r.ballsPerYear !== null).map(r => r.ballsPerYear)
  const avgCans = cansArr.length ? (cansArr.reduce((a, b) => a + b, 0) / cansArr.length).toFixed(1) : '—'
  const avgBalls = ballsArr.length ? Math.round(ballsArr.reduce((a, b) => a + b, 0) / ballsArr.length) : '—'

  // Form context
  const formMap = {}
  rows.forEach(r => {
    const ctx = r.formContext || 'unknown'
    formMap[ctx] = (formMap[ctx] || 0) + 1
  })
  const formData = Object.entries(formMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  return {
    total, confirmed, withSurvey,
    paid, igOrganic, google, direct,
    channelData, campaignData,
    growthData, sourceData, langData, regionData, deviceData,
    cansData, ballsData, formData,
    avgCans, avgBalls,
  }
}
