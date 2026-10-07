<template>
  <div class="pp">
    <div class="pp-aurora" aria-hidden="true"><span class="a"></span><span class="b"></span><span class="c"></span></div>

    <div class="pp-nav-shell">
      <header class="pp-nav">
        <router-link class="pp-brand" to="/">
          <img src="/logo-small.svg" alt="" width="30" height="22">
          mopiq
        </router-link>
        <nav class="pp-nav-links" aria-label="On this page">
          <a href="#features">Features</a>
          <a href="#compare">Compare</a>
          <a href="#faq">FAQ</a>
          <router-link class="pp-login" :to="accountTo">{{ loggedIn ? 'My decks' : 'Log in' }}</router-link>
        </nav>
      </header>
    </div>

    <main class="pp-wrap">
      <section class="pp-hero">
        <span class="pp-chip"><b>PLUS</b> Everything in Mopiq, without the limits</span>
        <h1>Learn more. Forget less. <span class="pp-grad">No daily cap.</span></h1>
        <p>Mopiq Plus gives you unlimited study, AI that schedules every review, and 10,000+ premium decks for medicine, languages, school and more.</p>

        <div ref="billing" class="pp-billing" role="radiogroup" aria-label="Billing">
          <span class="pp-thumb" :class="frequency" aria-hidden="true"></span>
          <button
            type="button"
            role="radio"
            :aria-checked="frequency === 'month'"
            :tabindex="frequency === 'month' ? 0 : -1"
            @click="frequency = 'month'"
            @keydown="onBillingKey"
          >Monthly</button>
          <button
            type="button"
            role="radio"
            :aria-checked="frequency === 'year'"
            :tabindex="frequency === 'year' ? 0 : -1"
            @click="frequency = 'year'"
            @keydown="onBillingKey"
          >
            Yearly
            <span v-if="savingsPercent" class="pp-save">−{{ savingsPercent }}%</span>
          </button>
        </div>

        <p v-if="errorMessage" class="pp-error" role="alert">{{ errorMessage }}</p>
        <p v-else-if="selectedQuote?.trialPeriod" class="pp-error" role="status">This plan is temporarily unavailable. Please choose another billing option.</p>

        <div class="pp-pricing">
          <article class="pp-tier">
            <div class="pp-tier-head"><h2>Free</h2></div>
            <p class="pp-lead">For trying Mopiq out</p>
            <div class="pp-amount"><strong>{{ freePrice }}</strong><span>forever</span></div>
            <p class="pp-amount-note">No card needed</p>
            <router-link class="pp-btn pp-btn-ghost" :to="accountTo">Keep studying for free</router-link>
            <ul class="pp-list">
              <li><Glyph d="M5 12.5l4.5 4.5L19 7" />Create and study your own decks</li>
              <li><Glyph d="M5 12.5l4.5 4.5L19 7" />{{ dailyLimit }} cards a day</li>
              <li><Glyph d="M5 12.5l4.5 4.5L19 7" />AI quizzes within your daily allowance</li>
              <li class="pp-dim"><Glyph d="M6 6l12 12M18 6 6 18" />AI-optimised review schedule</li>
              <li class="pp-dim"><Glyph d="M6 6l12 12M18 6 6 18" />Premium pre-made decks</li>
            </ul>
          </article>

          <article ref="plusCard" class="pp-tier pp-plus">
            <div class="pp-tier-head">
              <h2>Mopiq Plus</h2>
              <span class="pp-plan-badge">{{ badge }}</span>
            </div>
            <p class="pp-lead">For learning without limits</p>
            <div class="pp-amount" :key="heroAmount + heroPer" aria-live="polite">
              <strong>{{ heroAmount }}</strong><span>{{ heroPer }}</span>
            </div>
            <p class="pp-amount-note">
              <template v-if="frequency === 'year' && yearQuote">
                {{ yearQuote.formatted }} billed yearly
                <template v-if="savingsPercent"> · <b>save {{ savingsPercent }}%</b></template>
              </template>
              <template v-else-if="monthQuote">Billed monthly · cancel anytime</template>
              <template v-else>Loading prices…</template>
            </p>
            <button class="pp-btn pp-btn-grad" type="button" :disabled="!canSubscribe" @click="subscribe">
              {{ ctaLabel }}
              <Glyph d="M5 12h14M13 6l6 6-6 6" />
            </button>
            <p class="pp-fine">{{ finePrint }}</p>
            <ul class="pp-list">
              <li><Glyph d="M5 12.5l4.5 4.5L19 7" />Unlimited cards every day</li>
              <li><Glyph d="M5 12.5l4.5 4.5L19 7" />Unlimited AI quiz questions</li>
              <li><Glyph d="M5 12.5l4.5 4.5L19 7" />AI that improves your learning quality and speed</li>
              <li><Glyph d="M5 12.5l4.5 4.5L19 7" />10,000+ premium pre-made decks</li>
              <li><Glyph d="M5 12.5l4.5 4.5L19 7" />The same Plus features as the iPhone app</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="features" class="pp-subjects">
        <span class="pp-eyebrow">Made for whatever you're studying</span>
        <h2>One subscription. Every subject.</h2>
        <div class="pp-chips">
          <span v-for="topic in topics" :key="topic.label"><span class="pp-topic-icon" aria-hidden="true">{{ topic.icon }}</span>{{ topic.label }}</span>
        </div>
        <div class="pp-highlights">
          <article>
            <div class="pp-ic"><Glyph d="M7 8c-2.2 0-4 1.8-4 4s1.8 4 4 4c3 0 7-8 10-8 2.2 0 4 1.8 4 4s-1.8 4-4 4c-3 0-7-8-10-8z" /></div>
            <h3>Study on your schedule</h3>
            <p>No daily limits. Do ten cards on the bus or five hundred the night before an exam.</p>
          </article>
          <article>
            <div class="pp-ic"><Glyph d="M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6-5.6-1.9 5.6-1.9z" /></div>
            <h3>Reviews that adapt to you</h3>
            <p>Mopiq's AI learns what you know and what you're about to forget, so each session counts.</p>
          </article>
          <article>
            <div class="pp-ic"><Glyph :d="['M5 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z', 'M7 4h12a2 2 0 0 1 2 2v10']" /></div>
            <h3>Skip the setup</h3>
            <p>Open one of more than 10,000 premium decks and start learning in seconds.</p>
          </article>
        </div>
      </section>

      <section id="compare" class="pp-compare-wrap">
        <span class="pp-eyebrow">Compare</span>
        <h2>Free vs. Plus, side by side</h2>
        <div class="pp-compare">
          <table>
            <thead>
              <tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Plus</th></tr>
            </thead>
            <tbody>
              <tr><td>Your own decks</td><td class="pp-yes">✓</td><td class="pp-yes">✓</td></tr>
              <tr><td>Cards per day</td><td>{{ dailyLimit }}</td><td>Unlimited</td></tr>
              <tr><td>AI quiz questions</td><td>Daily allowance</td><td>Unlimited</td></tr>
              <tr><td>AI-optimised reviews</td><td class="pp-no">—</td><td class="pp-yes">✓</td></tr>
              <tr><td>10,000+ premium decks</td><td class="pp-no">—</td><td class="pp-yes">✓</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="faq" class="pp-faq">
        <div>
          <span class="pp-eyebrow">FAQ</span>
          <h2>Questions, answered</h2>
          <p class="pp-sub">Can't find what you need? <a :href="helpUrl" target="_blank" rel="noopener">Contact support</a> and we'll help.</p>
        </div>
        <div>
          <details open>
            <summary>When will I be charged?<Glyph d="M6 9l6 6 6-6" /></summary>
            <p>Your first payment is taken at checkout. Monthly plans renew each month and yearly plans renew once a year, until you cancel. Web subscriptions do not include a free trial.</p>
          </details>
          <details>
            <summary>Can I switch or cancel later?<Glyph d="M6 9l6 6 6-6" /></summary>
            <p>Yes. Monthly and yearly plans renew automatically until you cancel from the link in your Paddle receipt. After you cancel, Plus stays active until the end of the period you already paid for.</p>
          </details>
          <details>
            <summary>I already subscribe in the iPhone app.<Glyph d="M6 9l6 6 6-6" /></summary>
            <p>Log in with the same Mopiq account first. If Plus is already active, you're all set and don't need to buy it again.</p>
          </details>
          <details>
            <summary>Is payment secure?<Glyph d="M6 9l6 6 6-6" /></summary>
            <p>Checkout is handled by Paddle, our payment partner. Mopiq never sees or stores your card details.</p>
          </details>
        </div>
      </section>

      <section class="pp-final">
        <h2>Your next exam will thank you.</h2>
        <p>{{ finalSub }}</p>
        <button class="pp-btn pp-btn-grad" type="button" :disabled="!canSubscribe" @click="subscribe">
          {{ ctaLabel }}
          <Glyph d="M5 12h14M13 6l6 6-6 6" />
        </button>
      </section>

      <footer class="pp-footer">
        <span>© {{ year }} Mopiq</span>
        <nav aria-label="Legal">
          <router-link to="/terms">Terms</router-link>
          <router-link to="/privacy">Privacy</router-link>
          <router-link to="/refund">Refund policy</router-link>
        </nav>
      </footer>
    </main>

    <div class="pp-sticky" :class="{ show: stickyVisible }">
      <div><small>{{ stickyPlan }}</small><strong>{{ stickyPrice }}</strong></div>
      <button class="pp-btn pp-btn-grad" type="button" :disabled="!canSubscribe" @click="subscribe">{{ shortCta }}</button>
    </div>
  </div>
</template>

<script>
import { h } from 'vue';
import { initializePaddle } from '@paddle/paddle-js';
import { HELP_CENTER_URL } from '../constants';
import { authReady, getCurrentUser, isLoggedIn } from '../auth/session';
import { readPaddleConfig } from '../pricing/paddleConfig';
import { plan } from '../pricing/plan';
import { formatMoney, yearlyMonthlyEquivalent, yearlySavingsPercent } from '../pricing/money';
import { FREE_CARD_DAILY_LIMIT } from '../study/freeStudyQuota';

const Glyph = {
  name: 'Glyph',
  props: { d: { type: [String, Array], required: true } },
  computed: {
    paths() {
      return Array.isArray(this.d) ? this.d : [this.d];
    },
  },
  render() {
    return h('svg', { class: 'pp-glyph', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
      this.paths.map((d, index) => h('path', { key: index, d })));
  },
};

export default {
  name: 'PricingPage',
  components: { Glyph },
  props: {
    country: { type: String, default: '' },
  },
  data() {
    return {
      plan,
      frequency: 'year',
      paddle: null,
      quotes: {},
      currency: '',
      loadingPrices: true,
      errorMessage: '',
      customerEmail: '',
      loggedIn: false,
      stickyVisible: false,
      helpUrl: HELP_CENTER_URL,
      dailyLimit: FREE_CARD_DAILY_LIMIT,
      topics: [
        { icon: '🩺', label: 'Medicine' }, { icon: '🗣️', label: 'Languages' },
        { icon: '🫁', label: 'Anatomy' },
        { icon: '🧬', label: 'Biology' }, { icon: '🧪', label: 'Chemistry' },
        { icon: '⚛️', label: 'Physics' }, { icon: '🏥', label: 'Nursing' },
        { icon: '📐', label: 'Maths' },
        { icon: '⚖️', label: 'Law' }, { icon: '🏛️', label: 'History' },
        { icon: '🌍', label: 'Geography' }, { icon: '📊', label: 'Economics' },
        { icon: '🧠', label: 'Psychology' }, { icon: '📚', label: 'School' },
        { icon: '💻', label: 'Computing' }, { icon: '⚙️', label: 'Engineering' },
        { icon: '🎵', label: 'Music' }, { icon: '🎨', label: 'Art' },
        { icon: '💭', label: 'Philosophy' }, { icon: '💼', label: 'Business' },
        { icon: '📝', label: 'Exams' },
      ],
    };
  },
  computed: {
    year() {
      return new Date().getFullYear();
    },
    accountTo() {
      return this.loggedIn ? '/decks' : { path: '/', query: { login: '1' } };
    },
    monthQuote() {
      return this.quotes[this.plan.priceId.month] || null;
    },
    yearQuote() {
      return this.quotes[this.plan.priceId.year] || null;
    },
    selectedQuote() {
      return this.frequency === 'year' ? this.yearQuote : this.monthQuote;
    },
    savingsPercent() {
      if (!this.monthQuote || !this.yearQuote) return null;
      return yearlySavingsPercent(this.monthQuote.lowest, this.yearQuote.lowest, this.currency);
    },
    monthlyEquivalent() {
      if (!this.yearQuote) return '';
      return yearlyMonthlyEquivalent(this.yearQuote.lowest, this.currency);
    },
    heroAmount() {
      if (this.loadingPrices || !this.selectedQuote) return '…';
      if (this.frequency === 'year' && this.monthlyEquivalent) return this.monthlyEquivalent;
      return this.selectedQuote.formatted;
    },
    heroPer() {
      if (!this.selectedQuote) return '';
      if (this.frequency === 'year' && this.monthlyEquivalent) return '/ month';
      return this.frequency === 'year' ? '/ year' : '/ month';
    },
    freePrice() {
      return this.currency ? formatMoney(0, this.currency) : '…';
    },
    badge() {
      return this.frequency === 'year' ? 'Most popular' : 'Flexible';
    },
    ctaLabel() {
      return this.frequency === 'year' ? 'Get Plus yearly' : 'Get Plus monthly';
    },
    shortCta() {
      return 'Get Plus';
    },
    finalSub() {
      if (this.frequency === 'year') return 'Plus for a year. Cancel anytime.';
      return 'Plus billed monthly. Cancel anytime.';
    },
    stickyPlan() {
      return this.frequency === 'year' ? 'Yearly' : 'Monthly';
    },
    stickyPrice() {
      if (!this.selectedQuote) return '…';
      const suffix = this.frequency === 'year' ? '/year' : '/month';
      return `${this.selectedQuote.formatted}${suffix}`;
    },
    finePrint() {
      if (this.loadingPrices || !this.selectedQuote) return 'Prices load for your country before checkout.';
      const period = this.frequency === 'year' ? 'year' : 'month';
      return `You'll be charged ${this.selectedQuote.formatted} today, then every ${period} until you cancel.`;
    },
    canSubscribe() {
      // Trials are configured on Paddle prices, so copy alone cannot remove them.
      return Boolean(this.paddle && this.selectedQuote && !this.selectedQuote.trialPeriod && !this.errorMessage);
    },
  },
  async mounted() {
    this.observePlusCard();
    await authReady;
    this.loggedIn = isLoggedIn();
    this.customerEmail = getCurrentUser()?.email || '';
    try {
      const { environment, token } = readPaddleConfig();
      const paddle = await initializePaddle({ environment, token });
      if (!paddle) throw new Error('Paddle.js did not initialize.');
      this.paddle = paddle;
      await this.loadPrices();
    } catch (error) {
      this.loadingPrices = false;
      this.errorMessage = error instanceof Error ? error.message : 'Could not load prices.';
    }
  },
  beforeUnmount() {
    this.stickyObserver?.disconnect();
  },
  methods: {
    onBillingKey(event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      this.frequency = this.frequency === 'month' ? 'year' : 'month';
      this.$nextTick(() => {
        this.$refs.billing?.querySelector('[aria-checked="true"]')?.focus();
      });
    },
    observePlusCard() {
      const card = this.$refs.plusCard;
      if (!card || typeof IntersectionObserver === 'undefined') return;
      this.stickyObserver = new IntersectionObserver(([entry]) => {
        this.stickyVisible = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      }, { threshold: 0.2 });
      this.stickyObserver.observe(card);
    },
    async resolveCountry() {
      if (/^[A-Z]{2}$/.test(this.country)) return this.country;
      try {
        const response = await fetch('/api/visitor-country');
        if (!response.ok) return '';
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return '';
        const body = await response.json();
        const code = typeof body.country === 'string' ? body.country.trim().toUpperCase() : '';
        return /^[A-Z]{2}$/.test(code) ? code : '';
      } catch {
        return '';
      }
    },
    async loadPrices() {
      const country = await this.resolveCountry();
      const address = country ? { countryCode: country } : undefined;
      const preview = await this.paddle.PricePreview({
        items: [
          { priceId: this.plan.priceId.month, quantity: 1 },
          { priceId: this.plan.priceId.year, quantity: 1 },
        ],
        ...(address ? { address } : {}),
      });
      const quotes = {};
      for (const item of preview.data.details.lineItems) {
        quotes[item.price.id] = {
          formatted: item.formattedTotals.total,
          lowest: item.totals.total,
          trialPeriod: item.price.trialPeriod,
        };
      }
      this.quotes = quotes;
      this.currency = preview.data.currencyCode;
      this.loadingPrices = false;
    },
    subscribe() {
      if (!this.canSubscribe) return;
      const origin = window.location.origin;
      this.paddle.Checkout.open({
        items: [{ priceId: this.plan.priceId[this.frequency], quantity: 1 }],
        ...(this.customerEmail ? { customer: { email: this.customerEmail } } : {}),
        settings: {
          displayMode: 'overlay',
          variant: 'one-page',
          successUrl: `${origin}/welcome`,
        },
      });
    },
  },
};
</script>

<style scoped>
.pp {
  --ink: #0d1324;
  --muted: #5b6478;
  --line: rgba(13, 19, 36, 0.09);
  --blue: #2f6bff;
  --violet: #8b5cf6;
  --mint: #14c8a8;
  --grad: linear-gradient(120deg, #2f6bff 0%, #8b5cf6 55%, #e25ce0 100%);
  position: relative;
  display: flow-root;
  isolation: isolate;
  min-height: 100vh;
  color: var(--ink);
  background: #f7f8fc;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, "Segoe UI", Roboto, sans-serif;
  line-height: normal;
  -webkit-font-smoothing: antialiased;
  overflow-x: clip;
}
.pp :where(h1, h2, h3, p) { margin: 0; }
.pp :where(a) { color: inherit; text-decoration: none; }
.pp :where(button) { font: inherit; color: inherit; cursor: pointer; background: none; border: 0; }
.pp button:disabled { cursor: default; opacity: 0.55; }
.pp :focus-visible { outline: 2px solid var(--blue); outline-offset: 3px; }
.pp :deep(.pp-glyph) {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pp-aurora { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.pp-aurora span { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.55; }
.pp-aurora .a { width: 620px; height: 620px; background: #7aa2ff; top: -260px; left: -140px; }
.pp-aurora .b { width: 560px; height: 560px; background: #c4a5ff; top: -200px; right: -160px; }
.pp-aurora .c { width: 520px; height: 520px; background: #8ff0d9; top: 420px; left: 38%; opacity: 0.35; }

.pp-nav-shell, .pp-wrap, .pp-sticky { position: relative; z-index: 1; }
.pp-nav-shell { position: sticky; top: 14px; z-index: 20; padding: 0 20px; }
.pp-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1100px;
  margin: 14px auto 0;
  padding: 10px 10px 10px 18px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 30px rgba(13, 19, 36, 0.06);
  border-radius: 16px;
}
.pp-brand { display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 20px; letter-spacing: -0.03em; }
.pp-nav-links { display: flex; gap: 4px; align-items: center; font-size: 14px; font-weight: 500; color: var(--muted); }
.pp-nav-links a { padding: 8px 12px; border-radius: 10px; }
.pp-nav-links a:hover { color: var(--ink); background: rgba(13, 19, 36, 0.05); }
.pp-login { background: var(--ink); color: #fff !important; padding: 9px 16px !important; }
.pp-login:hover { background: #242c42 !important; color: #fff !important; }

.pp-wrap { width: min(1100px, calc(100% - 40px)); margin-inline: auto; }
.pp-hero { text-align: center; padding: 84px 0 40px; }
.pp-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid var(--line);
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.pp-chip b { background: var(--grad); color: #fff; border-radius: 999px; padding: 3px 9px; font-size: 11px; letter-spacing: 0.03em; }
.pp-hero h1 { font-size: clamp(42px, 7vw, 80px); line-height: 1.02; letter-spacing: -0.045em; font-weight: 750; margin: 26px auto 0; max-width: 14ch; }
.pp-grad { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.pp-hero > p { font-size: clamp(16px, 1.9vw, 19px); line-height: 1.6; color: var(--muted); max-width: 600px; margin: 22px auto 0; }

.pp-billing {
  position: relative;
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  margin: 40px auto 0;
  padding: 5px;
  border-radius: 14px;
  background: rgba(13, 19, 36, 0.06);
  border: 1px solid var(--line);
}
.pp-billing button {
  position: relative;
  z-index: 1;
  padding: 10px 22px;
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  white-space: nowrap;
  transition: color 0.2s;
}
.pp-billing button[aria-checked="true"] { color: var(--ink); }
.pp-save { font-size: 11px; font-weight: 700; color: #0c8a72; background: #d8f7ef; border-radius: 6px; padding: 2px 6px; }
.pp-thumb {
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: 5px;
  width: calc((100% - 10px) / 2);
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(13, 19, 36, 0.1), 0 0 0 1px rgba(13, 19, 36, 0.04);
  transition: transform 0.35s cubic-bezier(0.3, 1.2, 0.5, 1);
}
.pp-thumb.year { transform: translateX(100%); }
.pp-error { margin: 18px auto 0; max-width: 520px; color: #b42318; font-weight: 600; }

.pp-pricing { display: grid; grid-template-columns: 1fr 1.15fr; gap: 22px; max-width: 880px; margin: 36px auto 0; align-items: stretch; text-align: left; }
.pp-tier {
  position: relative;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 20px 50px rgba(13, 19, 36, 0.07);
  border-radius: 24px;
  padding: 32px;
  display: flex;
  flex-direction: column;
}
.pp-plus {
  background: linear-gradient(#0d1324, #0d1324) padding-box, var(--grad) border-box;
  border: 1.5px solid transparent;
  color: #fff;
  box-shadow: 0 30px 80px rgba(47, 107, 255, 0.28);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.pp-plus::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 23px;
  background:
    radial-gradient(600px 220px at 100% 0%, rgba(139, 92, 246, 0.35), transparent 60%),
    radial-gradient(400px 200px at 0% 0%, rgba(47, 107, 255, 0.25), transparent 60%);
  pointer-events: none;
}
.pp-plus > * { position: relative; z-index: 1; }
.pp-tier h2 { font-size: 20px; font-weight: 650; letter-spacing: -0.02em; }
.pp-tier-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.pp-plan-badge { font-size: 12px; font-weight: 650; padding: 5px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2); }
.pp-lead { font-size: 14px; color: var(--muted); margin-top: 6px; }
.pp-plus .pp-lead { color: rgba(255, 255, 255, 0.65); }
.pp-amount { display: flex; align-items: baseline; gap: 8px; margin-top: 26px; min-height: 64px; animation: pp-rise 0.22s ease; }
.pp-amount strong { font-size: 56px; line-height: 1; font-weight: 700; letter-spacing: -0.05em; font-variant-numeric: tabular-nums; }
.pp-amount span { font-size: 15px; color: var(--muted); }
.pp-plus .pp-amount span, .pp-plus .pp-amount-note { color: rgba(255, 255, 255, 0.7); }
.pp-amount-note { font-size: 14px; color: var(--muted); margin-top: 8px; min-height: 21px; line-height: 1.45; }
.pp-amount-note b { color: #8ff0d9; font-weight: 600; }
.pp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  padding: 15px 18px;
  font-size: 15px;
  font-weight: 650;
  margin-top: 26px;
  transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
}
.pp-btn :deep(.pp-glyph) { width: 18px; height: 18px; }
.pp-btn-ghost { background: rgba(13, 19, 36, 0.05); color: var(--ink); border: 1px solid var(--line); }
.pp-btn-ghost:hover { background: rgba(13, 19, 36, 0.08); }
.pp-btn-grad { background: var(--grad); color: #fff; box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4); }
.pp-btn-grad:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 34px rgba(139, 92, 246, 0.5); }
.pp-btn-grad:active:not(:disabled) { transform: none; }
.pp-fine { font-size: 12px; line-height: 1.55; text-align: center; margin-top: 12px; color: rgba(255, 255, 255, 0.55); min-height: 37px; }
.pp-list { list-style: none; padding: 24px 0 0; margin: 26px 0 0; display: grid; gap: 13px; font-size: 14.5px; border-top: 1px solid var(--line); }
.pp-plus .pp-list { border-color: rgba(255, 255, 255, 0.12); }
.pp-list li { display: flex; gap: 10px; align-items: flex-start; line-height: 1.45; }
.pp-list :deep(.pp-glyph) { margin-top: 1px; color: var(--mint); }
.pp-dim { color: var(--muted); }
.pp-dim :deep(.pp-glyph) { color: #aab1c2; }

.pp-subjects, .pp-compare-wrap { text-align: center; padding: 90px 0 20px; }
.pp-eyebrow { font-size: 13px; font-weight: 650; color: var(--blue); letter-spacing: 0.02em; }
.pp-subjects h2, .pp-compare-wrap h2, .pp-faq h2 { font-size: clamp(28px, 4vw, 42px); letter-spacing: -0.035em; font-weight: 700; margin-top: 10px; line-height: 1.1; }
.pp-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 28px; }
.pp-chips > span { display: inline-flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.75); border: 1px solid var(--line); border-radius: 999px; padding: 10px 16px; font-size: 14px; font-weight: 550; }
.pp-topic-icon { font-size: 16px; line-height: 1; }
.pp-highlights { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 60px; text-align: left; }
.pp-highlights article { background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 0.95); box-shadow: 0 10px 30px rgba(13, 19, 36, 0.05); border-radius: 20px; padding: 26px; }
.pp-ic { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; color: #fff; background: var(--grad); margin-bottom: 18px; }
.pp-ic :deep(.pp-glyph) { width: 20px; height: 20px; }
.pp-highlights h3 { font-size: 17px; font-weight: 650; letter-spacing: -0.02em; margin-bottom: 8px; }
.pp-highlights p { font-size: 14.5px; line-height: 1.6; color: var(--muted); }

.pp-compare { margin-top: 32px; background: rgba(255, 255, 255, 0.75); border: 1px solid rgba(255, 255, 255, 0.95); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(13, 19, 36, 0.05); text-align: left; }
.pp-compare table { width: 100%; border-collapse: collapse; font-size: 15px; }
.pp-compare th, .pp-compare td { padding: 16px 24px; border-bottom: 1px solid var(--line); }
.pp-compare tr:last-child td { border-bottom: 0; }
.pp-compare thead th { font-size: 13px; color: var(--muted); font-weight: 600; }
.pp-compare th:not(:first-child), .pp-compare td:not(:first-child) { text-align: center; width: 22%; }
.pp-compare td:last-child { font-weight: 600; }
.pp-compare thead th:last-child { color: var(--violet); }
.pp-yes { color: var(--mint); }
.pp-no { color: #b6bccb; }

.pp-faq { padding: 90px 0 20px; display: grid; grid-template-columns: 0.9fr 1.5fr; gap: 56px; text-align: left; }
.pp-sub { color: var(--muted); font-size: 15px; line-height: 1.6; margin-top: 14px; }
.pp-sub a { color: var(--blue); font-weight: 600; }
.pp-faq details { border-bottom: 1px solid var(--line); padding: 20px 0; }
.pp-faq details:first-child { padding-top: 4px; }
.pp-faq summary { list-style: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 20px; font-weight: 600; font-size: 16px; }
.pp-faq summary::-webkit-details-marker { display: none; }
.pp-faq summary :deep(.pp-glyph) { color: var(--muted); transition: transform 0.25s; }
.pp-faq details[open] summary :deep(.pp-glyph) { transform: rotate(180deg); }
.pp-faq details p { color: var(--muted); font-size: 15px; line-height: 1.65; margin-top: 12px; padding-right: 30px; }

.pp-final { margin: 90px auto 0; border-radius: 28px; padding: 56px 40px; text-align: center; color: #fff; background: #0d1324; position: relative; overflow: hidden; }
.pp-final::before { content: ""; position: absolute; inset: 0; background: radial-gradient(500px 260px at 15% 0%, rgba(47, 107, 255, 0.5), transparent 60%), radial-gradient(500px 260px at 85% 100%, rgba(226, 92, 224, 0.4), transparent 60%); }
.pp-final > * { position: relative; }
.pp-final h2 { font-size: clamp(28px, 4.5vw, 46px); letter-spacing: -0.04em; font-weight: 700; }
.pp-final p { color: rgba(255, 255, 255, 0.7); margin-top: 12px; font-size: 16px; }
.pp-final .pp-btn { display: inline-flex; margin-top: 28px; padding: 15px 26px; }

.pp-footer { display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; padding: 40px 0 60px; font-size: 13px; color: var(--muted); }
.pp-footer nav { display: flex; gap: 20px; }
.pp-footer a:hover { color: var(--ink); }

.pp-sticky {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 30;
  display: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 10px 10px 16px;
  border-radius: 16px;
  background: rgba(13, 19, 36, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  color: #fff;
  box-shadow: 0 12px 30px rgba(13, 19, 36, 0.3);
  transform: translateY(140%);
  transition: transform 0.3s;
}
.pp-sticky.show { transform: none; }
.pp-sticky:not(.show) { visibility: hidden; }
.pp-sticky small { display: block; font-size: 12px; color: rgba(255, 255, 255, 0.6); }
.pp-sticky strong { font-size: 15px; }
.pp-sticky .pp-btn { margin: 0; padding: 12px 16px; font-size: 14px; }

#features, #compare, #faq { scroll-margin-top: 96px; }

@media (max-width: 860px) {
  .pp-pricing { grid-template-columns: 1fr; max-width: 480px; }
  .pp-plus { order: -1; }
  .pp-highlights, .pp-faq { grid-template-columns: 1fr; }
  .pp-faq { gap: 20px; }
  .pp-sticky { display: flex; }
}
@media (max-width: 560px) {
  .pp-nav-links a:not(.pp-login) { display: none; }
  .pp-hero { padding-top: 56px; }
  .pp-billing { display: grid; width: min(100%, 420px); }
  .pp-billing button { padding: 10px 6px; font-size: 13px; flex-direction: column; gap: 3px; }
  .pp-tier { padding: 24px; }
  .pp-compare th, .pp-compare td { padding: 14px 12px; font-size: 14px; }
  .pp-final { padding: 44px 22px; border-radius: 22px; }
  .pp-footer { padding-bottom: 110px; }
}
@media (prefers-reduced-motion: reduce) {
  .pp-amount, .pp-thumb, .pp-sticky, .pp-faq summary :deep(.pp-glyph), .pp-btn { animation: none; transition: none; }
}
@keyframes pp-rise {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}
</style>
