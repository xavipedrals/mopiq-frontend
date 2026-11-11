<template>
  <div class="container general-container legal-document">
    <main class="text-container" lang="en">
      <router-link to="/">
        <img src="/logo-small.svg" class="homeLogo" alt="Mopiq">
      </router-link>
      <h1 class="textTitle">Delete your Mopiq Flashcards account</h1>
      <p class="bodyText">You can delete your account from your web profile or ask us to delete it by email. Both options work without the app.</p>
      <p class="bodyText">To keep your account, <router-link to="/delete-data">request deletion of specific data</router-link> instead.</p>

      <div class="deletion-options">
        <section class="deletion-option" aria-labelledby="delete-online">
          <h2 id="delete-online" class="textSection">Delete online</h2>
          <p class="bodyText">Sign in with the same account you use in Mopiq. In your profile, open <strong>Settings</strong>, select the row with your name or email, then choose <strong>Delete account</strong> and confirm. You may be asked to sign in again for security.</p>
          <router-link to="/profile" class="deletion-action primary-action">Open web profile</router-link>
        </section>

        <section class="deletion-option" aria-labelledby="delete-by-email">
          <h2 id="delete-by-email" class="textSection">Request deletion by email</h2>
          <p class="bodyText">Email <strong>support@mopiq.app</strong> and include the address you use to sign in. We’ll verify ownership through the email address already on the account before deleting it. If you can’t access that inbox, tell us so we can help you verify ownership another way.</p>
          <a :href="requestEmail" class="deletion-action">Email a deletion request</a>
        </section>
      </div>

      <section aria-labelledby="deletion-data">
        <h2 id="deletion-data" class="textSection">What happens to your data</h2>
        <ul class="bodyText data-details">
          <li><strong>Deleted.</strong> Your Mopiq account and profile, saved decks and flashcards, associated uploads, and study progress.</li>
          <li><strong>Kept for a limited time.</strong> Backup copies expire on their scheduled rotation. Billing and tax records may be kept for the required statutory period. Security or dispute records may be kept for the applicable claim period or while a legal hold is in effect.</li>
          <li><strong>May remain.</strong> Irreversibly anonymized statistics and copies of decks that other users independently imported.</li>
        </ul>
        <p class="bodyText">If you email us, we normally respond within one month and will let you know when deletion is complete. See the <router-link to="/privacy">Privacy Policy</router-link> for more about retention and deletion.</p>
      </section>

      <section aria-labelledby="deletion-subscription">
        <h2 id="deletion-subscription" class="textSection">If you have a subscription</h2>
        <p class="bodyText">Cancel it separately to stop future charges. Follow the <a href="https://support.google.com/googleplay/answer/7018481">Google Play cancellation instructions</a> or the <router-link to="/refund">App Store and web cancellation instructions</router-link>.</p>
      </section>
    </main>
    <hr>
    <FooterComponent />
  </div>
</template>

<script setup>
import FooterComponent from './Footer.vue';

const subject = encodeURIComponent('Mopiq Flashcards account deletion request');
const body = encodeURIComponent('Please delete my Mopiq Flashcards account and associated data.\n\nEmail I use to sign in: ');
const requestEmail = `mailto:support@mopiq.app?subject=${subject}&body=${body}`;
</script>

<style scoped src="../legal.css"></style>

<style scoped>
.deletion-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 24px;
}
.deletion-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 1px solid var(--legal-rule);
  border-radius: 12px;
  padding: 20px;
}
.deletion-option .textSection {
  margin-top: 0;
}
.deletion-option .deletion-action {
  margin-top: auto;
}
@media (max-width: 640px) {
  .deletion-options {
    grid-template-columns: 1fr;
  }
}
</style>
