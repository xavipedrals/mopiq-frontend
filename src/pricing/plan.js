function priceId(envName, liveId) {
  const value = import.meta.env[envName];
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return liveId;
}

export const plan = {
  name: 'Mopiq Flashcards Pro',
  description: 'Unlock unlimited flashcards, cards and decks',
  features: [
    'Unlimited daily study',
    'Unlimited cards and decks',
    'Deck export',
  ],
  priceId: {
    month: priceId('VITE_PADDLE_PRICE_MONTH', 'pri_01m37pez7geefm52tky08v6m34'),
    year: priceId('VITE_PADDLE_PRICE_YEAR', 'pri_01m37pezehd3m60ym8k4970hpd'),
  },
};
