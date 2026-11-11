<template>
  <div class="container general-container legal-document">
    <main class="text-container" lang="en">
      <router-link to="/">
        <img src="/logo-small.svg" class="homeLogo" alt="Mopiq">
      </router-link>
      <h1 class="textTitle">Delete selected Mopiq Flashcards data</h1>
      <p class="bodyText">You can request deletion of specific data while keeping your Mopiq account active. You can start by email even if you no longer have the app.</p>

      <section class="request-panel" aria-labelledby="request-data-deletion">
        <h2 id="request-data-deletion" class="textSection">Request deletion by email</h2>
        <ol class="bodyText data-details">
          <li>Email <strong>support@mopiq.app</strong> and include the email address you use to sign in.</li>
          <li>Describe what you want erased. A file name, deck name, or approximate date can help us find it.</li>
          <li>Confirm ownership through the email address already on your account. Tell us if you’ve lost access to that inbox.</li>
        </ol>
        <a :href="requestEmail" class="deletion-action primary-action">Email a data deletion request</a>
      </section>

      <section aria-labelledby="what-can-be-erased">
        <h2 id="what-can-be-erased" class="textSection">What you can ask us to erase</h2>
        <p class="bodyText">You can request deletion of an uploaded file, such as a source file you submitted for import. You can also ask us to review specific saved decks, flashcards, or study records for erasure. We normally respond within one month. After verification, we’ll confirm what we can erase and let you know when the request is complete.</p>
        <p class="bodyText">Removing a deck or card from your library can leave stored copies behind. Use the email option if you want us to review those copies for erasure.</p>
      </section>

      <section aria-labelledby="what-may-be-kept">
        <h2 id="what-may-be-kept" class="textSection">What may be kept</h2>
        <p class="bodyText">Your sign-in details and data outside the request stay with your account. Backup copies expire on their scheduled rotation. Billing, tax, security, and dispute records may be kept for the applicable statutory or claim period, or while a legal hold is in effect. Irreversibly anonymized statistics and independent copies imported by other users may remain.</p>
        <p class="bodyText">See the <router-link to="/privacy">Privacy Policy</router-link> for details. To close your account, use the <router-link to="/delete-account">account deletion page</router-link>.</p>
      </section>
    </main>
    <hr>
    <FooterComponent />
  </div>
</template>

<script setup>
import FooterComponent from './Footer.vue';

const subject = encodeURIComponent('Mopiq Flashcards data deletion request');
const body = encodeURIComponent([
  'Please erase the data listed below and keep my Mopiq Flashcards account active.',
  '',
  'Email I use to sign in: ',
  'Data I want erased: ',
  'Details to help find it: ',
].join('\r\n'));
const requestEmail = `mailto:support@mopiq.app?subject=${subject}&body=${body}`;
</script>

<style scoped src="../legal.css"></style>

<style scoped>
.request-panel {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid var(--legal-rule);
  border-radius: 12px;
}
.request-panel .textSection {
  margin-top: 0;
}
</style>
