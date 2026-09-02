<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="root"
      class="sheet-root"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      @keydown.esc="onDismiss"
    >
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="onDismiss"></button>
      <section class="sheet">
        <button type="button" class="sheet-close" :aria-label="$t('common.close')" @click="onDismiss">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <div class="brand">
          <img src="/logo-small.svg" alt="">
          <span>{{ $t('common.mopiq') }}</span>
        </div>
        <h1 :id="titleId">{{ mode === 'register' ? $t('login.createAccount') : $t('login.logIn') }}</h1>
        <p class="lede">{{ $t('login.lede') }}</p>

        <p v-if="error" class="banner error" role="alert">{{ error }}</p>
        <p v-if="info" class="banner info" role="status">{{ info }}</p>

        <div class="providers">
          <button type="button" class="provider" :disabled="busy" @click="google">
            <svg class="provider-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {{ $t('login.google') }}
          </button>
          <button type="button" class="provider" :disabled="busy" @click="apple">
            <svg class="provider-icon apple" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.18 0-.36-.02-.52-.06.08-.14.17-.29.24-.44.54-1.18.73-2.5.55-3.8C13.4.4 15.2.08 16.365 1.43zM20.48 17.54c-.46 1.04-.99 2.02-1.6 2.94-.84 1.25-1.7 2.5-3.05 2.52-1.2.02-1.58-.77-2.96-.77-1.37 0-1.8.75-2.95.79-1.33.04-2.35-1.35-3.2-2.6-1.73-2.54-3.05-7.17-1.28-10.3.88-1.56 2.45-2.55 4.16-2.58 1.3-.02 2.52.87 2.96.87.44 0 1.88-1.08 3.17-.92.54.02 2.05.22 3.03 1.66-.08.05-1.81 1.06-1.79 3.16.03 2.51 2.2 3.35 2.23 3.36-.02.07-.35 1.2-1.16 2.37z"/>
            </svg>
            {{ $t('login.apple') }}
          </button>
        </div>

        <p class="or"><span>{{ $t('login.orEmail') }}</span></p>

        <form @submit.prevent="submitEmail">
          <label v-if="mode === 'register'" class="field">
            <span>{{ $t('login.name') }}</span>
            <input v-model="name" type="text" autocomplete="name">
          </label>
          <label class="field">
            <span>{{ $t('login.email') }}</span>
            <input v-model="email" type="email" autocomplete="email" required>
          </label>
          <label class="field">
            <span>{{ mode === 'register' ? $t('login.passwordLong') : $t('login.password') }}</span>
            <input v-model="password" type="password" autocomplete="current-password" required>
          </label>
          <button type="submit" class="submit" :disabled="busy">
            {{ busy ? $t('login.wait') : (mode === 'register' ? $t('login.createAccount') : $t('login.logIn')) }}
          </button>
        </form>

        <button v-if="mode === 'login'" type="button" class="linkish" :disabled="busy" @click="forgot">{{ $t('login.forgot') }}</button>

        <p class="switch">
          <button type="button" class="linkish" @click="toggleMode">
            {{ mode === 'register' ? $t('login.haveAccount') : $t('login.needAccount') }}
          </button>
        </p>
      </section>
    </div>
  </Teleport>
</template>

<script>
import {
  authReady,
  loginWithApple,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  resetPassword,
  ensureSession,
  isLoggedIn,
} from '../auth/session';
import { auth } from '../firebaseInit';

export default {
  name: 'LoginSheet',
  props: {
    open: { type: Boolean, default: false },
    next: { type: String, default: '' },
  },
  emits: ['dismiss'],
  data() {
    return {
      mode: 'login',
      name: '',
      email: '',
      password: '',
      busy: false,
      error: '',
      info: '',
      titleId: 'login-sheet-title',
    };
  },
  watch: {
    open: {
      immediate: true,
      async handler(value) {
        if (!value) return;
        this.error = '';
        this.info = '';
        this.$nextTick(() => this.$refs.root?.focus());
        await this.tryResume();
      },
    },
  },
  methods: {
    onDismiss() {
      if (this.busy) return;
      this.$emit('dismiss');
    },
    toggleMode() {
      this.mode = this.mode === 'login' ? 'register' : 'login';
      this.error = '';
      this.info = '';
    },
    async tryResume() {
      await authReady;
      if (isLoggedIn()) {
        this.goToApp();
        return;
      }
      if (auth.currentUser && !isLoggedIn()) {
        try {
          await ensureSession();
          if (isLoggedIn()) this.goToApp();
        } catch (error) {
          this.error = this.friendly(error);
        }
      }
    },
    async submitEmail() {
      this.error = '';
      this.info = '';
      this.busy = true;
      try {
        if (this.mode === 'register') {
          await registerWithEmail(this.name, this.email, this.password);
        } else {
          await loginWithEmail(this.email, this.password);
        }
        this.goToApp();
      } catch (error) {
        this.error = this.friendly(error);
      } finally {
        this.busy = false;
      }
    },
    async google() {
      this.error = '';
      this.busy = true;
      try {
        await loginWithGoogle();
        this.goToApp();
      } catch (error) {
        this.error = this.friendly(error);
      } finally {
        this.busy = false;
      }
    },
    async apple() {
      this.error = '';
      this.busy = true;
      try {
        await loginWithApple();
        this.goToApp();
      } catch (error) {
        this.error = this.friendly(error);
      } finally {
        this.busy = false;
      }
    },
    async forgot() {
      if (!this.email) {
        this.error = this.$t('login.forgotNeedEmail');
        return;
      }
      this.error = '';
      this.busy = true;
      try {
        await resetPassword(this.email);
        this.info = this.$t('login.resetSent');
      } catch (error) {
        this.error = this.friendly(error);
      } finally {
        this.busy = false;
      }
    },
    goToApp() {
      const next = this.next || this.$route.query.next;
      const safe = typeof next === 'string' && (next.startsWith('/decks') || next === '/profile')
        ? next
        : '/decks';
      this.$router.replace(safe);
    },
    friendly(error) {
      console.error('Sign-in failed', error?.code || error);
      const code = error?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        return this.$t('login.badCredentials');
      }
      if (code === 'auth/email-already-in-use') return this.$t('login.emailInUse');
      if (code === 'auth/weak-password') return this.$t('login.weakPassword');
      if (code === 'auth/popup-closed-by-user') return this.$t('login.cancelled');
      if (code === 'auth/operation-not-allowed') return this.$t('login.providerOff');
      return error?.message || this.$t('login.generic');
    },
  },
};
</script>

<style scoped>
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  outline: none;
}
.sheet-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(10px);
  cursor: pointer;
  animation: fade-in 0.2s ease;
}
.sheet {
  position: relative;
  width: min(420px, 100%);
  max-height: min(92vh, 880px);
  overflow: auto;
  padding: 32px 28px 26px;
  background:
    radial-gradient(120% 80% at 50% -20%, rgba(10, 122, 255, 0.14), transparent 55%),
    #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 28px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.22);
  text-align: left;
  animation: rise-in 0.28s ease;
}
.sheet-close {
  position: absolute;
  top: 16px;
  right: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: rgba(241, 245, 249, 0.9);
  color: #64748B;
  cursor: pointer;
}
.sheet-close:hover { background: #E2E8F0; color: #0F172A; }
.sheet-close svg { width: 16px; height: 16px; }
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 18px;
  color: #0A7AFF;
  font-size: 0.95rem;
  font-weight: 700;
}
.brand img { width: 26px; height: 18px; }
h1 {
  margin: 0 36px 8px 0;
  font-size: 1.75rem;
  font-weight: 750;
  letter-spacing: -0.03em;
  color: #0F172A;
}
.lede {
  margin: 0 0 22px;
  color: #64748B;
  line-height: 1.45;
}
.banner {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.92rem;
  line-height: 1.4;
}
.banner.error { background: #FEF2F2; color: #B91C1C; }
.banner.info { background: #ECFDF5; color: #047857; }
.providers { display: grid; gap: 10px; }
.provider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  background: #FFFFFF;
  color: #0F172A;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 650;
  cursor: pointer;
}
.provider:hover { background: #F8FAFC; border-color: #CBD5E1; }
.provider:disabled { opacity: 0.6; cursor: wait; }
.provider-icon { width: 18px; height: 18px; flex-shrink: 0; }
.provider-icon.apple { color: #0F172A; }
.or {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0;
  color: #94A3B8;
  font-size: 0.78rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.or::before,
.or::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #E2E8F0;
}
form { display: grid; gap: 12px; }
.field {
  display: grid;
  gap: 6px;
}
.field span {
  font-size: 0.8rem;
  font-weight: 650;
  color: #475569;
}
.field input {
  width: 100%;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  background: #F8FAFC;
  padding: 12px 14px;
  font: inherit;
  font-size: 1rem;
  color: #0F172A;
  outline: none;
}
.field input:focus {
  background: #FFFFFF;
  border-color: #0A7AFF;
  box-shadow: 0 0 0 4px rgba(10, 122, 255, 0.12);
}
.submit {
  margin-top: 4px;
  width: 100%;
  border: 0;
  border-radius: 999px;
  background: #0A7AFF;
  color: #FFFFFF;
  padding: 13px 18px;
  font: inherit;
  font-size: 1.02rem;
  font-weight: 700;
  cursor: pointer;
}
.submit:hover { background: #0066D6; }
.submit:disabled { opacity: 0.65; cursor: wait; }
.linkish {
  display: block;
  width: 100%;
  margin-top: 12px;
  border: 0;
  background: transparent;
  color: #0A7AFF;
  font: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}
.linkish:hover { color: #0066D6; }
.switch { margin: 4px 0 0; }
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes rise-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .sheet,
  .sheet-backdrop { animation: none; }
}
</style>
