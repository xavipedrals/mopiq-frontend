(() => {
  function showSide(card, flipped) {
    card.toggleAttribute('data-flipped', flipped);
    card.querySelector('.mfx-face--front').setAttribute('aria-hidden', String(flipped));
    card.querySelector('.mfx-face--back').setAttribute('aria-hidden', String(!flipped));
    const button = card.querySelector('.mfx-toggle');
    const action = flipped ? 'Show question' : 'Show answer';
    button.textContent = action;
    button.setAttribute('aria-label', `${action}: ${card.dataset.label}`);
    const answer = card.querySelector('.mfx-face--back');
    const title = answer.querySelector('.mfx-title');
    const answerText = [
      title.querySelector('math')?.getAttribute('aria-label') ?? title.textContent,
      answer.querySelector('.mfx-note')?.textContent,
    ].filter(Boolean).join(' — ');
    card.querySelector('.mfx-announcement').textContent = flipped ? `Answer: ${answerText}` : '';
  }

  function setCardLayout(card, layout) {
    const flip = layout === 'flip' && Boolean(card.querySelector('.mfx-toggle'));
    card.toggleAttribute('data-mfx-ready', flip);
    const footer = card.querySelector('.mfx-card-footer');
    if (footer) footer.hidden = !flip;
    if (flip) {
      showSide(card, false);
      return;
    }
    card.removeAttribute('data-flipped');
    card.querySelectorAll('.mfx-face').forEach((face) => face.removeAttribute('aria-hidden'));
    const announcement = card.querySelector('.mfx-announcement');
    if (announcement) announcement.textContent = '';
  }

  document.querySelectorAll('.mfx-card').forEach((card) => {
    const button = card.querySelector('.mfx-toggle');
    if (!button) return;
    if (!card.closest('.mfx-gallery')) setCardLayout(card, card.dataset.layout ?? 'flip');
    card.addEventListener('click', (event) => {
      if (!card.hasAttribute('data-mfx-ready')) return;
      if (event.target !== button && (event.target.closest('.mfx-audio') || window.getSelection()?.toString())) return;
      showSide(card, !card.hasAttribute('data-flipped'));
    });
  });

  document.querySelectorAll('.mfx-gallery').forEach((gallery) => {
    const cards = [...gallery.querySelectorAll('.mfx-card')];
    const count = gallery.querySelector('.mfx-count');
    count.textContent = `${cards.length} cards`;
    const filters = [...gallery.querySelectorAll('[data-mfx-filter]')];
    const layouts = [...gallery.querySelectorAll('[data-mfx-layout]')];
    const reset = gallery.querySelector('.mfx-reset');
    const themeButton = gallery.querySelector('.mfx-theme');
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    let selectedTheme;

    function theme(mode) {
      gallery.dataset.mfxTheme = mode;
      const other = mode === 'dark' ? 'Light' : 'Dark';
      themeButton.querySelector('span').textContent = other;
      themeButton.setAttribute('aria-label', `Switch to ${other.toLowerCase()} mode`);
    }

    theme(scheme.matches ? 'dark' : 'light');
    scheme.addEventListener('change', (event) => {
      if (!selectedTheme) theme(event.matches ? 'dark' : 'light');
    });
    themeButton.hidden = false;
    themeButton.addEventListener('click', () => {
      selectedTheme = gallery.dataset.mfxTheme === 'dark' ? 'light' : 'dark';
      theme(selectedTheme);
    });

    gallery.querySelector('.mfx-controls').hidden = false;
    function setLayout(layout) {
      layouts.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mfxLayout === layout)));
      cards.forEach((card) => setCardLayout(card, layout));
      reset.hidden = layout === 'flat';
    }
    const initialLayout = new URLSearchParams(window.location.search).get('layout');
    setLayout(initialLayout === 'flat' ? 'flat' : 'flip');
    layouts.forEach((button) => button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      setLayout(button.dataset.mfxLayout);
    }));
    filters.forEach((filter) => {
      filter.addEventListener('click', () => {
        filters.forEach((button) => button.setAttribute('aria-pressed', String(button === filter)));
        const category = filter.dataset.mfxFilter;
        let shown = 0;
        cards.forEach((card) => {
          card.hidden = category !== 'all' && category !== card.dataset.category;
          if (!card.hidden) shown += 1;
        });
        count.textContent = `${shown} of ${cards.length} cards`;
      });
    });
    reset.addEventListener('click', () => {
      cards.filter((card) => card.hasAttribute('data-flipped')).forEach((card) => showSide(card, false));
    });
  });
})();
