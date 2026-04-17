// Shape validation for persisted / imported state. Used by both localStorage
// load and file import so the rules stay in one place.

export function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v)
}

// Loose validation: must be a plain object; if `beds` is present it must be
// an array; if `plants` is present it must be an array. Missing keys are OK —
// migrateState / defaults will fill them in.
export function isValidStateShape(v) {
  if (!isPlainObject(v)) return false
  if ('beds' in v && !Array.isArray(v.beds)) return false
  if ('plants' in v && !Array.isArray(v.plants)) return false
  if ('placements' in v && !Array.isArray(v.placements)) return false
  if ('plan' in v && v.plan !== null && !isPlainObject(v.plan)) return false
  // Legacy shape had `garden` as a plain object.
  if ('garden' in v && v.garden !== null && !isPlainObject(v.garden)) return false
  return true
}

export function safeParseJSON(text) {
  try { return { ok: true, value: JSON.parse(text) } }
  catch (err) { return { ok: false, error: err } }
}
