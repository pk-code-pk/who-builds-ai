// Opening chart: all 931 notable AI models, one dot each, driven by the hero's scroll steps.
//   step 0  dots drift in as a loose cloud (no encoding yet, just "this many models")
//   step 1  dots line up in one column per year (position = publication year)
//   step 2  color = who built it (sector)
//   step 3  color = where it was built (country)
// Colors are the story's shared palette, stepped lighter for the dark background.
//
//   const hero = heroDots(document.querySelector("#heroDots"), window.WHO_BUILDS);
//   hero.setStep(2);
function heroDots(root, data) {
  const ENC = {
    sector: { field: "sector", keys: ["Academia only", "Academia + Industry", "Industry only", "Other"],
      names: { "Academia only": "Universities alone", "Academia + Industry": "University + company", "Industry only": "Companies alone", Other: "Other" },
      color: { "Academia only": "#1f9d3a", "Academia + Industry": "#2ec4a6", "Industry only": "#e8a317", Other: "#5f6880" } },
    country: { field: "country", keys: ["China", "US + China", "US", "Other"],
      names: { China: "China", "US + China": "US + China together", US: "US", Other: "Rest of world" },
      color: { China: "#e66767", "US + China": "#b6a8ff", US: "#3987e5", Other: "#5f6880" } },
  };
  const NEUTRAL = "#c9d3ea";
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const models = data.models;
  const lastYear = +data.lastDate.slice(0, 4);
  const years = d3.range(2012, lastYear + 1);
  const PER_ROW = 5, S = 10, R = 3.8;
  const W = 900, m = { t: 100, r: 8, b: 34, l: 8 };
  const maxN = d3.max(years, y => models.filter(d => d.year === y).length);
  const H = m.t + Math.ceil(maxN / PER_ROW) * S + m.b;
  const step = (W - m.l - m.r) / years.length, colW = (PER_ROW - 1) * S;
  const colX = y => m.l + (y - years[0]) * step + (step - colW) / 2;
  const baseY = H - m.b - S / 2;
  let current = -1;

  root.classList.add("hd");
  root.innerHTML = `<div class="hd-legend" aria-live="polite"></div>
    <svg viewBox="0 0 ${W} ${H}" role="img"></svg><div class="hd-tip" role="status"></div>`;
  const svg = d3.select(root).select("svg");
  const tip = d3.select(root).select(".hd-tip");
  const legend = d3.select(root).select(".hd-legend");

  const gYears = svg.append("g").attr("class", "hd-years").style("opacity", 0);
  gYears.selectAll("text").data(years).join("text")
    .attr("x", y => colX(y) + colW / 2).attr("y", H - 10).attr("text-anchor", "middle")
    .text(y => y === lastYear ? `${y}*` : (y % 2 === 0 ? y : ""));
  const gNote = svg.append("g").attr("class", "hd-notes");

  // cloud positions: a soft ellipse, seeded so the layout is the same every load
  const rand = d3.randomLcg(7), rx = d3.randomNormal.source(rand);
  const nx = rx(0, 1), ny = rx(0, 1);
  models.forEach(d => { d._cx = W / 2 + nx() * W * 0.2; d._cy = (H + m.t) / 2 - 20 + ny() * H * 0.16; });
  const dots = svg.append("g").selectAll("circle").data(models).join("circle")
    .attr("class", "hd-dot").attr("r", R).attr("fill", NEUTRAL)
    .attr("cx", d => d._cx).attr("cy", d => d._cy).style("opacity", 0)
    .on("mouseenter mousemove", (e, d) => showTip(e, d))
    .on("mouseleave", () => tip.classed("on", false));

  // column positions for an encoding (dots sorted inside each year so colors stay grouped)
  function columns(enc) {
    const order = enc ? new Map(ENC[enc].keys.map((k, i) => [k, i])) : null;
    for (const y of years) {
      models.filter(d => d.year === y)
        .sort((a, b) => (order ? order.get(a[ENC[enc].field]) - order.get(b[ENC[enc].field]) : 0) || d3.ascending(a.date, b.date))
        .forEach((d, i) => { d._x = colX(y) + (i % PER_ROW) * S; d._y = baseY - Math.floor(i / PER_ROW) * S; });
    }
  }
  const topOf = y => baseY - Math.floor((models.filter(d => d.year === y).length - 1) / PER_ROW) * S;

  // on-chart labels for each step (numbers recomputed from the data, checked by check_story_numbers.py)
  function notesFor(s) {
    const yr = y => models.filter(d => d.year === y);
    if (s === 1) return [
      { y: 2012, lines: [`${yr(2012).length}`, "models in 2012"] },
      { y: 2023, lines: [`${yr(2023).length}`, "in 2023"] }];
    if (s === 2) return [
      { y: 2014, lines: [`${yr(2014).filter(d => d.sector === "Academia only").length} of ${yr(2014).length}`, "built by universities alone, 2014"] },
      { y: lastYear, lines: [`${yr(lastYear).filter(d => d.sector === "Academia only").length} of ${yr(lastYear).length}`, "in 2026 so far"], end: true }];
    if (s === 3) return [
      { y: lastYear, lines: [`${yr(lastYear).filter(d => d.country === "China").length} Chinese · ${yr(lastYear).filter(d => d.country === "US").length} US`, `of ${yr(lastYear).length} models in 2026 so far`], end: true }];
    return [];
  }
  function drawNotes(s) {
    const notes = notesFor(s);
    const g = gNote.selectAll("g.hd-note").data(notes, d => s + "-" + d.y).join(
      en => { const g = en.append("g").attr("class", "hd-note").style("opacity", 0);
        g.transition().delay(reduce ? 0 : 700).duration(reduce ? 0 : 400).style("opacity", 1); return g; },
      up => up,
      ex => ex.transition().duration(reduce ? 0 : 200).style("opacity", 0).remove());
    g.each(function (d) {
      const sel = d3.select(this); sel.selectAll("*").remove();
      const x = colX(d.y) + colW / 2, anchor = d.end ? "end" : "start", dx = d.end ? 6 : -6;
      // labels sit above the tallest column they run over, so they never cover dots
      const span = d.end ? d3.range(d.y - 3, d.y + 1) : d3.range(d.y, d.y + 4);
      const top = d3.min(span.filter(y => years.includes(y)), topOf);
      sel.append("line").attr("x1", x).attr("x2", x).attr("y1", topOf(d.y) - 8).attr("y2", top - 30);
      sel.append("text").attr("class", "hd-big").attr("x", x + dx).attr("y", top - 58).attr("text-anchor", anchor).text(d.lines[0]);
      sel.append("text").attr("class", "hd-small").attr("x", x + dx).attr("y", top - 38).attr("text-anchor", anchor).text(d.lines[1]);
    });
  }

  function drawLegend(enc) {
    if (!enc) { legend.html(""); return; }
    const E = ENC[enc], counts = d3.rollup(models, v => v.length, d => d[E.field]);
    legend.html(E.keys.map(k => `<span><i style="background:${E.color[k]}"></i>${E.names[k]} <b>${counts.get(k) || 0}</b></span>`).join(""));
  }

  function setStep(s) {
    if (s === current) return;
    const first = current < 0;
    current = s;
    const enc = s === 2 ? "sector" : s >= 3 ? "country" : null;
    if (s >= 1) columns(enc);
    const pos = d => s >= 1 ? [d._x, d._y] : [d._cx, d._cy];
    const fill = d => enc ? ENC[enc].color[d[ENC[enc].field]] : NEUTRAL;
    svg.attr("aria-label", `${models.length} notable AI models, one dot each` + (s >= 1 ? ", in a column per year" : "") +
      (enc ? `, colored by ${enc}` : "") + ".");
    if (reduce) {
      dots.interrupt().attr("cx", d => pos(d)[0]).attr("cy", d => pos(d)[1]).attr("fill", fill).style("opacity", 1);
    } else if (first) {
      // drift in from slightly lower and scattered
      dots.attr("cy", d => pos(d)[1] + 40 + Math.abs(d._cx - W / 2) * 0.1)
        .transition().delay((d, i) => (i % 97) * 9).duration(1100).ease(d3.easeCubicOut)
        .attr("cx", d => pos(d)[0]).attr("cy", d => pos(d)[1]).attr("fill", fill).style("opacity", 1);
    } else {
      dots.interrupt().style("opacity", 1).transition().duration(1000).ease(d3.easeCubicInOut)
        .delay(d => s === 1 && enc === null ? Math.random() * 300 : (d.year - years[0]) * 25)
        .attr("cx", d => pos(d)[0]).attr("cy", d => pos(d)[1]).attr("fill", fill);
    }
    gYears.transition().duration(reduce ? 0 : 500).style("opacity", s >= 1 ? 1 : 0);
    drawNotes(s);
    drawLegend(enc);
  }

  function showTip(e, d) {
    const r = root.getBoundingClientRect();
    const labs = d.orgs.slice(0, 3).join(", ") + (d.orgs.length > 3 ? ` +${d.orgs.length - 3} more` : "");
    tip.html(`<b>${d.name}</b><br><span class="hd-muted">${d.date} · ${labs}</span><br>` +
      `<span class="hd-muted">${ENC.sector.names[d.sector]} · ${ENC.country.names[d.country]}</span>`).classed("on", true);
    const tw = tip.node().offsetWidth, th = tip.node().offsetHeight;
    let left = e.clientX - r.left + 14; if (left + tw > r.width) left = e.clientX - r.left - tw - 14;
    let top = e.clientY - r.top - th - 12; if (top < 0) top = e.clientY - r.top + 16;
    left = Math.max(4 - r.left, Math.min(left, window.innerWidth - r.left - tw - 4));
    top = Math.max(4 - r.top, Math.min(top, window.innerHeight - r.top - th - 4));
    tip.style("left", left + "px").style("top", top + "px");
  }

  return { setStep, steps: 4 };
}
