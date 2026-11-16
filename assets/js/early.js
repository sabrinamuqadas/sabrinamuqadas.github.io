/*
 * Runs before first paint (classic, render-blocking, intentionally tiny):
 *  - applies the saved or system colour theme to avoid a flash of the wrong theme
 *  - flags that JavaScript is available so progressive-enhancement styles can apply
 *  - failsafe: if the main script has not initialised within 3s, reveal all content
 * The storage key must match CONFIG.theme.storageKey in config.js.
 */
(function () {
  var root = document.documentElement;
  var theme = 'dark';

  try {
    var saved = localStorage.getItem('sm-theme');
    if (saved === 'light' || saved === 'dark') {
      theme = saved;
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
  } catch (error) {
    /* Storage can be blocked; fall back to the dark identity theme. */
  }

  root.setAttribute('data-theme', theme);
  root.classList.add('js');

  window.setTimeout(function () {
    if (!root.classList.contains('is-ready')) {
      root.classList.add('no-anim');
    }
  }, 3000);
})();
