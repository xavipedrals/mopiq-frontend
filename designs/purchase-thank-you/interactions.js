const toggle = document.querySelector('.theme-toggle');
function syncThemeLabel() { toggle.setAttribute('aria-label', `Switch to ${document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'} mode`); }
syncThemeLabel();
toggle.addEventListener('click', () => { const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; const url = new URL(location.href); url.searchParams.set('theme', theme); history.replaceState(null, '', url); syncThemeLabel(); });
