<template>
  <section v-if="job && !['done', 'done_with_warnings', 'cancelled'].includes(job.status)" class="server-generation" role="status" aria-live="polite">
    <div><strong>{{ $t('generation.title') }}</strong><p>{{ $t('generation.saved', { count: job.inserted_cards }) }} · {{ $t(`generation.${job.status}`) }}</p></div>
    <div class="generation-actions">
      <button v-if="['queued', 'generating'].includes(job.status)" :disabled="busy" @click="control('pause')">{{ $t('generation.pause') }}</button>
      <button v-if="['paused', 'failed'].includes(job.status)" :disabled="busy" @click="control(job.status === 'failed' ? 'retry' : 'resume')">{{ $t(job.status === 'failed' ? 'generation.retry' : 'generation.resume') }}</button>
      <button v-if="!['done', 'done_with_warnings', 'cancelled'].includes(job.status)" :disabled="busy" @click="control('cancel')">{{ $t('generation.cancel') }}</button>
    </div>
    <p v-if="error || job.error_message" class="generation-error">{{ error || job.error_message }}</p>
  </section>
</template>
<script>
import { listSharedGenerationJobs, controlSharedGeneration } from '../api/aiGeneration';
import { getCurrentUser, onSessionChange } from '../auth/session';
export default {
  props: { deckId: { type: String, required: true }, previewJob: { type: Object, default: null } },
  emits: ['committed'],
  data: () => ({ job: null, busy: false, error: '', timer: null, refreshing: false, request: 0, disposed: false }),
  mounted() { if (!this.previewJob) this.unsubscribeSession = onSessionChange(() => { this.request++; this.job = null; this.error = ''; }); if (this.previewJob) { this.job = this.previewJob; return; } this.refresh(); this.timer = setInterval(() => this.refresh(), 5000); },
  beforeUnmount() { this.disposed = true; this.request++; this.unsubscribeSession?.(); clearInterval(this.timer); },
  watch: { deckId() { this.request++; this.job = null; this.error = ''; this.refresh(); } },
  methods: {
    async refresh() {
      if (this.refreshing || this.busy || this.previewJob) return;
      this.refreshing = true;
      const request = this.request;
      const deckId = this.deckId;
      const owner = getCurrentUser()?.supabaseUid;
      try {
        const jobs = await listSharedGenerationJobs();
        if (this.disposed || request !== this.request || deckId !== this.deckId || owner !== getCurrentUser()?.supabaseUid) return;
        this.job = jobs.find(j => j.deck_version_id === deckId) || null;
        if (this.job) this.$emit('committed', this.job);
      }
      catch { /* Older backends remain usable while the migration is staged. */ }
      finally { this.refreshing = false; }
    },
    async control(action) {
      if (this.previewJob) { this.job = { ...this.job, status: action === 'pause' ? 'paused' : action === 'cancel' ? 'cancelled' : 'queued' }; return; }
      this.busy = true; this.error = '';
      const request = ++this.request;
      const owner = getCurrentUser()?.supabaseUid;
      const id = this.job.id;
      try { const job = await controlSharedGeneration(id, action); if (!this.disposed && request === this.request && owner === getCurrentUser()?.supabaseUid && this.job?.id === id) this.job = job; }
      catch (e) { if (request === this.request && owner === getCurrentUser()?.supabaseUid) this.error = e.message; }
      finally { this.busy = false; }
    },
  },
};
</script>
<style scoped>
.server-generation { display:flex; flex-wrap:wrap; align-items:center; gap:12px; padding:16px 20px; margin:12px 20px; border:1px solid var(--border-color, #8892a044); border-radius:16px; background:var(--list-bg); color:var(--title); }
.server-generation p { margin:4px 0 0; color:var(--text-secondary); font-size:14px; }
.generation-actions { display:flex; gap:8px; margin-left:auto; }
.generation-actions button { border:1px solid #8892a055; background:transparent; border-radius:10px; padding:8px 12px; color:inherit; cursor:pointer; }
.generation-error { flex-basis:100%; }
</style>
