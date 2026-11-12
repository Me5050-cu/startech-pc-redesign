/* StarTech PC — small, dependency-free behaviour. Everything degrades to plain links without JS. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const TEL = window.ST.tel;
  const sms = (body) => `sms:${TEL}?&body=${encodeURIComponent(body)}`;
  const SM = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

  // ---- mobile menu ----
  const menu = $("[data-menu]"), nav = $("#nav");
  if (menu) menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("open", open);
  });

  // ---- live open / closed, computed in Austin time ----
  const fmt = (h) => (h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`);
  function status() {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    const now = (+get("hour") % 24) + +get("minute") / 60;
    const [o, c] = window.ST.hours[day];
    let text, open = 0;
    if (now >= o && now < c) { open = 1; text = c - now <= 1 ? `Open now · closes soon, at ${fmt(c)}` : `Open now · until ${fmt(c)} today`; }
    else if (now < o) text = `Closed · opens at ${fmt(o)} today`;
    else { const [no] = window.ST.hours[(day + 1) % 7]; text = `Closed · opens tomorrow at ${fmt(no)}`; }
    $$("[data-status]").forEach((el) => { if (el.textContent !== text) el.textContent = text; el.dataset.open = open; });
    $$('[data-o="open"]').forEach((el) => { const t = open ? `Open now, until ${fmt(c)}` : text.replace("Closed · ", ""); if (el.textContent !== t) el.textContent = t; });
    $$("[data-hours] tr").forEach((tr) => tr.classList.toggle("today", +tr.dataset.day === day));
  }
  status(); setInterval(status, 60000);

  // ---- review rail ----
  const rail = $("[data-rail]");
  if (rail) {
    const cards = $$(".rv", rail), count = $("[data-rail-count]");
    const step = () => cards[0].getBoundingClientRect().width + 16;
    const upd = () => {
      const i = Math.round(rail.scrollLeft / step()) + 1;
      const vis = Math.max(1, Math.round(rail.clientWidth / step()));
      if (count) count.textContent = `${i}–${Math.min(i + vis - 1, cards.length)} of ${cards.length} · ${window.ST.count} on Google`;
    };
    $("[data-rail-prev]").addEventListener("click", () => rail.scrollBy({ left: -step(), behavior: SM }));
    $("[data-rail-next]").addEventListener("click", () => {
      if (rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4) rail.scrollTo({ left: 0, behavior: SM });
      else rail.scrollBy({ left: step(), behavior: SM });
    });
    rail.addEventListener("scroll", () => requestAnimationFrame(upd), { passive: true });
    addEventListener("resize", upd); upd();
  }

  // ---- review wall: category chips + search ----
  const wall = $("[data-wall]");
  if (wall) {
    const cards = $$(".rv", wall), chips = $$(".chips button"), q = $("[data-search]");
    const cnt = $("[data-wall-count]"), empty = $("[data-wall-empty]");
    let cat = "all";
    const apply = () => {
      const term = (q.value || "").trim().toLowerCase();
      let n = 0;
      cards.forEach((c) => {
        const ok = (cat === "all" || c.dataset.cat === cat) && (!term || c.textContent.toLowerCase().includes(term));
        c.hidden = !ok; if (ok) n++;
      });
      cnt.textContent = `Showing ${n} of ${cards.length} reviews`;
      empty.hidden = n > 0;
    };
    chips.forEach((b) => b.addEventListener("click", () => {
      chips.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      cat = b.dataset.cat; apply();
    }));
    q.addEventListener("input", apply);
  }

  // ---- repair starter (no prices: the shop quotes in person) ----
  const fx = $(".fx");
  if (fx && window.STD) {
    const D = window.STD.devices;
    const segDev = $('[data-f="device"]', fx), sel = $('[data-f="model"]', fx), segRep = $('[data-f="repair"]', fx);
    const out = (k) => $(`[data-o="${k}"]`, fx);
    let dev = D[0], model = 1, prob = 0;
    const d0 = new URLSearchParams(location.search).get("d");
    if (d0) { const f = D.find((d) => d.id === d0); if (f) { dev = f; model = 0; } }
    function render() {
      $$("button", segDev).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === dev.id)));
      sel.innerHTML = dev.models.map((m, i) => `<option value="${i}"${i === model ? " selected" : ""}>${m}</option>`).join("");
      segRep.innerHTML = dev.problems.map((p, i) => `<button type="button" data-v="${i}" aria-pressed="${i === prob}">${p}</button>`).join("");
      const m = dev.models[model], p = dev.problems[prob];
      out("what").textContent = `${m} · ${p}`;
      out("time").textContent = dev.time;
      out("sms").href = sms(`Hi StarTech PC, I need help with my ${m === "Not sure" ? dev.label : m} — ${p.toLowerCase()}. Can you take a look?`);
    }
    segDev.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; dev = D.find((d) => d.id === b.dataset.v); model = 0; prob = 0; render(); });
    sel.addEventListener("change", () => { model = +sel.value; render(); });
    segRep.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; prob = +b.dataset.v; render(); });
    render();
  }

  // ---- generic segmented buttons (planner, sell form) ----
  $$(".sf .seg").forEach((seg) => seg.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("button", seg).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    seg.dispatchEvent(new Event("change", { bubbles: true }));
  }));

  // ---- custom PC request -> text message ----
  const pr = $("[data-pcreq]");
  if (pr) {
    const upd = () => {
      const name = pr.elements.name.value.trim(), desc = pr.elements.desc.value.trim();
      const msg = `Hi StarTech PC${name ? `, this is ${name}` : ""}. I'd like a ${pr.elements.kind.value}. Budget: ${pr.elements.budget.value}. Mostly for: ${pr.elements.use.value.toLowerCase()}.${desc ? ` Details: ${desc}` : ""}`;
      $("[data-pcreq-sms]", pr).href = sms(msg);
    };
    pr.addEventListener("input", upd); pr.addEventListener("change", upd); upd();
  }

  // ---- sell form -> text message ----
  const sf = $("[data-sell]");
  if (sf) {
    const q = (k) => $(`[data-q="${k}"][aria-pressed="true"]`, sf).dataset.v;
    const upd = () => {
      const type = sf.type.value, model = sf.model.value.trim() || "(model not sure)";
      const act = { sell: "sell", recycle: "recycle" }[q("pay")];
      const msg = `Hi StarTech PC, I'd like to ${act} my ${type}: ${model}. Turns on: ${q("on")}.`;
      $("[data-sell-sms]", sf).href = sms(msg);
    };
    sf.addEventListener("input", upd); sf.addEventListener("change", upd); upd();
  }
})();
