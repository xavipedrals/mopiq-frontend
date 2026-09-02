<template>
  <Teleport to="body">
    <div v-if="open" class="ask-ai-root" @keydown.esc="close">
      <button type="button" class="ask-ai-backdrop" :aria-label="$t('askAi.close')" @click="close"></button>
      <section class="ask-ai-sheet" role="dialog" aria-modal="true" aria-labelledby="ask-ai-title">
        <header class="ask-ai-header">
          <button type="button" class="ask-ai-close" :aria-label="$t('common.close')" @click="close">×</button>
          <h2 id="ask-ai-title">{{ $t('askAi.title') }}</h2>
          <span class="ask-ai-header-spacer"></span>
        </header>

        <div ref="scroller" class="ask-ai-messages">
          <div
            v-for="message in messages"
            :key="message.id"
            class="ask-ai-row"
            :class="message.role"
          >
            <div v-if="message.role === 'user'" class="ask-ai-bubble user">{{ message.content }}</div>
            <div v-else class="ask-ai-bubble assistant">
              <div class="ask-ai-md" v-html="renderMarkdown(message.content)"></div>
              <span v-if="message.streaming" class="ask-ai-cursor"></span>
            </div>
          </div>
          <div v-if="thinking && !streaming" class="ask-ai-thinking" aria-live="polite">
            <span></span><span></span><span></span>
          </div>
        </div>

        <p v-if="limitReached" class="ask-ai-limit">
          {{ $t('askAi.limit') }}
        </p>
        <div v-else class="ask-ai-shortcuts">
          <button
            v-for="shortcut in shortcuts"
            :key="shortcut.preset"
            type="button"
            class="ask-ai-chip"
            :disabled="thinking"
            @click="sendShortcut(shortcut)"
          >
            {{ shortcut.title }}
          </button>
        </div>

        <form v-if="!limitReached" class="ask-ai-input" @submit.prevent="sendTyped">
          <input
            v-model="draft"
            type="text"
            maxlength="2000"
            :placeholder="$t('askAi.placeholder')"
            :disabled="thinking"
            autocomplete="off"
          >
          <button
            v-if="thinking"
            type="button"
            class="ask-ai-send stop"
            @click="stop"
          >
            {{ $t('askAi.stop') }}
          </button>
          <button
            v-else
            type="submit"
            class="ask-ai-send"
            :disabled="!draft.trim()"
          >
            {{ $t('askAi.send') }}
          </button>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { streamAskAi } from '../api/askAi';
import { getCurrentUser } from '../auth/session';

const MAX_USER_MESSAGES = 100;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(text) {
  const escaped = escapeHtml(text);
  const withCode = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  const withBold = withCode.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const lines = withBold.split('\n');
  const html = [];
  let inList = false;
  for (const line of lines) {
    const bullet = line.match(/^[-*] (.+)$/);
    const numbered = line.match(/^\d+\. (.+)$/);
    if (bullet || numbered) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${(bullet || numbered)[1]}</li>`);
    } else {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      html.push(line ? `<p>${line}</p>` : '<br>');
    }
  }
  if (inList) html.push('</ul>');
  return html.join('');
}

let nextId = 1;

export default {
  name: 'AskAISheet',
  props: {
    open: { type: Boolean, default: false },
    cardId: { type: [String, Number], default: null },
    cardQuestion: { type: String, default: '' },
    cardAnswer: { type: String, default: '' },
  },
  emits: ['close'],
  data() {
    return {
      messages: [],
      draft: '',
      thinking: false,
      abort: null,
    };
  },
  computed: {
    shortcuts() {
      return [
        { preset: 'eli5', title: this.$t('askAi.eli5'), message: this.$t('askAi.eli5Message') },
        { preset: 'example', title: this.$t('askAi.example'), message: this.$t('askAi.exampleMessage') },
        { preset: 'remember', title: this.$t('askAi.remember'), message: this.$t('askAi.rememberMessage') },
      ];
    },
    streaming() {
      return this.messages.some((message) => message.streaming);
    },
    limitReached() {
      return this.messages.filter((message) => message.role === 'user').length >= MAX_USER_MESSAGES;
    },
    renderMarkdown() {
      return renderMarkdown;
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.resetChat();
    },
    cardId() {
      if (this.open) this.resetChat();
    },
    messages: {
      deep: true,
      handler() {
        this.$nextTick(this.scrollToBottom);
      },
    },
  },
  beforeUnmount() {
    this.stop();
  },
  methods: {
    close() {
      this.stop();
      this.$emit('close');
    },
    resetChat() {
      this.stop();
      this.draft = '';
      this.messages = [{ id: nextId += 1, role: 'assistant', content: this.$t('askAi.welcome'), streaming: false }];
    },
    sendShortcut(shortcut) {
      this.send(shortcut.message, shortcut.preset);
    },
    sendTyped() {
      this.send(this.draft, null, true);
    },
    async send(raw, preset, clearInput = false) {
      const trimmed = String(raw || '').trim();
      if (!trimmed || this.thinking || this.limitReached) return;
      this.messages.push({ id: nextId += 1, role: 'user', content: trimmed, streaming: false });
      if (clearInput) this.draft = '';
      this.thinking = true;
      const apiMessages = this.messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));
      const controller = new AbortController();
      this.abort = controller;
      const replyId = nextId += 1;
      let started = false;
      try {
        await streamAskAi({
          messages: apiMessages,
          cardQuestion: this.cardQuestion,
          cardAnswer: this.cardAnswer,
          userId: getCurrentUser()?.firebaseUid || '',
          preset,
          signal: controller.signal,
          onToken: (token) => {
            if (!started) {
              this.messages.push({ id: replyId, role: 'assistant', content: token, streaming: true });
              started = true;
              return;
            }
            const message = this.messages.find((item) => item.id === replyId);
            if (message) message.content += token;
          },
        });
        const message = this.messages.find((item) => item.id === replyId);
        if (message) message.streaming = false;
        if (!started) {
          this.messages.push({
            id: replyId,
            role: 'assistant',
            content: this.$t('askAi.error'),
            streaming: false,
          });
        }
      } catch {
        if (controller.signal.aborted) return;
        const message = this.messages.find((item) => item.id === replyId);
        if (message) {
          message.streaming = false;
          if (!message.content) message.content = this.$t('askAi.error');
        } else {
          this.messages.push({
            id: nextId += 1,
            role: 'assistant',
            content: this.$t('askAi.error'),
            streaming: false,
          });
        }
      } finally {
        if (this.abort === controller) this.abort = null;
        this.thinking = false;
      }
    },
    stop() {
      this.abort?.abort();
      this.abort = null;
      this.thinking = false;
      this.messages = this.messages.map((message) => (
        message.streaming ? { ...message, streaming: false } : message
      ));
    },
    scrollToBottom() {
      const el = this.$refs.scroller;
      if (el) el.scrollTop = el.scrollHeight;
    },
  },
};
</script>

<style scoped>
.ask-ai-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.ask-ai-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.45);
  cursor: pointer;
}
.ask-ai-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(560px, 100%);
  height: min(720px, 92vh);
  background: var(--page-bg);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.2);
}
.ask-ai-header {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  padding: 12px 12px 8px;
}
.ask-ai-header h2 {
  margin: 0;
  text-align: center;
  font-size: 1.05rem;
  font-weight: 650;
  color: var(--title);
}
.ask-ai-close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: var(--inset-bg) !important;
  color: var(--title) !important;
  font-size: 1.4rem;
  line-height: 1;
  padding: 0 !important;
}
.ask-ai-messages {
  flex: 1;
  overflow: auto;
  padding: 8px 16px 72px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ask-ai-row.user { align-self: flex-end; max-width: 82%; }
.ask-ai-row.assistant { align-self: stretch; }
.ask-ai-bubble {
  font-size: 1rem;
  line-height: 1.45;
  word-wrap: break-word;
}
.ask-ai-bubble.user {
  background: var(--blue-button);
  color: var(--button-text);
  padding: 10px 14px;
  border-radius: 18px;
}
.ask-ai-bubble.assistant { color: var(--title); padding: 4px 0; }
.ask-ai-md :deep(p) { margin: 0 0 8px; }
.ask-ai-md :deep(p:last-child) { margin-bottom: 0; }
.ask-ai-md :deep(ul) { margin: 0 0 8px; padding-left: 1.2em; }
.ask-ai-md :deep(code) {
  font-size: 0.9em;
  background: var(--inset-bg);
  padding: 1px 5px;
  border-radius: 6px;
}
.ask-ai-cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  margin-left: 2px;
  background: var(--title);
  animation: ask-ai-blink 0.9s steps(1) infinite;
  vertical-align: -2px;
}
.ask-ai-thinking {
  display: flex;
  gap: 5px;
  padding: 8px 0;
}
.ask-ai-thinking span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: ask-ai-bounce 0.8s ease-in-out infinite;
}
.ask-ai-thinking span:nth-child(2) { animation-delay: 0.18s; }
.ask-ai-thinking span:nth-child(3) { animation-delay: 0.36s; }
.ask-ai-shortcuts {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 14px 10px;
}
.ask-ai-chip {
  flex: 0 0 auto;
  border: 1px solid var(--card-border) !important;
  background: var(--card-bg) !important;
  color: var(--title) !important;
  border-radius: 999px !important;
  padding: 10px 14px !important;
  font-size: 0.92rem !important;
  font-weight: 550 !important;
  letter-spacing: 0 !important;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}
.ask-ai-chip:disabled { opacity: 0.45; }
.ask-ai-limit {
  margin: 0;
  padding: 12px 16px;
  color: var(--text-secondary);
  font-size: 0.92rem;
}
.ask-ai-input {
  display: flex;
  gap: 8px;
  padding: 10px 14px 16px;
  border-top: 1px solid var(--separator);
  background: var(--page-bg);
}
.ask-ai-input input {
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--title);
  font-size: 1rem;
  outline: none;
}
.ask-ai-send {
  background: var(--blue-button) !important;
  color: var(--button-text) !important;
  border: 0 !important;
  border-radius: 999px !important;
  padding: 8px 16px !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}
.ask-ai-send:disabled { opacity: 0.45; }
.ask-ai-send.stop {
  background: var(--inset-bg) !important;
  color: var(--title) !important;
}
@keyframes ask-ai-blink {
  50% { opacity: 0; }
}
@keyframes ask-ai-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
@media (min-width: 640px) {
  .ask-ai-root { align-items: center; }
  .ask-ai-sheet {
    height: min(680px, 86vh);
    border-radius: 24px;
  }
}
</style>
