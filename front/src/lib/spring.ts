// Спринг-анимации для модалки работы — рукописная замена motion/framer (0 КБ к бандлу).
// Физику пружины симулируем заранее (60 кадров/с) и отдаём браузеру массивом WAAPI-кейфреймов
// с linear-интерполяцией: анимация играет на компоузере (только transform/opacity),
// без JS в кадре и без ререндеров React. Референс инерции — iOS/app-store (motion.dev).

export interface SpringOptions {
  stiffness?: number
  damping?: number
  mass?: number
}

interface SpringTrack {
  /** Прогресс 0→1 покадрово; может перелетать 1 (overshoot). */
  frames: number[]
  /** Длительность трека, мс. */
  duration: number
}

const FPS = 60
const MAX_FRAMES = 600 // страховка от незатухающих параметров (10 с)

/** Симуляция пружины: точка из x=0 в x=1, стартовая скорость 0, до успокоения. */
function springFrames({ stiffness = 300, damping = 30, mass = 1 }: SpringOptions = {}): SpringTrack {
  const dt = 1 / FPS
  let x = 0
  let v = 0
  const frames: number[] = [0]
  for (let i = 0; i < MAX_FRAMES; i++) {
    v += ((-stiffness * (x - 1) - damping * v) / mass) * dt
    x += v * dt
    frames.push(x)
    if (Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01) break
  }
  frames[frames.length - 1] = 1
  return { frames, duration: ((frames.length - 1) / FPS) * 1000 }
}

/** Смещение/масштаб элемента относительно его естественного места (identity = 0,0,1,1). */
export interface TransformDelta {
  x: number
  y: number
  sx?: number
  sy?: number
}

/** transform для доли делты k: k=1 — полная делта (позиция/масштаб тайла), k=0 — identity. */
function frameTransform(d: TransformDelta, k: number): string {
  const sx = d.sx ?? 1
  const sy = d.sy ?? 1
  return `translate(${d.x * k}px, ${d.y * k}px) scale(${1 + (sx - 1) * k}, ${1 + (sy - 1) * k})`
}

export interface SpringAnimateOptions {
  spring?: SpringOptions
  delay?: number
  /** Параллельный fade по тому же треку: 'in' 0→1, 'out' 1→0 (успевает за первую треть пути). */
  fade?: 'in' | 'out'
  /** transform-origin; по умолчанию '0 0' (FLIP-геометрия считается от верхнего левого угла). */
  origin?: string
}

/** Быстрый fade внутри спринг-трека. */
function fadeAt(p: number, dir: 'in' | 'out'): number {
  const t = Math.min(1, Math.max(0, p / 0.35))
  return dir === 'in' ? t : 1 - t
}

function buildKeyframes(d: TransformDelta, opts: SpringAnimateOptions, toDelta: boolean): { keyframes: Keyframe[]; duration: number } {
  const { frames, duration } = springFrames(opts.spring)
  const keyframes = frames.map((p) => ({
    transform: frameTransform(d, toDelta ? p : 1 - p),
    transformOrigin: opts.origin ?? '0 0',
    ...(opts.fade ? { opacity: fadeAt(p, opts.fade) } : {}),
  }))
  return { keyframes, duration }
}

/**
 * Спринг от `from`-смещения к естественному положению (transform: none).
 * После завершения анимация снимается (финал = обычный layout, fill не копится).
 */
export function springTo(el: HTMLElement, from: TransformDelta, opts: SpringAnimateOptions = {}): Animation {
  const { keyframes, duration } = buildKeyframes(from, opts, false)
  const anim = el.animate(keyframes, { duration, delay: opts.delay ?? 0, easing: 'linear', fill: 'both' })
  anim.finished.then(() => anim.cancel()).catch(() => {}) // отмена = финальный кадр, визуально ноль
  return anim
}

/**
 * Спринг ИЗ естественного положения В `to`-смещение (закрытие: полёт обратно в тайл).
 * fill: 'both' сохраняется — элемент остаётся в конечной точке до размонтирования модалки.
 */
export function springFrom(el: HTMLElement, to: TransformDelta, opts: SpringAnimateOptions = {}): Animation {
  const { keyframes, duration } = buildKeyframes(to, opts, true)
  return el.animate(keyframes, { duration, delay: opts.delay ?? 0, easing: 'linear', fill: 'both' })
}

/** Простой fade; 'in' после завершения снимается (естественная opacity), 'out' остаётся до размонтирования. */
export function fade(el: HTMLElement, dir: 'in' | 'out', { duration = 220, delay = 0 } = {}): Animation {
  const frames = dir === 'in' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }]
  const anim = el.animate(frames, { duration, delay, easing: 'ease', fill: 'both' })
  if (dir === 'in') anim.finished.then(() => anim.cancel()).catch(() => {})
  return anim
}

/** Ожидание пачки анимаций (cancel/reject не роняет цепочку закрытия). */
export function whenDone(anims: Animation[]): Promise<unknown> {
  return Promise.allSettled(anims.map((a) => a.finished))
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
