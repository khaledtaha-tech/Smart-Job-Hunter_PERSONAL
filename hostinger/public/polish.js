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

    document.querySelectorAll('.search-config .custom-entry input').forEach((input) => {
      if (input instanceof HTMLInputElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  };

  const ensureResetButton = () => {
    const heading = document.querySelector('.content .page-heading');
    if (!(heading instanceof HTMLElement)) return;

    const title = heading.querySelector('h1')?.textContent?.trim() || '';
    const isSearchPage = title === 'Job Search' || title.includes('البحث عن وظائف');
    if (!isSearchPage) return;

    if (heading.querySelector('.sjh-reset-search')) return;

    const existingAction = Array.from(heading.children).find((child, index) => index > 0 && child.querySelector?.('button'));
    if (!(existingAction instanceof HTMLElement)) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'sjh-search-heading-actions';
    existingAction.parentElement?.insertBefore(wrapper, existingAction);
    wrapper.appendChild(existingAction);

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'sjh-reset-search';
    resetButton.innerHTML = '<span aria-hidden="true">↺</span><span></span>';
    const label = resetButton.querySelector('span:last-child');
    if (label) label.textContent = document.documentElement.dir === 'rtl' || document.querySelector('.app-shell.rtl') ? 'إعادة ضبط البحث' : 'Reset Search';
    resetButton.addEventListener('click', resetSearch);

    wrapper.insertBefore(resetButton, existingAction);
  };

  const observer = new MutationObserver(() => ensureResetButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('DOMContentLoaded', ensureResetButton);
  setTimeout(ensureResetButton, 250);
})();
