<template>
  <div class="landing">
    <header class="landing-bar">
      <div class="inner bar-inner">
        <a class="brand" href="#top">
          <img src="/logo-small.svg" alt="">
          <span>Mopiq</span>
        </a>
        <div class="nav-actions">
          <LanguagePicker compact />
          <button type="button" class="btn ghost" @click="openLogin">{{ $t('common.signIn') }}</button>
          <a class="btn primary" :href="storeUrl" target="_blank" rel="noopener">{{ $t('common.downloadApp') }}</a>
        </div>
      </div>
    </header>

    <main>
      <section id="top" class="hero inner">
        <div class="hero-copy">
          <p class="eyebrow">{{ $t('home.eyebrow') }}</p>
          <h1>
            {{ $t('home.titleBefore') }}
            <span class="mark">{{ $t('home.titleMark') }}</span>
          </h1>
          <p class="lede">
            {{ $t('home.lede') }}
          </p>
          <div class="hero-ctas">
            <a class="btn primary lg" :href="storeUrl" target="_blank" rel="noopener">{{ $t('common.downloadApp') }}</a>
            <button type="button" class="btn ghost lg" @click="openLogin">{{ $t('home.signInWeb') }}</button>
          </div>
          <p class="fine">{{ $t('home.fine') }}</p>
        </div>
        <div class="hero-visual">
          <img class="phone" src="/marketing/hero-study.png" :alt="$t('home.heroStudyAlt')">
          <img class="phone phone-back" src="/marketing/hero-decks.png" alt="" aria-hidden="true">
        </div>
      </section>

      <section class="strip inner">
        <div class="stat"><strong>{{ $t('home.stripSpaced') }}</strong><span>{{ $t('home.stripSpacedSub') }}</span></div>
        <div class="stat"><strong>{{ $t('home.stripDevices') }}</strong><span>{{ $t('home.stripDevicesSub') }}</span></div>
        <div class="stat"><strong>{{ $t('home.stripAi') }}</strong><span>{{ $t('home.stripAiSub') }}</span></div>
      </section>

      <section class="features inner">
        <h2>{{ $t('home.featuresTitle') }}</h2>
        <p class="section-lede">{{ $t('home.featuresLede') }}</p>
        <div class="feature-grid">
          <article class="feature">
            <img src="/marketing/hero-quiz.png" alt="Quiz in Mopiq">
            <h3>{{ $t('home.featureCreateTitle') }}</h3>
            <p>{{ $t('home.featureCreateBody') }}</p>
          </article>
          <article class="feature">
            <img src="/marketing/hero-decks.png" alt="Premade decks in Mopiq">
            <h3>{{ $t('home.featurePremadeTitle') }}</h3>
            <p>{{ $t('home.featurePremadeBody') }}</p>
          </article>
          <article class="feature">
            <img src="/marketing/hero-results.png" alt="Study results in Mopiq">
            <h3>{{ $t('home.featureSrsTitle') }}</h3>
            <p>{{ $t('home.featureSrsBody') }}</p>
          </article>
        </div>
      </section>

      <section class="topics inner">
        <h2>{{ $t('home.topicsTitle') }}</h2>
        <div class="topic-row">
          <div v-for="topic in topics" :key="topic.name" class="topic-chip">
            <span class="topic-icon" :style="{ background: topic.backgroundColor }">
              <img :src="`/topics/${topic.imageName}.svg`" alt="">
            </span>
            {{ $t('topics.' + topic.name) }}
          </div>
        </div>
      </section>

      <section class="goals inner">
        <h2>{{ $t('home.goalsTitle') }}</h2>
        <p class="section-lede">{{ $t('home.goalsLede') }}</p>
        <div class="goal-grid">
          <article class="goal">
            <span class="goal-mark">{{ $t('home.goalExamMark') }}</span>
            <h3>{{ $t('home.goalExamTitle') }}</h3>
            <p>{{ $t('home.goalExamBody') }}</p>
          </article>
          <article class="goal">
            <span class="goal-mark">{{ $t('home.goalLangMark') }}</span>
            <h3>{{ $t('home.goalLangTitle') }}</h3>
            <p>{{ $t('home.goalLangBody') }}</p>
          </article>
          <article class="goal">
            <span class="goal-mark">{{ $t('home.goalTeachMark') }}</span>
            <h3>{{ $t('home.goalTeachTitle') }}</h3>
            <p>{{ $t('home.goalTeachBody') }}</p>
          </article>
          <article class="goal">
            <span class="goal-mark">{{ $t('home.goalMemoryMark') }}</span>
            <h3>{{ $t('home.goalMemoryTitle') }}</h3>
            <p>{{ $t('home.goalMemoryBody') }}</p>
          </article>
        </div>
      </section>

      <section class="proof inner">
        <h2>{{ $t('home.proofTitle') }}</h2>
        <div class="quotes">
          <blockquote>
            <div class="stars" aria-label="5 stars">★★★★★</div>
            <p>{{ $t('home.quote1') }}</p>
            <cite>{{ $t('home.quoteCite') }}</cite>
          </blockquote>
          <blockquote>
            <div class="stars" aria-label="5 stars">★★★★★</div>
            <p>{{ $t('home.quote2') }}</p>
            <cite>{{ $t('home.quoteCite') }}</cite>
          </blockquote>
          <blockquote>
            <div class="stars" aria-label="5 stars">★★★★★</div>
            <p>{{ $t('home.quote3') }}</p>
            <cite>{{ $t('home.quoteCite') }}</cite>
          </blockquote>
        </div>
      </section>

      <section class="download-wrap inner">
        <div class="download">
          <div>
            <h2>{{ $t('home.ctaTitle') }}</h2>
            <p>{{ $t('home.ctaBody') }}</p>
            <div class="hero-ctas">
              <a class="btn primary lg" :href="storeUrl" target="_blank" rel="noopener">{{ $t('common.downloadAppStore') }}</a>
              <button type="button" class="btn ghost lg" @click="openLogin">{{ $t('common.signIn') }}</button>
            </div>
          </div>
          <img class="phone solo" src="/marketing/hero-sync.png" :alt="$t('home.devicesAlt')">
        </div>
      </section>

      <section class="faq inner">
        <h2>{{ $t('home.faqTitle') }}</h2>
        <details open>
          <summary>{{ $t('home.faqFreeQ') }}</summary>
          <p>{{ $t('home.faqFreeA') }}</p>
        </details>
        <details>
          <summary>{{ $t('home.faqSrsQ') }}</summary>
          <p>{{ $t('home.faqSrsA') }}</p>
        </details>
        <details>
          <summary>{{ $t('home.faqWebQ') }}</summary>
          <p>{{ $t('home.faqWebA') }}</p>
        </details>
        <details>
          <summary>{{ $t('home.faqEditQ') }}</summary>
          <p>{{ $t('home.faqEditA') }}</p>
        </details>
      </section>
    </main>

    <footer class="legal">
      <div class="inner legal-inner">
        <div class="legal-brand">
          <img src="/logo-small.svg" alt="">
          <span>{{ $t('common.brand') }}</span>
        </div>
        <nav class="legal-links" :aria-label="$t('common.legal')">
          <router-link to="/privacy">{{ $t('common.privacy') }}</router-link>
          <router-link to="/terms">{{ $t('common.terms') }}</router-link>
          <router-link to="/support">{{ $t('common.support') }}</router-link>
        </nav>
        <p class="copy">{{ $t('common.copyright', { year }) }}</p>
      </div>
    </footer>
    <Login :open="loginOpen" :next="loginNext" @dismiss="closeLogin" />
  </div>
</template>

<script>
import { APP_STORE_URL } from '../constants';
import { authReady, isLoggedIn } from '../auth/session';
import LanguagePicker from './LanguagePicker.vue';
import Login from './Login.vue';

export default {
  name: 'HomePage',
  components: { LanguagePicker, Login },
  data() {
    return {
      storeUrl: APP_STORE_URL,
      loginOpen: false,
      topics: [
        { name: 'medicine', imageName: 'medicine', backgroundColor: '#E0F2FE' },
        { name: 'languages', imageName: 'languages', backgroundColor: '#FEF3C7' },
        { name: 'anatomy', imageName: 'anatomy', backgroundColor: '#ECFCCB' },
        { name: 'law', imageName: 'law', backgroundColor: '#FEE2E2' },
        { name: 'history', imageName: 'history', backgroundColor: '#FEF3C7' },
        { name: 'maths', imageName: 'maths', backgroundColor: '#CCFBF1' },
        { name: 'chemistry', imageName: 'chemistry', backgroundColor: '#FFEDD5' },
        { name: 'music', imageName: 'music', backgroundColor: '#FCE7F3' },
      ],
    };
  },
  computed: {
    year() {
      return new Date().getFullYear();
    },
    loginNext() {
      const next = this.$route.query.next;
      return typeof next === 'string' ? next : '';
    },
  },
  watch: {
    '$route.query.login': {
      immediate: true,
      handler(value) {
        this.loginOpen = value === '1' || value === 'true';
      },
    },
  },
  async created() {
    await authReady;
    if (isLoggedIn()) this.$router.replace('/decks');
  },
  methods: {
    openLogin() {
      this.loginOpen = true;
      if (this.$route.query.login === '1') return;
      this.$router.replace({ path: '/', query: { ...this.$route.query, login: '1' } });
    },
    closeLogin() {
      this.loginOpen = false;
      if (!this.$route.query.login) return;
      const query = { ...this.$route.query };
      delete query.login;
      this.$router.replace({ path: '/', query });
    },
  },
};
</script>

<style scoped>
.landing {
  color: #0F172A;
  padding-bottom: 48px;
}
.inner {
  max-width: 1120px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}
.landing-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(247, 248, 250, 0.88);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}
.bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
  padding-top: 14px;
  padding-bottom: 14px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: auto;
  flex: 0 0 auto;
  text-decoration: none;
  color: #0A7AFF;
  font-weight: 700;
  font-size: 1.2rem;
}
.brand img { width: 34px; height: 24px; }
.nav-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-left: auto;
  flex: 0 0 auto;
  flex-wrap: nowrap;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  text-decoration: none;
  font: inherit;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 10px 18px;
  border: 1px solid transparent;
  line-height: 1.2;
  background: transparent;
  cursor: pointer;
}
.btn.primary {
  background: #0A7AFF;
  color: #fff;
}
.btn.primary:hover { background: #0066d6; color: #fff; }
.btn.ghost {
  background: #fff;
  color: #0F172A;
  border-color: #D8DEE9;
}
.btn.ghost:hover { border-color: #0A7AFF; color: #0A7AFF; }
.btn.lg { padding: 14px 22px; font-size: 1.02rem; }

.hero {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 48px;
  align-items: center;
  padding: 48px 24px 72px;
  position: relative;
}
.eyebrow {
  color: #0A7AFF;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.8rem;
  margin-bottom: 14px;
}
h1, h2 { letter-spacing: -0.04em; }
h1 {
  font-size: clamp(2.6rem, 6vw, 4.4rem);
  line-height: 1.05;
  font-weight: 800;
  margin: 0 0 18px;
}
.mark {
  display: inline-block;
  background: #0A7AFF;
  color: #fff;
  font-style: italic;
  padding: 0.08em 0.28em 0.12em;
  border-radius: 10px;
  transform: rotate(-1.2deg);
}
.lede, .section-lede {
  font-size: 1.2rem;
  color: #475569;
  max-width: 36rem;
  line-height: 1.5;
}
.hero-ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 28px 0 12px;
}
.fine { color: #64748B; font-size: 0.95rem; }
.hero-visual {
  position: relative;
  min-height: 520px;
}
.hero-visual::before {
  content: "";
  position: absolute;
  inset: 8% 4% auto auto;
  width: 78%;
  height: 78%;
  background: radial-gradient(circle, rgba(10, 122, 255, 0.22), transparent 68%);
  pointer-events: none;
}
.phone {
  width: min(340px, 100%);
  display: block;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 28px 50px rgba(15, 23, 42, 0.2));
  margin: 0 auto;
}
.phone-back {
  position: absolute;
  width: min(260px, 70%);
  right: -12px;
  top: 64px;
  z-index: 1;
  opacity: 0.9;
  transform: rotate(8deg);
}
.phone.solo {
  position: static;
  width: min(380px, 100%);
  margin: 0;
}

.strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 72px;
}
.stat {
  background: #fff;
  border-radius: 20px;
  padding: 22px 24px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}
.stat strong { display: block; font-size: 1.05rem; margin-bottom: 6px; }
.stat span { color: #64748B; }

.features, .topics, .goals, .proof, .download-wrap, .faq { margin-bottom: 88px; }
.goal-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 32px;
}
.goal {
  background: #fff;
  border-radius: 22px;
  padding: 22px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}
.goal-mark {
  display: inline-block;
  color: #0A7AFF;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.goal h3 { font-size: 1.15rem; margin: 0 0 8px; }
.goal p { color: #475569; margin: 0; }
h2 { font-size: clamp(2rem, 4vw, 2.8rem); font-weight: 800; margin-bottom: 12px; }
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 32px;
}
.feature {
  background: #fff;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.07);
}
.feature img {
  width: 100%;
  height: 280px;
  object-fit: cover;
  object-position: top center;
  background: #E8F4FC;
}
.feature h3, .feature p { padding: 0 22px; }
.feature h3 { margin: 18px 0 8px; font-size: 1.25rem; }
.feature p { color: #475569; padding-bottom: 24px; }

.topic-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}
.topic-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border-radius: 999px;
  padding: 8px 14px 8px 8px;
  font-weight: 600;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
}
.topic-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}
.topic-icon img { width: 100%; }

.quotes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 28px;
}
blockquote {
  background: #fff;
  border-radius: 22px;
  padding: 24px;
  margin: 0;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}
.stars { color: #F5B400; letter-spacing: 2px; margin-bottom: 12px; }
blockquote p { color: #1E293B; font-size: 1.05rem; line-height: 1.45; }
cite {
  display: block;
  margin-top: 14px;
  font-style: normal;
  color: #64748B;
  font-size: 0.88rem;
  font-weight: 600;
}

.download {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: center;
  background: #fff;
  border-radius: 32px;
  padding: 36px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.07);
}
.download p { color: #475569; font-size: 1.15rem; max-width: 28rem; }

.faq details {
  background: #fff;
  border-radius: 16px;
  padding: 16px 20px;
  margin-top: 10px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}
.faq summary {
  cursor: pointer;
  font-weight: 700;
  font-size: 1.05rem;
}
.faq details p {
  color: #475569;
  margin: 10px 0 4px;
  max-width: 46rem;
}

.legal {
  border-top: 1px solid #E2E8F0;
  padding: 36px 0 8px;
  background: rgba(255, 255, 255, 0.55);
}
.legal-inner {
  display: grid;
  gap: 14px;
}
.legal-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: #0A7AFF;
}
.legal-brand img { width: 28px; height: 20px; }
.legal-links {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 20px;
}
.legal-links a {
  color: #475569;
  text-decoration: none;
  font-weight: 600;
}
.legal-links a:hover { color: #0A7AFF; }
.copy { color: #64748B; margin: 0; font-size: 0.92rem; }

@media (max-width: 900px) {
  .hero, .feature-grid, .quotes, .download, .strip, .goal-grid { grid-template-columns: 1fr; }
  .hero { padding-top: 28px; }
  .hero-visual { min-height: 0; }
  .phone-back { display: none; }
  .download { padding: 24px; }
  .nav-actions { gap: 8px; }
  .nav-actions .btn { padding: 9px 12px; font-size: 0.85rem; }
}
@media (max-width: 560px) {
  .inner { padding-left: 16px; padding-right: 16px; }
  .landing { padding-bottom: 36px; }
  .btn.lg { width: 100%; }
}
</style>
