export const PULL_THRESHOLD = 64;

export function installWebPullToRefresh(
  root: HTMLElement,
  onDistance: (distance: number) => void,
  onRefresh: () => void,
) {
  let start: { x: number; y: number; target: HTMLElement } | null = null;
  let distance = 0;
  let refreshing = false;
  let suppressClickUntil = 0;
  const doc = root.ownerDocument;

  const atTop = (target: HTMLElement) => {
    // ScrollViews and lists scroll independently of the browser document.
    for (let element: HTMLElement | null = target; element; element = element.parentElement) {
      if (element.scrollTop > 0) return false;
    }
    return !doc.scrollingElement || doc.scrollingElement.scrollTop <= 0;
  };
  const reset = () => {
    start = null;
    distance = 0;
    if (!refreshing) onDistance(0);
  };
  const touchStart = (event: TouchEvent) => {
    reset();
    const target = event.target as HTMLElement | null;
    if (refreshing || event.touches.length !== 1 || !target ||
      target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"]') ||
      !atTop(target)) return;
    const touch = event.touches[0];
    start = { x: touch.clientX, y: touch.clientY, target };
  };
  const touchMove = (event: TouchEvent) => {
    if (!start) return;
    if (event.touches.length !== 1 || !atTop(start.target)) {
      reset();
      return;
    }
    const x = event.touches[0].clientX - start.x;
    const y = event.touches[0].clientY - start.y;
    if (y < 0 || (Math.abs(x) > 10 && Math.abs(x) > y)) {
      reset();
      return;
    }
    if (y < 10 && distance === 0) return;
    if (!event.cancelable) {
      reset();
      return;
    }
    // A non-passive listener prevents the browser from taking over this pull.
    event.preventDefault();
    distance = Math.min(96, y * 0.5);
    suppressClickUntil = Date.now() + 500;
    onDistance(distance);
  };
  const touchEnd = (event: TouchEvent) => {
    if (!start) return;
    const shouldRefresh = distance >= PULL_THRESHOLD;
    if (distance > 0) {
      if (event.cancelable) event.preventDefault();
      suppressClickUntil = Date.now() + 500;
    }
    reset();
    if (shouldRefresh && !refreshing) {
      refreshing = true;
      onDistance(PULL_THRESHOLD);
      onRefresh();
    }
  };
  const click = (event: MouseEvent) => {
    if (Date.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  root.addEventListener('touchstart', touchStart, { passive: true, capture: true });
  root.addEventListener('touchmove', touchMove, { passive: false, capture: true });
  root.addEventListener('touchend', touchEnd, { passive: false, capture: true });
  root.addEventListener('touchcancel', reset, true);
  root.addEventListener('click', click, true);
  return () => {
    root.removeEventListener('touchstart', touchStart, true);
    root.removeEventListener('touchmove', touchMove, true);
    root.removeEventListener('touchend', touchEnd, true);
    root.removeEventListener('touchcancel', reset, true);
    root.removeEventListener('click', click, true);
  };
}
