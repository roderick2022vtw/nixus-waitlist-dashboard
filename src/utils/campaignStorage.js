import { ANGLE_COLORS, ANGLES } from './parseMetaCSV'
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
