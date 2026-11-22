/* =====================================================================
   PENNY PAL  -  app.js
   ---------------------------------------------------------------------
   The engine. You usually won't need to touch this file. Numbers and
   text live in config.js. If you do want to change a page, search
   for "PAGE:" to jump to each one.

   How it fits together:
     state        everything you've entered (saved in this browser)
     PAGES        one entry per page: render() returns its HTML
     ACT          what each button does   (data-act="name")
     FORM         what each form does     (data-form="name")
     CHG          what each dropdown/file input does (data-change="name")
     data-bind    inputs that save straight into state, like "tax.income"
   ===================================================================== */
(function () {
  "use strict";
  const C = window.CONFIG;
  const ICONS = window.ICONS || {};
  const KEY = "pocketLedger.canada.v1";

  /* ------------------------------------------------------------------
     Little helpers
     ------------------------------------------------------------------ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const f0 = new Intl.NumberFormat(C.locale, { style: "currency", currency: C.currency, maximumFractionDigits: 0 });
  const f2 = new Intl.NumberFormat(C.locale, { style: "currency", currency: C.currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (n) => f0.format(Math.round(n || 0)).replace("CA", "");
  const money2 = (n) => f2.format(n || 0).replace("CA", "");
  const short$ = (n) => { const a = Math.abs(n), s = n < 0 ? "-" : ""; return a >= 1e6 ? s + "$" + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M" : a >= 1000 ? s + "$" + Math.round(a / 1000) + "k" : s + "$" + Math.round(a); };
  const pct = (n, d = 1) => (Math.round(n * 100 * 10 ** d) / 10 ** d) + "%";
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parseISO = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const todayISO = () => toISO(today());
  const thisMonth = () => todayISO().slice(0, 7);
  const shiftMonth = (ym, n) => { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1); };
  const monthLabel = (ym, opts) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString(C.locale, opts || { month: "long", year: "numeric" }); };
  const dayLabel = (d) => d.toLocaleDateString(C.locale, { month: "short", day: "numeric" });
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  function addMonths(d, n, anchorDay) {
    const y = d.getFullYear(), m = d.getMonth() + n;
    const day = Math.min(anchorDay || d.getDate(), daysInMonth(y, m));
    return new Date(y, m, day);
  }
  const icon = (name, cls = "") => '<svg class="ic ' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS["circle-help"] || "") + "</svg>";
  const bubble = (name, color, size) => '<span class="bubble" style="background:color-mix(in srgb,' + color + ' 16%,transparent);color:' + color + (size ? ";width:" + size + "px;height:" + size + "px" : "") + '">' + icon(name) + "</span>";
  const PERIODS = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };
  const PERIOD_NAMES = { weekly: "Every week", biweekly: "Every 2 weeks", semimonthly: "Twice a month", monthly: "Once a month" };
  const GROUPS = { need: "Need", want: "Want", save: "Savings", income: "Income", transfer: "Moving money" };

  /* ------------------------------------------------------------------
     State: what gets saved
     ------------------------------------------------------------------ */
  function blankState() {
    return {
      v: 1, isExample: false,
      profile: { name: "", xp: 0, streak: 0, bestStreak: 0, lastCheckIn: null, quests: {}, badges: {}, lessons: {} },
      flags: {},
      categories: C.categories.map((c) => Object.assign({}, c, { budget: 0 })), // you set every budget yourself
      rules: C.autoRules.map(([match, cat]) => ({ match, cat })),
      transactions: [], subs: [], goals: [], accounts: [], netHistory: [], credit: [], reminders: [], dismissed: {},
      feed: { ticks: {}, history: {}, full: {}, coins: {}, lastYm: "" },
      efund: { needsPct: 100, wantsPct: 75 },
      tax: { income: 0, otherIncome: 0, payFrequency: "biweekly", withheldPerPay: 0, rrsp: 0, fhsa: 0, unionDues: 0, childcare: 0, rentPaid: 0 },
      retire: { age: 0, retireAge: 0, balance: 0, monthly: 0, lump: 0, rate: 6, inflation: C.retirement.inflation, account: "RRSP", cpp: C.retirement.cppMonthlyDefault, includeGov: true },
      house: { price: 0, saved: 0, monthlySave: 0, down: "min", firstTime: true, toronto: true, rate: 4.5, amort: 25, monthlyCosts: 0 },
      ui: { month: thisMonth(), theme: "", q: "", cat: "all", showTaxCal: true, retireView: "RRSP", celebrate: true, calm: false, palette: 2, seenVersion: C.version, setupDone: false, setupStep: 0 },
      path: { done: {}, custom: {}, skipped: {}, completed: {} },
      checkin: { answers: {}, done: null, rewarded: false },
      seenDefaults: { cats: C.categories.map((c) => c.id), rules: C.autoRules.map(ruleKey) }
    };
  }
  /* When config.js gets new default categories or auto-sort rules, add them to
     existing profiles too. "seenDefaults" remembers what each profile already got,
     so anything a person deleted or renamed is never brought back or overwritten. */
  function ruleKey(r) { return (Array.isArray(r) ? r[0] + "|" + r[1] : r.match + "|" + r.cat).toUpperCase(); }
  function syncDefaults(s, migrating) {
    const seen = s.seenDefaults || { cats: [], rules: [] };
    if (migrating) seen.cats = C.categories.map((c) => c.id); // older profiles: don't bring back categories they deleted
    const added = { cats: 0, rules: 0 };
    for (const c of C.categories) {
      if (seen.cats.includes(c.id)) continue;
      seen.cats.push(c.id);
      if (!s.categories.some((x) => x.id === c.id)) { s.categories.push(Object.assign({}, c, s.isExample ? {} : { budget: 0 })); added.cats++; }
    }
    const have = new Set(s.rules.map((r) => String(r.match).toUpperCase()));
    for (const r of C.autoRules) {
      const k = ruleKey(r);
      if (seen.rules.includes(k)) continue;
      seen.rules.push(k);
      // only add if the category exists and the person doesn't already have a rule for these words
      if (!have.has(r[0].toUpperCase()) && s.categories.some((c) => c.id === r[1])) { s.rules.push({ match: r[0], cat: r[1] }); have.add(r[0].toUpperCase()); added.rules++; }
    }
    s.seenDefaults = seen;
    return added;
  }
  let defaultsAdded = null;
  // Calm pastel palette (v2.1): move old bright default colours to their soft versions,
  // but leave any colour a person picked themselves.
  const PALETTE_V2 = {"#2b8a3e": "#5fae7c", "#d6699c": "#e39bbd", "#0c7b86": "#5aa9a2", "#e9a516": "#e3b45f", "#7a6ff0": "#9d94ea", "#3b82c4": "#7aa6d9", "#1f9254": "#5fae7c", "#d4413a": "#d98383", "#8a94a6": "#a3abbd", "#6b7fd7": "#9aa3e3", "#14918a": "#6cbab3", "#e0a526": "#e3b45f", "#c94f6d": "#dd8fa4", "#2f9e6e": "#6fb79a", "#b8860b": "#d1a95a", "#ef7d3c": "#eba277", "#d9534f": "#e08e8e", "#b55fd0": "#c59ad8", "#9a6b4b": "#b08e74", "#e05f8a": "#e39bb6", "#5f7d8c": "#8aa3b0", "#f2672e": "#eb9a78", "#7c3aed": "#ab8fe6", "#f6d062": "#f3dc9c"};
  function migratePalette(s) {
    if (s.ui && s.ui.palette === 2) return;
    for (const c of s.categories || []) { const k = String(c.color || "").toLowerCase(); if (PALETTE_V2[k]) c.color = PALETTE_V2[k]; }
    s.ui = s.ui || {}; s.ui.palette = 2;
  }

  function exampleState() {
    const s = blankState();
    s.isExample = true;
    s.categories = C.categories.map((c) => Object.assign({}, c)); // sample budgets, example only
    const t = today();
    const tx = [];
    const add = (d, desc, amount, cat, kind) => { if (d <= t) tx.push({ id: uid(), date: toISO(d), desc, amount, cat, kind: kind || "expense", example: true }); };
    for (let back = 2; back >= 0; back--) {
      const y = t.getFullYear(), m = t.getMonth() - back;
      const D = (day) => new Date(y, m, day);
      const wob = (n) => Math.round(n * (0.85 + ((back * 7 + n) % 30) / 100) * 100) / 100;
      add(D(1), "PAYROLL DEPOSIT ACME CORP", 2150, "pay", "income");
      add(D(15), "PAYROLL DEPOSIT ACME CORP", 2150, "pay", "income");
      add(D(1), "E-TRANSFER RENT", 1900, "rent");
      add(D(2), "PRESTO AUTOLOAD", 156, "transit");
      add(D(3), "TIM HORTONS #2231", wob(4.85), "coffee");
      add(D(4), "NO FRILLS #3121", wob(84.12), "groceries");
      add(D(6), "NETFLIX.COM", 18.99, "subs");
      add(D(8), "TORONTO HYDRO", wob(71.4), "utilities");
      add(D(9), "UBER EATS", wob(38.5), "dining");
      add(D(10), "SPOTIFY P1B2C3", 11.99, "subs");
      add(D(11), "LOBLAWS 1012", wob(112.4), "groceries");
      add(D(12), "ROGERS WIRELESS", 85, "phone");
      add(D(13), "STARBUCKS 4410", wob(6.45), "coffee");
      add(D(14), "TRANSFER TO TFSA", 300, "invest");
      add(D(15), "GOODLIFE FITNESS", 64.99, "health");
      add(D(16), "CINEPLEX YONGE-DUNDAS", wob(32), "fun");
      add(D(18), "FARM BOY", wob(46.75), "groceries");
      add(D(20), "AMAZON.CA", wob(64.99), "shopping");
      add(D(21), "TRANSFER TO SAVINGS", 200, "emergency");
      add(D(23), "LCBO #217", wob(41.2), "fun");
      add(D(25), "PAI NORTHERN THAI", wob(54), "dining");
      add(D(27), "NO FRILLS #3121", wob(92.3), "groceries");
    }
    s.transactions = tx;
    const nextOn = (day) => { let d = new Date(t.getFullYear(), t.getMonth(), day); if (d < t) d = addMonths(d, 1, day); return toISO(d); };
    s.subs = [
      { id: uid(), name: "Netflix", amount: 18.99, cycle: "monthly", next: nextOn(6), icon: "film", status: "keep", example: true },
      { id: uid(), name: "Spotify", amount: 11.99, cycle: "monthly", next: nextOn(10), icon: "music", status: "keep", example: true },
      { id: uid(), name: "Rogers phone", amount: 85, cycle: "monthly", next: nextOn(12), icon: "smartphone", status: "negotiate", example: true },
      { id: uid(), name: "GoodLife Fitness", amount: 64.99, cycle: "monthly", next: nextOn(15), icon: "dumbbell", status: "thinking", example: true },
      { id: uid(), name: "Amazon Prime", amount: 99, cycle: "yearly", next: toISO(addMonths(t, 4)), icon: "shopping-bag", status: "keep", example: true }
    ];
    s.goals = [
      { id: uid(), name: "Japan trip", icon: "plane", theme: 0, target: 5000, saved: 1650, date: toISO(addMonths(t, 10)), account: "TFSA", photo: null, history: [], example: true },
      { id: uid(), name: "First home down payment", icon: "key-round", theme: 2, target: 75000, saved: 12400, date: toISO(addMonths(t, 48)), account: "FHSA", photo: null, history: [], example: true },
      { id: uid(), name: "Emergency fund", icon: "umbrella", theme: 4, target: 9000, saved: 3600, date: toISO(addMonths(t, 14)), account: "HISA", photo: null, history: [], example: true }
    ];
    s.accounts = [
      { id: uid(), name: "Chequing", type: "chequing", balance: 2340, example: true },
      { id: uid(), name: "EQ Bank savings", type: "savings", balance: 3600, example: true },
      { id: uid(), name: "TFSA", type: "tfsa", balance: 8750, example: true },
      { id: uid(), name: "FHSA", type: "fhsa", balance: 12400, example: true },
      { id: uid(), name: "Work RRSP", type: "rrsp", balance: 6200, example: true },
      { id: uid(), name: "Visa", type: "cc", balance: 840, example: true },
      { id: uid(), name: "OSAP", type: "osap", balance: 9800, example: true }
    ];
    const nets = [16100, 17350, 18900, 19700, 21450, 23250];
    s.netHistory = nets.map((n, i) => ({ ym: shiftMonth(thisMonth(), i - 5), net: n, example: true }));
    s.credit = [
      { date: toISO(addMonths(t, -4)), score: 702, example: true },
      { date: toISO(addMonths(t, -2)), score: 718, example: true },
      { date: toISO(t), score: 731, example: true }
    ];
    s.tax = { income: 68000, otherIncome: 0, payFrequency: "semimonthly", withheldPerPay: 370, rrsp: 2000, fhsa: 8000, unionDues: 0, childcare: 0, rentPaid: 22800 };
    s.retire = Object.assign(s.retire, { age: 28, retireAge: 65, balance: 6200, monthly: 250, lump: 0 });
    s.house = Object.assign(s.house, { price: 750000, saved: 12400, monthlySave: 900, monthlyCosts: 650 });
    return s;
  }

  let state, freshVisit = false;
  // Example data must never mix with someone's real data: strip anything that came with the example
  function purgeExample(s) {
    if (!s || s.isExample) return 0;
    let n = 0;
    for (const k of ["transactions", "subs", "goals", "accounts", "netHistory", "credit", "reminders"]) {
      if (!Array.isArray(s[k])) continue;
      const keep = s[k].filter((x) => !(x && x.example === true)); n += s[k].length - keep.length; s[k] = keep;
    }
    const t = s.tax || {};
    if (t.income === 68000 && t.withheldPerPay === 370 && t.rentPaid === 22800 && t.fhsa === 8000) { s.tax = blankState().tax; n++; }
    const r = s.retire || {};
    if (r.age === 28 && r.balance === 6200 && r.monthly === 250) { s.retire = blankState().retire; n++; }
    const h = s.house || {};
    if (h.saved === 12400 && h.monthlySave === 900) { s.house = blankState().house; n++; }
    return n;
  }
  function clearMadeUpDefaults(s) {
    if (!s || s.isExample || (s.flags && s.flags.zeroDefaults)) return;
    s.flags = s.flags || {}; s.flags.zeroDefaults = true;
    const def = {}; C.categories.forEach((c) => { def[c.id] = c.budget; });
    (s.categories || []).forEach((c) => { if (!c.touched && def[c.id] !== undefined && +c.budget === +def[c.id]) c.budget = 0; });
    const r = s.retire || {};
    if (r.age === 28 && r.retireAge === 65 && r.monthly === 200) Object.assign(r, { age: 0, retireAge: 0, monthly: 0 });
    const h = s.house || {};
    if (h.price === 750000 && h.monthlySave === 800) Object.assign(h, { price: 0, monthlySave: 0, monthlyCosts: h.monthlyCosts === 650 ? 0 : h.monthlyCosts });
  }
  function movePass(s) {
    if (s && !s.isExample && s.flags && s.flags.movePass && !s.flags.cardPass && (s.categories || []).some((c) => c.id === "transfer")) {
      s.flags.cardPass = true;
      (s.transactions || []).forEach((t) => { if (!t.recatOn && !t.example && t.cat !== "transfer" && CARD_PAY_RX.test(String(t.desc || "")) && !/CASH ?BACK|REWARD|INTEREST|FEE\b/i.test(String(t.desc || ""))) t.cat = "transfer"; });
    }
    if (!s || s.isExample || (s.flags && s.flags.movePass)) return;
    s.flags = s.flags || {}; s.flags.cardPass = true;
    if (!(s.categories || []).some((c) => c.id === "transfer")) return;
    s.flags = s.flags || {}; s.flags.movePass = true;
    const me = String((s.profile && s.profile.name) || "").trim().split(/\s+/)[0];
    (s.transactions || []).forEach((t) => {
      if (t.recatOn || t.example) return;
      const d = String(t.desc || "");
      const own = me && me.length >= 3 && /E-?TRANSFER|E-?TFR|TRANSFER|TFR/i.test(d) && new RegExp("\\b" + me.replace(/[^a-z]/gi, "") + "\\b", "i").test(d);
      if (own || TRANSFER_RX.test(d) || (CARD_PAY_RX.test(d) && !/CASH ?BACK|REWARD|INTEREST|FEE\b/i.test(d))) t.cat = "transfer";
      else if (t.kind === "income" && (t.cat === "pay" || t.cat === "other") && ETRANSFER_IN.test(d) && !/PAYROLL|SALARY|DIRECT DEP/i.test(d)) t.cat = "payback";
    });
  }
  function travelPass(s) {
    if (!s || s.isExample || (s.flags && s.flags.travelPass)) return;
    if (!(s.categories || []).some((c) => c.id === "travel")) return;
    s.flags = s.flags || {}; s.flags.travelPass = true;
    (s.transactions || []).forEach((t) => { if (t.kind === "expense" && !t.recatOn && t.cat !== "travel" && looksForeign(t.desc)) t.cat = "travel"; });
  }
  function normalize(saved) {
    const base = blankState(), migrating = !saved.seenDefaults;
    purgeExample(saved); clearMadeUpDefaults(saved);
        if (migrating) saved.seenDefaults = { cats: [], rules: [] };
        for (const k of Object.keys(base)) if (saved[k] === undefined) saved[k] = base[k];
        defaultsAdded = syncDefaults(saved, migrating); travelPass(saved); movePass(saved);
        migratePalette(saved);
        if (!saved.ui || !saved.ui.seenVersion) { saved.ui = saved.ui || {}; saved.ui.seenVersion = "1"; }
        if (saved.ui.setupDone === undefined) saved.ui.setupDone = !saved.isExample; // people from older versions already set things up
        for (const k of ["profile", "tax", "retire", "house", "ui", "path", "checkin"]) saved[k] = Object.assign(base[k], saved[k]);
        return saved;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* blocked or broken storage: start fresh */ }
    freshVisit = true;
    return exampleState();
  }
  let saveWarned = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); saveWarned = false; if (typeof syncChanged === "function") syncChanged(); }
    catch (e) { if (!saveWarned) { toast(icon("triangle-alert") + " Couldn't save. Your browser storage may be full. Try removing a goal photo."); saveWarned = true; } }
  }

  /* ------------------------------------------------------------------
     Lookups
     ------------------------------------------------------------------ */
  const OTHER = { id: "other", name: "Other", icon: "circle-help", color: "#a3abbd", group: "want", budget: 0 };
  const catById = (id) => state.categories.find((c) => c.id === id) || OTHER;
  const acctType = (id) => C.accountTypes.find((a) => a.id === id) || C.accountTypes[0];
  const realOnly = (arr) => arr.filter((x) => !x.example);

  /* ------------------------------------------------------------------
     Game layer: XP, levels, streaks, quests, badges
     ------------------------------------------------------------------ */
  function levelIndex(xp) { let i = 0; C.levels.forEach((l, k) => { if (xp >= l.xp) i = k; }); return i; }
  function levelInfo() {
    const xp = state.profile.xp, i = levelIndex(xp), cur = C.levels[i], next = C.levels[i + 1];
    return { n: i + 1, name: cur.name, xp, into: xp - cur.xp, need: next ? next.xp - cur.xp : 0, next };
  }
  function award(n, why, quiet) {
    if (!n) return;
    const before = levelIndex(state.profile.xp);
    state.profile.xp += n;
    if (!quiet) toast('<span class="xp">+' + n + " XP</span> " + esc(why));
    const after = levelIndex(state.profile.xp);
    if (after > before) setTimeout(() => celebrate("level", { title: "Level " + (after + 1) + "!", sub: "You're now a " + C.levels[after].name + ". Keep it up!" }), 700);
  }
  function checkIn() {
    const p = state.profile, t = todayISO();
    if (p.lastCheckIn === t) return;
    const y = toISO(new Date(today().getTime() - 86400000));
    p.streak = p.lastCheckIn === y ? p.streak + 1 : 1;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    p.lastCheckIn = t;
    p.checkins = (p.checkins || []).concat(t).slice(-60);
    award(C.xp.dailyCheckIn, p.streak > 1 ? "Day " + p.streak + " streak" : "Daily check-in");
  }
  /* Weekly quests: a fresh set every Monday */
  function mondayOf(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function weekHelper() {
    const start = mondayOf(today()), end = new Date(start.getTime() + 6 * 86400000);
    const a = toISO(start), b = toISO(end);
    return {
      start, end, key: a,
      has: (d) => !!d && String(d).slice(0, 10) >= a && String(d).slice(0, 10) <= b,
      noSpendDays(s) {
        let n = 0;
        for (let d = new Date(start); d < today(); d.setDate(d.getDate() + 1)) {
          const iso = toISO(d);
          if (!s.transactions.some((t) => !t.example && t.kind === "expense" && t.date === iso)) n++;
        }
        return n;
      }
    };
  }
  function seededPick(key, pool, n, exclude) {
    let h = 2166136261; for (const ch of key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
    const ids = pool.map((q) => q.id).filter((id) => !(exclude || []).includes(id));
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    return ids.slice(0, n);
  }
  function rollWeek() {
    const p = state.profile, W = weekHelper(), old = p.weekly;
    if (old && old.key === W.key) return;
    const lastMonday = toISO(new Date(W.start.getTime() - 7 * 86400000));
    if (!(old && old.key === lastMonday && old.bonus)) p.weeklyStreak = 0;
    p.weekly = { key: W.key, ids: seededPick(W.key, C.weeklyQuests, C.weeklyPerWeek, old ? old.ids : []), done: {}, bonus: false, swaps: 0 };
  }
  const weeklyDef = (id) => C.weeklyQuests.find((q) => q.id === id);
  function weeklyProgress(q) { try { const [cur, target] = q.progress(state, weekHelper()); return { cur: +cur || 0, target: +target || 1 }; } catch (e) { return { cur: 0, target: 1 }; } }
  function evalWeekly() {
    rollWeek();
    const p = state.profile, wk = p.weekly;
    for (const id of wk.ids) {
      const q = weeklyDef(id); if (!q || wk.done[id]) continue;
      const pr = weeklyProgress(q);
      if (pr.cur >= pr.target) { wk.done[id] = todayISO(); award(q.xp, "Weekly quest: " + q.title); }
    }
    if (!wk.bonus && wk.ids.length && wk.ids.every((id) => wk.done[id])) {
      wk.bonus = true; p.weeklyWins = (p.weeklyWins || 0) + 1; p.weeklyStreak = (p.weeklyStreak || 0) + 1;
      p.bestWeeklyStreak = Math.max(p.bestWeeklyStreak || 0, p.weeklyStreak);
      award(C.weeklyBonusXp, "Perfect week! All weekly quests done"); celebrate("weekly");
    }
  }
  /* Money path: the step-by-step checklist */
  // Safety net: what a month of "life goes on" costs = needs% of needs + wants% of wants
  function efPlan() {
    const E = state.efund || { needsPct: 100, wantsPct: 75 };
    const np = Math.max(0, Math.min(200, num(E.needsPct))), wp = Math.max(0, Math.min(200, num(E.wantsPct)));
    let needs = state.categories.filter((c) => c.group === "need").reduce((a, c) => a + num(c.budget), 0);
    let wants = state.categories.filter((c) => c.group === "want").reduce((a, c) => a + num(c.budget), 0);
    let source = "budgets";
    if (needs + wants <= 0) { // no budgets yet: use the average of the last 3 months of spending
      const months = [1, 2, 3].map((i) => monthStats(shiftMonth(thisMonth(), -i)));
      const avg = (grp) => months.reduce((a, m) => a + state.categories.filter((c) => c.group === grp).reduce((x, c) => x + (m.byCat[c.id] || 0), 0), 0) / 3;
      needs = avg("need"); wants = avg("want"); source = needs + wants > 0 ? "spending" : "none";
    }
    const monthly = needs * np / 100 + wants * wp / 100;
    const real = state.accounts.filter((a) => !a.example);
    const efGoals = state.goals.filter((g) => !g.example && (g.icon === "umbrella" || /emergenc|safety|rainy/i.test(g.name))).reduce((a, g) => a + num(g.saved), 0);
    const savings = real.filter((a) => a.type === "savings").reduce((a, x) => a + num(x.balance), 0);
    const saved = Math.max(efGoals, savings);
    return { np, wp, needs, wants, monthly, saved, months: monthly > 0 ? saved / monthly : 0, source, fromGoal: efGoals >= savings && efGoals > 0 };
  }
  function efundCard(compact) {
    const P = efPlan();
    const pctBox = (key, val) => '<span class="money-in pct-in"><input type="number" min="0" max="200" step="5" value="' + val + '" data-change="efPct" data-k="' + key + '" aria-label="Percent"></span>';
    if (P.source === "none") return '<div class="card stack ef-card"><h2>🛟 Your safety net</h2><p class="small">Penny works this out from your budgets. Add your monthly <b>needs</b> (rent, groceries, bills) and <b>wants</b> on <a href="#budgets">Budget Trough</a> and this fills in.</p></div>';
    const rows = [[3, "3 months"], [6, "6 months"], [12, "1 year"]].map(([n, label]) => {
      const target = P.monthly * n, pct = target ? Math.min(1, P.saved / target) : 0, done = P.saved >= target && target > 0;
      return '<div class="ef-row"><div class="row between small"><b>' + (done ? "✅ " : "") + label + "</b><span>" + money(target) + (done ? "" : ' <span class="muted">· ' + money(Math.max(0, target - P.saved)) + " to go</span>") + "</span></div>" + bar(pct, true) +
        '<button class="btn ' + (done ? "ghost" : "soft") + ' sm" data-act="efGoal" data-n="' + n + '">' + (state.goals.some((g) => !g.example && /emergenc/i.test(g.name)) ? "Set my goal to " : "Make a goal for ") + label + "</button></div>";
    }).join("");
    return '<div class="card stack ef-card"><div class="card-head"><h2>🛟 Your safety net</h2>' + (P.saved > 0 ? '<span class="pill save">Lasts about ' + (P.months >= 10 ? Math.round(P.months) : P.months.toFixed(1)) + " months</span>" : "") + "</div>" +
      '<p class="small">If your income stopped, a month of life would cost about <b>' + money(P.monthly) + "</b>.</p>" +
      '<div class="ef-mix small"><span>' + pctBox("needsPct", P.np) + "% of needs <b>" + money(P.needs) + '</b></span><span class="muted">+</span><span>' + pctBox("wantsPct", P.wp) + "% of wants <b>" + money(P.wants) + "</b></span></div>" +
      (P.source === "spending" ? '<p class="tiny muted">You haven\'t set budgets yet, so Penny used your average spending from the last 3 months.</p>' : "") +
      (compact ? "" : '<p class="tiny muted">Needs are things you can\'t skip. Penny counts 75% of wants because you\'d likely cut back a little in a tough month. Change either percent to suit you.</p>') +
      '<div class="ef-rows">' + rows + "</div>" +
      '<p class="small">' + (P.saved > 0 ? "You have <b>" + money(P.saved) + "</b> set aside (" + (P.fromGoal ? "your emergency fund goal" : "your savings accounts") + "). That would last about <b>" + (P.months >= 10 ? Math.round(P.months) : P.months.toFixed(1)) + " months</b>." : "Nothing set aside yet. Add a savings account on The Pig Picture, or make a goal below.") + "</p></div>";
  }
  function pathHelpers() {
    const real = state.accounts.filter((a) => !a.example);
    const needs = state.categories.filter((c) => c.group === "need").reduce((a, c) => a + num(c.budget), 0);
    const efGoals = state.goals.filter((g) => !g.example && (g.icon === "umbrella" || /emergenc|safety|rainy/i.test(g.name))).reduce((a, g) => a + num(g.saved), 0);
    const savings = real.filter((a) => a.type === "savings").reduce((a, x) => a + num(x.balance), 0);
    return {
      needs, emergency: Math.max(efGoals, savings), efMonthly: efPlan().monthly,
      highDebt: real.filter((a) => a.type === "cc" || a.type === "loc").reduce((a, x) => a + num(x.balance), 0),
      debtsListed: real.filter((a) => acctType(a.type).kind === "debt").length,
      realTx: state.transactions.filter((t) => !t.example).length,
      has: (type) => real.some((a) => a.type === type)
    };
  }
  const pathKey = (step, item) => step + "." + item;
  function pathItems(step) { return step.items.concat(((state.path.custom || {})[step.id] || []).map((c) => Object.assign({ custom: true }, c))); }
  function itemState(step, item, H) {
    let auto = false; if (item.auto) { try { auto = !!item.auto(state, H); } catch (e) { auto = false; } }
    return { auto, done: auto || !!state.path.done[pathKey(step.id, item.id)] };
  }
  function stepStatus(step, H) {
    if (state.path.skipped[step.id]) return { done: true, skipped: true, n: 0, of: 0 };
    const items = pathItems(step).filter((it) => !it.bonus), st = items.map((it) => itemState(step, it, H));
    const n = st.filter((x) => x.done).length;
    return { done: items.length > 0 && n === items.length, n, of: items.length };
  }
  function evalPath() {
    const H = pathHelpers(), fresh = [];
    state.path.bonusDone = state.path.bonusDone || {};
    for (const step of C.moneyPath) for (const it of step.items) {
      if (!it.bonus) continue;
      const k = pathKey(step.id, it.id);
      if (!state.path.bonusDone[k] && itemState(step, it, H).done) {
        state.path.bonusDone[k] = todayISO();
        award(C.pathBonusXp || 50, "Bonus: " + it.text);
        setTimeout(() => celebrate("milestone", { title: "Bonus unlocked! ⭐", sub: it.text + ". You're a saving superstar!" }), 300);
      }
    }
    for (const step of C.moneyPath) {
      const st = stepStatus(step, H);
      if (st.done && !st.skipped && !state.path.completed[step.id]) { state.path.completed[step.id] = todayISO(); fresh.push(step); }
    }
    if (fresh.length) {
      award(C.pathStepXp * fresh.length, fresh.length === 1 ? "Piggy Quest: " + fresh[0].title : fresh.length + " Piggy Quests done");
      setTimeout(() => celebrate("step", fresh.length === 1 ? { emoji: fresh[0].emoji, title: "Step complete!", sub: fresh[0].title } : { title: "You've already done " + fresh.length + " steps!", sub: "Look at you. Way ahead of the game." }), 250);
    }
  }
  function evaluate() {
    const p = state.profile;
    if (!state.isExample) coverBills();
    try { evalFeed(); } catch (e) { /* never let Penny's belly break the app */ }
    evalWeekly();
    evalPath();
    for (const q of C.quests) {
      if (p.quests[q.id]) continue;
      let ok = false; try { ok = !!q.check(state); } catch (e) { ok = false; }
      if (ok) { p.quests[q.id] = todayISO(); award(q.xp, "Quest done: " + q.title); }
    }
    const lv = levelIndex(p.xp) + 1;
    for (const b of C.badges) {
      if (p.badges[b.id]) continue;
      let ok = false; try { ok = !!b.check(state, C, lv); } catch (e) { ok = false; }
      if (ok) { p.badges[b.id] = todayISO(); toast(icon("award") + " Badge unlocked: <b>" + esc(b.name) + "</b>"); burst(["🏅", "✨", "⭐"]); }
    }
    renderTop();
  }

  /* ------------------------------------------------------------------
     Money math: budgets
     ------------------------------------------------------------------ */
  function monthStats(ym) {
    const tx = state.transactions.filter((t) => t.date.startsWith(ym));
    const byCat = {};
    let income = 0, spent = 0, savedTx = 0, paidBack = 0, moved = 0;
    for (const t of tx) {
      const c = catById(t.cat);
      if (c.group === "transfer") { moved += +t.amount; continue; }      // your own money moving: not spending, not income
      if (t.kind === "income" && c.offset) { paidBack += +t.amount; continue; } // a friend paying you back: lowers spending
      if (t.kind === "income") { income += +t.amount; continue; }
      byCat[c.id] = (byCat[c.id] || 0) + +t.amount;
      if (c.group === "save") savedTx += +t.amount; else spent += +t.amount;
    }
    let goalIn = 0;
    for (const g of state.goals) for (const h of g.history || []) if (h.date.startsWith(ym)) goalIn += +h.amount;
    spent = Math.max(0, spent - paidBack);
    return { tx, byCat, income, spent, saved: savedTx + goalIn, savedTx, goalIn, paidBack, moved };
  }
  // Which budget category a bill belongs to (phone bills to Phone & internet, gym to Health and so on)
  function billCat(sub) {
    if (sub.cat && state.categories.some((c) => c.id === sub.cat)) return sub.cat;
    const n = String(sub.name || "") + " " + String(sub.icon || "");
    const guess = /rogers|bell|telus|fido|koodo|freedom|virgin|public mobile|chatr|phone|mobile|wireless|internet|wifi|smartphone/i.test(n) ? "phone" :
      /insur|policy|shield/i.test(n) ? "insurance" : /hydro|enbridge|electric|water|utilit|zap|droplet/i.test(n) ? "utilities" :
      /rent|landlord|mortgage/i.test(n) ? "rent" : /goodlife|gym|fit|yoga|dumbbell|physio|dental|pharm/i.test(n) ? "health" : /presto|ttc|transit|parking/i.test(n) ? "transit" : "subs";
    return state.categories.some((c) => c.id === guess) ? guess : state.categories.some((c) => c.id === "subs") ? "subs" : "other";
  }
  function billsFor(catId) { return state.subs.filter((x) => x.status !== "cancelled" && billCat(x) === catId); }
  function billsMonthly(catId) { return billsFor(catId).reduce((a, x) => a + monthlyCost(x), 0); }
  // A category's plan always covers the bills in it, so the budget matches what you entered in Bills
  function coverBills() {
    for (const c of state.categories) {
      if (c.group === "income") continue;
      const need = Math.ceil(billsMonthly(c.id));
      if (need > (+c.budget || 0)) { c.budget = need; c.fromBills = true; }
    }
  }
  // Every category in one dropdown, grouped. Picking a "Money in" category makes the row money in.
  function catOptions(sel) {
    const groups = [["need", "Needs"], ["want", "Wants"], ["save", "Savings"], ["income", "Money in"], ["transfer", "Moving money"]];
    return groups.map(([g, label]) => { const cs = state.categories.filter((c) => c.group === g); return cs.length ? '<optgroup label="' + label + '">' + cs.map((c) => '<option value="' + c.id + '"' + (c.id === sel ? " selected" : "") + ">" + esc(c.name) + "</option>").join("") + "</optgroup>" : ""; }).join("") +
      '<option value="other"' + (sel === "other" ? " selected" : "") + ">Other</option>";
  }
  const kindForCat = (id, fallback) => { const c = state.categories.find((x) => x.id === id); return c ? (c.group === "transfer" ? fallback : c.group === "income" ? "income" : "expense") : fallback; };
  function budgetTotals() {
    const g = { need: 0, want: 0, save: 0 };
    for (const c of state.categories) if (g[c.group] !== undefined) g[c.group] += +c.budget || 0;
    return g;
  }

  /* ------------------------------------------------------------------
     Money math: Canadian + Ontario income tax
     ------------------------------------------------------------------ */
  function bracketTax(x, brackets) {
    let tax = 0, prev = 0;
    for (const [top, rate] of brackets) { if (x > prev) tax += (Math.min(x, top) - prev) * rate; prev = top; }
    return tax;
  }
  // Ontario Health Premium (set in law, not indexed)
  function healthPremium(ti) {
    if (ti <= 20000) return 0;
    if (ti <= 36000) return Math.min(300, (ti - 20000) * 0.06);
    if (ti <= 48000) return Math.min(450, 300 + (ti - 36000) * 0.06);
    if (ti <= 72000) return Math.min(600, 450 + (ti - 48000) * 0.25);
    if (ti <= 200000) return Math.min(750, 600 + (ti - 72000) * 0.25);
    return Math.min(900, 750 + (ti - 200000) * 0.25);
  }
  function taxFor(p) {
    const T = C.tax, F = T.federal, O = T.ontario;
    const emp = Math.max(0, num(p.income)), other = Math.max(0, num(p.otherIncome));
    const pensionable = Math.max(0, Math.min(emp, T.cpp.ympe) - T.cpp.exemption);
    const cpp1 = pensionable * T.cpp.rate, cppBase = pensionable * T.cpp.baseRate, cppEnhanced = cpp1 - cppBase;
    const cpp2 = Math.max(0, Math.min(emp, T.cpp.yampe) - T.cpp.ympe) * T.cpp.cpp2Rate;
    const ei = Math.min(emp, T.ei.maxInsurable) * T.ei.rate;
    const deductions = num(p.rrsp) + num(p.fhsa) + num(p.unionDues) + num(p.childcare) + cppEnhanced + cpp2;
    const taxable = Math.max(0, emp + other - deductions);
    const bpa = F.basicPersonalMax - (F.basicPersonalMax - F.basicPersonalMin) * clamp((taxable - F.bpaPhaseStart) / (F.bpaPhaseEnd - F.bpaPhaseStart), 0, 1);
    const fedCredits = (bpa + Math.min(F.canadaEmploymentAmount, emp) + cppBase + ei) * F.creditRate;
    const fed = Math.max(0, bracketTax(taxable, F.brackets) - fedCredits);
    const onBasic = Math.max(0, bracketTax(taxable, O.brackets) - (O.basicPersonal + cppBase + ei) * O.creditRate);
    let on = onBasic;
    for (const [threshold, rate] of O.surtax) on += Math.max(0, onBasic - threshold) * rate;
    on = Math.max(0, on - Math.max(0, 2 * O.lowIncomeReduction - on));
    const ohp = healthPremium(taxable);
    return { emp, other, cpp: cpp1 + cpp2, ei, taxable, fed, on, ohp, total: fed + on + ohp };
  }
  function calcTax(t) {
    t = t || state.tax;
    const base = taxFor(t);
    const noAccounts = taxFor(Object.assign({}, t, { rrsp: 0, fhsa: 0 }));
    const plus1k = taxFor(Object.assign({}, t, { rrsp: num(t.rrsp) + 1000 }));
    const bump = taxFor(Object.assign({}, t, { otherIncome: num(t.otherIncome) + 1000 }));
    const periods = PERIODS[t.payFrequency] || 26;
    const gross = base.emp + base.other;
    const withheld = num(t.withheldPerPay) * periods;
    const takeHome = gross - base.total - base.cpp - base.ei - num(t.unionDues);
    return Object.assign(base, {
      gross, periods, withheld, refund: withheld - base.total,
      saved: noAccounts.total - base.total, per1k: base.total - plus1k.total,
      marginal: (bump.total - base.total) / 1000, avg: gross ? base.total / gross : 0,
      takeHome, takeHomeMonth: takeHome / 12, takeHomePay: takeHome / periods,
      rrspRoomNext: Math.min(base.emp * C.limits.rrspPercent, C.limits.rrspMax)
    });
  }
  const marginalGuess = () => (state.tax.income > 0 ? calcTax().per1k / 1000 : 0.2965);

  /* ------------------------------------------------------------------
     Money math: retirement growth
     ------------------------------------------------------------------ */
  function project(r) {
    const years = Math.max(0, Math.round(num(r.retireAge) - num(r.age)));
    const mr = Math.pow(1 + num(r.rate) / 100, 1 / 12) - 1;
    let bal = num(r.balance) + num(r.lump), put = bal;
    const pts = [{ age: num(r.age), bal, put }];
    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) { bal = bal * (1 + mr) + num(r.monthly); put += num(r.monthly); }
      pts.push({ age: num(r.age) + y, bal, put });
    }
    const infl = Math.pow(1 + num(r.inflation) / 100, years);
    const marg = marginalGuess();
    const yearlyRefund = num(r.monthly) * 12 * marg + 0;
    let refundsGrown = num(r.lump) * marg * Math.pow(1 + num(r.rate) / 100, years);
    for (let y = 1; y <= years; y++) refundsGrown += yearlyRefund * Math.pow(1 + num(r.rate) / 100, years - y);
    const lumpOnly = num(r.lump) * Math.pow(1 + mr, years * 12);
    return { years, pts, final: bal, put, growth: bal - put, real: bal / infl, infl, marg, yearlyRefund, refundsGrown, refundsReal: refundsGrown / infl, lumpOnly, lumpReal: lumpOnly / infl };
  }

  /* ------------------------------------------------------------------
     Money math: buying a home in Ontario / Toronto
     ------------------------------------------------------------------ */
  function mortgagePayment(loan, ratePct, years) {
    const j = Math.pow(1 + ratePct / 100 / 2, 1 / 6) - 1; // Canadian mortgages compound twice a year
    const n = years * 12;
    return j ? loan * j / (1 - Math.pow(1 + j, -n)) : loan / n;
  }
  function houseCalc(h) {
    const H = C.home, P = Math.max(0, num(h.price));
    const minDown = P <= 500000 ? P * 0.05 : P < H.insuredMaxPrice ? 25000 + (P - 500000) * 0.10 : P * 0.20;
    const down = h.down === "min" ? minDown : Math.max(minDown, P * num(h.down) / 100);
    const downPct = P ? down / P : 0;
    let cmhcRate = 0;
    if (downPct < 0.2 - 1e-9 && P < H.insuredMaxPrice) for (const [atLeast, rate] of H.cmhc) if (downPct >= atLeast - 1e-9) cmhcRate = rate;
    const cmhc = (P - down) * cmhcRate, cmhcPST = cmhc * H.pstOnInsurance;
    const loan = P - down + cmhc;
    const ltt = bracketTax(P, H.ontarioLTT), lttRebate = h.firstTime ? Math.min(ltt, H.ontarioFirstTimeRebate) : 0;
    const mltt = h.toronto ? bracketTax(P, H.torontoMLTT) : 0, mlttRebate = h.toronto && h.firstTime ? Math.min(mltt, H.torontoFirstTimeRebate) : 0;
    const closing = H.otherClosingCosts + cmhcPST + ltt - lttRebate + mltt - mlttRebate;
    const cash = down + closing;
    const gap = Math.max(0, cash - num(h.saved));
    const months = gap <= 0 ? 0 : num(h.monthlySave) > 0 ? Math.ceil(gap / num(h.monthlySave)) : Infinity;
    const pay = mortgagePayment(loan, num(h.rate), num(h.amort));
    const qRate = Math.max(num(h.rate) + 2, 5.25);
    const qPay = mortgagePayment(loan, qRate, num(h.amort));
    const incomeNeeded = (qPay + num(h.monthlyCosts)) * 12 / 0.39;
    return { P, minDown, down, downPct, cmhcRate, cmhc, cmhcPST, loan, ltt, lttRebate, mltt, mlttRebate, closing, cash, gap, months, pay, qRate, qPay, incomeNeeded, monthlyAll: pay + num(h.monthlyCosts) };
  }

  /* ------------------------------------------------------------------
     Subscriptions + reminders
     ------------------------------------------------------------------ */
  const CYCLES = { weekly: ["Weekly", 52 / 12], biweekly: ["Every 2 weeks", 26 / 12], monthly: ["Monthly", 1], quarterly: ["Every 3 months", 1 / 3], yearly: ["Yearly", 1 / 12] };
  const monthlyCost = (s) => num(s.amount) * (CYCLES[s.cycle] || CYCLES.monthly)[1];
  function advance(d, cycle, anchor) {
    if (cycle === "weekly") return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
    if (cycle === "biweekly") return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 14);
    if (cycle === "quarterly") return addMonths(d, 3, anchor);
    if (cycle === "yearly") return addMonths(d, 12, anchor);
    return addMonths(d, 1, anchor);
  }
  function nextCharge(s) {
    let d = parseISO(s.next || todayISO()); const anchor = d.getDate(), t = today();
    for (let i = 0; d < t && i < 600; i++) d = advance(d, s.cycle, anchor);
    return d;
  }
  function upcoming(days) {
    const t = today(), end = new Date(t.getTime() + days * 86400000), out = [];
    if (state.ui.showTaxCal) {
      for (let y = t.getFullYear(); y <= end.getFullYear(); y++) for (const [m, d, text] of C.calendar) {
        const dt = new Date(y, m - 1, d), key = "cal-" + toISO(dt);
        if (dt >= t && dt <= end) out.push({ key, date: dt, text, kind: "Money calendar", icon: "landmark", done: !!state.dismissed[key] });
      }
    }
    for (const s of state.subs) {
      if (s.status === "cancelled") continue;
      let d = nextCharge(s); const anchor = parseISO(s.next).getDate();
      for (let i = 0; d <= end && i < 60; i++) {
        const key = "sub-" + s.id + "-" + toISO(d);
        out.push({ key, date: d, text: s.name + " charges " + money2(s.amount), kind: "Bill", icon: s.icon || "repeat", done: !!state.dismissed[key] });
        if (days < 100) break;
        d = advance(d, s.cycle, anchor);
      }
    }
    for (const g of state.goals) if (g.date) {
      const d = parseISO(g.date);
      if (d >= t && d <= end) out.push({ key: "goal-" + g.id, date: d, text: "Target date for \"" + g.name + "\"", kind: "Goal", icon: "target", done: g.saved >= g.target });
    }
    for (const r of state.reminders) {
      const base = parseISO(r.date), anchor = base.getDate();
      if (r.repeat === "none") {
        if ((base >= t || !r.done) && base <= end) out.push({ key: "rem-" + r.id, id: r.id, date: base, text: r.text, kind: "Reminder", icon: "bell", done: !!r.done, custom: true });
        continue;
      }
      let d = base;
      for (let i = 0; d < t && i < 600; i++) d = r.repeat === "yearly" ? addMonths(d, 12, anchor) : addMonths(d, 1, anchor);
      for (let i = 0; d <= end && i < 24; i++) {
        const key = "rem-" + r.id + "-" + toISO(d);
        out.push({ key, id: r.id, date: d, text: r.text, kind: r.repeat === "yearly" ? "Every year" : "Every month", icon: "bell", done: !!state.dismissed[key], custom: true });
        d = r.repeat === "yearly" ? addMonths(d, 12, anchor) : addMonths(d, 1, anchor);
      }
    }
    return out.sort((a, b) => a.date - b.date);
  }
  // Finds charges that repeat about once a month for a similar amount
  /* Recurring charges: find what repeats every month and link payments to your bills */
  const KNOWN_SUBS = /netflix|spotify|disney|crave|apple\.com\/bill|apple ?music|icloud|google ?(storage|one)|youtube|amazon ?prime|prime ?video|audible|patreon|adobe|microsoft|xbox|playstation|nintendo|chatgpt|openai|dropbox|canva|duolingo|rogers|bell (canada|mobility)?|telus|fido|koodo|freedom mobile|virgin plus|public mobile|goodlife|fit4less|planet fitness|anytime fitness|uber ?one|doordash ?pass|skip ?plus|paramount|hayu|britbox/i;
  function merchantKey(desc) {
    return String(desc || "").toUpperCase().replace(/^\s*(SQ|TST|PP|SP|IZ|FS|CKO|PAYPAL|LS|BT|DD|WPY|SUMUP|CLV|ZTL)\s?\*\s*/, "")
      .replace(/^(INTERAC|CONTACTLESS|ONLINE BANKING|PRE-?AUTHORI[ZS]ED|POS|PURCHASE|DEBIT|PAYMENT|BILL PAYMENT|PAD|E-?TRANSFER SENT|RECURRING)\b[\s\-:]*/g, "")
      .replace(/\b(INTERAC|CONTACTLESS|PURCHASE|PAYMENT|ONLINE|BANKING|PRE-?AUTHORI[ZS]ED|TORONTO|MISSISSAUGA|VANCOUVER|ON|CA|CAN)\b/g, " ")
      .replace(/[#*]?\d[\d\-./]*/g, " ").replace(/\.(COM|CA|NET)\b/g, "").replace(/[^A-Z&+ ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 28);
  }
  const sameMerchant = (a, b) => { const x = a.split(" ")[0], y = b.split(" ")[0]; return !!x && !!y && x.length > 2 && (a.includes(y) || b.includes(x)); };
  function matchBill(t) {
    if (t.kind !== "expense") return null;
    const k = merchantKey(t.desc); if (!k) return null;
    return state.subs.find((sb) => sb.status !== "cancelled" && sameMerchant(merchantKey(sb.name), k) && Math.abs(+t.amount - +sb.amount) <= Math.max(3, +sb.amount * 0.25)) || null;
  }
  // When a bill's payment shows up, mark it paid and move its next charge forward
  function markBillsPaid(list) {
    const paid = [];
    for (const t of list) {
      const sb = matchBill(t); if (!sb) continue;
      if (sb.lastPaid && sb.lastPaid >= t.date) continue;
      const changed = Math.abs(+t.amount - +sb.amount) > 0.01 ? +sb.amount : null;
      sb.lastPaid = t.date; sb.lastPaidAmt = +t.amount;
      if (changed !== null) { sb.priceWas = changed; sb.amount = +t.amount; }
      let nx = parseISO(t.date); const anchor = nx.getDate(); nx = advance(nx, sb.cycle || "monthly", anchor); sb.next = toISO(nx);
      paid.push({ sb, t, changed });
    }
    return paid;
  }
  function paidThisCycle(sb) {
    if (!sb.lastPaid) return false;
    const due = nextCharge(sb), prev = new Date(due); prev.setMonth(prev.getMonth() - ((sb.cycle === "yearly") ? 12 : sb.cycle === "quarterly" ? 3 : 1));
    return parseISO(sb.lastPaid) > new Date(prev.getTime() - 5 * 86400000);
  }
  function detectSubs() {
    const skip = new Set(["groceries", "dining", "coffee", "transit", "fun", "shopping", "invest", "emergency", "gifts"]);
    const groups = {};
    for (const t of state.transactions) {
      if (t.kind !== "expense" || t.example) continue;
      const key = merchantKey(t.desc); if (!key || key.length < 3) continue;
      (groups[key] = groups[key] || []).push(t);
    }
    const out = [];
    for (const [key, list] of Object.entries(groups)) {
      if (state.subs.some((sb) => sameMerchant(merchantKey(sb.name), key))) continue; // already a bill
      list.sort((a, b) => a.date.localeCompare(b.date));
      const last = list[list.length - 1], months = new Set(list.map((t) => t.date.slice(0, 7)));
      const amts = list.map((t) => +t.amount).sort((a, b) => a - b), mid = amts[Math.floor(amts.length / 2)];
      const steady = amts.every((a) => Math.abs(a - mid) <= Math.max(2, mid * 0.15));
      const days = list.map((t) => +t.date.slice(8, 10)).sort((a, b) => a - b), usualDay = days[Math.floor(days.length / 2)];
      const gaps = list.slice(1).map((t, i) => daysBetween(parseISO(list[i].date), parseISO(t.date)));
      const monthlyGaps = gaps.length && gaps.every((g) => g >= 25 && g <= 36);
      let why = "";
      if (months.size >= 2 && steady && monthlyGaps && !skip.has(last.cat)) why = "Charged " + months.size + " months in a row, around the " + ordinal(usualDay);
      else if (KNOWN_SUBS.test(last.desc) && steady) why = "Looks like a monthly subscription";
      else continue;
      let next = new Date(parseISO(last.date).getFullYear(), parseISO(last.date).getMonth() + 1, Math.min(usualDay, 28));
      while (next < today()) next = addMonths(next, 1, usualDay);
      const name = titleCaseWords(key);
      out.push({ name, amount: +last.amount, cycle: "monthly", next: toISO(next), cat: last.cat, day: usualDay, why, lastPaid: last.date });
    }
    return out;
  }
  const ordinal = (n) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
  const titleCaseWords = (t) => t.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\bTd\b|\bRbc\b|\bBmo\b|\bCibc\b|\bTtc\b|\bEq\b/g, (x) => x.toUpperCase());
  // After an import: tell the person which bills got paid and offer to add new repeating charges
  function billCheckModal(paid) {
    const found = detectSubs(); window.__found = found;
    const latest = {}; paid.forEach((x) => { if (!latest[x.sb.id] || latest[x.sb.id].t.date < x.t.date) latest[x.sb.id] = Object.assign({}, x, { changed: x.changed !== null ? x.changed : latest[x.sb.id] ? latest[x.sb.id].changed : null }); });
    paid = Object.values(latest);
    if (!paid.length && !found.length) return;
    openModal('<div class="stack"><div class="row" style="flex-wrap:nowrap;gap:12px">' + (pennyOn() ? mascot(90, "P", "surprised") : "") + '<div><h2>Penny checked your bills</h2><p class="small muted">From the transactions you just brought in.</p></div></div>' +
      (paid.length ? '<h3 class="feed-h">✅ Bills paid</h3><div class="list">' + paid.map((x) => '<div class="item">' + bubble(x.sb.icon || "repeat", "#5fae7c") + '<div class="grow"><div class="t">' + esc(x.sb.name) + '</div><div class="tiny muted">Paid ' + esc(dayLabel(parseISO(x.t.date))) + " · next " + esc(dayLabel(nextCharge(x.sb))) + (x.changed !== null ? ' · <span class="warn">price changed from ' + money2(x.changed) + "</span>" : "") + '</div></div><span class="amt">' + money2(x.t.amount) + "</span></div>").join("") + "</div>" : "") +
      (found.length ? '<h3 class="feed-h">🔁 Repeating charges Penny found</h3><p class="tiny muted">Tick the ones you want in Bills & subscriptions. Penny will remind you before they\'re charged and mark them paid when they show up.</p><div class="list">' +
        found.map((f, i) => '<label class="item found-item"><input type="checkbox" name="found" value="' + i + '" checked>' + bubble("repeat", "#9d94ea") + '<div class="grow"><div class="t">' + esc(f.name) + '</div><div class="tiny muted">' + esc(f.why) + " · next about " + esc(dayLabel(parseISO(f.next))) + " · " + esc(catById(billCat({ name: f.name, cat: f.cat })).name) + '</div></div><span class="amt">' + money2(f.amount) + "/mo</span></label>").join("") + "</div>" : "") +
      '<div class="row">' + (found.length ? '<button class="btn" data-act="addFoundAll">' + icon("plus") + " Add to Bills</button>" : "") + '<button class="btn ghost" data-close>' + (found.length ? "Not now" : "Nice!") + "</button></div></div>");
  }

  /* ------------------------------------------------------------------
     Bank file import (CSV)
     ------------------------------------------------------------------ */
  function parseCSV(text) {
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }
  function looseDate(s) {
    s = String(s || "").trim(); let m;
    if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return toISO(new Date(+m[1], +m[2] - 1, +m[3]));
    if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) {
      let a = +m[1], b = +m[2], y = +m[3]; if (y < 100) y += 2000;
      const [mo, d] = a > 12 ? [b, a] : [a, b]; // month first unless that's impossible
      return toISO(new Date(y, mo - 1, d));
    }
    if (/[a-z]/i.test(s) && /\d{4}/.test(s)) { const d = new Date(s); if (!isNaN(d)) return toISO(d); }
    return null;
  }
  const moneyCell = (s) => { s = String(s || "").trim(); if (!s) return null; const neg = /^\(.*\)$/.test(s) || /^-/.test(s.replace(/[$\s]/g, "")); const n = parseFloat(s.replace(/[^0-9.]/g, "")); return isFinite(n) ? (neg ? -n : n) : null; };
  /* Spending outside Canada goes to Travel: foreign money, a foreign place, a foreign fee, or a trip booking */
  const US_STATES = "AL|AK|AZ|AR|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC";
  const FOREIGN_RX = [
    /\b(USD|EUR|GBP|JPY|MXN|CHF|AUD|NZD|THB|KRW|CNY|RMB|HKD|SGD|PHP|INR|AED|TRY|BRL|DKK|SEK|NOK|ISK|CZK|PLN|HUF|ZAR|DOP|CRC|COP|PEN|ARS|CLP|VND|IDR|MYR|TWD)\b/,
    /@\s?\d+\.\d{2,6}\b|exchange rate|conversion rate|foreign (currency|transaction|exchange)|\bFX\b|\bintl\b|international (transaction|purchase)|cross[- ]border/i,
    new RegExp("\\b[A-Z][A-Z .'-]{2,}\\s(" + US_STATES + ")(\\s\\d{5})?\\s*$"),
    /\b(USA|U\.S\.A|UNITED STATES|GBR|UNITED KINGDOM|FRA|FRANCE|JPN|JAPAN|MEX|MEXICO|ITA|ITALY|ESP|SPAIN|DEU|GERMANY|PRT|PORTUGAL|NLD|IRL|IRELAND|GRC|GREECE|THA|THAILAND|KOR|KOREA|CHN|HKG|HONG KONG|SGP|SINGAPORE|AUS|AUSTRALIA|NZL|PHL|PHILIPPINES|VNM|VIETNAM|IDN|BALI|CUB|CUBA|DOM|PUNTA CANA|JAM|JAMAICA|CRI|COSTA RICA|BRA|BRAZIL|ARG|PER|PERU|COL|COLOMBIA|CHE|SWITZERLAND|AUT|AUSTRIA|BEL|DNK|SWE|NOR|ISL|ICELAND|TUR|TURKEY|ARE|DUBAI|IND|INDIA|EGY|MAR|MOROCCO|ZAF)\s*$/,
    /\b(LONDON|PARIS|ROME|MADRID|BARCELONA|LISBON|AMSTERDAM|DUBLIN|TOKYO|OSAKA|SEOUL|BANGKOK|CANCUN|LAS VEGAS|NEW YORK|ORLANDO|MIAMI|HONOLULU)\b/,
    /air canada|westjet|porter air|flair air|swoop|united airlines|delta air|american air|air transat|sunwing|lufthansa|klm|british airways|emirates|expedia|booking\.com|hotels\.com|airbnb|vrbo|marriott|hilton|hyatt|best western|holiday inn|hostel|duty free|airport|nexus|trip\.com|kayak|travelocity/i
  ];
  function looksForeign(desc) {
    const up = String(desc || "").toUpperCase().trim();
    if (/\b(ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU|CANADA|CAN)\s*$/.test(up) && !FOREIGN_RX[0].test(up) && !FOREIGN_RX[5].test(desc)) return false; // a Canadian place
    return FOREIGN_RX.some((rx) => rx.test(rx.flags.includes("i") ? desc : up));
  }
  // The merchant guide in config.js: longest name wins, matched on whole words
  const normDesc = (t) => " " + String(t || "").toUpperCase().replace(/[^A-Z0-9&]+/g, " ").replace(/\s+/g, " ").trim() + " ";
  let GUIDE = null;
  function guideList() {
    if (GUIDE) return GUIDE;
    GUIDE = [];
    Object.entries(C.merchantGuide || {}).forEach(([cat, names]) => names.forEach((n) => { const k = normDesc(n); if (k.trim()) GUIDE.push({ k, cat, name: n }); }));
    GUIDE.sort((a, b) => b.k.length - a.k.length);
    return GUIDE;
  }
  function guideCat(desc, kind) {
    const d = normDesc(desc), wantIncome = kind === "income";
    for (const g of guideList()) {
      if (!d.includes(g.k)) continue;
      const c = state.categories.find((x) => x.id === g.cat);
      if (c && (c.group === "income") === wantIncome) return { cat: c.id, why: g.name.trim() };
    }
    return null;
  }
  // Why Penny picked a category (shown in "Sort my Other")
  const TRANSFER_RX = /\b(TRANSFER (TO|FROM)|TFR[- ]?(TO|FR)|ONLINE TRANSFER|INTERNET TRANSFER|MB[- ]?TRANSFER|WWW TRF|TRF (TO|FROM)|BANK TRANSFER|ACCOUNT TRANSFER|INTER-?ACCOUNT|(TO|FROM) (SAVINGS|CHEQUING|CHECKING|TFSA|HISA)|PAYMENT ?- ?THANK YOU|PAYMENT THANK YOU|PAYMENT RECEIVED|CREDIT CARD PAYMENT|(VISA|MASTERCARD|AMEX) PAYMENT|PAIEMENT)\b/i;
  // paying off a credit card from chequing or savings: the card statement already has the spending
  const CARD_BRAND = "(VISA|MASTER ?CARD|MASTERCRD|MC|AMEX|AMERICAN EXPRESS|CREDIT CARD|CR CARD|CC|TRIANGLE|CAPITAL ONE|ROGERS BANK|BRIM|NEO CARD|MBNA|PC FINANCIAL|PCF)";
  const CARD_PAY_RX = new RegExp("\\b" + CARD_BRAND + "\\b.*\\b(PAY|PYMT|PMT|PAYMENT|PAIEMENT|PREAUTH|PRE-AUTH|BILL ?PAY)|\\b(PAY|PYMT|PMT|PAYMENT|PAIEMENT|BILL ?PAY(MENT)?|PREAUTH)\\b.*\\b" + CARD_BRAND + "\\b", "i");
  const ETRANSFER_IN = /E-?TRANSFER (RECEIVED|DEPOSIT|RCVD|FROM|RECV)|E-?TFR (RCVD|IN)|AUTODEPOSIT|AUTO-DEPOSIT|INTERAC E-?TRANSFER(?!.*\b(SEND|SENT)\b)/i;
  function moneyMove(desc, kind) {
    const d = String(desc || "");
    const me = String((state.profile && state.profile.name) || "").trim().split(/\s+/)[0];
    if (me && me.length >= 3 && /E-?TRANSFER|E-?TFR|TRANSFER|TFR/i.test(d) && new RegExp("\\b" + me.replace(/[^a-z]/gi, "") + "\\b", "i").test(d)) return { cat: "transfer", why: "an e-transfer with your own name, so it's your money moving" };
    if (CARD_PAY_RX.test(d) && !/CASH ?BACK|REWARD|INTEREST|FEE\b/i.test(d)) return { cat: "transfer", why: "a credit card payment, and the card statement already counts what you bought" };
    if (TRANSFER_RX.test(d)) return { cat: "transfer", why: "it looks like money moving between your own accounts" };
    if (kind === "income" && ETRANSFER_IN.test(d) && !/PAYROLL|SALARY|DIRECT DEP/i.test(d)) return { cat: "payback", why: "an e-transfer from someone, like a friend paying you back" };
    return null;
  }
  function explainCat(desc, kind) {
    const up = desc.toUpperCase() + " " + normDesc(desc);
    if (kind !== "income" && state.categories.some((c) => c.id === "travel") && looksForeign(desc)) return { cat: "travel", why: "looks like it was outside Canada" };
    // rules you made always win; Penny's built-in rules lose to a more specific name in the merchant guide
    const builtIn = new Set((C.autoRules || []).map(([m, c]) => (m + "|" + c).toUpperCase()));
    let best = null;
    for (const r of state.rules) if (r.match && up.includes(r.match.toUpperCase())) { const c = state.categories.find((x) => x.id === r.cat); if (c && (kind === "income") === (c.group === "income")) { const mine = !builtIn.has((r.match + "|" + r.cat).toUpperCase()); if (mine) return { cat: c.id, why: "your rule \"" + r.match + "\"" }; if (!best || r.match.length > best.match.length) best = r; } }
    const mv = moneyMove(desc, kind);
    if (mv && state.categories.some((c) => c.id === mv.cat)) return mv;
    const g = guideCat(desc, kind);
    if (best && !(g && g.why.length > best.match.length)) return { cat: best.cat, why: "Penny knows \"" + best.match + "\"" };
    if (g) return { cat: g.cat, why: "Penny knows \"" + g.why + "\"" };
    if (kind !== "income") { const w = guessCategory("", desc); if (w.cat !== "other") return { cat: w.cat, why: w.why }; }
    return null;
  }
  function autoCat(desc, kind) {
    const e = explainCat(String(desc || ""), kind);
    if (e) return e.cat;
    if (kind === "income") return (state.categories.find((c) => c.group === "income") || OTHER).id;
    return "other";
  }
  function readBankRows(rows, flip) {
    if (!rows.length) return [];
    const head = rows[0].map((h) => h.toLowerCase().trim());
    const hasHeader = !looseDate(rows[0][0]) && !looseDate(rows[0][1]);
    let ix, data;
    if (hasHeader) {
      const find = (...keys) => head.findIndex((h) => keys.some((k) => h.includes(k)));
      ix = { date: find("date"), desc: find("description", "desc", "payee", "merchant", "details", "name", "memo"), amount: find("amount", "cad$", "cad"), debit: find("debit", "withdraw", "money out"), credit: find("credit", "deposit", "money in"), bal: find("balance") };
      ix.desc2 = head.findIndex((h, i) => i !== ix.desc && h.includes("description"));
      if (ix.date < 0) ix.date = 0;
      if (ix.desc < 0) ix.desc = 1;
      data = rows.slice(1);
    } else {
      ix = { date: 0, desc: 1, amount: -1, debit: 2, credit: 3, desc2: -1, bal: 4 }; // TD style: date, description, out, in, balance
      data = rows;
    }
    const out = [];
    for (const r of data) {
      const date = looseDate(r[ix.date]); if (!date) continue;
      let desc = (r[ix.desc] || "").trim(); if (ix.desc2 >= 0 && r[ix.desc2]) desc += " " + r[ix.desc2].trim();
      let amt = null;
      if (ix.amount >= 0 && moneyCell(r[ix.amount]) !== null) amt = moneyCell(r[ix.amount]);
      else { const d = moneyCell(r[ix.debit]), c = moneyCell(r[ix.credit]); if (d) amt = -Math.abs(d); else if (c) amt = Math.abs(c); }
      if (amt === null || amt === 0) continue;
      if (flip) amt = -amt;
      const kind = amt < 0 ? "expense" : "income";
      out.push({ date, desc: desc || "(no description)", amount: Math.abs(amt), kind, cat: autoCat(desc, kind) });
      if (ix.bal >= 0 && moneyCell(r[ix.bal]) !== null && (!out.balance || date >= out.balance.date)) out.balance = { amount: moneyCell(r[ix.bal]), date };
    }
    return out;
  }

  /* ------------------------------------------------------------------
     Small charts (plain SVG)
     ------------------------------------------------------------------ */
  function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p; return 10 * p; }
  function donut(segs, center, sub, size = 168) {
    const th = 24, r = (size - th) / 2, c = 2 * Math.PI * r, total = segs.reduce((a, s) => a + s.v, 0);
    let off = 0, arcs = "";
    if (total > 0) for (const s of segs) {
      const len = (s.v / total) * c;
      arcs += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" style="stroke:' + s.color + '" stroke-width="' + th + '" stroke-dasharray="' + Math.max(0, len - 2) + " " + (c - Math.max(0, len - 2)) + '" stroke-dashoffset="' + -off + '" transform="rotate(-90 ' + size / 2 + " " + size / 2 + ')"><title>' + esc(s.label) + " " + money(s.v) + "</title></circle>";
      off += len;
    }
    return '<svg class="chart" viewBox="0 0 ' + size + " " + size + '" style="max-width:' + size + 'px" role="img" aria-label="Spending by category">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" style="stroke:var(--surface-2)" stroke-width="' + th + '"></circle>' + arcs +
      '<text x="50%" y="48%" text-anchor="middle" style="fill:var(--fg);font:600 19px var(--font-display)">' + esc(center) + "</text>" +
      '<text x="50%" y="61%" text-anchor="middle">' + esc(sub) + "</text></svg>";
  }
  function barChart(items, keys, w = 600, h = 220) {
    const L = 46, R = 8, T = 10, B = 26, iw = w - L - R, ih = h - T - B;
    const max = niceMax(Math.max(100, ...items.flatMap((it) => keys.map((k) => it[k.key] || 0))));
    const y = (v) => T + ih - (v / max) * ih;
    let g = "";
    for (let i = 0; i <= 4; i++) { const v = (max / 4) * i; g += '<line x1="' + L + '" x2="' + (w - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" style="stroke:var(--line)" stroke-dasharray="' + (i ? "3 4" : "0") + '"></line><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + short$(v) + "</text>"; }
    const slot = iw / items.length, bw = Math.min(22, (slot - 14) / keys.length);
    items.forEach((it, i) => {
      const x0 = L + i * slot + (slot - bw * keys.length - 4 * (keys.length - 1)) / 2;
      keys.forEach((k, j) => { const v = it[k.key] || 0, x = x0 + j * (bw + 4); g += '<rect x="' + x + '" y="' + y(v) + '" width="' + bw + '" height="' + Math.max(0, T + ih - y(v)) + '" rx="4" style="fill:' + k.color + '"><title>' + esc(it.label + " " + k.name + ": " + money(v)) + "</title></rect>"; });
      g += '<text x="' + (L + i * slot + slot / 2) + '" y="' + (h - 8) + '" text-anchor="middle">' + esc(it.label) + "</text>";
    });
    return '<svg class="chart" viewBox="0 0 ' + w + " " + h + '" role="img">' + g + "</svg>";
  }
  function lineChart(xs, series, opts = {}) {
    const w = opts.w || 640, h = opts.h || 230, L = 52, R = 14, T = 12, B = 26, iw = w - L - R, ih = h - T - B;
    const all = series.flatMap((s) => s.ys);
    const max = niceMax(Math.max(100, ...all)), min = Math.min(0, ...all) < 0 ? -niceMax(-Math.min(...all)) : 0;
    const x = (i) => L + (xs.length > 1 ? (i * iw) / (xs.length - 1) : iw / 2);
    const y = (v) => T + ih - ((v - min) / (max - min)) * ih;
    let g = "";
    for (let i = 0; i <= 4; i++) { const v = min + ((max - min) / 4) * i; g += '<line x1="' + L + '" x2="' + (w - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" style="stroke:var(--line)" stroke-dasharray="' + (v === 0 ? "0" : "3 4") + '"></line><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + short$(v) + "</text>"; }
    const every = Math.max(1, Math.ceil(xs.length / 7));
    xs.forEach((lab, i) => { if (i % every === 0 || i === xs.length - 1) g += '<text x="' + x(i) + '" y="' + (h - 8) + '" text-anchor="middle">' + esc(lab) + "</text>"; });
    for (const s of series) {
      const pts = s.ys.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1));
      if (s.area) g += '<polygon points="' + x(0) + "," + y(Math.max(0, min)) + " " + pts.join(" ") + " " + x(s.ys.length - 1) + "," + y(Math.max(0, min)) + '" style="fill:' + s.color + ';opacity:.16"></polygon>';
      g += '<polyline points="' + pts.join(" ") + '" fill="none" style="stroke:' + s.color + '" stroke-width="' + (s.width || 2.5) + '" stroke-linejoin="round" stroke-linecap="round"' + (s.dash ? ' stroke-dasharray="5 5"' : "") + "></polyline>";
      const li = s.ys.length - 1; g += '<circle cx="' + x(li) + '" cy="' + y(s.ys[li]) + '" r="4.5" style="fill:' + s.color + ';stroke:var(--surface)" stroke-width="2"></circle>';
    }
    return '<svg class="chart" viewBox="0 0 ' + w + " " + h + '" role="img">' + g + "</svg>";
  }
  function ring(p, color, size = 64, label) {
    const r = (size - 9) / 2, c = 2 * Math.PI * r, len = clamp(p, 0, 1) * c;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '" style="flex:none"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" style="stroke:var(--surface-2)" stroke-width="8"></circle>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" style="stroke:' + color + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + len + " " + c + '" transform="rotate(-90 ' + size / 2 + " " + size / 2 + ')"></circle>' +
      '<text x="50%" y="55%" text-anchor="middle" style="fill:var(--fg);font:700 ' + (size / 4.6) + 'px var(--font-body)">' + (label || Math.round(clamp(p, 0, 9.99) * 100) + "%") + "</text></svg>";
  }
  function skyline() {
    // A little Toronto skyline: CN Tower, Rogers Centre and friends
    const b = [[0, 60, 40], [44, 46, 30], [78, 66, 36], [118, 40, 26], [148, 58, 44], [196, 30, 22], [222, 52, 34], [260, 70, 30], [294, 44, 40], [338, 62, 28], [370, 36, 36], [410, 56, 30], [444, 74, 26], [474, 48, 38], [516, 64, 34], [554, 42, 30], [588, 58, 40], [632, 50, 28], [664, 68, 36], [704, 40, 30], [738, 54, 26], [940, 48, 34], [978, 70, 28], [1010, 44, 40], [1054, 62, 32], [1090, 38, 30], [1124, 56, 36], [1164, 46, 36]];
    let g = '<rect x="0" y="82" width="1200" height="8" opacity=".5"></rect>';
    for (const [x, hgt, wd] of b) g += '<rect x="' + x + '" y="' + (82 - hgt * 0.8) + '" width="' + wd + '" height="' + hgt * 0.8 + '" opacity=".45"></rect>';
    g += '<path d="M776 82 L779 20 L785 20 L788 82 Z" opacity=".75"></path>' +
      '<ellipse cx="782" cy="34" rx="12" ry="5" opacity=".8"></ellipse><ellipse cx="782" cy="20" rx="5" ry="2.5" opacity=".8"></ellipse>' +
      '<rect x="781" y="0" width="2" height="20" opacity=".8"></rect>' +
      '<path d="M830 82 Q868 52 906 82 Z" opacity=".6"></path>';
    return '<svg class="sky" viewBox="0 0 1200 90" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' + g + "</svg>";
  }

  /* ------------------------------------------------------------------
     UI bits: toast, modal, confetti, files
     ------------------------------------------------------------------ */
  function toast(html) {
    const box = $("#toasts"); if (!box) return;
    const el = document.createElement("div"); el.className = "toast"; el.innerHTML = (state && pennyOn() ? mascot(30, "P", "happy") : "") + "<span>" + html + "</span>"; box.appendChild(el);
    setTimeout(() => el.remove(), 3200);
    while (box.children.length > 4) box.firstChild.remove();
  }
  let modalEl = null;
  function openModal(html) {
    closeModal();
    modalEl = document.createElement("div"); modalEl.className = "overlay";
    modalEl.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + "</div>";
    modalEl.addEventListener("click", (e) => { if (e.target === modalEl || e.target.closest("[data-close]")) closeModal(); });
    document.body.appendChild(modalEl);
    const first = modalEl.querySelector("input:not([type=hidden]):not([type=radio]), select, textarea, button");
    if (first) setTimeout(() => first.focus(), 30);
  }
  function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }
  function confetti() {
    if ((window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) || state.ui.calm) return;
    const cv = $("#confetti"); if (!cv) return;
    const ctx = cv.getContext("2d"); cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#f3d38f", "#a8d8d0", "#f2b8cf", "#b4c6ee", "#bfe3c4", "#f6c1a6", "#cdbcf0"];
    const ps = Array.from({ length: 80 }, () => ({ x: cv.width / 2 + (Math.random() - 0.5) * 200, y: cv.height * 0.35, vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 12 - 4, s: 5 + Math.random() * 6, c: cols[(Math.random() * cols.length) | 0], r: Math.random() * 6 }));
    let f = 0;
    (function tick() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of ps) { p.x += p.vx; p.y += p.vy; p.vy += 0.38; p.vx *= 0.99; p.r += 0.15; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
      if (++f < 110) requestAnimationFrame(tick); else ctx.clearRect(0, 0, cv.width, cv.height);
    })();
  }
  /* Celebrations: a happy pop-up, emoji fireworks and confetti */
  const calm = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function burst(emojis, count, spread) {
    count = count || 18; spread = spread || 1;
    if (calm() || state.ui.calm || state.ui.celebrate === false) return;
    const box = document.createElement("div"); box.className = "emoji-burst"; box.setAttribute("aria-hidden", "true");
    const old = document.querySelectorAll(".emoji-burst"); if (old.length > 1) old[0].parentNode.removeChild(old[0]);
    for (let i = 0; i < count; i++) {
      const e = document.createElement("span"); e.textContent = emojis[i % emojis.length];
      const a = Math.random() * Math.PI * 2, d = (90 + Math.random() * 170) * spread;
      e.style.setProperty("--dx", Math.cos(a) * d + "px"); e.style.setProperty("--dy", Math.sin(a) * d - 60 + "px");
      e.style.setProperty("--r", (Math.random() * 120 - 60) + "deg"); e.style.animationDelay = Math.random() * 0.15 + "s";
      e.style.fontSize = 20 + Math.random() * 16 + "px";
      box.appendChild(e);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 1900);
  }
  let cheerTimer;
  function celebrate(kind, extra) {
    extra = extra || {};
    const pool = (C.cheers && C.cheers[kind]) || [["🎉", "Nice!", ""]];
    const [emo, title, sub] = pool[Math.floor(Math.random() * pool.length)];
    const t = extra.title || title, sb = extra.sub !== undefined ? extra.sub : sub;
    if (state.ui.celebrate === false) { toast(emo + " " + esc(t)); return; }
    let el = $("#cheer"); if (!el) { el = document.createElement("div"); el.id = "cheer"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.className = "cheer";
    const CHEER_POSE = { save: "coin", income: "coin", goalDone: "celebrate", weekly: "trophy", level: "party", cancel: "celebrate", step: "explorer", milestone: "growth", lesson: "proud", badge: "trophy", firstTx: "proud", track: "proud" };
    const usePenny = pennyOn() && !extra.noPenny;
    el.innerHTML = '<button class="cheer-card" data-act="closeCheer">' + (usePenny ? mascot(110, "P", extra.pose || CHEER_POSE[kind] || "celebrate") : '<span class="cheer-emoji">' + (extra.emoji || emo) + "</span>") + "<b>" + esc(t) + "</b>" + (sb ? "<span>" + esc(sb) + "</span>" : "") + "</button>";
    burst((C.cheerEmojis && (C.cheerEmojis[kind] || C.cheerEmojis.default)) || ["🎉"]);
    if (extra.confetti !== false) confetti();
    clearTimeout(cheerTimer);
    cheerTimer = setTimeout(() => { el.className = "cheer out"; setTimeout(() => { if (el.className === "cheer out") el.innerHTML = ""; }, 320); }, extra.ms || 3200);
  }
  function offerFile(name, text, type) {
    try {
      const url = URL.createObjectURL(new Blob([text], { type }));
      const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e) { /* fall through to the copy box */ }
    if (window.self !== window.top) {
      openModal("<h2>Save your file</h2><p class=\"small muted\">Some previews block downloads. If nothing downloaded, copy this and paste it into a new file called <b>" + esc(name) + "</b>.</p><textarea id=\"fileText\" rows=\"9\" readonly>" + esc(text) + '</textarea><div class="row"><button class="btn" data-act="copy" data-target="#fileText">' + icon("copy") + " Copy</button><button class=\"btn ghost\" data-close>Close</button></div>");
    }
  }
  function readPhoto(file, cb) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, 900 / img.width), cv = document.createElement("canvas");
        cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => toast("That image couldn't be opened. Try a JPG or PNG.");
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* ------------------------------------------------------------------
     Shared pieces of HTML
     ------------------------------------------------------------------ */
  const moneyInput = (attrs) => '<div class="money-in"><input type="number" inputmode="decimal" step="any" ' + attrs + "></div>";
  const field = (label, inner, hint) => '<label class="field">' + label + inner + (hint ? '<span class="hint">' + hint + "</span>" : "") + "</label>";
  const bind = (path, ph) => { const [a, b] = path.split("."); const v = state[a][b]; return 'data-bind="' + path + '" value="' + esc(v === 0 ? "" : v) + '" placeholder="' + esc(ph || "0") + '"'; };
  // Penny asks for the numbers she needs instead of guessing
  const askCard = (pose, title, text, btn) => '<div class="card ask-card">' + (pennyOn() ? mascot(110, "P", pose) : '<div class="ci-emoji">🐷</div>') + '<div><h3>' + esc(title) + '</h3><p class="small muted">' + text + "</p>" + (btn || "") + "</div></div>";
  const monthNav = () => '<div class="row" style="gap:4px"><button class="iconbtn" data-act="month" data-d="-1" aria-label="Previous month">' + icon("chevron-left") + '</button><b style="min-width:138px;text-align:center">' + monthLabel(state.ui.month) + '</b><button class="iconbtn" data-act="month" data-d="1" aria-label="Next month">' + icon("chevron-right") + "</button></div>";
  const exampleNote = () => state.isExample ? '<div class="callout gold example-note"><div class="example-text">' + icon("info") + '<span>You\'re looking at <b>example data</b> 👀 It\'s view only. Ready to make it yours?</span></div><div class="example-btns"><button class="btn gold sm" data-act="startSetup">Make it mine ✨</button></div></div>' : "";
  const PAGE_EMOJI = { path: "🗺️", spending: "🧾", budgets: "👛", bills: "📺", goals: "🎯", networth: "⚖️", taxes: "🍁", retirement: "🌅", house: "🔑", learn: "📚", rewards: "🏆", reminders: "🔔", mydata: "💾" };
  const PAGE_POSE = { path: "explorer", spending: "thinking", budgets: "coin", bills: "surprised", goals: "jar", networth: "growth", taxes: "taxes", retirement: "retire", house: "home", learn: "reading", rewards: "trophy", reminders: "alarm", mydata: "calm" };
  function showPageIntro(id) {
    const it = C.pageIntros && C.pageIntros[id]; if (!it) return;
    const pn = pageName(id) || [id, "", ""];
    state.ui.introSeen = state.ui.introSeen || {}; state.ui.introSeen[id] = true; save();
    openModal('<div class="intro">' + (pennyOn() ? mascot(220, "P", PAGE_POSE[id] || "happy") : '<div class="ci-emoji">' + (PAGE_EMOJI[id] || "🐷") + "</div>") +
      '<div class="label">' + (pn[1] ? esc(pn[1]) : "Welcome") + "</div><h2>" + esc(pn[0]) + '</h2><p class="intro-say">' + esc(it.say) + "</p>" +
      '<ul class="intro-points">' + it.points.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" +
      '<button class="btn big" data-close>Got it! 🐷</button><p class="tiny muted">Tap <b class="help-q mini">?</b> by the page name to see this again</p></div>');
    const m = $(".overlay .modal"); if (m) m.classList.add("intro-modal");
  }
  function maybePageIntro(id) {
    if (!C.pageIntros || !C.pageIntros[id] || (state.ui.introSeen || {})[id]) return;
    setTimeout(() => { if (pageId() === id && !modalEl && !$("#wizard") && !$(".cheer") && !(state.ui.introSeen || {})[id]) showPageIntro(id); }, 450);
  }
  const pennyOn = () => (C.mascotStyle || "P") === "P";
  const pageName = (id) => (C.pageNames && C.pageNames[id]) || null;
  const head = (title, sub, right) => { const pn = pageName(pageId()); if (pn) { sub = pn[2] || sub; } return '<div class="page-head">' + (pennyOn() && PAGE_POSE[pageId()] ? '<button type="button" class="head-penny" data-act="pennyPoke" aria-label="Say hi to Penny">' + mascot(124, "P", PAGE_POSE[pageId()]) + "</button>" : "") + '<div style="flex:1;min-width:0">' + (pn ? '<div class="label">' + title + "</div>" : "") + "<h1>" + (!pennyOn() && PAGE_EMOJI[pageId()] ? '<span class="head-emoji" aria-hidden="true">' + PAGE_EMOJI[pageId()] + "</span>" : "") + '<span class="h1-text">' + (pn ? esc(pn[0]) : title) + "</span>" + (C.pageIntros && C.pageIntros[pageId()] ? '<button type="button" class="help-q" data-act="pageHelp" aria-label="What is this page?" title="What is this page?">?</button>' : "") + "</h1>" + (sub ? "<p>" + sub + "</p>" : "") + "</div>" + (right ? '<div class="row">' + right + "</div>" : "") + "</div>"; };
  const exTag = (x) => (x.example ? ' <span class="pill example">Example</span>' : "");
  function remRow(r, compact) {
    const d = daysBetween(today(), r.date);
    const when = d === 0 ? "Today" : d === 1 ? "Tomorrow" : d < 0 ? "Overdue" : "In " + d + " days";
    return '<div class="item"' + (r.done ? ' style="opacity:.55"' : "") + ">" + bubble(r.icon, d <= 7 && !r.done ? "var(--bad)" : "var(--accent)") +
      '<div class="grow"><div class="t"' + (r.done ? ' style="text-decoration:line-through"' : "") + ">" + esc(r.text) + '</div><div class="tiny muted">' + dayLabel(r.date) + " · " + when + " · " + esc(r.kind) + "</div></div>" +
      (compact ? "" : '<button class="iconbtn" data-act="remDone" data-key="' + esc(r.key) + '" data-id="' + esc(r.id || "") + '" title="' + (r.done ? "Mark not done" : "Mark done") + '">' + icon(r.done ? "refresh-cw" : "check") + "</button>" +
        (r.custom ? '<button class="iconbtn del" data-act="remDel" data-id="' + esc(r.id) + '" title="Delete">' + icon("trash-2") + "</button>" : "")) + "</div>";
  }

  /* ------------------------------------------------------------------
     Smart tips for the Home page
     ------------------------------------------------------------------ */
  function smartTips() {
    const tips = [], m = monthStats(state.ui.month), t = calcTax();
    for (const c of state.categories) {
      if (c.group === "income" || c.group === "save" || !c.budget) continue;
      const sp = m.byCat[c.id] || 0;
      if (sp > c.budget) tips.push(["red", "triangle-alert", "<b>" + esc(c.name) + "</b> went " + money(sp - c.budget) + " over plan this month. Totally normal! Nudging a little from another category can balance it out."]);
    }
    const subsYear = state.subs.filter((s) => s.status !== "cancelled").reduce((a, s) => a + monthlyCost(s), 0) * 12;
    if (subsYear > 0) tips.push(["", "repeat", "Your subscriptions cost <b>" + money(subsYear) + " a year</b>. Cancel one you don't use for an easy 100 XP."]);
    if (state.tax.income > 0 && !(state.tax.withheldPerPay > 0)) tips.push(["gold", "landmark", "Add the <b>tax taken off each paycheque</b> on the <a href=\"#taxes\">Taxes page</a> (it's on your pay stub), and Penny can tell you if you're getting a refund."]);
    if (state.tax.income > 0) {
      if (!(state.tax.withheldPerPay > 0)) { /* no refund guesses until we know what was taken off */ }
      else if (t.refund > 1500) tips.push(["gold", "hand-coins", "You're on track for a <b>" + money(t.refund) + " refund</b>. That's " + money(t.refund / t.periods) + " per paycheque you could have now. Ask HR about form T1213."]);
      else if (t.refund < -500) tips.push(["red", "landmark", "You might <b>owe about " + money(-t.refund) + "</b> in April. Good news: you have time to fix it. An RRSP contribution of about " + money(-t.refund / Math.max(0.2, t.marginal)) + " would roughly cover it."]);
      tips.push(["", "sunset", "Every <b>$1,000</b> you put in your RRSP or FHSA gets you about <b>" + money(t.per1k) + "</b> back at tax time."]);
    }
    const house = state.goals.some((g) => /home|house|condo|down/i.test(g.name));
    const hasFHSA = state.accounts.some((a) => a.type === "fhsa") || state.goals.some((g) => g.account === "FHSA");
    if (house && !hasFHSA) tips.push(["gold", "key-round", "Saving for a home? Open an <b>FHSA</b>. It cuts your taxes now and comes out tax-free for your first home."]);
    if (m.income > 0) { const r = m.saved / m.income; tips.push([r >= 0.2 ? "" : "gold", r >= 0.2 ? "circle-check" : "piggy-bank", "You saved <b>" + pct(r, 0) + "</b> of this month's income. " + (r >= 0.2 ? "That beats the 20% goal. You're doing amazing! 🌟" : "Every bit counts! A small automatic transfer on payday makes 20% feel easy over time.")]); }
    tips.push(["", "calendar", "New TFSA room of <b>" + money(C.limits.tfsaYear) + "</b> opens every January 1. Unused room carries forward forever."]);
    return tips.slice(0, 5);
  }

  /* ==================================================================
     PAGES
     ================================================================== */
  const PAGES = {};
  const NAV = [
    ["home", "Home", "layout-dashboard"], ["path", "Piggy Quests", "route"], ["spending", "Transactions", "receipt"], ["budgets", "Budgets", "wallet"],
    ["bills", "Bills & subs", "repeat"], ["goals", "Goals", "target"], null,
    ["networth", "Net worth", "scale"], ["taxes", "Taxes", "landmark"], ["retirement", "Retirement", "sunset"], ["house", "Buy a home", "key-round"], null,
    ["learn", "Learn", "graduation-cap"], ["rewards", "Rewards", "trophy"], ["reminders", "Reminders", "bell"], ["mydata", "My data", "database"]
  ];

  /* PAGE: Home ------------------------------------------------------- */
  PAGES.home = {
    render() {
      const ym = state.ui.month, m = monthStats(ym), b = budgetTotals();
      const isNow = ym === thisMonth(), t = today();
      const daysLeft = isNow ? daysInMonth(t.getFullYear(), t.getMonth()) - t.getDate() + 1 : 0;
      const noPlan = !state.isExample && b.need + b.want <= 0;
      const left = noPlan ? 0 : b.need + b.want - m.spent;
      const hr = new Date().getHours();
      const mood = heroMood(left);
      const hello = esc(mood.greeting.replace("{hello}", ((g) => (mood.greeting.indexOf("{hello}") > 0 ? g.toLowerCase() : g))(hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening")).replace("{name}", state.profile.name ? ", " + state.profile.name : ""));
      const cats = state.categories.filter((c) => c.group !== "income" && c.group !== "save" && m.byCat[c.id]).sort((a, z) => m.byCat[z.id] - m.byCat[a.id]);
      if (m.byCat.other) cats.push(OTHER);
      const top = cats.slice(0, 4), restV = cats.slice(4).reduce((a, c) => a + m.byCat[c.id], 0);
      const segs = top.map((c) => ({ v: m.byCat[c.id], color: c.color, label: c.name })).concat(restV ? [{ v: restV, color: "#cfd3e0", label: "Everything else" }] : []);
      const bill = upcoming(30).find((r) => r.kind === "Bill" && !r.done);
      const billDays = bill ? daysBetween(today(), bill.date) : 0;

      const says = C.pennySays || [], intro = (state.profile.checkins || []).length <= 3 || state.isExample;
      const line = mood.say || (says.length ? (intro ? says[0] : says[1 + (Math.floor(Date.now() / 86400000) % Math.max(1, says.length - 1))]) : "");
      return '<div class="page home">' +
        ((img, night) => '<section class="hero' + (img ? " hero-photo" : "") + (night ? " hero-night" : "") + '"' + (img ? ' style="--hero-img:url(\'' + esc(img) + '\')"' : "") + '>')(mood.night && C.heroNightImage ? C.heroNightImage : C.heroImage, !!(mood.night && C.heroNightImage)) + '<div class="hero-row"><div class="hero-text"><p>' + hello + "</p>" +
        (noPlan ? '<div class="label" style="margin-top:8px">Your spending plan</div><div class="big">Not set yet</div>' + (m.spent ? '<p class="small" style="margin-top:4px">Spent so far: <b>' + money(m.spent) + "</b></p>" : "") :
        '<div class="label" style="margin-top:8px">' + (left < 0 ? (isNow ? "Over plan this month by" : "Over plan by") : isNow ? "Left to spend this month" : "Left in " + monthLabel(ym)) + "</div>" +
        '<div class="big">' + money(Math.abs(left)) + "</div>") +
        '<div class="chips">' +
        (noPlan ? '<a class="chip chip-link" href="#budgets">👛 Set your budget</a>' : "") +
        (isNow && !noPlan ? (left > 0 ? '<span class="chip">🗓️ About ' + money(left / daysLeft) + " a day</span>" : '<span class="chip">💪 Small changes add up</span>') : "") +
        (bill ? '<span class="chip">🔔 ' + esc(bill.text.replace(/ charges .*/, "")) + " " + (billDays === 0 ? "today" : billDays === 1 ? "tomorrow" : "in " + billDays + " days") + "</span>" : "") +
        "</div></div>" + '<div class="hero-side">' + monthNav() + '<div class="penny-speak">' + (line && pennyOn() ? '<div class="bubble-say">' + esc(line) + "</div>" : "") + mascot(170, null, mood.pose) + "</div>" + (mood.why ? '<div class="penny-why">' + esc(mood.why) + "</div>" : "") + "</div></div>" + (C.heroImage ? "" : skyline()) + "</section>" +

        feedCard() + nextStepCard() +

        '<div class="grid tiles3">' +
        tile("briefcase", "#5fae7c", "Money in", money(m.income), "💰") +
        tile("shopping-bag", "#e39bbd", "Spent", money(m.spent), "🛍️") +
        tile("piggy-bank", "#5aa9a2", "Saved", money(m.saved), "🐷") +
        "</div>" +

        '<div class="grid g2">' +
        '<div class="card"><div class="card-head"><h2>🧾 Where it went</h2><a class="small" href="#spending">See all</a></div>' +
        (segs.length ? '<div class="donut-wrap">' + donut(segs, money(m.spent), "spent") + '<div class="legend">' +
          segs.map((x) => '<div class="li"><span class="dot" style="background:' + x.color + '"></span><span>' + esc(x.label) + '</span><b class="num">' + money(x.v) + "</b></div>").join("") + "</div></div>"
          : '<div class="empty">' + (pennyOn() ? mascot(90, "P", "thinking") : '<span class="big-emoji">🧾</span>') + '<p>Nothing logged yet this month.</p><button class="btn" data-act="addTx">' + icon("plus") + " Add your first one</button></div>") + "</div>" +
        '<div class="card"><div class="card-head"><h2>🎯 Your goals</h2><a class="small" href="#goals">All</a></div><div class="stack">' +
        (state.goals.length ? state.goals.slice(0, 3).map((g) => '<div class="ring-wrap">' + ring(g.saved / (g.target || 1), C.goalThemes[g.theme % C.goalThemes.length][0], 52) + '<div style="min-width:0"><b>' + esc(g.name) + '</b><div class="small muted">' + money(g.saved) + " of " + money(g.target) + "</div></div></div>").join("")
          : '<div class="empty">' + (pennyOn() ? mascot(90, "P", "coin") : '<span class="big-emoji">🌈</span>') + '<p>What are you dreaming of? A trip, a home, a safety net?</p><button class="btn" data-act="editGoal">' + icon("plus") + " Make a goal</button></div>") + "</div></div>" +
        "</div>" +
        factCard() +
        "</div>";
    }
  };
  // Which mood Penny is in on the Home banner (the list lives in config.js)
  function heroMood(left) {
    const hr = new Date().getHours(), w = state.ui.weather;
    const fs = feedOn() && !state.isExample ? feedStatus() : null;
    const fits = { calm: !!state.ui.calm, over: left < 0, sleepy: hr >= 22 || hr < 5, hungry: !!(fs && fs.stage.id === "hungry" && fs.day >= 8), snow: !!(w && w.snow && Date.now() - w.at < 3 * 3600000), happy: true };
    return (C.heroMoods || []).find((m) => fits[m.id]) || { pose: "happy", greeting: "{hello}{name}", say: "", why: "" };
  }
  function heroPose(left) { return heroMood(left).pose; }
  // Snow check (Open-Meteo). Fails quietly where outside websites are blocked.
  function checkSnow() {
    const W = C.weather; if (!W || !W.on || typeof fetch !== "function") return;
    let framed = false; try { framed = window.self !== window.top; } catch (e) { framed = true; }
    if (framed) return; // inside the online artifact, outside websites are blocked, so don't even try
    const last = state.ui.weather; if (last && Date.now() - last.at < (W.checkEveryMinutes || 60) * 60000) return;
    const ctl = typeof AbortController === "function" ? new AbortController() : null; if (ctl) setTimeout(() => ctl.abort(), 6000);
    fetch("https://api.open-meteo.com/v1/forecast?latitude=" + W.latitude + "&longitude=" + W.longitude + "&current=snowfall,weather_code", ctl ? { signal: ctl.signal } : {})
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.current) return;
        const code = +d.current.weather_code, snow = +d.current.snowfall > 0 || [71, 73, 75, 77, 85, 86].includes(code);
        const was = state.ui.weather && state.ui.weather.snow;
        state.ui.weather = { at: Date.now(), snow }; save();
        if (was !== snow && pageId() === "home") render();
      })
      .catch(() => { /* no internet or blocked: Penny just skips the snow outfit */ });
  }
  function nextStepCard() {
    const wk = state.profile.weekly, weeklyLeft = wk ? wk.ids.filter((id) => !wk.done[id]).length : 0;
    let emo, title, sub, btn;
    if (state.isExample) { emo = "👋"; title = "Ready to make it yours?"; sub = "You're looking at example data. Setup takes about 3 minutes."; btn = '<button class="btn gold" data-act="startSetup">Set up my profile</button>'; }
    else if (!state.ui.setupDone) { const n = state.ui.setupStep || 0; emo = "🐷"; title = "Let's finish setting up"; sub = "You're on step " + (n + 1) + " of " + C.setup.steps.length + ". Almost there!"; btn = '<button class="btn gold" data-act="openWizard">Keep going</button>'; }
    else if (!state.checkin.done) { emo = "✨"; title = "Take the 1-minute money check-in"; sub = "See how you compare to Canadians your age. Spoiler: probably better than you think."; btn = '<button class="btn gold" data-act="startCheckin">Let\'s go</button>'; }
    else { const P = pathSummary(); emo = P.cur ? P.cur.emoji : "🏆"; title = P.cur ? "Next: " + P.cur.title : "You finished every Piggy Quest!"; sub = P.done + " of " + P.total + " Piggy Quests done."; btn = '<a class="btn" href="#path">Let\'s go</a>'; }
    const nsPose = state.isExample ? "wave" : !state.ui.setupDone ? "proud" : !state.checkin.done ? "surprised" : "happy";
    return '<div class="card next-step">' + (pennyOn() ? mascot(80, "P", nsPose) : '<span class="next-emoji">' + emo + "</span>") + '<div style="flex:1;min-width:0"><div class="label">Your next step</div><h3>' + esc(title) + '</h3><p class="small muted">' + esc(sub) + "</p>" +
      (weeklyLeft && !state.isExample ? '<a class="small" href="#rewards">🎯 ' + weeklyLeft + " weekly " + (weeklyLeft === 1 ? "quest" : "quests") + " left this week</a>" : "") + "</div>" + btn + "</div>";
  }
  /* Penny Pal's mascot, Penny the piggy bank. Five original looks (A to E).
     Pick one in My data, or set the default with mascotStyle in config.js. */
  let mascotN = 0;
  const MASCOTS = {
    P: { name: "3D Penny", desc: "Penny's official look, with lots of poses" },
    A: { name: "Classic Penny", desc: "The original, with a little money sprout" },
    B: { name: "Big-eyed Penny", desc: "Animated-movie style with sparkly eyes and a bow" },
    C: { name: "Cozy Canadian Penny", desc: "A knit toque with a maple leaf, and a scarf" },
    D: { name: "Flower Crown Penny", desc: "Dreamy lavender with flowers and sparkles" },
    E: { name: "Mochi Penny", desc: "Squishy, happy and hugging a gold coin" }
  };
  // Which picture to use for a pose, borrowing a close one if it doesn't exist yet
  const POSE_BACKUP = { "belly-stuffed": "celebrate", "belly-happy": "proud", "belly-ok": "happy", "belly-peckish": "thinking", "belly-hungry": "sad", wave: "happy", comfort: "happy", sad: "comfort", thinking: "happy", reading: "thinking", sleepy: "happy", cozy: "celebrate", goodbye: "happy", taxes: "thinking", trophy: "celebrate", explorer: "proud", jar: "coin", growth: "proud", retire: "sleepy", home: "cozy", alarm: "goodbye", calm: "sleepy", streak: "proud", party: "celebrate", celebrate: "happy", proud: "happy", coin: "happy", surprised: "happy" };
  function poseSrc(pose) {
    const imgs = C.mascotImages || {};
    for (let p = pose || "happy", i = 0; p && i < 6; p = POSE_BACKUP[p], i++) if (imgs[p]) return imgs[p];
    return imgs.happy || null;
  }
  // No repeats: while a page is being drawn, each Penny picture is used at most once.
  // If a pose is already on the page, the next unused one from this list takes its place.
  const POSE_SWAP = ["happy", "proud", "coin", "surprised", "thinking", "celebrate", "comfort", "goodbye", "explorer", "growth", "jar", "trophy", "party", "streak", "home", "alarm", "calm", "reading", "cozy", "taxes", "sleepy"];
  let pageSrcs = null;
  function uniqueSrc(pose) {
    let src = poseSrc(pose);
    if (!pageSrcs || !src) return src;
    if (pageSrcs.has(src)) {
      const imgs = C.mascotImages || {};
      // swap to a picture with the same feeling first, so a sad Penny never turns into a happy one
      const SAME_MOOD = { "belly-hungry": ["comfort", "sad"], sad: ["comfort"], comfort: ["sad"], "belly-peckish": ["thinking", "comfort", "reading"], "belly-ok": ["happy", "coin", "wave"], "belly-happy": ["proud", "happy", "coin"], "belly-stuffed": ["celebrate", "party", "trophy", "proud"] };
      const alt = (SAME_MOOD[pose] || []).concat(POSE_SWAP).map((p) => imgs[p]).find((x) => x && !pageSrcs.has(x));
      if (alt) src = alt;
    }
    pageSrcs.add(src);
    return src;
  }
  function mascot(size, style, pose) {
    style = style || C.mascotStyle || "P"; // everyone gets the 3D Penny
    if (style === "P") {
      const src = uniqueSrc(pose);
      if (src) return '<span class="mascot mascot-img" data-pose="' + esc(pose || "happy") + '" data-size="' + size + '" style="width:' + size + "px;height:" + size + 'px"><img src="' + esc(src) + '" width="' + size + '" height="' + size + '" alt="' + esc(C.mascotName || "Penny") + ' the piggy bank" decoding="async"></span>';
      style = "A";
    }
    const id = "pp" + style + ++mascotN, nm = esc(C.mascotName || "Penny");
    const open = '<svg class="mascot" width="' + size + '" height="' + size + '" viewBox="0 0 120 120" role="img" aria-label="' + nm + ' the piggy bank">';
    const snout = (cy, fill, nose) => '<ellipse cx="60" cy="' + cy + '" rx="13" ry="9" fill="' + fill + '"/><ellipse cx="55.5" cy="' + cy + '" rx="2.3" ry="3.3" fill="' + nose + '"/><ellipse cx="64.5" cy="' + cy + '" rx="2.3" ry="3.3" fill="' + nose + '"/>';
    const eye = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#2f3347"/><circle cx="' + (x + r * 0.35) + '" cy="' + (y - r * 0.35) + '" r="' + r * 0.32 + '" fill="#fff"/>';
    const star = (x, y, r, fill) => '<path d="M' + x + " " + (y - r) + " Q" + x + " " + y + " " + (x + r) + " " + y + " Q" + x + " " + y + " " + x + " " + (y + r) + " Q" + x + " " + y + " " + (x - r) + " " + y + " Q" + x + " " + y + " " + x + " " + (y - r) + 'Z" fill="' + fill + '"/>';
    if (style === "B") return open +
      '<defs><radialGradient id="' + id + 'g" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffe3ec"/><stop offset="1" stop-color="#f5aac2"/></radialGradient><radialGradient id="' + id + 'e" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#7a63b8"/><stop offset="1" stop-color="#2f2650"/></radialGradient></defs>' +
      '<ellipse cx="48" cy="106" rx="8" ry="5" fill="#f29ab4"/><ellipse cx="72" cy="106" rx="8" ry="5" fill="#f29ab4"/>' +
      '<path d="M26 40 Q22 12 50 26 Q38 30 26 40Z" fill="#f5aac2"/><path d="M31 34 Q30 20 44 27 Z" fill="#f08aab"/>' +
      '<path d="M94 40 Q98 12 70 26 Q82 30 94 40Z" fill="#f5aac2"/><path d="M89 34 Q90 20 76 27 Z" fill="#f08aab"/>' +
      '<circle cx="60" cy="62" r="42" fill="url(#' + id + 'g)"/>' +
      '<path d="M84 20 L96 13 L95 27 Z" fill="#b9a3ec"/><path d="M84 20 L72 13 L74 27 Z" fill="#b9a3ec"/><circle cx="84" cy="20" r="4" fill="#9f86e0"/>' +
      '<ellipse cx="44" cy="58" rx="10" ry="12" fill="url(#' + id + 'e)"/><ellipse cx="76" cy="58" rx="10" ry="12" fill="url(#' + id + 'e)"/>' +
      '<circle cx="48" cy="52" r="4" fill="#fff"/><circle cx="80" cy="52" r="4" fill="#fff"/><circle cx="40.5" cy="63" r="1.8" fill="#fff"/><circle cx="72.5" cy="63" r="1.8" fill="#fff"/>' +
      '<path d="M34 49 L30 45 M36 46 L33 41 M86 49 L90 45 M84 46 L87 41" stroke="#2f3347" stroke-width="2" stroke-linecap="round"/>' +
      '<ellipse cx="32" cy="74" rx="7" ry="4.5" fill="#ff9fbb" opacity=".6"/><ellipse cx="88" cy="74" rx="7" ry="4.5" fill="#ff9fbb" opacity=".6"/>' +
      snout(77, "#f6a0ba", "#c9708d") +
      '<path d="M53 89 Q60 96 67 89" stroke="#2f3347" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M57 91.5 Q60 96 63 91.5 Z" fill="#ff8fa8"/></svg>';
    if (style === "C") return open +
      '<path d="M26 44 L36 24 L48 38 Z" fill="#f2b0c4"/><path d="M94 44 L84 24 L72 38 Z" fill="#f2b0c4"/>' +
      '<circle cx="60" cy="66" r="40" fill="#f8cdd9"/>' +
      '<path d="M22 50 Q60 0 98 50 Z" fill="#ec9e9e"/><rect x="20" y="44" width="80" height="11" rx="5.5" fill="#fdfcff"/>' +
      '<path d="M30 46 v7 M40 46 v7 M50 46 v7 M60 46 v7 M70 46 v7 M80 46 v7 M90 46 v7" stroke="#e7e2f2" stroke-width="2"/>' +
      '<circle cx="60" cy="11" r="8" fill="#fdfcff"/>' +
      '<path d="M60 22 L62 27 L66 25 L65 30 L69 31 L64 34 L65 37 L60 35.5 L55 37 L56 34 L51 31 L55 30 L54 25 L58 27 Z" fill="#fdfcff"/>' +
      eye(46, 66, 4.5) + eye(74, 66, 4.5) +
      '<ellipse cx="37" cy="79" rx="6.5" ry="4" fill="#f4a3bb" opacity=".7"/><ellipse cx="83" cy="79" rx="6.5" ry="4" fill="#f4a3bb" opacity=".7"/>' +
      snout(82, "#f3a9c0", "#c97a92") +
      '<path d="M54 93 Q60 97 66 93" stroke="#2f3347" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M24 98 Q60 112 96 98 L96 108 Q60 122 24 108 Z" fill="#9fd3c7"/><path d="M40 103 v10 M52 105 v10 M64 105 v10 M76 103 v10" stroke="#c9ebe3" stroke-width="3"/>' +
      '<path d="M80 104 L90 104 L92 120 L80 120 Z" fill="#8cc8bb"/></svg>';
    if (style === "D") return open +
      '<defs><radialGradient id="' + id + 'g" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fbe4f6"/><stop offset="1" stop-color="#d8b6ef"/></radialGradient></defs>' +
      '<path d="M28 42 L36 20 L52 34 Z" fill="#d6b0ee"/><path d="M92 42 L84 20 L68 34 Z" fill="#d6b0ee"/>' +
      '<circle cx="60" cy="66" r="42" fill="url(#' + id + 'g)"/>' +
      [[34, 34, "#f6c1d6"], [47, 28, "#fbe08f"], [60, 26, "#b8d8f5"], [73, 28, "#f6c1d6"], [86, 34, "#fbe08f"]].map(([x, y, c]) =>
        '<circle cx="' + (x - 4) + '" cy="' + y + '" r="3.6" fill="' + c + '"/><circle cx="' + (x + 4) + '" cy="' + y + '" r="3.6" fill="' + c + '"/><circle cx="' + x + '" cy="' + (y - 4) + '" r="3.6" fill="' + c + '"/><circle cx="' + x + '" cy="' + (y + 4) + '" r="3.6" fill="' + c + '"/><circle cx="' + x + '" cy="' + y + '" r="2.6" fill="#fff6c9"/>').join("") +
      '<ellipse cx="40" cy="31" rx="4" ry="2" fill="#a6dcb6" transform="rotate(-30 40 31)"/><ellipse cx="80" cy="31" rx="4" ry="2" fill="#a6dcb6" transform="rotate(30 80 31)"/>' +
      '<ellipse cx="45" cy="62" rx="6" ry="7" fill="#3a2f5a"/><ellipse cx="75" cy="62" rx="6" ry="7" fill="#3a2f5a"/>' + star(47, 59, 3, "#fff") + star(77, 59, 3, "#fff") +
      '<ellipse cx="35" cy="76" rx="7" ry="4.5" fill="#f4a3cf" opacity=".6"/><ellipse cx="85" cy="76" rx="7" ry="4.5" fill="#f4a3cf" opacity=".6"/>' +
      snout(79, "#e8aee0", "#b67aa6") +
      '<path d="M53 91 Q60 97 67 91" stroke="#3a2f5a" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      star(16, 56, 6, "#f3d38f") + star(104, 70, 5, "#f3d38f") + star(100, 22, 4, "#cdbcf0") + star(18, 96, 4, "#f6c1d6") + "</svg>";
    if (style === "E") return open +
      '<defs><radialGradient id="' + id + 'g" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#fff0f4"/><stop offset="1" stop-color="#f7bfd0"/></radialGradient></defs>' +
      '<path d="M30 46 L36 30 L48 42 Z" fill="#f4b3c7"/><path d="M90 46 L84 30 L72 42 Z" fill="#f4b3c7"/>' +
      '<ellipse cx="60" cy="72" rx="46" ry="38" fill="url(#' + id + 'g)"/>' +
      '<path d="M37 64 Q43 57 49 64" stroke="#2f3347" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M71 64 Q77 57 83 64" stroke="#2f3347" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="32" cy="74" rx="8" ry="5" fill="#ff9fbb" opacity=".55"/><ellipse cx="88" cy="74" rx="8" ry="5" fill="#ff9fbb" opacity=".55"/>' +
      snout(74, "#f6a8c0", "#cf7f98") +
      '<path d="M54 85 Q57 89 60 85 Q63 89 66 85" stroke="#2f3347" stroke-width="2.3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="60" cy="100" r="13" fill="#f3d38f" stroke="#e0b25a" stroke-width="2.5"/><circle cx="60" cy="100" r="8.5" fill="none" stroke="#e8c36f" stroke-width="1.5"/>' +
      '<text x="60" y="104.5" text-anchor="middle" font-size="12" font-weight="800" font-family="system-ui, sans-serif" fill="#b8892f">$</text>' +
      '<ellipse cx="45" cy="98" rx="6" ry="5" fill="#f7bfd0"/><ellipse cx="75" cy="98" rx="6" ry="5" fill="#f7bfd0"/>' +
      star(104, 40, 5, "#f3d38f") + "</svg>";
    // A: classic Penny with a money sprout
    return open +
      '<path d="M60 30 C60 22 60 18 60 14" stroke="#7fbf95" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="52" cy="14" rx="8" ry="4.5" fill="#a6dcb6" transform="rotate(-25 52 14)"/><ellipse cx="68" cy="12" rx="8" ry="4.5" fill="#a6dcb6" transform="rotate(25 68 12)"/>' +
      '<path d="M30 40 L38 20 L52 34 Z" fill="#f2b0c4"/><path d="M90 40 L82 20 L68 34 Z" fill="#f2b0c4"/>' +
      '<circle cx="60" cy="66" r="42" fill="#f8cdd9"/>' +
      '<rect x="52" y="28" width="16" height="4" rx="2" fill="#e39ab2"/>' +
      '<ellipse cx="38" cy="76" rx="7" ry="4.5" fill="#f4a3bb" opacity=".7"/><ellipse cx="82" cy="76" rx="7" ry="4.5" fill="#f4a3bb" opacity=".7"/>' +
      eye(45, 60, 4.5) + eye(75, 60, 4.5) +
      snout(78, "#f3a9c0", "#c97a92") +
      '<path d="M52 92 Q60 98 68 92" stroke="#2f3347" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>';
  }
  function sixMonthChart(ym) {
    const months = [];
    for (let i = 5; i >= 0; i--) { const k = shiftMonth(ym, -i), x = monthStats(k); months.push({ label: monthLabel(k, { month: "short" }), spent: x.spent, income: x.income }); }
    return '<div class="card"><div class="card-head"><h2>📊 Last 6 months</h2><div class="row small"><span class="row" style="gap:5px"><span class="dot" style="width:10px;height:10px;border-radius:3px;background:var(--chart-in)"></span>In</span><span class="row" style="gap:5px"><span class="dot" style="width:10px;height:10px;border-radius:3px;background:var(--chart-out)"></span>Spent</span></div></div>' +
      barChart(months, [{ key: "income", name: "In", color: "var(--chart-in)" }, { key: "spent", name: "Spent", color: "var(--chart-out)" }]) + "</div>";
  }
  function tile(ic, color, label, value, emo) {
    return '<div class="stat tile"><span class="tile-emoji" aria-hidden="true">' + emo + '</span><div style="min-width:0"><div class="label">' + label + '</div><div class="v">' + value + "</div></div></div>";
  }
  function stat(ic, color, label, value, sub) {
    return '<div class="stat">' + '<span class="bubble" style="background:color-mix(in srgb,' + color + ' 15%,transparent);color:' + color + '">' + icon(ic) + '</span><div style="min-width:0"><div class="label">' + label + '</div><div class="v">' + value + '</div><div class="s">' + sub + "</div></div></div>";
  }
  function bar(p, invert) {
    const cls = invert ? (p >= 1 ? "" : "warn") : p > 1 ? "bad" : p > 0.85 ? "warn" : "";
    return '<div class="track"><i class="' + cls + '" style="width:' + Math.min(100, p * 100) + '%"></i></div>';
  }

  /* First-time setup: one friendly question per screen ---------------- */
  let wzMsg = "";
  function wizardEl() { let el = $("#wizard"); if (!el) { el = document.createElement("div"); el.id = "wizard"; el.className = "wizard"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); document.body.appendChild(el); } return el; }
  function closeWizard() { const el = $("#wizard"); if (el) el.parentNode.removeChild(el); document.body.classList.remove("wz-open"); }
  function wzMoneyValue(path) {
    const [kind, key] = path.split(".");
    if (kind === "tax") return num(state.tax[key]);
    if (kind === "cat") { const c = state.categories.find((x) => x.id === key); return c && c.touched ? num(c.budget) : 0; }
    if (kind === "acct") { const a = state.accounts.find((x) => x.type === key && !x.example); return a ? num(a.balance) : 0; }
    return 0;
  }
  const ASSET_TYPES = () => C.accountTypes.filter((t) => t.kind === "asset" && t.id !== "home" && t.id !== "car");
  function wzAcctRow(a) {
    a = a || {};
    return '<div class="wz-acct"><input type="hidden" name="acctId" value="' + esc(a.id || "") + '">' +
      '<select name="acctType" aria-label="Type of account">' + ASSET_TYPES().map((t) => '<option value="' + t.id + '"' + (a.type === t.id ? " selected" : "") + ">" + esc(t.name) + "</option>").join("") + "</select>" +
      '<input name="acctName" placeholder="Nickname (optional), e.g. EQ Bank" value="' + esc(a.name && a.name !== acctType(a.type).name ? a.name : "") + '" autocomplete="off">' +
      moneyInput('name="acctAmt" min="0" placeholder="0" value="' + (a.id ? num(a.balance) : "") + '"') +
      '<button type="button" class="iconbtn" data-act="wzDelAcct" aria-label="Remove this account">' + icon("x") + "</button></div>";
  }
  function wzField(f) {
    if (f.type === "accounts") {
      const mine = state.accounts.filter((a) => !a.example && ASSET_TYPES().some((t) => t.id === a.type));
      const rows = mine.length ? mine.map(wzAcctRow) : (f.starters || ["chequing", "savings"]).map((t) => wzAcctRow({ type: t }));
      return '<div class="wz-accts" id="wzAccts">' + rows.join("") + '</div><button type="button" class="btn soft" data-act="wzAddAcct">' + icon("plus") + " Add another account</button>" +
        '<p class="tiny muted">Have two savings accounts? Add each one. Debts like credit cards come on the next screen.</p>';
    }
    if (f.type === "text") { const [a, b] = f.path.split("."); return '<label class="field">' + esc(f.label) + '<input name="' + f.path + '" value="' + esc(state[a][b] || "") + '" placeholder="' + esc(f.placeholder || "") + '" autocomplete="off"></label>'; }
    if (f.type === "money") { const v = wzMoneyValue(f.path); return '<label class="field">' + esc(f.label) + moneyInput('name="' + f.path + '" min="0" placeholder="' + esc(f.placeholder || "0") + '" value="' + (v || "") + '"') + "</label>"; }
    if (f.type === "choice") { const [a, b] = f.path.split("."); return '<div class="pick-grid">' + f.options.map(([v, label, emo]) => '<label class="pick"><input type="radio" name="' + f.path + '" value="' + v + '"' + (state[a][b] === v ? " checked" : "") + '><span class="pick-emoji">' + emo + "</span><span>" + esc(label) + "</span></label>").join("") + "</div>"; }
    if (f.type === "subs") return '<div class="pick-grid">' + f.options.map(([name, price, ic, emo]) => { const has = state.subs.some((x) => x.name.toLowerCase() === name.toLowerCase() && !x.example); return '<label class="pick"><input type="checkbox" name="sub" value="' + esc(name) + '"' + (has ? " checked" : "") + '><span class="pick-emoji">' + emo + "</span><span>" + esc(name) + '</span><span class="tiny muted">about ' + money2(price) + "/mo</span></label>"; }).join("") + "</div>";
    if (f.type === "goal") return '<div class="pick-grid">' + C.goalTemplates.map((t, i) => '<label class="pick"><input type="radio" name="goalTpl" value="' + i + '" data-change="wzGoal"><span class="pick-emoji">' + icon(t.icon) + "</span><span>" + esc(t.name) + "</span></label>").join("") + "</div>" +
      '<label class="field" style="margin-top:12px">How much do you want to save?' + moneyInput('name="goalTarget" min="0" placeholder="Pick a goal above"') + "</label>";
    return "";
  }
  function renderWizard() {
    const steps = C.setup.steps, i = state.ui.setupStep || 0, el = wizardEl();
    document.body.classList.add("wz-open");
    if (i < 0) { // welcome
      el.innerHTML = '<div class="wz-inner wz-center">' + mascot(170, null, "wave") + "<h1>Welcome to " + esc(C.appName) + "! 🌱</h1>" +
        '<div class="bubble-say bubble-big">Hi! I\'m ' + esc(C.mascotName || "Penny") + " 🐷, your money pal. I'm here to help you save, one tiny step at a time. No judgment, just lots of cheering!</div>" +
        '<p class="wz-sub">A calm, friendly home for your money. Let\'s set things up together.</p>' +
        '<div class="stack" style="width:100%;max-width:360px"><button class="btn big-btn" data-act="wzStart">Let\'s set it up ✨ <span class="tiny">(about 3 minutes)</span></button><button class="btn ghost" data-act="wzExample">Just look around first 👀</button>' +
        (syncReady() && !signedIn() ? '<button type="button" class="linklike small" data-act="wzSignIn">Already have an account? Sign in</button>' : "") + "</div>" +
        '<p class="tiny muted">🔒 ' + (syncReady() ? "Your money stuff is private. It's locked with your password, so only you can read it." : "Everything stays on this device. Nothing is shared.") + "</p></div>";
      return;
    }
    if (i >= steps.length) return renderWizardDone();
    const st = steps[i], leftN = steps.length - i;
    el.innerHTML = '<div class="wz-inner"><div class="wz-top"><div class="wz-dots" aria-hidden="true">' + steps.map((_, k) => '<span class="' + (k < i ? "on" : k === i ? "now" : "") + '"></span>').join("") + "</div>" +
      '<button class="iconbtn" data-act="wzLater" title="Finish later" aria-label="Finish later">' + icon("x") + "</button></div>" +
      '<div class="label">Step ' + (i + 1) + " of " + steps.length + "</div>" +
      (wzMsg ? '<div class="wz-cheer">' + esc(wzMsg) + "</div>" : "") +
      (pennyOn() ? '<div class="wz-penny">' + mascot(130, "P", st.pose || "happy") + '<span class="wz-badge">' + st.emoji + "</span></div>" : '<div class="wz-art">' + st.emoji + "</div>") + "<h1>" + esc(st.title) + '</h1><p class="wz-sub">' + esc(st.sub) + "</p>" +
      '<form id="wzForm" data-form="wizard" class="stack" style="width:100%">' + st.fields.map(wzField).join("") +
      '<div class="wz-actions">' + (i > 0 ? '<button type="button" class="btn ghost" data-act="wzBack">' + icon("chevron-left") + " Back</button>" : "<span></span>") +
      '<div class="row"><button type="button" class="btn ghost" data-act="wzSkip">Skip</button><button class="btn big-btn">' + (leftN === 1 ? "Finish 🎉" : "Next") + "</button></div></div></form></div>";
    const first = el.querySelector("#wzForm input:not([type=radio]):not([type=checkbox])"); if (first) setTimeout(() => first.focus(), 40);
  }
  function wzSetMoney(path, v) {
    const [kind, key] = path.split(".");
    if (kind === "tax") state.tax[key] = v;
    else if (kind === "cat") { const c = state.categories.find((x) => x.id === key); if (c) { c.budget = v; c.touched = true; c.touchedOn = todayISO(); } }
    else if (kind === "acct") {
      const a = state.accounts.find((x) => x.type === key && !x.example);
      if (a) { a.balance = v; a.updated = todayISO(); } else if (v > 0) state.accounts.push({ id: uid(), name: acctType(key).name, type: key, balance: v, updated: todayISO() });
      snapshotNet();
    }
  }
  function applyWizardStep(st, form) {
    const fd = new FormData(form);
    for (const f of st.fields) {
      if (f.type === "text") { const [a, b] = f.path.split("."); state[a][b] = String(fd.get(f.path) || "").trim(); }
      if (f.type === "money") { const raw = fd.get(f.path); if (raw !== null && raw !== "") wzSetMoney(f.path, Math.max(0, num(raw))); }
      if (f.type === "choice") { const v = fd.get(f.path); if (v) { const [a, b] = f.path.split("."); state[a][b] = v; } }
      if (f.type === "subs") {
        const chosen = fd.getAll("sub");
        for (const [name, price, ic] of f.options) if (chosen.includes(name) && !state.subs.some((x) => x.name.toLowerCase() === name.toLowerCase())) state.subs.push({ id: uid(), name, amount: price, cycle: "monthly", next: toISO(addMonths(today(), 1)), icon: ic, status: "keep", reviewed: todayISO() });
      }
      if (f.type === "accounts") {
        const ids = fd.getAll("acctId"), types = fd.getAll("acctType"), names = fd.getAll("acctName"), amts = fd.getAll("acctAmt");
        types.forEach((type, i) => {
          const raw = amts[i]; if (raw === null || raw === undefined || String(raw).trim() === "") return;
          const name = String(names[i] || "").trim() || acctType(type).name, bal = Math.max(0, num(raw));
          const existing = ids[i] && state.accounts.find((a) => a.id === ids[i]);
          if (existing) { Object.assign(existing, { type, name, balance: bal, updated: todayISO(), manualOn: todayISO() }); delete existing.asOf; }
          else state.accounts.push({ id: uid(), name, type, balance: bal, updated: todayISO(), manualOn: todayISO() });
        });
        snapshotNet();
      }
      if (f.type === "goal") {
        const ti = fd.get("goalTpl"), target = num(fd.get("goalTarget"));
        if (ti !== null && target > 0) { const t = C.goalTemplates[+ti]; state.goals.push({ id: uid(), name: t.name, icon: t.icon, theme: t.theme, target, saved: 0, date: toISO(addMonths(today(), 12)), account: t.account || "TFSA", photo: null, history: [] }); }
      }
    }
  }
  // Setup XP: a step only counts when the person actually typed or picked something.
  // Nothing is awarded until the whole setup is finished, so clicking Next/Back earns nothing.
  document.addEventListener("input", (e) => { const f = e.target.closest && e.target.closest("#wzForm"); if (f) f.dataset.touched = "1"; });
  document.addEventListener("click", (e) => { const f = e.target.closest && e.target.matches("input") && e.target.closest("#wzForm"); if (f) f.dataset.touched = "1"; });
  function wzHasAnswer(st, form) {
    const fd = new FormData(form);
    return st.fields.some((f) =>
      f.type === "text" || f.type === "money" ? String(fd.get(f.path) || "").trim() !== "" :
      f.type === "choice" ? !!fd.get(f.path) : f.type === "subs" ? fd.getAll("sub").length > 0 :
      f.type === "goal" ? fd.get("goalTpl") !== null && num(fd.get("goalTarget")) > 0 :
      f.type === "accounts" ? fd.getAll("acctAmt").some((v) => String(v).trim() !== "") : false);
  }
  function wzAdvance(apply) {
    const steps = C.setup.steps, i = state.ui.setupStep || 0, st = steps[i];
    state.ui.setupFilled = state.ui.setupFilled || {};
    const form = $("#wzForm");
    if (apply && form) {
      const answered = wzHasAnswer(st, form);
      if (!answered) delete state.ui.setupFilled[st.id];
      else if (form.dataset.touched) state.ui.setupFilled[st.id] = true;
      applyWizardStep(st, form);
    }
    state.ui.setupStep = i + 1;
    const leftN = steps.length - (i + 1);
    wzMsg = leftN === 1 ? C.setup.lastOne : leftN === Math.floor(steps.length / 2) ? C.setup.halfway : C.setup.cheers[i % C.setup.cheers.length].replace("{left}", leftN);
    save();
    if (leftN > 0) { burst(["✨", "⭐", "💛"], 7, 0.55); renderWizard(); }
    else finishWizard();
  }
  let wzReward = null;
  function finishWizard() {
    state.ui.setupDone = true; state.ui.setupStep = C.setup.steps.length;
    const filled = C.setup.steps.filter((st) => (state.ui.setupFilled || {})[st.id]).length, all = filled === C.setup.steps.length;
    const earned = filled * C.setup.xpPerStep + (all ? C.setup.xpFinish : 0), owed = earned - (state.ui.setupXpGiven || 0);
    if (owed > 0) { state.ui.setupXpGiven = earned; award(owed, all ? "Setup complete!" : "Setup: " + filled + " steps filled in", true); }
    wzReward = { filled, earned: Math.max(0, owed), all };
    evaluate(); save(); render(); renderWizardDone(); confetti();
  }
  function renderWizardDone() {
    const el = wizardEl(), t = state.tax;
    const nCats = state.categories.filter((c) => c.touched).length, nSubs = state.subs.filter((x) => !x.example).length;
    const chips = [
      t.income ? "💼 Income added" : "", nCats ? "🏠 " + nCats + " budgets set" : "", nSubs ? "📺 " + nSubs + (nSubs === 1 ? " subscription" : " subscriptions") : "",
      state.accounts.length ? "🐷 " + state.accounts.length + (state.accounts.length === 1 ? " account" : " accounts") : "", state.goals.length ? "🎯 Goal: " + state.goals[state.goals.length - 1].name : ""
    ].filter(Boolean);
    el.innerHTML = '<div class="wz-inner wz-center">' + mascot(170, null, "celebrate") + "<h1>You did it" + (state.profile.name ? ", " + esc(state.profile.name) : "") + "! 🎉</h1>" +
      '<p class="wz-sub">Your money home is ready. That was the hardest part, and you\'re done. Seriously, be proud. 💛</p>' +
      (chips.length ? '<div class="wz-chips">' + chips.map((c) => '<span class="pill">' + esc(c) + "</span>").join("") + "</div>" : "") +
      (function () { const r = wzReward || { filled: 0, earned: 0, all: false }, n = C.setup.steps.length, full = C.setup.xpFinish + C.setup.xpPerStep * n;
        return r.earned > 0 ? '<p class="small" style="color:var(--warn);font-weight:700">+' + r.earned + " XP earned" + (r.all ? "" : " for " + r.filled + " of " + n + " steps") + "</p>" + (r.all ? "" : '<p class="tiny muted">Fill in every step (My Stash, then Run the setup again) to unlock the full ' + full + " XP.</p>") :
          '<p class="tiny muted">No XP yet. Answer the setup questions (My Stash, then Run the setup again) to earn up to ' + full + " XP.</p>"; })() +
      '<div class="stack" style="width:100%;max-width:360px"><button class="btn big-btn" data-act="wzHome">Take me home 🏡</button><button class="btn ghost" data-act="wzCheckin">Try the 1-minute money check-in ✨</button></div></div>';
  }

  /* Money check-in: friendly yes/no questions with real stats ---------- */
  let ciIndex = 0;
  function ciQuestion() {
    const Q = C.checkin.questions, q = Q[ciIndex];
    openModal('<div class="ci"><div class="ci-dots">' + Q.map((_, i) => '<span class="' + (i < ciIndex ? "on" : i === ciIndex ? "now" : "") + '"></span>').join("") + "</div>" +
      '<div class="ci-emoji">' + q.emoji + '</div><div class="label">Question ' + (ciIndex + 1) + " of " + Q.length + "</div><h2>" + esc(q.q) + "</h2>" +
      (q.type === "age"
        ? (q.hint ? '<p class="small muted">' + esc(q.hint) + "</p>" : "") + '<div class="age-grid">' + C.checkin.ages.map(([k, label]) => '<button class="btn ' + (state.checkin.age === k ? "" : "ghost") + '" data-act="ciAge" data-v="' + k + '">' + esc(label) + "</button>").join("") + '</div><button class="btn ghost sm" data-act="ciAge" data-v="">Skip this one</button></div>'
        : "") +
      (q.type === "age" ? "" :
      '<div class="stack" style="margin-top:6px"><button class="btn" data-act="ciAnswer" data-v="yes">' + esc(q.yesLabel || "Yes") + '</button><button class="btn ghost" data-act="ciAnswer" data-v="no">' + esc(q.noLabel || "No") + "</button>" +
      (q.skipLabel ? '<button class="btn ghost" data-act="ciAnswer" data-v="skip">' + esc(q.skipLabel) + "</button>" : "") + "</div>" +
      '<p class="tiny muted" style="text-align:center">There are no wrong answers here. It just helps the app cheer you on. 💛</p></div>'));
  }
  function ciAnswer(v) {
    const q = C.checkin.questions[ciIndex], ck = state.checkin;
    ck.answers[q.id] = v;
    if (v === "yes") (q.yesTicks || []).forEach((k) => { state.path.done[k] = state.path.done[k] || todayISO(); });
    if (v === "skip" && q.skipStep) state.path.skipped[q.skipStep] = todayISO();
    const msg = v === "yes" ? q.yes : v === "skip" ? q.skip : q.no, last = ciIndex === C.checkin.questions.length - 1;
    const ageLabel = (C.checkin.ages.find((a) => a[0] === ck.age) || [])[1];
    const ageNote = v !== "skip" && ck.age && q.ageNote && q.ageNote[ck.age];
    const ciPose = q.neutral ? (v === "yes" ? "comfort" : "happy") : v === "yes" ? "proud" : v === "skip" ? "happy" : "comfort";
    openModal('<div class="ci">' + (pennyOn() ? mascot(120, "P", ciPose) : '<div class="ci-emoji">' + (v === "yes" ? "🎉" : v === "skip" ? "👍" : "💛") + "</div>") + "<h2>" + (q.neutral ? "Thanks for sharing" : v === "yes" ? "Look at you!" : v === "skip" ? "Got it!" : "That's okay!") + "</h2>" +
      '<p style="text-align:center;font-size:1.02rem">' + esc(msg) + "</p>" + (ageNote ? '<div class="callout" style="text-align:left;width:100%"><span style="font-size:1.3rem">👥</span><div><b>People ' + esc(ageLabel.toLowerCase()) + ":</b> " + esc(ageNote) + (q.ageSource ? '<div class="tiny muted" style="margin-top:4px">Source: ' + esc(q.ageSource) + "</div>" : "") + "</div></div>" : "") +
      (q.source && v !== "skip" ? '<p class="tiny muted" style="text-align:center">Source: ' + esc(q.source) + "</p>" : "") +
      '<button class="btn" data-act="ciNext">' + (last ? "See my results ✨" : "Next question") + "</button></div>");
    if (v === "yes") burst(["⭐", "✨", "🎉", q.emoji]);
    save();
  }
  function ciResults() {
    const ck = state.checkin, Q = C.checkin.questions;
    const counted = Q.filter((q) => q.type !== "age" && !q.neutral);
    const wins = counted.filter((q) => ck.answers[q.id] === "yes"), todo = counted.filter((q) => ck.answers[q.id] === "no");
    ck.done = todayISO();
    if (!ck.rewarded) { ck.rewarded = true; award(C.checkin.xp, "Money check-in done"); }
    closeModal(); evaluate(); save(); render();
    openModal('<div class="ci">' + (pennyOn() ? mascot(130, "P", "celebrate") : '<div class="ci-emoji">🏅</div>') + "<h2>" + (wins.length ? "You've got " + wins.length + (wins.length === 1 ? " big win" : " big wins") + " already!" : "Every expert started right here") + "</h2>" +
      (wins.length ? '<div class="stack" style="width:100%">' + wins.map((q) => '<div class="callout">' + '<span style="font-size:1.3rem">' + q.emoji + "</span><div>" + esc(q.yes) + "</div></div>").join("") + "</div>" : '<p style="text-align:center">Honestly? Showing up and answering these took courage. That counts.</p>') +
      (todo.length ? '<p class="small" style="text-align:center;margin-top:4px">Next, we\'ll work on <b>' + todo.length + "</b> " + (todo.length === 1 ? "thing" : "things") + " together, one small step at a time in Piggy Quests. No rush. 🌱</p>" : '<p class="small" style="text-align:center">You\'re crushing it. Seriously. 🏆</p>') +
      '<div class="row" style="justify-content:center"><a class="btn" href="#path" data-close>See my Piggy Quests</a><button class="btn ghost" data-close>Close</button></div></div>');
    celebrate("step", { title: "Check-in complete!", sub: "Thanks for being honest with yourself. That's the hardest part.", ms: 2600 });
  }
  function checkinCard() {
    const ck = state.checkin;
    return '<div class="card ci-card"><div class="ci-emoji" style="font-size:2.2rem">' + (ck.done ? "✨" : "👋") + '</div><div style="flex:1;min-width:0"><h3>' + (ck.done ? "Money check-in" : "Take the 1-minute money check-in") + '</h3><p class="small muted">' +
      (ck.done ? "You did this on " + parseISO(ck.done).toLocaleDateString(C.locale, { month: "long", day: "numeric" }) + ". Things change! Retake it any time." : C.checkin.questions.length + " quick questions. See how you compare to other Canadians your age (spoiler: probably better than you think).") +
      '</p></div><button class="btn ' + (ck.done ? "ghost" : "gold") + '" data-act="startCheckin">' + (ck.done ? "Retake" : "Let's go") + "</button></div>";
  }
  let factIndex = null;
  function factCard() {
    const F = C.funFacts || []; if (!F.length) return "";
    if (factIndex === null) factIndex = Math.floor(Date.now() / 86400000) % F.length;
    const [emo, text, src] = F[factIndex % F.length];
    if (pennyOn()) return '<div class="card fact fact-penny">' + mascot(84, "P", "surprised") + '<div style="flex:1;min-width:0"><div class="row between"><span class="label">Did you know?</span><button class="btn soft sm" data-act="nextFact">Another one ' + icon("refresh-cw") + '</button></div><p style="margin-top:6px">' + emo + " " + esc(text) + "</p>" + (src ? '<p class="tiny muted" style="margin-top:4px">Source: ' + esc(src) + "</p>" : "") + "</div></div>";
    return '<div class="card fact"><div class="row between"><span class="label">Did you know?</span><button class="btn soft sm" data-act="nextFact">Another one ' + icon("refresh-cw") + '</button></div><div class="row" style="flex-wrap:nowrap;gap:14px;margin-top:8px"><span style="font-size:2rem">' + emo + '</span><div><p>' + esc(text) + "</p>" + (src ? '<p class="tiny muted" style="margin-top:4px">Source: ' + esc(src) + "</p>" : "") + "</div></div></div>";
  }

  /* PAGE: Money path ------------------------------------------------- */
  const pathOpen = {};
  function pathSummary() {
    const H = pathHelpers(), st = C.moneyPath.map((step) => ({ step, st: stepStatus(step, H) }));
    const done = st.filter((x) => x.st.done).length, cur = st.find((x) => !x.st.done);
    return { H, st, done, total: C.moneyPath.length, cur: cur ? cur.step : null };
  }
  function pathMood(done, total) {
    if (done === 0) return ["Every journey starts with step one.", "You don't need to have it all figured out. Just start where you are. You've got this! 💛"];
    if (done >= total) return ["You finished the whole path! 🏆", "Seriously, that's huge. Keep checking in once a year and enjoy the calm."];
    if (done <= 2) return ["You're on your way!", "The first steps are the hardest, and you've already taken some. Proud of you."];
    if (done <= 5) return ["Look at you go!", "You're building real momentum. Money stress is shrinking with every step."];
    return ["Almost at the top!", "You're further than most people ever get. Keep that energy!"];
  }
  PAGES.path = {
    render() {
      const P = pathSummary(), [moodT, moodS] = pathMood(P.done, P.total);
      return '<div class="page">' + exampleNote() +
        head("Your money plan", "One step at a time. This is the order that works for most people in Canada to go from stressed to steady. No rush, no judgment. 🌱") +
        '<div class="card row path-hero" style="gap:18px;flex-wrap:nowrap">' + (pennyOn() ? mascot(96, "P", P.done >= P.total ? "celebrate" : P.done ? "proud" : "wave") : "") + ring(P.done / P.total, "var(--good)", 86, P.done + "/" + P.total) +
        '<div style="min-width:0"><h2>' + moodT + '</h2><p class="small muted" style="margin-top:4px">' + moodS + "</p>" +
        (P.cur ? '<p class="small" style="margin-top:8px">📍 You are here: <b>' + esc(P.cur.title) + "</b></p>" : "") + "</div></div>" +
        checkinCard() +
        '<div class="callout">' + icon("heart") + "<div>Life isn't a straight line, so neither is this. Tick things off whenever you do them, in any order. Steps tick themselves ✨ when your numbers show they're done.</div></div>" +
        '<div class="path"><div class="path-fill" style="height:calc((100% - 40px) * ' + (P.done / P.total).toFixed(3) + ')"></div>' +
        P.st.map(({ step, st }, i) => pathStop(step, st, i, P)).join("") + "</div></div>";
    },
    after() {
      $$("details[data-step]").forEach((d) => d.addEventListener("toggle", () => { pathOpen[d.dataset.step] = d.open; }));
    }
  };
  function pathStop(step, st, i, P) {
    const isCur = P.cur && P.cur.id === step.id, cls = st.skipped ? "skipped" : st.done ? "done" : isCur ? "current" : "";
    const open = pathOpen[step.id] !== undefined ? pathOpen[step.id] : isCur;
    const pill = st.skipped ? '<span class="pill">Skipped</span>' : st.done ? '<span class="pill good">Done 🎉</span>' : isCur ? '<span class="pill" style="background:var(--gold-soft);color:var(--warn)">You are here 📍</span>' : st.n ? '<span class="pill">' + st.n + " of " + st.of + " done</span>" : '<span class="pill">Coming up</span>';
    const items = pathItems(step);
    return '<div class="stop ' + cls + '"><div class="node" style="--c:' + step.color + '">' + (st.done && !st.skipped ? "✅" : step.emoji) + "</div>" +
      '<div class="card stop-card"><div class="row between" style="gap:8px"><span class="label">Step ' + (i + 1) + "</span>" + pill + "</div>" +
      "<h3 style=\"margin-top:4px\">" + esc(step.title) + '</h3><p class="small muted">' + esc(step.short) + "</p>" +
      '<details data-step="' + step.id + '"' + (open ? " open" : "") + '><summary class="small"><b>' + (st.done ? "See the checklist" : "What to do") + "</b></summary>" + (step.id === "full" ? efundCard(true) : "") +
      '<div class="stack" style="margin-top:10px;gap:0">' + items.map((it) => {
        const s = itemState(step, it, pathHelpers()), k = pathKey(step.id, it.id);
        return '<div class="chk' + (s.done ? " on" : "") + '"><input type="checkbox" id="pi-' + esc(k) + '" data-change="pathItem" data-k="' + esc(k) + '"' + (s.done ? " checked" : "") + (s.auto ? " disabled" : "") + '>' +
          '<label for="pi-' + esc(k) + '" class="txt">' + esc(it.text) + (it.bonus ? ' <span class="pill" style="background:var(--gold-soft);color:var(--warn)">⭐ Bonus</span>' : "") + (s.auto ? ' <span class="pill good">✨ Done from your numbers</span>' : "") + "</label>" +
          (it.go && !s.done ? '<button class="btn soft sm" data-act="pathGo" data-step="' + step.id + '" data-item="' + esc(it.id) + '">Go there ' + icon("chevron-right") + "</button>" : "") +
          (it.custom ? '<button class="iconbtn del" data-act="pathDel" data-step="' + step.id + '" data-item="' + esc(it.id) + '" title="Remove">' + icon("x") + "</button>" : "") + "</div>";
      }).join("") + "</div>" +
      '<form class="row" data-form="pathAdd" style="margin-top:10px"><input type="hidden" name="step" value="' + step.id + '"><input name="text" placeholder="Add your own to-do for this step" required style="flex:1 1 200px" aria-label="Add your own to-do"><button class="btn ghost sm">' + icon("plus") + " Add</button></form>" +
      '<div class="grid g2" style="margin-top:12px;gap:10px"><div class="term"><b>💡 Why this step</b><p>' + esc(step.why) + "</p>" + (step.tip ? '<p style="margin-top:6px"><b>Tip:</b> ' + esc(step.tip) + "</p>" : "") + "</div>" +
      '<div class="term"><b>📖 Word to know: ' + esc(step.term[0]) + "</b><p>" + esc(step.term[1]) + "</p></div></div>" +
      (step.optional ? '<div class="row" style="margin-top:10px"><button class="btn ghost sm" data-act="pathSkip" data-step="' + step.id + '">' + (st.skipped ? "Actually, this applies to me" : "This doesn't apply to me") + "</button></div>" : "") +
      "</details></div></div>";
  }
  function pathHomeCard() {
    const P = pathSummary();
    return '<a class="card path-mini" href="#path"><span class="node" style="width:52px;height:52px;font-size:1.5rem">' + (P.cur ? P.cur.emoji : "🏆") + '</span><div style="flex:1;min-width:0"><div class="label">Piggy Quests · ' + P.done + " of " + P.total + " steps</div><b>" + (P.cur ? "Next up: " + esc(P.cur.title) : "You finished the whole path!") + '</b><div class="track thin" style="margin-top:8px"><i style="width:' + (P.done / P.total) * 100 + '%"></i></div></div><span class="q-go">' + icon("chevron-right") + "</span></a>";
  }

  /* ==================================================================
     Receipt scanner: camera photos, gallery photos, PDFs and emailed bills
     - Emails, text files and PDFs with text are read right here on the device.
     - Photos and scanned PDFs: in the online artifact Penny asks Claude to read
       them (the viewer allows it once); in the downloaded app a free
       text-recognition library (Tesseract) reads them in the browser.
     - Everything lands on a review screen first, so nothing is saved unchecked.
     ================================================================== */
  const LIBS = {
    pdf: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    pdfWorker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    ocr: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
    heic: "https://cdn.jsdelivr.net/npm/heic-to@1.6.3/dist/csp/heic-to.min.js"
  };
  const loadedScripts = {};
  function loadScript(url) {
    if (!loadedScripts[url]) loadedScripts[url] = new Promise((res, rej) => {
      const el = document.createElement("script"); el.src = url; el.async = true;
      el.onload = () => res(); el.onerror = () => { delete loadedScripts[url]; rej(new Error("load_failed")); };
      document.head.appendChild(el);
    });
    return loadedScripts[url];
  }
  const withTimeout = (p, ms, code) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(code || "timeout")), ms))]);
  const inFrame = () => { try { return window.self !== window.top; } catch (e) { return true; } };
  let samplePromise = null;
  function getSample() {
    if (!samplePromise) samplePromise = window.claude && typeof window.claude.use === "function" ? Promise.resolve(window.claude.use("sample")).catch(() => null) : Promise.resolve(null);
    return samplePromise;
  }

  // ---- reading files ----
  const isHeic = (b) => /heic|heif/i.test(((b && b.type) || "") + " " + ((b && b.name) || ""));
  // iPhone HEIC pictures: Safari opens them itself, other browsers get a converter
  async function openPicture(blob, max) {
    try { return await imageToJpeg(blob, max); }
    catch (e) {
      if (!isHeic(blob)) throw e;
      const mod = await withTimeout(import(LIBS.heic), 45000, "heic_timeout");
      if (!mod || typeof mod.heicTo !== "function") throw e;
      const out = await withTimeout(mod.heicTo({ blob, type: "image/jpeg", quality: 0.9 }), 60000, "heic_timeout");
      return imageToJpeg(out, max);
    }
  }
  function invertImage(blob) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(blob), img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
        const ctx = cv.getContext("2d"); ctx.filter = "invert(1) grayscale(1)"; ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url);
        cv.toBlob((b) => (b ? res(b) : rej(new Error("bad_image"))), "image/png");
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad_image")); };
      img.src = url;
    });
  }
  function imageToJpeg(blob, max) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(blob), img = new Image();
      img.onload = () => {
        const sc = Math.min(1, (max || 1600) / Math.max(img.width, img.height, 1));
        const cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(img.width * sc)); cv.height = Math.max(1, Math.round(img.height * sc));
        const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        const small = document.createElement("canvas"), s2 = Math.min(1, 420 / Math.max(cv.width, cv.height));
        small.width = Math.round(cv.width * s2); small.height = Math.round(cv.height * s2); small.getContext("2d").drawImage(cv, 0, 0, small.width, small.height);
        cv.toBlob((b) => (b ? res({ blob: b, preview: small.toDataURL("image/jpeg", 0.7) }) : rej(new Error("bad_image"))), "image/jpeg", 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad_image")); };
      img.src = url;
    });
  }
  async function readPdf(file, maxPages) {
    await loadScript(LIBS.pdfWorker).catch(() => null); // lets pdf.js run without a separate worker
    await loadScript(LIBS.pdf);
    const lib = window.pdfjsLib; if (!lib) throw new Error("pdf_unavailable");
    lib.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    let text = ""; const pages = [];
    for (let i = 1; i <= Math.min(doc.numPages, maxPages || 3); i++) {
      const tc = await (await doc.getPage(i)).getTextContent(), rows = {};
      pages.push(tc.items.filter((it) => it.str && it.str.trim()).map((it) => ({ s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width || 0, h: Math.abs(it.transform[3]) || 10 })));
      for (const it of tc.items) { const y = Math.round(it.transform[5] / 3); (rows[y] = rows[y] || []).push(it); }
      Object.keys(rows).sort((a, b) => b - a).forEach((y) => { text += rows[y].sort((a, b) => a.transform[4] - b.transform[4]).map((x) => x.str).join(" ") + "\n"; });
    }
    let image = null;
    if (text.replace(/\s/g, "").length < 25) { // a scanned PDF: turn page 1 into a picture
      const pg = await doc.getPage(1), vp = pg.getViewport({ scale: 2 }), cv = document.createElement("canvas");
      cv.width = vp.width; cv.height = vp.height;
      await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      image = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.85));
    }
    return { text, image, pages };
  }
  function cleanText(raw) {
    let t = String(raw || "");
    if (/^(from|subject|date|received|mime-version):/im.test(t)) t = t.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
    if (/<(html|body|div|table|td|p|br|span)[\s>\/]/i.test(t)) {
      t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|table)>/gi, "\n").replace(/<\/t[dh]>/gi, " ")
        .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#36;|&dollar;/g, "$").replace(/&#?[a-z0-9]+;/gi, " ");
    }
    return t.replace(/\r/g, "").replace(/[ \t ]+/g, " ").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
  }

  // ---- understanding the text ----
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  function findDate(text) {
    const labelled = text.split("\n").filter((l) => /\b(statement|bill|invoice|purchase|order|transaction|receipt|issue)?\s*date\b/i.test(l) && !/due|period|renew|next/i.test(l));
    for (const l of labelled) { const d = findDateIn(l); if (d) return d; }
    return findDateIn(text);
  }
  function findDateIn(text) {
    const found = [], ok = (i, y, mo, d) => { if (y < 100) y += 2000; const dt = new Date(y, mo - 1, d); if (dt.getMonth() === mo - 1 && dt.getDate() === d && y > 2000 && y < 2100) found.push({ i, d: toISO(dt) }); };
    let m;
    const r1 = /\b(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/g; while ((m = r1.exec(text))) ok(m.index, +m[1], +m[2], +m[3]);
    const r2 = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/g; while ((m = r2.exec(text))) { const a = +m[1], b = +m[2]; if (a > 12) ok(m.index, +m[3], b, a); else ok(m.index, +m[3], a, b); }
    const r3 = /\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/gi; while ((m = r3.exec(text))) ok(m.index, +m[3], MONTHS[m[1].toLowerCase()], +m[2]);
    const r4 = /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})/gi; while ((m = r4.exec(text))) ok(m.index, +m[3], MONTHS[m[2].toLowerCase()], +m[1]);
    const latest = toISO(new Date(Date.now() + 2 * 86400000));
    const good = found.filter((x) => x.d <= latest).sort((a, b) => a.i - b.i);
    return good.length ? good[0].d : null;
  }
  function amountsIn(line) {
    const out = [], rx = /(?:C?A?\$|\$)?\s?(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d)/g; let m;
    while ((m = rx.exec(line))) out.push(parseFloat(m[1].replace(/,/g, "") + "." + m[2]));
    return out;
  }
  function findTotal(lines) {
    const skip = /sub\s*-?\s*total|total\s*(savings|saved|discount|tax|hst|gst|items?|qty|quantity|before)|items?\s*total|you\s*saved|previous\s*balance|payment\s*received|points/i;
    const tiers = [/\b(grand\s*total|total\s*due|amount\s*due|balance\s*due|total\s*to\s*pay|total\s*amount\s*due|amount\s*paid|total\s*paid|total\s*charged|new\s*charges|total\s*cad|montant\s*total)\b/i, /\btotal\b/i];
    for (const rx of tiers) {
      let found = null;
      lines.forEach((l, i) => { if (rx.test(l) && !skip.test(l)) { let a = amountsIn(l); if (!a.length && lines[i + 1]) a = amountsIn(lines[i + 1]); if (a.length) found = a[a.length - 1]; } });
      if (found != null && found > 0) return { total: found, sure: true };
    }
    const all = lines.flatMap(amountsIn).filter((a) => a > 0 && a < 100000);
    return all.length ? { total: Math.max(...all), sure: false } : { total: null, sure: false };
  }
  function findTax(lines) {
    for (const l of lines) if (/\b(hst|gst|pst|qst|tax)\b/i.test(l) && !/total|incl|including|registration|reg\.?\s*#|number|no\./i.test(l)) { const a = amountsIn(l); if (a.length) return a[a.length - 1]; }
    return null;
  }
  const titleCase = (t) => t.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).trim();
  function findMerchant(text, lines) {
    const from = text.match(/^from:\s*"?([^"<\n]*?)"?\s*<([^>\n]+)>/im) || text.match(/^from:\s*([^\n]+)/im);
    if (from) {
      const name = (from[1] || "").replace(/\b(no-?reply|noreply|do-?not-?reply|billing|notifications?|team|support)\b/gi, "").replace(/[^\w&'. -]/g, " ").trim();
      if (name.length > 1 && !/@/.test(name)) return name;
      const dom = ((from[2] || from[1] || "").match(/@(?:[a-z0-9-]+\.)*?([a-z0-9-]+)\.(?:com|ca|net|org)/i) || [])[1];
      if (dom) return titleCase(dom);
    }
    const known = state.rules.find((r) => r.match.length > 3 && new RegExp("\\b" + r.match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(text));
    if (known && lines.slice(0, 6).some((l) => l.toUpperCase().includes(known.match.toUpperCase()))) return titleCase(known.match);
    const bad = /receipt|invoice|statement|welcome|thank|order|date|time|total|subtotal|cashier|store\s*#|tel\b|phone|www\.|http|@|street|\bst\b|\bave\b|road|\brd\b|blvd|unit|suite|ontario|toronto|canada|hst|gst|page|copy|customer|transaction|^\W+$/i;
    const line = lines.slice(0, 8).find((l) => /[a-z]{3,}/i.test(l) && !bad.test(l) && l.length <= 40 && !amountsIn(l).length);
    if (line) return line.replace(/[^\w&'. -]/g, " ").replace(/\s+/g, " ").trim();
    return known ? titleCase(known.match) : "";
  }
  const RECEIPT_WORDS = [
    [/grocer|supermarket|produce|bakery|deli\b/i, "groceries"], [/pharmacy|drug\s*mart|prescription|clinic|dental|physio|optical/i, "health"],
    [/coffee|caf[eé]|espresso|latte|cappuccino/i, "coffee"], [/uber ?eats|doordash|skip ?the ?dishes|ritual/i, "dining"], [/restaurant|bistro|grill|pizz|sushi|shawarma|burger|ramen|take-?out|gratuity|\btip\b|server/i, "dining"],
    [/hydro|electricity|enbridge|natural gas|water bill|utilit/i, "utilities"], [/internet|wireless|mobile|cellular|phone bill|data plan/i, "phone"],
    [/insurance|premium|policy\s*(no|number|#)/i, "insurance"], [/\brent\b|lease|landlord|property management/i, "rent"],
    [/presto|transit|parking|fuel|gasoline|petro|esso|shell|taxi|\bttc\b|\bgo train/i, "transit"], [/subscription|membership|monthly plan|renews|renewal/i, "subs"],
    [/cinema|theatre|theater|concert|tickets?|\bpub\b|brewery|lcbo|beer store/i, "fun"], [/clothing|apparel|shoes|shipping|order\s*(no|number|#)/i, "shopping"], [/\bgifts?\b|florist|flowers/i, "gifts"]
  ];
  function guessCategory(merchant, text) {
    const byName = merchant ? autoCat(merchant, "expense") : "other";
    if (byName !== "other") return { cat: byName, why: "your auto-sort rule for \"" + merchant + "\"" };
    const up = text.toUpperCase(), rule = state.rules.find((r) => r.match.length > 2 && up.includes(r.match.toUpperCase()) && state.categories.some((c) => c.id === r.cat && c.group !== "income"));
    if (rule) return { cat: rule.cat, why: "\"" + rule.match + "\" on the receipt" };
    for (const [rx, cat] of RECEIPT_WORDS) { const m = text.match(rx); if (m && state.categories.some((c) => c.id === cat)) { const w = (text.slice(0, m.index).match(/[A-Za-z\u00C0-\u017F'-]*$/)[0] + text.slice(m.index).match(/^[A-Za-z\u00C0-\u017F'-]*/)[0]) || m[0]; return { cat, why: "the word \"" + w.toLowerCase() + "\"" }; } }
    return { cat: "other", why: "" };
  }
  const BILL_WORDS = /\b(bill|statement|account\s*(number|no|#)|due\s*date|amount\s*due|auto-?pay|pre-?authorized|billing\s*period|service\s*period|monthly|renews?|renewal|membership|subscription)\b/i;
  function parseReceiptText(text) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const merchant = findMerchant(text, lines), t = findTotal(lines), g = guessCategory(merchant, text);
    return { merchant, date: findDate(text), total: t.total, sure: t.sure, tax: findTax(lines), cat: g.cat, why: g.why, isBill: BILL_WORDS.test(text), how: "text" };
  }
  function checkAI(ai, fallbackText) {
    // Treat Claude's answer as data: check every field before using it
    const out = { merchant: "", date: null, total: null, sure: false, tax: null, cat: "other", why: "", isBill: false, how: "ai" };
    if (typeof ai.merchant === "string") out.merchant = ai.merchant.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim().slice(0, 60);
    if (typeof ai.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ai.date) && ai.date <= toISO(new Date(Date.now() + 2 * 86400000)) && ai.date > "2000-01-01") out.date = ai.date;
    const tot = +ai.total; if (isFinite(tot) && tot > 0 && tot < 100000) { out.total = Math.round(tot * 100) / 100; out.sure = true; }
    const tax = +ai.tax; if (ai.tax != null && isFinite(tax) && tax >= 0 && tax < 100000) out.tax = Math.round(tax * 100) / 100;
    out.isBill = ai.isBill === true;
    const rule = out.merchant ? autoCat(out.merchant, "expense") : "other";
    if (rule !== "other") { out.cat = rule; out.why = "your auto-sort rule for \"" + out.merchant + "\""; }
    else if (typeof ai.category === "string" && state.categories.some((c) => c.id === ai.category && c.group !== "income")) { out.cat = ai.category; out.why = "what's printed on the receipt"; }
    else { const g = guessCategory(out.merchant, fallbackText || ""); out.cat = g.cat; out.why = g.why; }
    return out;
  }
  function aiPrompt(kind) {
    const cats = state.categories.filter((c) => c.group !== "income").map((c) => c.id + " = " + c.name).join("\n");
    return (kind === "image" ? "The attached image is a photo of a receipt or bill from Canada." : "Below is the text of a receipt, invoice or emailed bill from Canada.") +
      " Read it carefully and reply with only a JSON object like {\"merchant\":\"No Frills\",\"date\":\"2026-11-14\",\"total\":42.17,\"tax\":1.23,\"category\":\"groceries\",\"isBill\":false,\"readable\":true}.\n" +
      "merchant: the store or company name. date: the purchase or bill date as YYYY-MM-DD, or null. total: the final amount paid or due, including tax, as a number, or null. tax: HST/GST/PST amount or null. " +
      "category: exactly one id from this list:\n" + cats + "\nother = Other\nisBill: true for recurring bills like phone, internet, hydro, insurance or subscriptions. readable: false if this is not a receipt or bill, or you cannot read it. Never invent numbers: use null when unsure.";
  }
  async function aiRead(input, image) {
    const sample = await getSample(); if (!sample) return null;
    if (image) {
      const lim = await sample.limits().catch(() => null); if (!lim || !lim.images) return null;
      const maxB = lim.images.maxInputBytes || 5e6;
      for (const px of [1200, 900]) { if (image.size <= maxB) break; image = (await imageToJpeg(image, px)).blob; }
      if (image.size > maxB) return null;
    }
    try {
      const r = await sample.json(image ? aiPrompt("image") : aiPrompt("text") + "\n\n" + input.slice(0, 6000), image ? { images: [image] } : {});
      return r && typeof r === "object" && !Array.isArray(r) ? r : null;
    } catch (e) {
      if (e && e.code === "rate_limited") throw e;
      return null; // not allowed, unavailable or unreadable: fall back to reading it ourselves
    }
  }
  async function ocrRead(blob, withLayout) {
    if (inFrame()) return null; // the online artifact blocks the downloads this needs
    await withTimeout(loadScript(LIBS.ocr), 20000, "ocr_unavailable");
    if (!window.Tesseract) return null;
    if (!withLayout || typeof window.Tesseract.createWorker !== "function") {
      const r = await withTimeout(window.Tesseract.recognize(blob, "eng"), 90000, "ocr_timeout");
      return r && r.data && r.data.text ? r.data.text : null;
    }
    // Bank app screenshots: read once as one block (keeps rows together), then once
    // in auto mode with word positions (keeps names that wrap onto two lines apart)
    const w = await withTimeout(window.Tesseract.createWorker("eng"), 60000, "ocr_unavailable");
    try {
      const r = await withTimeout(w.recognize(blob), 90000, "ocr_timeout");
      const lay = [layoutText(r.data)];
      try { await w.setParameters({ tessedit_pageseg_mode: "3" }); const r3 = await withTimeout(w.recognize(blob), 90000, "ocr_timeout"); lay.unshift(layoutText(r3.data)); } catch (e) { /* the first read is still fine */ }
      lastOcrLayout = lay.filter(Boolean);
      return r && r.data && r.data.text ? r.data.text : null;
    } finally { try { await w.terminate(); } catch (e) { /* already gone */ } }
  }
  /* Rebuild rows from where each word sits on screen. Names that wrap onto two
     lines get joined, and an amount sitting between them gets attached. */
  let lastOcrLayout = [];
  const MONEY_WORD = /^[-+(]?\$?\d{1,3}(,\d{3})*\.\d{2}\)?(CR|DR)?$|^[-+(]?\$?\d+\.\d{2}\)?(CR|DR)?$/i;
  function layoutText(data) {
    try {
      let words = data.words;
      if (!words || !words.length) { words = []; (data.blocks || []).forEach((b) => (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => (l.words || []).forEach((w) => words.push(w))))); }
      words = words.filter((w) => w && w.bbox && w.text && w.text.trim() && !/^[>›»<?=|]+$/.test(w.text.trim()) && (w.confidence == null || w.confidence > 25))
        .map((w) => ({ t: w.text.trim().replace(/^[<‹«]+|[>›»]+$/g, ""), x0: w.bbox.x0, x1: w.bbox.x1, y0: w.bbox.y0, y1: w.bbox.y1, cy: (w.bbox.y0 + w.bbox.y1) / 2, h: Math.max(1, w.bbox.y1 - w.bbox.y0) }));
      if (words.length < 3) return "";
      // 1) words on the same visual line
      const lines = [];
      words.slice().sort((a, b) => a.cy - b.cy).forEach((w) => {
        const ln = lines.find((l) => Math.abs(l.cy - w.cy) < Math.min(l.h, w.h) * 0.5);
        if (ln) { ln.w.push(w); ln.y0 = Math.min(ln.y0, w.y0); ln.y1 = Math.max(ln.y1, w.y1); ln.h = Math.max(ln.h, w.h); }
        else lines.push({ w: [w], cy: w.cy, y0: w.y0, y1: w.y1, h: w.h });
      });
      lines.forEach((l) => { l.w.sort((a, b) => a.x0 - b.x0); l.money = l.w.filter((w) => MONEY_WORD.test(w.t)); l.text = l.w.filter((w) => !MONEY_WORD.test(w.t)).map((w) => w.t).join(" "); l.x0 = l.w[0].x0; });
      lines.sort((a, b) => a.y0 - b.y0);
      const hs = lines.map((l) => l.h).sort((a, b) => a - b), mh = hs[Math.floor(hs.length / 2)] || 10;
      // 2) join a name that wraps (two text-only lines close together, lined up on the left)
      const out = [];
      for (const l of lines) {
        let prev = out[out.length - 1];
        if (prev && prev.loneMoney && out.length > 1) prev = out[out.length - 2]; // an amount can sit between the two lines of a name
        const textOnly = !l.money.length && /[a-z]{2}/i.test(l.text);
        if (textOnly && prev && prev.textOnly && l.y0 - prev.y1 < mh * 1.25 && Math.abs(l.x0 - prev.x0) < mh * 1.5 && !lineDate(prev.text, 2000) && !lineDate(l.text, 2000)) { prev.text += " " + l.text; prev.y1 = l.y1; continue; }
        out.push({ text: l.text, money: l.money.slice(), y0: l.y0, y1: l.y1, x0: l.x0, cy: l.cy, textOnly, loneMoney: !l.text && l.money.length > 0 });
      }
      // 3) an amount on its own line that sits beside a wrapped name belongs to it
      const final = [];
      for (const o of out) {
        if (o.loneMoney) {
          const host = out.find((b) => b.textOnly && b.y1 - b.y0 > mh * 1.4 && o.cy > b.y0 && o.cy < b.y1);
          if (host) { host.money = host.money.concat(o.money); continue; }
        }
        final.push(o);
      }
      return final.map((o) => (o.text + " " + o.money.map((m) => m.t).join(" ")).trim()).join("\n");
    } catch (e) { return ""; }
  }

  // ---- screens ----
  function receiptWorking(msg) {
    openModal('<div class="ci">' + (pennyOn() ? mascot(110, "P", "thinking") : '<div class="ci-emoji">🔍</div>') + "<h2>" + esc(msg) + '</h2><div class="dots-loading"><span></span><span></span><span></span></div><p class="small muted">This can take a few seconds.</p></div>');
  }
  function receiptError(msg) {
    openModal('<div class="ci">' + (pennyOn() ? mascot(110, "P", "comfort") : '<div class="ci-emoji">💛</div>') + "<h2>Hmm, that didn't work</h2><p>" + esc(msg) +
      '</p><div class="row" style="justify-content:center"><button class="btn" data-act="scanReceipt">Try another</button><button class="btn ghost" data-act="addTx">Fill it in myself</button></div></div>');
  }
  function scanModal() {
    openModal('<div class="stack"><div class="row" style="flex-wrap:nowrap;gap:12px">' + (pennyOn() ? mascot(76, "P", "taxes") : "") + '<div><h2>Scan a receipt or bill</h2><p class="small muted">Penny reads it, fills everything in and picks a category. You check it before it\'s saved.</p></div></div>' +
      '<div class="pick-grid scan-grid">' +
      '<label class="pick"><input type="file" accept="image/*" capture="environment" data-change="receiptFile"><span class="pick-emoji">📸</span><b>Take a photo</b><span class="tiny muted">Use your camera</span></label>' +
      '<label class="pick"><input type="file" accept="image/*,.heic,.heif,application/pdf,.pdf,.eml,.txt,.html,.htm" data-change="receiptFile"><span class="pick-emoji">🖼️</span><b>Choose a file</b><span class="tiny muted">Photo, screenshot, PDF bill or saved email</span></label>' +
      '<button type="button" class="pick" data-act="pasteReceipt"><span class="pick-emoji">✉️</span><b>Paste an email</b><span class="tiny muted">Copy the text of an emailed receipt or bill</span></button></div>' +
      '<p class="tiny muted">📌 Tips: lay the receipt flat, use good light and fit the whole thing in the photo. ' + (inFrame() ? "Reading photos here uses Claude, which asks your permission the first time." : "Photos are read on this device.") + "</p></div>");
  }
  function showReceiptReview(r) {
    const amount = r.total != null ? r.total.toFixed(2) : "", date = r.date || todayISO();
    const dupe = r.total != null && state.transactions.some((t) => t.kind === "expense" && Math.abs(+t.amount - r.total) < 0.005 && t.date === date);
    const notes = [];
    if (r.total == null) notes.push(["red", "Penny couldn't find the total. Please type it in."]);
    else if (!r.sure) notes.push(["gold", "Penny wasn't sure which number is the total, so she picked the biggest one. Please double check it."]);
    if (!r.date) notes.push(["gold", "No date found, so it's set to today. Change it if needed."]);
    if (!r.merchant) notes.push(["gold", "Penny couldn't spot the store name. Add one so you'll recognise it later."]);
    if (dupe) notes.push(["red", "Heads up: you already have a " + money2(r.total) + " expense on " + date + ". This might be a repeat."]);
    if (r.how === "none") notes.splice(0, notes.length, ["gold", "Penny couldn't read this one by herself. Your picture is here so you can copy the total, date and store."]);
    const catName = catById(r.cat).name;
    openModal('<form data-form="saveReceipt" class="stack"><h2>Does this look right?</h2>' +
      '<div class="receipt-review">' + (r.preview ? '<img src="' + r.preview + '" alt="Your receipt">' : r.snippet ? '<pre class="receipt-text">' + esc(r.snippet) + "</pre>" : "") +
      '<div class="stack" style="flex:1;min-width:0">' +
      (r.how === "none" ? "" : r.cat !== "other" ? '<div class="callout">' + (pennyOn() ? mascot(44, "P", "proud") : "") + "<div>Penny thinks this is <b>" + esc(catName) + "</b>" + (r.why ? " because of " + esc(r.why) : "") + ". Change it below if she's wrong.</div></div>" :
        '<div class="callout gold">' + (pennyOn() ? mascot(44, "P", "thinking") : "") + "<div>Penny isn't sure which category this is. Please pick one below.</div></div>") +
      notes.map(([c, t]) => '<div class="callout ' + c + ' small">' + icon(c === "red" ? "triangle-alert" : "info") + "<div>" + esc(t) + "</div></div>").join("") +
      "</div></div>" +
      '<div class="fgrid">' + field("Amount", moneyInput('name="amount" min="0" required value="' + amount + '" placeholder="0.00"')) + field("Date", '<input type="date" name="date" required value="' + esc(date) + '">') + "</div>" +
      field("Store or company", '<input name="desc" value="' + esc(r.merchant) + '" placeholder="e.g. No Frills">') +
      (r.tax != null ? '<p class="tiny muted">Tax on this receipt: ' + money2(r.tax) + " (already included in the total)</p>" : "") +
      '<div><div class="label" style="margin-bottom:6px">Category</div><div class="catpick">' + catPick("expense", r.cat) + "</div></div>" +
      '<label class="check small"><input type="checkbox" name="learn"' + (r.merchant ? " checked" : "") + "> Always sort this store into this category</label>" +
      '<label class="check small"><input type="checkbox" name="bill"' + (r.isBill ? " checked" : "") + "> This is a monthly bill (also add it to Bills)</label>" +
      '<div class="row"><button class="btn">' + icon("check") + ' Save it</button><button type="button" class="btn ghost" data-act="scanReceipt">Scan another</button><button type="button" class="btn ghost" data-close>Cancel</button></div></form>');
  }
  async function handleReceiptFile(file) {
    if (!file) return;
    const name = (file.name || "").toLowerCase(), type = (file.type || "").toLowerCase();
    if (file.size > 20 * 1024 * 1024) return receiptError("That file is over 20 MB. Try a smaller photo or a screenshot of the receipt.");
    if (file.size === 0) return receiptError("That file looks empty. Try choosing it again.");
    const isPdf = type === "application/pdf" || name.endsWith(".pdf");
    const isImage = type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/.test(name);
    const isText = !isPdf && !isImage && (/\.(eml|txt|html?)$/.test(name) || type.startsWith("text/") || type === "message/rfc822");
    if (!isPdf && !isImage && !isText) return receiptError("Penny can read photos, PDFs and saved emails (.eml, .txt or .html). That kind of file isn't one of them.");
    receiptWorking("Penny is reading your " + (isPdf ? "PDF" : isText ? "email" : "receipt") + "...");
    try {
      let text = "", image = null, preview = null, result = null;
      if (isPdf) {
        const pdf = await withTimeout(readPdf(file), 30000, "pdf_timeout").catch((e) => { throw new Error(e && /load_failed|pdf_unavailable/.test(e.message) ? "pdf_offline" : "pdf_bad"); });
        text = cleanText(pdf.text); image = pdf.image;
      } else if (isText) text = cleanText(await file.text());
      else image = file;
      if (image) {
        let jpeg;
        try { jpeg = await openPicture(image, 1600); } catch (e) {
          return receiptError(/heic|heif/.test(name + type) ? "iPhone HEIC photos can't be opened here. Take a screenshot of the receipt, or set your camera to \"Most Compatible\"." : "That picture couldn't be opened. Try another photo or a screenshot.");
        }
        preview = jpeg.preview;
        const ai = await aiRead("", jpeg.blob);
        if (ai && ai.readable === false) return receiptError("Penny couldn't find a receipt in that picture. Try a closer, clearer photo in good light.");
        if (ai) result = checkAI(ai, "");
        else { const t = await ocrRead(jpeg.blob).catch(() => null); if (t) text = cleanText(t); }
      }
      if (!result && text) {
        result = parseReceiptText(text);
        if (!result.sure || !result.merchant || result.cat === "other") { const ai = await aiRead(text, null); if (ai && ai.readable !== false) result = Object.assign(checkAI(ai, text), { how: "ai" }); }
      }
      if (!result) {
        if (!image) return receiptError(isPdf ? "That PDF didn't have any text Penny could read. Try a photo or screenshot of it instead." : "Penny couldn't find any receipt details in that file.");
        result = { merchant: "", date: null, total: null, sure: false, tax: null, cat: "other", why: "", isBill: false, how: "none" };
      }
      result.preview = preview; result.snippet = text.slice(0, 700);
      showReceiptReview(result);
    } catch (e) {
      const m = e && e.message;
      receiptError(e && e.code === "rate_limited" ? "Penny needs a little break from reading. Try again in a minute, or fill it in yourself." :
        m === "pdf_offline" ? "Reading PDFs needs an internet connection the first time. Try again when you're online, or use a photo." :
        m === "pdf_bad" || m === "pdf_timeout" ? "That PDF couldn't be opened. It might be locked with a password. Try a screenshot instead." :
        "Something went wrong reading that file. You can still fill it in yourself.");
    }
  }
  function handleReceiptText(raw) {
    const text = cleanText(raw);
    if (!text || !amountsIn(text).length) return receiptError("Penny couldn't find any amounts in that text. Make sure you copied the part with the total.");
    receiptWorking("Penny is reading your email...");
    const r = parseReceiptText(text);
    const finish = (res) => { res.snippet = text.slice(0, 700); showReceiptReview(res); };
    if (r.sure && r.merchant && r.cat !== "other") return setTimeout(() => finish(r), 300);
    aiRead(text, null).then((ai) => finish(ai && ai.readable !== false ? checkAI(ai, text) : r)).catch(() => finish(r));
  }

  /* ==================================================================
     Sync across devices (Supabase)
     - Sign in with the same email on your phone and laptop and your data
       follows you. Each person only ever sees their own data (the
       database rules in GUIDE.md make sure of that).
     - The whole profile is saved as one record. The newest save wins.
     - Turned off until C.sync.url and C.sync.anonKey are filled in.
     ================================================================== */
  const SYNC_KEY = "pennyPal.sync";
  const SC = C.sync || {};
  const syncReady = () => !!(SC.url && SC.anonKey) && !inFrame();
  let sync = (() => { try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch (e) { return {}; } })();
  let syncState = "idle", syncNote = "", syncTimer = null, syncBusy = false, applyingRemote = false, lastPushed = null, booting = true;
  const saveSync = () => { try { localStorage.setItem(SYNC_KEY, JSON.stringify(sync)); } catch (e) { /* ignore */ } };
  const signedIn = () => syncReady() && !!sync.refresh;
  async function sb(path, opts, auth) {
    const h = { apikey: SC.anonKey, "Content-Type": "application/json" };
    if (opts && opts.headers) Object.assign(h, opts.headers);
    if (auth !== false) { await sbToken(); h.Authorization = "Bearer " + sync.access; }
    const r = await withTimeout(fetch(SC.url.replace(/\/+$/, "") + path, Object.assign({}, opts, { headers: h })), 20000, "timeout");
    const txt = await r.text(); let body = null; try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = txt; }
    if (!r.ok) { const e = new Error((body && (body.msg || body.error_description || body.message || body.error)) || "HTTP " + r.status); e.status = r.status; e.code = body && (body.error_code || body.code); throw e; }
    return body;
  }
  function takeSession(b) {
    sync.access = b.access_token; sync.refresh = b.refresh_token; sync.exp = Date.now() + (b.expires_in || 3600) * 1000;
    if (b.user) { sync.userId = b.user.id; sync.email = b.user.email || sync.email; }
    saveSync();
  }
  async function sbToken() {
    if (!sync.refresh) { const e = new Error("signed_out"); e.status = 401; throw e; }
    if (sync.access && Date.now() < (sync.exp || 0) - 60000) return;
    try { takeSession(await sb("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: sync.refresh }) }, false)); }
    catch (e) { if (e.status === 400 || e.status === 401) { syncSignOut(true); e.message = "signed_out"; } throw e; }
  }
  function syncSignOut(expired) {
    sync = { email: sync.email }; saveSync(); syncState = "idle"; lastPushed = null; try { localStorage.removeItem(BASE_KEY); } catch (e) { /* ignore */ }
    syncNote = expired ? "You were signed out. Sign in again to keep syncing." : "";
    if (pageId() === "mydata") render();
  }
  /* Your data is locked (AES-256) with a key made from your password before it leaves the device.
     The server only ever stores scrambled text. Nobody without your password can read it,
     including whoever runs the Supabase project. */
  const te = new TextEncoder(), td = new TextDecoder();
  const b64 = (buf) => { const a = new Uint8Array(buf); let s = ""; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  async function deriveKey(password, userId) {
    const base = await crypto.subtle.importKey("raw", te.encode(password), "PBKDF2", false, ["deriveBits"]);
    return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: te.encode("penny-pal:v1:" + userId), iterations: 310000, hash: "SHA-256" }, base, 256));
  }
  const aesKey = () => crypto.subtle.importKey("raw", unb64(sync.key), "AES-GCM", false, ["encrypt", "decrypt"]);
  async function lockData(obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), te.encode(JSON.stringify(obj)));
    return { locked: 1, iv: b64(iv), ct: b64(ct) };
  }
  async function unlockData(data) {
    if (!data || !data.locked) return data; // saved before locking existed: it gets locked on the next save
    try { return JSON.parse(td.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(data.iv) }, await aesKey(), unb64(data.ct)))); }
    catch (e) { throw new Error("wrong_key"); }
  }
  async function setKey(password) { sync.key = await deriveKey(password, sync.userId); saveSync(); }
  const sbRow = async () => {
    const rows = await sb("/rest/v1/penny_data?select=data,updated_at&user_id=eq." + encodeURIComponent(sync.userId));
    const row = rows && rows[0] ? rows[0] : null;
    if (row) { row.wasLocked = !!(row.data && row.data.locked); row.data = await unlockData(row.data); }
    return row;
  };
  function shareable() { const copy = JSON.parse(JSON.stringify(state)); if (copy.ui) delete copy.ui.weather; return copy; }
  /* Merging: when both devices changed things since they last agreed ("base"), keep both sets of changes.
     Lists are matched item by item (by id), so an add on one device and an edit on the other both survive.
     Only when the very same thing changed on both does this device's newer edit win. */
  const BASE_KEY = "pennyPal.syncBase";
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function itemKey(x) { if (x === null || typeof x !== "object") return "v:" + JSON.stringify(x); if (x.id !== undefined) return "id:" + x.id; if (x.match !== undefined) return "rule:" + x.match + "|" + x.cat; if (x.ym !== undefined) return "ym:" + x.ym; if (x.date !== undefined && x.score !== undefined) return "cr:" + x.date; return "j:" + JSON.stringify(x); }
  function mergeList(b, l, r) {
    b = Array.isArray(b) ? b : []; const B = new Map(b.map((x) => [itemKey(x), x])), L = new Map(l.map((x) => [itemKey(x), x])), R = new Map(r.map((x) => [itemKey(x), x]));
    const out = [], seen = new Set();
    const take = (k) => {
      if (seen.has(k)) return; seen.add(k);
      const inB = B.has(k), inL = L.has(k), inR = R.has(k);
      if (inL && inR) out.push(mergeVal(B.get(k), L.get(k), R.get(k)));
      else if (inL && !inR) { if (!inB || !same(L.get(k), B.get(k))) out.push(L.get(k)); }        // added here, or deleted there but edited here
      else if (inR && !inL) { if (!inB || !same(R.get(k), B.get(k))) out.push(R.get(k)); }        // added there, or deleted here but edited there
    };
    r.forEach((x) => take(itemKey(x))); l.forEach((x) => take(itemKey(x)));
    return out;
  }
  function mergeVal(b, l, r) {
    if (same(l, r)) return l;
    if (b !== undefined && same(l, b)) return r;
    if (b !== undefined && same(r, b)) return l;
    if (Array.isArray(l) && Array.isArray(r)) return mergeList(b, l, r);
    if (l && r && typeof l === "object" && typeof r === "object") { const o = {}, bb = b && typeof b === "object" ? b : {}; new Set(Object.keys(l).concat(Object.keys(r))).forEach((k) => { const v = k in l ? (k in r ? mergeVal(bb[k], l[k], r[k]) : (k in bb && same(l[k], bb[k]) ? undefined : l[k])) : (k in bb && same(r[k], bb[k]) ? undefined : r[k]); if (v !== undefined) o[k] = v; }); return o; }
    return l; // the very same thing changed on both: this device's newer edit wins
  }
  function saveBase(data) { try { localStorage.setItem(BASE_KEY, JSON.stringify(data)); } catch (e) { try { localStorage.removeItem(BASE_KEY); } catch (e2) { /* ignore */ } } }
  function loadBase() { try { return JSON.parse(localStorage.getItem(BASE_KEY) || "null"); } catch (e) { return null; } }
  // What counts as a real change worth syncing: not which page you looked at, what month you're viewing or your search box
  function syncSig() {
    const c = shareable(); delete c.ui; if (c.flags) delete c.flags.visits; delete c.dismissed;
    return JSON.stringify(c);
  }
  async function sbPush() {
    const data = shareable(), json = JSON.stringify(data), at = new Date().toISOString();
    if (!sync.key) throw new Error("need_key");
    await sb("/rest/v1/penny_data?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: sync.userId, data: await lockData(data), updated_at: at }) });
    sync.seen = at; sync.dirty = false; saveSync(); lastPushed = syncSig(); saveBase(data);
  }
  const SNAP_KEY = "pennyPal.beforeSync";
  function snapshotBeforeSync() {
    try {
      if (dataWeight(state) === 0) return;
      const list = JSON.parse(localStorage.getItem(SNAP_KEY) || "[]");
      list.unshift({ at: new Date().toISOString(), weight: dataWeight(state), data: JSON.stringify(state) });
      localStorage.setItem(SNAP_KEY, JSON.stringify(list.slice(0, 3)));
    } catch (e) { /* storage full: keep going */ }
  }
  function lastSnapshot() { try { return (JSON.parse(localStorage.getItem(SNAP_KEY) || "[]") || [])[0] || null; } catch (e) { return null; } }
  function applyRemote(row, quiet) {
    snapshotBeforeSync(); // a copy of this device's data, so a sync can always be undone
    const keepWeather = state.ui && state.ui.weather;
    applyingRemote = true;
    try { state = normalize(row.data); if (keepWeather) state.ui.weather = keepWeather; checkIn(); applyTheme(); evaluate(); save(); }
    finally { applyingRemote = false; }
    sync.seen = row.updated_at; sync.dirty = false; saveSync(); lastPushed = syncSig(); saveBase(row.data);
    quietRender();
    if (!quiet) toast("☁️ Updated with your latest changes from your other device");
  }
  function syncChanged() {
    if (applyingRemote || booting || !signedIn()) return; // opening the app (daily check-in, page visit) isn't an edit
    if (state.isExample) return; // example data stays on this device
    if (lastPushed !== null && syncSig() === lastPushed) return; // only real changes count (not page visits or screen settings)
    sync.dirty = true; sync.editedAt = Date.now(); saveSync();
    clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow(), 2500);
  }
  async function syncNow(manual) {
    if (!signedIn() || syncBusy) return;
    if (!sync.key) { syncState = "needkey"; if (pageId() === "mydata") render(); return; }
    if (!navigator.onLine) { syncState = "offline"; if (manual) toast("You're offline. Penny will sync when you're back online."); return; }
    syncBusy = true; syncState = "syncing"; if (pageId() === "mydata" && manual) render();
    try {
      const row = await sbRow();
      let pushed = false;
      const mine = dataWeight(state), theirsW = row ? dataWeight(row.data) : 0;
      if (row && theirsW > 0 && mine === 0) {
        // this device is empty but the account has real data: always bring it in, never push empty over it
        applyRemote(row, true); toast("☁️ Brought over " + esc(whatCameOver(state)) + " from your account");
      } else if (row && row.updated_at !== sync.seen) {
        // someone else (your other device) saved since we last looked
        const theirs = Date.parse(row.updated_at) || 0;
        if (theirsW === 0 && mine > 0) { await sbPush(); pushed = true; } // never let an empty save wipe this device
        else if (mine >= 4 && theirsW < mine * 0.5) { askWhichToKeep(row); syncBusy = false; return; } // the other device has much less: always ask first
        else if (!sync.dirty) applyRemote(row);
        else {
          // both devices changed things: combine them instead of picking one
          const base = loadBase();
          if (base) {
            const merged = mergeVal(base, shareable(), row.data);
            applyRemote({ data: merged, updated_at: row.updated_at }, true);
            await sbPush(); pushed = true;
            if (!same(merged, row.data)) toast("☁️ Combined your changes from both devices");
          } else if (theirs > (sync.editedAt || 0)) applyRemote(row);
          else { await sbPush(); pushed = true; }
        }
      } else if (sync.dirty || !row) {
        if (!state.isExample && !(mine === 0 && theirsW > 0)) { await sbPush(); pushed = true; }
      }
      // data saved before locking existed gets locked right away
      if (row && !row.wasLocked && !pushed && !state.isExample) await sbPush();
      syncState = "ok"; syncNote = ""; sync.lastSync = Date.now(); saveSync();
      if (manual) toast(icon("check") + " All synced");
    } catch (e) {
      syncState = e.message === "signed_out" ? "idle" : e.message === "wrong_key" || e.message === "need_key" ? "needkey" : "error";
      syncNote = e.message === "signed_out" ? syncNote : e.message === "wrong_key" ? "Penny couldn't unlock your saved data with this password. Enter the password you used when you made the account." : e.message === "need_key" ? "" : /permission denied|42501|row-level security/i.test(e.message + " " + (e.code || "")) ? "Sync isn't fully switched on at the server yet (database permissions). Your data is safe on this device and will sync once it's fixed. (Details for the app owner: " + String(e.message).slice(0, 140) + ")" : e.message === "timeout" || e instanceof TypeError ? "Couldn't reach the sync server. Your changes are safe here and will sync later." : "Sync hiccup: " + e.message;
      if (manual) toast(esc(syncNote || "Couldn't sync right now"));
    } finally { syncBusy = false; if (pageId() === "mydata") quietRender(); }
  }
  // How much real stuff is in a profile? Used so an empty device can never wipe out real data.
  function dataWeight(d) {
    if (!d || d.isExample) return 0;
    const n = (x) => (Array.isArray(x) ? x.filter((i) => i && !i.example).length : 0);
    return n(d.transactions) + n(d.goals) * 2 + n(d.subs) + n(d.accounts) * 2 + ((d.categories || []).some((c) => c.touched || +c.budget > 0) ? 2 : 0) + (d.tax && +d.tax.income ? 2 : 0) + (d.profile && d.profile.name ? 1 : 0);
  }
  function whatCameOver(d) {
    const n = (x) => (Array.isArray(x) ? x.filter((i) => i && !i.example).length : 0), bits = [];
    const add = (k, one, many) => { const c = n(d[k]); if (c) bits.push(c + " " + (c === 1 ? one : many)); };
    add("transactions", "transaction", "transactions"); add("goals", "goal", "goals"); add("subs", "bill", "bills"); add("accounts", "account", "accounts");
    return bits.length ? bits.join(", ") : "your profile";
  }
  function askWhichToKeep(row) {
    if ($(".keep-choice")) return;
    const r = row.data || {}, n = (x) => (Array.isArray(x) ? x.filter((i) => i && !i.example).length : 0);
    window.__syncChoice = row;
    openModal('<div class="stack keep-choice"><div class="row" style="flex-wrap:nowrap;gap:12px">' + (pennyOn() ? mascot(90, "P", "thinking") : "") + '<div><h2>Which data should Penny keep?</h2><p class="small muted">Another device saved a version with a lot less in it. Penny didn\'t change anything yet. Pick the one that\'s right, and the other device will match it.</p></div></div>' +
      '<div class="grid g2"><button class="pick" data-act="syncKeepAccount"><span class="pick-emoji">☁️</span><b>The other device</b><span class="tiny muted">' + n(r.transactions) + " transactions, " + n(r.goals) + " goals, " + n(r.accounts) + " accounts<br>Saved " + esc(new Date(row.updated_at).toLocaleString(C.locale)) + "</span></button>" +
      '<button class="pick" data-act="syncKeepDevice"><span class="pick-emoji">💻</span><b>This device</b><span class="tiny muted">' + n(state.transactions) + " transactions, " + n(state.goals) + " goals, " + n(state.accounts) + " accounts</span></button></div>" +
      '<p class="tiny muted">Not sure? Keep the one with more of your real stuff. You can also download a backup in My Stash first.</p></div>');
  }
  async function syncFirstLink() {
    // just signed in: decide whose data wins
    const row = await sbRow();
    const local = state, localHas = !local.isExample && (local.transactions.length || local.goals.length || local.profile.name || (local.tax && local.tax.income));
    if (!row) { sync.seen = null; if (!local.isExample) { await sbPush(); toast("☁️ Your data is now saved to your account"); } return; }
    if (!localHas || dataWeight(state) === 0) { applyRemote(row, true); toast("☁️ Brought over " + esc(whatCameOver(state)) + " from your account"); return; }
    if (JSON.stringify(row.data) === JSON.stringify(shareable())) { sync.seen = row.updated_at; saveSync(); saveBase(row.data); return; }
    const r = row.data || {}, n = (x) => (x && x.length) || 0;
    window.__syncChoice = row;
    openModal('<div class="stack"><div class="row" style="flex-wrap:nowrap;gap:12px">' + (pennyOn() ? mascot(90, "P", "thinking") : "") + '<div><h2>Which data should Penny keep?</h2><p class="small muted">This device and your account both have data. Pick one. The other one gets replaced.</p></div></div>' +
      '<div class="grid g2"><button class="pick" data-act="syncKeepAccount"><span class="pick-emoji">☁️</span><b>My account</b><span class="tiny muted">' + n(r.transactions) + " transactions, " + n(r.goals) + " goals<br>Saved " + esc(new Date(row.updated_at).toLocaleString(C.locale)) + "</span></button>" +
      '<button class="pick" data-act="syncKeepDevice"><span class="pick-emoji">💻</span><b>This device</b><span class="tiny muted">' + n(local.transactions) + " transactions, " + n(local.goals) + " goals</span></button></div>" +
      '<p class="tiny muted">Not sure? Pick the one with more of your real stuff. You can download a backup of this device first in My Stash.</p></div>');
  }
  async function authCall(kind, email, password) {
    return kind === "signup"
      ? sb("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password }) }, false)
      : sb("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, false);
  }
  function authError(e) {
    const m = String((e && e.message) || "") + " " + String((e && e.code) || "");
    return /invalid login|invalid_credentials|invalid grant|invalid_grant/i.test(m) ? "That email and password don't match. Try again, or create an account first." :
      /already registered|already been registered|user_already_exists/i.test(m) ? "There's already an account with that email. Tap \"I already have an account\" to sign in." :
      /not confirmed|email_not_confirmed/i.test(m) ? "Please confirm your email first (check your inbox), then sign in." :
      (e && (e.message === "timeout" || e instanceof TypeError)) ? "Couldn't reach Penny's sync server. Check your internet and try again." : "Something went wrong: " + m.trim();
  }
  function authCheck(email, password) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "That email doesn't look right.";
    if (String(password || "").length < 8) return "Use a password with at least 8 characters.";
    return "";
  }

  /* Account screen in the welcome flow: create an account (or sign in) before setup */
  let wzAuthMode = "signup", wzAuthMsg = "", wzAuthBusy = false, wzAuthEmail = "";
  function renderAccountStep() {
    const el = wizardEl(), up = wzAuthMode === "signup";
    document.body.classList.add("wz-open");
    el.innerHTML = '<div class="wz-inner wz-center">' + mascot(150, null, up ? "proud" : "wave") +
      "<h1>" + (up ? "First, let's make your account" : "Welcome back! 👋") + "</h1>" +
      '<p class="wz-sub">' + (up ? "So your stuff stays safe and shows up on your phone and laptop." : "Sign in and Penny brings all your stuff over to this device.") + "</p>" +
      '<div class="callout small privacy-note">' + icon("lock") + "<div><b>Your data is private.</b> It's locked with your password before it leaves this device. Nobody else can read it, not even the people who run Penny Pal. We never sell it, share it or show you ads.</div></div>" +
      '<form data-form="wzAuth" class="stack wz-auth" autocomplete="on" novalidate>' +
      '<div class="wz-auth-msg">' + (wzAuthMsg ? '<div class="callout gold small">' + icon("info") + "<div>" + esc(wzAuthMsg) + "</div></div>" : "") + "</div>" +
      field("Email", '<input type="email" name="email" autocomplete="email" required value="' + esc(wzAuthEmail || sync.email || "") + '" placeholder="you@example.com">') +
      field("Password", '<input type="password" name="password" autocomplete="' + (up ? "new-password" : "current-password") + '" required placeholder="At least 8 characters">') +
      '<button class="btn big-btn"' + (wzAuthBusy ? " disabled" : "") + ">" + (wzAuthBusy ? "One sec..." : up ? "Create my account ✨" : "Sign in") + "</button>" +
      '<button type="button" class="btn ghost" data-act="wzAuthToggle">' + (up ? "I already have an account" : "I'm new here, create an account") + "</button></form>" +
      '<button type="button" class="linklike tiny muted" data-act="wzAuthSkip">Skip for now (your data stays on this device only)</button></div>';
    const first = el.querySelector(wzAuthEmail || sync.email ? "input[name=password]" : "input[name=email]"); if (first) setTimeout(() => first.focus(), 50);
  }
  // Signed in, but nothing saved on the account yet: explain instead of silently starting blank
  function wzSignedInEmpty() {
    const el = wizardEl();
    el.innerHTML = '<div class="wz-inner wz-center">' + mascot(140, null, "thinking") + "<h1>You're signed in, but there's nothing saved yet</h1>" +
      '<p class="wz-sub">Penny couldn\'t find any data on your account. If you set things up on another phone or computer, open Penny there first and tap <b>My Stash → Sync now</b>. Then come back and tap Check again.</p>' +
      '<div class="stack" style="width:100%;max-width:360px"><button class="btn big-btn" data-act="wzCheckAgain">🔄 Check again</button><button class="btn ghost" data-act="wzSetupHere">Set up here instead</button></div></div>';
  }
  function wzAuthShow(msg, busy) {
    // update the message and button in place, so nothing you typed gets wiped
    wzAuthMsg = msg; wzAuthBusy = !!busy;
    const box = $("#wizard .wz-auth-msg"), btn = $("#wizard .wz-auth .big-btn");
    if (box) box.innerHTML = msg ? '<div class="callout gold small">' + icon("info") + "<div>" + esc(msg) + "</div></div>" : "";
    if (btn) { btn.disabled = !!busy; btn.textContent = busy ? "One sec..." : wzAuthMode === "signup" ? "Create my account ✨" : "Sign in"; }
  }
  async function wzAuth(email, password) {
    email = String(email || "").trim().toLowerCase(); wzAuthEmail = email;
    const bad = authCheck(email, password); if (bad) return wzAuthShow(bad);
    wzAuthShow("", true);
    const kind = wzAuthMode;
    try {
      const b = await authCall(kind, email, password);
      wzAuthBusy = false;
      if (!b || !b.access_token) { sync.email = email; saveSync(); wzAuthMode = "signin"; wzAuthMsg = "Almost there! Check your email for a confirmation link, then sign in here."; return renderAccountStep(); }
      takeSession(b); sync.dirty = false; sync.seen = null; sync.lastSync = Date.now(); await setKey(password); syncState = "ok";
      let row;
      try { row = await sbRow(); }
      catch (e) { if (kind === "signup") row = null; else return wzAuthShow("You're signed in, but Penny couldn't reach your saved data right now (" + (/permission|42501/i.test(e.message) ? "the sync server needs its permissions fixed" : "check your internet") + "). Try again in a moment.", false); }
      if (row && row.data && dataWeight(row.data) > 0) { // returning person on a new device: bring their stuff over and skip setup
        closeWizard(); applyRemote(row, true); render(); toast("☁️ Welcome back" + (state.profile.name ? ", " + esc(state.profile.name) : "") + "! Brought over " + esc(whatCameOver(state)));
        return;
      }
      if (kind === "signin") { wzSignedInEmpty(); return; }
      if (kind === "signup") award(25, "Account created", true);
      wzMsg = kind === "signup" ? "Account made! 🎉 Now let's set up your money home." : "Signed in! Let's set up your money home.";
      ACT.startSetup(true);
    } catch (e) { wzAuthShow(authError(e), false); }
  }

  async function syncAuth(kind, email, password) {
    email = String(email || "").trim().toLowerCase();
    syncNote = authCheck(email, password); if (syncNote) return render();
    syncState = "syncing"; syncNote = ""; render();
    try {
      const b = await authCall(kind, email, password);
      if (!b || !b.access_token) { syncState = "idle"; sync.email = email; saveSync(); syncNote = "Almost there! Check your email for a confirmation link, then come back and sign in."; return render(); }
      takeSession(b); sync.dirty = false; sync.seen = null; await setKey(password);
      await syncFirstLink();
      syncState = "ok"; sync.lastSync = Date.now(); saveSync();
      if (kind === "signup") { award(25, "Sync turned on"); celebrate("track", { emoji: "☁️", title: "Sync is on!", sub: "Sign in with the same email on your other devices and everything follows you." }); }
      else toast(icon("check") + " Signed in. Sync is on");
    } catch (e) {
      syncState = "idle"; syncNote = authError(e).replace('Tap "I already have an account" to sign in', "Press Sign in instead");
    }
    render();
  }
  function syncCard() {
    if (!(SC.url && SC.anonKey)) return "";
    const ago = (t) => { if (!t) return "not yet"; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : Math.round(m / 60) + " h ago"; };
    let body;
    if (inFrame()) body = '<p class="small">Syncing between your phone and laptop works on the Penny Pal website' + (SC.website ? ': <a href="' + esc(SC.website) + '" target="_blank" rel="noopener">' + esc(SC.website.replace(/^https?:\/\//, "")) + "</a>" : "") + '. This preview inside Claude can\'t connect to it.</p>';
    else if (signedIn() && syncState === "needkey") body = '<div class="callout gold">' + icon("lock") + '<div><b>One quick step:</b> enter your password once so Penny can lock your data before it syncs. After this, only your password can unlock it.</div></div>' +
      (syncNote ? '<p class="small" style="color:var(--warn)">' + esc(syncNote) + "</p>" : "") +
      '<form data-form="syncUnlock" class="stack">' + field("Password for " + esc(sync.email || "your account"), '<input type="password" name="password" autocomplete="current-password" required placeholder="Your Penny Pal password">') +
      '<div class="row"><button class="btn">' + icon("lock") + ' Lock and sync</button><button type="button" class="btn ghost" data-act="syncSignOut">Sign out</button></div></form>';
    else if (signedIn()) body = '<div class="callout">' + icon("check") + '<div><b>Sync is on</b> for ' + esc(sync.email || "your account") + '.<br><span class="small muted">Last synced ' + ago(sync.lastSync) + (syncState === "syncing" ? " · syncing..." : "") + "</span></div></div>" +
      (syncNote ? '<p class="small" style="color:var(--warn)">' + esc(syncNote) + "</p>" : "") +
      '<p class="small muted">Sign in with this same email on your other phone or laptop and everything follows you. If two devices change things at the same time, the most recent change wins.</p>' +
      '<div class="row"><button class="btn" data-act="syncNow">' + icon("refresh-cw") + ' Sync now</button><button class="btn ghost" data-act="syncSignOut">Sign out</button></div>' +
      (lastSnapshot() ? '<p class="tiny muted">Something look wrong after a sync? <button type="button" class="linklike tiny" data-act="undoSync">Undo last sync</button> brings back this device\'s data from ' + esc(new Date(lastSnapshot().at).toLocaleString(C.locale)) + ".</p>" : "");
    else body = '<p class="small">Use the same email and password on your phone and laptop, and Penny keeps them matched automatically. Your data is locked with your password before it leaves the device, so only you can read it.</p>' +
      (syncNote ? '<div class="callout gold small">' + icon("info") + "<div>" + esc(syncNote) + "</div></div>" : "") +
      '<form data-form="syncSignIn" class="stack" autocomplete="on">' + field("Email", '<input type="email" name="email" autocomplete="email" required value="' + esc(sync.email || "") + '" placeholder="you@example.com">') +
      field("Password", '<input type="password" name="password" autocomplete="current-password" required minlength="8" placeholder="At least 8 characters">') +
      '<div class="row"><button class="btn" name="kind" value="signin"' + (syncState === "syncing" ? " disabled" : "") + ">Sign in</button><button class=\"btn ghost\" name=\"kind\" value=\"signup\"" + (syncState === "syncing" ? " disabled" : "") + '>Create account</button></div></form>' +
      '<p class="tiny muted">New here? Press Create account. Already made one on another device? Press Sign in.</p>';
    return '<div class="card stack sync-card"><h2>☁️ Sync my phone and laptop</h2>' + body + "</div>";
  }
  function privacyCard() {
    const items = [
      ["🙈", "Nobody else can see your money", "Not your friends, not other Penny Pal users, not the people who run the app."],
      ["🔐", "Locked with your password", syncReady() ? "With sync on, your data is scrambled with a key made from your password before it leaves this device. The server only stores the scrambled version." : "Your data stays in this browser on this device."],
      ["🚫", "No ads, no selling, no tracking", "Penny Pal never sells or shares your data and has no ads or trackers."],
      ["🏦", "We never ask for your bank login", "You bring in transactions yourself with a bank file or a receipt. Penny never connects to your bank."],
      ["📸", "Receipts stay with you", "Emails and PDF bills are read right on your device. Photos are too (inside Claude, Claude reads them after asking you)."]
    ];
    return '<div class="card stack privacy-card"><h2>' + icon("lock") + " Your privacy</h2>" +
      '<div class="privacy-list">' + items.map(([e, t, d]) => '<div class="privacy-item"><span class="privacy-emoji">' + e + "</span><div><b>" + t + '</b><p class="small muted">' + d + "</p></div></div>").join("") + "</div>" +
      '<details class="small"><summary>Good to know</summary><ul class="small muted" style="padding-left:1.1em;margin-top:6px">' +
      "<li>Pick a password you don't use anywhere else. Only your password can unlock your synced data, so nobody can reset it for you. If you forget it, the copy on your devices is still fine, but you'd start a new account.</li>" +
      "<li>Anyone who can open your unlocked phone or laptop can open Penny Pal, just like your photos or messages. Use a screen lock.</li>" +
      "<li>Download a backup once in a while as an extra safety net.</li></ul></details></div>";
  }
  function startSync() {
    booting = false;
    if (!syncReady()) return;
    if (!sync.dirty) lastPushed = syncSig(); // what's here now matches what was last synced
    if (signedIn()) syncNow();
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); else if (sync.dirty) syncNow(); });
    window.addEventListener("online", () => syncNow());
    setInterval(() => { if (document.visibilityState === "visible") syncNow(); }, 60000);
  }

  /* ==================================================================
     Feed Penny: a monthly coin belly (like a Tamagotchi)
     Her belly starts empty each month. Money chores feed her coins (see feedPenny in config.js).
     Her mood compares your coins with where an even pace would be today.
     ================================================================== */
  const FP = C.feedPenny || {};
  const feedOn = () => FP.on !== false && Array.isArray(FP.chores);
  function feedBox() { const f = state.feed || (state.feed = {}); for (const k of ["ticks", "history", "full", "coins", "done"]) f[k] = f[k] || {}; return f; }
  function feedStatus(ym) {
    feedBox();
    const now = today(), cur = thisMonth(); ym = ym || cur;
    const [y, m] = ym.split("-").map(Number), days = new Date(y, m, 0).getDate();
    const day = ym === cur ? now.getDate() : ym < cur ? days : 0;
    const M = { ym, inMonth: (d) => typeof d === "string" && d.slice(0, 7) === ym };
    const chores = FP.chores.map((c) => {
      let done = false, prog = null;
      try {
        if (c.progress) { prog = c.progress(state, M); done = prog[0] >= prog[1]; }
        else done = !!c.check(state, M);
      } catch (e) { done = false; }
      return { c, done, prog, got: done ? c.coins : 0 };
    });
    const visits = new Set((state.profile.checkins || []).filter((d) => M.inMonth(d)));
    const weeks = [0, 1, 2, 3].map((w) => {
      const from = w * 7 + 1, to = w === 3 ? days : w * 7 + 7;
      let n = 0; for (let d = from; d <= to; d++) if (visits.has(ym + "-" + String(d).padStart(2, "0"))) n++;
      const started = day >= from, done = n >= (FP.weeklyDays || 2);
      return { w: w + 1, from, to, n, done, started, current: day >= from && day <= to, got: done ? FP.weeklyCoins || 5 : 0 };
    });
    const coins = Math.min(100, chores.reduce((a, x) => a + x.got, 0) + weeks.reduce((a, x) => a + x.got, 0));
    // someone who joined partway through the month is only expected to keep pace from the day they started
    const sinceISO = (state.feed && state.feed.since) || todayISO(); // no start date yet means they just joined
    const since = sinceISO.slice(0, 7) === ym ? +sinceISO.slice(8, 10) : sinceISO.slice(0, 7) > ym ? 99 : 1;
    const expected = day < since ? 0 : Math.round((100 * (day - since + 1)) / (days - since + 1)), behind = expected - coins;
    const S = (id) => (FP.stages || []).find((x) => x.id === id) || { id, pose: "happy", emoji: "🐷", name: id, say: "" };
    const stage = coins >= 100 ? S("stuffed") : behind <= 0 ? S("happy") : behind <= 20 ? S("content") : behind <= 40 ? S("peckish") : S("hungry");
    return { ym, day, days, coins, expected, behind, stage, chores, weeks };
  }
  function evalFeed() {
    if (!feedOn() || state.isExample) return;
    const f = feedBox(), cur = thisMonth();
    if (!f.since) f.since = todayISO();
    // a new month: remember how last month went, then Penny's belly starts fresh
    if (f.lastYm && f.lastYm !== cur && f.history[f.lastYm] === undefined) {
      const lastYm = f.lastYm, last = feedStatus(lastYm); f.history[lastYm] = last.coins;
      if (last.coins >= (FP.goodMonth || 80)) { award(FP.goodMonthXp || 100, "Happy month for Penny! 🐷"); setTimeout(() => celebrate("track", { emoji: "🪙", title: "Penny had a happy month!", sub: last.coins + " coins in " + monthLabel(lastYm) + ". Her belly starts fresh today." }), 900); }
      else setTimeout(() => toast("🪙 New month, fresh start! Penny's belly is ready for some coins."), 1200);
    }
    f.lastYm = cur;
    const st = feedStatus(cur), before = f.coins[cur], seen = f.done[cur];
    // which chores (and weeks) just got done? cheer for each one
    const nowDone = st.chores.filter((x) => x.done).map((x) => x.c.id).concat(st.weeks.filter((w) => w.done).map((w) => "week" + w.w));
    const fresh = seen ? nowDone.filter((id) => !seen.includes(id)) : [];
    f.done[cur] = nowDone; f.coins[cur] = st.coins;
    if (fresh.length && st.coins < 100) feedCheer(fresh, st);
    else if (!fresh.length && before !== undefined && st.coins > before) setTimeout(() => toast("🪙 +" + (st.coins - before) + " coins for Penny! Her belly is " + st.coins + "% full"), 400);
    if (st.coins >= 100 && !f.full[cur]) {
      f.full[cur] = todayISO(); award(FP.fullXp || 75, "Penny's belly is full!");
      setTimeout(() => celebrate("track", { pose: "belly-stuffed", emoji: "🤩", title: "Penny is stuffed!", sub: "Every money chore done for " + monthLabel(cur) + ". What a routine!" }), 700);
    }
  }
  function feedCheer(ids, st) {
    const items = ids.map((id) => {
      if (id.startsWith("week")) return { emoji: "📅", coins: FP.weeklyCoins || 5, cheer: FP.weeklyCheer || "Weekly check-in done!" };
      const c = FP.chores.find((x) => x.id === id); return c ? { emoji: c.emoji, coins: c.coins, cheer: c.cheer || c.title + " done!" } : null;
    }).filter(Boolean);
    if (!items.length) return;
    const total = items.reduce((a, x) => a + x.coins, 0), one = items.length === 1 ? items[0] : null;
    const left = 100 - st.coins, nextUp = st.chores.find((x) => !x.done);
    const tail = left <= 0 ? "" : left <= 20 ? " Almost full! Just " + left + " coins to go." : nextUp ? " Next snack: " + nextUp.c.title.toLowerCase() + "." : "";
    setTimeout(() => {
      celebrate("track", { pose: "coin", emoji: one ? one.emoji : "🪙", title: "+" + total + " coins for Penny! 🪙", sub: (one ? one.cheer : items.length + " chores done! You're on a roll.") + " Her belly is " + st.coins + "% full." + tail });
      toast("🪙 +" + total + " coins · Penny's belly " + st.coins + "%");
    }, 500);
  }
  function bellyBar(coins, big) {
    return '<div class="belly' + (big ? " big" : "") + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + coins + '" aria-label="Penny\'s belly"><i style="width:' + coins + '%"></i><span>' + coins + " / 100 🪙</span></div>";
  }
  function feedCard() {
    if (!feedOn()) return "";
    const st = feedStatus(), next = st.chores.filter((x) => !x.done).slice(0, 2);
    return '<div class="card feed-card">' + (pennyOn() ? '<button type="button" class="feed-penny" data-act="openFeed" aria-label="Open Feed Penny">' + mascot(118, "P", st.stage.pose) + "</button>" : '<div class="ci-emoji">' + st.stage.emoji + "</div>") +
      '<div class="feed-main"><div class="label">Feed Penny · ' + esc(monthLabel(st.ym)) + "</div><h3>" + st.stage.emoji + " " + esc(st.stage.name) + '</h3><p class="small muted">' + esc(st.stage.say) + "</p>" +
      bellyBar(st.coins) + '<div class="feed-next">' +
      (next.length ? next.map((x) => '<button type="button" class="chip-btn" data-act="feedGo" data-id="' + x.c.id + '">' + x.c.emoji + " " + esc(x.c.title) + ' <b>+' + x.c.coins + "</b></button>").join("") : '<span class="small">🎉 Every chore done this month!</span>') +
      '<button type="button" class="linklike small" data-act="openFeed">See all chores</button></div></div></div>';
  }
  function feedModal() {
    const st = feedStatus(), f = feedBox(), tick = f.ticks[st.ym] || {};
    const rows = st.chores.map((x) => {
      const c = x.c, prog = x.prog ? ' <span class="tiny muted">' + Math.min(x.prog[0], x.prog[1]) + "/" + x.prog[1] + "</span>" : "";
      let right;
      if (x.done) right = '<span class="feed-done">' + icon("check") + " +" + c.coins + "</span>" + (c.manual && !state.flags.noCreditCard ? '<button type="button" class="linklike tiny muted" data-act="feedTick" data-id="' + c.id + '">undo</button>' : "");
      else if (c.manual) right = '<button type="button" class="btn sm" data-act="feedTick" data-id="' + c.id + '">Done ✓</button>' + (c.id === "card" ? '<button type="button" class="btn ghost sm" data-act="feedNoCard">I don\'t have one</button>' : "");
      else right = '<button type="button" class="btn soft sm" data-act="feedGo" data-id="' + c.id + '">Go <b>+' + c.coins + "</b></button>";
      return '<div class="feed-row' + (x.done ? " done" : "") + '"><span class="feed-emoji">' + c.emoji + '</span><div class="feed-what"><b>' + esc(c.title) + "</b>" + prog + (c.how && !x.done ? '<p class="tiny muted">' + esc(c.how) + "</p>" : "") + '</div><div class="feed-right">' + right + "</div></div>";
    }).join("");
    const wk = st.weeks.map((w) => '<span class="feed-week' + (w.done ? " done" : w.current ? " now" : "") + '" title="Days ' + w.from + " to " + w.to + '">' + (w.done ? "🪙" : w.current ? w.n + "/" + (FP.weeklyDays || 2) : "·") + "<small>Wk " + w.w + "</small></span>").join("");
    const past = Object.keys(f.history).sort().slice(-6);
    openModal('<div class="stack feed-modal"><div class="feed-top">' + (pennyOn() ? mascot(150, "P", st.stage.pose) : '<div class="ci-emoji">' + st.stage.emoji + "</div>") +
      '<div><h2>Feed Penny 🪙</h2><p class="small"><b>' + st.stage.emoji + " " + esc(st.stage.name) + "</b>. " + esc(st.stage.say) + "</p>" + bellyBar(st.coins, true) +
      '<p class="tiny muted">Day ' + st.day + " of " + st.days + ". At an even pace she'd have about " + st.expected + " coins by today. Her belly starts fresh on the 1st.</p></div></div>" +
      '<h3 class="feed-h">Monthly chores</h3><div class="feed-list">' + rows + "</div>" +
      '<h3 class="feed-h">Weekly check-ins <span class="tiny muted">open Penny on ' + (FP.weeklyDays || 2) + " different days each week, +" + (FP.weeklyCoins || 5) + " coins</span></h3><div class=\"feed-weeks\">" + wk + "</div>" +
      (past.length ? '<h3 class="feed-h">Past months</h3><div class="feed-past">' + past.map((ym) => '<span class="' + (f.history[ym] >= (FP.goodMonth || 80) ? "good" : "") + '"><b>' + f.history[ym] + "</b><small>" + esc(monthLabel(ym).split(" ")[0].slice(0, 3)) + "</small></span>").join("") + "</div>" : "") +
      '<p class="tiny muted">Fill her belly to ' + (FP.goodMonth || 80) + "+ coins by the end of the month for a happy month (+" + (FP.goodMonthXp || 100) + " XP). Fill it all the way for +" + (FP.fullXp || 75) + " XP.</p>" +
      '<div class="row"><button class="btn ghost" data-close>Close</button></div></div>');
  }

  /* ==================================================================
     Bank statements as PDF or screenshots
     - PDF statements: the text is read on your device and each line that starts
       with a date and has an amount becomes a transaction.
     - Screenshots / photos / scanned PDFs: read by Claude (inside Claude) or by
       the free text reader (on the website), then the same line reader.
     - Everything goes to the same review screen as CSV imports.
     ================================================================== */
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  const MONEY_RX = /\(?-?\$?\s?\d{1,3}(?:,\d{3})*\.\d{2}\)?(?:\s?(?:CR|DR))?|\(?-?\$?\s?\d+\.\d{2}\)?(?:\s?(?:CR|DR))?/gi;
  function moneyToken(tok) {
    const neg = /^\(|\)$|^-|-\$|CR$/i.test(tok.trim());
    const v = parseFloat(tok.replace(/[^\d.]/g, ""));
    return { v: isFinite(v) ? v : null, neg };
  }
  function statementYear(text) {
    const ys = (text.match(/\b20\d{2}\b/g) || []).map(Number).filter((y) => y > 2000 && y <= new Date().getFullYear() + 1);
    if (!ys.length) return new Date().getFullYear();
    const count = {}; ys.forEach((y) => { count[y] = (count[y] || 0) + 1; });
    return +Object.keys(count).sort((a, b) => count[b] - count[a] || b - a)[0];
  }
  function lineDate(line, year) {
    let m, y = year, mo, d, rest;
    if ((m = line.match(/^\s*(\d{4})-(\d{2})-(\d{2})\b/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = line.match(/^\s*(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i))) { mo = MON[m[1].toLowerCase()]; d = +m[2]; if (m[3]) y = +m[3]; }
    else if ((m = line.match(/^\s*(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?(?:,?\s+(\d{4}))?\b/i))) { d = +m[1]; mo = MON[m[2].toLowerCase()]; if (m[3]) y = +m[3]; }
    else if ((m = line.match(/^\s*(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/))) { let a = +m[1], b = +m[2]; if (a > 12) { d = a; mo = b; } else { mo = a; d = b; } if (m[3]) y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; }
    else return null;
    rest = line.slice(m[0].length);
    // credit cards often show two dates (bought, then posted): skip the second one
    const again = rest.match(/^\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+\d{1,2}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?|\d{1,2}[\/.]\d{1,2}(?:[\/.]\d{2,4})?|\d{4}-\d{2}-\d{2})\b/i);
    if (again) rest = rest.slice(again[0].length);
    const dt = new Date(y, mo - 1, d);
    if (!mo || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    // a "Dec 28" on a statement printed in January belongs to last year
    if (dt > new Date(Date.now() + 3 * 86400000)) dt.setFullYear(dt.getFullYear() - 1);
    return { date: toISO(dt), rest };
  }
  const SKIP_LINE = /opening balance|closing balance|balance forward|previous balance|new balance|total|subtotal|minimum payment|credit limit|available credit|interest rate|annual interest|statement (date|period)|page \d|account number|amount due/i;
  const MONEY_IN = /deposit|payroll|pay ?cheque|salary|direct dep|e-?transfer (received|from|in)|transfer from|refund|reversal|interest paid|interest earned|cashback|cash back|rebate|credit\b|payment.*thank|thank you.*payment|gst|hst credit|ccb|canada child|ei benefit|cerb|tax refund/i;
  /* Statements with columns (funds out / funds in / balance, withdrawals / deposits, debit / credit):
     read each amount by the column it sits under, and never use the balance column. */
  const COL_OUT = /^(funds out|withdrawals?|withdrawn|debits?|money out|paid out|cheques? (and|&) debits|amounts? withdrawn)$/i;
  const COL_IN = /^(funds in|deposits?|credits?|money in|paid in|deposits? (and|&) credits|amounts? deposited)$/i;
  const COL_BAL = /^(balance|running balance|balance \(\$\))$/i;
  function parseStatementColumns(pages, year) {
    const out = [];
    out.balance = null;
    for (const items of pages || []) {
      if (!items.length) continue;
      // join header words that pdf.js split up ("funds" + "out") by grouping items on the same line
      const lines = [];
      items.slice().sort((a, b) => b.y - a.y || a.x - b.x).forEach((it) => {
        const ln = lines.find((l) => Math.abs(l.y - it.y) <= Math.max(2, it.h * 0.35));
        if (ln) ln.items.push(it); else lines.push({ y: it.y, items: [it] });
      });
      lines.forEach((l) => l.items.sort((a, b) => a.x - b.x));
      // find the header: words close together on one line make one label
      let cols = null, headY = null;
      for (const l of lines) {
        const labels = []; let cur = null;
        for (const it of l.items) {
          if (cur && it.x - (cur.x + cur.w) < 8) { cur.s += " " + it.s; cur.w = it.x + it.w - cur.x; } else { cur = { s: it.s, x: it.x, w: it.w }; labels.push(cur); }
        }
        const c = {};
        for (const lb of labels) {
          const t = lb.s.replace(/\(\$\)|\$/g, "").trim(), mid = lb.x + lb.w / 2;
          if (COL_OUT.test(t)) c.out = mid; else if (COL_IN.test(t)) c.in = mid; else if (COL_BAL.test(t)) c.bal = mid;
        }
        if (c.out !== undefined && c.in !== undefined) { cols = c; headY = l.y; break; }
      }
      if (!cols) continue;
      const near = (x) => { const opts = [["out", cols.out], ["in", cols.in]].concat(cols.bal !== undefined ? [["bal", cols.bal]] : []); return opts.sort((a, b) => Math.abs(a[1] - x) - Math.abs(b[1] - x))[0][0]; };
      // walk down the page: a line starting with a date opens a transaction; amounts can sit a little lower
      let cur = null;
      const finish = () => {
        if (!cur) return;
        const desc = cur.desc.join(" ").replace(/\s+/g, " ").trim();
        if (desc && !SKIP_LINE.test(desc) && (cur.out || cur.in)) out.push({ date: cur.date, desc: desc.slice(0, 80), amt: cur.in && !cur.out ? cur.in : -cur.out });
        if (cur.bal !== undefined && (!out.balance || cur.date >= out.balance.date)) out.balance = { amount: cur.bal, date: cur.date };
        cur = null;
      };
      for (const l of lines) {
        if (l.y >= headY) continue;
        const lineText = l.items.map((i) => i.s).join(" ");
        const ld = lineDate(lineText, year);
        const firstX = l.items[0].x;
        if (ld && firstX < (cols.out - 40)) { finish(); cur = { date: ld.date, desc: [], out: 0, in: 0, lastY: l.y }; }
        if (!cur) continue;
        // a totals / balance line, or a big gap, ends the transaction above it
        if (!ld && (SKIP_LINE.test(lineText) || cur.lastY - l.y > Math.max(40, (l.items[0].h || 10) * 4))) { finish(); continue; }
        cur.lastY = l.y;
        for (const it of l.items) {
          const isMoney = /^\(?-?\$?\s?\d{1,3}(,\d{3})*\.\d{2}\)?(\s?(CR|DR))?$|^\(?-?\$?\d+\.\d{2}\)?$/i.test(it.s);
          if (isMoney && it.x > cols.out - 120) {
            const where = near(it.x + it.w / 2), v = moneyToken(it.s).v;
            if (where === "out" && !cur.out) cur.out = v; else if (where === "in" && !cur.in) cur.in = v; else if (where === "bal") cur.bal = v; // the balance is never a transaction, but it tells us what's in the account
          } else if (it.x < cols.out - 40) {
            const t = ld && it === l.items[0] ? "" : it.s;
            if (t && !(ld && lineDate(t + " x", year))) cur.desc.push(t);
          }
        }
        if (ld) { // drop the date text (and a second "effective" date) from the description
          const rest = ld.rest.replace(/\(?-?\$?\s?\d{1,3}(,\d{3})*\.\d{2}\)?.*/, "").trim();
          cur.desc = rest ? [rest] : [];
        }
      }
      finish();
    }
    return out;
  }
  function parseStatementText(text) {
    const year = statementYear(text), lines = String(text || "").split(/\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
    const out = []; let prevBal = null;
    for (const line of lines) {
      if (SKIP_LINE.test(line)) {
        const t = line.match(MONEY_RX);
        if (/balance/i.test(line) && t) prevBal = moneyToken(t[t.length - 1]).v;
        if (/closing balance|new balance|balance on|ending balance/i.test(line) && t) out.closing = moneyToken(t[t.length - 1]).v;
        continue;
      }
      const ld = lineDate(line, year); if (!ld) continue;
      let toks = ld.rest.match(MONEY_RX);
      if (!toks) { // amounts printed a little lower, on their own line
        const nxt = lines[lines.indexOf(line) + 1];
        if (nxt && !lineDate(nxt, year) && /^[\s\d,.$()\-CRD]+$/i.test(nxt)) { const nt = nxt.match(MONEY_RX); if (nt && nt.length >= 2) { ld.rest = ld.rest + " " + nxt; toks = nt; } }
      }
      if (!toks) continue;
      const first = ld.rest.indexOf(toks[0]);
      let desc = ld.rest.slice(0, first).replace(/[|*]+/g, " ").replace(/\s+/g, " ").trim();
      if (!desc || desc.length < 2) continue;
      const amt = moneyToken(toks[0]); if (!amt.v) continue;
      const bal = toks.length >= 2 ? moneyToken(toks[toks.length - 1]).v : null;
      let sign;
      if (bal !== null && prevBal !== null && Math.abs(Math.abs(bal - prevBal) - amt.v) < 0.02) sign = bal > prevBal ? 1 : -1;
      else if (amt.neg) sign = 1; // shown as a credit
      else sign = MONEY_IN.test(desc) ? 1 : -1;
      if (bal !== null) { prevBal = bal; if (!out.balance || ld.date >= out.balance.date) out.balance = { amount: bal, date: ld.date }; }
      out.push({ date: ld.date, desc: desc.slice(0, 80), amt: sign * amt.v });
    }
    return out;
  }
  /* Banking app screenshots: the date is a heading, the name can wrap onto a
     second line, and a running balance sits under each amount. */
  const APP_JUNK = /^(home|explore|accounts?|move money|rewards|pay( & transfer)?|transfers?|more|menu|search|filter|transactions|activity|pending|posted|see all|view all|done|back|[<>?=\s]+)$|home.*(accounts|explore|more)/i;
  function parseAppList(text) {
    const year = statementYear(text), today = todayISO();
    const lines = String(text || "").split(/\n/).map((l) => l.replace(/\s+/g, " ").replace(/\s*[>›»]+\s*$/, "").trim()).filter(Boolean);
    const toksOf = (l) => l.match(MONEY_RX);
    const isMoneyOnly = (l) => { const t = toksOf(l); return !!t && t.length === 1 && l.replace(t[0], "").replace(/[^a-z]/gi, "").length === 0; };
    const hasWords = (l) => /[a-z]{2}/i.test(l);
    const headDate = (l) => {
      if (/^today\b/i.test(l)) return today;
      if (/^yesterday\b/i.test(l)) return toISO(new Date(Date.now() - 86400000));
      const ld = lineDate(l.replace(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s+/i, ""), year); if (!ld) return null;
      return ld.rest.replace(/[^a-z0-9$]/gi, "").length <= 2 ? ld.date : null;
    };
    // a running balance: a lone amount right under an amount line, or two amounts on one line
    const hasBalances = lines.some((l, i) => i && isMoneyOnly(l) && toksOf(lines[i - 1]) && hasWords(lines[i - 1])) || lines.filter((l) => (toksOf(l) || []).length === 2).length > 1;
    const out = []; let date = null, cur = null, lead = "";
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], nx = lines[i + 1] || "";
      if (SKIP_LINE.test(l)) { cur = null; lead = ""; continue; }
      const hd = headDate(l); if (hd) { date = hd; cur = null; lead = ""; continue; }
      const toks = toksOf(l);
      if (!toks) {
        if (!date || !hasWords(l) || l.length > 45 || APP_JUNK.test(l)) { lead = ""; continue; }
        const nxMoney = toksOf(nx);
        if (nxMoney && (hasWords(nx) || isMoneyOnly(nx)) && !(hasBalances && cur && !cur.closed)) lead = (lead + " " + l).trim(); // first line of the next one
        else if (cur && !cur.closed && (hasBalances || /^[-&/(+]|^[a-z]/.test(l))) { cur.desc += " " + l; if (!hasBalances) cur.closed = true; } // second line of this one
        continue;
      }
      if (isMoneyOnly(l)) {
        if (lead && date) { const a = moneyToken(toks[0]); out.push(cur = { date, desc: lead, v: a.v, tok: toks[0], closed: false }); lead = ""; continue; }
        if (cur) cur.closed = true; continue; // the balance line
      }
      let before = l.slice(0, l.indexOf(toks[0])).replace(/[|*•]+/g, " ").trim();
      if (!date || !hasWords(before)) { lead = ""; continue; }
      // "Atsi $35,909.78": the rest of the name plus the balance
      if (hasBalances && cur && !cur.closed && toks.length === 1 && !/^[-+(]/.test(toks[0].trim())) { cur.desc += " " + before; cur.closed = true; continue; }
      if (lead) { before = lead + " " + before; lead = ""; }
      const a = moneyToken(toks[0]); if (!a.v) continue;
      out.push(cur = { date, desc: before, v: a.v, tok: toks[0], closed: toks.length >= 2 });
    }
    // Bank accounts show money out with a minus. Credit cards show purchases plain and refunds with a minus.
    const minus = out.filter((r) => moneyToken(r.tok).neg && !/CR$/i.test(r.tok.trim())).length;
    const bankStyle = hasBalances || minus * 2 > out.length;
    return out.map((r) => {
      const t = r.tok.trim(), neg = moneyToken(t).neg, plus = /^\+/.test(t), cr = /CR$/i.test(t);
      let sign;
      if (plus || cr) sign = 1;
      else if (bankStyle) sign = neg ? -1 : 1;
      else sign = neg ? 1 : MONEY_IN.test(r.desc) && !/payment.*thank|thank you.*payment/i.test(r.desc) ? 1 : -1;
      if (!bankStyle && /payment.*thank|thank you.*payment|payment received/i.test(r.desc)) sign = 1;
      return { date: r.date, desc: r.desc.replace(/\s+/g, " ").replace(/^[-–]\s*/, "").trim().slice(0, 80), amt: sign * r.v };
    }).filter((r) => r.desc.length >= 2 && isFinite(r.amt) && r.amt);
  }
  function bankPrompt(kind) {
    return (kind === "image" ? "The attached image is a screenshot or photo of a bank or credit card transaction list from Canada." : "Below is the text of a Canadian bank or credit card statement.") +
      " List every transaction you can read. Reply with only JSON like {\"transactions\":[{\"date\":\"2026-11-03\",\"description\":\"TIM HORTONS #1234\",\"amount\":-4.50}]}." +
      " If the ending or current balance is shown, add \"balance\": number and \"balanceDate\": \"YYYY-MM-DD\" next to transactions." +
      " amount is negative for money going out (purchases, bills, withdrawals) and positive for money coming in (deposits, paycheques, refunds). date is YYYY-MM-DD; if the year isn't shown, use " + new Date().getFullYear() +
      ". Skip balances, totals and headings. Never invent transactions. If you can't read any, reply {\"transactions\":[]}.";
  }
  function checkAITransactions(ai) {
    const list = ai && Array.isArray(ai.transactions) ? ai.transactions : [];
    const latest = toISO(new Date(Date.now() + 3 * 86400000));
    const res = list.map((t) => {
      const date = typeof t.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && t.date <= latest && t.date > "2000-01-01" ? t.date : null;
      const amt = +t.amount, desc = typeof t.description === "string" ? t.description.replace(/<[^>]*>/g, "").trim().slice(0, 80) : "";
      return date && isFinite(amt) && amt !== 0 && Math.abs(amt) < 1e6 && desc ? { date, desc, amt: Math.round(amt * 100) / 100 } : null;
    }).filter(Boolean);
    const b = ai && +ai.balance, bd = ai && typeof ai.balanceDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ai.balanceDate) && ai.balanceDate <= latest ? ai.balanceDate : null;
    if (ai && ai.balance != null && isFinite(b) && Math.abs(b) < 1e8) res.balance = { amount: Math.round(b * 100) / 100, date: bd || (res.length ? res.map((x) => x.date).sort().pop() : todayISO()) };
    return res;
  }
  async function aiStatement(input, image) {
    const sample = await getSample(); if (!sample) return null;
    if (image) {
      const lim = await sample.limits().catch(() => null); if (!lim || !lim.images) return null;
      const maxB = lim.images.maxInputBytes || 5e6;
      for (const px of [1600, 1200]) { if (image.size <= maxB) break; image = (await imageToJpeg(image, px)).blob; }
    }
    try { return checkAITransactions(await sample.json(image ? bankPrompt("image") : bankPrompt("text") + "\n\n" + input.slice(0, 12000), image ? { images: [image] } : {})); }
    catch (e) { if (e && e.code === "rate_limited") throw e; return null; }
  }
  // Is this a credit card or a bank account statement?
  function accountKindOf(text, rows) {
    if (/visa|mastercard|master card|amex|american express|credit card|minimum payment|credit limit|new balance|cash back card|rewards card/i.test(text)) return "card";
    if (/line of credit|\bloc\b/i.test(text)) return "loc";
    if (/savings|hisa|high interest/i.test(text)) return "savings";
    return "chequing";
  }
  const BANK_NAMES = /\b(TD|RBC|ROYAL BANK|SCOTIA|BMO|CIBC|TANGERINE|EQ BANK|SIMPLII|NATIONAL BANK|DESJARDINS|WEALTHSIMPLE|KOHO|PC FINANCIAL|HSBC|MOTUSBANK|AMEX|CAPITAL ONE|ROGERS BANK|TRIANGLE)\b/i;
  // What date is this account's number "as of"? A statement's end date, or the day you typed it yourself
  const acctAsOf = (a) => (a.asOf && !(a.manualOn && a.manualOn > a.asOf) ? a.asOf : a.manualOn || a.updated || "");
  function planBalances(list) {
    // only the newest statement for each account counts
    const keyOf = (b) => (b.kind || "") + "|" + ((b.name.match(BANK_NAMES) || [""])[0].toUpperCase());
    const newest = {};
    list.forEach((b) => { const k = keyOf(b); if (!newest[k] || b.date > newest[k].date) newest[k] = b; });
    const skippedOlder = list.length - Object.keys(newest).length;
    const plan = Object.values(newest).map((b) => {
      const type = b.kind === "card" ? "cc" : b.kind === "loc" ? "loc" : b.kind === "savings" ? "savings" : "chequing";
      const isDebt = type === "cc" || type === "loc";
      const amount = Math.abs(b.amount); // a card's balance is what you owe
      const bank = (b.name.match(BANK_NAMES) || [""])[0].toUpperCase();
      const mine = state.accounts.filter((a) => !a.example && a.type === type);
      const pick = mine.find((a) => bank && a.name.toUpperCase().includes(bank)) || mine[0] || null;
      const days = daysBetween(parseISO(b.date), today());
      const known = pick ? acctAsOf(pick) : "";
      const typedByYou = !!(pick && (!pick.asOf || (pick.manualOn && pick.manualOn > pick.asOf)));
      const newer = !pick || !known || (typedByYou ? b.date > known : b.date >= known);
      const fresh = days <= 31;
      return Object.assign({}, b, { type, isDebt, amount, typedByYou, known, accountId: pick ? pick.id : "new", newName: (bank ? (bank.length <= 4 ? bank : bank === "EQ BANK" ? "EQ Bank" : bank.charAt(0) + bank.slice(1).toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())) + " " : "") + acctType(type).name, apply: fresh && newer, days, newer });
    });
    plan.skippedOlder = skippedOlder;
    return plan;
  }
  function balanceSection(p) {
    if (!p.balances || !p.balances.length) return "";
    return '<div class="card-inner bal-box"><h3>' + icon("scale") + " Update The Pig Picture?</h3>" +
      '<p class="small muted">Penny found the balance at the end of ' + (p.balances.length === 1 ? "this statement" : "these statements") + ". Check it against your banking app before updating, since anything after the statement date isn't included.</p>" +
      (p.balances.skippedOlder ? '<p class="tiny muted">You picked more than one statement for the same account, so Penny only used the newest one.</p>' : "") +
      p.balances.map((b, i) => {
        const acct = state.accounts.find((a) => a.id === b.accountId);
        const opts = state.accounts.filter((a) => !a.example && acctType(a.type).kind === (b.isDebt ? "debt" : "asset")).map((a) => '<option value="' + a.id + '"' + (a.id === b.accountId ? " selected" : "") + ">" + esc(a.name) + " (now " + money2(a.balance) + ")</option>").join("") + '<option value="new"' + (b.accountId === "new" ? " selected" : "") + ">➕ New account: " + esc(b.newName) + "</option>";
        const warn = b.days > 31 ? "This balance is from " + dayLabel(parseISO(b.date)) + ", over a month ago. Anything since then isn't included, so only update if it's still about right." :
          !b.newer && acct ? (b.typedByYou ? "You typed " + esc(acct.name) + "'s balance yourself on " + dayLabel(parseISO(b.known)) + ", after this statement ended, so Penny keeps your number." : esc(acct.name) + " already has a newer balance (from " + dayLabel(parseISO(b.known)) + "), so Penny left it unticked.") :
          b.days > 3 ? "Statement ends " + dayLabel(parseISO(b.date)) + ". Anything after that isn't included." : "";
        return '<div class="bal-row"><label class="check"><input type="checkbox" data-change="balApply" data-i="' + i + '"' + (b.apply ? " checked" : "") + "> <span><b>" + esc(b.name) + "</b> ends with " + (b.isDebt ? "<b>" + money2(b.amount) + "</b> owed" : "a balance of <b>" + money2(b.amount) + "</b>") + " on " + esc(dayLabel(parseISO(b.date))) + "</span></label>" +
          '<div class="row" style="gap:8px;margin-left:28px"><span class="small muted">Update</span><select data-change="balAcct" data-i="' + i + '">' + opts + "</select></div>" +
          (warn ? '<p class="tiny warn-note" style="margin-left:28px">⚠️ ' + warn + "</p>" : "") + "</div>";
      }).join("") + "</div>";
  }
  let importBusy = "";
  // Read one file (CSV, PDF or picture) into signed rows: amt < 0 is money out
  async function readImportFile(file) {
    const name = (file.name || "").toLowerCase(), type = (file.type || "").toLowerCase();
    const isCsv = /\.(csv|txt)$/.test(name) || /csv|text\/plain/.test(type);
    const isPdf = type === "application/pdf" || name.endsWith(".pdf"), isImg = type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/.test(name);
    if (!file.size) throw new Error("It looks empty.");
    if (file.size > 25 * 1024 * 1024) throw new Error("It's over 25 MB.");
    if (isCsv) {
      const raw = await file.text(), parsed = readBankRows(parseCSV(raw), false);
      const rows = parsed.map((r) => ({ date: r.date, desc: r.desc, amt: r.kind === "income" ? r.amount : -r.amount }));
      if (!rows.length) throw new Error("No transactions found. Make sure it's the CSV from your bank.");
      return { rows, how: "csv", balance: parsed.balance || null, kind: accountKindOf(name + " " + raw.slice(0, 400), rows) };
    }
    if (isPdf) {
      let pdf;
      try { pdf = await withTimeout(readPdf(file, 20), 45000, "pdf_timeout"); }
      catch (e) { throw new Error(e && /load_failed|pdf_unavailable/.test(e.message) ? "Reading PDFs needs internet the first time." : "It couldn't be opened (it might have a password)."); }
      const text = cleanText(pdf.text);
      let rows = parseStatementColumns(pdf.pages, statementYear(text)), how = "pdf";
      if (!rows.length) rows = parseStatementText(text);
      let balance = rows.balance || null;
      if (rows.closing != null) balance = { amount: rows.closing, date: balance ? balance.date : rows.length ? rows.map((x) => x.date).sort().pop() : todayISO() };
      const kind = accountKindOf(name + " " + text.slice(0, 3000), rows);
      if (rows.length < 2 && text.length > 40) { const ai = await aiStatement(text, null); if (ai && ai.length > rows.length) { rows = ai; how = "ai"; } }
      if (!rows.length && pdf.image) { const r = await readStatementImage(pdf.image); rows = r.rows; how = r.how; }
      if (!rows.length) throw new Error("No transactions found. If it's a scanned statement, try a screenshot or the CSV.");
      return { rows, how, balance: balance || rows.balance || null, kind };
    }
    if (isImg) {
      const r = await readStatementImage(file);
      if (r.error) throw new Error(r.error);
      if (!r.rows.length) throw new Error("Penny couldn't read any transactions in it. Try a sharper screenshot.");
      return { rows: r.rows, how: r.how, balance: r.rows.balance || null, kind: accountKindOf(name, r.rows) };
    }
    throw new Error("Penny can read CSV files, PDF statements and screenshots, not this kind of file.");
  }
  async function importFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean).slice(0, 30);
    if (!files.length) return;
    const all = [], errors = [], hows = new Set(), names = [], balances = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      importBusy = files.length > 1 ? "Reading " + (i + 1) + " of " + files.length + ": " + (f.name || "file") : /\.pdf$/i.test(f.name || "") ? "Penny is reading your statement..." : /\.csv$/i.test(f.name || "") ? "Penny is reading your file..." : "Penny is reading your screenshot...";
      render();
      try {
        const r = await readImportFile(f);
        names.push(f.name || "file " + (i + 1)); hows.add(r.how);
        if (r.balance && isFinite(r.balance.amount)) balances.push({ file: names.length - 1, name: f.name || "file", amount: r.balance.amount, date: r.balance.date, kind: r.kind });
        r.rows.forEach((row) => all.push(Object.assign({ file: names.length - 1 }, row)));
      } catch (e) {
        if (e && e.code === "rate_limited") { errors.push({ name: f.name, msg: "Penny needed a break from reading. Try this one again in a minute." }); continue; }
        errors.push({ name: f.name || "file " + (i + 1), msg: (e && e.message) || "Something went wrong reading it." });
      }
    }
    importBusy = "";
    if (!all.length) {
      pendingImport = null; render();
      return importFail(errors.length === 1 ? errors[0].name + ": " + errors[0].msg : "Penny couldn't read any of those files. " + errors.map((x) => x.name + ": " + x.msg).join(" "));
    }
    pendingImport = { src: hows.has("ai") || hows.has("ocr") ? "ai" : hows.has("pdf") ? "pdf" : "csv", base: all, files: names, flips: {}, errors, balances: planBalances(balances) };
    Object.assign(pendingImport, buildFromBase(all, {}));
    render();
  }
  async function readStatementImage(blob) {
    let jpeg; try { jpeg = await openPicture(blob, 2000); } catch (e) { return { rows: [], error: isHeic(blob) ? "This iPhone HEIC picture couldn't be opened. Check your internet and try again, or send a screenshot instead (screenshots are PNG)." : "That picture couldn't be opened. Try another screenshot." }; }
    const ai = await aiStatement("", jpeg.blob);
    if (ai && ai.length) return { rows: ai, how: "ai" }; // ai.balance comes along with the list
    const readRows = (text) => {
      if (!text) return [];
      const t = cleanText(text);
      const tries = (lastOcrLayout || []).map((l) => parseAppList(cleanText(l))).concat([parseStatementText(t), parseAppList(t)]);
      // the most rows wins; on a tie, the one that read the names most fully
      tries.sort((a, b) => b.length - a.length || b.reduce((n, r) => n + r.desc.length, 0) - a.reduce((n, r) => n + r.desc.length, 0));
      const best = tries[0].map((r) => Object.assign({}, r)); best.balance = tries[0].balance; best.closing = tries[0].closing;
      if (!best.length) return best;
      const key = (r) => r.date + "|" + r.amt.toFixed(2), words = (d) => d.toUpperCase().split(/[^A-Z0-9]+/).filter((w) => w.length > 1);
      for (const other of tries.slice(1)) {
        const left = {}; best.forEach((r) => { left[key(r)] = (left[key(r)] || 0) + 1; });
        for (const r of other) {
          const same = best.filter((b) => key(b) === key(r));
          // a fuller name for the same row (the other read caught both lines)
          same.forEach((b) => { const bw = words(b.desc), rw = words(r.desc); if (rw.length > bw.length && bw.every((w) => rw.includes(w))) b.desc = r.desc; });
          if (left[key(r)]) left[key(r)]--;
          else if (other.length >= best.length * 0.6 && words(r.desc).length) best.push(Object.assign({}, r)); // a row only this read caught
        }
      }
      return best.sort((a, b) => b.date.localeCompare(a.date));
    };
    lastOcrLayout = [];
    let rows = readRows(await ocrRead(jpeg.blob, true).catch(() => null));
    if (!rows.length) { lastOcrLayout = []; const inv = await invertImage(jpeg.blob).catch(() => null); if (inv) rows = readRows(await ocrRead(inv, true).catch(() => null)); } // dark mode screenshots
    return { rows, how: "ocr" };
  }
  function importFail(msg) { importBusy = ""; pendingImport = null; render(); setTimeout(() => openModal('<div class="ci">' + (pennyOn() ? mascot(110, "P", "comfort") : "") + "<h2>Hmm, that didn't work</h2><p>" + esc(msg) + '</p><div class="row" style="justify-content:center"><button class="btn" data-close>Okay</button></div></div>'), 50); }
  function statementCat(desc, kind) {
    let cat = autoCat(desc, kind);
    if (kind === "expense" && cat === "other") { const g = guessCategory("", desc); if (g.cat !== "other") cat = g.cat; }
    if (kind === "income" && /refund|return|reversal|cash ?back|rebate|credit|gst|hst|ccb|benefit|tax/i.test(desc) && state.categories.some((c) => c.id === "gov")) cat = "gov";
    // money back from a store (a return on your card) is a refund, not a paycheque
    if (kind === "income" && (cat === "pay" || cat === "other") && state.categories.some((c) => c.id === "gov") && !/payroll|salary|pay ?cheque|direct dep|deposit/i.test(desc)) { const g = explainCat(desc, "expense"); if (g && g.cat && !["other", "transfer", "payback"].includes(g.cat) && (catById(g.cat).group || "") !== "income") cat = "gov"; }
    return cat;
  }
  const CARD_PAYMENT = /payment.*thank|thank you.*payment|payment received|paiement|autopay(ment)?|pre-?authorized payment/i;
  function buildFromBase(base, flips) {
    flips = flips === true ? { all: true } : flips || {};
    const have = new Set(state.transactions.map((t) => t.date + "|" + t.desc + "|" + (+t.amount).toFixed(2)));
    const all = base.map((r) => { const a = flips.all || flips[r.file] ? -r.amt : r.amt, kind = a < 0 ? "expense" : "income"; return { date: r.date, desc: r.desc, amount: Math.abs(a), kind, cat: statementCat(r.desc, kind), file: r.file }; });
    // the same transaction in two overlapping statements only counts once
    const seenInBatch = {};
    const rows = all.filter((r) => {
      const k = r.date + "|" + r.desc + "|" + r.amount.toFixed(2);
      if (have.has(k)) return false;
      if (seenInBatch[k] !== undefined && seenInBatch[k] !== r.file) return false;
      seenInBatch[k] = r.file; return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
    // paying off a credit card isn't income: start those unticked
    const skip = {}; rows.forEach((r, i) => { if (r.kind === "income" && CARD_PAYMENT.test(r.desc)) skip[i] = true; });
    return { rows, dupes: all.length - rows.length, skip };
  }

  let txLimit = 300;
  /* Batch select on the Transactions list */
  let selMode = false; const selIds = new Set(); window.__lastShown = [];
  function sortOtherModal(tips, left) {
    openModal('<div class="stack"><div class="row" style="flex-wrap:nowrap;gap:12px">' + (pennyOn() ? mascot(90, "P", "thinking") : "") + '<div><h2>✨ Sort my Other</h2><p class="small muted">' + (tips.length ? "Penny has ideas for <b>" + tips.length + "</b> of them. Check each one, change anything, then tap Sort." : "Penny couldn't figure these out from the names.") + "</p></div></div>" +
      (tips.length ? '<div class="sort-list">' + tips.map((x, i) => '<div class="sort-row" data-i="' + i + '"><input type="checkbox" checked aria-label="Use this"><div class="grow"><div class="t">' + esc(x.t.desc) + '</div><div class="tiny muted">' + esc(x.t.date) + " · " + money2(x.t.amount) + " · " + esc(x.e.why) + '</div></div><select aria-label="Category">' + catOptions(x.e.cat) + "</select></div>").join("") + "</div>" : "") +
      (left.length ? '<p class="small muted">' + left.length + " still unsure" + (left.length <= 8 ? ": " + left.map((t) => esc(t.desc)).join(", ") : "") + ". You can select them on the list and move them together." + "</p>" : "") +
      '<div class="row">' + (tips.length ? '<button class="btn" data-act="sortOtherApply">' + icon("check") + " Sort " + tips.length + "</button>" : "") + (left.length && inFrame() ? '<button class="btn soft" data-act="sortOtherAI">Ask Claude about the rest</button>' : "") + '<button class="btn ghost" data-close>Close</button></div></div>');
  }
  function selectBar(shown) {
    window.__lastShown = shown.map((t) => t.id);
    const n = selIds.size;
    return '<div class="sel-bar"><label class="check small"><input type="checkbox" data-change="selAll"' + (shown.length && shown.every((t) => selIds.has(t.id)) ? " checked" : "") + "> Select all " + shown.length + " shown</label>" +
      '<span class="small"><b>' + n + "</b> selected</span>" +
      '<span class="row" style="gap:6px;flex-wrap:wrap"><select id="selCat" aria-label="Move selected to">' + catOptions("") + '</select><button class="btn sm" data-act="selMove"' + (n ? "" : " disabled") + ">Move " + (n || "") + '</button><label class="check tiny"><input type="checkbox" id="selLearn" checked> Remember these stores</label>' +
      '<button class="btn ghost sm danger-text" data-act="selDelete"' + (n ? "" : " disabled") + ">Delete</button></span></div>";
  }

  /* PAGE: Transactions ----------------------------------------------- */
  let pendingImport = null;
  PAGES.spending = {
    render() {
      const ym = state.ui.month, q = (state.ui.q || "").toLowerCase(), cf = state.ui.cat, all = !!state.ui.txAll;
      let tx = all ? state.transactions.slice() : state.transactions.filter((t) => t.date.startsWith(ym));
      if (q) tx = tx.filter((t) => (t.desc + " " + catById(t.cat).name).toLowerCase().includes(q));
      if (cf !== "all") tx = tx.filter((t) => t.cat === cf);
      tx.sort((a, b) => b.date.localeCompare(a.date));
      const m = monthStats(ym);
      // totals for exactly what's shown (this month, or everything you've entered)
      const grpOf = (t) => catById(t.cat);
      const shownBack = tx.filter((t) => t.kind === "income" && grpOf(t).offset).reduce((a, t) => a + +t.amount, 0);
      const shownIn = tx.filter((t) => t.kind === "income" && grpOf(t).group !== "transfer" && !grpOf(t).offset).reduce((a, t) => a + +t.amount, 0);
      const shownOut = Math.max(0, tx.filter((t) => t.kind !== "income" && grpOf(t).group !== "transfer").reduce((a, t) => a + +t.amount, 0) - shownBack);
      const total = tx.length, limit = all ? txLimit : Infinity, cut = tx.length > limit;
      const showTx = cut ? tx.slice(0, limit) : tx;
      const byDay = {}; for (const t of showTx) (byDay[t.date] = byDay[t.date] || []).push(t);
      const catOpts = (sel, kind) => state.categories.filter((c) => (kind === "income") === (c.group === "income")).concat(kind === "income" ? [] : [OTHER]).map((c) => '<option value="' + c.id + '"' + (c.id === sel ? " selected" : "") + ">" + esc(c.name) + "</option>").join("");

      return '<div class="page">' + exampleNote() +
        head("Transactions", "Everything coming in and going out. Change a category right in the list and the app learns.",
          '<button class="btn ghost" data-act="toggleImport">' + icon("upload") + ' Import from bank</button><button class="btn ghost" data-act="scanReceipt">' + icon("camera") + ' Scan a receipt</button><button class="btn" data-act="addTx">' + icon("plus") + " Add</button>") +
        '<div class="card" id="importBox"' + (pendingImport ? "" : " hidden") + ">" + importBox() + "</div>" + sixMonthChart(ym) +
        '<div class="card"><div class="row between" style="margin-bottom:12px"><div class="row" style="gap:10px">' + (all ? '<b class="all-time-label">📚 All time</b>' : monthNav()) +
          '<div class="seg seg-sm" role="group" aria-label="Show"><button class="' + (all ? "" : "on") + '" data-act="txScope" data-v="month">This month</button><button class="' + (all ? "on" : "") + '" data-act="txScope" data-v="all">All time</button></div></div>' +
        '<div class="row"><input type="search" placeholder="Search" data-change="txSearch" value="' + esc(state.ui.q) + '" style="width:170px" aria-label="Search transactions">' +
        '<select data-change="txCat" style="width:auto" aria-label="Filter by category"><option value="all">All categories</option>' + state.categories.concat([OTHER]).map((c) => '<option value="' + c.id + '"' + (cf === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>").join("") + "</select></div></div>" +
        '<div class="row small muted" style="margin-bottom:6px;gap:16px"><span>In: <b class="good">' + money2(shownIn) + '</b></span><span>Out: <b>' + money2(shownOut) + "</b></span><span>" + total + (all ? " in total" : " shown") + "</span>" +
          '<span class="row" style="margin-left:auto;gap:8px">' + (tx.some((t) => t.cat === "other" && t.kind === "expense") || state.transactions.some((t) => !t.example && t.cat === "other") ? '<button class="btn soft sm" data-act="sortOther">✨ Sort my Other</button>' : "") +
          '<button class="btn ' + (selMode ? "" : "ghost ") + 'sm" data-act="selToggle">' + (selMode ? "Done selecting" : "☑️ Select") + "</button></span></div>" +
        (selMode ? selectBar(tx) : "") +
        ((window.__lastMonthHead = ""), tx.length ? Object.entries(byDay).map(([d, list]) =>
          (all && (d.slice(0, 7) !== (window.__lastMonthHead || "")) ? (window.__lastMonthHead = d.slice(0, 7), '<h3 class="month-head">' + esc(monthLabel(d.slice(0, 7))) + "</h3>") : "") +
          '<div class="label" style="margin-top:12px">' + parseISO(d).toLocaleDateString(C.locale, all ? { weekday: "short", month: "short", day: "numeric", year: "numeric" } : { weekday: "short", month: "short", day: "numeric" }) + '</div><div class="list">' +
          list.map((t) => { const c = catById(t.cat); return '<div class="item tx-item' + (selMode && selIds.has(t.id) ? " picked" : "") + '">' + (selMode ? '<input type="checkbox" class="tx-pick" data-change="txPick" data-id="' + t.id + '"' + (selIds.has(t.id) ? " checked" : "") + ' aria-label="Select ' + esc(t.desc) + '">' : "") + bubble(c.icon, c.color) +
            '<div class="grow"><div class="t">' + esc(t.desc) + exTag(t) + '</div><div class="tiny muted">' + esc(c.name) + "</div></div>" +
            '<select data-change="txCatInline" data-id="' + t.id + '" aria-label="Category">' + catOptions(t.cat) + "</select>" +
            '<span class="amt ' + (t.kind === "income" ? "good" : "") + '">' + (t.kind === "income" ? "+" : "-") + money2(t.amount) + "</span>" +
            '<button class="iconbtn" data-act="editTx" data-id="' + t.id + '" title="Edit">' + icon("pencil") + '</button><button class="iconbtn del" data-act="delTx" data-id="' + t.id + '" title="Delete">' + icon("trash-2") + "</button></div>"; }).join("") + "</div>").join("")
          : '<div class="empty">' + icon("receipt") + "<p>" + (q || cf !== "all" ? "Nothing matches that " + (all ? "in all your transactions" : "in " + monthLabel(ym) + (all ? "" : '. <button class="linklike" data-act="txScope" data-v="all">Search all time</button>')) : "Nothing here for " + monthLabel(ym) + ". Add one, or import a file from your bank.") + "</p></div>") +
        (cut ? '<div class="row" style="justify-content:center;margin-top:12px"><button class="btn soft" data-act="txMore">Show more (' + (total - limit) + " left)</button></div>" : "") +
        "</div>" +
        '<details class="card"><summary style="cursor:pointer"><b>' + icon("sparkles") + " Auto-sort rules</b> <span class=\"muted small\">(" + state.rules.length + " rules)</span></summary>" +
        '<p class="small muted" style="margin:10px 0">When a bank description contains these words, it goes into that category. Great for imports.</p>' +
        '<form class="row" data-form="addRule" style="margin-bottom:10px"><input name="match" placeholder="Words, e.g. TIM HORTONS" required style="flex:2 1 180px"><select name="cat" style="flex:1 1 140px">' + state.categories.map((c) => '<option value="' + c.id + '">' + esc(c.name) + "</option>").join("") + '</select><button class="btn sm">Add rule</button></form>' +
        '<div class="table-wrap"><table><tbody>' + state.rules.map((r, i) => "<tr><td><code>" + esc(r.match) + "</code></td><td>" + esc(catById(r.cat).name) + '</td><td class="r"><button class="iconbtn del" data-act="delRule" data-i="' + i + '" title="Delete rule">' + icon("x") + "</button></td></tr>").join("") + "</tbody></table></div></details>" +
        "</div>";
    }
  };
  function importBox() {
    if (pendingImport) {
      const p = pendingImport;
      return '<div class="card-head"><h2>' + icon("upload") + " Check your import</h2></div>" +
        "<p>Found <b>" + p.rows.length + "</b> transactions" + (p.dupes ? ", skipping <b>" + p.dupes + "</b> " + (p.files && p.files.length > 1 ? "that are already in Penny or show up in more than one file" : "you already have") : "") + ". Untick anything that isn't right" + (p.src !== "csv" ? ", and tap an amount to switch it between money in and money out" : "") + ".</p>" +
        (p.src === "ai" || p.src === "ocr" ? '<div class="callout gold small">' + icon("info") + "<div>Penny read these from a picture, so please double check the dates and amounts.</div></div>" : p.src === "pdf" ? '<div class="callout small">' + icon("info") + "<div>Read from your PDF statement. Quick check before importing!</div></div>" : "") +
        (p.files && p.files.length > 1 ? '<p class="small">From <b>' + p.files.length + " files</b>: " + p.files.map(esc).join(", ") + "</p>" : "") +
        (p.errors && p.errors.length ? '<div class="callout red small">' + icon("triangle-alert") + "<div><b>Couldn't read " + p.errors.length + (p.errors.length === 1 ? " file" : " files") + ":</b> " + p.errors.map((x) => esc(x.name) + " (" + esc(x.msg) + ")").join("; ") + "</div></div>" : "") +
        '<div class="table-wrap import-table" style="margin:12px 0"><table><thead><tr><th></th><th>Date</th><th>Description</th><th>Category</th>' + (p.files && p.files.length > 1 ? "<th>From</th>" : "") + '<th class="r">Amount</th></tr></thead><tbody>' +
        (p.rows.some((t, i) => (p.skip || {})[i] && CARD_PAYMENT.test(t.desc)) ? '<p class="tiny muted">💳 Credit card payments start unticked: paying off your card isn\'t new money, it\'s already counted when you spent it.</p>' : "") +
        p.rows.map((t, i) => '<tr class="' + ((p.skip || {})[i] ? "skipped" : "") + '"><td><input type="checkbox" data-change="importSkip" data-i="' + i + '"' + ((p.skip || {})[i] ? "" : " checked") + ' aria-label="Include this one"></td><td>' + t.date + "</td><td>" + esc(t.desc) + "</td><td><select class=\"import-cat\" data-change=\"importCat\" data-i=\"" + i + "\" aria-label=\"Category\">" + catOptions(t.cat) + "</select></td>" + (p.files && p.files.length > 1 ? '<td class="tiny muted">' + esc(p.files[t.file] || "") + "</td>" : "") + '<td class="r"><button type="button" class="amt-flip ' + (t.kind === "income" ? "good" : "") + '" data-act="flipRow" data-i="' + i + '" title="Tap to switch money in / money out">' + (t.kind === "income" ? "+" : "-") + money2(t.amount) + "</button></td></tr>").join("") +
        "</tbody></table></div>" +
        balanceSection(p) +
        '<div class="callout">' + icon("info") + "<div>Spending should show as minus and paycheques as plus. If it's backwards (common with credit card files), press Flip.</div></div>" +
        '<div class="row" style="margin-top:12px"><button class="btn" data-act="doImport">' + icon("check") + " Import " + (p.rows.length - Object.values(p.skip || {}).filter(Boolean).length) + '</button>' + (p.files && p.files.length > 1 ? p.files.map((n, i) => '<button class="btn ghost sm" data-act="flipImport" data-file="' + i + '">' + icon("refresh-cw") + " Flip " + esc(n.length > 18 ? n.slice(0, 16) + "…" : n) + "</button>").join("") : '<button class="btn ghost" data-act="flipImport">' + icon("refresh-cw") + " Flip plus/minus</button>") + '<button class="btn ghost" data-act="cancelImport">Cancel</button></div>';
    }
    return '<div class="card-head"><h2>' + icon("upload") + " Import from your bank</h2></div>" +
      (importBusy ? '<div class="ci">' + (pennyOn() ? mascot(100, "P", "reading") : "") + "<h3>" + esc(importBusy) + '</h3><div class="dots-loading"><span></span><span></span><span></span></div><p class="small muted">Long statements can take a few seconds.</p></div>' :
      '<div class="grid g2"><div class="stack small"><p>Pick a <b>CSV</b> or <b>PDF statement</b> from online banking, or a <b>screenshot</b> of your transactions from your banking app. You check everything before it\'s saved.</p>' +
      "<ul><li><b>RBC:</b> Account, Download, choose CSV (Comma Separated Values).</li><li><b>TD:</b> Account activity, Download, choose Spreadsheet (.csv).</li><li><b>Scotiabank, BMO, CIBC:</b> Account details, Download transactions, CSV.</li><li><b>Tangerine, EQ, Wealthsimple, Simplii:</b> look for Export or Download, CSV.</li></ul>" +
      '<p class="muted">Most files from Canadian banks work. The app sorts them using your auto-sort rules.</p></div>' +
      '<label class="drop" style="cursor:pointer;display:grid;place-items:center;gap:8px">' + icon("upload") + "<b>Choose CSVs, PDFs or screenshots</b><span class=\"small\">Pick as many as you like, or drag them here</span>" +
      '<input type="file" multiple accept=".csv,text/csv,.pdf,application/pdf,image/*,.heic,.heif" data-change="importFile" hidden></label></div>');
  }

  // The transactions behind a budget card: tap to open, move any of them to another category right there
  function catBreakdown(c, ym) {
    const list = state.transactions.filter((t) => t.cat === c.id && t.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date));
    if (!list.length) return '<p class="tiny muted cat-none">No transactions here in ' + esc(monthLabel(ym)) + " yet.</p>";
    return '<details class="cat-break" data-key="cat-' + c.id + '"><summary>See ' + list.length + (list.length === 1 ? " transaction" : " transactions") + "</summary>" +
      '<div class="cat-break-list">' + list.map((t) => '<div class="cb-row"><div class="cb-main"><div class="cb-desc">' + esc(t.desc) + exTag(t) + '</div><div class="tiny muted">' + esc(dayLabel(parseISO(t.date))) + " · " + (t.kind === "income" ? '<span class="good">+' : "-") + money2(t.amount) + (t.kind === "income" ? "</span>" : "") + "</div></div>" +
        '<select data-change="txCatInline" data-id="' + t.id + '" aria-label="Move ' + esc(t.desc) + ' to another category">' + catOptions(t.cat) + "</select>" +
        '<button class="iconbtn" data-act="editTx" data-id="' + t.id + '" title="Edit">' + icon("pencil") + "</button></div>").join("") + "</div></details>";
  }

  /* PAGE: Budgets ----------------------------------------------------- */
  PAGES.budgets = {
    render() {
      const ym = state.ui.month, m = monthStats(ym), b = budgetTotals(), t = calcTax();
      const take = state.tax.income > 0 ? t.takeHomeMonth : m.income;
      const groups = [["need", "Needs", "Bills and basics you can't skip"], ["want", "Wants", "The fun stuff. This is where to trim"], ["save", "Savings", "Paying your future self"]];
      const rule = [["need", "Needs", 0.5, "#7aa6d9"], ["want", "Wants", 0.3, "#e39bbd"], ["save", "Savings", 0.2, "#5fae7c"]];
      return '<div class="page">' + exampleNote() +
        head("Budgets", "Give every dollar a job. Change any amount and it saves right away.", '<button class="btn" data-act="editCat">' + icon("plus") + " New category</button>") +
        '<div class="grid g2">' +
        (b.need + b.want + b.save <= 0 && !state.isExample ? askCard("coin", "Penny needs your numbers", "Type how much you plan to spend each month in the boxes below. Start with the big ones like rent and groceries. Guesses are perfect, you can change them anytime.") :
        '<div class="card"><div class="card-head"><h2>' + icon("calculator") + " This month</h2>" + monthNav() + "</div>" +
        '<dl class="lines"><dt>Planned for needs + wants</dt><dd>' + money(b.need + b.want) + "</dd><dt>Spent so far</dt><dd>" + money(m.spent) + "</dd><dt>Planned savings</dt><dd>" + money(b.save) + "</dd>" +
        '<dt class="tot">' + (b.need + b.want - m.spent >= 0 ? "Left to spend" : "Over budget by") + '</dt><dd class="tot ' + (b.need + b.want - m.spent >= 0 ? "good" : "bad") + '">' + money(Math.abs(b.need + b.want - m.spent)) + "</dd></dl></div>") +
        '<div class="card"><div class="card-head"><h2>' + icon("percent") + ' The 50/30/20 check</h2></div>' +
        (take > 0 ? '<p class="small muted" style="margin-bottom:12px">Based on take-home pay of about <b>' + money(take) + "</b> a month" + (state.tax.income > 0 ? " (from your Taxes page)" : "") + ".</p><div class=\"stack\">" +
          rule.map(([g, name, share, col]) => { const target = take * share, have = b[g]; return '<div><div class="row between small" style="margin-bottom:5px"><span><b style="color:' + col + '">' + name + '</b> <span class="muted">aim for ' + share * 100 + '%</span></span><span class="num">' + money(have) + ' <span class="muted">/ ' + money(target) + "</span></span></div>" + bar(have / (target || 1), g === "save") + "</div>"; }).join("") +
          "</div>" + '<p class="small muted" style="margin-top:12px">' + (b.need + b.want + b.save > take ? "Your plan is " + money(b.need + b.want + b.save - take) + " more than you bring home. No worries, trimming one want category usually fixes it." : money(take - b.need - b.want - b.save) + " a month has no job yet. Give it one! A goal is a great home for it 🎯") + "</p>"
          : '<p class="muted">Add your income on the <a href="#taxes">Taxes page</a> and this fills in.</p>') + "</div></div>" + efundCard(false) +
        groups.map(([g, name, sub]) => {
          const cats = state.categories.filter((c) => c.group === g);
          return '<div><div class="row between" style="margin:6px 0 10px"><div><h2>' + name + '</h2><p class="small muted">' + sub + '</p></div><div class="row" style="gap:8px"><span class="pill ' + g + '">' + money(b[g]) + ' / month</span><button class="btn soft sm" data-act="editCat" data-group="' + g + '">' + icon("plus") + " Add to " + name + "</button></div></div>" +
            '<div class="grid g3">' + cats.map((c) => {
              const sp = m.byCat[c.id] || 0, p = c.budget ? sp / c.budget : sp ? 1.01 : 0, left = c.budget - sp;
              return '<div class="card stack" style="gap:10px"><div class="row" style="flex-wrap:nowrap">' + bubble(c.icon, c.color) + '<div style="flex:1;min-width:0"><b>' + esc(c.name) + '</b><div class="small muted">' + (g === "save" ? "Moved " + money(sp) : !c.budget ? (sp ? "Spent " + money(sp) + ", no budget yet" : "No budget yet") : left >= 0 ? money(left) + " left" : '<span class="warn">' + money(-left) + " over plan. It happens!</span>") + "</div></div>" +
                '<button class="iconbtn" data-act="editCat" data-id="' + c.id + '" title="Edit category">' + icon("pencil") + "</button></div>" + bar(p, g === "save") +
                (billsFor(c.id).length ? '<div class="tiny muted bills-in">📺 Bills: ' + billsFor(c.id).map((x) => esc(x.name) + " " + money2(monthlyCost(x))).join(", ") + (billsFor(c.id).length > 1 ? " = " + money2(billsMonthly(c.id)) : "") + " a month</div>" : "") +
                '<div class="row between small"><span class="muted">Spent ' + money(sp) + "</span>" + '<label class="row" style="gap:6px"><span class="muted">Budget</span><span class="money-in" style="width:100px"><input type="number" min="0" step="1" value="' + (+c.budget || "") + '" placeholder="0" data-change="catBudget" data-id="' + c.id + '" aria-label="Monthly budget for ' + esc(c.name) + '"></span></label></div>' + catBreakdown(c, ym) + "</div>";
            }).join("") + "</div></div>";
        }).join("") +
        '<div class="card"><div class="card-head"><h2>💡 Tips for you</h2>' + (pennyOn() ? mascot(64, "P", "thinking") : "") + '</div><div class="tip-list">' + smartTips().map(([cls, ic, html]) => '<div class="callout ' + cls + '">' + icon(ic) + "<div>" + html + "</div></div>").join("") + "</div></div>" +
        '<div class="card"><div class="card-head"><h3>' + icon("briefcase") + ' Income categories</h3></div><div class="row">' + state.categories.filter((c) => c.group === "income").map((c) => '<button class="btn soft sm" data-act="editCat" data-id="' + c.id + '">' + icon(c.icon) + esc(c.name) + "</button>").join("") + "</div></div>" +
        "</div>";
    }
  };

  /* PAGE: Bills & subscriptions -------------------------------------- */
  const SUB_STATUS = { keep: ["Keep", ""], thinking: ["Thinking of cancelling", "pill want"], negotiate: ["Try to lower it", "pill need"], cancelled: ["Cancelled", "pill good"] };
  PAGES.bills = {
    render() {
      const active = state.subs.filter((s) => s.status !== "cancelled"), cancelled = state.subs.filter((s) => s.status === "cancelled");
      const mo = active.reduce((a, s) => a + monthlyCost(s), 0), savedYr = cancelled.reduce((a, s) => a + monthlyCost(s), 0) * 12;
      const found = detectSubs();
      const list = state.subs.slice().sort((a, b) => (a.status === "cancelled") - (b.status === "cancelled") || nextCharge(a) - nextCharge(b));
      return '<div class="page">' + exampleNote() +
        head("Bills & subscriptions", "Every repeating charge in one place. Find the ones you forgot about and cut them.", '<button class="btn" data-act="editSub">' + icon("plus") + " Add a bill</button>") +
        '<div class="grid g4">' + stat("repeat", "#9d94ea", "Per month", money(mo), active.length + " active") + stat("calendar", "#7aa6d9", "Per year", money(mo * 12), "if nothing changes") +
        stat("scissors", "#5fae7c", "Saved by cancelling", money(savedYr), "per year") + stat("clock", "#e3b45f", "Next charge", active.length ? dayLabel(active.map(nextCharge).sort((a, b) => a - b)[0]) : "None", "") + "</div>" +
        (found.length ? '<div class="card"><div class="card-head"><h2>' + icon("search") + ' Found in your transactions</h2><span class="small muted">These repeat every month</span></div><div class="list">' +
          found.map((f, i) => '<div class="item">' + bubble("repeat", "#9d94ea") + '<div class="grow"><div class="t">' + esc(f.name) + '</div><div class="tiny muted">About ' + money2(f.amount) + " a month · " + esc(f.why) + '</div></div><button class="btn soft sm" data-act="addFound" data-i="' + i + '">' + icon("plus") + " Track it</button></div>").join("") + "</div></div>" : "") +
        '<div class="card"><div class="card-head"><h2>' + icon("list-checks") + " Your bills</h2></div>" +
        (list.length ? '<div class="list">' + list.map((s) => {
          const d = nextCharge(s), days = daysBetween(today(), d), st = SUB_STATUS[s.status] || SUB_STATUS.keep;
          return '<div class="item"' + (s.status === "cancelled" ? ' style="opacity:.6"' : "") + ">" + bubble(s.icon || "repeat", s.status === "cancelled" ? "#a3abbd" : "#9d94ea") +
            '<div class="grow"><div class="t">' + esc(s.name) + exTag(s) + '</div><div class="tiny muted">' + (s.status === "cancelled" ? "Cancelled. Saving " + money(monthlyCost(s) * 12) + " a year" : (paidThisCycle(s) ? '<span class="good">✅ Paid ' + esc(dayLabel(parseISO(s.lastPaid))) + "</span> · next " + dayLabel(d) : (CYCLES[s.cycle] || CYCLES.monthly)[0] + " · next " + dayLabel(d) + (days <= 7 ? " (" + (days === 0 ? "today" : "in " + days + " days") + ")" : "")) + (s.priceWas ? ' · <span class="warn">was ' + money2(s.priceWas) + "</span>" : "")) + "</div></div>" +
            '<span class="amt">' + money2(s.amount) + "</span>" +
            '<select data-change="subStatus" data-id="' + s.id + '" aria-label="Status">' + Object.entries(SUB_STATUS).map(([k, v]) => '<option value="' + k + '"' + (s.status === k ? " selected" : "") + ">" + v[0] + "</option>").join("") + "</select>" +
            '<button class="iconbtn" data-act="editSub" data-id="' + s.id + '" title="Edit">' + icon("pencil") + '</button><button class="iconbtn del" data-act="delSub" data-id="' + s.id + '" title="Delete">' + icon("trash-2") + "</button></div>";
        }).join("") + "</div>" : '<div class="empty">' + icon("repeat") + "<p>Add Netflix, your phone plan, the gym, anything that charges you again and again.</p></div>") + "</div>" +
        '<div class="grid g2"><div class="card"><div class="card-head"><h2>' + icon("scissors") + " How to cancel almost anything</h2></div><ol class=\"stack small\" style=\"padding-left:1.2em\">" + C.cancelSteps.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ol></div>" +
        '<div class="card"><div class="card-head"><h2>' + icon("message-square") + ' Lower your phone or internet bill</h2></div><p class="small muted" style="margin-bottom:10px">Rogers, Bell and Telus often have better prices for people who ask. Call, read this, and be ready to actually switch.</p>' +
        '<textarea id="negScript" rows="9" readonly>' + esc(C.negotiateScript) + '</textarea><div class="row" style="margin-top:10px"><button class="btn soft" data-act="copy" data-target="#negScript">' + icon("copy") + " Copy script</button></div></div></div>" +
        "</div>";
    }
  };

  /* PAGE: Goals ------------------------------------------------------- */
  PAGES.goals = {
    render() {
      const tot = state.goals.reduce((a, g) => a + num(g.saved), 0), target = state.goals.reduce((a, g) => a + num(g.target), 0);
      return '<div class="page">' + exampleNote() +
        head("Savings goals", "Trips, a first home, a safety net. Give each goal a home account and watch it fill up.", '<button class="btn" data-act="editGoal">' + icon("plus") + " New goal</button>") +
        (state.goals.length ? '<div class="card row" style="gap:18px">' + ring(target ? tot / target : 0, "var(--accent)", 84) + '<div><div class="label">All goals</div><div class="big-number">' + money(tot) + '</div><div class="muted small">saved of ' + money(target) + "</div></div></div>" : "") +
        '<div class="grid g3">' + state.goals.map(goalCard).join("") +
        '<button class="card empty" data-act="editGoal" style="cursor:pointer;border-style:dashed;font:inherit;color:var(--muted);min-height:240px">' + icon("plus") + "<b>Add a goal</b><span class=\"small\">Travel, home, car, wedding, anything</span></button></div>" +
        '<div class="card"><div class="card-head"><h2>' + icon("lightbulb") + ' Where should each goal live?</h2></div><div class="grid g3 small">' +
        '<div class="callout">' + icon("key-round") + "<div><b>First home: FHSA.</b> Cuts your taxes going in and is tax-free coming out. $8,000 a year, $40,000 total.</div></div>" +
        '<div class="callout">' + icon("plane") + "<div><b>Trips and big buys under 5 years: TFSA or HISA.</b> Keep it in cash or GICs so it's there when you need it.</div></div>" +
        '<div class="callout">' + icon("umbrella") + "<div><b>Emergency fund: HISA or TFSA savings.</b> Safe, and you can get it the same day.</div></div></div></div>" +
        "</div>";
    }
  };
  function goalCard(g) {
    const th = C.goalThemes[g.theme % C.goalThemes.length], p = g.target ? g.saved / g.target : 0;
    let plan = "";
    if (g.date) {
      const months = Math.max(1, (parseISO(g.date).getFullYear() - today().getFullYear()) * 12 + parseISO(g.date).getMonth() - today().getMonth());
      const need = Math.max(0, g.target - g.saved);
      plan = need <= 0 ? "Goal reached!" : "Save <b>" + money(need / months) + "/month</b> to hit it by " + parseISO(g.date).toLocaleDateString(C.locale, { month: "short", year: "numeric" });
    }
    const coverBg = g.photo ? "background-image:linear-gradient(rgba(0,0,0,.05),rgba(0,0,0,.35)),url(" + g.photo + ")" : "background:radial-gradient(circle at 80% 20%,rgba(255,255,255,.25) 0 18%,transparent 19%),radial-gradient(circle at 12% 90%,rgba(255,255,255,.14) 0 22%,transparent 23%),linear-gradient(135deg," + th[0] + "," + th[1] + ")";
    return '<div class="card goal"><div class="cover" style="' + coverBg + '">' + (g.photo ? "" : icon(g.icon)) + '<span class="acct">' + esc(g.account) + "</span>" +
      '<label class="photo-btn" title="Add a photo">' + icon("camera") + '<input type="file" accept="image/*" hidden data-change="goalPhoto" data-id="' + g.id + '"></label></div>' +
      '<div class="body"><div class="row between" style="flex-wrap:nowrap"><b style="font-size:1.05rem">' + esc(g.name) + exTag(g) + '</b><button class="iconbtn" data-act="editGoal" data-id="' + g.id + '" title="Edit goal">' + icon("pencil") + "</button></div>" +
      '<div class="row between small"><span><b class="num" style="font-size:1.15rem">' + money(g.saved) + '</b> <span class="muted">of ' + money(g.target) + "</span></span><b>" + pct(Math.min(p, 9.99), 0) + "</b></div>" + bar(p, true) +
      (plan ? '<p class="small muted">' + plan + "</p>" : "") +
      '<div class="row" style="margin-top:auto"><button class="btn sm" data-act="goalMoney" data-id="' + g.id + '">' + icon("plus") + ' Add money</button><button class="btn ghost sm" data-act="goalMoney" data-id="' + g.id + '" data-out="1">Take out</button></div></div></div>';
  }

  /* PAGE: Net worth ---------------------------------------------------- */
  const BANDS = [[560, "Poor", "var(--bad)"], [660, "Fair", "var(--warn)"], [725, "Good", "#7aa6d9"], [760, "Very good", "var(--good)"], [901, "Excellent", "var(--good)"]];
  const band = (s) => BANDS.find((b) => s < b[0]) || BANDS[4];
  PAGES.networth = {
    render() {
      const assets = state.accounts.filter((a) => acctType(a.type).kind === "asset"), debts = state.accounts.filter((a) => acctType(a.type).kind === "debt");
      const A = assets.reduce((a, x) => a + num(x.balance), 0), D = debts.reduce((a, x) => a + num(x.balance), 0);
      const hist = state.netHistory.slice().sort((a, b) => a.ym.localeCompare(b.ym));
      const latest = state.credit.slice().sort((a, b) => b.date.localeCompare(a.date));
      const sc = latest[0] ? latest[0].score : null;
      const group = (title, list, kind) => '<div class="card"><div class="card-head"><h2>' + title + '</h2><b class="' + (kind === "debt" ? "bad" : "good") + '">' + money(list.reduce((a, x) => a + num(x.balance), 0)) + '</b></div><div class="list">' +
        (list.length ? list.map((a) => { const t = acctType(a.type); return '<div class="item">' + bubble(t.icon, kind === "debt" ? "#d98383" : "#5fae7c") + '<div class="grow"><div class="t">' + esc(a.name) + exTag(a) + '</div><div class="tiny muted">' + esc(t.name) + (a.asOf && !(a.manualOn && a.manualOn > a.asOf) ? " · from your statement, " + esc(dayLabel(parseISO(a.asOf))) : a.updated && !a.example ? " · you updated it " + esc(dayLabel(parseISO(a.manualOn || a.updated))) : "") + "</div></div>" +
          '<span class="money-in" style="width:130px"><input type="number" step="any" value="' + num(a.balance) + '" data-change="acctBal" data-id="' + a.id + '" aria-label="Balance of ' + esc(a.name) + '"></span>' +
          '<button class="iconbtn" data-act="editAcct" data-id="' + a.id + '" title="Edit">' + icon("pencil") + '</button><button class="iconbtn del" data-act="delAcct" data-id="' + a.id + '" title="Delete">' + icon("trash-2") + "</button></div>"; }).join("")
          : '<p class="small muted">' + (kind === "debt" ? "Credit cards, OSAP, car loans, mortgage." : "Chequing, savings, TFSA, RRSP, FHSA.") + "</p>") + "</div></div>";
      return '<div class="page">' + exampleNote() +
        head("Net worth", "What you own minus what you owe. Update the balances once a month and watch the line go up.", '<button class="btn" data-act="editAcct">' + icon("plus") + " Add account</button>") +
        '<div class="grid g2"><div class="card"><div class="label">Your net worth</div><div class="big-number ' + (A - D >= 0 ? "" : "bad") + '">' + money(A - D) + "</div>" +
        '<div class="row small muted" style="gap:16px;margin:4px 0 12px"><span>Own <b class="good">' + money(A) + "</b></span><span>Owe <b class=\"bad\">" + money(D) + "</b></span></div>" +
        (hist.length > 1 ? lineChart(hist.map((h) => monthLabel(h.ym, { month: "short" })), [{ ys: hist.map((h) => h.net), color: "var(--accent)", area: true }], { h: 200 }) : '<p class="small muted">Your chart starts after your first update. A new point is saved each month.</p>') + "</div>" +
        '<div class="card"><div class="card-head"><h2>' + icon("credit-card") + " Credit score</h2></div>" +
        (sc ? '<div class="row" style="gap:18px">' + gauge(sc) + '<div><div class="big-number">' + sc + '</div><span class="pill" style="color:' + band(sc)[2] + '">' + band(sc)[1] + '</span><p class="small muted" style="margin-top:6px">' + (latest[1] ? (sc - latest[1].score >= 0 ? "Up " : "Down ") + Math.abs(sc - latest[1].score) + " since " + parseISO(latest[1].date).toLocaleDateString(C.locale, { month: "short", year: "numeric" }) : "Your first entry") + "</p></div></div>"
          : '<p class="small muted">Many Canadian bank apps show your score for free. Write it down here every few months.</p>') +
        '<form class="row" data-form="addScore" style="margin-top:14px"><input type="number" name="score" min="300" max="900" placeholder="Score (300 to 900)" required style="flex:1 1 140px"><input type="date" name="date" value="' + todayISO() + '" style="flex:1 1 140px"><button class="btn sm">Save score</button></form>' +
        '<p class="small muted" style="margin-top:10px">Pay on time, keep card balances under 30% of the limit, and keep old cards open. <a href="#learn">Learn more</a></p></div></div>' +
        '<div class="grid g2">' + group("What you own", assets, "asset") + group("What you owe", debts, "debt") + "</div></div>";
    }
  };
  function gauge(score) {
    const w = 150, r = 60, cx = 75, cy = 72, p = clamp((score - 300) / 600, 0, 1);
    const pt = (q) => [cx - r * Math.cos(Math.PI * q), cy - r * Math.sin(Math.PI * q)];
    const [x1, y1] = pt(0), [x2, y2] = pt(1), [xp, yp] = pt(p);
    return '<svg width="' + w + '" height="100" viewBox="0 0 150 100" aria-hidden="true"><path d="M' + x1 + " " + y1 + " A" + r + " " + r + " 0 0 1 " + x2 + " " + y2 + '" fill="none" style="stroke:var(--surface-2)" stroke-width="12" stroke-linecap="round"></path>' +
      '<path d="M' + x1 + " " + y1 + " A" + r + " " + r + " 0 0 1 " + xp.toFixed(1) + " " + yp.toFixed(1) + '" fill="none" style="stroke:' + band(score)[2] + '" stroke-width="12" stroke-linecap="round"></path>' +
      '<text x="15" y="96" text-anchor="middle">300</text><text x="135" y="96" text-anchor="middle">900</text></svg>';
  }

  /* PAGE: Taxes --------------------------------------------------------- */
  PAGES.taxes = {
    render() {
      const T = state.tax;
      return '<div class="page">' + exampleNote() +
        head("Taxes (Ontario " + C.tax.year + ")", "See your refund before you file, and how much the RRSP and FHSA save you. Change any box and it updates.") +
        '<div class="grid g2"><div class="card stack"><h2>' + icon("briefcase") + " Your income</h2>" +
        '<div class="fgrid">' +
        field("Salary or wages / year", moneyInput(bind("tax.income")), "Before tax, from your offer letter or T4") +
        field("Other income / year", moneyInput(bind("tax.otherIncome")), "Interest, side hustle profit") +
        field("How often you're paid", '<select data-bind="tax.payFrequency">' + Object.entries(PERIOD_NAMES).map(([k, v]) => '<option value="' + k + '"' + (T.payFrequency === k ? " selected" : "") + ">" + v + "</option>").join("") + "</select>") +
        field("Income tax taken per paycheque", moneyInput(bind("tax.withheldPerPay")), "On your pay stub: \"Income Tax\" or \"Fed + Prov tax\"") +
        "</div><h3>" + icon("piggy-bank") + " Money that lowers your tax</h3><div class=\"fgrid\">" +
        field("RRSP contributions this year", moneyInput(bind("tax.rrsp")), "Include any through work") +
        field("FHSA contributions this year", moneyInput(bind("tax.fhsa")), "Max " + money(C.limits.fhsaYear) + " a year") +
        field("Union or professional dues", moneyInput(bind("tax.unionDues"))) +
        field("Child care costs", moneyInput(bind("tax.childcare"))) +
        "</div><h3>" + icon("house") + " For benefits</h3><div class=\"fgrid\">" +
        field("Rent paid this year", moneyInput(bind("tax.rentPaid")), "Helps with the Ontario Trillium Benefit") + "</div>" +
        '<p class="tiny muted">This is an estimate for employees in Ontario. It skips self-employment, capital gains, medical and donation credits, and some benefits. Use real tax software (many are free) to file.</p></div>' +
        '<div class="stack" id="results"></div></div></div>';
    },
    after() { this.update(); },
    update() {
      const el = $("#results"); if (!el) return;
      const T = state.tax, t = calcTax(T), owe = t.refund < 0, has = T.income > 0 || T.otherIncome > 0;
      if (!has) { el.innerHTML = '<div class="card empty">' + icon("landmark") + "<h3>Start with your salary</h3><p>Type your yearly income on the left and this fills in.</p></div>"; return; }
      el.innerHTML =
        '<div class="card"><div class="label">' + (T.withheldPerPay ? (owe ? "You might owe in April" : "Your estimated refund") : "Your total income tax") + "</div>" +
        '<div class="big-number ' + (T.withheldPerPay ? (owe ? "bad" : "good") : "") + '">' + money(T.withheldPerPay ? Math.abs(t.refund) : t.total) + "</div>" +
        (T.withheldPerPay ? '<p class="small muted">' + money(T.withheldPerPay) + " × " + t.periods + " paycheques = " + money(t.withheld) + " already paid, vs. " + money(t.total) + " owed.</p>" : '<p class="small muted">Add the tax taken from each paycheque to see your refund.</p>') +
        '<div class="grid g3" style="margin-top:14px">' +
        '<div><div class="label">Next dollar taxed</div><div class="v" style="font:600 1.3rem var(--font-display)">' + pct(t.marginal) + '</div><div class="tiny muted">your top rate</div></div>' +
        '<div><div class="label">Average rate</div><div class="v" style="font:600 1.3rem var(--font-display)">' + pct(t.avg) + '</div><div class="tiny muted">of all income</div></div>' +
        '<div><div class="label">RRSP/FHSA saved you</div><div class="v good" style="font:600 1.3rem var(--font-display)">' + money(t.saved) + '</div><div class="tiny muted">this year</div></div></div></div>' +
        '<div class="callout gold">' + icon("sparkles") + "<div><b>The RRSP trick:</b> every extra $1,000 into your RRSP or FHSA gets you about <b>" + money(t.per1k) + "</b> back. That's a " + pct(t.per1k / 1000, 0) + " instant return.</div></div>" +
        '<div class="card"><h3 style="margin-bottom:10px">Where your pay goes</h3><dl class="lines">' +
        "<dt>Income</dt><dd>" + money(t.gross) + "</dd><dt>Federal tax</dt><dd>-" + money(t.fed) + "</dd><dt>Ontario tax</dt><dd>-" + money(t.on) + "</dd>" +
        "<dt>Ontario Health Premium</dt><dd>-" + money(t.ohp) + "</dd><dt>CPP (your pension)</dt><dd>-" + money(t.cpp) + "</dd><dt>EI (job loss insurance)</dt><dd>-" + money(t.ei) + "</dd>" +
        (T.unionDues ? "<dt>Union dues</dt><dd>-" + money(T.unionDues) + "</dd>" : "") +
        '<dt class="tot">Take-home pay</dt><dd class="tot">' + money(t.takeHome) + "</dd><dt>Per month</dt><dd>" + money(t.takeHomeMonth) + "</dd><dt>Per paycheque</dt><dd>" + money(t.takeHomePay) + "</dd></dl></div>" +
        '<div class="card"><h3 style="margin-bottom:10px">' + icon("lightbulb") + " Your moves</h3><div class=\"tip-list small\">" +
        '<div class="callout">' + icon("sunset") + "<div>Your <b>RRSP room for next year</b> grows by about " + money(t.rrspRoomNext) + ". Check your exact room on your Notice of Assessment or CRA My Account.</div></div>" +
        (T.fhsa < C.limits.fhsaYear ? '<div class="callout">' + icon("key-round") + "<div>You have " + money(C.limits.fhsaYear - T.fhsa) + " of FHSA room left this year. Filling it would save about " + money((C.limits.fhsaYear - T.fhsa) * t.per1k / 1000) + ". Deadline is <b>December 31</b>.</div></div>" : "") +
        (t.refund > 1500 ? '<div class="callout gold">' + icon("hand-coins") + "<div>A big refund means too much tax comes off each cheque. Form <b>T1213</b> lets you lower it, especially if you make regular RRSP contributions.</div></div>" : "") +
        (owe ? '<div class="callout red">' + icon("triangle-alert") + "<div>To avoid owing, put about <b>" + money(-t.refund / Math.max(0.2, t.marginal)) + "</b> into your RRSP before the deadline (early March), or ask HR to take more tax off.</div></div>" : "") +
        '<div class="callout">' + icon("hand-coins") + "<div><b>File by April 30</b> to get the GST/HST credit" + (T.rentPaid ? " and the Ontario Trillium Benefit (enter the " + money(T.rentPaid) + " of rent you paid)" : "") + ". " + (t.gross < 33000 ? "With your income, check the <b>Canada Workers Benefit</b> too." : "") + "</div></div>" +
        "</div></div>";
    }
  };

  /* PAGE: Retirement ---------------------------------------------------- */
  PAGES.retirement = {
    render() {
      const R = state.retire;
      return '<div class="page">' + exampleNote() +
        head("Retirement calculator", "If I put money in my RRSP or TFSA now, how much will I have when I retire? Play with the numbers.") +
        '<div class="grid g2" style="align-items:start"><div class="card stack"><h2>' + icon("calculator") + " Your plan</h2>" +
        '<div class="seg" role="group" aria-label="Account">' + ["RRSP", "TFSA"].map((a) => '<button data-act="retireAcct" data-v="' + a + '" class="' + (R.account === a ? "on" : "") + '">' + a + "</button>").join("") + "</div>" +
        '<div class="fgrid">' +
        field("Your age now", '<input type="number" min="15" max="80" data-flag="retire" ' + bind("retire.age", "e.g. 30") + ">") +
        field("Retire at", '<input type="number" min="40" max="80" data-flag="retire" ' + bind("retire.retireAge", "e.g. 65") + ">") +
        field("Already saved", moneyInput('data-flag="retire" ' + bind("retire.balance"))) +
        field("One-time deposit now", moneyInput('data-flag="retire" ' + bind("retire.lump")), "Try: what if I put $5,000 in today?") +
        field("Add every month", moneyInput('data-flag="retire" ' + bind("retire.monthly"))) +
        field("Yearly growth %", '<input type="number" step="0.5" min="0" max="15" data-flag="retire" ' + bind("retire.rate") + ">") +
        "</div>" +
        '<div><div class="label" style="margin-bottom:6px">Quick pick for growth</div><div class="seg">' + C.retirement.returnPresets.map((p) => '<button data-act="retireRate" data-v="' + p.rate + '" class="' + (num(R.rate) === p.rate ? "on" : "") + '" title="' + esc(p.note) + '">' + esc(p.name) + " " + p.rate + "%</button>").join("") + "</div></div>" +
        '<details><summary class="small" style="cursor:pointer">More settings</summary><div class="fgrid" style="margin-top:10px">' +
        field("Inflation %", '<input type="number" step="0.1" ' + bind("retire.inflation") + ">", "Prices rise about 2 to 3% a year") +
        field("Your CPP / month", moneyInput(bind("retire.cpp")), "Average is about $900, max about $1,500") +
        '<label class="check"><input type="checkbox" data-bind="retire.includeGov"' + (R.includeGov ? " checked" : "") + "> Include CPP and OAS</label></div></details>" +
        '<p class="tiny muted">Growth isn\'t guaranteed. Markets go up and down. These are planning numbers, not a promise.</p></div>' +
        '<div class="stack" id="results"></div></div></div>';
    },
    after() { this.update(); },
    update() {
      const el = $("#results"); if (!el) return;
      const R = state.retire;
      if (!(num(R.age) > 0 && num(R.retireAge) > num(R.age))) {
        el.innerHTML = askCard("retire", "Tell Penny about your plan", "Type <b>your age now</b> and <b>the age you'd like to retire</b>. Then add what you've already saved and what you could put in each month, and Penny shows how it grows.");
        return;
      }
      const p = project(R), isR = R.account === "RRSP", RC = C.retirement;
      const tax = isR ? RC.retirementTaxRate / 100 : 0;
      const fromSavings = p.real * RC.withdrawRate / 100 / 12 * (1 - tax);
      const gov = R.includeGov ? num(R.cpp) + (num(R.retireAge) >= 65 ? RC.oasMonthly : 0) : 0;
      const ms = [35, 45, 55, 65].filter((a) => a > num(R.age) && a <= num(R.retireAge)).map((a) => p.pts.find((x) => x.age === a)).filter(Boolean);
      const rrspAfter = p.real * (1 - RC.retirementTaxRate / 100) + p.refundsReal, tfsaAfter = p.real;
      el.innerHTML =
        '<div class="card"><div class="label">At ' + num(R.retireAge) + " in your " + esc(R.account) + "</div>" +
        '<div class="big-number">' + money(p.final) + '</div><p class="small muted">That\'s like <b>' + money(p.real) + "</b> in today's money, after " + p.years + " years of prices rising.</p>" +
        '<div class="track" style="margin:14px 0 6px;height:14px;display:flex"><i style="width:' + (p.final ? (p.put / p.final) * 100 : 0) + '%;background:var(--accent);border-radius:99px 0 0 99px"></i><i style="flex:1;background:var(--gold);border-radius:0 99px 99px 0"></i></div>' +
        '<div class="row between small"><span><span class="dot" style="display:inline-block;width:9px;height:9px;border-radius:3px;background:var(--accent)"></span> You put in <b>' + money(p.put) + '</b></span><span><span class="dot" style="display:inline-block;width:9px;height:9px;border-radius:3px;background:var(--gold)"></span> Growth <b>' + money(p.growth) + "</b></span></div></div>" +
        (num(R.lump) > 0 ? '<div class="callout gold">' + icon("sparkles") + "<div>Just the <b>" + money(R.lump) + "</b> you put in today could grow to <b>" + money(p.lumpOnly) + "</b> by " + num(R.retireAge) + " (" + money(p.lumpReal) + " in today's money)." + (isR ? " Plus about " + money(R.lump * p.marg) + " back at tax time this year." : "") + "</div></div>" : "") +
        '<div class="card"><h3 style="margin-bottom:8px">How it grows</h3>' + lineChart(p.pts.map((x) => String(x.age)), [{ ys: p.pts.map((x) => x.bal), color: "var(--gold)", area: true }, { ys: p.pts.map((x) => x.put), color: "var(--accent)", width: 2, dash: true }], { h: 220 }) +
        '<div class="row small muted" style="gap:14px"><span style="color:var(--gold)">● Total balance</span><span style="color:var(--accent)">- - What you put in</span></div>' +
        (ms.length ? '<div class="grid g4" style="margin-top:12px">' + ms.map((x) => '<div><div class="label">At ' + x.age + '</div><b class="num">' + money(x.bal) + "</b></div>").join("") + "</div>" : "") + "</div>" +
        '<div class="card"><h3 style="margin-bottom:10px">' + icon("sun") + " Your monthly retirement income</h3><dl class=\"lines\">" +
        "<dt>From your " + esc(R.account) + " (4% rule" + (isR ? ", after about " + RC.retirementTaxRate + "% tax" : ", tax-free") + ")</dt><dd>" + money(fromSavings) + "</dd>" +
        (R.includeGov ? "<dt>CPP</dt><dd>" + money(R.cpp) + "</dd><dt>Old Age Security" + (num(R.retireAge) < 65 ? " (starts at 65)" : "") + "</dt><dd>" + (num(R.retireAge) >= 65 ? money(RC.oasMonthly) : "$0") + "</dd>" : "") +
        '<dt class="tot">Total per month</dt><dd class="tot">' + money(fromSavings + gov) + '</dd></dl><p class="tiny muted" style="margin-top:8px">In today\'s dollars. The 4% rule means taking out 4% of your savings each year so it lasts about 30 years.</p></div>' +
        '<div class="card"><h3 style="margin-bottom:10px">' + icon("scale") + " RRSP or TFSA for this?</h3><div class=\"grid g2\">" +
        '<div class="callout' + (rrspAfter > tfsaAfter ? " gold" : "") + '">' + icon("sunset") + "<div><b>RRSP:</b> about " + money(rrspAfter) + " after tax, if you invest your tax refunds of about " + money(p.yearlyRefund) + " a year.</div></div>" +
        '<div class="callout' + (tfsaAfter >= rrspAfter ? " gold" : "") + '">' + icon("piggy-bank") + "<div><b>TFSA:</b> about " + money(tfsaAfter) + ", all tax-free. Easier, and you can take money out any time.</div></div></div>" +
        '<p class="small muted" style="margin-top:10px">Your tax rate now is about ' + pct(p.marg, 0) + ". " + (p.marg >= 0.29 ? "That's high enough that the RRSP usually wins, as long as you invest the refund." : "At this rate, the TFSA is often as good or better, and more flexible.") + "</p></div>";
    }
  };

  /* PAGE: Buy a home ------------------------------------------------------ */
  PAGES.house = {
    render() {
      const H = state.house;
      return '<div class="page">' + exampleNote() +
        head("Buy a home in " + C.city, "What a first home really costs in cash, including land transfer tax. Everything updates as you type.") +
        '<div class="grid g2" style="align-items:start"><div class="card stack"><h2>' + icon("key-round") + " The home</h2>" +
        '<div class="seg">' + [["Condo", 650000], ["Townhouse", 950000], ["Semi", 1150000], ["Detached", 1450000]].map(([n, v]) => '<button data-act="housePrice" data-v="' + v + '" class="' + (num(H.price) === v ? "on" : "") + '">' + n + "</button>").join("") + "</div>" +
        '<p class="tiny muted">Quick picks are rough Toronto prices. Type your own.</p>' +
        '<div class="fgrid">' + field("Price", moneyInput('data-flag="house" ' + bind("house.price"))) +
        field("Down payment", '<select data-bind="house.down" data-flag="house">' + [["min", "The minimum"], ["10", "10%"], ["20", "20% (no insurance)"]].map(([v, n]) => '<option value="' + v + '"' + (String(H.down) === v ? " selected" : "") + ">" + n + "</option>").join("") + "</select>") +
        field("Mortgage rate %", '<input type="number" step="0.05" data-flag="house" ' + bind("house.rate") + ">") +
        field("Years to pay it off", '<select data-bind="house.amort" data-flag="house">' + [25, 30].map((y) => '<option value="' + y + '"' + (num(H.amort) === y ? " selected" : "") + ">" + y + " years</option>").join("") + "</select>", "30 years is allowed for first-time buyers") +
        field("Property tax, heat, condo fees / month", moneyInput(bind("house.monthlyCosts"))) + "</div>" +
        '<label class="check"><input type="checkbox" data-bind="house.firstTime"' + (H.firstTime ? " checked" : "") + "> First-time buyer</label>" +
        '<label class="check"><input type="checkbox" data-bind="house.toronto"' + (H.toronto ? " checked" : "") + "> Inside the City of Toronto (adds the Toronto land transfer tax)</label>" +
        "<h3>" + icon("piggy-bank") + " Your savings</h3><div class=\"fgrid\">" + field("Saved so far", moneyInput(bind("house.saved"))) + field("Saving each month", moneyInput(bind("house.monthlySave"))) + "</div></div>" +
        '<div class="stack" id="results"></div></div></div>';
    },
    after() { this.update(); },
    update() {
      const el = $("#results"); if (!el) return;
      const H = state.house;
      if (!(num(H.price) > 0)) {
        el.innerHTML = askCard("home", "What kind of home are you dreaming of?", "Type a <b>price</b>, or tap Condo, Townhouse, Semi or Detached for a rough Toronto price. Then add what you've saved and what you save each month, and Penny works out the cash you need and when you'll get there.");
        return;
      }
      const r = houseCalc(H), L = C.limits;
      const when = r.months === 0 ? "You have enough right now!" : r.months === Infinity ? "Add a monthly savings amount to see when." : "About <b>" + (r.months >= 12 ? (r.months / 12).toFixed(1) + " years" : r.months + " months") + "</b>, around " + addMonths(today(), r.months).toLocaleDateString(C.locale, { month: "long", year: "numeric" }) + ".";
      el.innerHTML =
        '<div class="card"><div class="label">Cash you need on closing day</div><div class="big-number">' + money(r.cash) + "</div>" +
        '<p class="small muted">' + money(r.down) + " down payment + " + money(r.closing) + " in taxes and fees.</p>" +
        '<div style="margin-top:12px">' + bar(num(H.saved) / (r.cash || 1), true) + '<div class="row between small" style="margin-top:6px"><span>Saved ' + money(H.saved) + "</span><span>" + (r.gap ? money(r.gap) + " to go" : "Done!") + "</span></div></div>" +
        '<p class="small" style="margin-top:10px">' + icon("calendar") + " " + when + "</p></div>" +
        '<div class="card"><h3 style="margin-bottom:10px">The breakdown</h3><dl class="lines">' +
        "<dt>Down payment (" + pct(r.downPct, 1) + ")</dt><dd>" + money(r.down) + "</dd>" +
        "<dt>Smallest allowed down payment</dt><dd>" + money(r.minDown) + "</dd>" +
        "<dt>Ontario land transfer tax</dt><dd>" + money(r.ltt) + "</dd>" + (r.lttRebate ? '<dt class="good">First-time buyer rebate</dt><dd class="good">-' + money(r.lttRebate) + "</dd>" : "") +
        (H.toronto ? "<dt>Toronto land transfer tax</dt><dd>" + money(r.mltt) + "</dd>" + (r.mlttRebate ? '<dt class="good">Toronto first-time rebate</dt><dd class="good">-' + money(r.mlttRebate) + "</dd>" : "") : "") +
        (r.cmhc ? "<dt>Sales tax on mortgage insurance (paid in cash)</dt><dd>" + money(r.cmhcPST) + "</dd>" : "") +
        "<dt>Lawyer, inspection, moving (rough)</dt><dd>" + money(C.home.otherClosingCosts) + "</dd>" +
        '<dt class="tot">Total cash needed</dt><dd class="tot">' + money(r.cash) + "</dd></dl></div>" +
        '<div class="card"><h3 style="margin-bottom:10px">' + icon("building-2") + " Monthly costs</h3><dl class=\"lines\">" +
        "<dt>Mortgage amount</dt><dd>" + money(r.loan) + "</dd>" + (r.cmhc ? "<dt>Includes mortgage insurance (" + pct(r.cmhcRate, 1) + ")</dt><dd>" + money(r.cmhc) + "</dd>" : "") +
        "<dt>Mortgage payment</dt><dd>" + money(r.pay) + "</dd><dt>Property tax, heat, fees</dt><dd>" + money(H.monthlyCosts) + "</dd>" +
        '<dt class="tot">Housing per month</dt><dd class="tot">' + money(r.monthlyAll) + "</dd></dl>" +
        '<div class="callout" style="margin-top:12px">' + icon("info") + "<div>Banks test if you could pay at <b>" + pct(r.qRate / 100, 2) + "</b> (the stress test). For that, your household income would need to be about <b>" + money(r.incomeNeeded) + "</b> a year.</div></div></div>" +
        '<div class="card"><h3 style="margin-bottom:10px">' + icon("sparkles") + " Free help for first-time buyers</h3><div class=\"tip-list small\">" +
        '<div class="callout gold">' + icon("key-round") + "<div><b>FHSA:</b> put in " + money(L.fhsaYear) + " a year (" + money(L.fhsaLifetime) + " total). It lowers your taxes and comes out tax-free for the home. A couple can each have one: " + money(L.fhsaLifetime * 2) + ".</div></div>" +
        '<div class="callout">' + icon("sunset") + "<div><b>Home Buyers' Plan:</b> borrow up to " + money(L.homeBuyersPlan) + " from your own RRSP, tax-free. Pay it back over 15 years.</div></div>" +
        '<div class="callout">' + icon("landmark") + "<div><b>Land transfer tax rebates:</b> up to " + money(C.home.ontarioFirstTimeRebate) + " from Ontario" + (H.toronto ? " and " + money(C.home.torontoFirstTimeRebate) + " from Toronto" : "") + " if you've never owned a home.</div></div></div></div>";
    }
  };

  /* PAGE: Learn ------------------------------------------------------------ */
  PAGES.learn = {
    render() {
      const done = state.profile.lessons, n = Object.keys(done).length;
      return '<div class="page">' + head("Learn money basics", "Short lessons in plain English, made for Canada. Each one has a one-question quiz. Get it right for XP.") +
        '<div class="card row" style="gap:18px">' + (pennyOn() ? mascot(96, "P", n >= C.lessons.length ? "trophy" : n ? "proud" : "happy") : "") + ring(n / C.lessons.length, "var(--good)", 76, n + "/" + C.lessons.length) + '<div><h2>' + (n === C.lessons.length ? "You finished them all!" : n ? "Nice progress" : "Start with the first one") + '</h2><p class="small muted">' + C.xp.finishLesson + " XP per lesson, plus " + C.xp.perfectQuiz + " bonus XP for getting the quiz right the first time.</p></div></div>" +
        '<div class="grid g3">' + C.lessons.map((l, i) => '<button class="card lesson' + (l.id === (C.lessons.find((x) => !done[x.id]) || {}).id ? " next-lesson" : "") + '" data-act="openLesson" data-id="' + l.id + '">' +
          '<div class="row between" style="width:100%">' + bubble(l.icon, l.color, 44) + (done[l.id] ? '<span class="pill good">' + icon("check") + " Done</span>" : '<span class="pill">+' + (C.xp.finishLesson + C.xp.perfectQuiz) + " XP</span>") + "</div>" +
          '<div><div class="tiny muted">Lesson ' + (i + 1) + " · " + l.mins + " min</div><h3>" + esc(l.title) + "</h3></div></button>").join("") + "</div></div>";
    }
  };
  let quizTried = {};
  function openLesson(id) {
    const l = C.lessons.find((x) => x.id === id); if (!l) return;
    openModal('<div class="row">' + bubble(l.icon, l.color, 44) + '<div><div class="tiny muted">' + l.mins + " min read</div><h2>" + esc(l.title) + '</h2></div></div><div class="lesson-body">' + l.body + "</div>" +
      '<div class="card" style="background:var(--surface-2);box-shadow:none"><div class="label" style="margin-bottom:6px">Quick quiz</div><b>' + esc(l.quiz.q) + '</b><div class="stack" style="margin-top:10px" id="quizOpts">' +
      l.quiz.options.map((o, i) => '<button class="btn quiz-opt" data-act="answer" data-id="' + l.id + '" data-i="' + i + '">' + esc(o) + "</button>").join("") + '</div><p id="quizMsg" class="small" style="margin-top:10px"></p></div>' +
      '<div class="row"><button class="btn ghost" data-close>Close</button></div>');
  }

  /* PAGE: Rewards ------------------------------------------------------------ */
  PAGES.rewards = {
    render() {
      const L = levelInfo(), p = state.profile;
      return '<div class="page">' + head("Rewards", "Earn XP for good money habits. Tap any quest to jump straight to it.") +
        (pennyOn() ? '<div class="card row" style="gap:16px;flex-wrap:nowrap">' + mascot(96, "P", "streak") + '<div><h2>You\'re doing great!</h2><p class="small muted">Every quest is a small habit that adds up. ' + esc(C.mascotName || "Penny") + " is proud of you.</p></div></div>" : "") + weeklyCard(false) +
        '<div class="grid g2"><div class="card"><div class="row" style="gap:16px;flex-wrap:nowrap"><div class="lvl" style="flex:none"><div class="badge-lv" style="width:72px;height:72px;font-size:1.8rem">' + L.n + '</div></div><div style="flex:1;min-width:0"><div class="label">Level ' + L.n + "</div><h2>" + esc(L.name) + '</h2><div class="xpbar" style="height:12px;margin-top:8px"><i style="width:' + (L.need ? (L.into / L.need) * 100 : 100) + '%"></i></div><div class="small muted" style="margin-top:4px">' + L.xp + " XP" + (L.next ? " · " + (L.next.xp - L.xp) + " XP to " + esc(L.next.name) : " · max level") + "</div></div></div>" +
        '<div class="row" style="margin-top:16px;gap:10px"><span class="streak">' + icon("flame") + " " + p.streak + " day streak</span><span class=\"pill\">Best: " + p.bestStreak + " days</span></div>" +
        '<p class="small muted" style="margin-top:10px">Open the app each day to keep your streak. Each check-in is +' + C.xp.dailyCheckIn + " XP. Logging a transaction is +" + C.xp.logTransaction + ", adding to a goal is +" + C.xp.addToGoal + ".</p></div>" +
        '<div class="card"><h3 style="margin-bottom:10px">The ladder</h3><div class="list">' + C.levels.map((l, i) => '<div class="item" style="padding:7px 0' + (i + 1 === L.n ? ";font-weight:700" : i + 1 > L.n ? ";opacity:.55" : "") + '"><span class="pill' + (i + 1 <= L.n ? " good" : "") + '">' + (i + 1) + '</span><span class="grow">' + esc(l.name) + '</span><span class="small muted num">' + l.xp + " XP</span></div>").join("") + "</div></div></div>" +
        '<div class="card"><div class="card-head"><h2>' + icon("list-checks") + " Starter quests</h2><span class=\"small muted\">" + Object.keys(p.quests).length + " of " + C.quests.length + " done · tap one to go there</span></div><div class=\"grid g2\">" +
        C.quests.slice().sort((a, b) => !!p.quests[a.id] - !!p.quests[b.id]).map((q) => questRow(q, { done: !!p.quests[q.id] })).join("") + "</div></div>" +
        '<div class="card"><div class="card-head"><h2>' + icon("award") + " Badges</h2></div><div class=\"badges\">" +
        C.badges.map((b) => '<div class="bdg' + (p.badges[b.id] ? "" : " locked") + '"><div class="medal" style="background:' + b.color + '">' + icon(p.badges[b.id] ? b.icon : "lock") + "</div><b>" + esc(b.name) + '</b><span class="tiny muted">' + esc(b.desc) + "</span></div>").join("") + "</div></div></div>";
    }
  };

  /* PAGE: Reminders ------------------------------------------------------------ */
  PAGES.reminders = {
    render() {
      const list = upcoming(365);
      return '<div class="page">' + head("Reminders", "Bills, tax dates and your own reminders for the next 12 months.") +
        '<form class="card" data-form="addRem"><h2 style="margin-bottom:12px">' + icon("bell") + ' Add a reminder</h2><div class="fgrid">' +
        field("Date", '<input type="date" name="date" value="' + todayISO() + '" required>') + '<label class="field" style="grid-column:span 2">What<input name="text" placeholder="e.g. Pay Visa in full" required></label>' +
        field("Repeats", '<select name="repeat"><option value="none">No</option><option value="monthly">Every month</option><option value="yearly">Every year</option></select>') +
        '</div><div class="row" style="margin-top:12px"><button class="btn">' + icon("plus") + " Add reminder</button></div></form>" +
        '<div class="card"><div class="card-head"><h2>' + icon("calendar") + ' Next 12 months</h2><label class="check small"><input type="checkbox" data-change="showTaxCal"' + (state.ui.showTaxCal ? " checked" : "") + "> Show Canadian money calendar</label></div>" +
        (list.length ? '<div class="list">' + list.map((r) => remRow(r)).join("") + "</div>" : '<div class="empty">' + icon("bell") + "<p>No reminders yet.</p></div>") + "</div>" +
        '<p class="tiny muted">Reminders show up here and on Home. The app can\'t send phone notifications on its own, so open it often (that also keeps your streak going).</p></div>';
    }
  };

  /* PAGE: My data ------------------------------------------------------------ */
  let resetArmed = false;
  PAGES.mydata = {
    render() {
      let size = 0; try { size = (localStorage.getItem(KEY) || "").length; } catch (e) { size = 0; }
      return '<div class="page">' + head("My data", "Everything stays in this browser. Nothing is sent anywhere, and nothing costs money.") +
        syncCard() + privacyCard() + '<div class="grid g2"><div class="card stack"><h2>' + icon("smile") + " You</h2>" + field("What should we call you?", '<input data-bind="profile.name" value="' + esc(state.profile.name) + '" placeholder="Your first name">') +
        '<label class="check"><input type="checkbox" data-change="calmMode"' + (state.ui.calm ? " checked" : "") + '> Calm mode: no moving animations, softer pop-ups 🍃</label>' +
        '<label class="check"><input type="checkbox" data-change="celebrate"' + (state.ui.celebrate !== false ? " checked" : "") + '> Celebrations: confetti and pop-ups when you save 🎉</label>' +
        "</div>" +
        '<div class="card stack"><h2>' + icon("download") + ' Back up</h2><p class="small muted">' + (signedIn() ? "Sync is on, so your data is also saved to your account. A backup file is still a nice extra safety net." : "Your data lives only in this browser. Clearing browser history or switching computers will lose it. Back up once a month.") + "</p>" +
        '<div class="row"><button class="btn" data-act="backup">' + icon("download") + ' Download backup</button><button class="btn ghost" data-act="exportCsv">' + icon("receipt") + " Transactions as CSV</button></div>" +
        '<label class="field">Restore a backup<input type="file" accept=".json,application/json" data-change="restore"></label><p class="tiny muted">Using about ' + Math.round(size / 1024) + " KB of roughly 5,000 KB browsers allow. Photos use the most.</p></div></div>" +
        '<div class="card stack"><h2>' + icon("refresh-cw") + ' Start over</h2>' + (resetArmed && pennyOn() ? '<div class="row" style="flex-wrap:nowrap">' + mascot(80, "P", "sad") + '<p class="small"><b>Are you sure?</b> ' + esc(C.mascotName || "Penny") + " will miss all your hard work. Download a backup first!</p></div>" : "") + '<div class="row">' + (state.isExample ? '<button class="btn gold" data-act="clearExample">Clear example data</button>' : "") +
        '<button class="btn danger" data-act="reset">' + (resetArmed ? "Press again to erase everything" : "Erase everything") + '</button></div><p class="small muted">Erasing keeps nothing: transactions, goals, XP, all of it. Download a backup first.' + (signedIn() ? " Sync is on, so this also erases it on your other devices." : "") + "</p></div>" +
        '<div class="card stack"><h2>🐷 Setup</h2><p class="small">Want to walk through the 10 setup questions again? Your answers fill in what\'s already there.</p><div class="row"><button class="btn ghost" data-act="openWizard">Run the setup again</button></div></div>' +
        '<div class="card stack"><h2>' + icon("heart") + " Sharing with friends</h2><p class=\"small\">Send someone the link (or the app folder). Everyone gets their own private profile on their own device. Nobody can see anyone else's numbers. When the app gets updated, everyone gets the new features and keeps everything they've entered.</p></div>" +
        '<div class="card stack"><h2>' + icon("pencil") + ' Make it your own</h2><p class="small">This app is just a few plain files you can open in any text editor. Open <b>config.js</b> to change tax numbers, categories, auto-sort rules, lessons, quests, badges and the calendar. Open <b>styles.css</b> to change colors. The <b>GUIDE.md</b> file walks you through it.</p></div></div>';
    }
  };

  /* ==================================================================
     Shell: nav, top bar, routing
     ================================================================== */
  function pageId() { const h = (location.hash || "").replace("#", ""); return PAGES[h] ? h : "home"; }
  function navHTML(cls) {
    const cur = pageId();
    return NAV.map((n) => {
      if (!n) return cls === "side" ? '<div class="sep"></div>' : "";
      const pn = pageName(n[0]), label = pn ? pn[0] : n[1], plain = pn && pn[1] && pn[1] !== pn[0] ? pn[1] : "";
      return '<a href="#' + n[0] + '" class="' + (cur === n[0] ? "on" : "") + '" title="' + esc(plain || label) + '">' + icon(n[2]) + (cls === "side" && plain ? '<span class="nav-two"><span>' + esc(label) + '</span><small>' + esc(plain) + "</small></span>" : "<span>" + esc(label) + "</span>") + "</a>";
    }).join("");
  }
  function renderTop() {
    const L = levelInfo(), el = $("#topbar"); if (!el) return;
    el.innerHTML = '<a class="lvl" href="#rewards" style="text-decoration:none;color:inherit"><div class="badge-lv">' + L.n + '</div><div class="meta"><div class="row1"><b>' + esc(L.name) + '</b><span class="muted num">' + L.xp + " XP</span></div>" +
      '<div class="xpbar"><i style="width:' + (L.need ? (L.into / L.need) * 100 : 100) + '%"></i></div></div></a>' +
      (feedOn() ? '<button type="button" class="belly-pill" data-act="openFeed" title="Penny\'s belly this month" aria-label="Penny\'s belly: ' + feedStatus().coins + ' coins">🪙 ' + feedStatus().coins + "</button>" : "") +
      '<span class="streak" title="Days in a row">' + icon("flame") + " " + state.profile.streak + "</span>" +
      '<button class="btn" data-act="addTx" aria-label="Add a transaction">' + icon("plus") + '<span class="lbl">Add</span></button>';
  }
  let lastPage = null;
  function render() {
    const id = pageId(), page = PAGES[id];
    const logo = $(".logo b"); if (logo && logo.textContent !== C.appName) { logo.textContent = C.appName; document.title = C.appName; }
    const mark = $(".logo .mark"); if (mark) mark.innerHTML = mascot(34);
    state.flags.visits = state.flags.visits || {}; state.flags.visits[id] = todayISO();
    $("#sideNav").innerHTML = navHTML("side");
    $("#mobileNav").innerHTML = navHTML("mobile");
    renderTop();
    if (!state.isExample) coverBills(); // budgets always include the bills you've entered
    // redrawing the same page keeps your place: scroll position, open sections, scrolled lists
    const samePage = lastPage === id, view = $("#view");
    const keep = samePage ? { y: window.scrollY, open: Array.from(view.querySelectorAll("details:not([data-key])")).map((d) => d.open), keyed: Array.from(view.querySelectorAll("details[data-key]")).filter((d) => d.open).map((d) => d.dataset.key), boxes: Array.from(view.querySelectorAll(".table-wrap, .import-table")).map((t) => t.scrollTop) } : null;
    pageSrcs = new Set();
    try { view.innerHTML = page.render(); if (page.after) page.after(); } finally { pageSrcs = null; }
    if (keep) {
      view.querySelectorAll("details:not([data-key])").forEach((d, i) => { if (keep.open[i] !== undefined) d.open = keep.open[i]; });
      keep.keyed.forEach((k) => { const d = view.querySelector('details[data-key="' + k + '"]'); if (d) d.open = true; });
      view.querySelectorAll(".table-wrap, .import-table").forEach((t, i) => { if (keep.boxes[i]) t.scrollTop = keep.boxes[i]; });
      if (Math.abs(window.scrollY - keep.y) > 1) window.scrollTo(0, keep.y);
    }
    if (lastPage !== id) { window.scrollTo(0, 0); const on = $("#mobileNav .on"); if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "center" }); }
    if (lastPage !== id) maybePageIntro(id);
    lastPage = id;
  }
  function commit(msg) { evaluate(); save(); render(); if (msg) toast(msg); }
  // For updates that arrive on their own (sync): wait if you're typing or have a window open
  let renderLater = false;
  function quietRender() {
    const a = document.activeElement;
    const typing = a && a.closest && a.closest("#view") && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
    if (typing || modalEl || $("#wizard")) { renderLater = true; return; }
    render();
  }
  document.addEventListener("focusout", () => { if (!renderLater) return; setTimeout(() => { const a = document.activeElement; if (renderLater && !(a && a.closest && a.closest("#view") && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && !modalEl) { renderLater = false; render(); } }, 120); });
  function snapshotNet() {
    const ym = thisMonth(), net = state.accounts.reduce((a, x) => a + (acctType(x.type).kind === "debt" ? -num(x.balance) : num(x.balance)), 0);
    state.netHistory = state.netHistory.filter((h) => h.ym !== ym);
    state.netHistory.push({ ym, net });
  }
  function applyTheme() {
    const t = state.ui.theme, root = document.documentElement;
    root.removeAttribute("data-theme"); // Penny Pal always uses its pastel theme
    if (state.ui.calm) root.setAttribute("data-calm", "1"); else root.removeAttribute("data-calm");
  }

  /* ==================================================================
     Quests: tap one to jump to the place you finish it
     ================================================================== */
  let skipHash = false;
  function flash(el) {
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 2800);
  }
  function goTo(go, how) {
    if (!go) { toast(icon("info") + " " + esc(how || "This one happens on its own as you use the app.")); return; }
    closeModal();
    const page = go.page || pageId();
    if (pageId() !== page) { skipHash = true; location.hash = page; }
    render();
    setTimeout(() => {
      if (go.act === "addTx") { ACT.addTx(); return; }
      if (go.act || (go.focus && go.fallback && !$("#view " + go.focus))) {
        if (!go.act) { toast(icon("info") + " Add one first, then come back to this quest."); go = { act: go.fallback }; if (go.act === "addTx") { ACT.addTx(); return; } }
        const btn = $('#view [data-act="' + go.act + '"]');
        if (btn) {
          btn.scrollIntoView({ block: "center" }); ACT[go.act](btn);
          if (go.act === "toggleImport") { const box = $("#importBox"); if (box) { box.hidden = false; box.scrollIntoView({ block: "start" }); flash(box); } }
        } else if (go.act === "goalMoney") { toast("Make a goal first, then add money to it."); ACT.editGoal({ dataset: {} }); }
        return;
      }
      if (go.focus) {
        const el = $("#view " + go.focus) || $(go.focus);
        if (el) {
          el.scrollIntoView({ block: "center" });
          try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
          flash(el.closest(".money-in") || el);
        }
      }
    }, 60);
  }
  function questRow(q, opts) {
    const done = opts.done, pr = opts.progress;
    const capped = pr ? Math.min(pr.cur, pr.target) : 0;
    const prText = !pr ? "" : q.unit === "$" ? money(capped) + " / " + money(pr.target) : q.unit === "%" ? capped + "% / " + pr.target + "%" : capped + " / " + pr.target;
    return '<div class="quest' + (done ? " done" : "") + '"><button class="quest-main" data-act="goQuest" data-id="' + q.id + '" aria-label="' + esc(q.title) + (done ? ", done" : ", go there") + '">' +
      bubble(done ? "circle-check" : q.icon, done ? "#5fae7c" : opts.color || "#e3b45f", 40) +
      '<span class="q-text"><b>' + esc(q.title) + '</b><span class="small muted">' + (done ? "Done" : esc(q.how || (q.go ? "Tap to go there" : ""))) + "</span>" +
      (pr && !done ? '<span class="q-prog"><span class="track thin"><i style="width:' + Math.min(100, (pr.cur / pr.target) * 100) + '%;background:var(--gold)"></i></span><span class="tiny muted num">' + prText + "</span></span>" : "") +
      '</span><span class="xp">+' + q.xp + "</span>" + (done ? "" : '<span class="q-go">' + icon("chevron-right") + "</span>") + "</button>" +
      (opts.swap && !done ? '<button class="iconbtn" data-act="swapQuest" data-id="' + q.id + '" title="Swap for a different quest" aria-label="Swap this quest">' + icon("refresh-cw") + "</button>" : "") + "</div>";
  }
  function weeklyCard(compact) {
    rollWeek();
    const wk = state.profile.weekly, W = weekHelper();
    const daysLeft = daysBetween(today(), W.end) + 1;
    const doneN = wk.ids.filter((id) => wk.done[id]).length, swapsLeft = C.weeklySwapsPerWeek - (wk.swaps || 0), streak = state.profile.weeklyStreak || 0;
    return '<div class="card"><div class="card-head"><h2>' + icon("calendar") + " This week's quests</h2><span class=\"pill\">" + (daysLeft <= 1 ? "New quests tomorrow" : "New quests in " + daysLeft + " days") + "</span></div>" +
      '<div class="stack">' + wk.ids.map((id) => { const q = weeklyDef(id); return q ? questRow(q, { done: !!wk.done[id], progress: weeklyProgress(q), swap: !compact && swapsLeft > 0, color: "#5aa9a2" }) : ""; }).join("") + "</div>" +
      '<div class="row between small" style="margin-top:12px"><span>' + (wk.bonus ? '<b class="good">' + icon("circle-check") + " Perfect week! +" + C.weeklyBonusXp + " XP bonus earned</b>" : "Finish all " + wk.ids.length + " for a <b>+" + C.weeklyBonusXp + " XP</b> bonus (" + doneN + "/" + wk.ids.length + " done)") + "</span>" +
      (compact ? "" : '<span class="muted">' + icon("flame") + " " + streak + " perfect " + (streak === 1 ? "week" : "weeks") + " in a row" + (swapsLeft > 0 ? " · " + swapsLeft + " swap left" : "") + "</span>") + "</div></div>";
  }

  /* ==================================================================
     Modals for adding and editing
     ================================================================== */
  function txModal(t) {
    const isNew = !t; t = t || { date: todayISO(), kind: "expense", cat: "groceries", amount: "", desc: "" };
    openModal('<form data-form="saveTx" class="stack"><input type="hidden" name="id" value="' + (t.id || "") + '"><div class="row between"><h2>' + (isNew ? "Add a transaction" : "Edit transaction") + "</h2>" + (isNew ? '<button type="button" class="btn soft sm" data-act="scanReceipt">' + icon("camera") + " Scan a receipt instead</button>" : "") + "</div>" +
      '<div class="seg"><label><input type="radio" name="kind" value="expense" data-change="txKind" hidden' + (t.kind === "expense" ? " checked" : "") + '><span class="segbtn">Money out</span></label><label><input type="radio" name="kind" value="income" data-change="txKind" hidden' + (t.kind === "income" ? " checked" : "") + '><span class="segbtn">Money in</span></label></div>' +
      '<div class="fgrid">' + field("Amount", moneyInput('name="amount" min="0" required value="' + esc(t.amount) + '" placeholder="0.00" style="font-size:1.2rem"')) + field("Date", '<input type="date" name="date" required value="' + esc(t.date) + '">') + "</div>" +
      field("What was it?", '<input name="desc" value="' + esc(t.desc) + '" placeholder="e.g. Tim Hortons">') +
      '<div><div class="label" style="margin-bottom:6px">Category <span class="cat-hint tiny muted"></span></div><div class="catpick" id="catPick"' + (isNew ? "" : ' data-picked="1"') + ">" + catPick(t.kind, t.cat) + "</div></div>" +
      '<label class="check small"><input type="checkbox" name="learn"> Always sort this name into this category</label>' +
      '<div class="row"><button class="btn">' + icon("check") + (isNew ? " Add it" : " Save") + '</button><button type="button" class="btn ghost" data-close>Cancel</button></div></form>');
  }
  function catPick(kind, sel) {
    const cats = state.categories.filter((c) => c.group === "transfer" || (kind === "income") === (c.group === "income")).concat(kind === "income" ? [] : [OTHER]);
    if (!cats.some((c) => c.id === sel)) sel = cats[0] && cats[0].id;
    return cats.map((c) => '<label><input type="radio" name="cat" value="' + c.id + '"' + (c.id === sel ? " checked" : "") + '><span style="color:' + c.color + '">' + icon(c.icon) + "</span>" + esc(c.name) + "</label>").join("");
  }
  function catModal(c, group) {
    const isNew = !c; c = c || { id: "", name: "", icon: "sparkles", color: C.swatches[0], group: group || "want", budget: 0 };
    openModal('<form data-form="saveCat" class="stack"><input type="hidden" name="id" value="' + esc(c.id) + '"><h2>' + (isNew ? "New category" : "Edit category") + "</h2>" +
      '<div class="fgrid">' + field("Name", '<input name="name" required value="' + esc(c.name) + '">') + field("Type", '<select name="group">' + Object.entries(GROUPS).map(([k, v]) => '<option value="' + k + '"' + (c.group === k ? " selected" : "") + ">" + v + "</option>").join("") + "</select>") + field("Monthly budget", moneyInput('name="budget" min="0" value="' + num(c.budget) + '"')) + "</div>" +
      '<input type="hidden" name="icon" value="' + esc(c.icon) + '"><input type="hidden" name="color" value="' + esc(c.color) + '">' +
      '<div><div class="label" style="margin-bottom:6px">Colour</div><div class="swatches">' + C.swatches.map((s) => '<button type="button" data-act="pickColor" data-v="' + s + '" style="background:' + s + '" class="' + (s === c.color ? "on" : "") + '" aria-label="Colour ' + s + '"></button>').join("") + "</div></div>" +
      '<div><div class="label" style="margin-bottom:6px">Icon</div><div class="icon-grid">' + Object.keys(ICONS).map((k) => '<button type="button" data-act="pickIcon" data-v="' + k + '" class="' + (k === c.icon ? "on" : "") + '" title="' + k + '">' + icon(k) + "</button>").join("") + "</div></div>" +
      '<div class="row"><button class="btn">' + icon("check") + ' Save</button><button type="button" class="btn ghost" data-close>Cancel</button>' + (isNew ? "" : '<button type="button" class="btn danger" data-act="delCat" data-id="' + c.id + '" style="margin-left:auto">' + icon("trash-2") + " Delete</button>") + "</div></form>");
  }
  function subModal(s) {
    const isNew = !s || !s.id; s = Object.assign({ name: "", amount: "", cycle: "monthly", next: todayISO(), icon: "repeat", status: "keep" }, s || {});
    openModal('<form data-form="saveSub" class="stack"><input type="hidden" name="id" value="' + esc(s.id || "") + '"><h2>' + (isNew ? "Add a bill or subscription" : "Edit") + "</h2>" +
      '<div class="fgrid">' + field("Name", '<input name="name" required value="' + esc(s.name) + '" placeholder="e.g. Crave">') + field("Amount", moneyInput('name="amount" min="0" required value="' + esc(s.amount) + '"')) +
      field("How often", '<select name="cycle">' + Object.entries(CYCLES).map(([k, v]) => '<option value="' + k + '"' + (s.cycle === k ? " selected" : "") + ">" + v[0] + "</option>").join("") + "</select>") +
      field("Next charge", '<input type="date" name="next" value="' + esc(s.next) + '">') +
      field("Budget category", '<select name="cat">' + state.categories.filter((c) => c.group === "need" || c.group === "want").map((c) => '<option value="' + c.id + '"' + (billCat(s) === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>").join("") + "</select>", "Penny adds it to this budget") + "</div>" +
      '<input type="hidden" name="icon" value="' + esc(s.icon) + '"><div><div class="label" style="margin-bottom:6px">Icon</div><div class="icon-grid" style="max-height:130px">' + ["repeat", "film", "tv", "music", "smartphone", "wifi", "zap", "droplet", "dumbbell", "shopping-bag", "car", "shield", "house", "cloud", "gamepad-2", "book", "newspaper", "credit-card", "heart-pulse", "graduation-cap"].filter((k) => ICONS[k]).map((k) => '<button type="button" data-act="pickIcon" data-v="' + k + '" class="' + (k === s.icon ? "on" : "") + '">' + icon(k) + "</button>").join("") + "</div></div>" +
      '<div class="row"><button class="btn">' + icon("check") + ' Save</button><button type="button" class="btn ghost" data-close>Cancel</button></div></form>');
  }
  function goalModal(g) {
    const isNew = !g; g = g || { name: "", icon: "plane", theme: 0, target: "", saved: 0, date: toISO(addMonths(today(), 12)), account: "TFSA" };
    openModal('<form data-form="saveGoal" class="stack"><input type="hidden" name="id" value="' + esc(g.id || "") + '"><h2>' + (isNew ? "New savings goal" : "Edit goal") + "</h2>" +
      (isNew ? '<div><div class="label" style="margin-bottom:6px">Pick a type</div><div class="row" style="gap:6px">' + C.goalTemplates.map((t, i) => '<button type="button" class="btn soft sm" data-act="goalTpl" data-i="' + i + '">' + icon(t.icon) + esc(t.name) + "</button>").join("") + "</div></div>" : "") +
      '<div class="fgrid">' + field("Name", '<input name="name" required value="' + esc(g.name) + '" placeholder="e.g. Japan trip">') + field("Target", moneyInput('name="target" min="1" required value="' + esc(g.target) + '"')) +
      field("Saved so far", moneyInput('name="saved" min="0" value="' + esc(g.saved) + '"')) + field("Target date", '<input type="date" name="date" value="' + esc(g.date || "") + '">') +
      field("Kept in", '<select name="account">' + C.goalAccounts.map((a) => '<option' + (g.account === a ? " selected" : "") + ">" + a + "</option>").join("") + "</select>") + "</div>" +
      '<input type="hidden" name="icon" value="' + esc(g.icon) + '"><input type="hidden" name="theme" value="' + num(g.theme) + '">' +
      '<div><div class="label" style="margin-bottom:6px">Cover colour</div><div class="swatches">' + C.goalThemes.map((t, i) => '<button type="button" data-act="pickTheme" data-v="' + i + '" class="' + (i === num(g.theme) ? "on" : "") + '" style="background:linear-gradient(135deg,' + t[0] + "," + t[1] + ')" aria-label="Theme ' + (i + 1) + '"></button>').join("") + "</div></div>" +
      '<div><div class="label" style="margin-bottom:6px">Icon</div><div class="icon-grid" style="max-height:130px">' + ["plane", "tree-palm", "mountain", "sailboat", "key-round", "house", "umbrella", "car", "heart", "gem", "graduation-cap", "laptop", "gift", "baby", "dog", "bike", "camera", "music", "sofa", "globe", "tent", "cake", "flower-2", "rocket"].filter((k) => ICONS[k]).map((k) => '<button type="button" data-act="pickIcon" data-v="' + k + '" class="' + (k === g.icon ? "on" : "") + '">' + icon(k) + "</button>").join("") + "</div></div>" +
      '<p class="small muted">' + icon("camera") + " You can add your own photo to the card after saving.</p>" +
      '<div class="row"><button class="btn">' + icon("check") + ' Save goal</button><button type="button" class="btn ghost" data-close>Cancel</button>' + (isNew ? "" : (g.photo ? '<button type="button" class="btn ghost" data-act="removePhoto" data-id="' + g.id + '">Remove photo</button>' : "") + '<button type="button" class="btn danger" data-act="delGoal" data-id="' + g.id + '" style="margin-left:auto">' + icon("trash-2") + " Delete</button>") + "</div></form>");
  }
  function acctModal(a) {
    const isNew = !a; a = a || { name: "", type: "chequing", balance: "" };
    openModal('<form data-form="saveAcct" class="stack"><input type="hidden" name="id" value="' + esc(a.id || "") + '"><h2>' + (isNew ? "Add an account" : "Edit account") + "</h2>" +
      '<div class="fgrid">' + field("Type", '<select name="type">' + C.accountTypes.map((t) => '<option value="' + t.id + '"' + (a.type === t.id ? " selected" : "") + ">" + t.name + (t.kind === "debt" ? " (owe)" : "") + "</option>").join("") + "</select>") +
      field("Name", '<input name="name" value="' + esc(a.name) + '" placeholder="e.g. TD chequing">') + field("Balance", moneyInput('name="balance" required value="' + esc(a.balance) + '"'), "For debts, type what you owe as a positive number") + "</div>" +
      '<div class="row"><button class="btn">' + icon("check") + ' Save</button><button type="button" class="btn ghost" data-close>Cancel</button></div></form>');
  }

  /* ==================================================================
     Button actions
     ================================================================== */
  const ACT = {
    efGoal(el) {
      const n = +el.dataset.n, P = efPlan(), target = Math.ceil(P.monthly * n / 50) * 50; if (!target) return toast("Add your budgets first so Penny knows your monthly needs");
      let g = state.goals.find((x) => !x.example && /emergenc/i.test(x.name));
      if (g) { g.target = target; toast("🛟 Emergency fund goal set to " + money(target) + " (" + (n === 12 ? "1 year" : n + " months") + ")"); }
      else { g = { id: uid(), name: "Emergency fund", icon: "umbrella", theme: 4, target, saved: Math.min(P.saved, target), date: toISO(addMonths(today(), n === 12 ? 24 : n * 3)), account: "HISA", photo: null, history: [] }; state.goals.push(g); toast("🛟 Made your Emergency fund goal: " + money(target)); }
      commit();
    },
    txScope(el) { state.ui.txAll = el.dataset.v === "all"; txLimit = 300; save(); window.scrollTo(0, 0); lastPage = null; render(); },
    txMore() { txLimit += 300; render(); },
    selToggle() { selMode = !selMode; selIds.clear(); render(); },
    selMove() {
      const cat = ($("#selCat") || {}).value, learn = ($("#selLearn") || {}).checked; if (!cat || !selIds.size) return;
      const kind = kindForCat(cat, "expense"); let n = 0; const learned = new Set();
      state.transactions.forEach((t) => { if (!selIds.has(t.id)) return; t.cat = cat; t.kind = kind; t.recatOn = todayISO(); n++;
        if (learn) { const words = merchantKey(t.desc).split(" ").slice(0, 2).join(" "); if (words.length > 2 && !state.rules.some((r) => r.match.toUpperCase() === words)) { state.rules.unshift({ match: words, cat }); learned.add(words); } } });
      selIds.clear(); commit("Moved " + n + " to " + esc(catById(cat).name) + (learned.size ? " · Penny will remember " + learned.size + (learned.size === 1 ? " store" : " stores") : ""));
    },
    selDelete() {
      if (!selIds.size) return;
      if (!window.__delArmed) { window.__delArmed = true; toast("Tap Delete again to remove " + selIds.size + " transactions"); setTimeout(() => { window.__delArmed = false; }, 4000); return; }
      window.__delArmed = false; const n = selIds.size; state.transactions = state.transactions.filter((t) => !selIds.has(t.id)); selIds.clear(); commit("Deleted " + n + " transactions");
    },
    sortOther() {
      const list = state.transactions.filter((t) => !t.example && t.cat === "other" && !t.recatOn);
      const tips = list.map((t) => ({ t, e: explainCat(t.desc, t.kind) })).filter((x) => x.e && x.e.cat !== "other");
      const left = list.filter((t) => !tips.some((x) => x.t === t));
      window.__sortTips = tips;
      sortOtherModal(tips, left);
    },
    async sortOtherAI() {
      const left = state.transactions.filter((t) => !t.example && t.cat === "other" && !t.recatOn && !(window.__sortTips || []).some((x) => x.t === t)).slice(0, 60);
      const sample = await getSample(); if (!sample || !left.length) return toast("Nothing more Penny can sort here");
      toast("✨ Asking Claude about " + left.length + " transactions...");
      const cats = state.categories.filter((c) => c.group !== "income").map((c) => c.id + " = " + c.name).join("\n");
      try {
        const r = await sample.json("Sort these Canadian bank transactions into budget categories. Reply with only JSON like {\"items\":[{\"i\":0,\"category\":\"groceries\",\"why\":\"grocery store\"}]}. Use only these ids:\n" + cats + "\nother = Other (use it if you are not sure). Never guess wildly.\n\n" + left.map((t, i) => i + ": " + t.desc).join("\n"));
        const items = r && Array.isArray(r.items) ? r.items : [];
        items.forEach((it) => { const t = left[+it.i]; if (t && state.categories.some((c) => c.id === it.category && c.group !== "income")) window.__sortTips.push({ t, e: { cat: it.category, why: "Claude: " + String(it.why || "").replace(/<[^>]*>/g, "").slice(0, 60) } }); });
        sortOtherModal(window.__sortTips, state.transactions.filter((t) => !t.example && t.cat === "other" && !t.recatOn && !window.__sortTips.some((x) => x.t === t)));
      } catch (e) { toast("Claude couldn't help with that right now"); }
    },
    sortOtherApply() {
      const tips = window.__sortTips || []; let n = 0;
      document.querySelectorAll(".sort-row").forEach((row) => { const i = +row.dataset.i, x = tips[i]; if (!x || !row.querySelector("input[type=checkbox]").checked) return; const cat = row.querySelector("select").value; x.t.cat = cat; x.t.kind = kindForCat(cat, x.t.kind); n++; });
      closeModal(); commit("Sorted " + n + " transactions");
      if (n) setTimeout(() => celebrate("track", { pose: "proud", emoji: "✨", title: n + " sorted!", sub: "Your spending picture just got a lot clearer." }), 200);
    },
    undoSync() {
      const snap = lastSnapshot(); if (!snap) return toast("Nothing to undo");
      try {
        state = normalize(JSON.parse(snap.data)); applyTheme(); evaluate(); save();
        try { const list = JSON.parse(localStorage.getItem(SNAP_KEY) || "[]"); list.shift(); localStorage.setItem(SNAP_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
        if (signedIn()) { sync.dirty = true; sync.editedAt = Date.now(); saveSync(); sbPush().then(() => toast("☁️ Restored and saved to your account")).catch(() => toast("Restored on this device. It'll save to your account on the next sync.")); }
        render(); toast(icon("check") + " This device's data is back");
      } catch (e) { toast("Couldn't undo that one, sorry."); }
    },
    async wzCheckAgain() {
      try { const row = await sbRow(); if (row && row.data && dataWeight(row.data) > 0) { closeWizard(); applyRemote(row, true); render(); toast("☁️ Found it! Brought over " + esc(whatCameOver(state))); return; } }
      catch (e) { /* fall through */ }
      toast("Still nothing saved on this account. Open Penny on your other device and tap Sync now there first.");
    },
    wzSetupHere() { wzMsg = "Signed in! Let's set up your money home."; ACT.startSetup(true); },
    wzAddAcct() { const box = $("#wzAccts"); if (!box) return; box.insertAdjacentHTML("beforeend", wzAcctRow({ type: "savings" })); const last = box.lastElementChild; if (last) { const n = last.querySelector('input[name="acctAmt"]'); if (n) n.focus(); } const f = $("#wzForm"); if (f) f.dataset.touched = "1"; },
    wzDelAcct(el) { const row = el.closest(".wz-acct"); const box = $("#wzAccts"); if (row && box && box.children.length > 1) row.parentNode.removeChild(row); else if (row) row.querySelectorAll("input:not([type=hidden])").forEach((i) => { i.value = ""; }); },
    openFeed() { feedModal(); },
    feedGo(el) { const c = FP.chores.find((x) => x.id === el.dataset.id); if (c) goTo(c.go, c.how); },
    feedTick(el) { const f = feedBox(), ym = thisMonth(), t = f.ticks[ym] = f.ticks[ym] || {}; const id = el.dataset.id; if (t[id]) delete t[id]; else t[id] = todayISO(); commit(); feedModal(); },
    feedNoCard() { state.flags.noCreditCard = true; commit(); feedModal(); toast("Got it! That one counts as done every month."); },
    lookMine() { closeModal(); ACT.startSetup(); },
    lookKeep() { closeModal(); },
    syncNow() { syncNow(true); },
    syncSignOut() { syncSignOut(false); toast("Signed out. Your data is still on this device."); },
    syncKeepAccount() { const row = window.__syncChoice; window.__syncChoice = null; closeModal(); if (row) applyRemote(row, true); toast("☁️ Using your account's data"); },
    syncKeepDevice() { window.__syncChoice = null; closeModal(); sbPush().then(() => { toast("☁️ This device's data is now saved to your account"); render(); }).catch(() => toast("Couldn't save to your account right now. Try Sync now in a minute.")); },
    pennyPoke(el) { const m = el.querySelector(".mascot-img"); if (!m) return; m.classList.remove("poked"); void m.offsetWidth; m.classList.add("poked"); },
    pageHelp() { showPageIntro(pageId()); },
    scanReceipt() { scanModal(); },
    pasteReceipt() {
      openModal('<form data-form="receiptText" class="stack"><h2>Paste an email or bill</h2><p class="small muted">Open the email (like a Rogers bill or an Uber Eats receipt), select all the text, copy it and paste it here.</p>' +
        '<textarea name="text" rows="10" placeholder="Paste the email text here" required></textarea><div class="row"><button class="btn">' + icon("search") + ' Read it</button><button type="button" class="btn ghost" data-act="scanReceipt">Back</button></div></form>');
    },
    startCheckin() { ciIndex = 0; ciQuestion(); },
    startSetup(skipAccount) {
      if (skipAccount !== true && syncReady() && !signedIn() && !state.ui.skippedAccount) { wzAuthMode = "signup"; wzAuthMsg = ""; return renderAccountStep(); }
      if (state.isExample) { const keepUi = state.ui, keepProfile = state.profile; state = blankState(); state.ui = Object.assign(keepUi, { setupDone: false, setupStep: 0 }); state.profile = keepProfile; }
      state.ui.setupStep = 0; if (skipAccount !== true) wzMsg = ""; save(); render(); renderWizard();
    },
    openWizard() { if ((state.ui.setupStep || 0) >= C.setup.steps.length) state.ui.setupStep = 0; wzMsg = ""; renderWizard(); },
    wzStart() { ACT.startSetup(); },
    wzSignIn() { wzAuthMode = "signin"; wzAuthMsg = ""; renderAccountStep(); },
    wzAuthToggle() { const em = $("#wizard .wz-auth input[name=email]"); if (em) wzAuthEmail = em.value.trim(); wzAuthMode = wzAuthMode === "signup" ? "signin" : "signup"; wzAuthMsg = ""; renderAccountStep(); },
    wzAuthSkip() { state.ui.skippedAccount = true; wzMsg = "No problem! You can turn on sync anytime in My Stash."; ACT.startSetup(true); },
    wzExample() { state = exampleState(); state.ui.seenVersion = C.version; checkIn(); evaluate(); closeWizard(); save(); render(); toast("👀 Have a look around! Press \"Set up my profile\" whenever you're ready."); },
    wzBack() { state.ui.setupStep = Math.max(0, (state.ui.setupStep || 0) - 1); wzMsg = ""; save(); renderWizard(); },
    wzSkip() { wzAdvance(false); },
    wzLater() { closeWizard(); save(); render(); toast("No rush! Your setup is saved. Pick it up from Home anytime 🐷"); },
    wzHome() { closeWizard(); location.hash = "home"; render(); celebrate("goalDone", { emoji: "🏡", title: "Welcome home!", sub: "Your money home is all set." }); },
    wzCheckin() { closeWizard(); render(); ciIndex = 0; ciQuestion(); },
    ciAnswer(el) { ciAnswer(el.dataset.v); },
    ciAge(el) { state.checkin.age = el.dataset.v || null; save(); ciIndex++; ciQuestion(); },
    ciNext() { if (ciIndex < C.checkin.questions.length - 1) { ciIndex++; ciQuestion(); } else ciResults(); },
    nextFact() { factIndex = (factIndex + 1) % C.funFacts.length; render(); },
    closeCheer() { const el = $("#cheer"); if (el) { el.className = "cheer out"; setTimeout(() => (el.innerHTML = ""), 300); } },
    pathGo(el) { const step = C.moneyPath.find((x) => x.id === el.dataset.step), it = step && step.items.find((x) => x.id === el.dataset.item); if (it) goTo(it.go); },
    pathSkip(el) { const id = el.dataset.step; if (state.path.skipped[id]) delete state.path.skipped[id]; else { state.path.skipped[id] = todayISO(); toast("No problem! Skipped. You can bring it back any time."); } commit(); },
    pathDel(el) { const list = state.path.custom[el.dataset.step] || []; state.path.custom[el.dataset.step] = list.filter((x) => x.id !== el.dataset.item); delete state.path.done[pathKey(el.dataset.step, el.dataset.item)]; commit(); },
    goQuest(el) {
      const id = el.dataset.id, starter = C.quests.find((q) => q.id === id), q = starter || weeklyDef(id);
      if (!q) return;
      const done = starter ? state.profile.quests[id] : state.profile.weekly && state.profile.weekly.done[id];
      if (done) { toast(icon("circle-check") + " Already done. Nice work!"); return; }
      goTo(q.go, q.how);
    },
    swapQuest(el) {
      const wk = state.profile.weekly;
      if ((wk.swaps || 0) >= C.weeklySwapsPerWeek) { toast("No swaps left this week."); return; }
      const fresh = seededPick(wk.key + "swap" + Date.now(), C.weeklyQuests, 1, wk.ids)[0];
      if (!fresh) return;
      wk.ids = wk.ids.map((x) => (x === el.dataset.id ? fresh : x)); wk.swaps = (wk.swaps || 0) + 1;
      commit(icon("refresh-cw") + " Swapped in: " + esc(weeklyDef(fresh).title));
    },
    month(el) { state.ui.month = shiftMonth(state.ui.month, +el.dataset.d); save(); render(); },
    addTx() { txModal(); },
    editTx(el) { txModal(state.transactions.find((t) => t.id === el.dataset.id)); },
    delTx(el) { state.transactions = state.transactions.filter((t) => t.id !== el.dataset.id); commit("Deleted"); },
    toggleImport() { const b = $("#importBox"); if (b) b.hidden = !b.hidden; },
    flipImport(el) {
      const p = pendingImport; if (!p) return;
      const f = el && el.dataset.file !== undefined ? +el.dataset.file : "all";
      p.flips = p.flips || {}; p.flips[f] = !p.flips[f]; p.skip = {};
      Object.assign(p, buildFromBase(p.base, p.flips)); render();
    },
    flipRow(el) { const r = pendingImport && pendingImport.rows[+el.dataset.i]; if (!r) return; r.kind = r.kind === "income" ? "expense" : "income"; if (!r.picked || kindForCat(r.cat, r.kind) !== r.kind) r.cat = statementCat(r.desc, r.kind); render(); },
    cancelImport() { pendingImport = null; render(); },
    doImport() {
      const skip = pendingImport.skip || {};
      const rows = pendingImport.rows.filter((r, i) => !skip[i]).map((r) => { const t = Object.assign({ id: uid(), added: todayISO(), src: "import" }, r); delete t.picked; delete t.file; if (r.picked) t.recatOn = todayISO(); return t; });
      state.transactions.push(...rows); state.flags.imported = true; state.flags.importOn = todayISO();
      if (rows.length) state.ui.month = rows.map((r) => r.date).sort().pop().slice(0, 7);
      const paid = markBillsPaid(rows);
      const balNotes = [];
      for (const b of pendingImport.balances || []) {
        if (!b.apply) continue;
        let a = state.accounts.find((x) => x.id === b.accountId);
        if (!a) { a = { id: uid(), name: b.newName, type: b.type, balance: 0 }; state.accounts.push(a); }
        const was = +a.balance || 0; a.balance = b.amount; a.updated = todayISO(); a.asOf = b.date; a.example = false; delete a.manualOn;
        balNotes.push(a.name + ": " + money2(was) + " → " + money2(b.amount));
      }
      if (balNotes.length) { snapshotNet(); setTimeout(() => toast("⚖️ The Pig Picture updated. " + esc(balNotes.join(", "))), 1800); }
      pendingImport = null; award(Math.min(100, rows.length * 2), "Imported " + rows.length + " transactions"); commit();
      setTimeout(() => billCheckModal(paid), 2600);
    },
    delRule(el) { state.rules.splice(+el.dataset.i, 1); commit("Rule removed"); },
    editCat(el) { catModal(el.dataset.id ? state.categories.find((c) => c.id === el.dataset.id) : null, el.dataset.group); },
    delCat(el) {
      if (state.categories.filter((c) => c.group === "income").length <= 1 && catById(el.dataset.id).group === "income") { toast("Keep at least one income category"); return; }
      state.categories = state.categories.filter((c) => c.id !== el.dataset.id);
      state.transactions.forEach((t) => { if (t.cat === el.dataset.id) t.cat = "other"; });
      closeModal(); commit("Category deleted. Its transactions moved to Other.");
    },
    pickIcon(el) { const f = el.closest("form"); f.icon.value = el.dataset.v; $$(".icon-grid button", f).forEach((b) => b.classList.toggle("on", b === el)); },
    pickColor(el) { const f = el.closest("form"); f.color.value = el.dataset.v; $$(".swatches button", f).forEach((b) => b.classList.toggle("on", b === el)); },
    pickTheme(el) { const f = el.closest("form"); f.theme.value = el.dataset.v; $$(".swatches button", f).forEach((b) => b.classList.toggle("on", b === el)); },
    editSub(el) { subModal(el.dataset.id ? state.subs.find((s) => s.id === el.dataset.id) : null); },
    delSub(el) { state.subs = state.subs.filter((s) => s.id !== el.dataset.id); commit("Removed"); },
    addFound(el) { const f = detectSubs()[+el.dataset.i]; if (f) subModal({ name: f.name, amount: f.amount, cycle: "monthly", next: f.next, icon: "repeat", cat: billCat({ name: f.name, cat: f.cat }) }); },
    addFoundAll() {
      const found = window.__found || [], picks = [...document.querySelectorAll('.overlay input[name="found"]:checked')].map((x) => found[+x.value]).filter(Boolean);
      for (const f of picks) state.subs.push({ id: uid(), name: f.name, amount: f.amount, cycle: "monthly", next: f.next, icon: "repeat", status: "keep", reviewed: todayISO(), cat: billCat({ name: f.name, cat: f.cat }), lastPaid: f.lastPaid });
      closeModal(); commit();
      if (picks.length) setTimeout(() => celebrate("track", { pose: "proud", emoji: "📺", title: picks.length + (picks.length === 1 ? " bill" : " bills") + " added!", sub: "Penny will remind you before each one is charged, and they're in your budget now." }), 150);
    },
    copy(el) {
      const box = $(el.dataset.target); if (!box) return;
      const done = () => toast(icon("check") + " Copied");
      try { navigator.clipboard.writeText(box.value).then(done, () => { box.select(); toast("Press Ctrl+C or Cmd+C to copy"); }); }
      catch (e) { box.select(); toast("Press Ctrl+C or Cmd+C to copy"); }
    },
    editGoal(el) { goalModal(el.dataset.id ? state.goals.find((g) => g.id === el.dataset.id) : null); },
    delGoal(el) { state.goals = state.goals.filter((g) => g.id !== el.dataset.id); closeModal(); commit("Goal deleted"); },
    removePhoto(el) { const g = state.goals.find((x) => x.id === el.dataset.id); if (g) g.photo = null; closeModal(); commit("Photo removed"); },
    goalTpl(el) {
      const t = C.goalTemplates[+el.dataset.i], f = el.closest("form");
      f.name.value = t.name; f.icon.value = t.icon; f.theme.value = t.theme; if (t.account) f.account.value = t.account; if (t.target && !f.target.value) f.target.value = t.target;
      $$(".icon-grid button", f).forEach((b) => b.classList.toggle("on", b.dataset.v === t.icon));
      $$(".swatches button", f).forEach((b) => b.classList.toggle("on", +b.dataset.v === t.theme));
    },
    goalMoney(el) {
      const g = state.goals.find((x) => x.id === el.dataset.id), out = !!el.dataset.out;
      openModal('<form data-form="goalMoney" class="stack"><input type="hidden" name="id" value="' + g.id + '"><input type="hidden" name="out" value="' + (out ? 1 : "") + '"><h2>' + (out ? "Take money out of " : "Add money to ") + esc(g.name) + "</h2>" +
        field("Amount", moneyInput('name="amount" min="0.01" required placeholder="0"')) +
        (out ? "" : '<div class="row">' + [25, 50, 100, 250].map((v) => '<button type="button" class="btn soft sm" data-act="quickAmt" data-v="' + v + '">$' + v + "</button>").join("") + "</div>") +
        '<div class="row"><button class="btn">' + icon("check") + (out ? " Take out" : " Add it") + '</button><button type="button" class="btn ghost" data-close>Cancel</button></div></form>');
    },
    quickAmt(el) { el.closest("form").amount.value = el.dataset.v; },
    editAcct(el) { acctModal(el.dataset.id ? state.accounts.find((a) => a.id === el.dataset.id) : null); },
    delAcct(el) { state.accounts = state.accounts.filter((a) => a.id !== el.dataset.id); snapshotNet(); commit("Account removed"); },
    retireAcct(el) { state.retire.account = el.dataset.v; state.flags.retire = true; state.flags.retireOn = todayISO(); commit(); },
    retireRate(el) { state.retire.rate = +el.dataset.v; state.flags.retire = true; state.flags.retireOn = todayISO(); commit(); },
    housePrice(el) { state.house.price = +el.dataset.v; state.flags.house = true; commit(); },
    openLesson(el) { openLesson(el.dataset.id); },
    answer(el) {
      const l = C.lessons.find((x) => x.id === el.dataset.id), i = +el.dataset.i, right = i === l.quiz.answer;
      const msg = $("#quizMsg");
      el.classList.add(right ? "right" : "wrong");
      if (right) {
        $$("#quizOpts button").forEach((b) => (b.disabled = true));
        msg.innerHTML = "<b class=\"good\">Correct!</b> " + esc(l.quiz.explain);
        if (!state.profile.lessons[l.id]) {
          state.profile.lessons[l.id] = todayISO();
          award(C.xp.finishLesson + (quizTried[l.id] ? 0 : C.xp.perfectQuiz), "Lesson: " + l.title);
          celebrate("lesson", { confetti: false, ms: 2200 });
          evaluate(); save();
          const card = $('[data-act="openLesson"][data-id="' + l.id + '"]'); if (card) render();
        }
      } else { quizTried[l.id] = true; msg.innerHTML = "<b class=\"warn\">Not quite, but good guess!</b> Give another one a try."; }
    },
    remDone(el) {
      if (el.dataset.id) { const r = state.reminders.find((x) => x.id === el.dataset.id); if (r && r.repeat === "none") { r.done = !r.done; commit(); return; } }
      state.dismissed[el.dataset.key] = !state.dismissed[el.dataset.key]; commit();
    },
    remDel(el) { state.reminders = state.reminders.filter((r) => r.id !== el.dataset.id); commit("Reminder deleted"); },
    clearExample() {
      const base = blankState();
      for (const k of ["transactions", "subs", "goals", "accounts", "netHistory", "credit"]) state[k] = state[k].filter((x) => !x.example);
      state.tax = base.tax; state.retire = base.retire; state.house = base.house; state.isExample = false;
      commit("Example data cleared. It's all yours now!");
    },
    backup() { state.flags.backup = true; save(); offerFile("penny-pal-backup-" + todayISO() + ".json", JSON.stringify(state), "application/json"); evaluate(); },
    exportCsv() {
      const rows = [["Date", "Description", "Category", "Type", "Amount"]].concat(state.transactions.slice().sort((a, b) => a.date.localeCompare(b.date)).map((t) => [t.date, t.desc, catById(t.cat).name, t.kind, (t.kind === "expense" ? -1 : 1) * t.amount]));
      offerFile("penny-pal-transactions.csv", rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n"), "text/csv");
    },
    reset() {
      if (!resetArmed) { resetArmed = true; render(); setTimeout(() => { resetArmed = false; if (pageId() === "mydata") render(); }, 5000); return; }
      resetArmed = false; state = blankState(); checkIn(); applyTheme(); save(); render(); toast("Everything erased. Fresh start!");
    }
  };

  /* ==================================================================
     Form submits
     ================================================================== */
  function buildImport(raw, flip) {
    const have = new Set(state.transactions.map((t) => t.date + "|" + t.desc + "|" + (+t.amount).toFixed(2)));
    const all = readBankRows(raw, flip), rows = all.filter((r) => !have.has(r.date + "|" + r.desc + "|" + r.amount.toFixed(2)));
    return { rows, dupes: all.length - rows.length };
  }
  const FORM = {
    async syncUnlock(f, d) {
      const pw = String(d.password || ""); if (!pw) return;
      try { takeSession(await authCall("signin", sync.email, pw)); await setKey(pw); syncNote = ""; syncState = "idle"; await syncNow(true); }
      catch (e) { syncNote = authError(e); render(); }
    },
    wzAuth(f, d) { wzAuth(d.email, d.password); },
    syncSignIn(f, d, e) { const kind = (e && e.submitter && e.submitter.value) || "signin"; syncAuth(kind, d.email, d.password); },
    receiptText(f, d) { handleReceiptText(d.text || ""); },
    saveReceipt(f, d) {
      const amount = Math.abs(num(d.amount)); if (!amount) { toast("Type the total amount first"); return; }
      const t = { id: uid(), added: todayISO(), date: d.date || todayISO(), desc: (d.desc || "").trim() || "Receipt", amount, kind: "expense", cat: d.cat || "other", receipt: true };
      state.transactions.push(t);
      if (d.learn && t.desc !== "Receipt") { const words = t.desc.toUpperCase().replace(/[#*]?\d.*$/, "").trim().split(/\s+/).slice(0, 2).join(" "); if (words && !state.rules.some((r) => r.match.toUpperCase() === words)) state.rules.unshift({ match: words, cat: t.cat }); }
      if (d.bill && !state.subs.some((x) => x.name.toLowerCase() === t.desc.toLowerCase())) state.subs.push({ id: uid(), name: t.desc, amount, cycle: "monthly", next: toISO(addMonths(parseISO(t.date), 1)), icon: "receipt", status: "keep", reviewed: todayISO() });
      award(C.xp.logTransaction + 5, "Receipt scanned");
      state.ui.month = t.date.slice(0, 7); closeModal(); commit();
      setTimeout(() => celebrate("track", { emoji: "🧾", title: "Receipt saved!", sub: money2(amount) + " at " + t.desc + " is in " + catById(t.cat).name + "." }), 150);
    },
    wizard() { wzAdvance(true); },
    pathAdd(f, d) {
      const text = (d.text || "").trim(); if (!text) return;
      (state.path.custom[d.step] = state.path.custom[d.step] || []).push({ id: "c" + uid(), text });
      pathOpen[d.step] = true; commit("Added to your checklist ✍️");
    },
    saveTx(f, d) {
      const amount = Math.abs(num(d.amount)); if (!amount) { toast("Type an amount above zero"); return; }
      const t = { date: d.date || todayISO(), desc: (d.desc || "").trim() || catById(d.cat).name, amount, kind: d.kind, cat: d.cat || "other" };
      if (d.id) { const old = state.transactions.find((x) => x.id === d.id); if (old.cat !== t.cat) t.recatOn = todayISO(); Object.assign(old, t, { example: false }); }
      else {
        state.transactions.push(Object.assign({ id: uid(), added: todayISO() }, t)); award(C.xp.logTransaction, "Oink! Logged it");
        const paidNow = markBillsPaid([t]); if (paidNow.length) setTimeout(() => toast("✅ " + esc(paidNow[0].sb.name) + " marked as paid. Next one " + esc(dayLabel(nextCharge(paidNow[0].sb)))), 1200);
        const realCount = state.transactions.filter((x) => !x.example).length, grp = catById(t.cat).group;
        setTimeout(() => {
          if (grp === "save") celebrate("save", { sub: money2(amount) + " moved to " + catById(t.cat).name + ". Future you says thanks!" });
          else if (t.kind === "income") celebrate("income", { confetti: false });
          else if (realCount === 1) celebrate("firstTx");
          else if (realCount % 5 === 0) celebrate("track", { confetti: false, ms: 2200 });
        }, 150);
      }
      if (d.learn && t.desc) { const words = t.desc.toUpperCase().replace(/[#*]?\d.*$/, "").trim().split(/\s+/).slice(0, 2).join(" "); if (words) state.rules.unshift({ match: words, cat: t.cat }); }
      state.ui.month = t.date.slice(0, 7); closeModal(); commit();
    },
    addRule(f, d) {
      const match = d.match.trim().toUpperCase(); if (!match) return;
      state.rules.unshift({ match, cat: d.cat }); commit("Rule added: " + esc(match) + " → " + esc(catById(d.cat).name));
      const box = $('form[data-form="addRule"]'); if (box) { const det = box.closest("details"); if (det) det.open = true; const sel = box.querySelector("select[name=cat]"); if (sel) sel.value = d.cat; const inp = box.querySelector("input[name=match]"); if (inp) inp.focus({ preventScroll: true }); }
    },
    saveCat(f, d) {
      const c = { name: d.name.trim(), group: d.group, budget: Math.max(0, num(d.budget)), icon: d.icon, color: d.color, touched: true, touchedOn: todayISO() };
      if (d.id) Object.assign(state.categories.find((x) => x.id === d.id), c);
      else state.categories.push(Object.assign({ id: "c" + uid() }, c));
      closeModal(); commit("Saved");
    },
    saveSub(f, d) {
      const s = { name: d.name.trim(), amount: Math.abs(num(d.amount)), cycle: d.cycle, next: d.next || todayISO(), icon: d.icon, cat: d.cat || undefined };
      s.reviewed = todayISO();
      if (d.id) Object.assign(state.subs.find((x) => x.id === d.id), s, { example: false });
      else state.subs.push(Object.assign({ id: uid(), status: "keep" }, s));
      closeModal(); commit("Saved");
    },
    saveGoal(f, d) {
      const g = { name: d.name.trim(), target: Math.abs(num(d.target)), saved: Math.max(0, num(d.saved)), date: d.date, account: d.account, icon: d.icon, theme: num(d.theme) };
      if (d.id) Object.assign(state.goals.find((x) => x.id === d.id), g, { example: false });
      else state.goals.push(Object.assign({ id: uid(), photo: null, history: [] }, g));
      closeModal(); commit(d.id ? "Goal saved" : "Goal created. Let's fill it up!");
    },
    goalMoney(f, d) {
      const g = state.goals.find((x) => x.id === d.id), amt = Math.abs(num(d.amount)) * (d.out ? -1 : 1);
      if (!amt) return;
      const before = g.target ? g.saved / g.target : 0;
      g.saved = Math.max(0, g.saved + amt); g.history = g.history || []; g.history.push({ date: todayISO(), amount: amt });
      const after = g.target ? g.saved / g.target : 0;
      closeModal();
      if (amt > 0) {
        state.flags.goalDeposit = true; award(C.xp.addToGoal, "Saved " + money(amt));
        const hit = [0.25, 0.5, 0.75, 1].find((m) => before < m && after >= m);
        if (hit) award(hit === 1 ? 100 : 20, hit === 1 ? "Goal complete: " + g.name : Math.round(hit * 100) + "% of " + g.name);
        setTimeout(() => {
          if (hit === 1) celebrate("goalDone", { sub: g.name + ": " + money(g.target) + " saved. You did it!" });
          else if (hit) celebrate("milestone", { title: Math.round(hit * 100) + "% of " + g.name + "!", sub: money(g.saved) + " saved so far. Keep going!" });
          else celebrate("save", { sub: money(amt) + " added to " + g.name + ". Only " + money(Math.max(0, g.target - g.saved)) + " to go!" });
        }, 150);
      }
      commit();
    },
    saveAcct(f, d) {
      const a = { name: d.name.trim() || acctType(d.type).name, type: d.type, balance: Math.abs(num(d.balance)), updated: todayISO(), manualOn: todayISO() };
      if (d.id) { const ex = state.accounts.find((x) => x.id === d.id); Object.assign(ex, a, { example: false }); delete ex.asOf; }
      else state.accounts.push(Object.assign({ id: uid() }, a));
      snapshotNet(); closeModal(); commit("Saved");
    },
    addScore(f, d) { state.credit.push({ date: d.date || todayISO(), score: clamp(Math.round(num(d.score)), 300, 900), added: todayISO() }); commit("Score saved"); },
    addRem(f, d) { state.reminders.push({ id: uid(), date: d.date, text: d.text.trim(), repeat: d.repeat, done: false, created: todayISO() }); commit("Reminder added"); }
  };

  /* ==================================================================
     Dropdowns, checkboxes and file inputs
     ================================================================== */
  const CHG = {
    efPct(el) { state.efund = state.efund || { needsPct: 100, wantsPct: 75 }; state.efund[el.dataset.k] = Math.max(0, Math.min(200, num(el.value))); commit(); },
    txPick(el) { if (el.checked) selIds.add(el.dataset.id); else selIds.delete(el.dataset.id); render(); },
    selAll(el) { (window.__lastShown || []).forEach((id) => { if (el.checked) selIds.add(id); else selIds.delete(id); }); render(); },
    balApply(el) { const b = pendingImport && pendingImport.balances[+el.dataset.i]; if (b) b.apply = el.checked; },
    balAcct(el) {
      const b = pendingImport && pendingImport.balances[+el.dataset.i]; if (!b) return;
      b.accountId = el.value; const a = state.accounts.find((x) => x.id === el.value);
      b.known = a ? acctAsOf(a) : ""; b.typedByYou = !!(a && (!a.asOf || (a.manualOn && a.manualOn > a.asOf)));
      b.newer = !a || !b.known || (b.typedByYou ? b.date > b.known : b.date >= b.known);
      b.apply = b.days <= 31 && b.newer; render();
    },
    importSkip(el) { const p = pendingImport; if (!p) return; p.skip = p.skip || {}; p.skip[+el.dataset.i] = !el.checked; const n = p.rows.length - Object.values(p.skip).filter(Boolean).length; const b = $('[data-act="doImport"]'); if (b) b.lastChild.textContent = " Import " + n; },
    receiptFile(el) { const f = el.files && el.files[0]; el.value = ""; handleReceiptFile(f); },
    mascotStyle(el) { state.ui.mascot = el.value; save(); render(); burst(["💖", "✨", "🐷"], 8, 0.6); toast("🐷 " + esc(C.mascotName || "Penny") + " loves the new look!"); },
    wzGoal(el) { const t = C.goalTemplates[+el.value], box = $('#wzForm input[name="goalTarget"]'); if (box && t && t.target && !box.value) box.value = t.target; },
    pathItem(el) {
      const k = el.dataset.k;
      if (el.checked) { state.path.done[k] = todayISO(); burst(["✅", "✨", "⭐"]); toast("✅ Checked off. Nice!"); } else delete state.path.done[k];
      pathOpen[k.split(".")[0]] = true; commit();
    },
    calmMode(el) { state.ui.calm = el.checked; applyTheme(); save(); toast(el.checked ? "🍃 Calm mode on. Everything stays still." : "Animations are back ✨"); },
    celebrate(el) { state.ui.celebrate = el.checked; save(); if (el.checked) celebrate("save", { title: "Celebrations on!", sub: "Get ready for confetti 🎉" }); },
    txSearch(el) { if (state.ui.q === el.value) return; state.ui.q = el.value; render(); const s = $('[data-change="txSearch"]'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } },
    txCat(el) { state.ui.cat = el.value; render(); },
    txCatInline(el) { const t = state.transactions.find((x) => x.id === el.dataset.id); t.cat = el.value; t.kind = kindForCat(el.value, t.kind); t.recatOn = todayISO(); commit("Moved " + esc(t.desc) + " to " + esc(catById(el.value).name)); },
    importCat(el) {
      const p = pendingImport, r = p && p.rows[+el.dataset.i]; if (!r) return;
      r.cat = el.value; r.kind = kindForCat(el.value, r.kind); r.picked = true;
      const btn = el.closest("tr").querySelector(".amt-flip");
      if (btn) { btn.textContent = (r.kind === "income" ? "+" : "-") + money2(r.amount); btn.classList.toggle("good", r.kind === "income"); }
    },
    txKind(el) { const pick = $("#catPick"); if (pick) pick.innerHTML = catPick(el.value, null); },
    catBudget(el) { const c = state.categories.find((x) => x.id === el.dataset.id); const floor = Math.ceil(billsMonthly(c.id)); c.budget = Math.max(0, num(el.value)); if (c.budget < floor) { c.budget = floor; toast("Your bills in " + esc(c.name) + " already add up to " + money(floor) + " a month, so the budget can't go lower"); } c.touched = true; c.touchedOn = todayISO(); commit(); },
    subStatus(el) {
      const s = state.subs.find((x) => x.id === el.dataset.id); s.status = el.value; s.reviewed = todayISO(); s.example = false;
      if (el.value === "cancelled") { s.cancelledOn = todayISO(); commit(); celebrate("cancel", { sub: "That's " + money(monthlyCost(s) * 12) + " a year back in your pocket." }); }
      else commit();
    },
    importFile(el) { const files = Array.from(el.files || []); el.value = ""; importFiles(files); },
    goalPhoto(el) {
      const g = state.goals.find((x) => x.id === el.dataset.id);
      readPhoto(el.files && el.files[0], (url) => { g.photo = url; commit(icon("image") + " Photo added"); });
    },
    acctBal(el) { const a = state.accounts.find((x) => x.id === el.dataset.id); a.balance = num(el.value); a.example = false; a.updated = todayISO(); a.manualOn = todayISO(); delete a.asOf; snapshotNet(); commit(); },
    showTaxCal(el) { state.ui.showTaxCal = el.checked; commit(); },
    theme(el) { state.ui.theme = el.value; applyTheme(); save(); },
    restore(el) {
      const file = el.files && el.files[0]; if (!file) return;
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const s = JSON.parse(String(fr.result)); if (!s || !Array.isArray(s.transactions) || !s.profile) throw new Error("bad");
          state = normalize(s); applyTheme(); evaluate(); save(); render(); toast(icon("check") + " Backup restored");
        } catch (e) { toast("That file isn't a Penny Pal backup."); }
      };
      fr.readAsText(file);
    }
  };

  /* ==================================================================
     Wiring
     ================================================================== */
  function formData(f) { const d = {}; new FormData(f).forEach((v, k) => (d[k] = v)); return d; }
  /* "Just look around" mode: example data you can browse but not change */
  const LOOK_OK_ACTS = new Set(["openFeed", "month", "nextFact", "openLesson", "pageHelp", "pennyPoke", "copy", "closeCheer", "startSetup", "openWizard", "syncKeepAccount", "syncKeepDevice", "syncNow", "lookMine", "lookKeep",
    "wzStart", "wzSignIn", "wzAuthToggle", "wzAuthSkip", "wzCheckAgain", "wzSetupHere", "wzExample", "wzHome", "wzLater", "wzBack", "wzSkip", "wzCheckin"]);
  const LOOK_OK_CHANGES = new Set(["txSearch", "txCat", "calmMode", "celebrate"]);
  function lookOnlyBlocks(el, kind) {
    if (!state || !state.isExample || !el || !el.closest) return false;
    if (el.closest("#wizard, .sync-card, .look-nudge")) return false;
    if (kind === "act") { const a = el.closest("[data-act]"); return !!a && !LOOK_OK_ACTS.has(a.dataset.act); }
    if (kind === "form") { const f = el.closest("form[data-form]"); return !!f && !["syncSignIn", "wzAuth"].includes(f.dataset.form); }
    const field = el.closest("input, select, textarea"); if (!field || !field.closest("#view, .overlay")) return false;
    const ch = field.dataset && field.dataset.change; if (ch && LOOK_OK_CHANGES.has(ch)) return false;
    return true;
  }
  let lookNudgeAt = 0;
  function lookNudge() {
    if (Date.now() - lookNudgeAt < 300 || $(".look-nudge")) return; lookNudgeAt = Date.now();
    openModal('<div class="ci look-nudge">' + (pennyOn() ? mascot(130, "P", "surprised") : '<div class="ci-emoji">👀</div>') +
      "<h2>This is just example data</h2><p>You can look around all you like! To add your own stuff, let's make your account first. It takes a minute.</p>" +
      '<div class="row" style="justify-content:center"><button class="btn" data-act="lookMine">Make it mine ✨</button><button class="btn ghost" data-act="lookKeep">Keep looking</button></div></div>');
  }
  function guardLookAround() {
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); lookNudge(); };
    window.addEventListener("click", (e) => {
      if (lookOnlyBlocks(e.target, "act")) return stop(e);
      const t = e.target; if (t && t.matches && t.matches("input[type=checkbox], input[type=radio], input[type=file], label, label *") && lookOnlyBlocks(t.closest("label") ? (t.closest("label").querySelector("input") || t) : t, "field")) return stop(e);
    }, true);
    window.addEventListener("submit", (e) => { if (lookOnlyBlocks(e.target, "form")) stop(e); }, true);
    // stop dropdowns and text boxes before they open
    window.addEventListener("pointerdown", (e) => { const t = e.target; if (t && t.closest && t.closest("select, input:not([type=checkbox]):not([type=radio]), textarea") && lookOnlyBlocks(t, "field")) { e.preventDefault(); setTimeout(lookNudge, 0); } }, true);
    window.addEventListener("focusin", (e) => { const t = e.target; if (lookOnlyBlocks(t, "field") && !(t.type === "checkbox" || t.type === "radio")) setTimeout(() => { if (document.activeElement === t) t.blur(); lookNudge(); }, 0); }, true);
    window.addEventListener("input", (e) => { if (lookOnlyBlocks(e.target, "field")) e.stopImmediatePropagation(); }, true);
    window.addEventListener("change", (e) => { if (lookOnlyBlocks(e.target, "field")) { e.stopImmediatePropagation(); setTimeout(render, 0); } }, true);
  }

  function wire() {
    guardLookAround();
    document.addEventListener("dragover", (e) => { const d = e.target.closest && e.target.closest("#importBox .drop"); if (d) { e.preventDefault(); d.classList.add("over"); } });
    document.addEventListener("dragleave", (e) => { const d = e.target.closest && e.target.closest("#importBox .drop"); if (d) d.classList.remove("over"); });
    document.addEventListener("drop", (e) => { const d = e.target.closest && e.target.closest("#importBox .drop"); if (!d) return; e.preventDefault(); d.classList.remove("over"); if (state.isExample) return lookNudge(); importFiles(e.dataTransfer && e.dataTransfer.files); });
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-act]"); if (!a || a.disabled) return;
      const fn = ACT[a.dataset.act]; if (fn) { e.preventDefault(); fn(a, e); }
    });
    document.addEventListener("submit", (e) => {
      const f = e.target.closest("form[data-form]"); if (!f) return;
      e.preventDefault(); const fn = FORM[f.dataset.form]; if (fn) fn(f, formData(f), e);
    });
    document.addEventListener("change", (e) => {
      if (e.target.name === "cat" && e.target.closest && e.target.closest('form[data-form="saveSub"]')) e.target.dataset.picked = "1";
      if (e.target.name === "cat" && e.target.closest && e.target.closest("#catPick") && e.isTrusted) e.target.closest("#catPick").dataset.picked = "1";
      const el = e.target.closest("[data-change]"); if (el && CHG[el.dataset.change]) CHG[el.dataset.change](el, e);
    });
    let searchTimer;
    document.addEventListener("input", (e) => {
      const el = e.target;
      // add/edit transaction: pick the category from what you type (until you tap one yourself)
      if (el.name === "desc" && el.closest && el.closest('form[data-form="saveTx"]')) {
        const f = el.form, box = f.querySelector("#catPick");
        if (box && !box.dataset.picked) { const kind = (f.querySelector("input[name=kind]:checked") || {}).value || "expense", g = explainCat(el.value, kind);
          const hint = f.querySelector(".cat-hint");
          if (g) { const r = box.querySelector('input[name=cat][value="' + g.cat + '"]'); if (r) { r.checked = true; if (hint) hint.textContent = "✨ " + g.why; } } else if (hint) hint.textContent = ""; }
      }
      // bill form: pick the budget category from the name as you type (until you choose one yourself)
      if (el.name === "name" && el.closest && el.closest('form[data-form="saveSub"]')) { const sel = el.form.querySelector("select[name=cat]"); if (sel && !sel.dataset.picked) sel.value = billCat({ name: el.value }); }
      if (el.dataset && el.dataset.change === "txSearch") { clearTimeout(searchTimer); searchTimer = setTimeout(() => CHG.txSearch(el), 250); return; }
      const path = el.dataset && el.dataset.bind; if (!path) return;
      const [a, b] = path.split(".");
      state[a][b] = el.type === "checkbox" ? el.checked : el.type === "number" ? num(el.value) : el.value;
      if (el.dataset.flag) { state.flags[el.dataset.flag] = true; state.flags[el.dataset.flag + "On"] = todayISO(); }
      save();
      const p = PAGES[pageId()]; if (p.update) p.update();
      clearTimeout(wire.t); wire.t = setTimeout(evaluate, 600);
    });
    document.addEventListener("error", (e) => {
      const img = e.target; if (!img || img.tagName !== "IMG") return;
      const wrap = img.closest(".mascot-img"); if (wrap) wrap.outerHTML = mascot(+wrap.dataset.size || 80, "A");
    }, true);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (modalEl) closeModal(); else if ($("#wizard") && (state.ui.setupStep || 0) >= 0) ACT.wzLater(); } });
    window.addEventListener("hashchange", () => {
      if (skipHash) { skipHash = false; return; }
      closeModal(); render(); evaluate(); save();
    });
  }

  /* ==================================================================
     Start
     ================================================================== */
  state = load();
  applyTheme();
  wire();
  checkIn();
  evaluate();
  render();
  save();
  checkSnow();
  startSync();
  (function pinTabs() {
    const tb = $("#topbar"); if (!tb) return;
    const setH = () => document.documentElement.style.setProperty("--tb-h", tb.offsetHeight + "px");
    setH(); if (window.ResizeObserver) new ResizeObserver(setH).observe(tb); else window.addEventListener("resize", setH);
  })();
  if (freshVisit) { state.ui.seenVersion = C.version; state.ui.setupStep = -1; renderWizard(); state.ui.setupStep = 0; }
  if (state.ui.seenVersion !== C.version) {
    const firstVisit = state.isExample && !state.profile.xp;
    state.ui.seenVersion = C.version; save();
    if (!firstVisit && C.whatsNew && C.whatsNew.length) setTimeout(() => openModal('<div class="stack"><div style="font-size:2.4rem;line-height:1">✨</div><h2>What\'s new in ' + esc(C.appName) + "</h2>" +
      '<ul class="stack small" style="padding-left:1.1em">' + C.whatsNew.map((x) => "<li>" + x + "</li>").join("") + "</ul>" +
      '<div class="row"><a class="btn" href="#path" data-close>Show me Piggy Quests</a><button class="btn ghost" data-close>Got it</button></div></div>'), 1200);
  }
  if (defaultsAdded && (defaultsAdded.cats || defaultsAdded.rules)) {
    const bits = [];
    if (defaultsAdded.cats) bits.push(defaultsAdded.cats + " new " + (defaultsAdded.cats === 1 ? "category" : "categories"));
    if (defaultsAdded.rules) bits.push(defaultsAdded.rules + " new auto-sort " + (defaultsAdded.rules === 1 ? "rule" : "rules"));
    setTimeout(() => toast(icon("sparkles") + " App updated: " + bits.join(" and ") + " added"), 900);
  }
})();
