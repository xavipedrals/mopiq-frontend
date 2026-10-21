<template>
  <div class="container general-container legal-document">
    <div class="text-container">
      <router-link to="/">
        <img src="/logo-small.svg" class="homeLogo" alt="Mopiq">
      </router-link>
      <h1 class="textTitle">{{ $t('common.refund') }}</h1>
      <p class="bodyText legal-revision">Last updated: 21 October 2026</p>
      <p class="bodyText">This policy supplements the paid-access provisions of the Mopiq Flashcards Terms of Service. The applicable seller and billing channel determine how cancellation, withdrawal, and refund requests are processed, subject to mandatory consumer rights.</p>

      <h2 class="textSection">Subscriptions paid on an Apple device</h2>
      <p class="bodyText">Subscriptions paid through the App Store on an iPhone, iPad, or Mac are billed by Apple. Apple handles cancellation and refunds for those purchases. We cannot refund an App Store payment. To request a refund, follow <a :href="appleGuideUrl" target="_blank" rel="noopener">Apple's guide</a>. To stop renewal, open Settings, tap your name, then Subscriptions.</p>

      <h2 class="textSection">Subscriptions paid on this website</h2>
      <p class="bodyText">These rules apply to subscriptions bought on mopiq.app.</p>

      <h2 class="textSection">First payment</h2>
      <p class="bodyText">Unless an offer expressly provides otherwise, web subscriptions do not include a free trial. The first payment is collected at checkout for the billing period shown in your order.</p>

      <h2 class="textSection">Renewals</h2>
      <p class="bodyText">Subscriptions renew until you cancel. Cancel before the current period ends and you will not be charged for the next period. Access continues until the end of the period you already paid for.</p>

      <h2 class="textSection">Withdrawal and refunds</h2>
      <p class="bodyText">EU and UK consumers generally have 14 days from conclusion of a distance contract to withdraw, subject to applicable statutory conditions and exceptions. Immediate access does not automatically remove that right. Any valid loss of the right for digital content, or proportionate payment for services already supplied, depends on the nature of the purchase, the required disclosures and express consents, and applicable law. Request withdrawal through Paddle or contact support within the applicable period for assistance. Statutory remedies for defective or non-conforming service remain available. Later price reductions do not create a right to a retrospective price adjustment.</p>

      <h2 class="textSection">How to cancel</h2>
      <p class="bodyText">Use the link in your Paddle receipt or the subscription management page and cancel before the next renewal. Account deletion or removal of the application does not itself cancel a subscription.</p>

      <h2 class="textSection">Contact us</h2>
      <p class="bodyText">Questions about a charge can be sent to <a href="mailto:support@mopiq.app">support@mopiq.app</a>.</p>
    </div>
    <hr>
    <FooterComponent/>
  </div>
</template>

<style scoped src="../legal.css"></style>

<script>
import { appleRefundGuideUrl } from '../refund/appleRefundGuide';
import FooterComponent from './Footer.vue';

export default {
  name: 'RefundPolicy',
  components: {
    FooterComponent,
  },
  computed: {
    appleGuideUrl() {
      const locales = [];
      if (typeof navigator !== 'undefined') {
        if (Array.isArray(navigator.languages)) locales.push(...navigator.languages);
        if (navigator.language) locales.push(navigator.language);
      }
      return appleRefundGuideUrl({
        language: this.$i18n.locale,
        browserLocales: locales,
      });
    },
  },
};
</script>
