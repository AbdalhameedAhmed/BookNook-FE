import { useEffect } from 'react';
import { Compass, Inbox, Library, Moon, PlusCircle, Sun, UserRound } from 'lucide-react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ProtectedRoute, useAuth } from './auth';
import Storefront from './pages/Storefront';
import BookDetail from './pages/BookDetail';
import SignIn from './pages/SignIn';
import ResetPassword from './pages/ResetPassword';
import ListingEditor from './pages/ListingEditor';
import { AccountLayout, AccountOverview, MyBooksPage, RequestsPage, TransactionsPage } from './pages/Account';
import { useLanguage } from './i18n';
import { useTheme } from './theme';
import { buttonClass } from './components/ui/button';
import { EmptyState } from './components/ui/empty-state';
import { cn } from './lib/utils';
import { ui } from './lib/ui';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Storefront />} />
        <Route path="/books/:listingId" element={<BookDetail />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/sell" element={<ProtectedRoute><ListingEditor /></ProtectedRoute>} />
        <Route path="/account/books/:listingId/edit" element={<ProtectedRoute><ListingEditor /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><AccountLayout /></ProtectedRoute>}>
          <Route index element={<AccountOverview />} />
          <Route path="books" element={<MyBooksPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="handovers" element={<TransactionsPage />} />
          <Route path="transactions" element={<Navigate to="/account/handovers" replace />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

/** Small outlined control in the top bar (theme and language switches). */
const topbarButton = 'inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-transparent text-ink-2 hover:bg-sunk hover:text-ink';
const topnavLink = 'rounded-lg px-3 py-2 text-15 font-medium text-ink-2 hover:bg-sunk hover:text-ink';
const topnavClass = ({ isActive }: { isActive: boolean }) => cn(topnavLink, isActive && 'rounded-none text-ink shadow-[inset_0_-2px_0_rgb(var(--glaze))]');
const tabbarLink = 'flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-2xs font-medium text-ink-3';
const tabbarClass = ({ isActive }: { isActive: boolean }) => cn(tabbarLink, isActive && 'text-glaze');

function SiteLayout() {
  const { session } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const authError = new URLSearchParams(location.hash.slice(1)).get('error_code');
    if (location.pathname === '/' && authError === 'otp_expired') {
      navigate('/signin', { replace: true, state: { authError: 'expired' } });
      return;
    }
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
      return;
    }
    window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash, navigate]);

  const displayName = session?.user.user_metadata?.display_name || session?.user.email || '';
  const sellTarget = session ? '/sell' : '/signin';
  const sellState = session ? undefined : { from: '/sell' };

  return (
    <div className="flex min-h-screen flex-col pb-[calc(58px+env(safe-area-inset-bottom))] md:pb-0">
      <a href="#main" className="absolute -top-[60px] start-3 z-[100] rounded-ctl bg-ink px-4 py-2.5 font-semibold text-paper focus:top-3">{t('skipToContent')}</a>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-[10px]">
        <div className={cn(ui.wrap, 'flex h-[var(--topbar-h)] items-center gap-7')}>
          <Wordmark />
          <nav className="hidden gap-0.5 md:flex" aria-label={t('mainNav')}>
            <NavLink to="/" end className={topnavClass}>{t('navBrowse')}</NavLink>
            {session
              ? <NavLink to="/sell" className={topnavClass}>{t('listBook')}</NavLink>
              : <Link to={sellTarget} state={sellState} className={topnavLink}>{t('listBook')}</Link>}
            {session ? <NavLink to="/account/requests" className={topnavClass}>{t('navRequests')}</NavLink> : null}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              className={cn(topbarButton, 'w-10')}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
              title={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
            >
              {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <button
              type="button"
              className={cn(topbarButton, 'px-3 text-sm font-medium')}
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              aria-label={language === 'en' ? t('switchToArabic') : t('switchToEnglish')}
              lang={language === 'en' ? 'ar' : 'en'}
            >
              {t('language')}
            </button>
            {session ? (
              <Link className="inline-flex rounded-full" to="/account" aria-label={t('navAccount')}>
                <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-glaze font-semibold text-on-glaze" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>
              </Link>
            ) : location.pathname === '/signin' ? null : (
              <Link className={buttonClass({ variant: 'secondary', size: 'sm' })} to="/signin">{t('signIn')}</Link>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1"><Outlet /></main>

      <footer className="border-t border-line py-10 text-15 text-ink-2">
        <div className={cn(ui.wrap, 'grid gap-7 md:grid-cols-[1fr_1fr]')}>
          <div>
            <Wordmark />
            <p className="mt-3 max-w-[44ch]">{t('footerAbout')}</p>
          </div>
          <ul className="grid gap-2" aria-label={t('footerSafetyTitle')}>
            {(['safetyMeet', 'safetyPay', 'safetyPrivate'] as const).map((key) => (
              <li key={key} className="border-s-[3px] border-glaze ps-3.5">{t(key)}</li>
            ))}
          </ul>
          <p className="text-13 text-ink-3 md:col-span-full md:border-t md:border-line md:pt-5">© {new Date().getFullYear()} {t('brandName')}. {t('detailSafety')}</p>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-[45] grid auto-cols-[1fr] grid-flow-col border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden" aria-label={t('mainNav')}>
        <NavLink to="/" end className={tabbarClass}><Compass size={22} aria-hidden="true" /><span>{t('navBrowse')}</span></NavLink>
        {session
          ? <NavLink to="/sell" className={tabbarClass}><PlusCircle size={22} aria-hidden="true" /><span>{t('listBook')}</span></NavLink>
          : <Link to={sellTarget} state={sellState} className={tabbarLink}><PlusCircle size={22} aria-hidden="true" /><span>{t('listBook')}</span></Link>}
        {session ? (
          <>
            <NavLink to="/account/requests" className={tabbarClass}><Inbox size={22} aria-hidden="true" /><span>{t('navRequests')}</span></NavLink>
            <NavLink to="/account" end className={tabbarClass}><UserRound size={22} aria-hidden="true" /><span>{t('navAccount')}</span></NavLink>
          </>
        ) : (
          <NavLink to="/signin" className={tabbarClass}><UserRound size={22} aria-hidden="true" /><span>{t('signIn')}</span></NavLink>
        )}
      </nav>
    </div>
  );
}

function Wordmark() {
  const { t } = useLanguage();
  return (
    <Link to="/" className="inline-flex items-end gap-[9px] text-ink" aria-label={t('brandName')}>
      <span className="inline-flex h-6 items-end gap-0.5" aria-hidden="true">
        <i className="block h-[17px] w-[5px] rounded-t-[1px] bg-[#12797B]" />
        <i className="block h-[23px] w-[7px] rounded-t-[1px] bg-[#2B4A9A]" />
        <i className="block h-[14px] w-[5px] rounded-t-[1px] bg-[#C9921F]" />
      </span>
      <span className="font-wordmark text-21 font-bold leading-none tracking-[-0.02em] ar:text-2xl ar:leading-[0.9] ar:tracking-normal">{t('brandName')}</span>
    </Link>
  );
}

function NotFound() {
  const { t } = useLanguage();
  return (
    <div className={cn(ui.wrap, ui.page)}>
      <EmptyState
        size="large"
        headingLevel="h1"
        icon={<Library size={28} />}
        title={t('notFoundTitle')}
        description={t('notFoundCopy')}
        action={<Link className={buttonClass()} to="/">{t('browseBooks')}</Link>}
      />
    </div>
  );
}
