<template>
  <div class="container general-container">
    <div class="text-container">
      <router-link to="/">
        <img src="/logo-small.svg" class="homeLogo" alt="Mopiq">
      </router-link>
      <h1 class="textTitle">{{ $t('common.refund') }}</h1>
      <p class="bodyText">This refund policy is a contract between you and Xavier Pedrals for paid subscriptions to Mopiq Flashcards. It matches the Paid Services section of our Terms of Service. Who handles a refund depends on where you paid.</p>

      <p class="bodyText textSection">Subscriptions paid on an Apple device</p>
      <p class="bodyText">Subscriptions paid through the App Store on an iPhone, iPad, or Mac are billed by Apple. Apple handles cancellation and refunds for those purchases. We cannot refund an App Store payment. To request a refund, follow <a :href="appleGuideUrl" target="_blank" rel="noopener">Apple's guide</a>. To stop renewal, open Settings, tap your name, then Subscriptions.</p>

      <p class="bodyText textSection">Subscriptions paid on this website</p>
      <p class="bodyText">These rules apply to subscriptions bought on mopiq.app.</p>

      <p class="bodyText textSection">First payment</p>
      <p class="bodyText">Web subscriptions do not include a free trial. Your first payment is taken at checkout for the monthly or yearly billing period you choose.</p>

      <p class="bodyText textSection">Renewals</p>
      <p class="bodyText">Subscriptions renew until you cancel. Cancel before the current period ends and you will not be charged for the next period. Access continues until the end of the period you already paid for.</p>

      <p class="bodyText textSection">Refunds</p>
      <p class="bodyText">Payments that have already been collected are not refunded, whether or not you use the service. We do not refund a payment because of a later price reduction or promotion.</p>

      <p class="bodyText textSection">How to cancel</p>
      <p class="bodyText">Use the link in your Paddle receipt, or the subscription management page, and cancel before the period ends.</p>

      <p class="bodyText textSection">Contact us</p>
      <p class="bodyText">Questions about a charge can be sent to support@ankiflashcards.app.</p>
    </div>
    <hr>
    <FooterComponent/>
  </div>
</template>

<style>
.general-container {
  background: #ffffff;
  box-shadow: 0 6px 20px 0 #CBD5E1;
}
.text-container {
  padding: 24px;
}
.homeLogo {
  margin-top: 30px;
}
.textTitle {
  margin-top: 45px;
  margin-bottom: 35px;
  font-weight: 600;
}
.textSection {
  font-size: 1.3em;
  font-weight: 600;
  margin-top: 40px;
}
.bodyText {
  text-align: justify;
}
.bodyText a {
  color: #0a7aff;
}
@media (max-width: 576px) {
  .text-container {
    padding: 12px;
  }
}
</style>

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
