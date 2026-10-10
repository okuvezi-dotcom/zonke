// Rate a visit. The link comes in the WhatsApp message after a visit (rate.html#<visit token>) and
// only works with the platform switched on. A 4 or 5 gets the Google review link if the platform
// returns one; a 1 to 3 goes to the account manager, who calls.
(() => {
  const form = document.getElementById('rate');
  const Z = window.ZONKE;
  if (!form || !Z) return;
  const status = document.getElementById('rate-status');
  const submit = form.querySelector('[data-submit]');
  const token = decodeURIComponent(location.hash.slice(1));
  const say = (m) => { status.hidden = false; status.textContent = m; };
  const off = () => { form.querySelector('[data-body]').hidden = true; submit.hidden = true; };
  const fmt = (iso) => { const d = new Date(`${iso}T12:00:00Z`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };

  if (!Z.apiUrl || !token) {
    off();
    form.dataset.state = 'nolink';
    say('This page works from the link in the message we send after a visit. Got feedback anyway? WhatsApp your account manager.');
    return;
  }
  const url = `${Z.apiUrl}/api/public/feedback/${encodeURIComponent(token)}`;

  (async () => {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(r.status);
      const v = await r.json();
      form.querySelector('[data-site]').textContent = v.site;
      form.querySelector('[data-date]').textContent = `Visit on ${fmt(v.date)}`;
      if (v.rated) { off(); form.dataset.state = 'rated'; say('You have already rated this visit. Thank you.'); }
    } catch {
      off();
      form.dataset.state = 'notfound';
      say("We couldn't find this visit. The link may have expired: WhatsApp your account manager instead.");
    }
  })();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const score = Number(form.querySelector('input[name="score"]:checked')?.value || 0);
    if (!score) { say('Please choose a score from 1 to 5.'); return; }
    submit.disabled = true;
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ score, comment: form.elements.namedItem('comment').value.trim() }) });
      if (!r.ok) throw new Error(r.status);
      const res = await r.json();
      off();
      form.dataset.state = 'done';
      if (score >= 4 && res.review) {
        say('Thank you. Would you say so on Google? It helps other kitchens find us.');
        const a = form.querySelector('[data-review]');
        a.href = res.review; a.hidden = false;
      } else if (score <= 3) {
        say('Thank you for telling us. Your account manager will call you to put it right.');
      } else {
        say('Thank you. See you at the next visit.');
      }
    } catch {
      say("We couldn't send that just now. Please try again, or WhatsApp your account manager.");
      submit.disabled = false;
    }
  });
})();
