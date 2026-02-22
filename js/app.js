/* =========================
   KILLUMINAT — app.js (stable)
   ========================= */

const STORE_KEY = "killuminat_state_v1";
const DEFAULT_STATE = {
  xp: 0,
  unlockedLevel: 1,          // 1..5
  completedLevels: {},       // { "1": true, ... }
  secretUnlocked: false,
  sources: [],
  votes: { A: 0, B: 0 },
};

// ---------- State ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const obj = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...obj };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}
function saveState(state) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}
function addXP(amount) {
  const s = loadState();
  s.xp += Number(amount) || 0;
  saveState(s);
  renderStats();
}
function renderStats() {
  const s = loadState();

  const pairs = [
    ["statUnlocked", `${s.unlockedLevel}/5`],
    ["statXP", `${s.xp}`],
    ["statUnlocked2", `${s.unlockedLevel}/5`],
    ["statXP2", `${s.xp}`],
  ];

  for (const [id, val] of pairs) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  const secretLink = document.getElementById("secretLink");
  if (secretLink) secretLink.style.display = s.secretUnlocked ? "inline-block" : "none";

  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
}

// ---------- Helpers ----------
async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}
function qs(name) {
  return new URLSearchParams(location.search).get(name);
}
function isPage(filename) {
  // Works for /KiLLUMiNAT/index.html AND /KiLLUMiNAT/
  const p = location.pathname.toLowerCase();
  if (filename === "index.html") return p.endsWith("/") || p.endsWith("/index.html");
  return p.endsWith("/" + filename.toLowerCase());
}
function safe(fn) {
  try { fn(); } catch (e) { console.warn(e); }
}
async function safeAsync(fn) {
  try { await fn(); } catch (e) { console.warn(e); }
}

// ---------- Brand logo fallback (no inline onerror needed) ----------
function initBrandFallback() {
  const logo = document.getElementById("brandLogo");
  const text = document.getElementById("brandText");
  if (!logo || !text) return;

  const showText = () => {
    logo.style.display = "none";
    text.style.display = "inline-block";
  };

  logo.addEventListener("error", showText);
  // If already failed
  if (logo.complete && logo.naturalWidth === 0) showText();
}

// ---------- Secret mode ----------
const SECRET_PASSWORD = "ACCESS GRANTED";
let combo = [];
const COMBO_TARGET = ["levels", "map", "timeline", "glauben"]; // nav click order

function initSecretModal() {
  const modal = document.getElementById("secretModal");
  const openBtn = document.getElementById("openSecret");
  const pass = document.getElementById("secretPass");
  const submit = document.getElementById("secretSubmit");

  if (!modal || !openBtn || !pass || !submit) return;

  openBtn.addEventListener("click", () => {
    pass.value = "";
    modal.showModal();
  });

  submit.addEventListener("click", (e) => {
    e.preventDefault();
    const attempt = (pass.value || "").trim().toUpperCase();
    if (attempt === SECRET_PASSWORD) {
      unlockSecret();
      modal.close();
      location.href = "secret.html";
      return;
    }
    const hint = document.getElementById("secretHint");
    if (hint) hint.textContent = "Nope. Versuch’s nochmal… (Hint: ACCESS GRANTED)";
  });

  // click combo via nav links
  document.querySelectorAll(".nav a").forEach((a) => {
    a.addEventListener("click", () => {
      const label = (a.textContent || "").trim().toLowerCase();
      combo.push(label);
      combo = combo.slice(-COMBO_TARGET.length);
      if (combo.join("|") === COMBO_TARGET.join("|")) unlockSecret();
    });
  });
}

function unlockSecret() {
  const s = loadState();
  if (s.secretUnlocked) return;

  s.secretUnlocked = true;
  s.xp += 50;
  saveState(s);
  renderStats();

  // optional sound (only if file exists)
  try {
    const audio = new Audio("assets/sfx-access.mp3");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}

  alert("ACCESS GRANTED — Hidden Area unlocked (+50 XP)");
}

function initSecretPage() {
  // IMPORTANT: run ONLY on secret.html
  if (!isPage("secret.html")) return;

  // Guard only here
  const s = loadState();
  if (!s.secretUnlocked) {
    location.href = "index.html";
    return;
  }

  const btn = document.getElementById("lockSecret");
  const play = document.getElementById("playGlitch");
  const audio = document.getElementById("glitchAudio");

  if (play && audio) {
    play.addEventListener("click", () => {
      audio.volume = 0.6;
      audio.play().catch(() => {});
    });
  }

  if (btn) {
    btn.addEventListener("click", () => {
      const st = loadState();
      st.secretUnlocked = false;
      saveState(st);
      location.href = "index.html";
    });
  }
}

// ---------- Levels list ----------
async function initLevels() {
  if (!document.getElementById("levelsGrid")) return;

  const grid = document.getElementById("levelsGrid");
  const levels = await loadJSON("data/levels.json");
  const state = loadState();

  grid.innerHTML = "";
  levels.forEach((lvl) => {
    const locked = lvl.id > state.unlockedLevel;

    const a = document.createElement("a");
    a.className = "cardLink";
    a.href = locked ? "levels.html" : `level.html?id=${lvl.id}`;

    const card = document.createElement("div");
    card.className = "card";

    const badge = document.createElement("div");
    badge.className = `badge ${locked ? "badge--lock" : "badge--ok"}`;
    badge.textContent = locked
      ? "LOCKED"
      : (state.completedLevels[String(lvl.id)] ? "COMPLETED" : "UNLOCKED");

    card.innerHTML = `
      <div class="card__title">${lvl.kicker}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <div style="font-family:var(--mono); font-size:16px; letter-spacing:.06em;">${lvl.title}</div>
        <div style="font-family:var(--mono); color:rgba(155,176,207,.95);">+${lvl.xp} XP</div>
      </div>
      <p class="muted" style="line-height:1.6;">${lvl.description}</p>
    `;
    card.appendChild(badge);

    a.addEventListener("click", (e) => {
      if (locked) {
        e.preventDefault();
        alert(`Dieser Level ist gesperrt. Schließe Level ${state.unlockedLevel} ab, um weiterzukommen.`);
      }
    });

    a.appendChild(card);
    grid.appendChild(a);
  });

  const reset = document.getElementById("resetProgress");
  if (reset) {
    reset.addEventListener("click", () => {
      localStorage.removeItem(STORE_KEY);
      location.reload();
    });
  }
}

// ---------- Level detail ----------
async function initLevelDetail() {
  if (!document.getElementById("lvlTitle")) return;

  const id = Number(qs("id"));
  const title = document.getElementById("lvlTitle");

  const levels = await loadJSON("data/levels.json");
  const lvl = levels.find((x) => x.id === id);

  if (!lvl) {
    title.textContent = "Unbekannter Level";
    return;
  }

  const state = loadState();
  if (id > state.unlockedLevel) {
    alert("Dieser Level ist gesperrt.");
    location.href = "levels.html";
    return;
  }

  document.getElementById("lvlKicker").textContent = lvl.kicker;
  title.textContent = lvl.title;
  document.getElementById("lvlDesc").textContent = lvl.description;
  document.getElementById("lvlXP").textContent = `+${lvl.xp}`;
  document.getElementById("lvlStatus").textContent =
    state.completedLevels[String(id)] ? "COMPLETED" : "IN PROGRESS";

  const content = document.getElementById("lvlContent");
  content.innerHTML = `
    <ul class="list">
      ${lvl.contents.map((c) => `<li>${c}</li>`).join("")}
    </ul>
    <div class="divider"></div>
    <div class="subhead">Hinweis</div>
    <p class="muted">
      Dieser Level ist bewusst strukturiert. Du kannst später echte Artikel, Links, PDFs, Videos und Zitate hinzufügen.
    </p>
  `;

  const checks = document.getElementById("lvlChecks");
  checks.innerHTML = "";
  lvl.checks.forEach((ch, idx) => {
    const row = document.createElement("label");
    row.className = "check";
    row.innerHTML = `
      <input type="checkbox" data-check="${idx}" />
      <div>
        <div style="font-family:var(--mono); font-size:12px; letter-spacing:.08em;">${ch.title}</div>
        <div class="muted" style="margin-top:4px; line-height:1.55;">${ch.text}</div>
      </div>
    `;
    checks.appendChild(row);
  });

  const docs = document.getElementById("lvlDocs");
  docs.innerHTML = "";
  (lvl.docs || []).forEach((d) => {
    const li = document.createElement("li");
    li.innerHTML = `${d.title}${d.link ? ` — <a href="${d.link}" target="_blank" rel="noreferrer">open</a>` : ""}`;
    docs.appendChild(li);
  });

  const btn = document.getElementById("completeLevel");
  const note = document.getElementById("completeNote");
  btn.addEventListener("click", () => {
    const all = [...checks.querySelectorAll("input[type=checkbox]")];
    const done = all.every((x) => x.checked);

    if (!done) {
      note.textContent = "Du musst alle Checks abhaken, um abzuschließen.";
      return;
    }

    const s = loadState();
    if (!s.completedLevels[String(id)]) {
      s.completedLevels[String(id)] = true;
      s.xp += lvl.xp;

      if (s.unlockedLevel < 5 && id === s.unlockedLevel) {
        s.unlockedLevel = Math.min(5, s.unlockedLevel + 1);
      }

      saveState(s);
      renderStats();
      note.textContent = `Abgeschlossen! +${lvl.xp} XP.`;
      document.getElementById("lvlStatus").textContent = "COMPLETED";
    } else {
      note.textContent = "Dieser Level ist bereits abgeschlossen.";
    }
  });
}

// ---------- Map ----------
async function initMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  // Leaflet loaded?
  if (typeof window.L === "undefined") {
    console.warn("Leaflet not loaded");
    return;
  }

  const places = await loadJSON("data/places.json");
  const filter = document.getElementById("placeFilter");

  const map = L.map("map", { zoomControl: true, preferCanvas: true }).setView([30, 10], 2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "© OpenStreetMap © CARTO",
  }).addTo(map);

  let markers = [];

  function clearMarkers() {
    markers.forEach((m) => m.remove());
    markers = [];
  }

  function showPlace(p) {
    document.getElementById("placeTitle").textContent = p.name;
    document.getElementById("placeMeta").textContent = `${p.tagline} • Kategorie: ${p.category}`;
    document.getElementById("placeStory").textContent = p.story;

    const imgs = document.getElementById("placeImages");
    imgs.innerHTML = "";
    (p.images || []).forEach((t) => {
      const span = document.createElement("span");
      span.className = "pill";
      span.textContent = t;
      imgs.appendChild(span);
    });

    const docs = document.getElementById("placeDocs");
    docs.innerHTML = "";
    (p.docs || []).forEach((d) => {
      const li = document.createElement("li");
      li.innerHTML = `${d.title}${d.link ? ` — <a href="${d.link}" target="_blank" rel="noreferrer">open</a>` : ""}`;
      docs.appendChild(li);
    });

    const tl = document.getElementById("placeTimeline");
    tl.innerHTML = "";
    (p.timeline || []).forEach((t) => {
      const li = document.createElement("li");
      li.textContent = `${t.year}: ${t.text}`;
      tl.appendChild(li);
    });
  }

  function renderMarkers(category) {
    clearMarkers();
    places
      .filter((p) => (category === "all" ? true : p.category === category))
      .forEach((p) => {
        const m = L.marker([p.lat, p.lng]).addTo(map);
        m.on("click", () => showPlace(p));
        markers.push(m);
      });
  }

  renderMarkers("all");
  if (filter) filter.addEventListener("change", () => renderMarkers(filter.value));
}

// ---------- Timeline ----------
async function initTimeline() {
  const list = document.getElementById("timelineList");
  if (!list) return;

  const data = await loadJSON("data/timeline.json");
  const eras = [...new Set(data.map((x) => x.era))];
  const chips = document.getElementById("eraChips");

  let activeEra = "all";

  function renderChips() {
    if (!chips) return;
    chips.innerHTML = "";

    const mk = (label, era) => {
      const btn = document.createElement("button");
      btn.className = `chip ${activeEra === era ? "active" : ""}`;
      btn.textContent = label;
      btn.addEventListener("click", () => {
        activeEra = era;
        render();
        renderChips();
      });
      chips.appendChild(btn);
    };

    mk("Alle", "all");
    eras.forEach((e) => mk(e, e));
  }

  function showDetail(ev) {
    const box = document.getElementById("timelineDetail");
    if (!box) return;

    box.hidden = false;
    document.getElementById("tdTitle").textContent = ev.title;
    document.getElementById("tdMeta").textContent = `${ev.era} • ${ev.year}`;
    document.getElementById("tdBody").textContent = ev.body;

    const docs = document.getElementById("tdDocs");
    docs.innerHTML = "";
    (ev.docs || []).forEach((d) => {
      const li = document.createElement("li");
      li.innerHTML = `${d.title}${d.link ? ` — <a href="${d.link}" target="_blank" rel="noreferrer">open</a>` : ""}`;
      docs.appendChild(li);
    });

    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function render() {
    list.innerHTML = "";
    data
      .filter((x) => (activeEra === "all" ? true : x.era === activeEra))
      .forEach((ev) => {
        const item = document.createElement("div");
        item.className = "titem";
        item.innerHTML = `
          <div class="tmeta">${ev.era} • ${ev.year}</div>
          <div class="tname">${ev.title}</div>
          <div class="tdesc">${ev.preview}</div>
        `;
        item.addEventListener("click", () => showDetail(ev));
        list.appendChild(item);
      });
  }

  renderChips();
  render();

  // Parallax (safe)
  const hero = document.getElementById("parallaxHero");
  if (hero) {
    const layers = hero.querySelectorAll(".parallaxHero__layer");
    window.addEventListener(
      "scroll",
      () => {
        const rect = hero.getBoundingClientRect();
        const t = Math.max(-1, Math.min(1, rect.top / window.innerHeight));
        layers.forEach((layer, i) => {
          const depth = (i + 1) * 10;
          layer.style.transform = `translateY(${t * depth}px)`;
        });
      },
      { passive: true }
    );
  }
}

// ---------- Compare ----------
async function initCompare() {
  const selA = document.getElementById("faithA");
  const selB = document.getElementById("faithB");
  const runBtn = document.getElementById("runCompare");
  const grid = document.getElementById("compareGrid");
  if (!selA || !selB || !runBtn || !grid) return;

  const beliefs = await loadJSON("data/beliefs.json");
  const keys = Object.keys(beliefs);

  function fill(sel) {
    sel.innerHTML = "";
    keys.forEach((k) => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = beliefs[k].name;
      sel.appendChild(opt);
    });
  }

  fill(selA);
  fill(selB);
  selB.selectedIndex = Math.min(1, keys.length - 1);

  function cell(cls, text) {
    const d = document.createElement("div");
    d.className = cls;
    d.textContent = text;
    return d;
  }

  runBtn.addEventListener("click", () => {
    const a = beliefs[selA.value];
    const b = beliefs[selB.value];

    const rows = [
      ["Endzeit-Rahmen", "endtimes"],
      ["Messias-Vorstellung", "messiah"],
      ["Reinheit / Ethik", "purity"],
      ["Prophezeiung-Stil", "prophecyStyle"],
      ["Primärtexte (Beispiele)", "texts"],
    ];

    grid.innerHTML = "";
    grid.appendChild(cell("cRowLabel", ""));
    grid.appendChild(cell("cRowLabel", a.name));
    grid.appendChild(cell("cRowLabel", b.name));

    rows.forEach(([label, key]) => {
      grid.appendChild(cell("cRowLabel", label));
      grid.appendChild(cell("cCell", a[key]));
      grid.appendChild(cell("cCell", b[key]));
    });
  });

  runBtn.click();
}

// ---------- Debate (local demo) ----------
function initDebate() {
  const voteA = document.getElementById("voteA");
  const voteB = document.getElementById("voteB");
  const saveBtn = document.getElementById("saveSource");
  if (!voteA || !voteB || !saveBtn) return;

  const resetVotes = document.getElementById("resetVotes");

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  const escapeAttr = (str) => escapeHtml(str);

  function renderVotes() {
    const s = loadState();
    voteA.textContent = String(s.votes.A);
    voteB.textContent = String(s.votes.B);
  }
  function renderSources() {
    const s = loadState();
    const ul = document.getElementById("sourcesList");
    if (!ul) return;
    ul.innerHTML = "";
    s.sources.forEach((x) => {
      const li = document.createElement("li");
      li.innerHTML =
        `${escapeHtml(x.title)}` +
        (x.link ? ` — <a href="${escapeAttr(x.link)}" target="_blank" rel="noreferrer">open</a>` : "") +
        `<div class="tiny muted">${escapeHtml(x.note)}</div>`;
      ul.appendChild(li);
    });
  }

  document.querySelectorAll("[data-vote]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = loadState();
      if (!s.sources.length) {
        alert("Quellenpflicht: Speichere mindestens 1 Quelle, bevor du votest.");
        return;
      }
      const side = btn.getAttribute("data-vote");
      s.votes[side] += 1;
      s.xp += 5;
      saveState(s);
      renderVotes();
      renderStats();
    });
  });

  if (resetVotes) {
    resetVotes.addEventListener("click", () => {
      const s = loadState();
      s.votes = { A: 0, B: 0 };
      saveState(s);
      renderVotes();
    });
  }

  saveBtn.addEventListener("click", () => {
    const title = document.getElementById("sourceTitle")?.value.trim();
    const link = document.getElementById("sourceLink")?.value.trim();
    const note = document.getElementById("sourceNote")?.value.trim();
    const status = document.getElementById("sourceStatus");

    if (!title || !note) {
      if (status) status.textContent = "Bitte Titel + Notiz ausfüllen.";
      return;
    }

    const s = loadState();
    s.sources.unshift({ title, link, note, ts: Date.now() });
    s.sources = s.sources.slice(0, 25);
    s.xp += 10;
    saveState(s);

    if (status) status.textContent = "Gespeichert (+10 XP).";
    document.getElementById("sourceTitle").value = "";
    document.getElementById("sourceLink").value = "";
    document.getElementById("sourceNote").value = "";
    renderSources();
    renderStats();
  });

  renderVotes();
  renderSources();
}

// ---------- Oracle demo ----------
function initOracle() {
  const btn = document.getElementById("oracleAsk");
  const out = document.getElementById("oracleAnswer");
  const q = document.getElementById("oracleQuestion");
  if (!btn || !out || !q) return;

  btn.addEventListener("click", () => {
    const question = q.value.trim();
    if (!question) return;

    const line = (t) => {
      const d = document.createElement("div");
      d.textContent = t;
      return d;
    };

    out.innerHTML = "";
    out.appendChild(line(`> question: ${question}`));
    out.appendChild(line("> generating response…"));
    out.appendChild(line(""));
    out.appendChild(line("Orakel (Demo):"));
    out.appendChild(line("1) Definiere die Behauptung präzise. Wer ist 'wer', was heißt 'kontrollieren'?"));
    out.appendChild(line("2) Prüfe mehrere Hypothesen: Staaten, Konzerne, Institutionen, Netzwerke, Zufall."));
    out.appendChild(line("3) Suche nach Datenpunkten: Geldflüsse, Machtpositionen, Gesetze, Anreize."));
    out.appendChild(line("4) Gegenargument: Komplexe Systeme haben selten einen einzigen 'Mastermind'."));
    out.appendChild(line(""));
    out.appendChild(line("Empfehlung: Formuliere eine überprüfbare Teilfrage + sammle Primärquellen."));
    addXP(5);
  });
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", () => {
  // If you added IDs in HTML (recommended):
  // <img id="brandLogo" ...> <span id="brandText" ...>
  safe(initBrandFallback);

  renderStats();
  safe(initSecretModal);
  safe(initSecretPage);  // runs only on secret.html now
  safe(initDebate);
  safe(initOracle);

  safeAsync(initLevels);
  safeAsync(initLevelDetail);
  safeAsync(initMap);
  safeAsync(initTimeline);
  safeAsync(initCompare);
});
