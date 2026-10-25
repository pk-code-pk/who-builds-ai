// Story page wiring: hero scroll steps, linked views, embedded Prototype B, draw-in on scroll, and the chip navigator.
(function () {
  const WB = window.WHO_BUILDS, CS = window.COUNTRY_SHARE;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollers = [];

  // ---------- hero: all 931 models, one change per scroll step ----------
  const hero = heroDots(document.getElementById("heroDots"), WB);
  const hsteps = document.querySelectorAll(".hstep");
  function heroEnter(i) {
    hsteps.forEach((s, j) => s.classList.toggle("is-active", i === j));
    hero.setStep(i);
  }
  heroEnter(0);

  // ---------- embedded Prototype B iframes ----------
  // Each iframe reports its own height (postMessage works from file:// too), so it never needs a scrollbar.
  window.addEventListener("message", e => {
    const d = e.data;
    if (!d || d.type !== "who-builds:height" || !d.id) return;
    const f = document.getElementById(d.id);
    if (f) f.style.height = Math.ceil(d.height) + "px";
  });
  const pending = {};
  function setFrame(id, settings) {
    pending[id] = settings;
    const f = document.getElementById(id);
    if (f && f.contentWindow) f.contentWindow.postMessage({ type: "who-builds:set", ...settings }, "*");
  }
  document.querySelectorAll(".embed iframe").forEach(f => f.addEventListener("load", () => {
    if (pending[f.id]) f.contentWindow.postMessage({ type: "who-builds:set", ...pending[f.id] }, "*");
  }));

  // ---------- Frame 4: labs per year, linked to the lab bubbles ----------
  const buttons = document.querySelectorAll("#frame4 .seg button");
  function selectYears(range) {
    lpy.select(range);
    buttons.forEach(b => b.setAttribute("aria-pressed", b.dataset.range === range.join("-")));
    setFrame("frame4Labs", { range });
  }
  const lpy = labsPerYearChart(document.getElementById("labsPerYear"), WB, { onSelect: selectYears });
  d3.selectAll("#labsPerYear .lpy-mark").style("--i", (d, i) => i);   // stagger for the grow-in
  buttons.forEach(b => b.addEventListener("click", () => selectYears(b.dataset.range.split("-").map(Number))));
  selectYears([2023, 2023]);

  // ---------- Frame 5: country share, driven by scroll steps ----------
  const chart = countryShareChart(document.getElementById("countryShare"), CS);
  const steps = document.querySelectorAll("#frame5 .step");
  function enter(i) {
    steps.forEach((s, j) => s.classList.toggle("is-active", i === j));
    chart.setStep(i === 3 ? 0 : i);     // the last step hands the chart back to the reader
  }
  enter(0);

  if (window.scrollama) {
    const hs = scrollama();
    hs.setup({ step: ".hstep", offset: 0.55 }).onStepEnter(({ index }) => heroEnter(index));
    const cs = scrollama();
    cs.setup({ step: "#frame5 .step", offset: 0.6 }).onStepEnter(({ index }) => enter(index));
    scrollers.push(hs, cs);
    window.addEventListener("resize", () => scrollers.forEach(s => s.resize()));
  }

  // ---------- fade in text blocks and draw charts once, when they scroll into view ----------
  const once = (sel, cls, threshold) => {
    const els = document.querySelectorAll(sel);
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(el => el.classList.add(cls)); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add(cls); io.unobserve(en.target); }
    }), { threshold });
    els.forEach(el => io.observe(el));
  };
  once(".reveal", "is-visible", 0.12);
  once(".draw", "is-drawn", 0.3);

  // ---------- chip navigator + progress: which part of the arc we're in ----------
  const parts = [...document.querySelectorAll("[data-act]")].filter(el => el.matches("header, section"));
  const cores = document.querySelectorAll(".chipnav .core");
  const bar = document.getElementById("progress");
  function onScroll() {
    const h = document.documentElement;
    bar.style.width = (100 * h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) + "%";
    const line = window.innerHeight * 0.4;
    let cur = "top";
    for (const p of parts) if (p.getBoundingClientRect().top <= line) cur = p.dataset.act;
    const curCore = [...cores].find(c => c.dataset.act === cur);
    if (curCore) document.getElementById("chipCur").textContent = curCore.querySelector("b").textContent;
    cores.forEach(c => {
      const on = c.dataset.act === cur;
      c.classList.toggle("on", on);
      if (on) c.setAttribute("aria-current", "true"); else c.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // on narrower screens the chip folds into a small button in the corner, so it never sits on top of the story
  const nav = document.querySelector(".chipnav"), toggle = nav.querySelector(".chip-toggle");
  const setOpen = open => { nav.classList.toggle("open", open); toggle.setAttribute("aria-expanded", open); };
  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  cores.forEach(c => c.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
})();
