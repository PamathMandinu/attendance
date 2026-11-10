/* ============================================================
   Attendance Tracker app (screens, buttons, saving, cloud sync)
   Pure calculations live in logic.js, timetable data in data.js.
   ============================================================ */
const STORE = "bict_att_v2";
const OLD_STORE = "bict_att_v1";
const BANNER_KEY = "bict_banner_off";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULTS = Object.assign({ threshold: 80, finalFrom: "" }, DEFAULT_SEMESTER);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtH = (h) => (Number.isInteger(h) ? h : h.toFixed(1)) + " h";
const newId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36);

/* ---------- local storage ---------- */
// store = { items: {...}, owner: uid|null, dirty: bool }
//   owner = which cloud account this local copy belongs to (null = nobody yet)
//   dirty = has local changes that are not uploaded yet
let store = loadStore();
let view = viewFromItems(store.items, DEFAULTS);
let current = new Date();
let activeTab = "today";

function loadStore() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    if (s && s.items) return { items: s.items, owner: s.owner || null, dirty: !!s.dirty };
  } catch (e) {}
  try { // upgrade from app v1
    const old = JSON.parse(localStorage.getItem(OLD_STORE));
    if (old && old.records) return { items: migrateV1(old), owner: null, dirty: true };
  } catch (e) {}
  return { items: {}, owner: null, dirty: false };
}
function persist() {
  try { localStorage.setItem(STORE, JSON.stringify(store)); } catch (e) { toast("Could not save on this device"); }
}
function rebuild() { view = viewFromItems(store.items, DEFAULTS); }
function ctx() {
  return { timetables: TIMETABLES, overrides: { final: view.settings.finalFrom || "" }, holidays: view.holidays, extras: view.extras };
}
function todayKey() { return dateKey(new Date()); }

let changeSeq = 0;
function setItem(key, v) {
  store.items[key] = { v, t: Date.now() };
  changed();
}
function changed() {
  store.dirty = true;
  changeSeq++;
  persist(); rebuild(); render();
  scheduleSync();
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove("show"), 2000);
}

/* ---------- TODAY ---------- */
function renderToday() {
  const dk = dateKey(current);
  $("datePick").value = dk;
  $("dayName").textContent = DAYS[current.getDay()] + (dk === todayKey() ? " (today)" : "");
  $("ttName").textContent = "Timetable: " + timetableFor(dk, TIMETABLES, ctx().overrides).name;
  renderBanner();

  const hol = holidayOn(dk, view.holidays);
  const sessions = sessionsOn(dk, ctx());
  const list = $("dayList");
  list.innerHTML = "";

  if (hol) {
    const d = document.createElement("div");
    d.className = "holiday";
    d.innerHTML = "<b>No lectures:</b> " + esc(hol.label || "Holiday") +
      (hol.to && hol.to !== hol.from ? " (" + hol.from + " to " + hol.to + ")" : "") +
      '<br><button class="link" id="remHol">Remove this holiday</button>';
    list.appendChild(d);
    d.querySelector("#remHol").onclick = () => { setItem(hol._key, null); toast("Holiday removed"); };
  }

  if (!sessions.length && !hol) list.innerHTML = '<div class="empty">No lectures on this day &#127881;</div>';

  sessions.forEach((s) => {
    const val = view.records[s.key];
    const c = COURSES[s.code] || { name: s.code, color: "#64748b" };
    const div = document.createElement("div");
    div.className = "lec";
    div.style.setProperty("--c", c.color);
    div.innerHTML =
      "<h3>" + sessionLabel(s) + (s.extra ? '<span class="badge">Extra</span>' : "") + "</h3>" +
      '<div class="meta">' + esc(c.name) + "<br>" + to12h(s.start) + " - " + to12h(s.end) +
      " &middot; " + fmtH(s.hours) + (s.room ? " &middot; " + esc(s.room) : "") + "</div>" +
      '<div class="btns">' +
      [["P", "Present"], ["A", "Absent"], ["C", "Cancelled"]]
        .map(([v, l]) => '<button data-v="' + v + '" class="' + (val === v ? "sel" : "") + '">' + l + "</button>")
        .join("") + "</div>" +
      (s.extra ? '<button class="link" data-del="1">Delete this extra lecture</button>' : "");
    div.querySelectorAll(".btns button").forEach((b) => (b.onclick = () => mark(s.key, b.dataset.v)));
    const del = div.querySelector("[data-del]");
    if (del) del.onclick = () => {
      if (!confirm("Delete this extra lecture?")) return;
      const ex = view.extras.find((x) => x.id === s.id);
      if (ex) setItem(ex._key, null);
      if (view.records[s.key]) setItem("r:" + s.key, null);
    };
    list.appendChild(div);
  });

  $("allPresent").style.display = sessions.length ? "block" : "none";
  $("addHoliday").style.display = hol ? "none" : "block";
}

function mark(sessionKey, v) {
  const key = "r:" + sessionKey;
  setItem(key, view.records[sessionKey] === v ? null : v); // tap again to clear
}

function shift(n) {
  current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + n);
  render();
}

function renderBanner() {
  const b = $("banner");
  b.innerHTML = "";
  let off = false;
  try { off = localStorage.getItem(BANNER_KEY) === "1"; } catch (e) {}
  if (!window.FIREBASE_CONFIG || /^PASTE/.test(window.FIREBASE_CONFIG.apiKey) || cloudUser || off) return;
  b.innerHTML = '<div class="bannerbox">Sign in to back up your attendance online and use it on other devices.' +
    '<div class="row"><button class="ghost" id="bnGo">Sign in</button><button class="ghost" id="bnNo">Not now</button></div></div>';
  $("bnGo").onclick = () => openTab("settings");
  $("bnNo").onclick = () => { try { localStorage.setItem(BANNER_KEY, "1"); } catch (e) {} renderBanner(); };
}

/* ---------- extra lecture dialog ---------- */
function openExtra() {
  const sel = $("exCourse");
  if (!sel.options.length) {
    Object.keys(COURSES).forEach((code) => sel.add(new Option(courseLabel(code) + " - " + COURSES[code].name, code)));
  }
  $("extraDate").textContent = DAYS[current.getDay()] + ", " + dateKey(current);
  $("exHours").dataset.touched = "";
  $("extraDlg").showModal();
}
function autoHours() {
  if ($("exHours").dataset.touched) return;
  if ($("exStart").value && $("exEnd").value) $("exHours").value = hoursFrom($("exStart").value, $("exEnd").value);
}
$("addExtra").onclick = openExtra;
$("exCancel").onclick = () => $("extraDlg").close();
$("exStart").oninput = autoHours;
$("exEnd").oninput = autoHours;
$("exHours").oninput = () => ($("exHours").dataset.touched = "1");
$("extraForm").onsubmit = (e) => {
  const start = $("exStart").value, end = $("exEnd").value, hours = Number($("exHours").value);
  if (!start || !end || end <= start) { e.preventDefault(); toast("End time must be after start time"); return; }
  if (!(hours > 0 && hours <= 8)) { e.preventDefault(); toast("Hours must be between 0.5 and 8"); return; }
  setItem("x:" + newId(), { date: dateKey(current), code: $("exCourse").value, type: $("exType").value,
    start, end, hours, room: $("exRoom").value.trim().slice(0, 30) });
  toast("Extra lecture added");
};

/* ---------- STATS ---------- */
function renderStats() {
  const th = view.settings.threshold;
  $("statsHint").textContent = "Counted in lecture hours per course (theory + practical together). Black marker = your " + th + "% line.";
  const list = $("statList");
  list.innerHTML = "";
  computeStats(ctx(), view.records, view.settings, todayKey()).forEach((u) => {
    let verdict;
    if (u.canSkip < 0) verdict = "Over the limit &mdash; " + th + "% can't be reached any more. Talk to your lecturer.";
    else if (u.canSkip < 1) verdict = "Don't miss any more lectures!";
    else if (u.pct < th) verdict = "Only " + u.pct.toFixed(0) + "% so far but you can recover. You can still miss " + fmtH(u.canSkip) + ".";
    else verdict = "You can still miss " + fmtH(u.canSkip) + " in total.";
    const t = u.types;
    const parts = [["T", "Theory"], ["P", "Practical"], ["-", "Other"]]
      .filter(([k]) => t[k] && t[k].held)
      .map(([k, l]) => l + " " + fmtH(t[k].present) + "/" + fmtH(t[k].held));
    const div = document.createElement("div");
    div.className = "stat " + u.status;
    div.innerHTML =
      '<div class="head"><div><h3>' + courseLabel(u.code) + '</h3><div class="name">' + esc(COURSES[u.code].name) + "</div></div>" +
      '<div class="pct">' + (u.held ? u.pct.toFixed(0) + "%" : "&ndash;") + "</div></div>" +
      '<div class="bar"><i style="width:' + u.pct + '%"></i><u style="left:' + th + '%"></u></div>' +
      '<div class="nums"><span>Present <b>' + fmtH(u.present) + "</b></span><span>Absent <b>" + fmtH(u.absent) +
      "</b></span><span>Cancelled <b>" + fmtH(u.cancelled) + "</b></span><span>Left <b>" + fmtH(u.left) + "</b></span></div>" +
      (parts.length ? '<div class="split">' + parts.join(" &middot; ") + "</div>" : "") +
      '<div class="verdict">' + verdict + "</div>" +
      (u.unmarked ? '<div class="unmarked">' + fmtH(u.unmarked) + " of past lectures are not marked yet (not counted).</div>" : "");
    list.appendChild(div);
  });
}

function renderOverall() {
  const o = overall(computeStats(ctx(), view.records, view.settings, todayKey()));
  $("overallBadge").innerHTML = "Overall<b>" + (o.held ? o.pct.toFixed(0) + "%" : "&ndash;") + "</b>";
  const chip = $("syncChip");
  const map = { local: "Saved on this phone", idle: "☁ Synced", syncing: "☁ Syncing…", offline: "☁ Offline, will sync", error: "☁ Sync problem" };
  chip.textContent = map[syncState] || "";
}

/* ---------- SETTINGS ---------- */
function renderSettings() {
  const s = view.settings;
  $("setThr").value = s.threshold;
  $("setStart").value = s.start;
  $("setEnd").value = s.end;
  $("setFinal").value = s.finalFrom || TIMETABLES[1].from;

  const hl = $("holList");
  hl.innerHTML = view.holidays.length ? "" : '<p class="note">No holidays added.</p>';
  view.holidays.forEach((h) => {
    const row = document.createElement("div");
    row.className = "hol";
    row.innerHTML = "<span>" + esc(h.label || "Holiday") + "<br><small>" + h.from + (h.to && h.to !== h.from ? " to " + h.to : "") + "</small></span>" +
      "<button>Remove</button>";
    row.querySelector("button").onclick = () => setItem(h._key, null);
    hl.appendChild(row);
  });

  const t = $("ttable");
  t.innerHTML = "";
  const active = timetableFor(todayKey(), TIMETABLES, ctx().overrides);
  TIMETABLES.forEach((tt) => {
    const from = (tt === TIMETABLES[1] && s.finalFrom) || tt.from;
    const h = document.createElement("div");
    h.className = "tt";
    h.textContent = tt.name + " (from " + from + ")" + (tt === active ? " - active now" : "");
    t.appendChild(h);
    for (let d = 1; d <= 5; d++) {
      const slots = tt.slots.filter((x) => x.day === d);
      if (!slots.length) continue;
      const dh = document.createElement("div");
      dh.className = "d";
      dh.textContent = DAYS[d];
      t.appendChild(dh);
      slots.forEach((x) => {
        const r = document.createElement("div");
        r.className = "tr";
        r.innerHTML = "<span>" + sessionLabel(x) + "</span><span>" + to12h(x.start) + " - " + to12h(x.end) + " &middot; " + esc(x.room) + "</span>";
        t.appendChild(r);
      });
    }
  });
  renderAcct();
}

function setSetting(name, value) { setItem("s:" + name, value); toast("Saved"); }

$("setThr").onchange = (e) => {
  const n = Math.round(Number(e.target.value));
  if (!(n >= 1 && n <= 100)) { toast("Enter 1 to 100"); e.target.value = view.settings.threshold; return; }
  setSetting("threshold", n);
};
function dateSetting(id, name, check) {
  $(id).onchange = (e) => {
    const v = e.target.value;
    if (!validDate(v) || (check && !check(v))) { toast("Invalid date"); renderSettings(); return; }
    setSetting(name, v);
  };
}
dateSetting("setStart", "start", (v) => v <= view.settings.end);
dateSetting("setEnd", "end", (v) => v >= view.settings.start);
dateSetting("setFinal", "finalFrom");

$("holAdd").onclick = () => {
  const from = $("holFrom").value, to = $("holTo").value || from;
  if (!validDate(from) || !validDate(to) || to < from) { toast("Pick a valid date range"); return; }
  setItem("h:" + newId(), { from, to, label: $("holLabel").value.trim().slice(0, 40) || "Holiday" });
  $("holFrom").value = ""; $("holTo").value = ""; $("holLabel").value = "";
  toast("Holiday added");
};
$("addHoliday").onclick = () => {
  const dk = dateKey(current);
  setItem("h:" + newId(), { from: dk, to: dk, label: "No lectures" });
  toast("Marked as holiday");
};
$("allPresent").onclick = () => {
  let n = 0;
  sessionsOn(dateKey(current), ctx()).forEach((s) => {
    if (!view.records[s.key]) { store.items["r:" + s.key] = { v: "P", t: Date.now() }; n++; }
  });
  if (n) { changed(); toast(n + " marked present"); } else toast("Nothing to mark");
};

/* ---------- backup ---------- */
$("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify({ version: 2, items: store.items }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "attendance-backup-" + todayKey() + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("importBtn").onclick = () => $("importFile").click();
$("importFile").onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      let items;
      if (s && s.items && typeof s.items === "object") items = s.items;
      else if (s && s.records) items = migrateV1(s);
      else throw new Error("bad");
      const clean = {};
      Object.keys(items).forEach((k) => {
        const it = items[k];
        if (/^[rxhs]:/.test(k) && it && typeof it.t === "number") clean[k] = it;
      });
      store.items = mergeItems(store.items, clean);
      changed();
      toast("Backup imported");
    } catch (err) { toast("Invalid backup file"); }
  };
  r.readAsText(f);
  e.target.value = "";
};
$("resetBtn").onclick = () => {
  if (!confirm("Delete ALL attendance records, extra lectures and holidays? This also clears your cloud copy.")) return;
  const t = Date.now();
  Object.keys(store.items).forEach((k) => { if (/^[rxh]:/.test(k)) store.items[k] = { v: null, t }; });
  changed();
  toast("All records cleared");
};

/* ---------- navigation / wiring ---------- */
function openTab(name) {
  activeTab = name;
  document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x.dataset.tab === name));
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.id === "tab-" + name));
  render();
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => openTab(b.dataset.tab)));
$("prevDay").onclick = () => shift(-1);
$("nextDay").onclick = () => shift(1);
$("todayBtn").onclick = () => { current = new Date(); render(); };
$("datePick").onchange = (e) => { if (validDate(e.target.value)) { current = parseKey(e.target.value); render(); } };

function render() {
  renderOverall();
  if (activeTab === "today") renderToday();
  else if (activeTab === "stats") renderStats();
  else renderSettings();
}

/* ============================================================
   CLOUD: login + sync
   store.items is the single source of truth on the phone.
   After every change we upload (merge with the cloud copy, newest change per item wins).
   While signed in we also listen for changes made on other devices.
   ============================================================ */
let cloudUser = null;
let syncState = "local"; // local | idle | syncing | offline | error
let unsub = null;
let syncTimer = null;
let pushing = false;
let loggingOut = false;

function cloudConfigured() { return !!(window.FIREBASE_CONFIG && !/^PASTE/.test(window.FIREBASE_CONFIG.apiKey)); }

function setSync(state) { syncState = state; renderOverall(); if (activeTab === "settings") updateAcctStatus(); }

function scheduleSync(delay) {
  if (!cloudUser || !window.Cloud || !Cloud.push) return;
  setSync(navigator.onLine ? "syncing" : "offline");
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushNow, delay === undefined ? 700 : delay);
}

async function pushNow() {
  if (!cloudUser || pushing) { if (pushing) scheduleSync(1500); return; }
  pushing = true;
  const seq = changeSeq;
  setSync("syncing");
  try {
    const merged = await Cloud.push(cloudUser.uid, store.items);
    applyRemote(merged);
    if (seq === changeSeq) store.dirty = false;
    persist();
    setSync("idle");
  } catch (e) {
    console.warn("sync failed", e);
    setSync(navigator.onLine ? "error" : "offline");
    acctMessage(cloudError(e), true);
  } finally { pushing = false; }
}

// Merge cloud items into the local copy; redraw only when something changed
function applyRemote(remote) {
  const merged = mergeItems(store.items, remote || {});
  if (!sameItems(merged, store.items)) {
    store.items = merged;
    persist(); rebuild(); render();
  }
  return merged;
}

function onRemote(items) {
  const merged = applyRemote(items);
  if (!sameItems(merged, items)) scheduleSync(300); // we have newer changes than the cloud
  else if (!pushing) setSync("idle");
}

function onAuth(user) {
  if (unsub) { unsub(); unsub = null; }
  if (!user) {
    cloudUser = null;
    setSync("local");
    render();
    return;
  }
  cloudUser = user;
  // Local data from a DIFFERENT account on this device must never leak into this account.
  if (store.owner && store.owner !== user.uid) { store.items = {}; rebuild(); }
  store.owner = user.uid;
  persist();
  unsub = Cloud.subscribe(user.uid, onRemote, (err) => { setSync("error"); acctMessage(cloudError(err), true); });
  scheduleSync(0);
  render();
}

function setupCloud() {
  if (setupCloud.done) return;
  setupCloud.done = true;
  if (window.Cloud && Cloud.configured && Cloud.onAuth) Cloud.onAuth(onAuth);
  render();
}
window.addEventListener("cloud-ready", setupCloud);
if (window.Cloud) setupCloud();
window.addEventListener("online", () => scheduleSync(300));
window.addEventListener("offline", () => cloudUser && setSync("offline"));

function cloudError(e) {
  const c = (e && e.code) || "";
  const map = {
    "auth/invalid-email": "That email address is not valid.",
    "auth/missing-password": "Enter your password.",
    "auth/weak-password": "Password is too short (use at least 6 characters).",
    "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/user-not-found": "No account with this email. Use Create account.",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/network-request-failed": "No internet connection.",
    "auth/popup-closed-by-user": "Google sign-in was closed.",
    "auth/cancelled-popup-request": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the Google pop-up. Allow pop-ups or use email login.",
    "auth/unauthorized-domain": "This website is not allowed in Firebase yet (Authentication > Settings > Authorized domains).",
    "auth/operation-not-allowed": "This login method is not enabled in Firebase (Authentication > Sign-in method).",
    "permission-denied": "Cloud rules refused the request. Check the Firestore rules in README.",
    "unavailable": "Cloud not reachable right now. Will retry.",
  };
  return map[c] || ("Something went wrong (" + (c || (e && e.message) || "unknown") + ").");
}

/* ---------- account card ---------- */
function acctMessage(msg, isErr) {
  const el = $("acctMsg");
  if (el) { el.textContent = msg; el.className = isErr ? "err" : "ok"; }
}
function updateAcctStatus() {
  const el = $("acctStatus");
  if (!el) return;
  const map = { local: "Saved on this phone", idle: "Synced with the cloud", syncing: "Syncing…", offline: "Offline - will sync when you are back online", error: "Sync problem - will retry" };
  el.textContent = map[syncState] || "";
}

function renderAcct() {
  const card = $("acctCard");
  card.className = "card acct";
  if (!cloudConfigured()) {
    card.innerHTML = "<h3>Account &amp; cloud sync</h3><p class=\"note\">Cloud sync is not switched on yet, so your attendance is saved only on this phone. " +
      "Follow <b>README.md &rarr; Part A (Firebase)</b> once, and a login box will appear here.</p>";
    return;
  }
  if (!window.Cloud || !Cloud.onAuth) {
    card.innerHTML = "<h3>Account &amp; cloud sync</h3><p class=\"note\">Loading cloud sync&hellip; (needs internet the first time). Your data is safe on this phone meanwhile.</p>";
    return;
  }
  if (cloudUser) {
    card.innerHTML = "<h3>Account &amp; cloud sync</h3><p>Signed in as<br><span class=\"who\">" + esc(cloudUser.email || "your account") + "</span></p>" +
      '<p class="note" id="acctStatus"></p><div class="row"><button class="ghost" id="syncBtn">Sync now</button><button class="danger" id="outBtn">Log out</button></div><div id="acctMsg" class="err"></div>';
    $("syncBtn").onclick = () => { acctMessage("", false); scheduleSync(0); };
    $("outBtn").onclick = logout;
    updateAcctStatus();
    return;
  }
  card.innerHTML = "<h3>Account &amp; cloud sync</h3><p class=\"note\">Log in to save your attendance online and open it on any phone or laptop. Each person has their own private account.</p>" +
    '<label>Email<input type="email" id="acEmail" autocomplete="email"></label>' +
    '<label>Password<input type="password" id="acPass" autocomplete="current-password"></label>' +
    '<div class="row"><button class="primary" id="acIn">Log in</button><button class="ghost" id="acUp">Create account</button></div>' +
    '<div class="divider">or</div><button class="ghost" id="acG">Continue with Google</button>' +
    '<button class="link" id="acForgot">Forgot password?</button><div id="acctMsg" class="err"></div>';
  const run = async (fn) => {
    acctMessage("", false);
    ["acIn", "acUp", "acG"].forEach((i) => ($(i).disabled = true));
    try { await fn(); } catch (e) { acctMessage(cloudError(e), true); }
    ["acIn", "acUp", "acG"].forEach((i) => $(i) && ($(i).disabled = false));
  };
  const creds = () => [$("acEmail").value.trim(), $("acPass").value];
  $("acIn").onclick = () => run(() => Cloud.signIn(...creds()));
  $("acUp").onclick = () => run(() => Cloud.signUp(...creds()));
  $("acG").onclick = () => run(() => Cloud.google());
  $("acForgot").onclick = () => run(async () => {
    const em = $("acEmail").value.trim();
    if (!em) throw { code: "auth/invalid-email" };
    await Cloud.reset(em);
    acctMessage("Password reset email sent. Check your inbox (and spam).", false);
  });
}

async function logout() {
  if (loggingOut) return;
  loggingOut = true;
  try {
    if (store.dirty) { // try to upload pending changes first
      try { await Cloud.push(cloudUser.uid, store.items); store.dirty = false; }
      catch (e) { if (!confirm("Some changes could not be uploaded (offline?). Log out anyway? They will be lost from this phone.")) return; }
    }
    await Cloud.signOut();
    store = { items: {}, owner: null, dirty: false }; // the data stays in the cloud account
    persist(); rebuild(); render();
    toast("Logged out");
  } finally { loggingOut = false; }
}

/* ---------- start ---------- */
render();

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
