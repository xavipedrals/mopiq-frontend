<template>
  <div class="pricing-page">
    <div class="sheet">
      <div class="hero">
        <img src="/logo-small.svg" alt="">
      </div>
      <div class="body">
        <h1>Free full access to Mopiq Flashcards Plus</h1>
        <ol v-if="showTrial" class="timeline">
          <li>
            <span class="mark">🔓</span>
            <div>
              <strong>Today</strong>
              <p>Get instant access and see how it can change your life.</p>
            </div>
          </li>
          <li class="last">
            <span class="mark">★</span>
            <div>
              <strong>Day {{ trialDays }}</strong>
              <p>You’ll be charged on {{ trialEndLabel }}, cancel anytime before.</p>
            </div>
          </li>
        </ol>
        <div class="toggle" role="group" aria-label="Billing period">
          <button type="button" :class="{ on: frequency === 'month' }" @click="frequency = 'month'">Monthly</button>
          <button type="button" :class="{ on: frequency === 'year' }" @click="frequency = 'year'">Yearly</button>
        </div>
        <p v-if="showTrial" class="price-line">Try {{ trialDays }} days for free, then {{ priceText }}. No commitment. Cancel anytime.</p>
        <p v-else class="price-line">{{ priceText }} per month. Cancel anytime.</p>
        <section class="cancel">
          <h2>How can I cancel?</h2>
          <p>Use the link in your Paddle receipt, or the subscription management page, and cancel before the period ends.</p>
        </section>
        <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
        <button type="button" class="subscribe" :disabled="!canSubscribe" @click="subscribe">
          {{ showTrial ? 'Start your free trial week' : 'Subscribe' }}
        </button>
        <p v-if="showTrial" class="no-payment">✓ No payment now!</p>
      </div>
    </div>
  </div>
</template>

<script>
import { initializePaddle } from '@paddle/paddle-js';
import { authReady, getCurrentUser } from '../auth/session';
import { readPaddleConfig } from '../pricing/paddleConfig';
import { plan } from '../pricing/plan';

function trialDaysFrom(trialPeriod) {
  if (!trialPeriod || trialPeriod.interval !== 'day' || !trialPeriod.frequency) return 0;
  return trialPeriod.frequency;
}

export default {
  name: 'PricingPage',
  props: {
    country: { type: String, default: '' },
  },
  data() {
    return {
      plan,
      frequency: 'year',
      paddle: null,
      prices: {},
      trialDaysByPrice: {},
      loadingPrices: true,
      errorMessage: '',
      customerEmail: '',
      resolvedCountry: '',
    };
  },
  computed: {
    selectedPriceId() {
      return this.plan.priceId[this.frequency];
    },
    priceText() {
      if (this.loadingPrices) return '…';
      return this.prices[this.selectedPriceId] || '…';
    },
    trialDays() {
      return this.trialDaysByPrice[this.selectedPriceId] || 0;
    },
    showTrial() {
      return this.trialDays > 0;
    },
    trialEndLabel() {
      if (!this.trialDays) return '';
      const end = new Date();
      end.setDate(end.getDate() + this.trialDays);
      return end.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    },
    canSubscribe() {
      return Boolean(this.paddle && this.prices[this.selectedPriceId] && !this.errorMessage);
    },
  },
  async mounted() {
    await authReady;
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
  methods: {
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
      this.resolvedCountry = await this.resolveCountry();
      const address = this.resolvedCountry ? { countryCode: this.resolvedCountry } : undefined;
      const preview = await this.paddle.PricePreview({
        items: [
          { priceId: this.plan.priceId.month, quantity: 1 },
          { priceId: this.plan.priceId.year, quantity: 1 },
        ],
        ...(address ? { address } : {}),
      });
      const prices = {};
      const trialDaysByPrice = {};
      for (const item of preview.data.details.lineItems) {
        prices[item.price.id] = item.formattedTotals.total;
        trialDaysByPrice[item.price.id] = trialDaysFrom(item.price.trialPeriod);
      }
      this.prices = prices;
      this.trialDaysByPrice = trialDaysByPrice;
      this.loadingPrices = false;
    },
    subscribe() {
      const origin = window.location.origin;
      this.paddle.Checkout.open({
        items: [{ priceId: this.selectedPriceId, quantity: 1 }],
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
.pricing-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 28px 16px;
  background: #e8eef6;
}
.sheet {
  width: min(700px, 100%);
  max-height: calc(100vh - 56px);
  overflow: auto;
  background: #fff;
  border-radius: 28px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}
.hero {
  height: 148px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.18), transparent 40%),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.12), transparent 36%),
    #0a7aff;
}
.hero img {
  width: 84px;
  height: 84px;
  background: #fff;
  border-radius: 22px;
  padding: 10px;
}
.body { padding: 28px 28px 24px; }
h1 {
  margin: 0 auto 24px;
  max-width: 320px;
  text-align: center;
  color: #1e293d;
  font-size: 1.5rem;
  line-height: 1.25;
}
.timeline {
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
}
.timeline li {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 14px;
  position: relative;
  padding-bottom: 18px;
}
.timeline li::before {
  content: "";
  position: absolute;
  left: 13px;
  top: 22px;
  bottom: 0;
  width: 3px;
  background: #0a7aff;
  border-radius: 3px;
}
.timeline li.last::before {
  background: linear-gradient(#0a7aff, transparent);
}
.mark {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #0a7aff;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 0.85rem;
  z-index: 1;
}
.timeline strong {
  display: block;
  color: #1e293d;
  font-size: 1.15rem;
  margin-bottom: 4px;
}
.timeline p { margin: 0; color: #475569; line-height: 1.45; }
.toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 4px;
  margin-bottom: 20px;
}
.toggle button {
  border: 0;
  background: transparent;
  border-radius: 999px;
  padding: 10px 12px;
  font-weight: 650;
  color: #475569;
  cursor: pointer;
}
.toggle button.on {
  background: #fff;
  color: #1e293d;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}
.price-line {
  margin: 0 0 22px;
  text-align: center;
  color: #1e293d;
  font-size: 1.05rem;
  line-height: 1.45;
}
.cancel {
  background: #e8f2ff;
  border-radius: 16px;
  padding: 16px 18px;
  margin-bottom: 20px;
}
.cancel h2 {
  margin: 0 0 8px;
  color: #1e293d;
  font-size: 1.05rem;
}
.cancel p { margin: 0; color: #475569; line-height: 1.5; }
.subscribe {
  width: 100%;
  border: 0;
  border-radius: 999px;
  background: #0a7aff;
  color: #fff;
  font-weight: 700;
  font-size: 1.05rem;
  padding: 14px 20px;
  cursor: pointer;
}
.subscribe:disabled { opacity: 0.5; cursor: default; }
.no-payment {
  margin: 10px 0 0;
  text-align: center;
  color: #1e293d;
  font-weight: 600;
}
.error { color: #dc2626; }
</style>
