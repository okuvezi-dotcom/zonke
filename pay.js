// Pay page: the invoice links from the platform open pay.html#<invoice> or pay.html#<invoice>:<amount>.
// This fills the invoice number into the WhatsApp messages and the card pay link ({invoice} and
// {amount} in config.payments.cardPayUrl). A link that needs an amount we don't have is hidden.
(() => {
  const Z = window.ZONKE;
  if (!Z) return;
  const [inv = '', amount = ''] = decodeURIComponent(location.hash.slice(1)).split(':');
  const invoice = /^[A-Za-z0-9-]{3,40}$/.test(inv) ? inv : '';
  const amt = /^\d+(\.\d{1,2})?$/.test(amount) ? amount : '';
  if (invoice) {
    document.querySelector('[data-invoice-line]').hidden = false;
    document.querySelector('[data-invoice]').textContent = invoice;
    const wa = (t) => `https://wa.me/${Z.whatsapp}?text=${encodeURIComponent(t)}`;
    const ask = document.querySelector('[data-pay-wa]');
    if (ask) ask.href = wa(`Hi Zonke, please send me the debit order mandate link. My invoice is ${invoice}.`);
    const q = document.querySelector('[data-pay-question]');
    if (q) q.href = wa(`Hi Zonke, I have a question about invoice ${invoice}.`);
  }
  const card = document.querySelector('[data-card-pay]');
  if (card) {
    const t = card.dataset.template;
    if ((/\{amount\}/.test(t) && !amt) || (/\{invoice\}/.test(t) && !invoice)) card.hidden = true;
    else card.href = t.replace(/\{invoice\}/g, encodeURIComponent(invoice)).replace(/\{amount\}/g, amt);
  } else {
    // No card provider configured yet: say what to do instead of showing an empty box.
    const way = document.querySelector('[data-card-way] .btns');
    if (way) way.outerHTML = '<p class="note">Card payment links are coming. Until then, pay by debit order or EFT.</p>';
  }
})();
