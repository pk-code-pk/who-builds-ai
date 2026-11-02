// Frame 1: two stacked bars, 2014 and 2026, split by who built the models (Praneel, Milestone 8).
// Computed in the browser from window.WHO_BUILDS, with the same sectors and colors as the frame 2 timeline.
//
//   sectorBars(el, window.WHO_BUILDS);
//
// The bars are horizontal so the same layout works from phone to desktop. Each block is labeled
// directly underneath it (name and count), and hovering or tapping a block shows its share.
// The grow-in is CSS (.draw / .is-drawn in story.css), so it is instant under reduced motion.
function sectorBars(root, data, opts = {}) {
  const YEARS = opts.years || [2014, 2026];
  const KEYS = ["Academia only", "Academia + Industry", "Industry only", "Other"];
  const NAME = { "Academia only": "Universities alone", "Academia + Industry": "University + company",
    "Industry only": "Companies alone", Other: "Other" };
  // block colors: the dashboard's dark sector colors; label colors: lighter text versions that keep 4.5:1 on the card
  const FILL = { "Academia only": "#1f9d3a", "Academia + Industry": "#2ec4a6", "Industry only": "#e8a317", Other: "#5f6880" };
  const TEXT = { "Academia only": "#5bd178", "Academia + Industry": "#2ec4a6", "Industry only": "#f2b84b", Other: "#aab5cf" };
  const lastYear = +data.lastDate.slice(0, 4);
  const lastDay = d3.timeFormat("%b %-d")(d3.timeParse("%Y-%m-%d")(data.lastDate));

  const rows = YEARS.map(year => {
    const ms = data.models.filter(m => m.year === year);
    let run = 0;
    const segs = KEYS.map(key => {
      const n = ms.filter(m => m.sector === key).length, s = { key, n, x0: run, x1: run + n, year, total: ms.length };
      run += n;
      return s;
    });
    return { year, total: ms.length, partial: year === lastYear, segs };
  });

  const yearName = r => r.partial ? `${r.year}*` : `${r.year}`;
  const summary = rows.map(r => `${r.partial ? `${r.year} through ${lastDay}` : r.year}: ${r.total} notable models, ` +
    r.segs.map(s => `${NAME[s.key].toLowerCase()} ${s.n}`).join(", ")).join(". ");

  root.classList.add("sb");
  root.innerHTML = `<svg role="img" aria-label="Two stacked bars of notable AI models by who built them. ${summary}."></svg>` +
    `<div class="ctip" role="status"></div>`;
  const svg = d3.select(root).select("svg"), tip = d3.select(root).select(".ctip");
  let width = 0;

  function render() {
    const w = Math.round(root.clientWidth);
    if (!w) return;
    width = w;
    svg.selectAll("*").remove();
    const narrow = w < 600;
    const fs = narrow ? 13 : 14.5, lineH = Math.round(fs * 1.55), barH = narrow ? 34 : 46, headH = narrow ? 30 : 34;
    const x = d3.scaleLinear().domain([0, d3.max(rows, r => r.total)]).range([0, w]);
    let y = 4;

    rows.forEach((r, ri) => {
      const g = svg.append("g").attr("class", "sb-row");
      // year and total above the bar
      const head = g.append("text").attr("class", "sb-head").attr("fill", "#fff").attr("y", y + headH - 10);
      head.append("tspan").attr("class", "sb-year").text(yearName(r));
      head.append("tspan").attr("class", "sb-total").attr("dx", 10)
        .text(`${r.total} notable models${r.partial ? ` (through ${lastDay})` : ""}`);
      const by = y + headH;

      // the bar: one block per sector, with a small gap between blocks
      const bar = g.append("g").attr("class", "sb-bar").style("--i", ri);
      const shown = r.segs.filter(s => s.n > 0);
      const segs = bar.selectAll("g").data(shown).join("g").attr("class", "sb-seg");
      segs.append("rect").attr("class", "sb-mark")
        .attr("x", s => x(s.x0)).attr("y", by).attr("height", barH).attr("rx", 3)
        .attr("width", (s, i) => Math.max(1.5, x(s.x1) - x(s.x0) - (i < shown.length - 1 ? 2 : 0)))
        .attr("fill", s => FILL[s.key]);
      // hit areas at least 16px wide, smallest blocks drawn last so they win where they meet
      segs.append("rect").attr("class", "sb-hit")
        .attr("x", s => Math.min(w - 16, Math.max(0, (x(s.x0) + x(s.x1)) / 2 - Math.max(8, (x(s.x1) - x(s.x0)) / 2))))
        .attr("width", s => Math.max(16, x(s.x1) - x(s.x0))).attr("y", by - 4).attr("height", barH + 8);
      segs.sort((a, b) => b.n - a.n);
      hook(segs);

      // direct labels under the bar: centered under a block that is wide enough, otherwise starting at
      // the block; a label that would run into one already placed drops to the next line.
      // Universities alone is always labeled, even at 0.
      const lg = g.append("g").attr("class", "sb-labels").style("--i", ri);
      const placed = r.segs.filter(s => s.n > 0 || s.key === "Academia only").map(s => {
        const t = lg.append("text").datum(s).attr("class", "sb-lbl" + (s.key === "Academia only" ? " key" : ""))
          .style("font-size", fs + "px").attr("fill", TEXT[s.key]);
        t.append("tspan").text(NAME[s.key] + " ");
        t.append("tspan").attr("class", "sb-n").text(s.n);
        const tw = t.node().getComputedTextLength(), bw = x(s.x1) - x(s.x0);
        const left = bw >= tw + 12 ? x(s.x0) + (bw - tw) / 2 : Math.max(0, Math.min(x(s.x0), w - tw));
        return { t, tw, left };
      }).sort((a, b) => a.left - b.left);
      const ends = [];   // right edge of the last label on each line
      let lines = 0;
      for (const { t, tw, left } of placed) {
        let line = ends.findIndex(e => left > e + 14);
        if (line < 0) { line = ends.length; ends.push(0); }
        ends[line] = left + tw;
        lines = Math.max(lines, line + 1);
        t.attr("x", left).attr("y", by + barH + 6 + (line + 1) * lineH - lineH * 0.3);
      }
      hook(lg.selectAll("text"));
      y = by + barH + 6 + lines * lineH + (ri < rows.length - 1 ? (narrow ? 22 : 28) : 4);
    });
    svg.attr("viewBox", `0 0 ${w} ${y}`).attr("height", y);
  }

  function hook(sel) {
    sel.on("pointerenter pointermove", (e, s) => { if (e.pointerType === "mouse") show(e, s); })
      .on("pointerleave", e => { if (e.pointerType === "mouse") hide(); })
      .on("click", (e, s) => { e.stopPropagation(); show(e, s); });
  }
  function show(e, s) {
    svg.selectAll(".sb-seg").classed("on", d => d === s);
    const pct = Math.round(100 * s.n / s.total);
    tip.html(`<b>${NAME[s.key]}, ${s.year}</b><br>${s.n} of ${s.total} notable models (${pct}%)` +
      (s.key === "Academia + Industry" ? `<br><span class="ctip-muted">A university and a company built it together</span>` : ""))
      .classed("on", true);
    place(e);
  }
  function hide() { tip.classed("on", false); svg.selectAll(".sb-seg").classed("on", false); }
  function place(e) {
    const r = root.getBoundingClientRect(), tw = tip.node().offsetWidth, th = tip.node().offsetHeight;
    let left = e.clientX - r.left + 14, top = e.clientY - r.top + 16;
    if (left + tw > r.width) left = e.clientX - r.left - tw - 14;
    left = Math.max(4 - r.left, Math.min(left, window.innerWidth - r.left - tw - 4));
    top = Math.max(4 - r.top, Math.min(top, window.innerHeight - r.top - th - 4));
    tip.style("left", left + "px").style("top", top + "px");
  }
  document.addEventListener("click", hide);

  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);   // re-measure labels in the web font
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (Math.round(root.clientWidth) !== width) { hide(); render(); } }).observe(root);
  return { rows };
}
