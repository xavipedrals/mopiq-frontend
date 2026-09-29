export function readPaddleConfig() {
  const environment = import.meta.env.VITE_PADDLE_ENV;
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  if (environment !== 'sandbox' && environment !== 'production') {
    throw new Error('VITE_PADDLE_ENV must be set to "sandbox" or "production".');
  }
  if (typeof token !== 'string' || token.trim() === '') {
    throw new Error('VITE_PADDLE_CLIENT_TOKEN is not set.');
  }
  if (environment === 'production' && !token.startsWith('live_')) {
    throw new Error('VITE_PADDLE_CLIENT_TOKEN must be a live_ token when VITE_PADDLE_ENV is production.');
  }
  if (environment === 'sandbox' && !token.startsWith('test_')) {
    throw new Error('VITE_PADDLE_CLIENT_TOKEN must be a test_ token when VITE_PADDLE_ENV is sandbox.');
  }
  return { environment, token };
}
