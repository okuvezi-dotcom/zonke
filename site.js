// Print buttons (staff talks), and the mobile menu. Everything else on the site works without script.
document.addEventListener('click', (e) => { if (e.target.closest('[data-print]')) window.print(); });
(() => {
  const btn = document.querySelector('.menu-btn');
  const nav = document.getElementById('nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Close' : 'Menu';
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Menu'; } });
})();
