import heroPortrait from '../../assets/hero-proksion.webp'
import markerPixel from '../../assets/icon-marker-pixel.svg'
import styles from './HeroSection.module.css'

/** 1920×1080 first-paint curtain panel. Wrapped by App in the dismissable
 *  overlay — purely visual. */
export function HeroSection() {
  return (
    <div className={styles.screen} data-screen-label="01 Home" data-test="hero">
      <div className={styles.canvas} data-test="hero-canvas">
        <div className={styles.portrait} data-test="hero-portrait">
          <img src={heroPortrait} alt="" />
        </div>

        <div className={styles.textBlock} data-test="hero-text">
          <div className={styles.wordmark} data-test="hero-wordmark">PROKSION</div>

          <div className={styles.portfolio} data-test="hero-portfolio">
            <div>PORT</div>
            <div className={styles.portfolioLine2}>FOLIO</div>
          </div>

          <div className={styles.marker} data-test="hero-marker">
            <img src={markerPixel} alt="" />
          </div>
        </div>
      </div>
    </div>
  )
}
