<template>
  <div class="welcome-page">
    <main>
      <h1>You're in</h1>
      <p>Mopiq Flashcards Pro is ready on this account.</p>
      <a href="/decks">Go to your decks</a>
    </main>
  </div>
</template>

<script>
export default { name: 'WelcomePage' };
</script>

<style scoped>
.welcome-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--page-bg);
  color: var(--text);
  text-align: center;
  padding: 24px;
}
h1 { color: var(--title); margin-bottom: 8px; }
a { color: var(--blue-button); font-weight: 700; }
</style>
