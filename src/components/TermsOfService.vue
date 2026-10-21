<template>
  <div class="container general-container legal-document">
    <div class="text-container">
      <router-link to="/">
        <img src="/logo-small.svg" class="homeLogo" alt="Mopiq">
      </router-link>
      <h1 class="textTitle">{{ $t('common.terms') }}</h1>
      <p class="bodyText legal-revision">Last updated: 21 October 2026</p>
      <p class="bodyText">These Terms govern access to Mopiq Flashcards and the associated applications and websites, including mopiq.app and ankiflashcards.app (collectively, the “Service”). “Mopiq”, “we”, “us”, and “our” refer to the operator of the Service. By using the Service, you agree to these Terms. Contractual and support correspondence must be directed to <a href="mailto:support@mopiq.app">support@mopiq.app</a>.</p>

      <h2 class="textSection">1. Scope and access conditions</h2>
      <p class="bodyText">The Service provides flashcard authoring, import and export, spaced-repetition study, progress tracking, synchronization, deck discovery and sharing, and automated study assistance. Feature availability, supported formats, processing limits, and platform compatibility vary by application version, account status, and subscription. An account is required for synchronization and certain other functions. You must provide accurate account information and safeguard your credentials.</p>
      <p class="bodyText">You must be at least 14 years old and meet any higher minimum age applicable where you live. If you cannot enter a binding contract independently, a parent or legal guardian must authorize your use and any purchase where required by law.</p>

      <h2 class="textSection">2. Software license and permitted use</h2>
      <p class="bodyText">Subject to these Terms, you receive a limited, personal, non-exclusive, non-transferable license to access the Service and install the application on devices you own or control, subject to applicable store rules. Intellectual property in the software, interface, service infrastructure, branding, and supplied materials remains with its respective owners. No rights are granted except those expressly stated or provided by mandatory law.</p>
      <p class="bodyText">You must not circumvent authentication, payment controls, usage quotas, or technical safeguards; interfere with availability; distribute malicious code; access another person’s account or data without authorization; or resell access without permission. Reverse engineering restrictions apply only to the extent permitted by law. Lawful security research and activities protected by mandatory law remain subject to those legal protections.</p>

      <h2 class="textSection">3. User materials and processing authorization</h2>
      <p class="bodyText">You retain your rights in decks, cards, notes, documents, images, recordings, and other materials you submit. You grant the permissions reasonably necessary to host, reproduce, synchronize, back up, convert, index, transmit, and display those materials in operating the Service. This includes extraction, transcription, speech synthesis, and automated generation when you invoke the corresponding function, together with processing necessary to investigate errors, security incidents, or support requests.</p>
      <p class="bodyText">You are responsible for having the rights and permissions required to upload, record, process, and share material, including permission from other participants where recording laws require it. Do not submit unlawful content, material infringing another person’s intellectual property or privacy, malware, or sexual exploitation material. Avoid submitting confidential information or sensitive personal data that is unnecessary for study.</p>

      <h2 class="textSection">4. Sharing and third-party materials</h2>
      <p class="bodyText">Private content is not deliberately published as a shared deck. Selecting a sharing or publication function can make the deck, associated media, and displayed attribution accessible to other users or anyone possessing the link. Links can be forwarded. Disabling access or deleting an account cannot recall copies another person has already downloaded or imported.</p>
      <p class="bodyText">Shared decks, external links, imported packages, and third-party resources may contain errors or material supplied by others. Their presence does not constitute endorsement or a guarantee of ownership, quality, or accuracy. Report suspected infringement or unlawful content through the reporting controls where available, or by email with the relevant link and sufficient detail to identify the issue.</p>

      <h2 class="textSection">5. Automated study functions</h2>
      <p class="bodyText">AI-assisted functions may process submitted text, selected document pages, images, audio, transcripts, linked-source material, and relevant card or conversation context through external processing services. Results may be incomplete, inaccurate, repetitive, or unsuitable for your intended use. You must verify generated cards, explanations, translations, quiz answers, and transcriptions against reliable sources before relying on them.</p>
      <p class="bodyText">The Service is an educational tool and does not provide medical, legal, financial, or other professional advice, accredited assessment, or a guarantee of examination results. Generative outputs may not be unique, and no exclusive intellectual property rights in an output are guaranteed. Processing can fail, be interrupted, or be subject to quotas and file limits.</p>

      <h2 class="textSection">6. Paid access, billing, and cancellation</h2>
      <p class="bodyText">The purchase screen specifies the price, currency, billing interval, included access, and any trial or promotional conditions. Recurring subscriptions renew unless cancelled through the applicable billing channel before renewal. Unless the purchase terms or mandatory law provide otherwise, cancellation stops future renewals and access continues for the paid period. Account deletion or removal of the application does not itself cancel a subscription.</p>
      <p class="bodyText">App Store purchases are billed and administered by Apple under its purchase terms. Use Apple’s subscription controls to cancel and its refund process to request repayment. Mopiq cannot directly reverse an App Store charge.</p>
      <p class="bodyText">Website purchases are sold and billed by Paddle as merchant of record under the terms presented at checkout. Web subscriptions have no free trial unless an offer expressly states otherwise. Subscription management is available through the billing portal or the links in your receipt. The <router-link to="/refund">Refund Policy</router-link> describes the applicable request channels.</p>
      <p class="bodyText">Consumers retain applicable withdrawal and conformity rights. EU and UK distance-purchase rules generally provide a 14-day withdrawal period, subject to statutory conditions and exceptions. Immediate access does not, by itself, establish that a withdrawal right has been waived. Any valid loss of that right or proportionate charge depends on the nature of the supply, the required disclosures and express consents, and applicable law. Refunds and withdrawal requests are handled through the relevant seller or billing channel.</p>
      <p class="bodyText">Price changes apply prospectively in accordance with applicable law and billing-platform requirements, with advance notice where required and an opportunity to cancel before the new price takes effect. A subsequent discount does not create an entitlement to a retrospective price adjustment, without prejudice to statutory remedies.</p>

      <h2 class="textSection">7. Synchronization, availability, and modifications</h2>
      <p class="bodyText">Synchronization and background processing depend on connectivity, device permissions, supported formats, and service availability. Keep independent copies of irreplaceable source materials and use export functions where available. The Service may be interrupted for maintenance, faults, security measures, or events beyond reasonable control; uninterrupted operation and a particular processing time are not guaranteed.</p>
      <p class="bodyText">Features may be modified or discontinued subject to applicable contractual and consumer rights. Material changes affecting paid access will be handled with the notice, cancellation, or other remedies required by law. Revised Terms will be published here, with additional notice of material changes where required. Changes do not retrospectively remove accrued rights.</p>

      <h2 class="textSection">8. Suspension and termination</h2>
      <p class="bodyText">You may stop using the Service and request account deletion through the available account controls. We may restrict content or suspend access where reasonably necessary to address a breach, fraud, unlawful activity, or a security risk, and provide notice and an explanation where practicable and legally permitted. Contact support to contest a restriction. Retention and deletion are described in the <router-link to="/privacy">Privacy Policy</router-link>; independent recipients may retain their own lawful records or imported copies.</p>

      <h2 class="textSection">9. Liability and mandatory protections</h2>
      <p class="bodyText">The Service is supplied subject to the standard of care and conformity obligations required by applicable law. Responsibility for loss is determined by applicable law, including causation, foreseeability, and any relevant failure to take reasonable precautions. Nothing in these Terms excludes mandatory consumer remedies or liability that cannot lawfully be limited, including liability for fraud or death or personal injury caused by negligence.</p>

      <h2 class="textSection">10. Applicable law and communications</h2>
      <p class="bodyText">Spanish law applies, without depriving consumers of mandatory protections or jurisdiction rights available under the law of their habitual residence. Consumers may use any court or dispute-resolution mechanism available to them under mandatory law. For disputes not subject to those protections, the courts of Barcelona, Spain, have jurisdiction. If a provision is unenforceable, the remaining provisions continue to apply to the extent permitted by law.</p>
      <p class="bodyText">Service, contractual, content-reporting, and privacy enquiries: <a href="mailto:support@mopiq.app">support@mopiq.app</a>.</p>
    </div>
    <hr>
    <FooterComponent/>
  </div>
</template>

<style scoped src="../legal.css"></style>

<script>
import FooterComponent from './Footer.vue';

export default {
  name: 'TermsOfService',
  components: {
    FooterComponent
  }
};
</script>
