import heroPortrait from '../../assets/hero-proksion.png'
import styles from './MobileHero.module.css'

export function MobileHero() {
  return (
    <div className={styles.hero}>
      <div className={styles.portrait}>
        <img src={heroPortrait} alt="" />
        <div className={styles.fade} />
      </div>

      <div className={styles.wordmark}>PROKSION</div>

      <div className={styles.portfolio}>
        <span>PORT</span>
        <span>FOLIO</span>
      </div>

      <div className={styles.hint}>↑ свайп / нажми</div>
    </div>
  )
}
