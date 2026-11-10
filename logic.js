// Pure logic (no DOM, no network) so it can be tested in Node and used in the browser.
//
// DATA MODEL
// Everything the user saves lives in one flat map called "items":
//   "r:<date>|<slotId>"  -> "P" | "A" | "C"            attendance mark (Present/Absent/Cancelled)
//   "x:<id>"             -> {date, code, type, start, end, hours, room}   extra / makeup session
//   "h:<id>"             -> {from, to, label}          holiday / vacation range
//   "s:<name>"           -> value                      setting (threshold, start, end, finalFrom)
// Each item is {v: value-or-null, t: timestamp}. v === null means "deleted".
// Merging two copies (phone + cloud) = for every key keep the one with the newest t.

function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function validDate(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseKey(s)); }
function r2(x) { return Math.round(x * 100) / 100; }

function courseLabel(code) { return code.replace(/^([A-Z]+)(\d+)$/, "$1 $2"); }
function sessionLabel(s) { return courseLabel(s.code) + (s.type ? " (" + s.type + ")" : ""); }

function to12h(t) {
  let [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return pad(h) + ":" + pad(m) + " " + ap;
}

// Lecture hours from start/end times: a 55-minute slot = 1 h, 1h50 = 2 h (rounded to 0.5)
function hoursFrom(start, end) {
  const [a, b] = start.split(":").map(Number), [c, d] = end.split(":").map(Number);
  const min = c * 60 + d - (a * 60 + b);
  if (!(min > 0)) return 1;
  return Math.max(0.5, Math.round((min / 55) * 2) / 2);
}

/* ---------------- timetable selection ---------------- */

// overrides: { final: "2026-11-09" } lets the user change the switch date
function timetableFor(dk, timetables, overrides) {
  let chosen = timetables[0];
  let bestFrom = "";
  timetables.forEach((t, i) => {
    const from = (overrides && overrides[t.id]) || t.from;
    if (i > 0 && from <= dk && from >= bestFrom) { chosen = t; bestFrom = from; }
  });
  return chosen;
}

function holidayOn(dk, holidays) {
  return holidays.find((h) => h.from <= dk && dk <= (h.to || h.from)) || null;
}

function mkSession(dk, s, extra) {
  return { key: dk + "|" + s.id, id: s.id, date: dk, code: s.code, type: s.type || "", start: s.start,
           end: s.end, room: s.room || "", hours: s.hours, extra: !!extra };
}

function scheduledOn(dk, ctx) {
  if (holidayOn(dk, ctx.holidays)) return [];
  const dow = parseKey(dk).getDay();
  return timetableFor(dk, ctx.timetables, ctx.overrides).slots
    .filter((s) => s.day === dow)
    .map((s) => mkSession(dk, s, false));
}
function extrasOn(dk, ctx) {
  return ctx.extras.filter((x) => x.date === dk).map((x) => mkSession(dk, x, true));
}
function sessionsOn(dk, ctx) {
  return scheduledOn(dk, ctx).concat(extrasOn(dk, ctx)).sort((a, b) => a.start.localeCompare(b.start));
}

// Every session of the semester: scheduled ones between start and end (minus holidays) + all extras
function allSessions(ctx, settings) {
  const list = [];
  if (validDate(settings.start) && validDate(settings.end)) {
    const d = parseKey(settings.start), end = parseKey(settings.end);
    for (let i = 0; d <= end && i < 400; i++) {
      list.push(...scheduledOn(dateKey(d), ctx));
      d.setDate(d.getDate() + 1);
    }
  }
  ctx.extras.forEach((x) => list.push(mkSession(x.date, x, true)));
  return list;
}

/* ---------------- statistics (counted in lecture HOURS per course unit) ---------------- */

function computeStats(ctx, records, settings, today) {
  const by = {};
  Object.keys(COURSES).forEach((code) => {
    by[code] = { code, planned: 0, present: 0, absent: 0, cancelled: 0, unmarked: 0, types: {} };
  });
  allSessions(ctx, settings).forEach((s) => {
    const c = by[s.code];
    if (!c) return;
    const v = records[s.key];
    const tk = s.type || "-";
    const ty = c.types[tk] || (c.types[tk] = { present: 0, held: 0 });
    if (v === "C") { c.cancelled += s.hours; return; }
    c.planned += s.hours;
    if (v === "P") { c.present += s.hours; ty.present += s.hours; ty.held += s.hours; }
    else if (v === "A") { c.absent += s.hours; ty.held += s.hours; }
    else if (s.date < today) c.unmarked += s.hours;
  });

  const thr = settings.threshold / 100;
  return Object.values(by).map((c) => {
    ["planned", "present", "absent", "cancelled", "unmarked"].forEach((k) => (c[k] = r2(c[k])));
    const held = r2(c.present + c.absent);
    const pct = held ? (c.present / held) * 100 : 100;
    const mustAttend = Math.ceil(thr * c.planned - 1e-9);
    const maxAbsent = r2(c.planned - mustAttend);
    const canSkip = r2(maxAbsent - c.absent);
    const left = r2(c.planned - held - c.unmarked);
    let status = "ok";
    // red only when the target can no longer be reached; an early dip is just amber
    if (canSkip < 0) status = "danger";
    else if (canSkip < 2 || pct < settings.threshold) status = "warn";
    return Object.assign(c, { held, pct, mustAttend, maxAbsent, canSkip, left, status });
  });
}

function overall(stats) {
  const P = stats.reduce((a, c) => a + c.present, 0);
  const held = stats.reduce((a, c) => a + c.held, 0);
  return { present: P, held, pct: held ? (P / held) * 100 : 100 };
}

/* ---------------- items: merge / view / migrate ---------------- */

function pickNewer(x, y) {
  if (!x) return y;
  if (!y) return x;
  if (x.t !== y.t) return x.t > y.t ? x : y;
  return JSON.stringify(x.v) >= JSON.stringify(y.v) ? x : y; // deterministic tie-break
}

function mergeItems(a, b) {
  const out = {};
  const keys = new Set(Object.keys(a || {}).concat(Object.keys(b || {})));
  keys.forEach((k) => {
    const it = pickNewer((a || {})[k], (b || {})[k]);
    if (it && typeof it.t === "number") out[k] = it;
  });
  return out;
}

function sameItems(a, b) {
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => b[k] && b[k].t === a[k].t && JSON.stringify(b[k].v) === JSON.stringify(a[k].v));
}

function viewFromItems(items, defaults) {
  const records = {}, extras = [], holidays = [], set = {};
  Object.keys(items).forEach((k) => {
    const it = items[k];
    if (!it || it.v === null || it.v === undefined) return;
    const id = k.slice(2);
    if (k.startsWith("r:")) records[id] = it.v;
    else if (k.startsWith("x:")) extras.push(Object.assign({}, it.v, { id: "x_" + id, _key: k }));
    else if (k.startsWith("h:")) holidays.push(Object.assign({}, it.v, { id, _key: k }));
    else if (k.startsWith("s:")) set[id] = it.v;
  });
  const settings = Object.assign({}, defaults, set);
  holidays.sort((a, b) => a.from.localeCompare(b.from));
  return { records, extras: extras.filter((x) => validDate(x.date)), holidays, settings };
}

// Old v1 backup format: {records:{"2026-10-20|s3":"P"}, settings:{threshold, weeks}}
function migrateV1(old) {
  const items = {};
  Object.keys(old.records || {}).forEach((k) => {
    const v = old.records[k];
    if (v === "P" || v === "A" || v === "C") items["r:" + k] = { v, t: 1 };
  });
  const th = old.settings && Number(old.settings.threshold);
  if (th >= 1 && th <= 100) items["s:threshold"] = { v: th, t: 1 };
  return items;
}

if (typeof module !== "undefined") {
  module.exports = { dateKey, parseKey, validDate, courseLabel, sessionLabel, to12h, hoursFrom, timetableFor,
    holidayOn, scheduledOn, sessionsOn, allSessions, computeStats, overall, mergeItems, sameItems,
    viewFromItems, migrateV1 };
}
