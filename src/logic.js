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

const state = {
  cat: "all",
  status: "all",
  q: "",
  sort: "deadline",
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

  catEl.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    state.cat = b.dataset.key; render();
  }));
  statusEl.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.key;
    state.status = (k === "hiatus") ? "hiatus_or_curated" : k;
    render();
  }));
}

function matchesFilters(f) {
  if (state.cat !== "all" && f.cat !== state.cat) return false;
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
  return `
  <article class="card ${meta.cls.replace('st-','st-')}" data-status="${f._status}">
    <div class="card-top">
      <div class="card-id">
        <h3>${f.name}</h3>
        <div class="loc"><span class="tag">${CATS[f.cat].split("—")[0].trim()}</span> ${f.loc}</div>
      </div>
      <span class="badge ${meta.cls}">${meta.label}</span>
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

function render() {
  renderStats();
  document.querySelectorAll('[data-kind="cat"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.key === state.cat));
  document.querySelectorAll('[data-kind="status"]').forEach(b => {
    const active = (b.dataset.key === "hiatus") ? state.status === "hiatus_or_curated" : b.dataset.key === state.status;
    b.setAttribute("aria-pressed", active);
  });

  const main = document.getElementById("main");
  const order = ["alist","genre","indian","ai"];
  main.innerHTML = order.map(catKey => {
    const list = sortFestivals(FESTIVALS.filter(f => f.cat === catKey && matchesFilters(f)));
    if (state.cat !== "all" && state.cat !== catKey) return "";
    const totalInCat = FESTIVALS.filter(f => f.cat === catKey).length;
    if (list.length === 0) {
      if (state.cat !== catKey && state.cat !== "all") return "";
      return `<section class="group"><div class="group-head"><h2>${CATS[catKey]}</h2><span class="count">0 / ${totalInCat}</span></div><p class="group-empty">No festivals in this view match the current filters.</p></section>`;
    }
    return `<section class="group">
      <div class="group-head"><h2>${CATS[catKey]}</h2><span class="count">${list.length} / ${totalInCat}</span></div>
      ${list.map(cardHTML).join("")}
    </section>`;
  }).join("");
}

document.getElementById("search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
document.getElementById("sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

renderFilters();
render();
