<template>
  <div class="settings-screen">
    <div v-show="wide || !destination" class="settings-list">
      <button type="button" class="crumb" @click="$emit('close')">
        <TablerIcon name="chevronLeft" />
        {{ $t('nav.profile') }}
      </button>
      <h1>{{ $t('profile.settings') }}</h1>

      <section v-for="section in sections" :key="section.id" class="section">
        <h2>{{ section.title }}</h2>
        <div class="rows">
          <button
            v-for="row in section.rows"
            :key="row.id"
            type="button"
            class="settings-row"
            :class="{ selected: isSelected(row.id) }"
            :aria-current="isSelected(row.id) ? 'true' : undefined"
            @click="onRow(row.id)"
          >
            <span v-if="row.profile" class="profile-row">
              <span class="tile"><TablerIcon name="user" /></span>
              <span class="profile-copy">
                <span class="title">{{ displayName }}</span>
                <span class="email">{{ profile.email || '—' }}</span>
              </span>
            </span>
            <template v-else>
              <span class="tile"><TablerIcon :name="row.icon" /></span>
              <span class="title">{{ row.label }}</span>
              <span v-if="row.detail" class="detail">{{ row.detail }}</span>
            </template>
            <TablerIcon class="chevron" :class="{ hidden: isSelected(row.id) }" name="chevronRight" />
          </button>
        </div>
      </section>

      <p class="version">{{ $t('settings.version') }}</p>
    </div>

    <Teleport :key="useInspector ? 'inspector' : 'inline'" to="#browse-inspector" :disabled="!useInspector">
      <div v-if="destination" class="settings-detail">
        <button type="button" class="crumb" @click="back">
          <TablerIcon name="chevronLeft" />
          {{ destination === 'impersonate' ? $t('settings.sectionAdvanced') : $t('profile.settings') }}
        </button>
        <h2 class="detail-title">{{ detailTitle }}</h2>

        <template v-if="destination === 'profile'">
          <label class="field-label">{{ $t('settings.profileName') }}</label>
          <div class="field">
            <span>{{ displayName }}</span>
            <button type="button" class="icon-btn" :aria-label="$t('settings.editNameTitle')" @click="openName">
              <TablerIcon name="pencil" />
            </button>
          </div>
          <label class="field-label">{{ $t('settings.profileEmail') }}</label>
          <div class="field">
            <span>{{ profile.email || '—' }}</span>
          </div>
          <button type="button" class="mopiq-btn secondary logout" :disabled="loggingOut" @click="onLogout">
            {{ loggingOut ? $t('profile.loggingOut') : $t('profile.logOut') }}
          </button>
          <p v-if="logoutError" class="error">{{ logoutError }}</p>
          <button type="button" class="delete" :disabled="deletingAccount" @click="deleteConfirmOpen = true">
            {{ $t('profile.deleteAccount') }}
          </button>
        </template>

        <template v-else-if="destination === 'appearance'">
          <div class="choice-list" role="radiogroup" :aria-label="$t('profile.appearance')">
            <button
              v-for="option in appearanceOptions"
              :key="option.id"
              type="button"
              role="radio"
              class="choice"
              :aria-checked="theme === option.id"
              @click="chooseAppearance(option.id)"
            >
              <span>{{ option.label }}</span>
              <TablerIcon v-if="theme === option.id" name="check" />
            </button>
          </div>
        </template>

        <template v-else-if="destination === 'language'">
          <label class="search">
            <TablerIcon name="search" />
            <input
              v-model="languageQuery"
              type="search"
              :placeholder="$t('decks.search')"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
            >
          </label>
          <div class="choice-list" role="radiogroup" :aria-label="$t('profile.language')">
            <button
              v-if="showsSystem"
              type="button"
              role="radio"
              class="choice"
              :aria-checked="!languagePreference"
              @click="chooseLanguage(null)"
            >
              <span>{{ $t('profile.system') }}</span>
              <TablerIcon v-if="!languagePreference" name="check" />
            </button>
            <button
              v-for="language in filteredLanguages"
              :key="language.code"
              type="button"
              role="radio"
              class="choice"
              :aria-checked="languagePreference === language.code"
              @click="chooseLanguage(language.code)"
            >
              <span :lang="language.code">{{ language.nativeName }}</span>
              <TablerIcon v-if="languagePreference === language.code" name="check" />
            </button>
          </div>
          <p v-if="!showsSystem && filteredLanguages.length === 0" class="empty">{{ $t('settings.noResults') }}</p>
        </template>

        <template v-else-if="destination === 'answerToast'">
          <div class="choice-list" role="radiogroup" :aria-label="$t('study.answerToast')">
            <button
              v-for="option in toastOptions"
              :key="option"
              type="button"
              role="radio"
              class="choice"
              :aria-checked="toastPosition === option"
              @click="chooseToast(option)"
            >
              <span>{{ $t(`study.answerToast${capitalize(option)}`) }}</span>
              <TablerIcon v-if="toastPosition === option" name="check" />
            </button>
          </div>
        </template>

        <template v-else-if="destination === 'advanced'">
          <div class="debug-list">
            <div class="debug-row">
              <TablerIcon class="debug-icon" name="infinity" />
              <span>{{ $t('settings.debugUnlimited') }}</span>
              <button
                type="button"
                class="switch"
                role="switch"
                :aria-checked="unlimitedStudyOn"
                :aria-label="$t('settings.debugUnlimited')"
                @click="toggleUnlimited"
              >
                <span></span>
              </button>
            </div>
            <div class="debug-row tall">
              <TablerIcon class="debug-icon" name="bulb" />
              <span>
                <strong>{{ $t('settings.debugTutorial') }}</strong>
                <small>{{ $t('settings.debugTutorialBody') }}</small>
              </span>
              <button
                type="button"
                class="switch"
                role="switch"
                :aria-checked="alwaysTutorialOn"
                :aria-label="$t('settings.debugTutorial')"
                @click="toggleTutorial"
              >
                <span></span>
              </button>
            </div>
            <div class="debug-row tall">
              <TablerIcon class="debug-icon" name="message" />
              <span>
                <strong>{{ $t('settings.debugFeedback') }}</strong>
                <small>{{ $t('settings.debugFeedbackBody') }}</small>
              </span>
              <button
                type="button"
                class="switch"
                role="switch"
                :aria-checked="alwaysFeedbackOn"
                :aria-label="$t('settings.debugFeedback')"
                @click="toggleFeedback"
              >
                <span></span>
              </button>
            </div>
            <button type="button" class="settings-row impersonate" @click="destination = 'impersonate'">
              <TablerIcon class="debug-icon" name="key" />
              <span class="title">{{ $t('settings.debugImpersonate') }}</span>
              <TablerIcon class="chevron" name="chevronRight" />
            </button>
          </div>
        </template>

        <template v-else-if="destination === 'impersonate'">
          <p class="help">{{ $t('settings.debugImpersonateHelp') }}</p>
          <p class="command">{{ $t('settings.debugImpersonateCommand') }}</p>
          <textarea v-model="impersonateToken" spellcheck="false" autocomplete="off"></textarea>
          <button
            type="button"
            class="mopiq-btn impersonate-btn"
            :disabled="impersonating || !impersonateToken.trim()"
            @click="onImpersonate"
          >
            {{ impersonating ? $t('settings.debugImpersonateBusy') : $t('settings.debugImpersonateAction') }}
          </button>
          <p v-if="impersonateError" class="error">{{ impersonateError }}</p>
          <p class="help">{{ $t('settings.debugImpersonateWarning') }}</p>
        </template>
      </div>
    </Teleport>

    <StudyTutorial :open="tutorialOpen" @done="tutorialOpen = false" />
    <StudyConfirmSheet
      :open="deleteConfirmOpen"
      :title="$t('profile.deleteAccountTitle')"
      :message="$t('profile.deleteAccountBody')"
      :confirm-label="$t('profile.deleteAccount')"
      :busy="deletingAccount"
      :error="deleteError"
      @dismiss="closeDeleteConfirm"
      @confirm="onDeleteAccount"
    />
    <Teleport to="body">
      <div
        v-if="nameOpen"
        v-dialog-focus
        class="name-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-name-title"
        @keydown.esc.stop.prevent="nameOpen = false"
      >
        <button type="button" class="backdrop" :aria-label="$t('common.close')" @click="nameOpen = false"></button>
        <section class="name-sheet">
          <form @submit.prevent="saveName">
            <h2 id="edit-name-title">{{ $t('settings.editNameTitle') }}</h2>
            <p>{{ $t('settings.editNameBody') }}</p>
            <input v-model="draftName" maxlength="80" :aria-label="$t('settings.profileName')" autocomplete="name">
            <p v-if="nameError" class="error">{{ nameError }}</p>
            <div class="name-actions">
              <button type="button" class="mopiq-btn secondary" :disabled="savingName" @click="nameOpen = false">
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" class="mopiq-btn" :disabled="savingName || !draftName.trim()">
                {{ savingName ? $t('common.loading') : $t('common.ok') }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script>
import TablerIcon from './TablerIcon.vue';
import StudyTutorial from './StudyTutorial.vue';
import StudyConfirmSheet from './StudyConfirmSheet.vue';
import { dialogFocus } from '../dialogFocus';
import { APP_LANGUAGES, localeForProfileSync, setLanguagePreference } from '../i18n';
import { deleteCurrentAccount, updateUserProfileAnswerFeedback, updateUserProfileLocale, updateUserProfileName } from '../api/mopiq';
import { logout, signInWithImpersonationToken, updateAccountDisplayName } from '../auth/session';
import { HELP_CENTER_URL } from '../constants';
import {
  hasLocalAnswerFeedbackPosition,
  normalizeAnswerFeedbackPosition,
  readAnswerFeedbackPosition,
  writeAnswerFeedbackPosition,
} from '../study/answerFeedback';
import { getThemePreference, setThemePreference } from '../theme/theme';
import {
  isDebugAlwaysShowFeedback,
  isDebugAlwaysShowStudyTutorial,
  isDebugUnlimitedStudy,
  isLocalDebugHost,
  setDebugAlwaysShowFeedback,
  setDebugAlwaysShowStudyTutorial,
  setDebugUnlimitedStudy,
} from '../debug/flags';

const DETAIL_IDS = new Set(['profile', 'appearance', 'language', 'answerToast', 'advanced', 'impersonate']);

export default {
  name: 'ProfileSettings',
  components: { StudyConfirmSheet, StudyTutorial, TablerIcon },
  directives: { dialogFocus },
  inject: {
    setInspectorOpen: { default: null },
    refreshAppProfile: { default: null },
  },
  props: {
    profile: { type: Object, required: true },
  },
  emits: ['close', 'updated'],
  data() {
    return {
      destination: null,
      wide: false,
      inspectorReady: false,
      tutorialOpen: false,
      helpUrl: HELP_CENTER_URL,
      theme: getThemePreference(),
      languageQuery: '',
      toastPosition: 'top',
      nameOverride: null,
      nameOpen: false,
      draftName: '',
      savingName: false,
      nameError: '',
      loggingOut: false,
      logoutError: '',
      deletingAccount: false,
      deleteConfirmOpen: false,
      deleteError: '',
      unlimitedStudyOn: false,
      alwaysTutorialOn: false,
      alwaysFeedbackOn: false,
      impersonateToken: '',
      impersonating: false,
      impersonateError: '',
      toastOptions: ['top', 'bottom', 'hide'],
    };
  },
  computed: {
    showDebug() {
      return isLocalDebugHost();
    },
    useInspector() {
      return this.wide && Boolean(this.destination) && this.inspectorReady;
    },
    languagePreference() {
      return this.$i18n.preference;
    },
    displayName() {
      return this.nameOverride || this.profile.name || this.$t('profile.userFallback');
    },
    appearanceLabel() {
      if (this.theme === 'dark') return this.$t('profile.dark');
      if (this.theme === 'system') return this.$t('profile.system');
      return this.$t('profile.light');
    },
    languageLabel() {
      if (!this.languagePreference) return this.$t('profile.system');
      return APP_LANGUAGES.find((language) => language.code === this.languagePreference)?.nativeName
        || this.languagePreference;
    },
    toastLabel() {
      return this.$t(`study.answerToast${this.capitalize(this.toastPosition)}`);
    },
    appearanceOptions() {
      return [
        { id: 'system', label: this.$t('profile.system') },
        { id: 'light', label: this.$t('profile.light') },
        { id: 'dark', label: this.$t('profile.dark') },
      ];
    },
    showsSystem() {
      const query = this.languageQuery.trim().toLowerCase();
      return !query || this.$t('profile.system').toLowerCase().includes(query);
    },
    filteredLanguages() {
      const query = this.languageQuery.trim().toLowerCase();
      if (!query) return APP_LANGUAGES;
      return APP_LANGUAGES.filter((language) => language.nativeName.toLowerCase().includes(query));
    },
    sections() {
      const general = [];
      if (!this.profile.isPremium) {
        general.push({ id: 'subscription', icon: 'creditCard', label: this.$t('settings.subscription') });
      }
      general.push(
        { id: 'appearance', icon: 'deviceDesktop', label: this.$t('profile.appearance'), detail: this.appearanceLabel },
        { id: 'language', icon: 'world', label: this.$t('profile.language'), detail: this.languageLabel },
        { id: 'answerToast', icon: 'thumbUp', label: this.$t('study.answerToast'), detail: this.toastLabel },
        { id: 'howItWorks', icon: 'help', label: this.$t('settings.howItWorks') },
        { id: 'support', icon: 'lifebuoy', label: this.$t('common.support') },
      );
      const sections = [
        {
          id: 'account',
          title: this.$t('settings.sectionAccount'),
          rows: [{ id: 'profile', profile: true }],
        },
        { id: 'general', title: this.$t('settings.sectionGeneral'), rows: general },
        {
          id: 'legal',
          title: this.$t('settings.sectionLegal'),
          rows: [
            { id: 'privacy', icon: 'shield', label: this.$t('common.privacy') },
            { id: 'terms', icon: 'fileText', label: this.$t('common.terms') },
            { id: 'refund', icon: 'receipt', label: this.$t('common.refund') },
          ],
        },
      ];
      if (this.showDebug) {
        sections.push({
          id: 'advanced',
          title: this.$t('settings.sectionAdvanced'),
          rows: [{ id: 'advanced', icon: 'bug', label: this.$t('settings.sectionAdvanced') }],
        });
      }
      return sections;
    },
    detailTitle() {
      if (this.destination === 'profile') return this.$t('nav.profile');
      if (this.destination === 'appearance') return this.$t('profile.appearance');
      if (this.destination === 'language') return this.$t('profile.language');
      if (this.destination === 'answerToast') return this.$t('study.answerToast');
      if (this.destination === 'impersonate') return this.$t('settings.debugImpersonate');
      return this.$t('settings.sectionAdvanced');
    },
  },
  watch: {
    destination(value) {
      if (value !== 'language') this.languageQuery = '';
      if (value !== 'impersonate') this.impersonateError = '';
      this.syncInspector();
    },
    wide() {
      this.syncInspector();
    },
    showDebug(enabled) {
      if (!enabled && (this.destination === 'advanced' || this.destination === 'impersonate')) {
        this.destination = null;
      }
    },
  },
  created() {
    const fromProfile = this.profile.answerFeedbackPosition
      ? normalizeAnswerFeedbackPosition(this.profile.answerFeedbackPosition)
      : readAnswerFeedbackPosition();
    this.toastPosition = hasLocalAnswerFeedbackPosition() ? readAnswerFeedbackPosition() : fromProfile;
    this.unlimitedStudyOn = isDebugUnlimitedStudy();
    this.alwaysTutorialOn = isDebugAlwaysShowStudyTutorial();
    this.alwaysFeedbackOn = isDebugAlwaysShowFeedback();
  },
  mounted() {
    this.media = window.matchMedia('(min-width: 900px)');
    this.wide = this.media.matches;
    this.inspectorReady = Boolean(document.getElementById('browse-inspector'));
    this.onMedia = () => { this.wide = this.media.matches; };
    this.media.addEventListener('change', this.onMedia);
    this.$nextTick(() => this.syncInspector());
  },
  beforeUnmount() {
    this.media?.removeEventListener('change', this.onMedia);
    this.setInspectorOpen?.(false);
  },
  methods: {
    capitalize(value) {
      return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
    },
    syncInspector() {
      this.inspectorReady = Boolean(document.getElementById('browse-inspector'));
      this.setInspectorOpen?.(this.wide && Boolean(this.destination) && this.inspectorReady);
    },
    isSelected(id) {
      if (!DETAIL_IDS.has(id)) return false;
      if (id === 'advanced') return this.destination === 'advanced' || this.destination === 'impersonate';
      return this.destination === id;
    },
    back() {
      this.destination = this.destination === 'impersonate' ? 'advanced' : null;
    },
    onRow(id) {
      if (id === 'subscription') {
        this.$router.push('/pricing');
        return;
      }
      if (id === 'howItWorks') {
        this.tutorialOpen = true;
        return;
      }
      if (id === 'support') {
        window.open(this.helpUrl, '_blank', 'noopener');
        return;
      }
      if (id === 'privacy' || id === 'terms' || id === 'refund') {
        this.$router.push(id === 'terms' ? '/terms' : `/${id}`);
        return;
      }
      if (DETAIL_IDS.has(id)) this.destination = id;
    },
    chooseAppearance(theme) {
      this.theme = theme;
      setThemePreference(theme);
    },
    async chooseLanguage(code) {
      setLanguagePreference(code);
      try {
        await updateUserProfileLocale(localeForProfileSync());
      } catch (error) {
        console.warn('Could not save language', error);
      }
    },
    async chooseToast(position) {
      this.toastPosition = writeAnswerFeedbackPosition(position);
      try {
        await updateUserProfileAnswerFeedback(this.toastPosition);
      } catch (error) {
        console.warn('Could not save answer toast', error);
      }
    },
    openName() {
      this.draftName = this.displayName === this.$t('profile.userFallback') ? '' : this.displayName;
      this.nameError = '';
      this.nameOpen = true;
    },
    async saveName() {
      const name = this.draftName.trim();
      if (!name || this.savingName) return;
      this.savingName = true;
      this.nameError = '';
      try {
        await updateUserProfileName(name);
        try {
          await updateAccountDisplayName(name);
        } catch (error) {
          console.warn('Could not update the account display name', error);
        }
        this.nameOverride = name;
        this.nameOpen = false;
        this.$emit('updated', { name });
        this.refreshAppProfile?.();
      } catch (error) {
        this.nameError = error.message || this.$t('settings.nameError');
      } finally {
        this.savingName = false;
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
    closeDeleteConfirm() {
      if (this.deletingAccount) return;
      this.deleteConfirmOpen = false;
      this.deleteError = '';
    },
    async onDeleteAccount() {
      if (this.deletingAccount) return;
      this.deletingAccount = true;
      this.deleteError = '';
      try {
        await deleteCurrentAccount();
        this.$router.push('/');
      } catch (error) {
        this.deleteError = error.code === 'requires-recent-login'
          ? this.$t('profile.deleteAccountRelogin')
          : (error.message || this.$t('profile.deleteAccountError'));
        this.deletingAccount = false;
      }
    },
    toggleUnlimited() {
      this.unlimitedStudyOn = !this.unlimitedStudyOn;
      setDebugUnlimitedStudy(this.unlimitedStudyOn);
    },
    toggleTutorial() {
      this.alwaysTutorialOn = !this.alwaysTutorialOn;
      setDebugAlwaysShowStudyTutorial(this.alwaysTutorialOn);
    },
    toggleFeedback() {
      this.alwaysFeedbackOn = !this.alwaysFeedbackOn;
      setDebugAlwaysShowFeedback(this.alwaysFeedbackOn);
    },
    async onImpersonate() {
      if (this.impersonating || !isLocalDebugHost()) return;
      this.impersonating = true;
      this.impersonateError = '';
      try {
        await signInWithImpersonationToken(this.impersonateToken);
        window.location.assign('/decks');
      } catch (error) {
        this.impersonateError = error?.message || this.$t('settings.debugImpersonateError');
        this.impersonating = false;
      }
    },
  },
};
</script>

<style scoped>
.settings-screen { min-height: 100%; }
.settings-list,
.settings-detail {
  background: var(--page-bg);
  color: var(--title);
}
.settings-list {
  max-width: 720px;
  margin: 0 auto;
  padding: 8px 0 40px;
}
.settings-detail {
  min-height: 0;
  height: 100%;
  overflow: auto;
  padding: 8px 0 48px;
}
.crumb {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 8px 24px 4px;
  border: 0;
  background: transparent;
  color: var(--blue-button);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.crumb :deep(.tabler-icon) { width: 18px; height: 18px; }
h1, .detail-title {
  margin: 8px 24px 4px;
  font-size: 1.7rem;
  font-weight: 750;
  color: var(--title);
}
.section h2 {
  margin: 22px 24px 8px;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.rows { border-top: 1px solid var(--separator); }
.settings-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 56px;
  border: 0;
  border-bottom: 1px solid var(--separator);
  background: transparent;
  color: var(--title);
  text-align: start;
  padding: 10px 24px;
  font: inherit;
  cursor: pointer;
}
.settings-row.selected { background: var(--list-selected); }
.settings-row:hover { background: var(--list-selected); }
.tile {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--blue-button);
  color: var(--button-text);
}
.tile :deep(.tabler-icon) { width: 18px; height: 18px; }
.profile-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1 1 auto;
}
.profile-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.title {
  min-width: 0;
  flex: 1 1 auto;
  font-size: 1rem;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.email, .detail {
  color: var(--text-secondary);
  font-size: 0.92rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.email { font-size: 0.86rem; }
.detail { flex: 0 1 auto; max-width: 46%; }
.chevron { width: 18px; height: 18px; color: var(--text-secondary); flex: 0 0 auto; }
.chevron.hidden { visibility: hidden; }
.version {
  margin: 28px 24px 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.field-label {
  display: block;
  margin: 18px 24px 8px;
  font-weight: 650;
}
.field {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  margin: 0 24px;
  padding: 0 16px 0 20px;
  border-radius: 12px;
  background: var(--inset-bg);
  color: var(--title);
  font-size: 1.05rem;
}
.field span {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.icon-btn {
  border: 0;
  background: transparent;
  color: var(--blue-button);
  padding: 8px;
  cursor: pointer;
}
.icon-btn :deep(.tabler-icon) { width: 22px; height: 22px; }
.logout {
  display: block;
  width: calc(100% - 48px);
  margin: 28px 24px 0;
}
.delete {
  display: block;
  width: calc(100% - 48px);
  margin: 36px 24px 0;
  min-height: 52px;
  border: 0;
  border-radius: 12px;
  background: #fee2e2;
  color: #dc2626;
  font: inherit;
  font-size: 1.02rem;
  font-weight: 650;
  cursor: pointer;
}
.delete:disabled { opacity: 0.5; cursor: default; }
html[data-theme="dark"] .delete {
  background: rgba(220, 38, 38, 0.18);
  color: #fca5a5;
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 18px 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--inset-bg);
  color: var(--text-secondary);
}
.search :deep(.tabler-icon) { width: 18px; height: 18px; }
.search input {
  flex: 1 1 auto;
  border: 0;
  background: transparent;
  color: var(--title);
  font: inherit;
  font-size: 1rem;
  outline: none;
}
.choice-list { border-top: 1px solid var(--separator); }
.choice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  border: 0;
  border-bottom: 1px solid var(--separator);
  background: transparent;
  color: var(--title);
  text-align: start;
  padding: 12px 24px;
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
}
.choice :deep(.tabler-icon) { width: 20px; height: 20px; color: var(--blue-button); }
.choice:hover { background: var(--list-selected); }
.empty, .help, .error {
  margin: 16px 24px;
  color: var(--text-secondary);
  line-height: 1.45;
}
.error { color: var(--error); }
.command {
  margin: 0 24px 12px;
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
}
textarea {
  display: block;
  width: calc(100% - 48px);
  min-height: 140px;
  margin: 0 24px 16px;
  padding: 12px;
  border: 1px solid var(--separator);
  border-radius: 10px;
  background: var(--inset-bg);
  color: var(--title);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
  resize: vertical;
}
.impersonate-btn {
  display: block;
  width: calc(100% - 48px);
  margin: 0 24px;
  background: #f59e0b !important;
  color: #1c1917 !important;
}
.impersonate-btn:disabled { opacity: 0.5; }
.debug-list { border-top: 1px solid var(--separator); }
.debug-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0;
  padding: 12px 24px;
  border-bottom: 1px solid var(--separator);
  color: var(--title);
  font-size: 1rem;
}
.debug-row.tall { align-items: flex-start; }
.debug-row strong, .debug-row > span:not(.debug-icon) { display: block; flex: 1 1 auto; }
.debug-row small {
  display: block;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 450;
  line-height: 1.35;
}
.debug-icon { width: 22px; height: 22px; color: #f59e0b; flex: 0 0 auto; }
.impersonate { border: 0; border-bottom: 1px solid var(--separator); border-radius: 0; }
.switch {
  width: 51px;
  height: 31px;
  flex: 0 0 auto;
  position: relative;
  border: 0;
  border-radius: 16px;
  background: #cbd5e1;
  padding: 0;
  cursor: pointer;
}
.switch[aria-checked="true"] { background: #34c759; }
.switch span {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.28);
  transition: transform 0.15s ease;
}
.switch[aria-checked="true"] span { transform: translateX(20px); }
.name-root {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.5);
  cursor: pointer;
}
.name-sheet {
  position: relative;
  width: min(420px, 100%);
  padding: 22px;
  border-radius: 24px;
  background: var(--card-bg);
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.28);
}
.name-sheet h2 { margin: 0 0 8px; font-size: 1.25rem; }
.name-sheet p { margin: 0 0 14px; color: var(--text-secondary); }
.name-sheet input {
  width: 100%;
  min-height: 48px;
  border: 1px solid var(--separator);
  border-radius: 12px;
  background: var(--inset-bg);
  color: var(--title);
  font: inherit;
  font-size: 1rem;
  padding: 0 14px;
}
.name-actions { display: flex; gap: 10px; margin-top: 16px; }
.name-actions .mopiq-btn { flex: 1; }
@media (max-width: 899px) {
  .settings-detail { height: auto; overflow: visible; }
}
</style>
