// The fixed list of anonymous usage events, shared by the app and worker/index.ts.
export const EVENTS = [
  'search_zip',
  'search_location',
  'open_clinic',
  'tap_call',
  'tap_directions',
  'coverage_check',
  'switch_language',
  'open_help',
  'share_clinic',
] as const
export type MetricEvent = (typeof EVENTS)[number]
