export const INSPECTOR_MIN_COMFORTABLE = 480;
export const INSPECTOR_PREFERRED_FRACTION = 0.46;
export const INSPECTOR_SIDEBAR_MIN = 240;
export const INSPECTOR_DETAIL_MIN = 260;

export function estimatedInspectorWidth(containerWidth) {
  const width = Number(containerWidth) || 0;
  if (width <= 0) return 0;
  const preferred = Math.min(
    2000,
    Math.max(INSPECTOR_MIN_COMFORTABLE, width * INSPECTOR_PREFERRED_FRACTION),
  );
  const leftover = width - INSPECTOR_SIDEBAR_MIN - INSPECTOR_DETAIL_MIN;
  return Math.max(0, Math.min(preferred, leftover));
}

export function canShowInspectorColumn(containerWidth) {
  return estimatedInspectorWidth(containerWidth) >= INSPECTOR_MIN_COMFORTABLE;
}
