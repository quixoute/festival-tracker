const STATUS_META = {
  open:     { label:"Open",              cls:"st-open" },
  soon:     { label:"Closing Soon",      cls:"st-soon" },
  closed:   { label:"Closed",            cls:"st-closed" },
  tba:      { label:"Next Cycle TBA",    cls:"st-tba" },
  hiatus:   { label:"On Hiatus",         cls:"st-inactive" },
  curated:  { label:"Curated — No Open Call", cls:"st-inactive" },
  info:     { label:"Not an AI Festival", cls:"st-info" },
};

const SOON_WINDOW_DAYS = 21;
const NOW = new Date();
const SHORTLIST_KEY = "callsheet_shortlist_v1";
const CURRENCY_ORDER = ["USD","EUR","GBP","CHF","CAD","INR"];
const CURRENCY_SYMBOL = { USD:"$", EUR:"€", GBP:"£", CHF:"CHF ", CAD:"C$", INR:"₹" };

function computeStatus(f) {
  if (f.disambig) return "info";
  if (f.statusOverride === "hiatus") return "hiatus";
  if (f.statusOverride === "curated") return "curated";
  if (!f.deadlineISO) return "tba";
  const dl = new Date(f.deadlineISO + "T23:59:59");
  const daysLeft = Math.ceil((dl - NOW) / 86400000);
  if (daysLeft < 0) return "closed";
  if (daysLeft <= SOON_WINDOW_DAYS) return "soon";
  return "open";
}

function daysLeftLabel(f, status) {
  if (!f.deadlineISO || !(status === "open" || status === "soon")) return null;
  const dl = new Date(f.deadlineISO + "T23:59:59");
  const daysLeft = Math.ceil((dl - NOW) / 86400000);
  if (daysLeft === 0) return "Closes today";
  if (daysLeft === 1) return "1 day left";
  return daysLeft + " days left";
}

// Precompute
FESTIVALS.forEach(f => { f._status = computeStatus(f); });

// ---------------- Shortlist (localStorage) ----------------
function loadShortlist() {
  try {
    const raw = localStorage.getItem(SHORTLIST_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) { return new Set(); }
}
function saveShortlist() {
  try { localStorage.setItem(SHORTLIST_KEY, JSON.stringify([...shortlist])); } catch (e) {}
}
const shortlist = loadShortlist();

function toggleShortlist(id) {
  if (shortlist.has(id)) shortlist.delete(id); else shortlist.add(id);
  saveShortlist();
  render();
}

const state = {
  cat: "all",
  status: "all",
  format: "all",
  q: "",
  sort: "deadline",
  shortlistOnly: false,
};

function renderStats() {
  const total = FESTIVALS.filter(f => !f.disambig).length;
  const open = FESTIVALS.filter(f => f._status === "open").length;
  const soon = FESTIVALS.filter(f => f._status === "soon").length;
  const indian = FESTIVALS.filter(f => f.cat === "indian" && !f.disambig).length;
  const el = document.getElementById("stats");
  el.innerHTML = `
    <div class="stat"><div class="num">${total}</div><div class="label">Festivals tracked</div></div>
    <div class="stat is-open"><div class="num">${open}</div><div class="label">Open now</div></div>
    <div class="stat is-soon"><div class="num">${soon}</div><div class="label">Closing ≤21 days</div></div>
    <div class="stat"><div class="num">${indian}</div><div class="label">India-based</div></div>
  `;
}

function renderShortlistBar() {
  const el = document.getElementById("shortlist-bar");
  const items = FESTIVALS.filter(f => shortlist.has(f.id));
  if (items.length === 0) {
    el.innerHTML = `<div class="shortlist-empty">☆ Star festivals below to build a shortlist — this bar will total up their entry fees for you.</div>`;
    el.classList.remove("has-items");
    return;
  }
  el.classList.add("has-items");
  const totals = {};
  let unconfirmedCount = 0;
  items.forEach(f => {
    if (typeof f.feeAmount === "number" && f.feeCurrency) {
      totals[f.feeCurrency] = (totals[f.feeCurrency] || 0) + f.feeAmount;
    } else {
      unconfirmedCount++;
    }
  });
  const totalParts = CURRENCY_ORDER.filter(c => totals[c] !== undefined).map(c =>
    `${CURRENCY_SYMBOL[c] || c + " "}${totals[c].toLocaleString()}`
  );
  Object.keys(totals).forEach(c => { if (!CURRENCY_ORDER.includes(c)) totalParts.push(`${c} ${totals[c].toLocaleString()}`); });
  const totalStr = totalParts.length ? totalParts.join(" + ") : "$0";

  el.innerHTML = `
    <div class="shortlist-summary">
      <strong>${items.length}</strong> shortlisted
      <span class="sep">·</span>
      Fee total: <strong>${totalStr}</strong>
      ${unconfirmedCount ? `<span class="sep">·</span><span class="muted">${unconfirmedCount} unconfirmed fee${unconfirmedCount>1?'s':''} not included</span>` : ""}
    </div>
    <div class="shortlist-actions">
      <button class="chip" id="shortlist-toggle-view" aria-pressed="${state.shortlistOnly}">View shortlist only</button>
      <button class="chip chip-ghost" id="shortlist-clear">Clear</button>
    </div>
  `;
  document.getElementById("shortlist-toggle-view").addEventListener("click", () => {
    state.shortlistOnly = !state.shortlistOnly; render();
  });
  document.getElementById("shortlist-clear").addEventListener("click", () => {
    shortlist.clear(); saveShortlist(); render();
  });
}

function renderFilters() {
  const catEl = document.getElementById("cat-filters");
  const cats = [["all","All categories"], ...Object.entries(CATS)];
  catEl.innerHTML = cats.map(([key,label]) =>
    `<button class="chip" data-kind="cat" data-key="${key}" aria-pressed="${state.cat===key}">${label}</button>`
  ).join("");

  const statusEl = document.getElementById("status-filters");
  const statuses = [["all","All statuses"], ["open","Open"], ["soon","Closing soon"], ["closed","Closed"], ["tba","TBA"], ["hiatus","Inactive"]];
  statusEl.innerHTML = statuses.map(([key,label]) =>
    `<button class="chip" data-kind="status" data-key="${key}" aria-pressed="${state.status===key}">${label}</button>`
  ).join("");

  const formatEl = document.getElementById("format-filters");
  const formats = [["all","All formats"], ...Object.entries(FORMATS)];
  formatEl.innerHTML = formats.map(([key,label]) =>
    `<button class="chip" data-kind="format" data-key="${key}" aria-pressed="${state.format===key}">${label}</button>`
  ).join("");

  catEl.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    state.cat = b.dataset.key; render();
  }));
  statusEl.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.key;
    state.status = (k === "hiatus") ? "hiatus_or_curated" : k;
    render();
  }));
  formatEl.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    state.format = b.dataset.key; render();
  }));
}

function matchesFilters(f) {
  if (state.shortlistOnly && !shortlist.has(f.id)) return false;
  if (state.cat !== "all" && f.cat !== state.cat) return false;
  if (state.format !== "all" && f.format !== state.format) return false;
  if (state.status !== "all") {
    if (state.status === "hiatus_or_curated") {
      if (!(f._status === "hiatus" || f._status === "curated")) return false;
    } else if (f._status !== state.status) {
      return false;
    }
  }
  if (state.q) {
    const hay = (f.name + " " + f.loc + " " + (f.concept||"")).toLowerCase();
    if (!hay.includes(state.q.toLowerCase())) return false;
  }
  return true;
}

function sortFestivals(list) {
  const rank = { soon:0, open:0, tba:1, closed:2, hiatus:3, curated:3, info:4 };
  return list.slice().sort((a,b) => {
    if (state.sort === "az") return a.name.localeCompare(b.name);
    const ra = rank[a._status], rb = rank[b._status];
    if (ra !== rb) return ra - rb;
    if ((a._status === "open" || a._status === "soon") && (b._status === "open" || b._status === "soon")) {
      const da = a.deadlineISO ? new Date(a.deadlineISO) : new Date("2100-01-01");
      const db = b.deadlineISO ? new Date(b.deadlineISO) : new Date("2100-01-01");
      return da - db;
    }
    return a.name.localeCompare(b.name);
  });
}

function fieldRow(label, value, unconfirmed) {
  if (!value || value === "—") return "";
  return `<dt>${label}</dt><dd${unconfirmed ? ' class="unconfirmed"' : ''}>${value}</dd>`;
}

function cardHTML(f) {
  const meta = STATUS_META[f._status];
  const dleft = daysLeftLabel(f, f._status);
  const isUnconfFee = f.fee && /unconfirmed/i.test(f.fee);
  const starred = shortlist.has(f.id);
  return `
  <article class="card ${meta.cls.replace('st-','st-')}" data-status="${f._status}">
    <div class="card-top">
      <div class="card-id">
        <h3>${f.name}</h3>
        <div class="loc"><span class="tag">${CATS[f.cat].split("—")[0].trim()}</span>${f.format ? `<span class="tag tag-format">${FORMATS[f.format]}</span>` : ""} ${f.loc}</div>
      </div>
      <div class="card-top-right">
        <button class="star-btn ${starred ? 'is-starred' : ''}" data-star-id="${f.id}" aria-pressed="${starred}" aria-label="${starred ? 'Remove from' : 'Add to'} shortlist" title="${starred ? 'Remove from' : 'Add to'} shortlist">${starred ? '★' : '☆'}</button>
        <span class="badge ${meta.cls}">${meta.label}</span>
      </div>
    </div>
    <div class="card-meta">
      <div class="m-item"><span class="m-label">Event dates</span><span class="m-val">${f.dates || "—"}</span></div>
      <div class="m-item"><span class="m-label">Deadline</span><span class="m-val">${f.deadline || "—"}</span></div>
      ${dleft ? `<div class="m-item"><span class="m-label">Countdown</span><span class="m-val days-left ${meta.cls}">${dleft}</span></div>` : ""}
    </div>
    ${f.concept ? `<p class="card-concept">${f.concept}</p>` : ""}
    <dl class="facts">
      ${fieldRow("Entry fee", f.fee, isUnconfFee)}
      ${fieldRow("Formats", f.formats)}
      ${fieldRow("Documents needed", f.docs)}
      ${fieldRow("Platform", f.platform)}
    </dl>
    <div class="card-foot">
      ${f.url ? `<a href="${f.url}" target="_blank" rel="noopener noreferrer">Official site / submission page ↗</a>` : `<span></span>`}
      ${f.note ? `<span class="note">${f.note}</span>` : ""}
    </div>
  </article>`;
}

function attachStarHandlers() {
  document.querySelectorAll(".star-btn").forEach(b => {
    b.addEventListener("click", () => toggleShortlist(b.dataset.starId));
  });
}

function render() {
  renderStats();
  renderShortlistBar();
  document.querySelectorAll('[data-kind="cat"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.key === state.cat));
  document.querySelectorAll('[data-kind="status"]').forEach(b => {
    const active = (b.dataset.key === "hiatus") ? state.status === "hiatus_or_curated" : b.dataset.key === state.status;
    b.setAttribute("aria-pressed", active);
  });
  document.querySelectorAll('[data-kind="format"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.key === state.format));

  const main = document.getElementById("main");
  const order = ["alist","genre","indian","ai","script"];
  main.innerHTML = order.map(catKey => {
    const list = sortFestivals(FESTIVALS.filter(f => f.cat === catKey && matchesFilters(f)));
    if (state.cat !== "all" && state.cat !== catKey) return "";
    const totalInCat = FESTIVALS.filter(f => f.cat === catKey).length;
    if (totalInCat === 0) return "";
    if (list.length === 0) {
      if (state.cat !== catKey && state.cat !== "all") return "";
      return `<section class="group"><div class="group-head"><h2>${CATS[catKey]}</h2><span class="count">0 / ${totalInCat}</span></div><p class="group-empty">No festivals in this view match the current filters.</p></section>`;
    }
    return `<section class="group">
      <div class="group-head"><h2>${CATS[catKey]}</h2><span class="count">${list.length} / ${totalInCat}</span></div>
      ${list.map(cardHTML).join("")}
    </section>`;
  }).join("");
  attachStarHandlers();
}

document.getElementById("search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
document.getElementById("sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

renderFilters();
render();
