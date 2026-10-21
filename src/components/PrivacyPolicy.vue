<template>
  <div class="container general-container legal-document">
    <div class="text-container">
      <router-link to="/">
        <img src="/logo-small.svg" class="homeLogo" alt="Mopiq">
      </router-link>
      <h1 class="textTitle">{{ $t('common.privacy') }}</h1>
      <p class="bodyText legal-revision">Last updated: 21 October 2026</p>
      <p class="bodyText">This notice describes personal-data processing associated with Mopiq Flashcards and its applications and websites, including mopiq.app and ankiflashcards.app (the “Service”). References to “Mopiq”, “we”, and “our” mean the operator responsible for the processing described here. Privacy requests and questions must be sent to <a href="mailto:support@mopiq.app">support@mopiq.app</a>.</p>

      <h2 class="textSection">1. Data categories and sources</h2>
      <p class="bodyText"><strong>Account and profile records.</strong> Account identifiers, email address, name or display name, authentication-provider identifiers, profile image or avatar, language, preferences, and account timestamps. These originate from you, your selected sign-in provider, or your use of account controls. An installation or guest identifier may exist before sign-in.</p>
      <p class="bodyText"><strong>Study records and submitted materials.</strong> Decks, folders, notes, card fields, tags, images, audio, documents, imported packages, linked sources, and associated metadata; review events, answers, ratings, scheduling state, study duration, objectives, and progress. Content is stored on your device and, where the relevant feature uses server processing or synchronization, transmitted to the Service.</p>
      <p class="bodyText"><strong>Automated-processing records.</strong> Prompts, selected pages or extracted text, submitted images or recordings, transcripts, relevant card context, conversation messages sent to Ask AI, generated outputs, processing-job identifiers, status, and error information. The exact input depends on the function you initiate.</p>
      <p class="bodyText"><strong>Billing and entitlement records.</strong> Product and transaction identifiers, subscription or purchase status, renewal and cancellation information, and customer identifiers received from the relevant store or billing provider. Billing providers may also receive account contact details to associate purchases with your account. They collect payment and billing information directly; Mopiq does not receive your complete payment-card number.</p>
      <p class="bodyText"><strong>Operational, analytics, and support records.</strong> IP address and request metadata, installation and session identifiers, device and operating-system information, application version, locale, feature interactions, onboarding answers, experiment assignments, purchase events, crash reports, synchronization diagnostics, and information supplied in feedback, abuse reports, or support messages. Certain identifiers and events may be associated with your account after sign-in. Some import workflows also upload a diagnostic copy of the source file to investigate parsing or conversion failures.</p>

      <h2 class="textSection">2. Purposes and legal bases</h2>
      <p class="bodyText">Account administration, authentication, synchronization, requested imports and generation, study scheduling, sharing, purchase validation, and contractual support are processed to perform the service agreement or take steps you request before entering it (GDPR Article 6(1)(b)). Required account or processing inputs must be supplied to use the corresponding function; withholding them may prevent it from operating.</p>
      <p class="bodyText">Security, fraud prevention, service reliability, fault investigation, and the establishment or defence of legal claims are based on legitimate interests (Article 6(1)(f)), subject to your rights and the required balancing of interests. Operational measurements and product analysis, including onboarding and feature experiments, are used to understand performance and improve the Service. Where consent is required for analytics or access to device storage, that consent is the applicable basis (Article 6(1)(a)); otherwise legitimate interests may apply. Statutory accounting, tax, and lawful-disclosure obligations rely on Article 6(1)(c).</p>
      <p class="bodyText">Accepting the Terms does not constitute consent to optional analytics. You can withdraw consent without affecting processing lawfully carried out beforehand. We do not sell personal information.</p>

      <h2 class="textSection">3. AI, imports, and media processing</h2>
      <p class="bodyText">When you request generation, transcription, speech synthesis, document conversion, or an AI explanation, the relevant material is transmitted to the processing services needed to fulfil that request. This can include document text or page images, audio, transcripts, source links, and card questions and answers or chat context. Server-side jobs and outputs may be stored so processing can resume and results can synchronize between devices.</p>
      <p class="bodyText">These functions involve external processing; do not assume that all analysis occurs on your device. This notice does not promise zero retention by external providers or that every provider applies identical data-use terms. Contact support for information about the recipients and safeguards relevant to a particular feature. Avoid including passwords, payment credentials, identifiable patient records, or other unnecessary sensitive information in study materials.</p>
      <p class="bodyText">Camera, photo-library, microphone, and notification permissions are used for the functions you select and can be managed in device settings. Revoking permission can disable that function; it does not automatically erase previously uploaded material. You are responsible for obtaining any permission required to record or submit information about other people.</p>

      <h2 class="textSection">4. Recipient categories and sharing</h2>
      <p class="bodyText">Data is processed by providers of hosting, databases and storage, authentication, content delivery, AI inference and media conversion, subscription administration, communications, analytics, and diagnostics, to the extent relevant to their role. Authorized personnel may access data when necessary to operate the Service, resolve support requests, investigate errors, or address abuse. This includes diagnostic source-file copies where the applicable import workflow creates them.</p>
      <p class="bodyText">Apple administers App Store transactions and Paddle acts as merchant of record for website purchases. Those organizations also process transaction data for their own billing, fraud-prevention, and legal purposes under their respective notices. Sign-in and external-content providers may likewise act independently for their own services.</p>
      <p class="bodyText">A deck you share or publish, its included media, and displayed attribution may be accessible to other users or anyone with its link. Recipients can forward links and retain imported copies. Private decks are not deliberately published through sharing features unless you select them. We may disclose relevant records where legally required, to protect rights or investigate abuse, or in a business transfer subject to applicable data-protection obligations.</p>

      <h2 class="textSection">5. Processing locations and international transfers</h2>
      <p class="bodyText">Service providers may process data outside your country, including outside the European Economic Area, depending on the feature and recipient. Transfers subject to European data-protection law require an applicable legal mechanism, such as an adequacy decision or appropriate contractual safeguards, together with supplementary measures where necessary. You may contact support to request the destinations, applicable transfer mechanism, and information on obtaining a copy of relevant safeguards. This notice does not represent that all data remains in the EU.</p>

      <h2 class="textSection">6. Retention and deletion</h2>
      <p class="bodyText">Account and synchronized study records are retained while needed to provide your account and the functions you use. Source files, generated materials, processing-job records, and diagnostic copies may remain after a job finishes where required for resuming processing, synchronization, error investigation, or support. Retention depends on the record’s purpose, whether the issue remains open, deletion requests, and applicable legal obligations; completion of an import does not itself mean its source file has been erased.</p>
      <p class="bodyText">Account deletion is available in the application and web profile and may require recent authentication. It initiates account removal and related data cleanup. If residual content remains or you need deletion of a specific upload, contact support. Deletion is not a guarantee of immediate removal from every backup, processing system, or independent recipient. Billing and tax records, security or dispute records, and records subject to a legal hold may be retained for the applicable statutory or claim period. Backup copies follow the relevant backup lifecycle. Irreversibly anonymized statistics and copies independently imported by other users may remain.</p>
      <p class="bodyText">Deleting an account, clearing browser storage, or uninstalling the application does not cancel a store or website subscription. Use the applicable subscription-management controls separately.</p>

      <h2 class="textSection">7. Browser storage and analytics controls</h2>
      <p class="bodyText">The website uses browser storage and session mechanisms for authentication, language and appearance preferences, pending operations, and your analytics choice. Refusing optional analytics does not disable storage necessary for requested functions.</p>
      <p class="bodyText">Website analytics is initialized after you select Allow on the cookie notice and records visits and sign-in events. To change that choice, clear site data for the relevant domain, reload the website, and select Refuse. This also removes local preferences and may sign you out. Clearing data for mopiq.app does not change a choice stored separately for ankiflashcards.app or another browser.</p>
      <p class="bodyText">Application analytics and diagnostics are separate from the website choice and can include the operational and interaction records described above. The website cookie setting does not disable app telemetry. Contact support about your rights, available controls, or an objection to processing based on legitimate interests.</p>

      <h2 class="textSection">8. Rights and request procedure</h2>
      <p class="bodyText">Subject to the conditions and exceptions in applicable law, you may request access, rectification, erasure, restriction, and portability of personal data; object to processing based on legitimate interests; and withdraw consent where processing relies on it. Send requests to <a href="mailto:support@mopiq.app">support@mopiq.app</a> with enough information to identify the relevant account and request. Proportionate identity verification may be necessary. GDPR requests are normally answered within one month; any lawful extension and its reason will be communicated.</p>

      <h2 class="textSection">9. Revisions and related documents</h2>
      <p class="bodyText">The revision date identifies this notice’s latest update. Material changes will be communicated where required by law. If a new processing purpose requires consent, that consent must be obtained before the relevant processing begins. This notice should be read with the <router-link to="/terms">Terms of Service</router-link> and <router-link to="/refund">Refund Policy</router-link>.</p>
    </div>
    <hr>
    <FooterComponent/>
  </div>
</template>

<style scoped src="../legal.css"></style>

<script>
import FooterComponent from './Footer.vue';

export default {
  name: 'PrivacyPolicy',
  components: {
    FooterComponent
  }
};
</script>
