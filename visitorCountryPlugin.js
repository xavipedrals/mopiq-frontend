import { countryFromHeaders } from './src/pricing/visitorCountry.js';

export function visitorCountryPlugin() {
  const handle = (req, res, next) => {
    const path = (req.url || '').split('?')[0];
    if (path !== '/api/visitor-country') {
      next();
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ country: countryFromHeaders(req.headers) }));
  };
  return {
    name: 'visitor-country',
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}
