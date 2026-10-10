// Built from src/survey.mjs by scripts/build.mjs. Edit the source, not this copy.
(() => {
// Survey slots: weekdays from tomorrow, skipping South African public holidays, at the times set in
// zonke.config.mjs (survey.slots, SAST). book.html runs this in the browser (the build copies it to
// site/survey.js); the platform can import it so both offer the same slots.
// Plain functions only, no imports: the build strips `export` to make the browser copy.

const SAST_MS = 2 * 3600 * 1000; // South Africa has no daylight saving: always UTC+2

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** Easter Sunday (Gregorian), as a UTC date. Anonymous Gregorian algorithm. */
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}

/**
 * Public holidays for a year as 'YYYY-MM-DD' (Public Holidays Act 36 of 1994): the fixed days, Good
 * Friday and Family Day, and the Monday after any holiday that falls on a Sunday.
 */
function holidaysSA(y) {
  const fixed = ['01-01', '03-21', '04-27', '05-01', '06-16', '08-09', '09-24', '12-16', '12-25', '12-26'];
  const days = fixed.map((md) => new Date(`${y}-${md}T00:00:00Z`));
  const e = easter(y);
  days.push(new Date(e.getTime() - 2 * 86400000), new Date(e.getTime() + 86400000));
  const out = new Set(days.map(ymd));
  for (const d of days) if (d.getUTCDay() === 0) out.add(ymd(new Date(d.getTime() + 86400000)));
  return out;
}

/**
 * The next `days` working days from tomorrow (SAST), each with every slot time.
 * Returns [{ date: 'YYYY-MM-DD', time: 'HH:MM', start: 'YYYY-MM-DDTHH:MM:00+02:00' }].
 */
function surveySlots({ now = new Date(), slots = ['09:30', '15:00'], days = 10 } = {}) {
  const sast = new Date(now.getTime() + SAST_MS);
  let d = new Date(Date.UTC(sast.getUTCFullYear(), sast.getUTCMonth(), sast.getUTCDate()));
  const hols = {};
  const out = [];
  let found = 0;
  while (found < days) {
    d = new Date(d.getTime() + 86400000);
    const y = d.getUTCFullYear();
    hols[y] = hols[y] || holidaysSA(y);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6 || hols[y].has(ymd(d))) continue;
    found++;
    for (const t of slots) out.push({ date: ymd(d), time: t, start: `${ymd(d)}T${t}:00+02:00` });
  }
  return out;
}

/** "Tue 14 Oct, 09:30" from a slot start, without depending on the browser's locale data. */
function slotLabel(start) {
  const [date, rest] = start.split('T');
  const [y, m, dd] = date.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();
  const D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${D[dow]} ${dd} ${M[m - 1]}, ${rest.slice(0, 5)}`;
}

window.SURVEY = { surveySlots, slotLabel, holidaysSA };
})();
