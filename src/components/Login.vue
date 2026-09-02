<template>
  <div class="auth-page">
    <div class="card">
      <div class="login-lang">
        <LanguagePicker compact />
      </div>
      <router-link to="/" class="brand">
        <img src="/logo-small.svg" alt="">
        {{ $t('common.brand') }}
      </router-link>
      <h1>{{ mode === 'register' ? $t('login.createAccount') : $t('login.logIn') }}</h1>
      <p class="lede">{{ $t('login.lede') }}</p>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="info" class="info">{{ info }}</p>

      <div class="providers">
        <button type="button" class="mopiq-btn secondary" :disabled="busy" @click="google">
          <svg class="provider-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {{ $t('login.google') }}
        </button>
        <button type="button" class="mopiq-btn secondary" :disabled="busy" @click="apple">
          <svg class="provider-icon apple" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.18 0-.36-.02-.52-.06.08-.14.17-.29.24-.44.54-1.18.73-2.5.55-3.8C13.4.4 15.2.08 16.365 1.43zM20.48 17.54c-.46 1.04-.99 2.02-1.6 2.94-.84 1.25-1.7 2.5-3.05 2.52-1.2.02-1.58-.77-2.96-.77-1.37 0-1.8.75-2.95.79-1.33.04-2.35-1.35-3.2-2.6-1.73-2.54-3.05-7.17-1.28-10.3.88-1.56 2.45-2.55 4.16-2.58 1.3-.02 2.52.87 2.96.87.44 0 1.88-1.08 3.17-.92.54.02 2.05.22 3.03 1.66-.08.05-1.81 1.06-1.79 3.16.03 2.51 2.2 3.35 2.23 3.36-.02.07-.35 1.2-1.16 2.37z"/>
          </svg>
          {{ $t('login.apple') }}
        </button>
      </div>
      <div class="or">{{ $t('login.orEmail') }}</div>

      <form @submit.prevent="submitEmail">
        <input v-if="mode === 'register'" v-model="name" type="text" :placeholder="$t('login.name')" autocomplete="name">
        <input v-model="email" type="email" :placeholder="$t('login.email')" autocomplete="email" required>
        <input v-model="password" type="password" :placeholder="mode === 'register' ? $t('login.passwordLong') : $t('login.password')" autocomplete="current-password" required>
        <button type="submit" class="mopiq-btn" :disabled="busy">
          {{ busy ? $t('login.wait') : (mode === 'register' ? $t('login.createAccount') : $t('login.logIn')) }}
        </button>
      </form>

      <button v-if="mode === 'login'" type="button" class="linkish" :disabled="busy" @click="forgot">{{ $t('login.forgot') }}</button>

      <p class="switch">
        <button type="button" class="linkish" @click="toggleMode">
          {{ mode === 'register' ? $t('login.haveAccount') : $t('login.needAccount') }}
        </button>
      </p>
    </div>
  </div>
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
import LanguagePicker from './LanguagePicker.vue';

export default {
  name: 'LoginPage',
  components: { LanguagePicker },
  data() {
    return {
      mode: 'login',
      name: '',
      email: '',
      password: '',
      busy: false,
      error: '',
      info: '',
    };
  },
  async created() {
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
  methods: {
    toggleMode() {
      this.mode = this.mode === 'login' ? 'register' : 'login';
      this.error = '';
      this.info = '';
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
      const next = this.$route.query.next;
      const safe = typeof next === 'string' && (next.startsWith('/decks') || next === '/profile')
        ? next
        : '/decks';
      this.$router.replace(safe);
    },
    friendly(error) {
      const code = error?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        return this.$t('login.badCredentials');
      }
      if (code === 'auth/email-already-in-use') return this.$t('login.emailInUse');
      if (code === 'auth/weak-password') return this.$t('login.weakPassword');
      if (code === 'auth/popup-closed-by-user') return this.$t('login.cancelled');
      return error?.message || this.$t('login.generic');
    },
  },
};
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.card {
  width: 100%;
  max-width: 440px;
  background: #fff;
  box-shadow: 0 6px 20px 0 #CBD5E1;
  border-radius: 20px;
  padding: 32px;
  text-align: left;
  position: relative;
}
.login-lang {
  display: flex;
  justify-content: flex-end;
  margin: -8px 0 12px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #007bff;
  text-decoration: none;
  font-weight: 500;
  margin-bottom: 24px;
}
.brand img { width: 28px; height: 28px; }
h1 { font-size: 1.8rem; font-weight: 700; color: #1E293D; margin-bottom: 8px; }
.lede { color: #475569; margin-bottom: 20px; }
.error { color: #DC2626; margin-bottom: 12px; }
.info { color: #0D9488; margin-bottom: 12px; }
.providers { display: grid; gap: 10px; margin-bottom: 16px; }
.or { text-align: center; color: #64748b; margin: 8px 0 16px; font-size: 0.9rem; }
form { display: grid; gap: 10px; }
input {
  border: 1px solid #CBD5E1;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 1rem;
}
.mopiq-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 1rem !important;
  letter-spacing: 0 !important;
  font-weight: 600 !important;
  padding: 12px 18px !important;
  border-radius: 50px !important;
  width: 100%;
  border: none;
  background: #0A7AFF;
  color: #fff;
  cursor: pointer;
}
.provider-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.provider-icon.apple {
  color: #0F172A;
}
.mopiq-btn.secondary {
  background: #EFF6FF !important;
  color: #0A7AFF !important;
}
.mopiq-btn.secondary:hover { background: #DBEAFE !important; }
.linkish {
  background: none !important;
  color: #0A7AFF !important;
  padding: 8px 0 !important;
  font-size: 0.95rem !important;
  letter-spacing: 0 !important;
  font-weight: 500 !important;
  border: none !important;
  box-shadow: none !important;
}
.linkish:hover { background: none !important; }
.switch { margin-top: 8px; text-align: center; }
</style>
