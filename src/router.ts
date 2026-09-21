import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import HomePage from './components/Home.vue';
import AboutPage from './components/About.vue';
import ContactPage from './components/Contact.vue';
import SharedDeck from './components/SharedDeck.vue';
import NotFound from './components/404.vue';
import TermsOfService from './components/TermsOfService.vue';
import PrivacyPolicy from './components/PrivacyPolicy.vue';
import AppSplit from './components/AppSplit.vue';
import DeckPlaceholder from './components/DeckPlaceholder.vue';
import DeckDetailPage from './components/DeckDetail.vue';
import StudySessionPage from './components/StudySession.vue';
import QuizSessionPage from './components/QuizSession.vue';
import ProfilePage from './components/Profile.vue';
import { HELP_CENTER_URL } from './constants';
import { markArrivedViaShare } from './analytics';
import { authReady, isLoggedIn } from './auth/session';
import { hydrateLanguageFromProfile } from './api/mopiq';

const routes: RouteRecordRaw[] = [
  { path: '/', component: HomePage },
  {
    path: '/login',
    redirect: (to) => ({
      path: '/',
      query: { login: '1', ...(typeof to.query.next === 'string' ? { next: to.query.next } : {}) },
    }),
  },
  { path: '/decks/:deckId/study', component: StudySessionPage, meta: { requiresAuth: true, appShell: true } },
  { path: '/decks/:deckId/quiz', component: QuizSessionPage, meta: { requiresAuth: true, appShell: true } },
  {
    path: '/decks',
    component: AppSplit,
    meta: { requiresAuth: true, appShell: true },
    children: [
      { path: '', name: 'decks', component: DeckPlaceholder },
      { path: ':deckId', name: 'deck-detail', component: DeckDetailPage },
    ],
  },
  {
    path: '/profile',
    component: AppSplit,
    meta: { requiresAuth: true, appShell: true },
    children: [
      { path: '', name: 'profile', component: ProfilePage },
    ],
  },
  {
    path: '/library',
    component: AppSplit,
    meta: { requiresAuth: true, appShell: true },
    children: [
      { path: '', name: 'library', component: DeckPlaceholder },
    ],
  },
  ...(import.meta.env.DEV ? [
    {
      path: '/dev/deck-detail',
      component: DeckDetailPage,
      meta: { appShell: true, preview: true },
    },
    {
      path: '/dev/split',
      component: AppSplit,
      meta: { appShell: true, preview: true },
      children: [
        { path: '', component: DeckPlaceholder },
        { path: 'library', component: DeckPlaceholder },
        { path: ':deckId', component: DeckDetailPage, meta: { preview: true } },
      ],
    },
  ] : []),
  { path: '/terms', component: TermsOfService },
  { path: '/privacy', component: PrivacyPolicy },
  {
    path: '/support',
    component: { render: () => null },
    beforeEnter() {
      window.location.replace(HELP_CENTER_URL);
      return false;
    },
  },
  { path: '/about', component: AboutPage },
  { path: '/contact', component: ContactPage },
  { path: '/shared/:globalDeckId', component: SharedDeck },
  { path: '/:pathMatch(.*)*', component: NotFound },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  if (to.path.startsWith('/shared/')) {
    markArrivedViaShare();
  }
  if (to.path === '/') {
    if (isLoggedIn()) return { path: '/decks' };
    return true;
  }
  await authReady;
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return { path: '/', query: { login: '1', next: to.fullPath } };
  }
  if (to.meta.guestOnly && isLoggedIn()) {
    return { path: '/decks' };
  }
  if (to.meta.requiresAuth && isLoggedIn()) {
    void hydrateLanguageFromProfile();
  }
  return true;
});

router.afterEach((to) => {
  document.body.classList.toggle('app-shell', Boolean(to.meta.appShell));
});

export default router;
