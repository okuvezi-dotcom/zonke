// The back-door check. Questions are in the page (built from src/check-data.mjs); this script keeps
// the risk card in step with the answers, builds the WhatsApp message, and remembers the answers in
// this browser only. Nothing is sent anywhere until the person taps WhatsApp or email.
(() => {
  const DATA = window.CHECK;
  const form = document.getElementById('quiz');
  const card = document.getElementById('riskcard');
  if (!DATA || !form || !card) return;
  const KEY = 'zonke-check-v1';
  const ICONS = {};
  document.querySelectorAll('[data-icon-src]').forEach((t) => { ICONS[t.dataset.iconSrc] = t.innerHTML; });
  const rank = { ok: 0, na: 0, gap: 1, risk: 2 };
  const total = DATA.groups.reduce((n, g) => n + g.qs.length, 0);

  const answers = () => Object.fromEntries(new FormData(form).entries());
  const save = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* private window: fine */ } };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  function apply(a) {
    form.querySelectorAll('input[type=radio]').forEach((r) => { r.checked = a[r.name] === r.value; });
    for (const id of ['biz', 'area']) { const el = document.getElementById(id); if (el && a[id] != null) el.value = a[id]; }
  }

  function evaluate(a) {
    let risks = 0, gaps = 0, answered = 0;
    const lines = DATA.groups.map((g) => {
      let level = null; const fixes = [];
      for (const q of g.qs) {
        const v = a[q.id];
        if (v == null) continue;
        answered++;
        const lv = (q.opts.find(([label]) => label === v) || [])[1];
        if (!lv) continue;
        if (level == null || rank[lv] > rank[level]) level = lv;
        if (lv === 'gap' || lv === 'risk') fixes.push({ lv, fix: q.fix, answer: v, q: q.q });
      }
      fixes.forEach((f) => (f.lv === 'risk' ? risks++ : gaps++));
      return { g, level, fixes };
    });
    return { lines, risks, gaps, answered };
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const chip = (lv) => lv == null ? '<span class="chip">Not answered</span>'
    : lv === 'risk' ? `<span class="chip chip--over">${ICONS.alert}Flag</span>`
    : lv === 'gap' ? `<span class="chip chip--due">${ICONS.alert}Gap</span>`
    : `<span class="chip chip--ok">${ICONS.check}Ready</span>`;

  function message(r, a) {
    const who = [a.biz && a.biz.trim(), a.area && a.area.trim()].filter(Boolean).join(', ');
    const lines = r.lines.filter((l) => l.fixes.length).map((l) => `- ${l.g.name}: ${l.fixes.map((f) => f.answer.toLowerCase()).join('; ')}`);
    return `Hi Zonke, I did the back-door check${who ? ` for ${who}` : ''}. ` +
      (lines.length ? `It found ${r.risks} thing${r.risks === 1 ? '' : 's'} an inspector would flag and ${r.gaps} gap${r.gaps === 1 ? '' : 's'}:\n${lines.join('\n')}\n` : 'Everything came back ready. ') +
      'Please book a free site survey.';
  }

  function render() {
    const a = answers();
    for (const id of ['biz', 'area']) { const el = document.getElementById(id); if (el) a[id] = el.value; }
    save(a);
    const r = evaluate(a);
    const verdict = r.answered === 0 ? 'Not started'
      : r.risks ? `${r.risks} to flag` : r.gaps ? `${r.gaps} gap${r.gaps === 1 ? '' : 's'}` : r.answered < total ? 'So far, so good' : 'Ready';
    const sub = r.answered === 0 ? 'Answer the questions and this card fills in as you go.'
      : r.risks ? 'Things an inspector would write up if they walked in tomorrow.'
      : r.gaps ? 'Nothing an inspector would flag today, but these will become problems.'
      : r.answered < total ? 'Keep going.' : 'Your kitchen would pass on all five lines. Keep the paperwork coming.';
    card.querySelector('[data-verdict]').textContent = verdict;
    card.querySelector('[data-sub]').textContent = sub;
    card.querySelector('[data-progress]').textContent = `${r.answered} of ${total} answered`;
    card.querySelector('[data-lines]').innerHTML = r.lines.map((l) => `<li>${ICONS[l.g.icon]}<div><strong>${esc(l.g.name)}</strong>${l.fixes.length ? `<ul>${l.fixes.map((f) => `<li>${esc(f.fix)}</li>`).join('')}</ul>` : ''}</div>${chip(l.level)}</li>`).join('');
    const text = message(r, a);
    card.querySelector('[data-wa]').href = `https://wa.me/${window.ZONKE.whatsapp}?text=${encodeURIComponent(text)}`;
    card.querySelector('[data-mail]').href = `mailto:${window.ZONKE.email}?subject=${encodeURIComponent('Back-door check: please book a site survey')}&body=${encodeURIComponent(text)}`;
    card.dataset.state = r.risks ? 'risk' : r.gaps ? 'gap' : r.answered ? 'ok' : 'empty';
  }

  form.addEventListener('change', render);
  form.addEventListener('input', (e) => { if (e.target.matches('input[type=text]')) render(); });
  document.getElementById('example')?.addEventListener('click', () => { apply(DATA.example); render(); card.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  document.getElementById('reset')?.addEventListener('click', () => { apply({}); form.querySelectorAll('input[type=text]').forEach((i) => { i.value = ''; }); render(); });
  document.getElementById('print')?.addEventListener('click', () => window.print());
  apply(load());
  render();
})();
