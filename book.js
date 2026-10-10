// Survey booking. Shows the next weekday slots (survey.js, the same rules the platform uses) and
// either posts the booking to the platform (when zonke.config.mjs sets apiUrl) or opens WhatsApp with
// the request filled in. Either way a person confirms the slot: the page never promises it.
(() => {
  const form = document.getElementById('book-form');
  const Z = window.ZONKE, S = window.SURVEY;
  if (!form || !Z || !S) return;
  const box = form.querySelector('[data-slots]');
  const status = document.getElementById('b-status');
  const submit = form.querySelector('[data-submit]');
  let api = Z.apiUrl || '';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const say = (msg) => { status.hidden = false; status.textContent = msg; };

  function render(slots) {
    if (!slots.length) { box.innerHTML = '<p class="note">No free slots in the next two weeks. WhatsApp us and we will find a time.</p>'; return; }
    const days = new Map();
    for (const s of slots) { const d = s.start.slice(0, 10); if (!days.has(d)) days.set(d, []); days.get(d).push(s); }
    box.innerHTML = [...days.entries()].map(([d, list]) => {
      const head = S.slotLabel(list[0].start).split(',')[0];
      return `<div class="slots__day" role="radiogroup" aria-label="${esc(head)}"><span class="slots__date">${esc(head)}</span><div class="opts">${list.map((s) => `<label><input type="radio" name="slot" value="${esc(s.start)}"><span>${esc(s.start.slice(11, 16))}</span></label>`).join('')}</div></div>`;
    }).join('');
  }

  function useWhatsApp(reason) {
    api = '';
    submit.querySelector('span').textContent = 'Request this slot on WhatsApp';
    form.querySelector('[data-mode-note]').innerHTML = 'Your request opens in WhatsApp, ready to send. See our <a href="privacy.html">privacy notice</a>.';
    if (reason) say(reason);
  }

  async function load() {
    const local = S.surveySlots({ slots: Z.survey?.slots, days: Z.survey?.days });
    if (!api) { useWhatsApp(); render(local); return; }
    submit.querySelector('span').textContent = 'Request this slot';
    form.querySelector('[data-mode-note]').innerHTML = 'Your request goes to Zonke and we confirm it on WhatsApp. See our <a href="privacy.html">privacy notice</a>.';
    try {
      const r = await fetch(`${api}/api/public/availability`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(r.status);
      render((await r.json()).slots || []);
    } catch {
      useWhatsApp('Our booking system is not answering right now, so your request will go by WhatsApp instead.');
      render(local);
    }
  }

  function details() {
    const d = new FormData(form);
    return {
      name: (d.get('name') || '').trim(), business: (d.get('business') || '').trim(), phone: (d.get('phone') || '').trim(),
      area: (d.get('area') || '').trim(), type: d.get('type'), lines: d.getAll('lines'), message: (d.get('message') || '').trim(),
      slot: d.get('slot'), source: 'book',
    };
  }

  function text(b) {
    return [
      "Hi Zonke, I'd like a free site survey.",
      `Preferred slot: ${S.slotLabel(b.slot)} (please confirm)`,
      `Name: ${b.name}`,
      `Business: ${b.business} (${b.type})`,
      `Area: ${b.area}`,
      `Cell: ${b.phone}`,
      `Lines: ${b.lines.length ? b.lines.join(', ') : 'not sure yet'}`,
      b.message ? `Note: ${b.message}` : '',
    ].filter(Boolean).join('\n');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const req = [...form.querySelectorAll('[required]')];
    req.forEach((el) => el.setAttribute('aria-invalid', String(!el.value.trim())));
    const missing = req.filter((el) => !el.value.trim()).map((el) => form.querySelector(`label[for="${el.id}"]`).textContent.toLowerCase());
    const b = details();
    if (!b.slot) missing.unshift('a slot');
    if (missing.length) { say(`Please choose or fill in: ${missing.join(', ')}.`); (b.slot ? req.find((el) => !el.value.trim()) : box.querySelector('input'))?.focus(); return; }
    if (!api) {
      say('Opening WhatsApp with your request. Press send there.');
      location.href = `https://wa.me/${Z.whatsapp}?text=${encodeURIComponent(text(b))}`;
      return;
    }
    submit.disabled = true;
    say('Sending…');
    try {
      const r = await fetch(`${api}/api/public/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(b) });
      if (r.status === 409) { say('Someone just took that slot. Please pick another.'); await load(); return; }
      if (!r.ok) throw new Error(r.status);
      const res = await r.json();
      form.querySelectorAll('fieldset').forEach((f) => { f.disabled = true; });
      submit.hidden = true;
      say(`Booking ${res.ref} requested for ${S.slotLabel(res.slot || b.slot)}. We confirm it with you: expect ${Z.sla || 'a reply on WhatsApp within 2 working hours'}.`);
      status.dataset.done = res.ref;
    } catch {
      say("We couldn't send that just now. Tap the button again to send it by WhatsApp instead.");
      useWhatsApp();
    } finally { submit.disabled = false; }
  });

  load();
})();
