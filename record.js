// The Door Record. Two modes:
// - Example (the home page teaser, and record.html with no platform or with the demo site's hash):
//   dates are worked out from today, so the example always reads the way a well-kept site would.
// - Live (record.html#<token> with apiUrl set in zonke.config.mjs): the site's real record from the
//   platform, drawn into the same markup. The token comes from the QR on that site's back-door tag.
(() => {
  const days = { mo: 30, fn: 14, qt: 91 };            // service cycle per line
  const ago = { pest: 9, clean: 9, washroom: 5, grease: 9, air: 40 }; // days since the last visit
  const fmt = (d) => d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
  const long = (d) => d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const shift = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const Z = window.ZONKE || {};
  const page = document.querySelector('[data-missing]') ? document : null; // record.html only
  const token = decodeURIComponent(location.hash.slice(1));
  const live = page && Z.apiUrl && token && token !== Z.demoSite;

  function example() {
    document.querySelectorAll('[data-record]').forEach((rec) => {
      rec.querySelectorAll('[data-line]').forEach((li) => {
        const k = li.dataset.line, cyc = days[li.dataset.cycle] ?? 30;
        const last = shift(-ago[k]), next = shift(cyc - ago[k]);
        const el = li.querySelector('[data-last]');
        if (el) el.textContent = `Last ${fmt(last)} · next ${fmt(next)}`;
      });
    });
    if (!page) return;
    const rows = (sel, list) => { const el = document.querySelector(sel); if (el) el.innerHTML = list.map(([n, t, when]) => `<li><time>${when ?? long(shift(-n))}</time><span>${t}</span></li>`).join(''); };
    rows('[data-visits]', [
      [5, 'Washroom: 6 bins exchanged, dispensers filled. Signed: night manager.'],
      [9, 'Pest, clean (zone 3: cold room and walls), grease (pumped 1,800 L), canopy filters.'],
      [19, 'Washroom: 6 bins exchanged. Grease level 40%, no pump-out needed.'],
      [26, 'Call-out: two cockroaches reported at the dish station. Gel bait applied, re-checked after 7 days: clear.'],
      [33, 'Washroom. Pest monitor check: no activity.'],
      [40, 'Pest, clean (zone 2: hot line), grease (pumped 1,650 L), quarterly aircon service: 3 split units.'],
    ]);
    rows('[data-access]', [
      [5, 'In 23:05 · out 00:10. Two technicians, signed in by the night manager.'],
      [9, 'In 22:41 · out 04:26. Three technicians, in from the key safe. Tag punched, door locked, key returned.'],
      [19, 'In 22:58 · out 00:02. Two technicians, signed in by the night manager.'],
      [26, 'In 22:35 · out 23:20. One technician, call-out, signed in by the night manager.'],
    ]);
    rows('[data-training]', [
      [9, 'Checking every delivery for pests · 7 staff signed'],
      [40, 'Close down so pests find nothing · 6 staff signed'],
    ]);
    document.querySelectorAll('[data-ago]').forEach((el) => { el.textContent = long(shift(-Number(el.dataset.ago))); });
    const rep = document.querySelector('[data-report]');
    if (rep) rep.href = `report.html#${encodeURIComponent(Z.demoSite || 'GP-0001')}`;
  }

  // ---------------------------------------------------------------- live
  const ICON = {};
  document.querySelectorAll('[data-icon-src]').forEach((t) => { ICON[t.dataset.iconSrc] = t.innerHTML; });
  const CHIP = { current: ['chip--ok', 'check', 'Current'], due: ['chip--due', 'alert', 'Due'], overdue: ['chip--over', 'alert', 'Overdue'] };
  const VERDICT = { current: ['', 'check', 'All five lines current'], due: ['is-due', 'alert', 'A line is due this week'], overdue: ['is-over', 'alert', 'A line is overdue'] };
  const REG = { pco: 'Pest control operator (Act 36)', sapca: 'SAPCA', saqcc: 'Refrigerant work (SAQCC Gas)', carrier: 'Grease waste carrier' };
  const day = (iso) => { if (!iso) return null; const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso); return Number.isNaN(d.getTime()) ? null : d; };
  const time = (iso) => { const d = day(iso); return d && iso.length > 10 ? d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''; };

  function draw(r) {
    const rec = document.querySelector('[data-record]');
    document.querySelector('[data-demo-note]').hidden = true;
    rec.querySelector('.rec__head .label').textContent = 'Zonke Door Record';
    rec.querySelector('.rec__site').textContent = r.site.code;
    rec.querySelector('.rec__name').textContent = [r.site.name, r.site.area].filter(Boolean).join(' · ');
    const v = VERDICT[r.verdict] ?? VERDICT.overdue;
    const vEl = rec.querySelector('.rec__verdict');
    vEl.className = `rec__verdict ${v[0]}`.trim();
    vEl.innerHTML = `${ICON[v[1]]}<span data-verdict>${v[2]}</span>`;
    for (const li of rec.querySelectorAll('[data-line]')) {
      const l = r.lines.find((x) => x.key === li.dataset.line);
      if (!l) { li.hidden = true; continue; }
      const last = day(l.last), next = day(l.next);
      li.querySelector('small').innerHTML = `<span data-last>${last ? `Last ${fmt(last)}` : 'No visit yet'}${next ? ` · next ${fmt(next)}` : ''}</span>${l.note ? ` · ${esc(l.note)}` : ''}`;
      const c = CHIP[l.status] ?? CHIP.overdue;
      const chip = li.querySelector('[data-chip]');
      chip.className = `chip ${c[0]}`;
      chip.innerHTML = `${ICON[c[1]]}${c[2]}`;
    }
    const api = `${Z.apiUrl}/`;
    const list = (sel, items, row, empty) => { document.querySelector(sel).innerHTML = items?.length ? items.map(row).join('') : `<li><time>—</time><span>${empty}</span></li>`; };
    list('[data-docs]', r.documents, (d) => `<li>${ICON.doc}<span>${d.url ? `<a href="${esc(new URL(d.url, api).href)}">${esc(d.title)}</a>` : esc(d.title)}</span><small>${d.date ? long(day(d.date)) : 'on file'}</small></li>`, 'No documents yet.');
    list('[data-visits]', r.visits, (x) => `<li><time>${long(day(x.date))}</time><span>${esc(x.summary)}</span></li>`, 'No visits yet.');
    list('[data-access]', r.access, (x) => `<li><time>${long(day(x.date))}${time(x.date) ? ` ${time(x.date)}` : ''}</time><span>${esc(x.who)}${x.method ? ` · ${esc(x.method)}` : ''}</span></li>`, 'No visits logged yet.');
    list('[data-training]', r.training, (x) => `<li><time>${long(day(x.date))}</time><span>${esc(x.topic)} · ${Number(x.attendees) || 0} staff signed</span></li>`, 'No talks given yet.');
    const regs = Object.entries(r.registrations || {}).filter(([, v]) => v);
    if (regs.length) document.querySelector('[data-registrations]').innerHTML = regs.map(([k, v]) => `<span class="reg"><b>${esc(REG[k] ?? k)}:</b> ${esc(v)}</span>`).join('');
    document.querySelector('[data-report]').href = `report.html#${encodeURIComponent(token)}`;
    const wa = document.querySelector('[data-report-wa]');
    wa.href = `https://wa.me/${Z.whatsapp}?text=${encodeURIComponent(`Hi Zonke, I'm reporting a problem at site ${r.site.code} (${r.site.name}). `)}`;
    if (r.updated) { const u = document.querySelector('[data-updated]'); u.hidden = false; u.textContent = `Updated ${long(day(r.updated))}`; }
    rec.dataset.live = r.site.code;
  }

  function missing() {
    document.querySelector('[data-demo-note]').hidden = true;
    document.querySelector('[data-record]').hidden = true;
    document.querySelector('[data-missing]').hidden = false;
  }

  if (!live) { example(); return; }
  document.querySelector('[data-record]').setAttribute('aria-busy', 'true');
  fetch(`${Z.apiUrl}/api/public/record/${encodeURIComponent(token)}`, { headers: { Accept: 'application/json' } })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(draw)
    .catch(missing)
    .finally(() => document.querySelector('[data-record]').removeAttribute('aria-busy'));
})();
