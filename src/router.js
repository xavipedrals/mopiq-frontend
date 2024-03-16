import { createRouter, createWebHistory } from 'vue-router';
import HomePage from './components/Home.vue';
import AboutPage from './components/About.vue';
import ContactPage from './components/Contact.vue';
import SharedDeck from './components/SharedDeck.vue';

const routes = [
  { path: '/', component: HomePage },
  { path: '/about', component: AboutPage },
  { path: '/contact', component: ContactPage },
  { path: '/shared/:globalDeckId', component: SharedDeck }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;