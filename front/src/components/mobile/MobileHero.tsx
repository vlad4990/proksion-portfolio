import heroPortrait from '../../assets/hero-proksion.webp'
import styles from './MobileHero.module.css'

export function MobileHero() {
  return (
    <div className={styles.hero} data-test="hero">
      <div className={styles.portrait} data-test="hero-portrait">
        <img src={heroPortrait} alt="" />
        <div className={styles.fade} />
      </div>

      <div className={styles.wordmark} data-test="hero-wordmark">PROKSION</div>

      <div className={styles.portfolio} data-test="hero-portfolio">
        <span>PORT</span>
        <span>FOLIO</span>
      </div>

      <div className={styles.hint} data-test="hero-hint">↑ свайп / нажми</div>
    </div>
  )
}
