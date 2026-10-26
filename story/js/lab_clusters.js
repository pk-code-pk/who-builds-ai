// Frame 7: every lab behind a notable model in 2024 to 2026, as bubbles (Praneel, Milestone 9).
// Bubble = lab, area = notable models the lab worked on (a "lab credit": a model built by two labs counts for both),
// color = the lab's home country (window.WHO_BUILDS.labCountry, the same rule as the dashboard's lab bubbles).
//
//   const chart = labClusters(el, window.WHO_BUILDS, { mode: "cluster" });
//   chart.setMode("country");   // pull the labs apart into US / China / rest of world, animated
//
// Both arrangements come from a d3 force layout (pull to a center + no overlaps), settled once up front,
// so the chart looks the same on every load. Switching modes moves each bubble between its two spots.
function labClusters(root, data, opts = {}) {
  const lastYear = +data.lastDate.slice(0, 4);
  const [y0, y1] = opts.range || [2024, lastYear];
  const lastDay = d3.timeFormat("%b %-d, %Y")(d3.timeParse("%Y-%m-%d")(data.lastDate));
  const span = `${y0} to ${y1 === lastYear ? lastDay : y1}`;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // fill = bubble, text = label on the card, ink = label inside a bubble (each keeps 4.5:1)
  const GROUPS = [
    { key: "US", name: "US", fill: "#3987e5", text: "#7fb3f5", ink: "#0b1530" },
    { key: "China", name: "China", fill: "#e66767", text: "#ff9090", ink: "#0b1530" },
    { key: "Other", name: "Rest of world", fill: "#5f6880", text: "#c9d3ea", ink: "#ffffff" },
  ];
  const G = Object.fromEntries(GROUPS.map(g => [g.key, g]));
  const SHORT = { "Z.ai (Zhipu AI)": "Zhipu", "Tsinghua University": "Tsinghua", "LG AI Research": "LG AI" };
  const K = 10, PAD = 1.6, GAP = 70;   // unit-scale radius per sqrt(model), gap between bubbles, gap between groups

  const credits = d3.rollups(data.models.filter(m => m.year >= y0 && m.year <= y1).flatMap(m => m.orgs), v => v.length, o => o);
  const labs = credits.map(([lab, n]) => ({ lab, n, g: data.labCountry[lab] || "Other", r0: K * Math.sqrt(n) }))
    .sort((a, b) => b.n - a.n || d3.ascending(a.lab, b.lab));
  labs.forEach((d, i) => { d.rank = i; });
  GROUPS.forEach(g => { const ls = labs.filter(d => d.g === g.key); g.labs = ls.length; g.credits = d3.sum(ls, d => d.n); });
  const total = d3.sum(labs, d => d.n);

  // settle a set of bubbles around (0, 0) at unit scale; returns each lab's spot and the bounding box
  function settle(set, fx = 0.07, fy = 0.07) {
    const ns = set.map((d, i) => { const a = i * 2.39996, rr = K * 1.6 * Math.sqrt(i); return { d, x: rr * Math.cos(a), y: rr * Math.sin(a) }; });
    const sim = d3.forceSimulation(ns).force("x", d3.forceX(0).strength(fx)).force("y", d3.forceY(0).strength(fy))
      .force("c", d3.forceCollide(n => n.d.r0 + PAD).iterations(3)).stop();
    for (let i = 0; i < 320; i++) sim.tick();
    const box = { x0: d3.min(ns, n => n.x - n.d.r0), x1: d3.max(ns, n => n.x + n.d.r0),
      y0: d3.min(ns, n => n.y - n.d.r0), y1: d3.max(ns, n => n.y + n.d.r0) };
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;   // re-center on the box
    return { spots: new Map(ns.map(n => [n.d.lab, [n.x - cx, n.y - cy]])), w: box.x1 - box.x0, h: box.y1 - box.y0 };
  }
  const oneRound = settle(labs);
  const oneWide = settle(labs, 0.03, 0.13);   // on wide screens: a flat cluster about as tall as the row of groups
  const parts = GROUPS.map(g => settle(labs.filter(d => d.g === g.key)));

  const top3 = labs.slice(0, 3).map(d => `${d.lab} ${d.n}`).join(", ");
  root.classList.add("lc");
  root.innerHTML = `<svg role="img" aria-label="Bubble chart of the ${labs.length} labs that worked on notable AI models from ${span}, ` +
    `each circle sized by the models it worked on. Grouped by home country: ` +
    GROUPS.map(g => `${g.name}, ${g.labs} labs with ${g.credits} lab credits`).join("; ") +
    `. The largest are ${top3}."></svg><div class="ctip" role="status"></div>`;
  const svg = d3.select(root).select("svg"), tip = d3.select(root).select(".ctip");
  const state = { mode: opts.mode === "country" ? "country" : "cluster", width: 0 };
  let pos = null, nodes = null, glabels = null;

  // place both arrangements for the current width; returns screen positions for each mode
  function layout(w) {
    const narrow = w < 640, labelH = 52, one = narrow ? oneRound : oneWide;
    // country mode, unit scale: one row of three groups, or on a phone the US on top and the other two below
    let s, H, oneY, country = {}, groupLbl = [];
    if (!narrow) {
      const rowW = d3.sum(parts, p => p.w) + GAP * 2, rowH = d3.max(parts, p => p.h);
      s = Math.min(0.9, (w - 8) / rowW, 430 / rowH, (w - 8) / one.w);
      const bubbleH = Math.max(rowH, one.h) * s;
      H = bubbleH + labelH + 16;
      oneY = 8 + bubbleH - one.h * s / 2;
      // the groups and the one cluster both sit at the bottom of the bubble band, so the labels line up
      let x = (w - rowW * s) / 2;
      parts.forEach((p, i) => {
        const cx = x + p.w * s / 2, cy = 8 + bubbleH - rowH * s / 2;
        country[GROUPS[i].key] = [cx, cy];
        groupLbl.push({ g: GROUPS[i], x: cx, y: 8 + bubbleH + 26 });
        x += (p.w + GAP) * s;
      });
    } else {
      const [us, cn, ot] = parts, row2W = cn.w + ot.w + GAP * 0.6, row2H = Math.max(cn.h, ot.h);
      s = Math.min(0.75, (w - 8) / Math.max(us.w, row2W), (w - 8) / one.w);
      const top2 = 8 + us.h * s + labelH + 10;
      H = Math.max(top2 + row2H * s + labelH, one.h * s + labelH + 24);
      oneY = (H - labelH) / 2 + 4;
      country.US = [w / 2, 8 + us.h * s / 2];
      groupLbl.push({ g: GROUPS[0], x: w / 2, y: 8 + us.h * s + 26 });
      const x0 = (w - row2W * s) / 2;
      country.China = [x0 + cn.w * s / 2, top2 + row2H * s / 2];
      country.Other = [x0 + (cn.w + GAP * 0.6) * s + ot.w * s / 2, top2 + row2H * s / 2];
      groupLbl.push({ g: GROUPS[1], x: country.China[0], y: top2 + row2H * s + 26 },
                    { g: GROUPS[2], x: country.Other[0], y: top2 + row2H * s + 26 });
    }
    const oneC = [w / 2, oneY];
    const at = {
      cluster: new Map(labs.map(d => { const [x, y] = one.spots.get(d.lab); return [d.lab, [oneC[0] + x * s, oneC[1] + y * s]]; })),
      country: new Map(labs.map(d => {
        const [x, y] = parts[GROUPS.findIndex(g => g.key === d.g)].spots.get(d.lab), c = country[d.g];
        return [d.lab, [c[0] + x * s, c[1] + y * s]];
      })),
    };
    return { s, H, at, one, groupLbl, oneLbl: { x: w / 2, y: oneC[1] + one.h * s / 2 + 26 } };
  }

  function render() {
    const w = Math.round(root.clientWidth);
    if (!w) return;
    state.width = w;
    pos = layout(w);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${w} ${Math.ceil(pos.H)}`).attr("height", Math.ceil(pos.H));

    nodes = svg.append("g").selectAll("g").data(labs, d => d.lab).join("g").attr("class", "lc-node")
      // tell the layout checker (and anyone reading the DOM) the real color behind the label
      .style("background-color", d => G[d.g].fill)
      .attr("transform", d => `translate(${pos.at[state.mode].get(d.lab)})`);
    nodes.append("circle").attr("r", d => d.r0 * pos.s).attr("fill", d => G[d.g].fill);
    // name the biggest labs right on their bubble, with the count when there is room
    nodes.each(function (d) {
      const r = d.r0 * pos.s, name = SHORT[d.lab] || d.lab, fs = Math.max(11, Math.min(15, r / 2.6));
      if (d.rank > 11 || r < 17) return;
      const t = d3.select(this).append("text").attr("class", "lc-name").attr("fill", G[d.g].ink)
        .style("font-size", fs + "px").attr("text-anchor", "middle").text(name);
      if (t.node().getComputedTextLength() > 2 * r - 8) { t.remove(); return; }
      if (r >= 32) {
        t.attr("dy", "-0.15em");
        d3.select(this).append("text").attr("class", "lc-n").attr("fill", G[d.g].ink).style("font-size", Math.max(11, fs - 2) + "px")
          .attr("text-anchor", "middle").attr("dy", "1.05em").text(d.n);
      } else t.attr("dy", "0.35em");
    });
    nodes.on("pointerenter pointermove", (e, d) => { if (e.pointerType === "mouse") show(e, d); })
      .on("pointerleave", e => { if (e.pointerType === "mouse") hide(); })
      .on("click", (e, d) => { e.stopPropagation(); show(e, d); });

    // group names and totals under each group (country mode) or under the one cluster
    const lbl = (g, cls, name, color, line) => {
      const t = g.append("text").attr("class", cls).attr("text-anchor", "middle").attr("fill", color);
      t.append("tspan").attr("class", "lc-gname").text(name);
      t.append("tspan").attr("class", "lc-gsub").attr("x", 0).attr("dy", "1.35em").text(line);
      return t;
    };
    glabels = svg.append("g");
    pos.groupLbl.forEach(({ g, x, y }) => {
      const gg = glabels.append("g").attr("class", "lc-glbl country").attr("transform", `translate(${x},${y})`);
      lbl(gg, "lc-gtext", g.name, g.text, `${g.labs} labs · ${g.credits} lab credits`);
    });
    const og = glabels.append("g").attr("class", "lc-glbl cluster").attr("transform", `translate(${pos.oneLbl.x},${pos.oneLbl.y})`);
    lbl(og, "lc-gtext", "All labs", "#e8ecf6", `${labs.length} labs · ${total} lab credits`);
    glabels.selectAll(".lc-glbl").style("opacity", function () { return this.classList.contains(state.mode) ? 1 : 0; })
      .attr("aria-hidden", function () { return this.classList.contains(state.mode) ? null : "true"; });
  }

  function setMode(mode, animate = true) {
    if (mode !== "country" && mode !== "cluster") return;
    state.mode = mode;
    if (!nodes) return;
    hide();
    const go = animate && !reduce;
    // bigger labs move first, so the groups visibly pull apart rather than all jumping at once
    nodes.transition().duration(go ? 1300 : 0).delay(d => go ? Math.min(400, d.rank * 6) : 0).ease(d3.easeCubicInOut)
      .attr("transform", d => `translate(${pos.at[mode].get(d.lab)})`);
    glabels.selectAll(".lc-glbl").transition().duration(go ? 400 : 0).delay(function () {
      return go && this.classList.contains(mode) ? 1300 : 0;
    }).style("opacity", function () { return this.classList.contains(mode) ? 1 : 0; });
    glabels.selectAll(".lc-glbl").attr("aria-hidden", function () { return this.classList.contains(mode) ? null : "true"; });
    if (opts.onMode) opts.onMode(mode);
  }

  function show(e, d) {
    nodes.classed("on", x => x === d);
    const g = G[d.g];
    tip.html(`<b>${d.lab}</b><br>${g.key === "Other" ? "Rest of world" : g.name} · worked on ${d.n} notable model${d.n === 1 ? "" : "s"}` +
      `<br><span class="ctip-muted">${span}</span>`).classed("on", true);
    const r = root.getBoundingClientRect(), tw = tip.node().offsetWidth, th = tip.node().offsetHeight;
    let left = e.clientX - r.left + 14, top = e.clientY - r.top + 16;
    if (left + tw > r.width) left = e.clientX - r.left - tw - 14;
    left = Math.max(4 - r.left, Math.min(left, window.innerWidth - r.left - tw - 4));
    top = Math.max(4 - r.top, Math.min(top, window.innerHeight - r.top - th - 4));
    tip.style("left", left + "px").style("top", top + "px");
  }
  function hide() { tip.classed("on", false); if (nodes) nodes.classed("on", false); }
  document.addEventListener("click", hide);

  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);   // re-measure labels in the web font
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (Math.round(root.clientWidth) !== state.width) { hide(); render(); } }).observe(root);
  return { setMode, get mode() { return state.mode; }, labs, groups: GROUPS };
}
