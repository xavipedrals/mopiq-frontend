<template>
  <div class="shell">
    <div class="container-xl">
      <AppHeader />
      <div class="page">
        <p v-if="loading">{{ $t('profile.loading') }}</p>
        <p v-else-if="error" class="error">{{ error }}</p>
        <div v-else-if="settingsOpen" class="settings">
          <button type="button" class="back" @click="settingsOpen = false">{{ $t('profile.settingsBack') }}</button>
          <h2 class="settings-title">{{ $t('profile.settings') }}</h2>
          <section class="appearance">
            <h3>{{ $t('profile.appearance') }}</h3>
            <div class="theme-toggle" role="radiogroup" :aria-label="$t('profile.appearance')">
              <button
                type="button"
                role="radio"
                :aria-checked="theme === 'light'"
                :class="{ on: theme === 'light' }"
                @click="setAppearance('light')"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                {{ $t('profile.light') }}
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="theme === 'dark'"
                :class="{ on: theme === 'dark' }"
                @click="setAppearance('dark')"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.5 13.5A7 7 0 0 1 10.5 5a7 7 0 1 0 8 10.2 5.5 5.5 0 0 1-2-1.7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>
                {{ $t('profile.dark') }}
              </button>
            </div>
          </section>
          <section class="appearance">
            <h3>{{ $t('profile.language') }}</h3>
            <LanguagePicker @change="onLanguageChange" />
          </section>
        </div>
        <template v-else>
          <div class="hero">
            <div class="avatar-block">
              <svg class="xp-ring" viewBox="0 0 140 140" aria-hidden="true">
                <circle cx="70" cy="70" r="60" fill="none" stroke="var(--empty-bar)" stroke-width="10"/>
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  stroke="var(--green)"
                  stroke-width="10"
                  stroke-linecap="round"
                  :stroke-dasharray="ringDash"
                  transform="rotate(-90 70 70)"
                />
              </svg>
              <img
                class="avatar"
                :src="avatarSrc"
                alt=""
                @error="onAvatarError"
              >
              <div class="level" :title="$t('profile.level', { level })">{{ level }}</div>
            </div>
            <h1>{{ profile.name }}</h1>
            <p v-if="joinedLabel" class="joined">{{ joinedLabel }}</p>
            <p v-if="profile.email" class="email">{{ profile.email }}</p>
          </div>

          <div class="stats">
            <div class="stat">
              <svg class="stat-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="5" width="14" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
                <rect x="7" y="3" width="14" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
              </svg>
              <div class="value orange">{{ profile.cardsStudied }}</div>
              <div class="label">{{ $t('profile.cardsStudied') }}</div>
            </div>
            <div class="stat">
              <svg class="stat-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="5" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/>
                <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
              <div class="value indigo">
                {{ profile.daysUsingApp }}<span class="unit">{{ $t('profile.daysUnit') }}</span>
              </div>
              <div class="label">{{ $t('profile.comingBack') }}</div>
            </div>
            <div class="stat">
              <svg class="stat-icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/>
                <path d="M12 8v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="value cyan">
                <template v-if="studiedTime.parts">
                  <span v-for="(part, index) in studiedTime.parts" :key="index">
                    {{ part.primary }}<span class="unit">{{ part.unit }}</span>
                    <span v-if="index < studiedTime.parts.length - 1"> </span>
                  </span>
                </template>
                <template v-else>
                  {{ studiedTime.primary }}<span class="unit">{{ studiedTime.unit }}</span>
                </template>
              </div>
              <div class="label">{{ $t('profile.studied') }}</div>
            </div>
            <div class="stat">
              <svg class="stat-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3l1.8 5.4H19l-4.4 3.2 1.7 5.4L12 13.8 7.7 17l1.7-5.4L5 8.4h5.2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
              </svg>
              <div class="value lime">{{ expLabel }}</div>
              <div class="label">{{ $t('profile.experience') }}</div>
            </div>
          </div>

          <div class="account">
            <button type="button" class="menu-row" @click="settingsOpen = true">
              <span>{{ $t('profile.settings') }}</span>
              <span class="chevron" aria-hidden="true">›</span>
            </button>
            <button type="button" class="mopiq-btn secondary" :disabled="loggingOut" @click="onLogout">
              {{ loggingOut ? $t('profile.loggingOut') : $t('profile.logOut') }}
            </button>
            <p v-if="logoutError" class="error">{{ logoutError }}</p>
            <div class="legal">
              <router-link to="/support">{{ $t('common.support') }}</router-link>
              <router-link to="/privacy">{{ $t('common.privacy') }}</router-link>
              <router-link to="/terms">{{ $t('common.terms') }}</router-link>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import AppHeader from './AppHeader.vue';
import LanguagePicker from './LanguagePicker.vue';
import { fetchUserProfile, updateUserProfileLocale } from '../api/mopiq';
import { logout } from '../auth/session';
import { getAvatarImageName } from '../utils';
import { formatJoinedDate, formatStudiedTime, getLevelAndPercentage } from '../profile/experience';
import { adoptFromProfileIfNeeded, localeForProfileSync, localeTag } from '../i18n';
import { getTheme, setTheme } from '../theme/theme';

const RING_CIRCUMFERENCE = 2 * Math.PI * 60;

export default {
  name: 'ProfilePage',
  components: { AppHeader, LanguagePicker },
  data() {
    return {
      loading: true,
      loggingOut: false,
      error: '',
      logoutError: '',
      avatarFailed: false,
      settingsOpen: false,
      theme: getTheme(),
      profile: {
        name: '',
        email: '',
        experience: 0,
        secondsStudied: 0,
        daysUsingApp: 0,
        cardsStudied: 0,
        avatarNumber: 0,
        joinedDate: null,
        avatarUrl: getAvatarImageName(0),
      },
    };
  },
  computed: {
    progress() {
      return getLevelAndPercentage(this.profile.experience);
    },
    level() {
      return this.progress.level;
    },
    ringDash() {
      const filled = RING_CIRCUMFERENCE * this.progress.percentage;
      return `${filled} ${RING_CIRCUMFERENCE}`;
    },
    joinedLabel() {
      const date = formatJoinedDate(this.profile.joinedDate, this.$i18n.locale);
      return date ? this.$t('profile.joined', { date }) : '';
    },
    studiedTime() {
      return formatStudiedTime(this.profile.secondsStudied);
    },
    expLabel() {
      return (this.profile.experience || 0).toLocaleString(localeTag(this.$i18n.locale), { maximumFractionDigits: 0 });
    },
    avatarSrc() {
      if (this.avatarFailed) return getAvatarImageName(this.profile.avatarNumber || 0);
      return this.profile.avatarUrl || getAvatarImageName(this.profile.avatarNumber || 0);
    },
  },
  async created() {
    try {
      this.profile = await fetchUserProfile();
      adoptFromProfileIfNeeded(this.profile.locale);
    } catch (error) {
      this.error = error.message || this.$t('profile.loadError');
    } finally {
      this.loading = false;
    }
  },
  methods: {
    onAvatarError() {
      this.avatarFailed = true;
    },
    setAppearance(theme) {
      this.theme = theme;
      setTheme(theme);
    },
    async onLanguageChange() {
      try {
        await updateUserProfileLocale(localeForProfileSync());
      } catch (error) {
        console.warn('Could not save language', error);
      }
    },
    async onLogout() {
      this.loggingOut = true;
      this.logoutError = '';
      try {
        await logout();
        this.$router.push('/');
      } catch (error) {
        this.logoutError = error.message || this.$t('profile.logoutError');
        this.loggingOut = false;
      }
    },
  },
};
</script>

<style scoped>
.page { padding-bottom: 56px; }
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 12px 0 8px;
}
.avatar-block {
  position: relative;
  width: 168px;
  height: 164px;
  margin-bottom: 8px;
}
.xp-ring {
  position: absolute;
  left: 14px;
  top: 0;
  width: 140px;
  height: 140px;
}
.avatar {
  position: absolute;
  left: 34px;
  top: 20px;
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 50%;
  background: var(--card-bg);
}
.level {
  position: absolute;
  right: 4px;
  bottom: 12px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--green);
  color: #fff;
  font-size: 22px;
  font-weight: 800;
  border-radius: 50%;
  box-shadow: 0 2px 0 var(--green-shadow);
}
h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--title);
  margin: 4px 0 0;
}
.joined, .email { color: var(--text-secondary); margin-top: 6px; }
.email { font-size: 0.95rem; }
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 28px 0 32px;
}
.stat {
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  border-radius: 20px;
  padding: 18px 20px 16px;
  text-align: left;
}
.stat-icon {
  width: 28px;
  height: 28px;
  color: var(--stat-icon);
  margin-bottom: 16px;
}
.value {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 8px;
}
.unit {
  font-size: 1.1rem;
  font-weight: 700;
}
.label { color: var(--stat-label); font-size: 1rem; }
.orange { color: var(--stat-orange); }
.indigo { color: var(--stat-indigo); }
.cyan { color: var(--stat-cyan); }
.lime { color: var(--stat-lime); }
.menu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 12px;
  border: 0;
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  color: var(--title);
  border-radius: 18px;
  padding: 16px 18px;
  font: inherit;
  font-size: 1.05rem;
  font-weight: 650;
  cursor: pointer;
}
.chevron { color: var(--text-secondary); font-size: 1.4rem; line-height: 1; }
.settings { max-width: 480px; margin: 8px auto 0; text-align: left; }
.back {
  border: 0;
  background: transparent;
  color: var(--blue-button);
  padding: 0;
  margin-bottom: 12px;
  font: inherit;
  cursor: pointer;
}
.settings-title {
  font-size: 1.6rem;
  font-weight: 750;
  color: var(--title);
  margin: 0 0 22px;
}
.appearance {
  max-width: 480px;
  margin: 0 auto 28px;
}
.appearance h3 {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0 0 12px;
}
.theme-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: var(--inset-bg);
  border-radius: 18px;
  padding: 6px;
}
.theme-toggle button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  appearance: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 14px;
  padding: 12px 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
}
.theme-toggle button svg {
  width: 18px;
  height: 18px;
}
.theme-toggle button.on {
  background: var(--card-bg);
  color: var(--title);
  box-shadow: var(--card-shadow);
}
.account {
  max-width: 480px;
  margin: 0 auto;
}
.mopiq-btn.secondary {
  width: 100%;
  background: var(--secondary-btn-bg) !important;
  color: var(--secondary-btn-text) !important;
  border: none !important;
  font-size: 1.05rem !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  padding: 14px 24px !important;
  border-radius: 50px !important;
}
.mopiq-btn.secondary:hover { background: var(--secondary-btn-hover) !important; }
.legal {
  display: flex;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
  margin-top: 24px;
}
.legal a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.95rem;
}
.legal a:hover { color: var(--blue-button); }
.error { color: var(--error); margin-top: 12px; text-align: center; }
@media (max-width: 520px) {
  .stats { gap: 12px; }
  .value { font-size: 1.6rem; }
  .stat { padding: 16px; }
}
</style>
