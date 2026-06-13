import heroPortrait from '../../assets/hero-proksion.png'
import markerPixel from '../../assets/icon-marker-pixel.svg'
import styles from './HeroSection.module.css'

/** 1920×1080 first-paint curtain panel. Wrapped by App in the dismissable
 *  overlay — purely visual. */
export function HeroSection() {
  return (
    <div className={styles.screen} data-screen-label="01 Home">
      <div className={styles.canvas}>
        <div className={styles.portrait}>
          <img src={heroPortrait} alt="" />
        </div>

        <div className={styles.textBlock}>
          <div className={styles.wordmark}>PROKSION</div>

          <div className={styles.portfolio}>
            <div>PORT</div>
            <div className={styles.portfolioLine2}>FOLIO</div>
          </div>

          <div className={styles.marker}>
            <img src={markerPixel} alt="" />
          </div>
        </div>
      </div>
    </div>
  )
}
