import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import type { CallBackProps, Step, TooltipRenderProps } from 'react-joyride';
import { X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { Button } from '../components/ui/button';
import { fill } from '../components/deals';
import { cn } from '../lib/utils';
import { CENTER, tourById } from './tours';
import type { Tour, TourId } from './tours';

type TourContextValue = {
  startTour: (id: TourId) => void;
  completed: TourId[];
};

const TourContext = createContext<TourContextValue>({ startTour: () => undefined, completed: [] });

export function useTours() {
  return useContext(TourContext);
}

/** Pages where the first-visit welcome tour must not start (mid sign-in or a link landing). */
const NO_AUTO_START = ['/signin', '/confirm-email', '/confirm-email-change', '/reset-password', '/help'];
const WAIT_FOR_TARGETS_MS = 4000;
const GRACE_AFTER_FIRST_TARGET_MS = 700;

// Signed-in users: taken tours are saved on the account (profiles.completed_tours), so every browser
// and phone knows about them. Visitors who are not signed in: remembered in this browser only.
const GUEST_KEY = 'rfoof.tours.guest';
// Earlier versions kept a per-user list in the browser; it is moved to the account once, then removed.
const legacyKey = (userId: string) => `rfoof.tours.${userId}`;

function readList(key: string): TourId[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key: string, ids: TourId[]) {
  try { window.localStorage.setItem(key, JSON.stringify(ids)); } catch { /* Private mode: forgotten after this visit. */ }
}

function removeList(key: string) {
  try { window.localStorage.removeItem(key); } catch { /* Nothing to clean up. */ }
}

/** The first matching element that is actually on screen (desktop header link vs. phone tab bar). */
function visibleTarget(name: string): HTMLElement | null {
  const matches = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  return Array.from(matches).find((element) => element.getClientRects().length > 0) ?? null;
}

/** Elements inside the sticky header or the fixed tab bar must be spotlighted as fixed. */
function insideFixed(element: HTMLElement) {
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const { position } = window.getComputedStyle(node);
    if (position === 'fixed' || position === 'sticky') return true;
  }
  return false;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { session, isVerified, updateUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const userId = session?.user.id;
  const token = session?.access_token;
  const accountTours = session?.user.completed_tours as TourId[] | undefined;
  const [guestTours, setGuestTours] = useState<TourId[]>(() => readList(GUEST_KEY));
  const completed = useMemo(() => (session ? accountTours ?? [] : guestTours), [session, accountTours, guestTours]);
  const [pending, setPending] = useState<Tour | null>(null);
  const [active, setActive] = useState<{ tour: Tour; steps: Step[] } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const autoStarted = useRef<string | null>(null);

  const markCompleted = useCallback((id: TourId) => {
    if (!token) {
      setGuestTours((current) => {
        if (current.includes(id)) return current;
        const next = [...current, id];
        writeList(GUEST_KEY, next);
        return next;
      });
      return;
    }
    if (!completed.includes(id)) updateUser({ completed_tours: [...completed, id] });
    api.account.completeTour(token, id)
      .then((saved) => updateUser({ completed_tours: saved }))
      .catch(() => undefined); // Still hidden for this visit; it may show again on another device.
  }, [token, completed, updateUser]);

  // Move tours taken before they were saved on the account (older app versions kept them in the browser).
  useEffect(() => {
    if (!isVerified || !userId || !token) return;
    const local = readList(legacyKey(userId));
    if (local.length === 0) return;
    removeList(legacyKey(userId));
    const missing = local.filter((id) => !(accountTours ?? []).includes(id));
    missing.reduce(
      (chain, id) => chain.then(() => api.account.completeTour(token, id)).then((saved) => updateUser({ completed_tours: saved })),
      Promise.resolve(),
    ).catch(() => undefined);
  }, [isVerified, userId, token, accountTours, updateUser]);

  const startTour = useCallback((id: TourId) => {
    const tour = tourById(id);
    if (!tour || (tour.needsSignIn && !session)) return;
    setActive(null);
    if (tour.route && pathname !== tour.route) navigate(tour.route);
    setPending(tour);
  }, [navigate, pathname, session]);

  // Wait for the page (and its data) to render the targets, then start with the steps that exist.
  useEffect(() => {
    if (!pending) return;
    if (pending.route && pathname !== pending.route) return;
    const startedAt = Date.now();
    let firstSeenAt: number | null = null;
    const timer = window.setInterval(() => {
      const now = Date.now();
      const found = pending.steps.map((step) => (step.target === CENTER ? CENTER : visibleTarget(step.target)));
      if (firstSeenAt === null && found.some((element) => element && element !== CENTER)) firstSeenAt = now;
      // Start when every target is there; once the page has rendered some, give the rest a short grace
      // period (some sections only appear when there is data), and never wait longer than the cap.
      const ready = found.every(Boolean)
        || (firstSeenAt !== null && now - firstSeenAt >= GRACE_AFTER_FIRST_TARGET_MS)
        || now - startedAt >= WAIT_FOR_TARGETS_MS;
      if (!ready) return;
      window.clearInterval(timer);
      const steps = pending.steps.flatMap((step, index): Step[] => {
        const element = found[index];
        if (!element) return [];
        const base = { title: t(step.title), content: t(step.body), disableBeacon: true };
        if (element === CENTER) return [{ ...base, target: 'body', placement: 'center' as const }];
        return [{ ...base, target: element, placement: 'auto' as const, isFixed: insideFixed(element) }];
      });
      setPending(null);
      if (steps.length === 0) return;
      setStepIndex(0);
      setActive({ tour: pending, steps });
    }, 150);
    return () => window.clearInterval(timer);
  }, [pending, pathname, t]);

  // First visit after signing in: offer the welcome tour once per account.
  useEffect(() => {
    // Wait for the account's details from the server: this browser's saved copy may predate a tour
    // taken on another device.
    if (!isVerified || !userId || active || pending || autoStarted.current === userId) return;
    if (NO_AUTO_START.some((path) => pathname.startsWith(path))) return;
    if (completed.includes('welcome') || readList(legacyKey(userId)).includes('welcome')) return;
    // Marked when the timer fires: the session is refreshed right after load, which re-runs this effect.
    const timer = window.setTimeout(() => {
      autoStarted.current = userId;
      // Counted as taken once shown, so skipping it does not bring it back on every page.
      markCompleted('welcome');
      startTour('welcome');
    }, 900);
    return () => window.clearTimeout(timer);
  }, [isVerified, userId, pathname, active, pending, completed, markCompleted, startTour]);

  const onEvent = useCallback((data: CallBackProps) => {
    const { action, index, status, type } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
      if (active) markCompleted(active.tour.id);
      setActive(null);
      return;
    }
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  }, [active, markCompleted]);

  const value = useMemo(() => ({ startTour, completed }), [startTour, completed]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {active ? (
        <Joyride
          key={active.tour.id}
          steps={active.steps}
          stepIndex={stepIndex}
          run
          continuous
          showSkipButton
          scrollOffset={110}
          spotlightPadding={6}
          disableScrollParentFix
          tooltipComponent={TourTooltip}
          callback={onEvent}
          floaterProps={{ disableAnimation: prefersReducedMotion() }}
          styles={{
            options: { zIndex: 70, arrowColor: 'rgb(var(--surface))', overlayColor: 'rgba(6, 10, 18, 0.6)' },
            spotlight: { borderRadius: 14 },
          }}
        />
      ) : null}
    </TourContext.Provider>
  );
}

/** Tour card in the app's own style: step count, title, text, Skip / Back / Next. */
function TourTooltip({ index, size, step, isLastStep, backProps, primaryProps, skipProps, closeProps, tooltipProps }: TooltipRenderProps) {
  const { t } = useLanguage();
  return (
    <div {...tooltipProps} className="w-[min(360px,calc(100vw-32px))] rounded-card bg-surface p-5 text-start text-ink shadow-deck">
      <div className="flex items-center gap-3">
        <span className="text-label-md font-semibold text-glaze-deep">{fill(t('tourStepOf'), { step: index + 1, total: size })}</span>
        <button {...closeProps} aria-label={t('tourClose')} title={t('tourClose')} className="-me-2 ms-auto grid h-9 w-9 place-items-center rounded-full text-ink-3 hover:bg-sunk hover:text-ink">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {Array.from({ length: size }).map((_, dot) => (
          <span key={dot} className={cn('h-1 flex-1 rounded-full', dot <= index ? 'bg-glaze' : 'bg-sunk-3')} />
        ))}
      </div>
      {step.title ? <h2 className="mt-4 font-book text-title-lg font-semibold text-ink ar:leading-[1.5]">{step.title}</h2> : null}
      <p className="mt-1.5 text-body-md text-ink-2">{step.content}</p>
      {isLastStep ? <p className="mt-3 text-body-sm text-ink-3">{t('tourReplayHint')}</p> : null}
      <div className="mt-5 flex items-center gap-2">
        {!isLastStep ? (
          <button {...skipProps} aria-label={t('tourSkip')} title={t('tourSkip')} className="min-h-10 rounded-ctl px-2 text-label-md font-semibold text-ink-3 hover:text-ink">
            {t('tourSkip')}
          </button>
        ) : null}
        <div className="ms-auto flex gap-2">
          {index > 0 ? (
            <Button {...backProps} variant="ghost" size="sm" aria-label={t('tourBack')} title={t('tourBack')} className="min-h-10">{t('tourBack')}</Button>
          ) : null}
          <Button {...primaryProps} size="sm" aria-label={isLastStep ? t('tourDone') : t('tourNext')} title={isLastStep ? t('tourDone') : t('tourNext')} className="min-h-10 px-5">
            {isLastStep ? t('tourDone') : t('tourNext')}
          </Button>
        </div>
      </div>
    </div>
  );
}
