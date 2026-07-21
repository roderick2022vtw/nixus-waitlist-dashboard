const KEY = 'nixus_campaign_labels'

export function loadLabels() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveLabel(campaignId, label) {
  const labels = loadLabels()
  if (label) labels[campaignId] = label
  else delete labels[campaignId]
  localStorage.setItem(KEY, JSON.stringify(labels))
}

export const ANGLES = [
  'competitor',
  'gadget',
  'padel reel',
  'sustainability',
  'performance',
  'founder',
  'launch discount',
]

export const ANGLE_COLORS = {
  'competitor':      '#ef4444',
  'gadget':          '#6366f1',
  'padel reel':      '#22d3ee',
  'sustainability':  '#a3e635',
  'performance':     '#f59e0b',
  'founder':         '#ec4899',
  'launch discount': '#8b5cf6',
}
