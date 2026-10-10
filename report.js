// Report a sighting. Triage runs in the browser with the same rules the platform uses
// (src/pests.mjs, copied to pests-data.js), so the promise on the card is the one the team keeps.
// With apiUrl set the report and a shrunk photo go to the platform; without it, WhatsApp opens with
// the report filled in and the person sends the photo in the same chat.
(() => {
  const form = document.getElementById('report');
  const card = document.getElementById('triage');
  const Z = window.ZONKE, P = window.PESTDATA;
  if (!form || !card || !Z || !P) return;
  const status = document.getElementById('r-status');
  const submit = card.querySelector('[data-submit]');
  const api = Z.apiUrl || '';
  const say = (m) => { status.hidden = false; status.textContent = m; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const name = (list, key) => list.find((x) => x.key === key)?.name;
  const field = (n) => form.elements.namedItem(n); // not form.name: that is the form's own name attribute
  const WHEN = { today: 'Today', yesterday: 'Yesterday', week: 'This week', longer: 'Longer ago' };

  // The site code comes from the back-door tag's QR (report.html#<token>) when there is one.
  const fromTag = decodeURIComponent(location.hash.slice(1));
  if (fromTag) { field('site').value = fromTag; form.querySelector('[data-site-note]').hidden = false; }

  if (api) {
    form.querySelector('[data-photo]').hidden = false;
    submit.querySelector('span').textContent = 'Send report';
    card.querySelector('[data-mode-note]').innerHTML = 'Your report goes straight to the Zonke team, who call you to confirm. See our <a href="privacy.html">privacy notice</a>.';
  }

  const value = (n) => form.querySelector(`input[name="${n}"]:checked`)?.value || '';
  const data = () => ({
    site: field('site').value.trim(), pest: value('pest'), place: value('place'), count: value('count'), when: value('when'),
    name: field('name').value.trim(), phone: field('phone').value.trim(), note: field('note').value.trim(),
  });

  function render() {
    const d = data();
    const pest = P.PESTS.find((p) => p.key === d.pest);
    form.querySelector('[data-signs]').textContent = pest ? `Signs: ${pest.signs}.` : '';
    if (!d.pest || !d.place) {
      card.dataset.state = 'empty';
      card.querySelector('[data-priority]').textContent = 'Tell us what you saw';
      card.querySelector('[data-promise]').textContent = 'Pick what you saw and where, and this card says how fast a crew comes.';
    } else {
      const pr = P.triage(d);
      card.dataset.state = pr;
      card.querySelector('[data-priority]').textContent = P.PRIORITY[pr].label;
      card.querySelector('[data-promise]').textContent = P.PRIORITY[pr].promise;
    }
    const rows = [['What', name(P.PESTS, d.pest)], ['Where', name(P.PLACES, d.place)], ['How many', name(P.COUNTS, d.count)], ['When', WHEN[d.when]]];
    card.querySelector('[data-summary]').innerHTML = rows.map(([k, v]) => `<li><span>${k}</span><b>${v ? esc(v) : '<small>not answered</small>'}</b></li>`).join('');
  }

  function text(d, pr) {
    return [
      "Hi Zonke, I'm reporting a sighting.",
      `Site: ${d.site}`,
      `What: ${name(P.PESTS, d.pest)}${d.count ? ` (${name(P.COUNTS, d.count).toLowerCase()})` : ''}`,
      `Where: ${name(P.PLACES, d.place)}`,
      d.when ? `When: ${WHEN[d.when]}` : '',
      `Name: ${d.name}, cell ${d.phone}`,
      d.note ? `Note: ${d.note}` : '',
      `Your page says: ${P.PRIORITY[pr].label}. I'll send the photo in this chat.`,
    ].filter(Boolean).join('\n');
  }

  /** Shrink a photo to at most 1600 px on its long side, as a JPEG. */
  async function shrink(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
    } finally { URL.revokeObjectURL(url); }
  }

  form.addEventListener('change', render);
  form.addEventListener('input', render);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = data();
    const missing = [];
    if (!d.pest) missing.push('what you saw');
    if (!d.place) missing.push('where');
    for (const el of form.querySelectorAll('[required]')) {
      el.setAttribute('aria-invalid', String(!el.value.trim()));
      if (!el.value.trim()) missing.push(form.querySelector(`label[for="${el.id}"]`).textContent.toLowerCase());
    }
    if (missing.length) { say(`Please tell us: ${missing.join(', ')}.`); return; }
    const pr = P.triage(d);
    if (!api) {
      say('Opening WhatsApp with your report. Press send there, then send the photo.');
      location.href = `https://wa.me/${Z.whatsapp}?text=${encodeURIComponent(text(d, pr))}`;
      return;
    }
    submit.disabled = true;
    say('Sending…');
    try {
      const r = await fetch(`${api}/api/public/sightings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) });
      if (!r.ok) throw new Error(r.status);
      const res = await r.json();
      const file = field('photo').files?.[0];
      let photoNote = '';
      if (file && res.photoUrl) {
        try {
          const blob = await shrink(file);
          const up = await fetch(new URL(res.photoUrl, `${api}/`).href, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
          if (!up.ok) throw new Error(up.status);
          photoNote = ' Photo received.';
        } catch { photoNote = ' The photo did not go through: please send it on WhatsApp.'; }
      }
      const p = P.PRIORITY[res.priority] ?? P.PRIORITY[pr];
      card.dataset.state = res.priority || pr;
      card.querySelector('[data-priority]').textContent = p.label;
      card.querySelector('[data-promise]').textContent = p.promise;
      form.querySelectorAll('input, textarea').forEach((el) => { el.disabled = true; });
      submit.hidden = true;
      say(`Report ${res.ref} received.${photoNote} We call you to confirm.`);
      status.dataset.done = res.ref;
    } catch {
      status.hidden = false;
      status.innerHTML = `We couldn't send that just now. <a href="https://wa.me/${Z.whatsapp}?text=${encodeURIComponent(text(d, pr))}">Send it on WhatsApp instead</a>.`;
      submit.disabled = false;
    }
  });
  render();
})();
