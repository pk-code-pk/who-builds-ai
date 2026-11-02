// Frame 3: Amy's compute and cost frontier, built in D3 from the Epoch columns she picked (Milestone 9).
// Each dot is a model with a recorded training cost (or training compute, after the toggle), on a log scale so the
// early years aren't flattened to zero. The frontier line connects each year's record. Data: window.FRONTIER from
// scripts/build_frontier.py.
//
//   const chart = frontierChart(el, window.FRONTIER);
//   chart.setMetric("flop");   // or "cost"
//
// Records are bright and everything else is muted, like the other story charts. Hovering or tapping a dot shows the
// model, its lab and its cost or compute.
function frontierChart(root, data, opts = {}) {
  const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  const pow10 = e => "10" + String(e).split("").map(c => SUP[c]).join("");
  const money = v => d3.format("$.3~s")(v).replace("G", "B").replace("k", "K");
  const flops = v => { const e = Math.floor(Math.log10(v)); return `${d3.format(".2~f")(v / 10 ** e)} × ${pow10(e)} FLOP`; };
  const METRIC = {
    cost: { key: "cost", fmt: money, tick: v => money(v), name: "training cost (2023 dollars)" },
    flop: { key: "flop", fmt: flops, tick: v => pow10(Math.round(Math.log10(v))), name: "training compute" },
  };
  const parse = d3.timeParse("%Y-%m-%d"), fmtDate = d3.timeFormat("%b %Y");
  const models = data.models.map(m => ({ ...m, t: parse(m.date), year: +m.date.slice(0, 4) }));
  let metric = METRIC[opts.metric || "cost"];

  // each year's record for a metric, oldest first
  const records = key => d3.groups(models.filter(m => m[key] != null), m => m.year)
    .map(([, ms]) => d3.greatest(ms, m => m[key])).sort((a, b) => a.t - b.t);

  root.classList.add("fr");
  root.innerHTML = `<svg role="img"></svg><div class="ctip" role="status"></div>`;
  const svg = d3.select(root).select("svg"), tip = d3.select(root).select(".ctip");
  let width = 0;

  function render() {
    const w = Math.round(root.clientWidth);
    if (!w) return;
    width = w;
    svg.selectAll("*").remove();
    const narrow = w < 600, r = narrow ? 3.5 : 4.5;
    const h = Math.max(300, Math.min(440, Math.round(w * .5)));
    const m = { t: 14, r: narrow ? 8 : 16, b: 28, l: narrow ? 44 : 56 };
    const shown = models.filter(d => d[metric.key] != null), recs = records(metric.key), recSet = new Set(recs);
    const lo = 10 ** Math.floor(Math.log10(d3.min(shown, d => d[metric.key])));
    const hi = 10 ** Math.ceil(Math.log10(d3.max(shown, d => d[metric.key])));
    const x = d3.scaleTime().domain([new Date(2012, 0, 1), new Date(2027, 0, 1)]).range([m.l, w - m.r]);
    const y = d3.scaleLog().domain([lo, hi]).range([h - m.b, m.t]);

    const decades = d3.range(Math.log10(lo), Math.log10(hi) + 1).map(e => 10 ** e);
    const every = Math.ceil(decades.length / (narrow ? 5 : 8));
    const yt = decades.filter((_, i) => (decades.length - 1 - i) % every === 0);
    const g = svg.append("g").attr("class", "fr-axis");
    g.selectAll(".fr-grid").data(yt).join("line").attr("class", "fr-grid")
      .attr("x1", m.l).attr("x2", w - m.r).attr("y1", y).attr("y2", y);
    g.selectAll(".fr-yt").data(yt).join("text").attr("class", "fr-tick").attr("x", m.l - 8).attr("y", v => y(v) + 4)
      .attr("text-anchor", "end").text(metric.tick);
    const years = d3.range(2012, 2027, narrow ? 4 : 2);
    g.selectAll(".fr-xt").data(years).join("text").attr("class", "fr-tick").attr("x", yr => x(new Date(yr, 6, 1)))
      .attr("y", h - 8).attr("text-anchor", "middle").text(yr => yr);

    // muted dots first, records on top
    const dots = svg.append("g").attr("class", "fr-dots").selectAll("g")
      .data(shown.slice().sort((a, b) => recSet.has(a) - recSet.has(b))).join("g")
      .attr("class", d => "fr-dot" + (recSet.has(d) ? " rec" : ""));
    dots.append("circle").attr("class", "fr-mark").attr("cx", d => x(d.t)).attr("cy", d => y(d[metric.key])).attr("r", d => recSet.has(d) ? r + 1 : r);
    dots.append("circle").attr("class", "fr-hit").attr("cx", d => x(d.t)).attr("cy", d => y(d[metric.key])).attr("r", r + 4);
    hook(dots);

    svg.append("path").attr("class", "fr-line").datum(recs)
      .attr("d", d3.line().x(d => x(d.t)).y(d => y(d[metric.key])));

    // label the 2020 record and the highest one, the two numbers the frame's text uses for cost
    const top = d3.greatest(recs, d => d[metric.key]), r2020 = recs.find(d => d.year === 2020);
    [r2020, top].filter(Boolean).forEach((d, i) => {
      const left = x(d.t) > w * .6;
      svg.append("text").attr("class", "fr-ann").attr("x", x(d.t) + (left ? -10 : 10)).attr("y", y(d[metric.key]) + (i ? -8 : 16))
        .attr("text-anchor", left ? "end" : "start").text(`${short(d.model)} ≈ ${metric.key === "cost" ? money(d.cost) : pow10(Math.round(Math.log10(d.flop)))}`);
    });

    svg.attr("viewBox", `0 0 ${w} ${h}`).attr("height", h)
      .attr("aria-label", `Log-scale chart of the ${metric.name} of ${shown.length} notable AI models since 2012. ` +
        `The yearly record rose from ${metric.fmt(recs[0][metric.key])} in ${recs[0].year} to ${metric.fmt(top[metric.key])} (${top.model}, ${top.year}).`);
  }
  const short = name => name.replace(/\s*\(.*\)$/, "").replace(/ 175B$/, "");

  function hook(sel) {
    sel.on("pointerenter pointermove", (e, d) => { if (e.pointerType === "mouse") show(e, d); })
      .on("pointerleave", e => { if (e.pointerType === "mouse") hide(); })
      .on("click", (e, d) => { e.stopPropagation(); show(e, d); });
  }
  function show(e, d) {
    svg.selectAll(".fr-dot").classed("on", x => x === d);
    const rec = svg.selectAll(".fr-dot.rec").filter(x => x === d).size() > 0;
    tip.html(`<b>${d.model}</b><br>${d.org} · ${fmtDate(d.t)}<br>` +
      (d.cost != null ? `Training cost: <b>${money(d.cost)}</b><br>` : "") +
      (d.flop != null ? `Training compute: ${flops(d.flop)}` : "") +
      (rec ? `<br><span class="ctip-muted">The most for any model in ${d.year} with a recorded ${metric.key === "cost" ? "cost" : "compute"}</span>` : ""))
      .classed("on", true);
    place(e);
  }
  function hide() { tip.classed("on", false); svg.selectAll(".fr-dot").classed("on", false); }
  function place(e) {
    const rc = root.getBoundingClientRect(), tw = tip.node().offsetWidth, th = tip.node().offsetHeight;
    let left = e.clientX - rc.left + 14, top = e.clientY - rc.top + 16;
    if (left + tw > rc.width) left = e.clientX - rc.left - tw - 14;
    left = Math.max(4 - rc.left, Math.min(left, window.innerWidth - rc.left - tw - 4));
    top = Math.max(4 - rc.top, Math.min(top, window.innerHeight - rc.top - th - 4));
    tip.style("left", left + "px").style("top", top + "px");
  }
  document.addEventListener("click", hide);

  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (Math.round(root.clientWidth) !== width) { hide(); render(); } }).observe(root);
  return {
    get metric() { return metric.key; },
    setMetric(k) { if (METRIC[k] && METRIC[k] !== metric) { metric = METRIC[k]; hide(); render(); } },
  };
}
