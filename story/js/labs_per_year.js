// Frame 4: how many labs released a notable model each year (Praneel, Milestone 8).
// Computed in the browser from the same window.WHO_BUILDS data as Prototype B.
//
//   const chart = labsPerYearChart(el, window.WHO_BUILDS, { onSelect: range => ... });
//   chart.select([2025, 2025]);   // highlight a year (or a range of years)
//
// Clicking a bar selects that year and calls onSelect, which the story page uses to
// brush the same years in the embedded Prototype B lab bubbles.
function labsPerYearChart(root, data, opts = {}) {
  const W = 900, H = 250, m = { t: 26, r: 12, b: 34, l: 12 };
  const years = d3.range(2012, +data.lastDate.slice(0, 4) + 1);
  const rows = years.map(y => {
    const ms = data.models.filter(d => d.year === y);
    const credits = d3.rollups(ms.flatMap(d => d.orgs), v => v.length, o => o).sort((a, b) => b[1] - a[1]);
    const top5 = credits.slice(0, 5), names = new Set(top5.map(d => d[0]));
    return { year: y, models: ms.length, labs: credits.length, top5,
      top5Models: ms.filter(d => d.orgs.some(o => names.has(o))).length,
      partial: y === +data.lastDate.slice(0, 4) };
  });
  const state = { range: null };

  root.classList.add("lpy");
  root.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart of labs with at least one notable AI model per year, ${years[0]} to ${years[years.length - 1]}"></svg><div class="lpy-tip" role="status"></div>`;
  const svg = d3.select(root).select("svg"), tip = d3.select(root).select(".lpy-tip");
  const x = d3.scaleBand().domain(years).range([m.l, W - m.r]).padding(0.18);
  const y = d3.scaleLinear().domain([0, d3.max(rows, d => d.labs)]).nice().range([H - m.b, m.t]);

  svg.append("g").attr("class", "lpy-axis").attr("transform", `translate(0,${H - m.b})`)
    .call(d3.axisBottom(x).tickSize(0).tickPadding(8).tickFormat(d => d === years[years.length - 1] ? d + "*" : (d % 2 === 1 ? "" : d)))
    .call(g => g.select(".domain").attr("stroke", "#b7b6b0"));

  const bars = svg.append("g").selectAll("g").data(rows).join("g").attr("class", "lpy-bar")
    .attr("tabindex", 0).attr("role", "button")
    .attr("aria-label", d => `${d.year}: ${d.labs} labs`)
    .on("click", (e, d) => pick(d))
    .on("keydown", (e, d) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(d); } })
    .on("mouseenter mousemove", (e, d) => showTip(e, d))
    .on("mouseleave", () => tip.classed("on", false));
  // a full-height hit area so short bars are easy to hover and click
  bars.append("rect").attr("class", "lpy-hit").attr("x", d => x(d.year)).attr("width", x.bandwidth())
    .attr("y", m.t).attr("height", H - m.b - m.t);
  bars.append("path").attr("class", "lpy-mark");
  bars.append("text").attr("class", "lpy-val").attr("text-anchor", "middle");

  function pick(d) {
    state.range = [d.year, d.year]; draw();
    if (opts.onSelect) opts.onSelect(state.range);
  }
  function showTip(e, d) {
    const r = root.getBoundingClientRect();
    tip.html(`<b>${d.year}${d.partial ? ` (through ${data.lastDate})` : ""}</b><br>${d.labs} labs released ${d.models} notable models.<br>` +
      `The top 5 (${d.top5.map(t => `${t[0]} ${t[1]}`).join(", ")}) worked on ${d.top5Models} of them.` +
      `<br><span class="lpy-muted">Click to see these labs below</span>`).classed("on", true);
    const tw = tip.node().offsetWidth;
    let left = e.clientX - r.left + 14; if (left + tw > r.width) left = e.clientX - r.left - tw - 14;
    const th = tip.node().offsetHeight;
    let top = e.clientY - r.top + 14;
    left = Math.max(4 - r.left, Math.min(left, window.innerWidth - r.left - tw - 4));
    top = Math.max(4 - r.top, Math.min(top, window.innerHeight - r.top - th - 4));
    tip.style("left", left + "px").style("top", top + "px");
  }
  // bar with rounded top corners, square at the baseline
  function barPath(d) {
    const x0 = x(d.year), w = x.bandwidth(), y0 = y(0), y1 = y(d.labs), rr = Math.min(4, w / 2, y0 - y1);
    return `M${x0},${y0}V${y1 + rr}Q${x0},${y1} ${x0 + rr},${y1}H${x0 + w - rr}Q${x0 + w},${y1} ${x0 + w},${y1 + rr}V${y0}Z`;
  }
  function draw() {
    const on = d => state.range && d.year >= state.range[0] && d.year <= state.range[1];
    bars.classed("on", on).classed("partial", d => d.partial);
    bars.select(".lpy-mark").attr("d", barPath);
    // label the selected years plus the 2023 peak, so the drop is readable without hovering
    bars.select(".lpy-val").attr("x", d => x(d.year) + x.bandwidth() / 2).attr("y", d => y(d.labs) - 6)
      .text(d => on(d) || d.year === 2023 ? d.labs : "");
  }
  draw();
  return { select(range) { state.range = range; draw(); }, rows };
}
