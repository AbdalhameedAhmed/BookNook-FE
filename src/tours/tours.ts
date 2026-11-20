import type { LucideIcon } from 'lucide-react';
import { Compass, Handshake, PlusCircle, Sparkles, Wallet } from 'lucide-react';
import type { MessageKey } from '../i18n';

/**
 * Guided tours shown with react-joyride (see tour-provider.tsx) and listed in the Help center.
 *
 * Each step points at an element marked `data-tour="<target>"`. When the same target exists twice
 * (header link on desktop, bottom tab on phones), the visible one is used. Steps whose element is
 * missing (for example the search box on pages other than Browse) are left out. `center` shows the
 * step in the middle of the screen without a highlight.
 */
export type TourStep = { target: string; title: MessageKey; body: MessageKey };

export type TourId = 'welcome' | 'find' | 'sell' | 'wallet' | 'deals';

export type Tour = {
  id: TourId;
  name: MessageKey;
  summary: MessageKey;
  icon: LucideIcon;
  tone: string;
  /** Page the tour runs on. Without it, the tour runs on the current page. */
  route?: string;
  needsSignIn: boolean;
  steps: TourStep[];
};

export const CENTER = 'center';

export const TOURS: Tour[] = [
  {
    id: 'welcome',
    name: 'tourWelcomeName',
    summary: 'tourWelcomeSummary',
    icon: Sparkles,
    tone: 'bg-glaze-soft text-glaze-deep',
    needsSignIn: false,
    steps: [
      { target: CENTER, title: 'tourWelcomeIntroTitle', body: 'tourWelcomeIntro' },
      { target: 'search', title: 'tourWelcomeSearchTitle', body: 'tourWelcomeSearch' },
      { target: 'list-book', title: 'tourWelcomeListTitle', body: 'tourWelcomeList' },
      { target: 'nav-requests', title: 'tourWelcomeRequestsTitle', body: 'tourWelcomeRequests' },
      { target: 'bell', title: 'tourWelcomeBellTitle', body: 'tourWelcomeBell' },
      { target: 'account-menu', title: 'tourWelcomeAccountTitle', body: 'tourWelcomeAccount' },
      { target: CENTER, title: 'tourWelcomeSafetyTitle', body: 'tourWelcomeSafety' },
    ],
  },
  {
    id: 'find',
    name: 'tourFindName',
    summary: 'tourFindSummary',
    icon: Compass,
    tone: 'bg-cobalt-soft text-cobalt-ink',
    route: '/',
    needsSignIn: false,
    steps: [
      { target: 'search', title: 'tourFindSearchTitle', body: 'tourFindSearch' },
      { target: 'filters', title: 'tourFindFiltersTitle', body: 'tourFindFilters' },
      { target: 'book-card', title: 'tourFindCardTitle', body: 'tourFindCard' },
      { target: CENTER, title: 'tourFindHowTitle', body: 'tourFindHow' },
    ],
  },
  {
    id: 'sell',
    name: 'tourSellName',
    summary: 'tourSellSummary',
    icon: PlusCircle,
    tone: 'bg-ochre-soft text-ochre-ink',
    route: '/sell',
    needsSignIn: true,
    steps: [
      { target: 'listing-photo', title: 'tourSellPhotoTitle', body: 'tourSellPhoto' },
      { target: 'listing-details', title: 'tourSellDetailsTitle', body: 'tourSellDetails' },
      { target: 'listing-type', title: 'tourSellTypeTitle', body: 'tourSellType' },
      { target: 'listing-area', title: 'tourSellAreaTitle', body: 'tourSellArea' },
      { target: 'listing-publish', title: 'tourSellPublishTitle', body: 'tourSellPublish' },
    ],
  },
  {
    id: 'wallet',
    name: 'tourWalletName',
    summary: 'tourWalletSummary',
    icon: Wallet,
    tone: 'bg-glaze-soft text-glaze-deep',
    route: '/account/wallet',
    needsSignIn: true,
    steps: [
      { target: 'wallet-balance', title: 'tourWalletBalanceTitle', body: 'tourWalletBalance' },
      { target: 'wallet-options', title: 'tourWalletOptionsTitle', body: 'tourWalletOptions' },
      { target: 'wallet-topup', title: 'tourWalletTopupTitle', body: 'tourWalletTopup' },
      { target: 'wallet-activity', title: 'tourWalletActivityTitle', body: 'tourWalletActivity' },
    ],
  },
  {
    id: 'deals',
    name: 'tourDealsName',
    summary: 'tourDealsSummary',
    icon: Handshake,
    tone: 'bg-pom-soft text-pom',
    route: '/account/requests',
    needsSignIn: true,
    steps: [
      { target: 'requests-incoming', title: 'tourDealsIncomingTitle', body: 'tourDealsIncoming' },
      { target: 'requests-outgoing', title: 'tourDealsOutgoingTitle', body: 'tourDealsOutgoing' },
      { target: 'tab-handovers', title: 'tourDealsHandoversTitle', body: 'tourDealsHandovers' },
    ],
  },
];

export const tourById = (id: TourId) => TOURS.find((tour) => tour.id === id);
