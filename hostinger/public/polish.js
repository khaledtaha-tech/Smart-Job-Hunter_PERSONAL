(() => {
  const resetSearch = () => {
    document.querySelectorAll('.search-config .chip-grid button.selected').forEach((button) => {
      if (button instanceof HTMLButtonElement) button.click();
    });
    document.querySelectorAll('.search-summary .source-list button.selected').forEach((button) => {
      if (button instanceof HTMLButtonElement && !button.classList.contains('locked')) button.click();
    });
    const periodSelect = document.querySelector('.search-summary select');
    if (periodSelect instanceof HTMLSelectElement) {
      periodSelect.value = 'all';
      periodSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const ensureResetButton = () => {
    const heading = document.querySelector('.content .page-heading');
    if (!(heading instanceof HTMLElement)) return;
    const title = heading.querySelector('h1')?.textContent?.trim() || '';
    const isSearchPage = title === 'Job Search' || title.includes('\u0627\u0644\u0628\u062d\u062b \u0639\u0646 \u0648\u0638\u0627\u0626\u0641');
    if (!isSearchPage || heading.querySelector('.sjh-reset-search')) return;

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'sjh-reset-search';
    resetButton.textContent = document.querySelector('.app-shell.rtl') ? '\u0625\u0639\u0627\u062f\u0629 \u0636\u0628\u0637 \u0627\u0644\u0628\u062d\u062b' : 'Reset Search';
    resetButton.addEventListener('click', resetSearch);

    const existingButton = heading.querySelector('button');
    if (existingButton) {
      let actions = heading.querySelector('.sjh-search-heading-actions');
      if (!(actions instanceof HTMLElement)) {
        actions = document.createElement('div');
        actions.className = 'sjh-search-heading-actions';
        existingButton.parentElement?.insertBefore(actions, existingButton);
        actions.appendChild(existingButton);
      }
      actions.insertBefore(resetButton, actions.firstChild);
    } else {
      heading.appendChild(resetButton);
    }
  };

  const observer = new MutationObserver(ensureResetButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', ensureResetButton);
  setInterval(ensureResetButton, 700);
})();
