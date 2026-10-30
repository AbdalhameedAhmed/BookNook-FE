import { useEffect, useState } from 'react';
import { BookOpen, Compass, Languages, Menu, ShieldCheck, X } from 'lucide-react';
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute, useAuth } from './auth';
import Storefront from './pages/Storefront';
import BookDetail from './pages/BookDetail';
import SignIn from './pages/SignIn';
import { AccountLayout, AccountOverview, MyBooksPage, RequestsPage, TransactionsPage } from './pages/Account';
import { useLanguage } from './i18n';
import { Button, buttonVariants } from './components/ui/button';
import { EmptyState } from './components/ui/empty-state';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Storefront />} />
        <Route path="/books/:listingId" element={<BookDetail />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/account" element={<ProtectedRoute><AccountLayout /></ProtectedRoute>}>
          <Route index element={<AccountOverview />} />
          <Route path="books" element={<MyBooksPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function SiteLayout() {
  const { session } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, location.hash]);

  const displayName = session?.user.user_metadata?.display_name || session?.user.email || '';
  const navLinks = (
    <>
      <Link className="nav-link" to={{ pathname: '/', hash: '#listings' }}>{t('explore')}</Link>
      <Link className="nav-link" to={{ pathname: '/', hash: '#how-it-works' }}>{t('how')}</Link>
      <Link className="nav-link" to={session ? '/account/books?new=1' : '/signin'} state={session ? undefined : { from: '/account/books' }}>{t('listBook')}</Link>
    </>
  );

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">{t('skipToContent')}</a>
      <header className="site-header">
        <div className="container header-inner">
          <Logo tagline={t('brandTag')} />
          <nav className="nav" aria-label={t('mainNav')}>{navLinks}</nav>
          <div className="header-actions">
            <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} aria-label={language === 'en' ? t('switchToArabic') : t('switchToEnglish')}>
              <Languages size={16} /><span className="hide-sm">{t('language')}</span>
            </Button>
            {session ? (
              <Link className="account-chip" to="/account">
                <span className="avatar avatar-sm" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>
                <span className="hide-sm">{t('mySpace')}</span>
              </Link>
            ) : location.pathname === '/signin' ? null : (
              <Link className={buttonVariants({ size: 'sm' })} to="/signin">{t('signIn')}</Link>
            )}
            <Button variant="ghost" size="icon" className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? t('closeMenu') : t('openMenu')}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>
        {menuOpen ? <nav className="mobile-nav" aria-label={t('mainNav')}><div className="container">{navLinks}</div></nav> : null}
      </header>

      <main id="main" className="app-main"><Outlet /></main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Logo tagline={t('brandTag')} inverted />
            <p>{t('footerAbout')}</p>
          </div>
          <div>
            <h2 className="footer-title">{t('footerExplore')}</h2>
            <ul className="footer-links">
              <li><Link to={{ pathname: '/', hash: '#listings' }}>{t('explore')}</Link></li>
              <li><Link to={{ pathname: '/', hash: '#how-it-works' }}>{t('how')}</Link></li>
              <li><Link to={session ? '/account/books?new=1' : '/signin'}>{t('listBook')}</Link></li>
              <li><Link to={session ? '/account' : '/signin'}>{session ? t('mySpace') : t('signIn')}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="footer-title">{t('footerSafetyTitle')}</h2>
            <ul className="footer-links footer-safety">
              <li><ShieldCheck size={16} aria-hidden="true" />{t('safetyMeet')}</li>
              <li><ShieldCheck size={16} aria-hidden="true" />{t('safetyPay')}</li>
              <li><ShieldCheck size={16} aria-hidden="true" />{t('safetyPrivate')}</li>
            </ul>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} BookNook. {t('rightsReserved')}</span>
          <span>{t('detailSafety')}</span>
        </div>
      </footer>
    </div>
  );
}

function Logo({ tagline, inverted = false }: { tagline: string; inverted?: boolean }) {
  return (
    <Link to="/" className={inverted ? 'logo logo-inverted' : 'logo'} aria-label="BookNook home">
      <span className="logo-mark" aria-hidden="true"><BookOpen size={18} strokeWidth={2.25} /></span>
      <span className="logo-text"><strong>BookNook</strong><small>{tagline}</small></span>
    </Link>
  );
}

function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="container page">
      <EmptyState
        size="large"
        headingLevel="h1"
        icon={<Compass size={28} />}
        title={t('notFoundTitle')}
        description={t('notFoundCopy')}
        action={<Link className={buttonVariants()} to="/">{t('backBooknook')}</Link>}
      />
    </div>
  );
}
