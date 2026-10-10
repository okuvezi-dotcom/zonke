// The survey form. It turns the answers into a message and opens WhatsApp or the email app with it
// filled in; the person still presses send. If zonke.config.mjs sets formEndpoint, the form also
// posts there.
(() => {
  const form = document.getElementById('survey-form');
  if (!form || !window.ZONKE) return;
  const status = document.getElementById('f-status');
  let via = 'wa';
  form.querySelectorAll('[data-via]').forEach((b) => b.addEventListener('click', () => { via = b.dataset.via; }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const missing = [...form.querySelectorAll('[required]')].filter((el) => !el.value.trim());
    form.querySelectorAll('[required]').forEach((el) => el.setAttribute('aria-invalid', String(!el.value.trim())));
    if (missing.length) {
      status.hidden = false;
      status.textContent = `Please fill in: ${missing.map((el) => form.querySelector(`label[for="${el.id}"]`).textContent.toLowerCase()).join(', ')}.`;
      missing[0].focus();
      return;
    }
    const d = new FormData(form);
    const lines = d.getAll('lines');
    const text = [
      `Hi Zonke, I'd like a free site survey.`,
      `Name: ${d.get('name')}`,
      `Business: ${d.get('business')} (${d.get('type')})`,
      `Area: ${d.get('area')}`,
      `Cell: ${d.get('phone')}`,
      `Lines: ${lines.length ? lines.join(', ') : 'not sure yet'}`,
      d.get('message').trim() ? `Note: ${d.get('message').trim()}` : '',
    ].filter(Boolean).join('\n');

    if (window.ZONKE.formEndpoint) {
      try { await fetch(window.ZONKE.formEndpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: d }); } catch { /* WhatsApp/email still go */ }
    }
    status.hidden = false;
    status.textContent = via === 'wa' ? 'Opening WhatsApp with your message. Press send there.' : 'Opening your email app with your message. Press send there.';
    location.href = via === 'wa'
      ? `https://wa.me/${window.ZONKE.whatsapp}?text=${encodeURIComponent(text)}`
      : `mailto:${window.ZONKE.email}?subject=${encodeURIComponent(`Site survey: ${d.get('business')}`)}&body=${encodeURIComponent(text)}`;
  });
})();
