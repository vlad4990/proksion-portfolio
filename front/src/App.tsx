import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route as RouterRoute, Routes, useLocation } from 'react-router'
import { useIsMobile } from './hooks/useIsMobile'
import { ROUTE_TITLES } from './seo'
import type { HeroPhase, Route } from './types'

import { TopNav } from './components/desktop/TopNav'
import { HeroSection } from './components/desktop/HeroSection'
import { AboutSection } from './components/desktop/AboutSection'
import { ProjectsScreen } from './components/desktop/ProjectsScreen'
import { ContactsScreen } from './components/desktop/ContactsScreen'

import { WorkModal } from './components/desktop/WorkModal'

import { MobileHero } from './components/mobile/MobileHero'
import { MobileAbout } from './components/mobile/MobileAbout'
import { MobileProjects } from './components/mobile/MobileProjects'
import { MobileContacts } from './components/mobile/MobileContacts'
import { MobileWorkModal } from './components/mobile/MobileWorkModal'

import styles from './App.module.css'

/** Eased programmatic scroll (used by the desktop nav). */
function smoothScrollTo(target: number, duration = 600) {
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

/** Derive the active top-level screen from the URL path. */
function pathnameToRoute(pathname: string): Route {
  if (pathname.startsWith('/projects')) return 'projects'
  if (pathname.startsWith('/contacts')) return 'contacts'
  return 'home'
}

export default function App() {
  const isMobile = useIsMobile()
  const { pathname } = useLocation()
  const route = pathnameToRoute(pathname)

  // Hero curtain only on a fresh load of the root path; deep links skip it.
  const [heroPhase, setHeroPhase] = useState<HeroPhase>(
    () => (window.location.pathname === '/' ? 'visible' : 'gone'),
  )

  const dismissHero = useCallback(() => {
    setHeroPhase((p) => (p === 'visible' ? 'dismissing' : p))
  }, [])

  // Curtain slide-out finishes → remove from the tree
  useEffect(() => {
    if (heroPhase !== 'dismissing') return
    const t = setTimeout(() => setHeroPhase('gone'), 600)
    return () => clearTimeout(t)
  }, [heroPhase])

  // Lock scroll while the curtain is up. When 'gone' we DON'T touch overflow — the work
  // modal (useScrollLock) manages it then; clearing here would clobber the modal's lock
  // (parent effects run after child effects on mount).
  useEffect(() => {
    if (heroPhase === 'gone') return
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [heroPhase])

  // Any input dismisses the curtain
  useEffect(() => {
    if (heroPhase !== 'visible') return
    const h = () => dismissHero()
    window.addEventListener('wheel', h, { passive: true, once: true })
    window.addEventListener('touchstart', h, { passive: true, once: true })
    window.addEventListener('keydown', h, { once: true })
    return () => {
      window.removeEventListener('wheel', h)
      window.removeEventListener('touchstart', h)
      window.removeEventListener('keydown', h)
    }
  }, [heroPhase, dismissHero])

  // После смены раздела — к началу страницы. Ключ — route (top-level раздел), а не
  // pathname: открытие/закрытие модалки работы внутри /projects скролл не сбрасывает.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  // Заголовок вкладки следует разделу; модалка работы ставит свой в useWorkModal
  // (route при этом не меняется — конфликтов нет).
  useEffect(() => {
    document.title = ROUTE_TITLES[route]
  }, [route])

  const curtainClass = `${styles.heroOverlay}${
    heroPhase === 'dismissing' ? ` ${styles.heroOverlayDismissing}` : ''
  }`

  // ── Mobile tree ───────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {heroPhase !== 'gone' && (
          <div
            className={curtainClass}
            onClick={dismissHero}
            role="button"
            aria-label="Войти на сайт"
            data-test="hero-overlay"
          >
            <MobileHero />
          </div>
        )}

        {heroPhase === 'gone' && (
          <Routes>
            <RouterRoute path="/" element={<MobileAbout />} />
            <RouterRoute path="/projects" element={<MobileProjects />} />
            <RouterRoute path="/projects/:cat/:sub" element={<MobileProjects />} />
            <RouterRoute
              path="/projects/:cat/:sub/:work"
              element={
                <>
                  <MobileProjects />
                  <MobileWorkModal />
                </>
              }
            />
            <RouterRoute path="/contacts" element={<MobileContacts />} />
            <RouterRoute path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </>
    )
  }

  // ── Desktop tree ──────────────────────────────────────────
  const showNav = heroPhase === 'gone'
  // Навигация — ссылки в TopNav; отдельный случай — клик по «домой», когда уже на главной
  // (ссылка не меняет URL, эффект скролла не сработает) — плавно скроллим вверх сами.
  const onHomeClick = () => {
    if (pathname === '/') smoothScrollTo(0)
  }

  return (
    <>
      {heroPhase !== 'gone' && (
        <div
          className={curtainClass}
          onClick={dismissHero}
          role="button"
          aria-label="Войти на сайт"
        >
          <HeroSection />
        </div>
      )}

      <div
        className={styles.navHost}
        style={{ display: showNav ? 'block' : 'none' }}
        data-test="nav-host"
      >
        <TopNav route={route} onHomeClick={onHomeClick} />
      </div>

      <div className={styles.stageWrap} data-test="stage-wrap">
        <div className={styles.stage} data-test="stage">
          <Routes>
            <RouterRoute path="/" element={<AboutSection />} />
            <RouterRoute path="/projects" element={<ProjectsScreen />} />
            <RouterRoute path="/projects/:cat/:sub" element={<ProjectsScreen />} />
            <RouterRoute
              path="/projects/:cat/:sub/:work"
              element={
                <>
                  <ProjectsScreen />
                  <WorkModal />
                </>
              }
            />
            <RouterRoute path="/contacts" element={<ContactsScreen />} />
            <RouterRoute path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </>
  )
}
