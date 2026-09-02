import { ankiDayEndExclusive, ankiDayStart, isSameAnkiDay } from './ankiDay';
import { STATES } from './scheduler';

function dueTime(card) {
  const t = card.dueDate ? new Date(card.dueDate).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

function shuffleCopy(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function studiedTodayCounts(cards, now = new Date()) {
  const start = ankiDayStart(now).getTime();
  const end = ankiDayEndExclusive(now).getTime();
  let newStudied = 0;
  let reviewStudied = 0;
  for (const card of cards) {
    if (!card.lastReviewedAt) continue;
    const t = new Date(card.lastReviewedAt).getTime();
    if (t < start || t >= end) continue;
    const first = card.firstReviewedAt ? new Date(card.firstReviewedAt).getTime() : null;
    const isNewToday = card.reviewCount === 1 || (first != null && first >= start && first < end);
    if (isNewToday) newStudied += 1;
    else reviewStudied += 1;
  }
  return { newStudied, reviewStudied };
}

export function buildStudyQueues(cards, config, now = new Date()) {
  const { newStudied, reviewStudied } = studiedTodayCounts(cards, now);
  const newRemaining = Math.max(0, config.newCardsPerDay - newStudied);
  const reviewRemaining = Math.max(0, config.maxReviewsPerDay - reviewStudied);
  const dayEnd = ankiDayEndExclusive(now).getTime();

  const newCards = [];
  const learningCards = [];
  const reviewCards = [];

  for (const card of cards) {
    if (card.suspended || card.deleted) continue;
    const state = card.state || STATES.NEW;
    if (state === STATES.NEW) {
      newCards.push(card);
    } else if (state === STATES.LEARNING || state === STATES.RELEARNING) {
      if (dueTime(card) <= dayEnd) learningCards.push(card);
    } else if (state === STATES.REVIEW) {
      if (dueTime(card) <= dayEnd) reviewCards.push(card);
    }
  }

  newCards.sort((a, b) => (a.position || 0) - (b.position || 0));
  const limitedNew = (config.displayNewCardsInOrder ? newCards : shuffleCopy(newCards)).slice(0, newRemaining);
  learningCards.sort((a, b) => dueTime(a) - dueTime(b));
  reviewCards.sort((a, b) => dueTime(a) - dueTime(b));
  const limitedReview = reviewCards.slice(0, reviewRemaining);

  return {
    newCards: limitedNew,
    learningCards,
    reviewCards: limitedReview,
    newStudied,
    reviewStudied,
    uniqueCount: new Set([...limitedNew, ...learningCards, ...limitedReview].map((c) => c.id)).size,
  };
}

export function createStudyQueue(initial) {
  const state = {
    newCards: initial.newCards.slice(),
    learningCards: initial.learningCards.slice(),
    reviewCards: initial.reviewCards.slice(),
    current: null,
    studiedIds: [],
    cardsById: new Map(),
  };
  for (const card of [...state.newCards, ...state.learningCards, ...state.reviewCards]) {
    if (card?.id != null) state.cardsById.set(card.id, card);
  }

  function popRandomNewOrReview() {
    if (state.newCards.length === 0) {
      return { card: state.reviewCards.shift() || null, queue: 'review' };
    }
    if (state.reviewCards.length === 0) {
      return { card: state.newCards.shift() || null, queue: 'new' };
    }
    const total = state.newCards.length + state.reviewCards.length;
    const newPct = state.newCards.length / total;
    if (Math.random() <= newPct) {
      return { card: state.newCards.shift(), queue: 'new' };
    }
    return { card: state.reviewCards.shift(), queue: 'review' };
  }

  return {
    remaining() {
      return state.newCards.length + state.learningCards.length + state.reviewCards.length;
    },
    uniqueStudiedCount() {
      return new Set(state.studiedIds).size;
    },
    pop() {
      const firstLearning = state.learningCards[0];
      if (firstLearning && dueTime(firstLearning) <= Date.now()) {
        const card = state.learningCards.shift();
        state.current = { card, queue: 'learning' };
        if (card?.id != null) state.cardsById.set(card.id, card);
        return card;
      }
      const mixed = popRandomNewOrReview();
      if (mixed.card) {
        state.current = mixed;
        state.cardsById.set(mixed.card.id, mixed.card);
        return mixed.card;
      }
      const leftover = state.learningCards.shift() || null;
      state.current = leftover ? { card: leftover, queue: 'learning' } : null;
      if (leftover?.id != null) state.cardsById.set(leftover.id, leftover);
      return leftover;
    },
    afterAnswer(_oldCard, updatedCard) {
      if (updatedCard?.id != null) {
        state.studiedIds.push(updatedCard.id);
        state.cardsById.set(updatedCard.id, updatedCard);
      }
      if (updatedCard.suspended) return;
      if (!isSameAnkiDay(updatedCard.dueDate || new Date(), new Date())) return;
      if (updatedCard.state === STATES.LEARNING || updatedCard.state === STATES.RELEARNING) {
        state.learningCards.push(updatedCard);
        state.learningCards.sort((a, b) => dueTime(a) - dueTime(b));
      } else if (updatedCard.state === STATES.REVIEW) {
        state.reviewCards.push(updatedCard);
      }
    },
    recordCard(card) {
      if (card?.id != null) state.cardsById.set(card.id, card);
    },
    cardById(id) {
      return state.cardsById.get(id) || null;
    },
    cardStudiedBefore(cardId) {
      const ids = state.studiedIds;
      const index = ids.indexOf(cardId);
      if (index === -1) return ids[ids.length - 1] || null;
      if (index === 0) return null;
      return ids[index - 1];
    },
    restoreLastPopped() {
      if (!state.current) return;
      const { card, queue } = state.current;
      if (queue === 'new') state.newCards.unshift(card);
      else if (queue === 'learning') state.learningCards.unshift(card);
      else state.reviewCards.unshift(card);
      state.current = null;
    },
  };
}
