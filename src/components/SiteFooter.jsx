import { Link } from 'react-router-dom'
import { useT } from '../i18n/useT.js'

export default function SiteFooter() {
  const t = useT()
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Link to="/" className="nav-logo">
          <span className="nav-logo-mark">Q</span>
          <span className="nav-logo-text">Quizora</span>
        </Link>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/#featured">{t('nav.featured')}</Link>
          <Link to="/categories">{t('nav.categories')}</Link>
          <Link to="/#games">{t('nav.games')}</Link>
          <Link to="/#how">{t('nav.how')}</Link>
        </nav>
        <a className="powered" href="https://fortunejack.com" target="_blank" rel="noopener noreferrer">
          <span>{t('footer.powered')}</span>
          <img src="/brand/fortunejack.svg" alt="FortuneJack" width="150" height="17" />
        </a>
        <span className="footer-copy">
          © {new Date().getFullYear()} Quizora. {t('footer.copy')}
        </span>
      </div>
    </footer>
  )
}
