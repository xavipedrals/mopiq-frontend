<template>
  <div class="page" :class="{ 'is-settings': settingsOpen }">
        <div v-if="!settingsOpen" class="topbar">
          <router-link :to="listTo" class="pane-back glass-action">
            <TablerIcon name="chevronLeft" />
            {{ $t('decks.title') }}
          </router-link>
          <button type="button" class="tool glass-action" @click="settingsOpen = true">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>
            </svg>
            <span class="tool-label">{{ $t('profile.settings') }}</span>
          </button>
        </div>
        <ProfileSettings
          v-if="settingsOpen && !loading && !error"
          :profile="profile"
          @close="settingsOpen = false"
          @updated="onProfileUpdated"
        />
        <div v-else-if="!settingsOpen" class="profile-body">
        <div v-if="loading" aria-busy="true">
          <div class="hero">
            <div class="avatar-block">
              <SkeletonBlock class="s-ring" w="140px" h="140px" radius="50%" />
              <SkeletonBlock class="s-level" w="48px" h="48px" radius="50%" />
            </div>
            <SkeletonBlock class="s-name" w="min(240px, 62vw)" h="1.7rem" radius="9px" />
            <SkeletonBlock class="s-meta" w="min(190px, 52vw)" h="1rem" radius="6px" />
            <SkeletonBlock class="s-meta" w="min(220px, 58vw)" h="0.95rem" radius="6px" />
          </div>
          <div v-for="count in [2, 4]" :key="count" class="stat-section">
            <SkeletonBlock w="160px" h="1.5rem" radius="6px" />
            <div class="stats">
              <div v-for="n in count" :key="n" class="stat">
                <SkeletonBlock class="s-stat-icon" w="28px" h="28px" radius="9px" />
                <SkeletonBlock class="s-stat-value" w="64%" h="2rem" radius="10px" />
                <SkeletonBlock w="48%" h="1rem" radius="6px" />
              </div>
            </div>
          </div>
        </div>
        <p v-else-if="error" class="error">{{ error }}</p>
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

          <section v-for="section in statSections" :key="section.title" class="stat-section" :aria-labelledby="section.title" :aria-busy="statisticsLoading">
            <h2 :id="section.title">{{ $t(`profile.${section.title}`) }}</h2>
            <div class="stats">
              <div v-for="stat in section.stats" :key="stat.label" class="stat">
                <TablerIcon class="stat-icon" :name="stat.icon" />
                <div class="value" :class="stat.color">
                  <template v-if="stat.value == null">—</template>
                  <template v-else-if="stat.time">
                    <span v-for="(part, index) in timeParts(stat.value)" :key="index">
                      {{ part.primary }}<span class="unit">{{ part.unit }}</span>
                      <span v-if="index < timeParts(stat.value).length - 1"> </span>
                    </span>
                  </template>
                  <template v-else>
                    {{ formatNumber(stat.value) }}<span v-if="stat.days" class="unit">{{ $t('profile.daysUnit') }}</span>
                  </template>
                </div>
                <div class="label">{{ $t(`profile.${stat.label}`) }}</div>
              </div>
            </div>
          </section>
          <div v-if="statisticsError" class="stats-error" role="status">
            <p>{{ $t('profile.statsLoadError') }}</p>
            <button type="button" class="tool" @click="loadStatistics">{{ $t('profile.retryStats') }}</button>
          </div>
        </template>
        </div>
  </div>
</template>

<script>
import ProfileSettings from './ProfileSettings.vue';
import TablerIcon from './TablerIcon.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import { fetchUserProfileStatistics, fetchUserProfile } from '../api/mopiq';
import { getCurrentUser } from '../auth/session';
import { getAvatarImageName } from '../utils';
import { formatJoinedDate, formatStudiedTime, getLevelAndPercentage } from '../profile/experience';
import { adoptFromProfileIfNeeded, localeTag } from '../i18n';

const RING_CIRCUMFERENCE = 2 * Math.PI * 60;

export default {
  name: 'ProfilePage',
  components: { ProfileSettings, SkeletonBlock, TablerIcon },
  data() {
    return {
      loading: true,
      error: '',
      avatarFailed: false,
      settingsOpen: false,
      statistics: null,
      statisticsLoading: false,
      statisticsError: false,
      statisticsRequest: 0,
      statisticsTimer: null,
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
    listTo() {
      return this.$route.path.startsWith('/dev/split') ? '/dev/split' : '/decks';
    },
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
    statSections() {
      const stats = this.statistics;
      return [
        { title: 'todayStats', stats: [
          { label: 'cardsStudied', icon: 'copy', color: 'emerald', value: stats?.todayCardsStudied },
          { label: 'studied', icon: 'clock', color: 'blue', value: stats?.todaySecondsStudied, time: true },
        ] },
        { title: 'allTimeStats', stats: [
          { label: 'cardsStudied', icon: 'copy', color: 'orange', value: stats?.cardsStudied },
          { label: 'comingBack', icon: 'calendar', color: 'indigo', value: stats?.daysUsingApp, days: true },
          { label: 'studied', icon: 'clock', color: 'cyan', value: stats?.secondsStudied, time: true },
          { label: 'experience', icon: 'star', color: 'lime', value: stats?.experience },
        ] },
      ];
    },
    avatarSrc() {
      if (this.avatarFailed) return getAvatarImageName(this.profile.avatarNumber || 0);
      return this.profile.avatarUrl || getAvatarImageName(this.profile.avatarNumber || 0);
    },
  },
  async created() {
    if (this.$route.meta.preview) {
      this.profile = {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        experience: 4200,
        secondsStudied: 5400,
        daysUsingApp: 12,
        cardsStudied: 80,
        avatarNumber: 3,
        joinedDate: '2024-03-01T00:00:00Z',
        avatarUrl: getAvatarImageName(3),
        isPremium: false,
      };
      this.statistics = {
        todayCardsStudied: 42,
        todaySecondsStudied: 1260,
        todayEndsAtEpoch: Date.now() / 1000 + 86400,
        cardsStudied: 80,
        daysUsingApp: 12,
        secondsStudied: 5400,
        experience: 4200,
      };
      this.loading = false;
      return;
    }
    void this.loadStatistics();
    try {
      this.profile = await fetchUserProfile();
      adoptFromProfileIfNeeded(this.profile.locale);
    } catch (error) {
      this.error = error.message || this.$t('profile.loadError');
    } finally {
      this.loading = false;
    }
  },
  mounted() {
    if (this.$route.meta.preview) return;
    window.addEventListener('focus', this.refreshStatistics);
    document.addEventListener('visibilitychange', this.refreshStatistics);
    this.statisticsTimer = window.setInterval(() => {
      if (this.statistics && Date.now() / 1000 >= this.statistics.todayEndsAtEpoch) {
        this.refreshStatistics();
      }
    }, 60_000);
  },
  beforeUnmount() {
    this.statisticsRequest += 1;
    window.clearInterval(this.statisticsTimer);
    window.removeEventListener('focus', this.refreshStatistics);
    document.removeEventListener('visibilitychange', this.refreshStatistics);
  },
  methods: {
    formatNumber(value) {
      return value.toLocaleString(localeTag(this.$i18n.locale), { maximumFractionDigits: 0 });
    },
    timeParts(seconds) {
      const time = formatStudiedTime(seconds);
      return time.parts || [time];
    },
    refreshStatistics() {
      if (document.visibilityState === 'visible' && !this.statisticsLoading) void this.loadStatistics();
    },
    async loadStatistics() {
      const request = ++this.statisticsRequest;
      const owner = getCurrentUser()?.supabaseUid;
      this.statistics = null;
      this.statisticsLoading = true;
      this.statisticsError = false;
      try {
        const snapshot = await fetchUserProfileStatistics();
        if (request === this.statisticsRequest && owner === getCurrentUser()?.supabaseUid) this.statistics = snapshot;
      } catch {
        if (request === this.statisticsRequest) this.statisticsError = true;
      } finally {
        if (request === this.statisticsRequest) this.statisticsLoading = false;
      }
    },
    onAvatarError() {
      this.avatarFailed = true;
    },
    onProfileUpdated(patch) {
      this.profile = { ...this.profile, ...patch };
    },
  },
};
</script>

<style scoped>
.page { padding: 12px 28px 56px; }
.profile-body { max-width: 760px; margin: 0 auto; }
.topbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 8px;
}
.pane-back {
  display: none;
  align-items: center;
  gap: 2px;
  margin-right: auto;
  color: var(--blue-button);
  text-decoration: none;
  font-weight: 600;
}
.tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 18px;
  background: var(--card-bg);
  color: var(--title);
  cursor: pointer;
  box-shadow: 0 0 0 1px var(--card-list-border);
}
.tool svg { width: 18px; height: 18px; display: block; }
.tool-label {
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
}
.pane-back :deep(.tabler-icon) { width: 18px; height: 18px; display: block; }
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
.stat-section { margin-top: 28px; }
.stat-section h2 { font-size: 1.25rem; font-weight: 700; color: var(--title); margin: 0 0 18px; }
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 0;
}
.stat {
  background: var(--card-bg);
  border: 1px solid var(--stat-card-border);
  border-radius: 24px;
  min-width: 0;
  padding: 24px 18px;
  text-align: left;
}
.stat :deep(.stat-icon) {
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
.emerald { color: var(--stat-emerald); }
.blue { color: var(--stat-blue); }
.stats-error { margin-top: 18px; color: var(--text-secondary); text-align: center; }
.s-ring { position: absolute; left: 14px; top: 0; }
.s-level { position: absolute; right: 4px; bottom: 12px; }
.s-name { margin-top: 6px; }
.s-meta { margin-top: 10px; }
.s-stat-icon { margin-bottom: 16px; }
.s-stat-value { margin-bottom: 12px; }
.error { color: var(--error); margin-top: 12px; text-align: center; }
@media (max-width: 899px) {
  .pane-back { display: inline-flex; }
  .page { padding: 8px 16px 48px; }
}
@media (max-width: 599px) {
  .tool-label { display: none; }
  .tool { padding: 0; }
}
@media (max-width: 520px) {
  .stats { gap: 12px; }
  .value { font-size: 1.6rem; }
  .stat { padding: 16px; }
}
.page.is-settings {
  max-width: none;
  padding: 0;
}
</style>
