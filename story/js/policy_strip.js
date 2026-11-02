// Frame 6: Ashley's chip policy strip chart, built in D3 from her event list (Milestone 9).
// One dot per policy event, placed by Nvidia's 5-day stock reaction and grouped by event type,
// with each group's median marked. Data: window.POLICY_EVENTS from scripts/build_policy_strip.py.
//
//   policyStrip(el, window.POLICY_EVENTS);
//
// Export controls are the first row and the only bright one, the same way frame 5 marks its export-control
// triangles (--ink bright, --ink-3 muted). Dots that would overlap are pushed up and down within their row,
// so every event stays visible. Hovering or tapping a dot shows the event and its reaction.
function policyStrip(root, data) {
  const KEY = "US Export Control";
  const NAME = { "US Export Control": "US export controls", "US Tariffs & Industrial Policy": "US tariffs and industrial policy",
    "China Action": "Actions by China", Diplomacy: "Diplomacy", "Corporate & Market": "Company and market news",
    "Product Launch": "Product launches", "AI Industry": "AI industry news" };
  const pct = v => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 1000) / 10)}%`;
  const fmtDate = d3.timeFormat("%b %-d, %Y"), parse = d3.timeParse("%Y-%m-%d");

  const groups = d3.groups(data.events, e => e.category)
    .map(([key, evs]) => ({ key, evs, med: d3.median(evs, e => e.reaction) }))
    .sort((a, b) => (b.key === KEY) - (a.key === KEY) || b.evs.length - a.evs.length);
  const ctrl = groups.find(g => g.key === KEY);
  const maxAbs = Math.ceil(d3.max(data.events, e => Math.abs(e.reaction)) * 20) / 20;

  root.classList.add("ps");
  root.innerHTML = `<svg role="img" aria-label="Strip chart of ${data.events.length} US-China chip policy events by Nvidia's stock move ` +
    `in the 5 trading days after each one, grouped by event type. ${groups.map(g => `${NAME[g.key]}: ${g.evs.length} events, ` +
    `median ${pct(g.med)}`).join(". ")}."></svg><div class="ctip" role="status"></div>`;
  const svg = d3.select(root).select("svg"), tip = d3.select(root).select(".ctip");
  let width = 0;

  function render() {
    const w = Math.round(root.clientWidth);
    if (!w) return;
    width = w;
    svg.selectAll("*").remove();
    const narrow = w < 600, r = narrow ? 5 : 6.5, labelW = narrow ? 0 : 230, axisH = 26;
    const x = d3.scaleLinear().domain([-maxAbs, maxAbs]).range([labelW + r, w - r]);

    // place each row's dots: sorted left to right, each one takes the closest free spot to the row's center line
    const rows = groups.map(g => {
      const placed = [];
      g.evs.slice().sort((a, b) => a.reaction - b.reaction).forEach(e => {
        const cx = x(e.reaction);
        for (let k = 0; ; k++) {
          const dy = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (r + 1);
          if (placed.every(p => Math.hypot(p.cx - cx, p.dy - dy) >= 2 * r + 1)) { placed.push({ e, cx, dy }); break; }
        }
      });
      const spread = d3.max(placed, p => Math.abs(p.dy)) + r;
      return { ...g, placed, spread };
    });

    let y = axisH;
    const gAxis = svg.append("g").attr("class", "ps-axis");
    rows.forEach((row, ri) => {
      const top = y, lblH = narrow ? 22 : 0, cy = top + lblH + row.spread + 6, bottom = cy + row.spread + 10;
      const g = svg.append("g").attr("class", "ps-row" + (row.key === KEY ? " key" : "")).style("--i", ri);
      if (ri) g.append("line").attr("class", "ps-sep").attr("x1", 0).attr("x2", w).attr("y1", top).attr("y2", top);
      const lbl = g.append("text").attr("class", "ps-lbl").attr("x", 0).attr("y", narrow ? top + 16 : cy - 3);
      lbl.append("tspan").text(NAME[row.key]);
      const sub = `${row.evs.length} event${row.evs.length > 1 ? "s" : ""} · median ${pct(row.med)}`;
      if (narrow) lbl.append("tspan").attr("class", "ps-sub").attr("dx", 8).text(sub);
      else g.append("text").attr("class", "ps-sub").attr("x", 0).attr("y", cy + 15).text(sub);
      g.append("line").attr("class", "ps-med").attr("x1", x(row.med)).attr("x2", x(row.med))
        .attr("y1", cy - row.spread - 4).attr("y2", cy + row.spread + 4);
      const dots = g.append("g").attr("class", "ps-dots").selectAll("g").data(row.placed).join("g").attr("class", "ps-dot");
      dots.append("circle").attr("class", "ps-mark").attr("cx", p => p.cx).attr("cy", p => cy + p.dy).attr("r", r);
      dots.append("circle").attr("class", "ps-hit").attr("cx", p => p.cx).attr("cy", p => cy + p.dy).attr("r", r + 4);
      hook(dots);
      y = bottom;
    });

    // zero line and ticks, drawn last under the dots' row groups but spanning every row
    gAxis.append("line").attr("class", "ps-zero").attr("x1", x(0)).attr("x2", x(0)).attr("y1", axisH - 6).attr("y2", y);
    const ticks = d3.ticks(-maxAbs, maxAbs, 5);
    gAxis.selectAll(".ps-tick").data(ticks).join("text").attr("class", "ps-tick")
      .attr("x", v => x(v)).attr("y", axisH - 12).attr("text-anchor", "middle").text(v => v === 0 ? "0" : pct(v));
    svg.attr("viewBox", `0 0 ${w} ${y}`).attr("height", y);
  }

  function hook(sel) {
    sel.on("pointerenter pointermove", (e, p) => { if (e.pointerType === "mouse") show(e, p); })
      .on("pointerleave", e => { if (e.pointerType === "mouse") hide(); })
      .on("click", (e, p) => { e.stopPropagation(); show(e, p); });
  }
  function show(e, p) {
    svg.selectAll(".ps-dot").classed("on", d => d === p);
    const ev = p.e;
    tip.html(`<b>${ev.event}</b><br>${fmtDate(parse(ev.date))} · ${NAME[ev.category]}<br>` +
      `Nvidia over the next 5 trading days: <b>${pct(ev.reaction)}</b><br><span class="ctip-muted">${ev.description}</span>`)
      .classed("on", true);
    place(e);
  }
  function hide() { tip.classed("on", false); svg.selectAll(".ps-dot").classed("on", false); }
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
  return { groups, ctrl };
}
