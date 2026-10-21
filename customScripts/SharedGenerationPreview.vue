<template>
  <main class="preview-shell">
    <p class="preview-caption">Component preview · shared generation</p>
    <h1>Biology — Cell division</h1>
    <SharedGenerationStatus deck-id="preview" :preview-job="job" />
    <section class="preview-card"><MagicImportPanel ref="form" source="pdf" /></section>
  </main>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import MagicImportPanel from '../src/components/MagicImportPanel.vue';
import SharedGenerationStatus from '../src/components/SharedGenerationStatus.vue';
const form = ref(null);
const job = { id: 'preview', deck_version_id: 'preview', status: 'generating', inserted_cards: 128, revision: 4 };
onMounted(() => {
  form.value.sharedGenerationEnabled = true;
  form.value.pdfPhase = 'pages';
  form.value.pdfPages = ['Mitosis', 'Meiosis'].map((title, i) => ({ number: i + 1, thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="290" viewBox="0 0 220 290"><rect width="220" height="290" fill="white"/><text x="20" y="36" fill="#20283b" font-family="Arial" font-size="18" font-weight="bold">${title}</text><text x="20" y="60" fill="#7b8493" font-family="Arial" font-size="10">CELL DIVISION · BIOLOGY</text><circle cx="110" cy="125" r="35" fill="#edf3ff" stroke="#628bed"/><path d="M99 109l22 32m0-32l-22 32" stroke="#628bed" stroke-width="7"/><path d="M20 195h180m-180 15h170m-170 15h180m-180 15h140" stroke="#c7cdd8" stroke-width="4"/></svg>`) }));
  form.value.pdfPageSelection = [1, 2];
  form.value.generationInstructions = 'Focus on differences between cell types. Keep answers concise.';
});
</script>
