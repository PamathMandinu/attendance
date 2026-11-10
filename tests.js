// Run with:  node tests.js
const fs = require("fs");
const path = require("path");
const assert = require("assert");

// data.js declares plain globals, so evaluate it and expose them
eval(fs.readFileSync(path.join(__dirname, "data.js"), "utf8") + ";globalThis.COURSES=COURSES;globalThis.TIMETABLES=TIMETABLES;globalThis.DEFAULT_SEMESTER=DEFAULT_SEMESTER;");
const L = require("./logic.js");

const ctx = (over = {}) => Object.assign({ timetables: TIMETABLES, overrides: {}, holidays: [], extras: [] }, over);
const S = { threshold: 80, start: "2026-10-12", end: "2027-01-15" };
const TODAY = "2026-11-20";
let n = 0;
const test = (name, fn) => { fn(); n++; console.log("ok -", name); };

test("timetable switches on the final date (6 Nov) and can be overridden", () => {
  assert.equal(L.timetableFor("2026-11-05", TIMETABLES, {}).id, "temp");
  assert.equal(L.timetableFor("2026-11-06", TIMETABLES, {}).id, "final");
  assert.equal(L.timetableFor("2026-11-04", TIMETABLES, { final: "2026-11-02" }).id, "final");
  assert.equal(L.timetableFor("2026-10-01", TIMETABLES, {}).id, "temp"); // before first date -> first
});

test("sessions on a Monday differ between temp and final", () => {
  const temp = L.sessionsOn("2026-11-02", ctx()).map((s) => s.code + s.type + s.start);
  assert.deepEqual(temp, ["TICT2134P08:00", "TICT2113P13:00"]);
  const fin = L.sessionsOn("2026-11-09", ctx()).map((s) => s.code + s.type + s.start);
  assert.deepEqual(fin, ["TICT2113P15:10"]);
});

test("final timetable has the expected weekly hours per course", () => {
  const hrs = {};
  TIMETABLES[1].slots.forEach((s) => (hrs[s.code] = (hrs[s.code] || 0) + s.hours));
  assert.deepEqual(hrs, { TICT2113: 4, TICT2134: 6, AUX2113: 3, TICT2153: 4, TICT2142: 2, TICT2122: 2 });
});

test("slot hours match the clock times", () => {
  TIMETABLES.forEach((t) => t.slots.forEach((s) => assert.equal(L.hoursFrom(s.start, s.end), s.hours, s.id)));
});

test("holiday removes scheduled sessions but not extras", () => {
  const c = ctx({ holidays: [{ from: "2026-11-09", to: "2026-11-09", label: "x" }],
                  extras: [{ id: "x_1", date: "2026-11-09", code: "TICT2142", type: "T", start: "10:00", end: "11:00", hours: 1 }] });
  const s = L.sessionsOn("2026-11-09", c);
  assert.equal(s.length, 1); assert.equal(s[0].extra, true);
});

test("planned hours come from the calendar (temp then final), no records -> 100%", () => {
  const st = L.computeStats(ctx(), {}, S, "2026-10-12").find((c) => c.code === "TICT2142");
  // temp: Thu 12 Oct..5 Nov  -> Thursdays 15 Oct, 22 Oct, 29 Oct, 5 Nov = 4 sessions
  // final: 6 Nov..15 Jan -> Tue+Thu each week. count them independently:
  let expected = 0;
  for (let d = new Date(2026, 9, 12); d <= new Date(2027, 0, 15); d.setDate(d.getDate() + 1)) {
    const dk = L.dateKey(d), dow = d.getDay();
    const tt = dk >= "2026-11-06" ? TIMETABLES[1] : TIMETABLES[0];
    expected += tt.slots.filter((s) => s.code === "TICT2142" && s.day === dow).length;
  }
  assert.equal(st.planned, expected);
  assert.equal(st.pct, 100);
});

test("skip allowance in hours + status colours", () => {
  const code = "TICT2142";
  const base = L.computeStats(ctx(), {}, S, "2026-10-12").find((c) => c.code === code);
  assert.equal(base.mustAttend, Math.ceil(0.8 * base.planned));
  assert.equal(base.canSkip, base.planned - base.mustAttend);
  // mark the first N sessions absent until danger
  const sess = L.allSessions(ctx(), S).filter((s) => s.code === code);
  const rec = {};
  for (let i = 0; i < base.canSkip; i++) rec[sess[i].key] = "A";
  let st = L.computeStats(ctx(), rec, S, "2026-10-12").find((c) => c.code === code);
  assert.equal(st.canSkip, 0); assert.equal(st.status, "warn");
  rec[sess[base.canSkip].key] = "A";
  st = L.computeStats(ctx(), rec, S, "2026-10-12").find((c) => c.code === code);
  assert.equal(st.canSkip, -1); assert.equal(st.status, "danger");
});

test("cancelled lectures are removed from planned and from the percentage", () => {
  const sess = L.allSessions(ctx(), S).filter((s) => s.code === "TICT2142");
  const before = L.computeStats(ctx(), {}, S, TODAY).find((c) => c.code === "TICT2142");
  const rec = { [sess[0].key]: "C", [sess[1].key]: "P" };
  const st = L.computeStats(ctx(), rec, S, TODAY).find((c) => c.code === "TICT2142");
  assert.equal(st.planned, before.planned - 1); assert.equal(st.cancelled, 1);
  assert.equal(st.held, 1); assert.equal(st.pct, 100);
});

test("extra (makeup) session adds hours and can be marked", () => {
  const extra = { id: "x_a", date: "2026-11-14", code: "TICT2134", type: "P", start: "09:00", end: "11:00", hours: 2, room: "TCL1" };
  const c = ctx({ extras: [extra] });
  const a = L.computeStats(ctx(), {}, S, TODAY).find((x) => x.code === "TICT2134");
  const b = L.computeStats(c, { "2026-11-14|x_a": "A" }, S, TODAY).find((x) => x.code === "TICT2134");
  assert.equal(b.planned, a.planned + 2); assert.equal(b.absent, 2);
  assert.equal(b.canSkip, b.planned - Math.ceil(0.8 * b.planned) - 2);
});

test("unmarked past sessions are reported, future ones are not", () => {
  const st = L.computeStats(ctx(), {}, S, "2026-10-20").find((c) => c.code === "TICT2113");
  assert.ok(st.unmarked > 0);
  const none = L.computeStats(ctx(), {}, S, "2026-10-12").find((c) => c.code === "TICT2113");
  assert.equal(none.unmarked, 0);
});

test("mergeItems: newest wins, deletions win when newer, union of keys", () => {
  const a = { "r:1": { v: "P", t: 5 }, "r:2": { v: "A", t: 5 }, "r:3": { v: "C", t: 9 } };
  const b = { "r:1": { v: "A", t: 7 }, "r:2": { v: null, t: 6 }, "r:4": { v: "P", t: 1 } };
  const m = L.mergeItems(a, b);
  assert.equal(m["r:1"].v, "A"); assert.equal(m["r:2"].v, null); assert.equal(m["r:3"].v, "C"); assert.equal(m["r:4"].v, "P");
  assert.ok(L.sameItems(L.mergeItems(a, b), L.mergeItems(b, a))); // commutative
  assert.ok(L.sameItems(m, L.mergeItems(m, a)));                     // idempotent
});

test("viewFromItems builds records/extras/holidays/settings and skips deleted", () => {
  const items = {
    "r:2026-11-09|f0": { v: "P", t: 1 }, "r:2026-11-10|f1": { v: null, t: 2 },
    "x:abc": { v: { date: "2026-11-14", code: "TICT2142", type: "T", start: "09:00", end: "10:00", hours: 1 }, t: 1 },
    "h:h1": { v: { from: "2026-12-01", to: "2026-12-05", label: "vac" }, t: 1 },
    "s:threshold": { v: 90, t: 1 },
  };
  const v = L.viewFromItems(items, { threshold: 80, start: "a", end: "b", finalFrom: "" });
  assert.deepEqual(v.records, { "2026-11-09|f0": "P" });
  assert.equal(v.extras[0].id, "x_abc"); assert.equal(v.holidays.length, 1);
  assert.equal(v.settings.threshold, 90); assert.equal(v.settings.start, "a");
});

test("migrate v1 data keeps marks and threshold", () => {
  const items = L.migrateV1({ records: { "2026-10-20|s3": "P", "bad": "Z" }, settings: { threshold: 75, weeks: 14 } });
  assert.equal(items["r:2026-10-20|s3"].v, "P"); assert.equal(items["r:bad"], undefined); assert.equal(items["s:threshold"].v, 75);
});

console.log("\nAll " + n + " tests passed");
