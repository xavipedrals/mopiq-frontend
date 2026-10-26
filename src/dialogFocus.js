// Shared by the release's modal dialogs: keep keyboard focus within the dialog
// and restore the invoking control when it closes.
export const dialogFocus = {
  mounted(element) {
    const previous = document.activeElement;
    const controls = () => [...element.querySelectorAll('section button, section input, section select, section textarea, section a[href]')]
      .filter(control => !control.disabled && control.offsetParent !== null);
    const onKey = event => {
      if (event.key !== 'Tab') return;
      const list = controls();
      const first = list[0], last = list.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    element.addEventListener('keydown', onKey);
    requestAnimationFrame(() => { if (element.isConnected) controls()[0]?.focus(); });
    element.__disposeFocus = () => {
      element.removeEventListener('keydown', onKey);
      if (previous?.isConnected) previous.focus();
    };
  },
  unmounted(element) { element.__disposeFocus?.(); },
};
