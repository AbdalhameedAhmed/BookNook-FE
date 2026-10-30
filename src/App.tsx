import { useEffect, useState } from 'react';
import { ArrowRight, Languages, Menu, UserRound, X } from 'lucide-react';
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute, useAuth } from './auth';
import Storefront from './pages/Storefront';
import BookDetail from './pages/BookDetail';
import SignIn from './pages/SignIn';
import { AccountLayout, AccountOverview, MyBooksPage, RequestsPage, TransactionsPage } from './pages/Account';
import { useLanguage } from './i18n';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Storefront />} />
        <Route path="/books/:listingId" element={<BookDetail />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />
      </Route>
      <Route path="/account" element={<ProtectedRoute><AccountLayout /></ProtectedRoute>}>
        <Route index element={<AccountOverview />} />
        <Route path="books" element={<MyBooksPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function PublicLayout() {
  const { session } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="site-frame">
      <header className="site-header">
        <Link to="/" className="brand" aria-label="BookNook home">
          <span className="brand-symbol">b<span>.</span></span>
          <span className="brand-word">BookNook<small>{t('brandTag')}</small></span>
        </Link>
        <nav className={menuOpen ? 'main-nav nav-open' : 'main-nav'} aria-label={t('explore')}>
          <a href="/#the-shelf">{t('explore')}</a>
          <a href="/#how-it-works">{t('how')}</a>
          <Link to={session ? '/account/books' : '/signin'}>{t('listBook')}</Link>
        </nav>
        <div className="header-actions">
          <button className="language-toggle" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} aria-label={language === 'en' ? t('switchToArabic') : t('switchToEnglish')}>
            <Languages size={15} /><span>{t('language')}</span>
          </button>
          {session ? (
            <Link className="header-account" to="/account"><UserRound size={16} /><span>{t('mySpace')}</span><ArrowRight className="flip-rtl" size={15} /></Link>
          ) : (
            <Link className="header-signin" to="/signin">{t('signIn')} <ArrowRight className="flip-rtl" size={16} /></Link>
          )}
          <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? t('closeMenu') : t('openMenu')}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <Link to="/" className="footer-brand"><span className="brand-symbol">b<span>.</span></span> BookNook</Link>
        <span>{t('footerLocal')}</span>
        <span>{t('footerSafety')}</span>
      </footer>
    </div>
  );
}

function NotFound() {
  const { language } = useLanguage();
  return <main className="detail-missing"><span>404 / {language === 'ar' ? 'صفحة غير موجودة' : 'WRONG TURN'}</span><h1>{language === 'ar' ? 'هذه الصفحة ليست على الرفّ.' : 'That page isn’t on this shelf.'}</h1><Link to="/">{language === 'ar' ? 'العودة إلى بوك نوك' : 'Back to BookNook'} <ArrowRight className="flip-rtl" size={16} /></Link></main>;
}
