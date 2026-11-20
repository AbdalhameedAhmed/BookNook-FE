import { Check, LifeBuoy, LogIn, Play, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { buttonClass } from '../components/ui/button';
import { TOURS } from '../tours/tours';
import { useTours } from '../tours/tour-provider';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

/** Help center: the guided tours, each one replayable. */
export default function HelpCenter() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const { startTour, completed } = useTours();

  return (
    <div className={cn(ui.wrap, ui.page, 'max-w-[880px]')}>
      <header className="flex items-start gap-4">
        <span className="grid h-14 w-14 flex-none place-items-center rounded-card bg-glaze-soft text-glaze-deep" aria-hidden="true"><LifeBuoy size={26} /></span>
        <div>
          <h1 className={ui.pageTitle}>{t('helpTitle')}</h1>
          <p className={cn(ui.measure, 'mt-1 text-body-md text-ink-2')}>{t('helpIntro')}</p>
        </div>
      </header>

      <section className="mt-8" aria-labelledby="tours-heading">
        <h2 id="tours-heading" className={cn(ui.sectionTitle, 'mb-4')}>{t('helpToursHeading')}</h2>
        <ul className="grid gap-3">
          {TOURS.map((tour) => {
            const Icon = tour.icon;
            const done = completed.includes(tour.id);
            const locked = tour.needsSignIn && !session;
            return (
              <li key={tour.id} className={cn(ui.card, 'flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:p-5')}>
                <span className={cn('grid h-12 w-12 flex-none place-items-center rounded-xl', tour.tone)} aria-hidden="true"><Icon size={22} /></span>
                <div className="min-w-0 flex-1 basis-[14rem]">
                  <h3 className="flex flex-wrap items-center gap-2 text-title-md font-bold text-ink">
                    {t(tour.name)}
                    {done ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-glaze-soft/60 px-2 py-0.5 text-label-sm font-semibold text-glaze-deep">
                        <Check size={13} aria-hidden="true" />{t('tourCompleted')}
                      </span>
                    ) : null}
                  </h3>
                  <p className="mt-0.5 text-body-sm text-ink-2">{t(tour.summary)}</p>
                </div>
                {locked ? (
                  <Link to="/signin" state={{ from: '/help' }} className={cn(buttonClass({ variant: 'secondary', size: 'sm' }), 'min-h-11 w-full sm:w-auto')}>
                    <LogIn size={17} className={ui.flipRtl} aria-hidden="true" />{t('tourSignInFirst')}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => startTour(tour.id)}
                    className={cn(buttonClass({ variant: done ? 'secondary' : 'primary', size: 'sm' }), 'min-h-11 w-full sm:w-auto')}
                    aria-label={`${done ? t('tourReplay') : t('tourStart')}: ${t(tour.name)}`}
                  >
                    {done ? <RotateCcw size={17} aria-hidden="true" /> : <Play size={17} className={ui.flipRtl} aria-hidden="true" />}
                    {done ? t('tourReplay') : t('tourStart')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
