// The spend check. Adds up what a kitchen pays its current vendors and turns it into a WhatsApp
// message. It never shows a Zonke price: we quote one monthly price after the survey, from the
// client's real invoices. Nothing is sent anywhere until the person taps WhatsApp or email.
(() => {
  const form = document.getElementById('compare');
  const card = document.getElementById('spend');
  if (!form || !card || !window.ZONKE) return;
  const LINES = [...form.querySelectorAll('fieldset[data-line]')].map((fs) => ({ key: fs.dataset.line, name: fs.querySelector('legend span').textContent }));
  const companies = document.getElementById('companies');
  let companiesEdited = false;
  companies.addEventListener('input', () => { companiesEdited = companies.value.trim() !== ''; });

  const num = (id) => { const v = parseFloat(String(document.getElementById(id)?.value ?? '').replace(',', '.')); return Number.isFinite(v) && v > 0 ? v : 0; };
  // "R5 500": South African style, a space between thousands, rounded to the rand.
  const rand = (n) => `R${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;

  /** The sums. Exposed on window for the test. */
  function compute() {
    const lines = LINES.map(({ key, name }) => {
      const bill = document.getElementById(`${key}-bill`).value;
      const amount = num(`${key}-amt`);
      const visits = Math.round(num(`${key}-visits`));
      const used = bill !== 'none' && amount > 0;
      const monthly = !used ? 0 : bill === 'month' ? amount : (amount * visits) / 12;
      const invoices = !used ? 0 : bill === 'month' ? 12 : visits;
      const trading = used && document.getElementById(`${key}-trade`).checked ? visits : 0;
      return { key, name, bill, amount, visits: used ? visits : 0, used, monthly, invoices, trading };
    });
    const callouts = Math.round(num('callouts'));
    const calloutCost = num('callout-cost');
    const monthly = lines.reduce((t, l) => t + l.monthly, 0) + (callouts * calloutCost) / 12;
    const auto = lines.filter((l) => l.used).length;
    return {
      lines, callouts, calloutCost, monthly, annual: monthly * 12,
      companies: companiesEdited ? Math.round(num('companies')) : auto,
      invoices: lines.reduce((t, l) => t + l.invoices, 0) + (calloutCost > 0 ? callouts : 0),
      visits: lines.reduce((t, l) => t + l.visits, 0) + callouts,
      trading: lines.reduce((t, l) => t + l.trading, 0),
    };
  }

  function message(r) {
    const biz = document.getElementById('biz').value.trim(), area = document.getElementById('area').value.trim();
    const who = [biz, area].filter(Boolean).join(', ');
    const rows = r.lines.filter((l) => l.used).map((l) => `- ${l.name}: ${rand(l.amount)} ${l.bill === 'month' ? 'a month' : `a visit, ${l.visits} visits a year`}`);
    if (r.callouts && r.calloutCost) rows.push(`- Call-outs: ${r.callouts} a year at about ${rand(r.calloutCost)} each`);
    return `Hi Zonke, I worked out what we pay now${who ? ` for ${who}` : ''}: about ${rand(r.monthly)} a month (${rand(r.annual)} a year) across ${r.companies} compan${r.companies === 1 ? 'y' : 'ies'}, ` +
      `with ${r.visits} visit${r.visits === 1 ? '' : 's'} a year, ${r.trading} of them while we trade.\n${rows.join('\n')}${rows.length ? '\n' : ''}` +
      `Can one Zonke price beat it? I'll bring the invoices to the survey.`;
  }

  function render() {
    const r = compute();
    if (!companiesEdited) companies.placeholder = `${r.companies} (worked out for you)`;
    card.querySelector('[data-monthly]').textContent = rand(r.monthly);
    card.querySelector('[data-annual]').textContent = rand(r.annual);
    card.querySelector('[data-companies]').textContent = r.companies;
    card.querySelector('[data-invoices]').textContent = r.invoices;
    card.querySelector('[data-visits]').textContent = r.visits;
    card.querySelector('[data-trading]').textContent = r.trading;
    card.querySelector('[data-spend-lines]').innerHTML = r.lines.map((l) => `<li><span>${l.name}</span><b class="num">${l.used ? `${rand(l.monthly)}<small>/month</small>` : '<small>none</small>'}</b></li>`).join('');
    form.querySelectorAll('fieldset[data-line]').forEach((fs) => {
      const none = fs.querySelector('select').value === 'none';
      fs.classList.toggle('is-off', none);
      fs.querySelectorAll('input').forEach((i) => { i.disabled = none; });
    });
    const text = message(r);
    card.querySelector('[data-wa]').href = `https://wa.me/${window.ZONKE.whatsapp}?text=${encodeURIComponent(text)}`;
    card.querySelector('[data-mail]').href = `mailto:${window.ZONKE.email}?subject=${encodeURIComponent('What we pay now: please quote')}&body=${encodeURIComponent(text)}`;
    window.ZONKE_SPEND = r;
  }

  form.addEventListener('input', render);
  form.addEventListener('change', render);
  render();
})();
