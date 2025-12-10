export const ALERT_THRESHOLD_OPTIONS = [5, 10, 15, 20, 30, 40];

export const MIN_ALERT_THRESHOLD = 5;
export const MAX_ALERT_THRESHOLD = 80;

export function clampAlertThreshold(value: number): number {
  if (!Number.isFinite(value)) {
    return ALERT_THRESHOLD_OPTIONS[0];
  }
  return Math.min(MAX_ALERT_THRESHOLD, Math.max(MIN_ALERT_THRESHOLD, Math.abs(value)));
}
