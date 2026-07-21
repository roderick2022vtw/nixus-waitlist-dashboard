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

function parseSource(row) {
  const src = row._waitlist_utm_source || row._waitlist_first_utm_source || ''
  const ref = row._waitlist_referrer_host || row._waitlist_first_referrer_host || ''
  if (src === 'ig' || ref.includes('instagram') || ref.includes('l.instagram')) return 'Instagram'
  if (ref.includes('linkedin') || ref.includes('com.linkedin')) return 'LinkedIn'
  if (ref.includes('facebook') || ref.includes('fb.com')) return 'Facebook'
  if (ref.includes('google')) return 'Google'
  if (ref.includes('tiktok')) return 'TikTok'
  if (ref.includes('twitter') || ref.includes('t.co') || ref.includes('x.com')) return 'X / Twitter'
  if (src || ref) return src || ref
  return 'Direct / Organic'
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
          source: parseSource(r),
          device: parseDevice(r),
          lang: parseLang(r),
          langName: LANG_NAMES[parseLang(r)] || parseLang(r),
          langFlag: FLAG_MAP[parseLang(r)] || '🌐',
          timezone: r._waitlist_browser_timezone || '',
          formContext: r._waitlist_form_context || '',
          utmCampaign: r._waitlist_utm_campaign || r._waitlist_first_utm_campaign || '',
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

  // Growth over time — daily buckets
  const byDay = {}
  rows.forEach(r => {
    const d = r.signupAt || r.firstSeenAt
    if (!d) return
    const key = d.toISOString().slice(0, 10)
    byDay[key] = (byDay[key] || 0) + 1
  })
  const sortedDays = Object.keys(byDay).sort()
  let cumulative = 0
  const growthData = sortedDays.map(date => {
    cumulative += byDay[date]
    return { date, daily: byDay[date], total: cumulative }
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
    growthData, sourceData, langData, regionData, deviceData,
    cansData, ballsData, formData,
    avgCans, avgBalls,
  }
}
