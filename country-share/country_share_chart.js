// Country share of notable AI models per year, 2012-2026 (Praneel, Milestone 8).
// Used by country-share/index.html and story/index.html.
//
//   const chart = countryShareChart(document.querySelector("#chart"), window.COUNTRY_SHARE);
//   chart.setStep(2);          // story steps: 0 overview, 1 focus China, 2 before/after the controls
//   chart.setMode("stack");    // "lines" (default) or "stack" (100% stacked areas)
//
// One state object drives the drawing. Every interaction (hover, legend click, mode
// buttons, story steps) changes the state and then calls draw().
function countryShareChart(root, data, opts = {}) {
  const GROUPS = ["US", "US + China", "China", "Other"];
  const LABEL = { US: "US", "US + China": "US + China together", China: "China", Other: "Rest of world" };
  const COLOR = { US: "var(--c-us)", "US + China": "var(--c-joint)", China: "var(--c-china)", Other: "var(--c-other)" };
  const pct = d3.format(".0%");
  const W = Math.round(Math.max(520, Math.min(900, root.clientWidth || 900))), H = opts.height || 440, m = { t: 30, r: 170, b: 64, l: 54 };

  const state = { mode: "lines", focus: null, step: 0, hoverYear: null };
  const years = data.years.map(d => ({ ...d, share: Object.fromEntries(GROUPS.map(g => [g, d[g] / d.total])) }));
  const last = years[years.length - 1];

  // dates -> decimal years. Each year's value sits in the middle of that year;
  // the partial year sits in the middle of the months it covers.
  const dec = iso => { const d = new Date(iso + "T00:00:00Z"), y = d.getUTCFullYear();
    return y + (d - Date.UTC(y, 0, 1)) / (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)); };
  const lastDec = dec(data.lastDate);
  const xOf = d => d.partial ? (d.year + lastDec) / 2 : d.year + 0.5;
  const controlsX = dec(data.controls);

  // ---------- layout ----------
  root.classList.add("csc");
  root.innerHTML = `
    <div class="csc-controls">
      <div class="csc-legend" role="group" aria-label="Highlight a country group"></div>
      <span class="csc-evkey"><svg width="12" height="10" aria-hidden="true"><path d="M6,1 L11,9 L1,9 Z"></path></svg> US chip export rule (hover)</span>
      <div class="csc-mode" role="group" aria-label="Chart type">
        <button type="button" data-mode="lines" aria-pressed="true">Lines</button>
        <button type="button" data-mode="stack" aria-pressed="false">Stacked share</button>
      </div>
    </div>
    <svg class="csc-svg" viewBox="0 0 ${W} ${H}" role="img"></svg>
    <div class="csc-tip" role="status" aria-live="polite"></div>`;
  const svg = d3.select(root).select("svg.csc-svg");
  svg.attr("aria-label", `Line chart of each country group's share of notable AI models per year, ${years[0].year} to ${last.year}. ` +
    `China rose from ${pct(years.find(d => d.year === 2014).share.China)} in 2014 to ${pct(last.share.China)} in ${last.year}.`);
  const tip = d3.select(root).select(".csc-tip");

  const x = d3.scaleLinear().domain([years[0].year + 0.2, xOf(last) + 0.25]).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([0, 1]).range([H - m.b, m.t]);

  const gGrid = svg.append("g").attr("class", "csc-grid");
  const gWin = svg.append("g").attr("class", "csc-windows");
  const gArea = svg.append("g").attr("class", "csc-areas");
  const gLine = svg.append("g").attr("class", "csc-lines");
  const gCtrl = svg.append("g").attr("class", "csc-controls-line");
  const gEvt = svg.append("g").attr("class", "csc-events");
  const gHover = svg.append("g").attr("class", "csc-hover").style("display", "none");
  const gLbl = svg.append("g").attr("class", "csc-labels");

  // axes
  gGrid.selectAll("line").data(y.ticks(5)).join("line")
    .attr("x1", m.l).attr("x2", W - m.r).attr("y1", d => y(d)).attr("y2", d => y(d));
  svg.append("g").attr("class", "csc-axis").attr("transform", `translate(0,${H - m.b})`)
    .call(d3.axisBottom(x).tickValues(years.map(xOf))
      .tickFormat(v => { const yr = Math.floor(v); return yr === last.year && last.partial ? yr + "*" : (yr % 2 === 0 || yr === last.year ? yr : ""); })
      .tickSize(0).tickPadding(24))
    .call(g => g.select(".domain").remove());
  svg.append("g").attr("class", "csc-axis").attr("transform", `translate(${m.l},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(pct).tickSize(0).tickPadding(8))
    .call(g => g.select(".domain").remove());
  svg.append("line").attr("class", "csc-baseline").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0));
  svg.append("text").attr("class", "csc-axis-title").attr("transform", "rotate(-90)")
    .attr("x", -(m.t + H - m.b) / 2).attr("y", 14).attr("text-anchor", "middle")
    .text("share of that year's notable AI models");
  svg.append("text").attr("class", "csc-axis-title").attr("x", (m.l + W - m.r) / 2).attr("y", H - 8)
    .attr("text-anchor", "middle").text(`year the model was published (*${last.year} runs through ${fmtDate(data.lastDate)})`);

  // Oct 2022 export-control marker, always on
  gCtrl.append("line").attr("x1", x(controlsX)).attr("x2", x(controlsX)).attr("y1", m.t - 8).attr("y2", H - m.b);
  gCtrl.append("text").attr("x", x(controlsX) - 6).attr("y", m.t - 14).attr("text-anchor", "end")
    .html(`<tspan font-weight="700">Oct 7, 2022:</tspan> US limits AI chip exports to China`);

  // the other US export-control events, as small ticks on the time axis (hover for details)
  const evY = H - m.b + 4;
  gEvt.selectAll("path").data(data.events).join("path")
    .attr("transform", e => `translate(${x(dec(e.date))},${evY})`)
    .attr("d", "M0,0 L5,8 L-5,8 Z")
    .attr("class", e => e.date === data.controls ? "csc-ev main" : "csc-ev")
    .on("mouseenter", (ev, e) => showTip(ev, `<b>${fmtDate(e.date)}</b><br>${e.event}` +
      (e.nvda5 == null ? "" : `<br><span class="csc-muted">Nvidia stock, 5 days later: ${d3.format("+.1%")(e.nvda5)}</span>`)))
    .on("mousemove", ev => moveTip(ev))
    .on("mouseleave", hideTip);

  // legend doubles as a highlight control
  const legend = d3.select(root).select(".csc-legend").selectAll("button").data(GROUPS).join("button")
    .attr("type", "button").attr("class", "csc-key")
    .html(g => `<i style="background:${COLOR[g]}"></i>${LABEL[g]}`)
    .on("click", (ev, g) => { state.focus = state.focus === g ? null : g; draw(); });
  d3.select(root).selectAll(".csc-mode button").on("click", function () { setMode(this.dataset.mode); });

  // hover layer: nearest year
  const overlay = svg.append("rect").attr("class", "csc-overlay")
    .attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b)
    .on("mousemove", ev => {
      const [px] = d3.pointer(ev, svg.node());
      const d = d3.least(years, d => Math.abs(x(xOf(d)) - px));
      state.hoverYear = d.year; drawHover(d); showTip(ev, tipHtml(d));
    })
    .on("mouseleave", () => { state.hoverYear = null; gHover.style("display", "none"); hideTip(); });
  gEvt.raise();

  function tipHtml(d) {
    const rows = GROUPS.slice().sort((a, b) => d[b] - d[a]).map(g =>
      `<tr><td><i style="background:${COLOR[g]}"></i>${LABEL[g]}</td><td>${pct(d.share[g])}</td><td class="csc-muted">${d[g]}</td></tr>`).join("");
    return `<b>${d.year}${d.partial ? ` (through ${fmtDate(data.lastDate)})` : ""}</b>: ${d.total} notable models` +
      `<table>${rows}</table>`;
  }

  // ---------- drawing ----------
  function opacity(g) { return state.focus && state.focus !== g ? 0.18 : 1; }

  function draw() {
    const stack = state.mode === "stack";
    legend.attr("aria-pressed", g => state.focus === g).classed("dim", g => state.focus && state.focus !== g);
    d3.select(root).selectAll(".csc-mode button").attr("aria-pressed", function () { return this.dataset.mode === state.mode; });

    // lines (each group on a common baseline)
    const line = d3.line().x(d => x(xOf(d))).y(d => y(d.v));
    const series = GROUPS.map(g => ({ g, pts: years.map(d => ({ ...d, v: d.share[g] })) }));
    const gs = gLine.selectAll("g.csc-series").data(stack ? [] : series, s => s.g).join(
      en => { const e = en.append("g").attr("class", "csc-series");
        e.append("path").attr("class", "csc-line solid"); e.append("path").attr("class", "csc-line partial"); return e; });
    gs.style("opacity", s => opacity(s.g)).attr("stroke", s => COLOR[s.g]).attr("fill", s => COLOR[s.g]);
    // full years solid, last stretch into the partial year dashed
    gs.select(".solid").attr("d", s => line(s.pts.filter(d => !d.partial)));
    gs.select(".partial").attr("d", s => last.partial ? line(s.pts.slice(-2)) : null);
    gs.selectAll("circle").data(s => s.pts).join("circle")
      .attr("cx", d => x(xOf(d))).attr("cy", d => y(d.v)).attr("r", 4)
      .attr("class", d => d.partial ? "csc-dot open" : "csc-dot");

    // 100% stacked areas, China on the bottom so its share sits on the baseline
    const order = ["China", "US + China", "US", "Other"];
    const stacked = d3.stack().keys(order).value((d, k) => d.share[k])(years);
    const area = d3.area().x(d => x(xOf(d.data))).y0(d => y(d[0])).y1(d => y(d[1]));
    gArea.selectAll("path").data(stack ? stacked : [], s => s.key).join("path")
      .attr("class", "csc-area").attr("fill", s => COLOR[s.key]).attr("d", area).style("opacity", s => opacity(s.key));

    // direct labels at the right edge (lines) or inside the last column (stack)
    const end = years[years.length - 1];
    let labels = GROUPS.map(g => ({ g, v: end.share[g],
      y: stack ? y((stacked.find(s => s.key === g)[years.length - 1][0] + stacked.find(s => s.key === g)[years.length - 1][1]) / 2) : y(end.share[g]) }));
    if (stack) labels = labels.filter(l => l.v >= 0.04);
    dodge(labels, 15);
    gLbl.selectAll("text").data(labels, l => l.g).join("text")
      .attr("x", x(xOf(end)) + 10).attr("y", l => l.ly).attr("dy", "0.35em")
      .style("opacity", l => opacity(l.g))
      .html(l => `<tspan font-weight="700">${LABEL[l.g]}</tspan> ${pct(l.v)}`);

    drawWindows();
    if (state.hoverYear != null) drawHover(years.find(d => d.year === state.hoverYear));
  }

  // story step 2: shade the two-year windows around the controls and label China's share in each
  function drawWindows() {
    const on = state.step >= 2;
    const w = on ? data.windows : [];
    const g = gWin.selectAll("g").data(w).join(en => { const e = en.append("g");
      e.append("rect"); e.append("text").attr("class", "csc-win-pct"); e.append("text").attr("class", "csc-win-lbl"); return e; });
    g.select("rect").attr("x", d => x(dec(d.start))).attr("width", d => x(dec(d.end)) - x(dec(d.start)))
      .attr("y", m.t).attr("height", H - m.t - m.b).attr("class", (d, i) => i % 2 ? "csc-win alt" : "csc-win");
    // narrow windows (small screens) keep just the percent, so neighboring labels never touch
    const roomy = w.length && x(dec(w[0].end)) - x(dec(w[0].start)) >= 76;
    g.select(".csc-win-pct").attr("x", d => (x(dec(d.start)) + x(dec(d.end))) / 2).attr("y", m.t + 40).attr("text-anchor", "middle")
      .text(d => pct(d.China / d.total));
    g.select(".csc-win-lbl").attr("x", d => (x(dec(d.start)) + x(dec(d.end))) / 2).attr("y", m.t + 56).attr("text-anchor", "middle")
      .text(d => roomy ? `${d.China} of ${d.total}` : "");
    gWin.selectAll("text.csc-win-head").data(on ? [w[0]] : []).join("text").attr("class", "csc-win-head")
      .attr("x", d => x(dec(d.start)) + 6).attr("y", m.t + 18).text(roomy ? "China's share of models, 2 years at a time" : "China's share");
  }

  function drawHover(d) {
    gHover.style("display", null);
    const cx = x(xOf(d));
    gHover.selectAll("line").data([0]).join("line").attr("x1", cx).attr("x2", cx).attr("y1", m.t).attr("y2", H - m.b);
    const pts = state.mode === "stack" ? [] : GROUPS.map(g => ({ g, v: d.share[g] }));
    gHover.selectAll("circle").data(pts).join("circle").attr("cx", cx).attr("cy", p => y(p.v)).attr("r", 6)
      .attr("fill", p => COLOR[p.g]).style("opacity", p => opacity(p.g));
  }

  // keep direct labels at least `gap` px apart, top to bottom
  function dodge(ls, gap) {
    ls.sort((a, b) => a.y - b.y);
    ls.forEach((l, i) => { l.ly = i ? Math.max(l.y, ls[i - 1].ly + gap) : l.y; });
    const over = ls.length ? ls[ls.length - 1].ly - (H - m.b) : 0;
    if (over > 0) ls.forEach(l => { l.ly -= over; });
    for (let i = ls.length - 2; i >= 0; i--) ls[i].ly = Math.min(ls[i].ly, ls[i + 1].ly - gap);
  }

  function showTip(ev, html) { tip.html(html).classed("on", true); moveTip(ev); }
  function moveTip(ev) {
    const r = root.getBoundingClientRect(), tw = tip.node().offsetWidth;
    let left = ev.clientX - r.left + 14;
    if (left + tw > r.width) left = ev.clientX - r.left - tw - 14;
    const th = tip.node().offsetHeight;
    let top = ev.clientY - r.top + 14;
    if (top + th > r.height || ev.clientY + 14 + th > window.innerHeight) top = ev.clientY - r.top - th - 14;
    // keep the whole tooltip on screen (small phones)
    left = Math.max(4 - r.left, Math.min(left, window.innerWidth - r.left - tw - 4));
    top = Math.max(4 - r.top, Math.min(top, window.innerHeight - r.top - th - 4));
    tip.style("left", left + "px").style("top", top + "px");
  }
  function hideTip() { tip.classed("on", false); }
  function fmtDate(iso) { return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }); }

  function setMode(mode) { state.mode = mode; draw(); }
  function setStep(step) {
    state.step = step;
    state.focus = step === 1 ? "China" : step === 2 ? "China" : null;
    draw();
  }

  draw();
  return { setStep, setMode, state };
}
