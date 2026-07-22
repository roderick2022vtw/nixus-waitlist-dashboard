import { ANGLE_COLORS, ANGLES, classifyAngle } from './parseMetaCSV'
export { ANGLE_COLORS, ANGLES }

const KEY = 'nixus_campaign_labels'

export function loadLabels() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') }
  catch { return {} }
}

export function saveLabel(campaignId, label) {
  const labels = loadLabels()
  if (label) labels[campaignId] = label
  else delete labels[campaignId]
  localStorage.setItem(KEY, JSON.stringify(labels))
}

// Pre-fill labels from auto-classification for any campaign not yet labeled
export function autoFillLabels(campaigns) {
  const labels = loadLabels()
  let changed = false
  campaigns.forEach(c => {
    if (c.id && !labels[c.id]) {
      labels[c.id] = c.autoAngle || classifyAngle(c.fullName || c.name)
      changed = true
    }
  })
  if (changed) localStorage.setItem(KEY, JSON.stringify(labels))
}
