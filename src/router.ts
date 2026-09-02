import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import HomePage from './components/Home.vue';
import AboutPage from './components/About.vue';
import ContactPage from './components/Contact.vue';
import SharedDeck from './components/SharedDeck.vue';
import NotFound from './components/404.vue';
import TermsOfService from './components/TermsOfService.vue';
import PrivacyPolicy from './components/PrivacyPolicy.vue';
import SupportPage from './components/Support.vue';
import LoginPage from './components/Login.vue';
import DecksPage from './components/Decks.vue';
import DeckDetailPage from './components/DeckDetail.vue';
import StudySessionPage from './components/StudySession.vue';
import QuizSessionPage from './components/QuizSession.vue';
import ProfilePage from './components/Profile.vue';
import { authReady, isLoggedIn } from './auth/session';
import { hydrateLanguageFromProfile } from './api/mopiq';

const routes: RouteRecordRaw[] = [
  { path: '/', component: HomePage },
  { path: '/login', component: LoginPage, meta: { guestOnly: true } },
  { path: '/decks', component: DecksPage, meta: { requiresAuth: true, appShell: true } },
  { path: '/decks/:deckId', component: DeckDetailPage, meta: { requiresAuth: true, appShell: true } },
  { path: '/decks/:deckId/study', component: StudySessionPage, meta: { requiresAuth: true, appShell: true } },
  { path: '/decks/:deckId/quiz', component: QuizSessionPage, meta: { requiresAuth: true, appShell: true } },
  { path: '/profile', component: ProfilePage, meta: { requiresAuth: true, appShell: true } },
  { path: '/terms', component: TermsOfService },
  { path: '/privacy', component: PrivacyPolicy },
  { path: '/support', component: SupportPage },
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
  if (to.path === '/' || to.path === '/login') {
    if (isLoggedIn()) return { path: '/decks' };
    return true;
  }
  await authReady;
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return { path: '/login', query: { next: to.fullPath } };
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
