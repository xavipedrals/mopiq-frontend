<template>
  <div class="shell quiz-shell">
    <div class="container-xl">
      <div class="top">
        <button
          type="button"
          class="study-close"
          :aria-label="$t('quiz.close')"
          @click="leave"
        >
          <span class="study-close-disc"></span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="currentColor"/>
            <path d="M9.05 9.05l5.9 5.9M14.95 9.05l-5.9 5.9" fill="none" stroke="var(--close-x)" stroke-width="1.85" stroke-linecap="round"/>
          </svg>
        </button>
        <p class="top-title">{{ $t('quiz.title') }}</p>
        <span class="top-balance" aria-hidden="true"></span>
      </div>

      <div v-if="!done" class="pbar-wrap">
        <div
          class="pbar"
          role="progressbar"
          :aria-valuemin="0"
          :aria-valuemax="requestedCount"
          :aria-valuenow="answers.length"
        >
          <span class="pbar-fill right" :style="{ width: pctAnswered }"></span>
          <span class="pbar-fill wrong" :style="{ width: pctWrong }"></span>
        </div>
      </div>

      <RobotLoader
        v-if="loading"
        :title="loadingExtra ? $t('quiz.extra') : $t('quiz.creating')"
        :subtitle="$t('quiz.creatingHint')"
      />

      <section v-else-if="error && !done" class="state">
        <svg class="state-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.6 1.9 20.4h20.2L12 3.6Z"
            fill="currentColor"
          />
          <path
            d="M12 9.4v5.1M12 17.5v.1"
            fill="none"
            stroke="var(--page-bg)"
            stroke-width="2.1"
            stroke-linecap="round"
          />
        </svg>
        <h2>{{ $t('quiz.errorTitle') }}</h2>
        <p>{{ error }}</p>
        <div class="state-actions">
          <button type="button" class="pill-btn ghost" @click="leave">{{ $t('quiz.close') }}</button>
          <button v-if="answers.length" type="button" class="pill-btn" @click="showResults">
            {{ $t('quiz.seeResults') }}
          </button>
          <button v-else type="button" class="pill-btn" @click="createQuiz">{{ $t('quiz.retry') }}</button>
        </div>
      </section>

      <section v-else-if="done" class="results">
        <h2 class="results-title">{{ result.title }}</h2>
        <p class="results-lede">{{ result.body }}</p>

        <div class="score" :class="`band-${band}`">
          <span class="score-value">{{ percentage }}%</span>
        </div>

        <div class="stats">
          <div class="stat bad">
            <span class="stat-value">{{ incorrectCount }}</span>
            <span class="stat-label">{{ $t('quiz.incorrect') }}</span>
          </div>
          <div class="stat good">
            <span class="stat-value">{{ correctCount }}</span>
            <span class="stat-label">{{ $t('quiz.correct') }}</span>
          </div>
          <div class="stat clock">
            <span class="stat-value">{{ elapsed }}</span>
            <span class="stat-label">{{ $t('quiz.time') }}</span>
          </div>
        </div>

        <h3 class="review-title">{{ $t('quiz.questions') }} ({{ answers.length }})</h3>
        <div class="review-list">
          <article
            v-for="(item, reviewIndex) in reviewItems"
            :key="item.key"
            class="review"
            :class="item.correct ? 'ok' : 'bad'"
          >
            <p class="review-kicker">{{ $t('quiz.questionN', { n: reviewIndex + 1 }) }}</p>
            <p class="review-q">{{ item.question }}</p>
            <div v-if="!item.correct && item.given" class="review-row wrong">
              <FaceIcon />
              <span>{{ item.given }}</span>
            </div>
            <div class="review-row right">
              <FaceIcon happy />
              <span>{{ item.right }}</span>
            </div>
          </article>
        </div>

        <div class="sticky-bar">
          <button type="button" class="pill-btn wide" @click="leave">{{ $t('quiz.finish') }}</button>
        </div>
      </section>

      <section v-else-if="current" class="board">
        <div :key="current.id" class="q-card">
          <p class="q-kicker">
            {{ $t('quiz.questionOf', { current: index + 1, total: requestedCount }) }}
          </p>
          <p class="q-text">{{ current.question }}</p>
        </div>

        <div class="verdict-slot">
          <span v-if="verdict !== null" class="verdict" :class="verdict ? 'ok' : 'bad'">
            <FaceIcon :happy="verdict" />
            {{ verdict ? $t('quiz.correct') : $t('quiz.incorrect') }}
          </span>
        </div>

        <div class="answers">
          <button
            v-for="(option, optionIndex) in current.options"
            :key="optionIndex"
            type="button"
            class="answer"
            :class="optionState(optionIndex)"
            @click="choose(optionIndex)"
          >
            <span class="letter">{{ letterFor(optionIndex) }}</span>
            <span class="answer-text">{{ option }}</span>
          </button>
        </div>

        <div v-if="verdict !== null" class="sticky-bar">
          <button type="button" class="pill-btn wide" @click="continueQuiz">
            {{ continueLabel }}
          </button>
        </div>
      </section>
    </div>
    <StudyLimitSheet
      :open="limitOpen"
      :limit="freeLimit"
      :action-key="answers.length ? 'quiz.seeResults' : 'common.ok'"
      art="/robo-key.png"
      @dismiss="onLimitDismiss"
    />
  </div>
</template>

<script>
import FaceIcon from './FaceIcon.vue';
import RobotLoader from './RobotLoader.vue';
import StudyLimitSheet from './StudyLimitSheet.vue';
import {
  fetchAllStudyCards,
  fetchDeck,
  fetchFreeStudyQuota,
  generateExtraQuizQuestions,
  generateQuizQuestions,
  incrementFreeStudyQuota,
} from '../api/mopiq';
import { ankiDayString } from '../study/ankiDay';
import { applyQuota, FREE_CARD_DAILY_LIMIT, isDailyLimitReached } from '../study/freeStudyQuota';
import {
  formatQuizTime,
  optionLetter,
  parseQuizQuery,
  percentageBand,
  pickQuizFlashcards,
  purifyQuestions,
  quizSourceCards,
  resultCopy,
  usedSourceIds,
} from '../study/quiz';

export default {
  name: 'QuizSessionPage',
  components: { FaceIcon, RobotLoader, StudyLimitSheet },
  data() {
    return {
      loading: true,
      loadingExtra: false,
      error: '',
      deck: null,
      sourceCards: [],
      quizId: null,
      questions: [],
      answers: [],
      index: 0,
      revealed: [],
      answeredIndex: null,
      done: false,
      startedAt: 0,
      elapsedSeconds: 0,
      requestedCount: 10,
      config: parseQuizQuery(),
      quotaUsed: 0,
      quotaUnlimited: false,
      limitOpen: false,
      pendingError: '',
    };
  },
  computed: {
    freeLimit() {
      return FREE_CARD_DAILY_LIMIT;
    },
    current() {
      return this.questions[this.index] || null;
    },
    correctCount() {
      return this.answers.filter((item) => item.correct).length;
    },
    incorrectCount() {
      return this.answers.filter((item) => !item.correct).length;
    },
    percentage() {
      if (!this.answers.length) return 0;
      return Math.round((this.correctCount / this.answers.length) * 100);
    },
    band() {
      return percentageBand(this.percentage);
    },
    pctAnswered() {
      return this.barWidth(this.answers.length);
    },
    pctWrong() {
      return this.barWidth(this.incorrectCount);
    },
    verdict() {
      if (this.answeredIndex == null || !this.current) return null;
      return this.answeredIndex === this.current.correctIndex;
    },
    result() {
      return resultCopy(this.percentage, (key) => this.$t(key));
    },
    elapsed() {
      return formatQuizTime(this.elapsedSeconds);
    },
    reviewItems() {
      return this.answers.map((answer, position) => ({ ...answer, key: `${answer.id}-${position}` }));
    },
    continueLabel() {
      const lastRequested = this.index >= this.requestedCount - 1;
      const lastAvailable = this.index >= this.questions.length - 1;
      if (lastRequested || (lastAvailable && this.pendingError)) {
        return this.$t('quiz.seeResults');
      }
      return this.$t('quiz.continue');
    },
  },
  async created() {
    this.config = parseQuizQuery(this.$route.query);
    this.requestedCount = this.config.count;
    await this.createQuiz();
  },
  methods: {
    leave() {
      const deckId = this.$route.params.deckId;
      this.$router.push(`/decks/${deckId}`);
    },
    barWidth(count) {
      const total = Math.max(1, this.requestedCount);
      return `${Math.min(100, (count / total) * 100)}%`;
    },
    letterFor(optionIndex) {
      return optionLetter(optionIndex);
    },
    purifyLabels() {
      return {
        trueLabel: this.$t('quiz.true'),
        falseLabel: this.$t('quiz.false'),
      };
    },
    consumeQuota() {
      if (this.quotaUnlimited) return false;
      this.quotaUsed += 1;
      incrementFreeStudyQuota();
      return this.quotaUsed >= FREE_CARD_DAILY_LIMIT;
    },
    optionState(optionIndex) {
      if (!this.revealed.includes(optionIndex)) return '';
      return optionIndex === this.current.correctIndex ? 'right' : 'wrong';
    },
    resetQuestion() {
      this.revealed = [];
      this.answeredIndex = null;
    },
    choose(optionIndex) {
      if (!this.current || this.revealed.includes(optionIndex)) return;
      this.revealed.push(optionIndex);
      if (this.answeredIndex != null) return;
      this.answeredIndex = optionIndex;
      this.answers.push({
        id: this.current.id,
        correct: optionIndex === this.current.correctIndex,
        question: this.current.question,
        given: this.current.options[optionIndex],
        right: this.current.options[this.current.correctIndex],
      });
    },
    showResults() {
      if (this.startedAt) {
        this.elapsedSeconds += (Date.now() - this.startedAt) / 1000;
        this.startedAt = 0;
      }
      this.done = true;
      this.loading = false;
      this.error = '';
      this.limitOpen = false;
    },
    onLimitDismiss() {
      this.limitOpen = false;
      if (this.answers.length) this.showResults();
      else this.leave();
    },
    async createQuiz() {
      this.loading = true;
      this.loadingExtra = false;
      this.error = '';
      this.done = false;
      try {
        const deckId = this.$route.params.deckId;
        const studyDay = ankiDayString();
        const [deck, cards, quota] = await Promise.all([
          fetchDeck(deckId),
          fetchAllStudyCards(deckId),
          fetchFreeStudyQuota(studyDay).catch(() => null),
        ]);
        if (!deck.canStudy) {
          this.$router.replace(`/decks/${deckId}`);
          return;
        }
        this.deck = deck;
        const applied = applyQuota(0, quota, studyDay);
        this.quotaUsed = applied.used;
        this.quotaUnlimited = applied.unlimited;
        if (isDailyLimitReached(quota, studyDay, applied.used)) {
          this.loading = false;
          this.limitOpen = true;
          return;
        }
        if (this.consumeQuota()) {
          this.loading = false;
          this.limitOpen = true;
          return;
        }

        this.sourceCards = quizSourceCards(cards, this.config.source === 'studied');
        if (this.sourceCards.length < this.requestedCount || this.sourceCards.length <= 10) {
          this.error = this.$t(
            this.config.source === 'studied' ? 'quiz.notEnoughStudied' : 'quiz.notEnough',
            { count: this.sourceCards.length },
          );
          return;
        }

        const flashcards = pickQuizFlashcards(this.sourceCards, { limit: 15 });
        const payload = await generateQuizQuestions({
          flashcards,
          difficulty: this.config.difficulty,
          multi: this.config.multi,
          trueFalse: this.config.trueFalse,
          count: this.requestedCount,
        });
        const questions = purifyQuestions(payload.questions, this.purifyLabels());
        if (!questions.length) {
          this.error = this.$t('quiz.noQuestions');
          return;
        }
        this.quizId = payload.quiz?.id;
        this.questions = questions;
        this.startedAt = Date.now();
      } catch (error) {
        this.error = error.message || this.$t('quiz.startError');
      } finally {
        this.loading = false;
      }
    },
    async fetchExtra() {
      if (!this.quizId || this.loadingExtra) return;
      this.loading = true;
      this.loadingExtra = true;
      this.pendingError = '';
      try {
        const flashcards = pickQuizFlashcards(this.sourceCards, {
          excludeIds: usedSourceIds(this.questions),
          limit: 15,
        });
        if (!flashcards.length) {
          this.pendingError = this.$t(
            this.config.source === 'studied' ? 'quiz.notEnoughStudied' : 'quiz.notEnough',
            { count: this.sourceCards.length },
          );
          return;
        }
        const payload = await generateExtraQuizQuestions({
          quizId: this.quizId,
          flashcards,
        });
        const extra = purifyQuestions(payload.questions, this.purifyLabels());
        if (!extra.length) {
          this.pendingError = this.$t('quiz.noQuestions');
          return;
        }
        this.questions = this.questions.concat(extra);
      } catch (error) {
        this.pendingError = error.message || this.$t('quiz.startError');
      } finally {
        this.loading = false;
        this.loadingExtra = false;
      }
    },
    async continueQuiz() {
      if (this.consumeQuota()) {
        this.limitOpen = true;
        return;
      }
      const canAdvance = this.index < this.questions.length - 1 && this.index < this.requestedCount - 1;
      if (canAdvance) {
        this.index += 1;
        this.resetQuestion();
        if (this.index === this.questions.length - 5 && this.requestedCount > this.questions.length) {
          void this.fetchExtra();
        }
        return;
      }
      if (this.index >= this.requestedCount - 1) {
        this.showResults();
        return;
      }
      if (this.pendingError) {
        this.error = this.pendingError;
        return;
      }
      if (this.loadingExtra) return;
      await this.fetchExtra();
      if (this.index < this.questions.length - 1 && this.index < this.requestedCount - 1) {
        this.index += 1;
        this.resetQuestion();
        return;
      }
      if (this.pendingError) {
        this.error = this.pendingError;
        return;
      }
      this.showResults();
    },
  },
};
</script>

<style scoped>
.quiz-shell { min-height: 100vh; display: flex; flex-direction: column; }
.quiz-shell > .container-xl {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  max-width: 790px;
  margin: 0 auto;
  padding: 0 20px 24px;
}

/* ---------- top bar + progress ---------- */
.top {
  display: flex;
  align-items: center;
  height: 60px;
}
.study-close,
.top-balance {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
}
.study-close {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--title);
  cursor: pointer;
}
.study-close-disc {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: var(--inset-bg);
}
.study-close svg { position: relative; width: 28px; height: 28px; }
.top-title {
  flex: 1;
  margin: 0;
  text-align: center;
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--title);
}
.pbar-wrap { padding: 12px 0 18px; }
.pbar {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: var(--empty-bar);
  overflow: hidden;
}
.pbar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  transition: width 0.25s ease-out;
}
.pbar-fill.right { background: var(--quiz-bar-right); }
.pbar-fill.wrong { background: var(--quiz-bar-wrong); }

/* ---------- error / empty state ---------- */
.state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 4px 56px;
  text-align: center;
}
.state-icon { width: 76px; height: 76px; color: var(--quiz-red); margin-bottom: 18px; }
.state h2 { margin: 0; font-size: 1.5rem; font-weight: 750; color: var(--title); }
.state p { margin: 0; max-width: 46ch; line-height: 1.5; color: var(--text-secondary); }
.state-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 16px; }

/* ---------- buttons ---------- */
.pill-btn {
  border: 0;
  border-radius: 20px;
  background: var(--blue-button);
  color: var(--button-text);
  font: inherit;
  font-weight: 700;
  font-size: 1rem;
  padding: 15px 28px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.pill-btn:hover { background: var(--blue-button-hover); }
.pill-btn.ghost { background: var(--secondary-btn-bg); color: var(--secondary-btn-text); }
.pill-btn.ghost:hover { background: var(--secondary-btn-hover); }
.pill-btn.wide { width: 100%; }
.sticky-bar {
  position: sticky;
  bottom: 0;
  margin-top: auto;
  padding: 16px 0 8px;
  background: linear-gradient(to bottom, transparent, var(--page-bg) 34%);
}

/* ---------- question board ---------- */
.board {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.q-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 168px;
  padding: 20px;
  border-radius: 30px;
  background: var(--card-bg);
  border: 1px solid var(--quiz-hairline);
  text-align: center;
}
.q-kicker {
  margin: 0 0 12px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--quiz-green);
}
.q-text {
  margin: 0;
  font-size: 1.13rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--title);
  overflow-wrap: anywhere;
}
.verdict-slot { min-height: 44px; padding: 12px 0; }
.verdict {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
}
.verdict.ok { background: var(--quiz-green-soft); color: var(--quiz-green); }
.verdict.bad { background: var(--quiz-red-soft); color: var(--quiz-red); }

.answers {
  border-radius: 20px;
  border: 1px solid var(--quiz-rule);
  overflow: hidden;
  background: var(--card-bg);
}
.answer {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 0;
  border-top: 1px solid var(--quiz-rule);
  background: var(--card-bg);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}
.answer:first-child { border-top: 0; }
.answer:hover { background: var(--inset-bg); }
.answer.right,
.answer.right:hover { background: var(--quiz-green-soft); }
.answer.wrong,
.answer.wrong:hover { background: var(--quiz-red-soft); }
.letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  border: 1px solid var(--quiz-letter-border);
  background: var(--quiz-letter-bg);
  color: var(--title);
  font-size: 1rem;
  font-weight: 700;
}
.answer.right .letter {
  border-color: transparent;
  background: var(--quiz-green);
  color: #fff;
}
.answer.wrong .letter {
  border-color: transparent;
  background: var(--quiz-red);
  color: #fff;
}
.answer-text {
  flex: 1;
  font-size: 1rem;
  line-height: 1.45;
  color: var(--text);
  overflow-wrap: anywhere;
}

/* ---------- results ---------- */
.results {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  text-align: center;
}
.results-title {
  margin: 12px 0 12px;
  font-size: clamp(1.6rem, 6vw, 2rem);
  font-weight: 780;
  color: var(--title);
}
.results-lede {
  margin: 0 0 36px;
  font-size: 1.05rem;
  line-height: 1.5;
  color: var(--text);
}
.score {
  align-self: center;
  display: inline-block;
  border-radius: 30px;
  padding-bottom: 8px;
  margin-bottom: 32px;
}
.score-value {
  display: block;
  border-radius: 30px;
  border: 2px solid;
  padding: 10px 32px;
  font-size: clamp(2.6rem, 13vw, 3.9rem);
  font-weight: 800;
  line-height: 1.1;
}
.score.band-red { background: #f87171; }
.score.band-red .score-value { background: #fee2e2; border-color: #f87171; color: #dc2626; }
.score.band-amber { background: #fbbf24; }
.score.band-amber .score-value { background: #fef3c7; border-color: #fbbf24; color: #d97706; }
.score.band-green { background: #4ade80; }
.score.band-green .score-value { background: #dcfce7; border-color: #4ade80; color: #16a34a; }
.score.band-cyan { background: #22d3ee; }
.score.band-cyan .score-value { background: #cffafe; border-color: #22d3ee; color: #0891b2; }

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 12px 18px;
  border-radius: 20px;
  background: var(--card-bg);
  border: 1px solid var(--quiz-hairline);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}
.stat-value { font-size: 1.45rem; font-weight: 700; line-height: 1.1; }
.stat-label { font-size: 0.85rem; }
.stat.bad { color: var(--quiz-red); }
.stat.good { color: var(--stat-lime); }
.stat.clock { color: var(--stat-indigo); }

.review-title {
  margin: 0 0 20px;
  text-align: left;
  font-size: 1.3rem;
  font-weight: 750;
  color: var(--title);
}
.review-list { display: grid; gap: 20px; text-align: left; }
.review {
  border-radius: 30px;
  background: var(--card-bg);
  border: 2px solid var(--quiz-green-edge);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}
.review.bad { border-color: var(--quiz-red-edge); }
.review-kicker {
  margin: 20px 20px 8px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--quiz-green);
}
.review.bad .review-kicker { color: var(--quiz-red); }
.review-q {
  margin: 0 20px 14px;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--title);
  overflow-wrap: anywhere;
}
.review-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px dashed var(--quiz-pick-border);
  font-size: 1rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.review-row.wrong { color: var(--quiz-red); }
.review-row.right { color: var(--quiz-green); }

@keyframes quiz-rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
.q-card,
.verdict,
.sticky-bar { animation: quiz-rise 0.2s ease-out; }

@media (prefers-reduced-motion: reduce) {
  .q-card,
  .verdict,
  .sticky-bar { animation: none; }
  .pbar-fill { transition: none; }
}

@media (max-width: 480px) {
  .stats { gap: 8px; }
  .stat { padding: 12px 8px 14px; }
  .stat-value { font-size: 1.2rem; }
  .stat-label { font-size: 0.76rem; }
  .review-kicker { margin: 16px 16px 8px; }
  .review-q { margin: 0 16px 12px; }
  .review-row { padding: 12px 16px; }
}
</style>
