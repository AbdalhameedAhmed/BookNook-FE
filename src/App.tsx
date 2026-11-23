import { useEffect } from 'react';
import { Compass, Inbox, Library, Moon, Plus, PlusCircle, ShieldCheck, ShieldHalf, Sun, UserRound } from 'lucide-react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute, useAuth } from './auth';
import { CountBadge, useActivity } from './activity';
import { RfoofWordmark } from './components/brand';
import Storefront from './pages/Storefront';
import BookDetail from './pages/BookDetail';
import SignIn from './pages/SignIn';
import ResetPassword from './pages/ResetPassword';
import ConfirmEmail from './pages/ConfirmEmail';
import ListingEditor from './pages/ListingEditor';
import { AccountLayout, AccountOverview, MyBooksPage, RequestsPage, TransactionsPage } from './pages/Account';
import { WalletPage } from './pages/Wallet';
import { InvitePage } from './pages/Invite';
import { NotificationsPage } from './pages/Notifications';
import { SettingsLayout, SettingsNotifications, SettingsProfile, SettingsSignIn } from './pages/Settings';
import { NotificationTray } from './components/notification-tray';
import { UserMenu } from './components/user-menu';
import HelpCenter from './pages/Help';
import SellerProfile from './pages/SellerProfile';
import { AdminHandoversPage, AdminLayout, AdminOverviewPage, AdminPromosPage, AdminTopupsPage } from './pages/Admin';
import { useLanguage } from './i18n';
import { useTheme } from './theme';
import { buttonClass } from './components/ui/button';
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
        <Route path="/confirm-email" element={<ConfirmEmail />} />
        <Route path="/confirm-email-change" element={<ConfirmEmail change />} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/sell" element={<ProtectedRoute><ListingEditor /></ProtectedRoute>} />
        <Route path="/account/books/:listingId/edit" element={<ProtectedRoute><ListingEditor /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><AccountLayout /></ProtectedRoute>}>
          <Route index element={<AccountOverview />} />
          <Route path="books" element={<MyBooksPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="handovers" element={<TransactionsPage />} />
          <Route path="transactions" element={<Navigate to="/account/handovers" replace />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="invite" element={<InvitePage />} />
          <Route path="notifications" element={<Navigate to="/notifications" replace />} />
          <Route path="settings" element={<Navigate to="/settings" replace />} />
        </Route>
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/users/:userId" element={<SellerProfile />} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsLayout /></ProtectedRoute>}>
          <Route index element={<SettingsProfile />} />
          <Route path="sign-in" element={<SettingsSignIn />} />
          <Route path="notifications" element={<SettingsNotifications />} />
        </Route>
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="topups" element={<AdminTopupsPage />} />
          <Route path="handovers" element={<AdminHandoversPage />} />
          <Route path="promos" element={<AdminPromosPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

/** Small outlined control in the top bar (theme and language switches). */
const topbarButton = 'inline-flex h-10 items-center justify-center rounded-ctl border border-line-strong bg-surface text-ink-2 transition-colors hover:bg-sunk-3 hover:text-ink';
const topnavLink = 'flex min-h-10 items-center gap-1.5 rounded-ctl px-4 text-label-lg font-medium text-ink-2 transition-colors hover:bg-sunk-3 hover:text-ink';
const topnavClass = ({ isActive }: { isActive: boolean }) => cn(topnavLink, isActive && 'bg-glaze font-semibold text-on-glaze shadow-sm hover:bg-glaze hover:text-on-glaze');
const tabbarLink = 'flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-2xs font-semibold text-ink-3';
const tabbarClass = ({ isActive }: { isActive: boolean }) => cn(tabbarLink, isActive && 'text-glaze-deep');

function SiteLayout() {
  const { session } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
      return;
    }
    window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  const isModerator = session?.user.role === 'moderator';
  const { pendingIncoming, handoversNeedingYou } = useActivity();
  const attention = (count: number) => `${count} ${t('needsYou')}`;
  const sellTarget = session ? '/sell' : '/signin';
  const sellState = session ? undefined : { from: '/sell' };

  return (
    <div className="flex min-h-screen flex-col pb-[calc(58px+env(safe-area-inset-bottom))] md:pb-0">
      <a href="#main" className="absolute -top-[60px] start-3 z-[100] rounded-ctl bg-ink px-4 py-2.5 font-semibold text-paper focus:top-3">{t('skipToContent')}</a>
      <p className="flex items-center justify-center gap-2 border-b border-line-strong/30 bg-sunk px-[var(--gutter)] py-1 text-center text-label-sm font-medium text-ink-2">
        <span className="h-2 w-2 flex-none rounded-full bg-glaze" aria-hidden="true" />
        <span className="truncate">{t('announcement')}</span>
      </p>
      <header className="sticky top-0 z-40 bg-paper/90 shadow-[0_1px_8px_rgb(0_0_0/.04)] backdrop-blur-xl">
        <div className={cn(ui.wrap, 'flex h-[var(--topbar-h)] items-center gap-4 lg:gap-6')}>
          <Wordmark />
          <nav className="hidden items-center gap-1 rounded-xl bg-sunk p-1 md:flex" aria-label={t('mainNav')}>
            <NavLink to="/" end className={topnavClass}>{t('navBrowse')}</NavLink>
            {session ? <NavLink to="/account/requests" className={topnavClass} data-tour="nav-requests">{t('navRequests')}<CountBadge count={pendingIncoming} label={attention(pendingIncoming)} /></NavLink> : null}
            {session ? <NavLink to="/account" end className={topnavClass} data-tour="nav-account">{t('navAccount')}<CountBadge count={handoversNeedingYou} label={attention(handoversNeedingYou)} /></NavLink> : null}
            {isModerator ? <NavLink to="/admin" className={topnavClass}>{t('navAdmin')}</NavLink> : null}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            {session
              ? <NavLink to="/sell" className={cn(buttonClass({ size: 'sm' }), 'hidden sm:inline-flex')} data-tour="list-book"><Plus size={18} aria-hidden="true" />{t('listBook')}</NavLink>
              : <Link to={sellTarget} state={sellState} className={cn(buttonClass({ size: 'sm' }), 'hidden sm:inline-flex')}><Plus size={18} aria-hidden="true" />{t('listBook')}</Link>}
            {session ? <NotificationTray buttonClassName={topbarButton} /> : null}
            <button
              type="button"
              className={cn(topbarButton, 'px-3 text-label-md font-semibold')}
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              aria-label={language === 'en' ? t('switchToArabic') : t('switchToEnglish')}
              lang={language === 'en' ? 'ar' : 'en'}
            >
              {t('language')}
            </button>
            <button
              type="button"
              className={cn(topbarButton, 'w-10')}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
              title={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
            >
              {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            {session ? (
              <UserMenu />
            ) : location.pathname === '/signin' ? null : (
              <Link className={buttonClass({ variant: 'secondary', size: 'sm' })} to="/signin">{t('signIn')}</Link>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1"><Outlet /></main>

      <footer className="border-t border-line-strong/40 py-10 text-body-md text-ink-2">
        <div className={cn(ui.wrap, 'grid gap-8')}>
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-[48ch]">
              <Wordmark />
              <p className="mt-3">{t('footerAbout')}</p>
            </div>
            <ul className="grid gap-2" aria-label={t('footerSafetyTitle')}>
              {(['safetyMeet', 'safetyPay', 'safetyPrivate'] as const).map((key) => (
                <li key={key} className="flex items-center gap-2"><ShieldCheck className="flex-none text-glaze-deep" size={16} aria-hidden="true" />{t(key)}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2 border-t border-line-strong/40 pt-5 text-label-md text-ink-3 sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} {t('brandName')}. {t('detailSafety')}</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <Link to="/help" className="font-semibold text-ink-2 underline-offset-[3px] hover:text-glaze-deep hover:underline">{t('navHelp')}</Link>
              <span>{t('footerTagline')}</span>
            </p>
          </div>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-[45] grid auto-cols-[1fr] grid-flow-col border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label={t('mainNav')}>
        <NavLink to="/" end className={tabbarClass}><Compass size={22} aria-hidden="true" /><span>{t('navBrowse')}</span></NavLink>
        {session
          ? <NavLink to="/sell" className={tabbarClass} data-tour="list-book"><PlusCircle size={22} aria-hidden="true" /><span>{t('listBook')}</span></NavLink>
          : <Link to={sellTarget} state={sellState} className={tabbarLink}><PlusCircle size={22} aria-hidden="true" /><span>{t('listBook')}</span></Link>}
        {session ? (
          <>
            <NavLink to="/account/requests" className={tabbarClass} data-tour="nav-requests">
              <span className="relative"><Inbox size={22} aria-hidden="true" /><CountBadge className="absolute -end-3 -top-1.5" count={pendingIncoming} label={attention(pendingIncoming)} /></span>
              <span>{t('navRequests')}</span>
            </NavLink>
            <NavLink to="/account" end className={tabbarClass} data-tour="nav-account">
              <span className="relative"><UserRound size={22} aria-hidden="true" /><CountBadge className="absolute -end-3 -top-1.5" count={handoversNeedingYou} label={attention(handoversNeedingYou)} /></span>
              <span>{t('navAccount')}</span>
            </NavLink>
            {isModerator ? <NavLink to="/admin" className={tabbarClass}><ShieldHalf size={22} aria-hidden="true" /><span>{t('navAdmin')}</span></NavLink> : null}
          </>
        ) : (
          <NavLink to="/signin" className={tabbarClass}><UserRound size={22} aria-hidden="true" /><span>{t('signIn')}</span></NavLink>
        )}
      </nav>
    </div>
  );
}

/** The Stitch "RFOOF" shelf wordmark, with the Arabic name رفوف and the tagline beside it. */
function Wordmark() {
  const { t, language } = useLanguage();
  return (
    <Link to="/" className="inline-flex flex-none items-center gap-2.5 text-ink" aria-label={t('brandName')}>
      <RfoofWordmark className="h-6 w-auto sm:h-7" />
      <span className="hidden flex-col border-s border-line-strong/60 ps-2.5 sm:flex" aria-hidden="true">
        <span className="font-wordmark text-lg font-bold leading-none text-glaze-deep" lang="ar">رفوف</span>
        <span className="mt-0.5 text-label-sm text-ink-3" lang={language}>{t('brandTagline')}</span>
      </span>
    </Link>
  );
}

/** Stitch "404 · shelf note": an empty slot on the ledge where the book used to stand. */
function NotFound() {
  const { t } = useLanguage();
  const { session } = useAuth();
  return (
    <div className={cn(ui.wrap, ui.page, 'flex flex-col items-center text-center')}>
      <p className="w-full max-w-[380px] text-start text-label-sm font-medium uppercase tracking-[0.12em] text-ink-3 ar:normal-case ar:tracking-normal">404 · {t('notFoundKicker')}</p>
      <div className="mt-6 w-full max-w-[340px]" aria-hidden="true">
        <div className="flex h-40 items-end justify-center gap-3 px-6">
          <span className="relative h-24 w-11 overflow-hidden rounded-t-sm bg-gradient-to-br from-surface to-sunk-3 shadow-md"><span className="absolute inset-y-0 start-0 w-1.5 bg-cobalt" /></span>
          <span className="relative h-32 w-12 overflow-hidden rounded-t-sm bg-gradient-to-br from-surface to-sunk-3 shadow-md"><span className="absolute inset-y-0 start-0 w-1.5 bg-ochre" /></span>
          <span className="relative h-[7.5rem] w-11 rounded-t-md border-[1.5px] border-b-0 border-dashed border-ink-3/60 bg-glaze-soft/40" />
          <span className="relative h-28 w-10 overflow-hidden rounded-t-sm bg-gradient-to-br from-surface to-sunk-3 shadow-md"><span className="absolute inset-y-0 start-0 w-1.5 bg-glaze" /></span>
        </div>
        <div className="h-1.5 rounded-full bg-ledge" />
        <div className="mx-1.5 mt-0.5 h-1.5 rounded-full bg-ledge/10" />
      </div>
      <h1 className="mt-8 font-book text-headline-lg-mobile font-semibold text-ink ar:leading-[1.5]">{t('notFoundTitle')}</h1>
      <div className="mt-4 w-full max-w-[380px] rounded-xl bg-sunk p-4 text-body-md text-ink-2 shadow-sm">
        <p className="mb-1.5 flex items-center justify-center gap-1.5 text-label-md font-semibold text-glaze-deep"><Library size={18} aria-hidden="true" />{t('notFoundStory')}</p>
        <p>{t('notFoundCopy')}</p>
      </div>
      <div className="mt-6 grid w-full max-w-[380px] gap-2">
        <Link className={buttonClass({ block: true, size: 'lg' })} to="/"><Compass size={20} aria-hidden="true" />{t('browseBooks')}</Link>
        <div className="grid grid-cols-2 gap-2">
          <Link className="flex min-h-11 items-center justify-center gap-1.5 rounded-ctl bg-sunk-2 px-2 text-label-md font-semibold text-ink hover:bg-sunk-3" to={session ? '/account' : '/signin'}><UserRound className="text-cobalt" size={16} aria-hidden="true" />{session ? t('navAccount') : t('signIn')}</Link>
          <Link className="flex min-h-11 items-center justify-center gap-1.5 rounded-ctl bg-sunk-2 px-2 text-label-md font-semibold text-ink hover:bg-sunk-3" to={session ? '/sell' : '/signin'} state={session ? undefined : { from: '/sell' }}><PlusCircle className="text-ochre" size={16} aria-hidden="true" />{t('listBook')}</Link>
        </div>
      </div>
    </div>
  );
}
