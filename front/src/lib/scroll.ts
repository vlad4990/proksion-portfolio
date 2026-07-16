// Плавный программный скролл к абсолютному Y. Используется nav-деревьями (TopNav /
// MobileTabBar) при повторном клике по уже активному пункту: ссылка — no-op, эффект
// скролла в App не срабатывает, поэтому раздел к началу докручиваем сами.

/** Eased programmatic scroll to an absolute Y. */
export function smoothScrollTo(target: number, duration = 600) {
  const start = window.scrollY
  const change = target - start
  if (Math.abs(change) < 2) return
  const t0 = performance.now()
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
  function step(now: number) {
    const t = Math.min(1, (now - t0) / duration)
    window.scrollTo(0, start + change * ease(t))
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
