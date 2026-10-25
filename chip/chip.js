/* chip.html: the 3D chip as a map of the story.
   Each region of the chip is one part of the story. Point at it to preview, click to go there.
   The left and right edges glow in proportion to the US and China shares of notable models in 2024 to 2026,
   and the circuit pulses once per US export-control event when the page opens.

   Everything that moves is a function of one clock (clockT, in seconds), so the scene can be filmed frame by frame:
   ?capture=1 hides the page around the chip; window.__setTime(t) draws the frame at time t;
   the video rig's handshake (__capPause, __capT, __mixerLastT, __heroReady) is supported too.

   Loads: window.THREE (vendor/three/three.chip.min.js), window.CHIP_GLB_B64 (chip/chip_model.js),
          window.COUNTRY_SHARE (country-share/data/country_share.js). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search);
  var CAPTURE = qs.get('capture') === '1';
  var REDUCED = !CAPTURE && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EMBED = !CAPTURE && qs.get('embed') === '1';   // ?embed=1: just the chip, for an <iframe> (e.g. the hub's header)
  if (CAPTURE) document.documentElement.classList.add('capture');
  if (EMBED) document.documentElement.classList.add('embed');
  // ?bg=04060d sets the background color (hex, no #), so an embedded chip can match the page around it
  var BG = /^[0-9a-f]{6}$/i.test(qs.get('bg') || '') ? '#' + qs.get('bg') : '#0b1530';
  if (BG !== '#0b1530') { document.documentElement.style.background = BG; document.body.style.background = BG; }
  function go(href) { if (EMBED) window.open(href, '_top'); else location.href = href; }

  /* ------------------------------------------------------------------ data */
  var CS = window.COUNTRY_SHARE;
  function share(y0, y1, key) {
    var n = 0, t = 0;
    CS.years.forEach(function (y) { if (y.year >= y0 && y.year <= y1) { n += y[key]; t += y.total; } });
    return { n: n, t: t, p: n / t };
  }
  var pct = function (p) { return Math.round(p * 100) + '%'; };
  var US = share(2024, 2026, 'US'), CN = share(2024, 2026, 'China'), CN_OLD = share(2012, 2016, 'China');
  var EVENTS = CS.events.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  var moves = EVENTS.map(function (e) { return e.nvda5; });
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(iso, withDay) {
    var p = iso.split('-');
    return MONTHS[+p[1] - 1] + (withDay ? ' ' + (+p[2]) + ',' : '') + ' ' + p[0];
  }
  var signed = function (x) { var r = Math.round(x * 100); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + '%'; };
  var evRange = fmtDate(EVENTS[0].date) + ' to ' + fmtDate(EVENTS[EVENTS.length - 1].date);

  // Five sections. Numbers in "take" are the story's own (checked by scripts/check_story_numbers.py);
  // the US/China shares and the event count are computed from the data file above.
  var SECTIONS = {
    who: { n: 1, name: 'Who builds AI', where: 'Story · frame 2', href: 'story/index.html#frame2', color: '#1f9d3a', text: '#5bd178',
      take: 'Models built by <b>universities alone</b> fell from <b>46%</b> of notable models in 2012 to 2016 to <b>2%</b> in 2024 to 2026.' },
    compute: { n: 2, name: 'The compute race', where: 'Story · frame 3', href: 'story/index.html#frame3', color: '#e8a317', text: '#f2b84b',
      take: 'The most expensive training run went from about <b>$2 million</b> (GPT-3, 2020) to about <b>$388 million</b> (Grok 4, 2025).' },
    narrow: { n: 3, name: 'The field is narrowing', where: 'Story · frame 4', href: 'story/index.html#frame4', color: '#d9e2f5', text: '#e8ecf6',
      take: '<b>119 labs</b> released at least one notable model in 2023. Only <b>43</b> did in 2025.' },
    race: { n: 4, name: 'US vs China', where: 'Story · frame 5', href: 'story/index.html#frame5', color: '#3987e5', text: '#7fb3f5',
      take: '<span class="c-china">China\'s</span> share of notable models rose from <b>' + pct(CN_OLD.p) + '</b> in 2012 to 2016 to <b>' +
        pct(CN.p) + '</b> in 2024 to 2026. The <span class="c-us">US</span> share was <b>' + pct(US.p) + '</b>.' },
    policy: { n: 5, name: 'Chip policy', where: 'Shock map', href: 'chip-policy.html', color: '#b6a8ff', text: '#c9beff',
      take: '<b>' + EVENTS.length + '</b> US export-control events since ' + EVENTS[0].date.slice(0, 4) + '. In the 5 trading days after each, Nvidia\'s stock moved from <b>' +
        signed(Math.min.apply(null, moves)) + '</b> to <b>' + signed(Math.max.apply(null, moves)) + '</b>.' },
  };
  var ORDER = ['who', 'compute', 'narrow', 'race', 'policy'];

  // Regions on the chip's top face, in the model's own coordinates: [xMin, zMin, xMax, zMax].
  // The chip is 1.87 wide (x) by 3.52 long (z). Index 5, the outer frame, is "everything else on the chip".
  var CHIP_RECT = [-0.93, -1.75, 0.93, 1.75];
  var REGIONS = [
    { sec: 'who', rect: [-0.57, -1.47, 0.57, -0.36], pin: [0, -0.92] },     // upper block
    { sec: 'compute', rect: [-0.57, -0.36, 0.57, 0.36], pin: [0, 0] },      // center die
    { sec: 'narrow', rect: [-0.57, 0.36, 0.57, 1.45], pin: [0, 0.9] },      // lower block
    { sec: 'race', rect: [-0.89, -1.5, -0.57, 1.5], pin: [-0.73, 0.15], color: '#3987e5', level: US.p },  // left edge: US
    { sec: 'race', rect: [0.57, -1.5, 0.89, 1.5], pin: [0.73, 0.15], color: '#e66767', level: CN.p },     // right edge: China
    { sec: 'policy', rect: CHIP_RECT, pin: [0, -1.62] },                    // outer frame
  ];
  var TOP_Y = 0.1;                      // height of the chip's top face (model units)
  var DATA_GLOW = 2.0;                  // edge traces glow at DATA_GLOW x share, so US vs China brightness is to scale

  /* ------------------------------------------------------------------ page text */
  $('lgUs').textContent = pct(US.p); $('lgUsN').textContent = US.n + ' of ' + US.t;
  $('lgCn').textContent = pct(CN.p); $('lgCnN').textContent = CN.n + ' of ' + CN.t;
  $('lgEvN').textContent = EVENTS.length; $('lgEvRange').textContent = evRange;

  var list = $('sectionList');
  ORDER.forEach(function (key) {
    var s = SECTIONS[key];
    var li = document.createElement('li');
    li.innerHTML = '<a class="sec" href="' + s.href + '" data-sec="' + key + '" style="--sc:' + s.color + '">' +
      '<span class="sec-num">' + s.n + '</span><span class="sec-name">' + s.name + '</span>' +
      '<span class="sec-where">' + s.where + ' →</span><span class="sec-take">' + s.take + '</span></a>';
    list.appendChild(li);
  });
  var secLinks = Array.prototype.slice.call(list.querySelectorAll('.sec'));

  var ticker = { count: $('tickCount'), text: $('tickText'), replay: $('tickReplay'), shown: -2 };
  function tickerDone() {
    ticker.count.textContent = EVENTS.length;
    ticker.text.textContent = 'US export-control events on AI chips, ' + evRange;
  }
  tickerDone();

  /* ------------------------------------------------------------------ WebGL setup */
  // The renderer tone-maps everything, background included (ACES filmic, as in three.js). This finds the linear color
  // that comes out as the page's background color after that, so the canvas has no visible box around it.
  function bgThroughToneMapping(hex) {
    var IN = [[0.59719, 0.35458, 0.04823], [0.07600, 0.90834, 0.01566], [0.02840, 0.13383, 0.83777]];
    var OUT = [[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]];
    var mul = function (M, v) { return M.map(function (r) { return r[0] * v[0] + r[1] * v[1] + r[2] * v[2]; }); };
    var fitc = function (x) { return (x * (x + 0.0245786) - 0.000090537) / (x * (0.983729 * x + 0.4329510) + 0.238081); };
    var aces = function (c) { return mul(OUT, mul(IN, c.map(function (x) { return x / 0.6; })).map(fitc)); };
    var target = new T.Color(hex), want = [target.r, target.g, target.b], lin = want.slice();
    for (var it = 0; it < 120; it++) {
      var got = aces(lin);
      for (var k = 0; k < 3; k++) lin[k] *= Math.pow(want[k] / Math.max(got[k], 1e-6), 0.5);
    }
    return new T.Color(lin[0], lin[1], lin[2]);
  }

  var T = window.THREE, renderer;
  function noGL(msg) {
    $('loading').hidden = true; $('nogl').hidden = false;
    if (msg) console.warn('chip: ' + msg);
  }
  try {
    if (!T || !window.CHIP_GLB_B64) throw new Error('missing three.js or model');
    renderer = new T.WebGLRenderer({ canvas: $('chipCanvas'), antialias: true, powerPreference: 'high-performance' });
  } catch (e) { noGL(e.message); return; }

  var stage = $('stage'), canvas = $('chipCanvas');
  var dprParam = parseFloat(qs.get('dpr'));
  renderer.setPixelRatio(CAPTURE && dprParam ? dprParam : Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  var scene = new T.Scene();
  scene.background = bgThroughToneMapping(BG);
  var pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  var camera = new T.PerspectiveCamera(30, 1, 0.1, 60);
  var ELEV = 56 * Math.PI / 180;      // camera height angle above the chip's plane

  // studio light: white key from the front right, two blue rims from behind
  var key = new T.DirectionalLight('#ffffff', 1.5); key.position.set(2.5, 5, 3.5); scene.add(key);
  var rimA = new T.DirectionalLight('#4d8cff', 2.6); rimA.position.set(-3, 1.2, -4.5); scene.add(rimA);
  var rimB = new T.DirectionalLight('#3987e5', 1.3); rimB.position.set(3.5, 0.8, -3); scene.add(rimB);

  var pivot = new T.Group(); scene.add(pivot);          // turns and tilts
  var holder = new T.Group(); pivot.add(holder);        // centers the model on the pivot

  // faint blue glow under the chip
  (function addHalo() {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d'), grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(57,135,229,0.55)'); grad.addColorStop(0.45, 'rgba(57,135,229,0.18)'); grad.addColorStop(1, 'rgba(57,135,229,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    var tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    var halo = new T.Mesh(new T.PlaneGeometry(3.0, 4.9), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.38 }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = -0.12; pivot.add(halo);
  })();

  // post: render, gentle bloom on the brightest traces, tone map, and a glitch pass that is off except for a blink
  var composer = new T.EffectComposer(renderer);
  composer.addPass(new T.RenderPass(scene, camera));
  var bloom = new T.UnrealBloomPass(new T.Vector2(512, 512), 0.32, 0.18, 0.74);
  composer.addPass(bloom);
  composer.addPass(new T.OutputPass());
  var glitchPass = new T.ShaderPass({
    uniforms: { tDiffuse: { value: null }, uAmt: { value: 0 }, uBand: { value: 0.5 }, uLines: { value: 400 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float uAmt; uniform float uBand; uniform float uLines; varying vec2 vUv;',
      'void main(){',
      '  vec2 uv = vUv;',
      '  float band = step(abs(uv.y - uBand), 0.035);',
      '  uv.x += band * 0.006 * uAmt;',
      '  vec2 o = vec2(0.0022 * uAmt, 0.0);',
      '  vec4 c = texture2D(tDiffuse, uv);',
      '  c.r = texture2D(tDiffuse, uv + o).r; c.b = texture2D(tDiffuse, uv - o).b;',
      '  c.rgb *= 1.0 - 0.07 * uAmt * step(0.5, fract(uv.y * uLines));',
      '  gl_FragColor = c;',
      '}'].join('\n'),
  });
  glitchPass.enabled = false;
  composer.addPass(glitchPass);

  /* ------------------------------------------------------------------ chip material: region glow shader */
  var U = {
    uToChip: { value: new T.Matrix4() },
    uChip: { value: new T.Vector4().fromArray(CHIP_RECT) },
    uRect: { value: REGIONS.map(function (r) { return new T.Vector4().fromArray(r.rect); }) },
    uRegCol: { value: REGIONS.map(function (r) { return new T.Color(r.color || SECTIONS[r.sec].color); }) },
    uRegHover: { value: [0, 0, 0, 0, 0, 0] },
    uRegLevel: { value: REGIONS.map(function (r) { return r.level ? DATA_GLOW * r.level : 0; }) },
    uRegFlick: { value: [0, 0, 0, 0, 0, 0] },
    uBaseCol: { value: new T.Color('#43a6f2') },
    uBase: { value: 1.2 },
    uBreath: { value: 1 },
    uPacket: { value: [new T.Vector4(0, 0, 0.1, 0), new T.Vector4(0, 0, 0.1, 0)] },
    uDim: { value: 1 },
    // the two data bars: [xMin, xMax, zTop, zBottom] in model units, their colors, and how far they have grown (0..1)
    uBar: { value: [new T.Vector4(), new T.Vector4()] },
    uBarCol: { value: [new T.Color('#3987e5'), new T.Color('#e66767')] },
    uBarGrow: { value: 1 },
  };
  // US bar on the left edge, China bar on the right edge. Each grows up from the near end of the chip,
  // and its length is that country's share of 2024-26 notable models (full edge = 100%).
  [[3, 0.012, 0.034], [4, -0.034, -0.012]].forEach(function (b, k) {
    var r = REGIONS[b[0]].rect, x = b[1] > 0 ? r[0] : r[2], len = r[3] - r[1];
    U.uBar.value[k].set(x + Math.min(b[1], b[2]), x + Math.max(b[1], b[2]), r[3] - REGIONS[b[0]].level * len, r[3]);
  });
  var CHIP_FRAG_HEAD = [
    'varying vec3 vChip;',
    'uniform vec4 uChip; uniform vec4 uRect[6]; uniform vec3 uRegCol[6];',
    'uniform float uRegHover[6]; uniform float uRegLevel[6]; uniform float uRegFlick[6];',
    'uniform vec3 uBaseCol; uniform float uBase; uniform float uBreath; uniform vec4 uPacket[2]; uniform float uDim;',
    'uniform vec4 uBar[2]; uniform vec3 uBarCol[2]; uniform float uBarGrow;',
    'float rmask(vec4 r, vec2 p) {',
    '  vec2 a = smoothstep(r.xy - 0.004, r.xy + 0.004, p) * (1.0 - smoothstep(r.zw - 0.004, r.zw + 0.004, p));',
    '  return a.x * a.y; }',
    'float redge(vec4 r, vec2 p) {',
    '  float e = min(min(p.x - r.x, r.z - p.x), min(p.y - r.y, r.w - p.y));',
    '  return 1.0 - smoothstep(0.004, 0.013, abs(e)); }',
  ].join('\n');
  var CHIP_FRAG_BODY = [
    // the model's emissive map holds the circuitry; use its brightness as a "this is a trace" mask
    'vec2 cp = vChip.xz;',
    'float trace = max(totalEmissiveRadiance.r, max(totalEmissiveRadiance.g, totalEmissiveRadiance.b));',
    'float inChip = rmask(uChip, cp);',
    'float m[6]; float others = 0.0;',
    'for (int i = 0; i < 5; i++) { m[i] = rmask(uRect[i], cp); others = max(others, m[i]); }',
    'm[5] = inChip * (1.0 - others);',
    'float side = max(m[3], m[4]);',
    'float flick = 0.0; float hov = 0.0;',
    'for (int i = 0; i < 6; i++) { flick += m[i] * uRegFlick[i]; hov = max(hov, m[i] * uRegHover[i]); }',
    // baseline: blue traces everywhere except the two data edges
    'vec3 em = uBaseCol * trace * uBase * (1.0 - side);',
    'for (int i = 0; i < 6; i++) {',
    '  vec4 rr = (i == 5) ? uChip : uRect[i];',
    '  em += uRegCol[i] * m[i] * trace * (uRegLevel[i] * uBreath + 2.0 * uRegHover[i]);',
    '  em += uRegCol[i] * uRegHover[i] * (0.05 * m[i] + 0.8 * redge(rr, cp) * inChip);',
    '}',
    // data packets: a small bright spot that only lights the traces it passes over
    'for (int j = 0; j < 2; j++) {',
    '  vec2 d = cp - uPacket[j].xy;',
    '  if (uPacket[j].z > 0.0) d.y *= 0.4; else d.x *= 0.4;',   // stretch along the direction of travel
    '  float g = exp(-dot(d, d) / (uPacket[j].z * uPacket[j].z));',
    '  em += vec3(0.75, 0.93, 1.0) * g * uPacket[j].w * (3.2 * trace + 0.1);',
    '}',
    // data bars: a dim full-length track, and a bright bar as long as the share
    'for (int k = 0; k < 2; k++) {',
    '  vec4 b = uBar[k]; float full = (k == 0) ? uRect[3].y : uRect[4].y;',
    '  float zTop = mix(b.w, b.z, uBarGrow);',
    '  float inX = smoothstep(b.x - 0.003, b.x + 0.003, cp.x) * (1.0 - smoothstep(b.y - 0.003, b.y + 0.003, cp.x));',
    '  float bar = inX * smoothstep(zTop - 0.006, zTop + 0.006, cp.y) * (1.0 - smoothstep(b.w - 0.006, b.w + 0.006, cp.y));',
    '  float track = inX * smoothstep(full - 0.006, full + 0.006, cp.y) * (1.0 - smoothstep(b.w - 0.006, b.w + 0.006, cp.y));',
    '  em += uBarCol[k] * (bar * 1.15 * uBreath + track * 0.06);',
    '}',
    'em *= max(0.0, 1.0 + flick);',
    'totalEmissiveRadiance = em;',
    'float chipDim = mix(uDim, 1.0, hov);',
  ].join('\n');

  function tuneMaterial(mat, maxAniso) {
    mat.color.setScalar(0.42);             // darker package: reads as a black chip
    mat.roughness = 0.62;                  // multiplies the roughness map: a bit glossier
    mat.emissive.set('#ffffff'); mat.emissiveIntensity = 1;
    [mat.map, mat.emissiveMap, mat.normalMap].forEach(function (t) { if (t) t.anisotropy = maxAniso; });
    mat.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform mat4 uToChip;\nvarying vec3 vChip;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvChip = (uToChip * modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + CHIP_FRAG_HEAD)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + CHIP_FRAG_BODY)
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb *= chipDim;');
    };
    mat.needsUpdate = true;
  }

  /* ------------------------------------------------------------------ "life": breathing, packets, glitches */
  function hash(x) { var s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  // paths along the traces, in model coordinates: [x0, z0, x1, z1]
  var PATHS = [[-0.74, -1.45, -0.74, 1.45], [0.74, 1.45, 0.74, -1.45], [-0.82, 1.6, 0.82, 1.6], [0.82, -1.6, -0.82, -1.6],
    [-0.68, 1.4, -0.68, -1.4], [0.68, -1.4, 0.68, 1.4]];
  function packetAt(t, period, phase, seed, out) {
    var tt = t - phase, k = Math.floor(tt / period), local = tt - k * period, dur = 1.6;
    out.w = 0;
    if (tt < 0 || local > dur || hash(k * 7.13 + seed) < 0.3) return;
    var p = PATHS[Math.floor(hash(k * 3.71 + seed + 1) * PATHS.length)], u = local / dur;
    var alongZ = p[0] === p[2];     // radius sign tells the shader which way the packet is stretched
    out.set(p[0] + (p[2] - p[0]) * u, p[1] + (p[3] - p[1]) * u, alongZ ? 0.09 : -0.09, Math.sin(Math.PI * u));
  }
  // glitch times are fixed in advance from a seed: one every 8 to 15 s, each 80 to 150 ms long
  var GLITCHES = [];
  for (var g = 9, i = 0; g < 7200; i++) {
    GLITCHES.push({ t: g, dur: 0.08 + 0.07 * hash(i + 0.5), region: Math.floor(hash(i + 0.25) * 6), split: hash(i + 0.75) > 0.45, band: 0.2 + 0.6 * hash(i + 0.9) });
    g += 8 + 7 * hash(i + 0.1);
  }
  function glitchAt(t) {
    var lo = 0, hi = GLITCHES.length - 1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (GLITCHES[mid].t <= t) lo = mid; else hi = mid - 1; }
    var q = GLITCHES[lo];
    return q && t >= q.t && t < q.t + q.dur ? { g: q, u: (t - q.t) / q.dur } : null;
  }

  // export-control pulses: one per event, 0.42 s apart, starting PULSE_DELAY s after the chip appears
  var PULSE_GAP = 0.42, PULSE_DELAY = 1.2;
  var seqStart = CAPTURE && qs.get('events') !== '1' ? -1e9 : null;   // set when the model is ready
  function eventPulse(t) {
    if (seqStart === null || REDUCED) return { amt: 0, idx: -2 };
    var tt = t - seqStart, idx = Math.floor(tt / PULSE_GAP), amt = 0;
    if (tt < 0) return { amt: 0, idx: -1 };
    if (idx < EVENTS.length) { var local = tt - idx * PULSE_GAP; amt = 0.7 * Math.exp(-local * 7); }
    return { amt: amt, idx: Math.min(idx, EVENTS.length) };
  }
  function updateTicker(idx) {
    if (idx === ticker.shown || CAPTURE) return;
    ticker.shown = idx;
    if (idx >= EVENTS.length || idx === -2) { tickerDone(); ticker.replay.hidden = REDUCED; return; }
    ticker.replay.hidden = true;
    if (idx < 0) { ticker.count.textContent = '0 / ' + EVENTS.length; ticker.text.textContent = 'US export-control events on AI chips'; return; }
    var e = EVENTS[idx];
    ticker.count.textContent = (idx + 1) + ' / ' + EVENTS.length;
    ticker.text.textContent = fmtDate(e.date, true) + ' · ' + e.event;
  }
  ticker.replay.addEventListener('click', function () { seqStart = clockT + 0.3; dirty = true; });

  /* ------------------------------------------------------------------ hover state */
  var hoverT = [0, 0, 0, 0, 0, 0];      // target 0/1 per region
  var current = null;                    // section key under the pointer / focus
  var touchPick = null;
  var card = $('card'), pinsEl = $('pins'), pins = [];
  REGIONS.forEach(function (r) {
    var s = SECTIONS[r.sec], p = document.createElement('span');
    p.className = 'pin'; p.textContent = s.n; p.style.setProperty('--pc', r.color || s.color);
    pinsEl.appendChild(p); pins.push(p);
  });

  function setHover(sec, how, x, y) {
    if (sec !== current) {
      current = sec;
      REGIONS.forEach(function (r, i) { hoverT[i] = r.sec === sec ? 1 : 0; pins[i].classList.toggle('hot', r.sec === sec); });
      secLinks.forEach(function (a) { a.classList.toggle('hot', a.dataset.sec === sec); });
      canvas.classList.toggle('over', !!sec && how === 'pointer');
      if (!sec) { card.hidden = true; touchPick = null; dirty = true; return; }
      var s = SECTIONS[sec];
      card.style.setProperty('--sb', sec === 'race' ? 'linear-gradient(90deg, #3987e5 50%, #e66767 50%)' : s.color);
      card.style.setProperty('--st', s.text);
      $('cardKicker').textContent = s.n + ' · ' + s.where;
      $('cardName').textContent = s.name;
      $('cardTake').innerHTML = s.take + (how === 'pointer' ? '<p class="card-click">Click to open →</p>' : '');
      $('cardGo').href = s.href;
      if (EMBED) $('cardGo').target = '_top';
      card.hidden = false;
      dirty = true;
    }
    card.classList.toggle('touch', how === 'touch');
    placeCard(how, x, y);
  }
  function placeCard(how, x, y) {
    if (!current) return;
    var sw = stage.clientWidth, sh = stage.clientHeight, cw = card.offsetWidth, ch = card.offsetHeight, px, py;
    if (how === 'pointer') { px = x + 18; py = y + 18; if (px + cw > sw - 8) px = x - cw - 18; }
    else {
      var i = REGIONS.findIndex(function (r) { return r.sec === current; });
      var pr = pinXY[i] || [sw / 2, sh / 2];
      px = pr[0] + 22; py = pr[1] - ch / 2;
      if (px + cw > sw - 8) px = pr[0] - cw - 22;
    }
    px = Math.max(8, Math.min(px, sw - cw - 8)); py = Math.max(8, Math.min(py, sh - ch - 8));
    card.style.transform = 'translate(' + Math.round(px) + 'px,' + Math.round(py) + 'px)';
    lastCard = { how: how, x: x, y: y };
  }
  var lastCard = null;

  secLinks.forEach(function (a) {
    var on = function () { setHover(a.dataset.sec, 'list'); }, off = function () { if (current === a.dataset.sec) setHover(null); };
    a.addEventListener('mouseenter', on); a.addEventListener('focus', on);
    a.addEventListener('mouseleave', off); a.addEventListener('blur', off);
  });

  /* ------------------------------------------------------------------ picking: ray to the chip's top face */
  var ray = new T.Raycaster(), ndc = new T.Vector2(), facePlane = new T.Plane(new T.Vector3(0, 1, 0), -TOP_Y);
  var hitP = new T.Vector3(), invM = new T.Matrix4(), model = null;
  function regionAt(clientX, clientY) {
    if (!model) return -1;
    var r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    invM.copy(model.matrixWorld).invert();
    ray.ray.applyMatrix4(invM);
    if (!ray.ray.intersectPlane(facePlane, hitP)) return -1;
    var x = hitP.x, z = hitP.z, c = CHIP_RECT;
    if (x < c[0] || x > c[2] || z < c[1] || z > c[3]) return -1;
    for (var i = 0; i < 5; i++) { var q = REGIONS[i].rect; if (x >= q[0] && x <= q[2] && z >= q[1] && z <= q[3]) return i; }
    return 5;
  }

  /* ------------------------------------------------------------------ pointer: hover, click, drag, parallax */
  var mouse = { x: 0, y: 0 }, par = { x: 0, y: 0 }, user = { yaw: 0, pitch: 0 }, drag = null;
  function localXY(e) { var r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  canvas.addEventListener('pointermove', function (e) {
    var r = stage.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (drag) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      if (drag.moved) {
        user.yaw = Math.max(-0.9, Math.min(0.9, drag.yaw + dx * 0.006));
        if (e.pointerType !== 'touch') user.pitch = Math.max(-0.3, Math.min(0.28, drag.pitch + dy * 0.004));
        canvas.classList.add('dragging'); dirty = true;
        return;
      }
    }
    if (e.pointerType === 'touch') return;
    var i = regionAt(e.clientX, e.clientY), xy = localXY(e);
    setHover(i >= 0 ? REGIONS[i].sec : null, 'pointer', xy[0], xy[1]);
  });
  canvas.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch' && !drag) setHover(null); mouse.x = mouse.y = 0; });
  canvas.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY, yaw: user.yaw, pitch: user.pitch, moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointercancel', function () { drag = null; canvas.classList.remove('dragging'); });
  canvas.addEventListener('pointerup', function (e) {
    var d = drag; drag = null; canvas.classList.remove('dragging');
    if (!d || d.moved) return;
    var i = regionAt(e.clientX, e.clientY);
    if (i < 0) { if (e.pointerType === 'touch') setHover(null); return; }
    var sec = REGIONS[i].sec;
    if (e.pointerType === 'touch' && touchPick !== sec) {   // first tap previews, second tap opens
      touchPick = sec; var xy = localXY(e); setHover(sec, 'touch', xy[0], xy[1]); return;
    }
    go(SECTIONS[sec].href);
  });

  /* ------------------------------------------------------------------ sizing */
  var pinXY = [];
  function fit() {
    var w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    var tanV = Math.tan(camera.fov * Math.PI / 360);
    var tall = camera.aspect < 0.85;                  // phones: turn the chip less so it can fill the width
    baseYaw = tall ? -0.08 : -0.24; swayAmp = tall ? 0.12 : 0.2;
    var halfH = (3.52 * Math.sin(ELEV) + 0.5) / 2, halfW = tall ? 1.3 : 1.5;   // chip's projected half size, with room for the sway
    var fillH = CAPTURE ? 0.7 : tall ? 0.84 : 0.74, fillW = CAPTURE ? 0.8 : tall ? 0.97 : 0.9;
    var dist = Math.max(halfH / (tanV * fillH), halfW / (tanV * camera.aspect * fillW));
    // aim a little toward the near end: perspective makes the near end bigger, so this centers the chip on screen
    camera.position.set(0, Math.sin(ELEV) * dist, Math.cos(ELEV) * dist + 0.22);
    camera.lookAt(0, 0, 0.22);
    camera.updateProjectionMatrix();
    glitchPass.uniforms.uLines.value = h * renderer.getPixelRatio() / 3;
    dirty = true;
  }
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage); else window.addEventListener('resize', fit);

  /* ------------------------------------------------------------------ one frame at time t */
  var baseYaw = -0.24, swayAmp = 0.2, hv = [0, 0, 0, 0, 0, 0], tmpV = new T.Vector3();
  function renderAt(t, dt) {
    var still = REDUCED;
    var ease = dt > 0 ? 1 - Math.exp(-dt * 10) : 1;
    if (!CAPTURE) { par.x += (mouse.x - par.x) * ease * 0.5; par.y += (mouse.y - par.y) * ease * 0.5; }
    pivot.rotation.y = baseYaw + (still ? 0 : Math.sin(t * 2 * Math.PI / 18) * swayAmp) + user.yaw + (still || CAPTURE ? 0 : par.x * 0.1);
    pivot.rotation.x = user.pitch + (still || CAPTURE ? 0 : par.y * 0.05);
    pivot.position.y = still ? 0 : Math.sin(t * 2 * Math.PI / 7) * 0.02;

    // life
    var breath = still ? 1 : 1 + 0.12 * Math.sin(t * 2 * Math.PI / 5.2);
    var ev = eventPulse(t);
    U.uBreath.value = breath;
    U.uBarGrow.value = still || seqStart === null ? 1 : Math.min(1, Math.max(0, (t - seqStart + PULSE_DELAY - 0.3) / 1.4));
    if (U.uBarGrow.value < 1) U.uBarGrow.value = 1 - Math.pow(1 - U.uBarGrow.value, 3);
    U.uBase.value = 1.2 * breath + ev.amt;
    if (still) { U.uPacket.value[0].w = 0; U.uPacket.value[1].w = 0; }
    else { packetAt(t, 3.4, 2.0, 1.0, U.uPacket.value[0]); packetAt(t, 5.3, 4.1, 9.0, U.uPacket.value[1]); }
    var gl = still ? null : glitchAt(t);
    for (var i = 0; i < 6; i++) U.uRegFlick.value[i] = 0;
    if (gl) U.uRegFlick.value[gl.g.region] = gl.u < 0.5 ? -0.85 : 0.6;
    glitchPass.enabled = !!(gl && gl.g.split);
    if (gl) { glitchPass.uniforms.uAmt.value = gl.u < 0.5 ? 1 : 0.6; glitchPass.uniforms.uBand.value = gl.g.band; }
    updateTicker(ev.idx);

    // hover glow eases in and out (instant with reduced motion)
    var maxH = 0;
    for (var j = 0; j < 6; j++) {
      hv[j] = still || dt === 0 ? hoverT[j] : hv[j] + (hoverT[j] - hv[j]) * (1 - Math.exp(-dt * 12));
      U.uRegHover.value[j] = hv[j]; maxH = Math.max(maxH, hv[j]);
    }
    U.uDim.value = 1 - 0.32 * maxH;

    scene.updateMatrixWorld();
    if (model) U.uToChip.value.copy(model.matrixWorld).invert();
    composer.render(dt);

    // markers follow the chip
    if (model && !CAPTURE) {
      var sw = stage.clientWidth, sh = stage.clientHeight;
      REGIONS.forEach(function (r, k) {
        tmpV.set(r.pin[0], TOP_Y + 0.02, r.pin[1]).applyMatrix4(model.matrixWorld).project(camera);
        var x = (tmpV.x + 1) / 2 * sw, y = (1 - tmpV.y) / 2 * sh;
        pinXY[k] = [x, y];
        pins[k].style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      if (lastCard && current && lastCard.how !== 'pointer') placeCard(lastCard.how, lastCard.x, lastCard.y);
    }
  }

  /* ------------------------------------------------------------------ clock + loop */
  var clockT = 0, lastMs = null, rafId = 0, dirty = true, manual = false, onScreen = true;
  function frame(ms) {
    rafId = requestAnimationFrame(frame);
    if (!model) return;
    var dt = lastMs === null ? 0 : Math.min(0.1, (ms - lastMs) / 1000);
    lastMs = ms;
    if (CAPTURE) {
      if (window.__capPause) return;
      if (typeof window.__capT === 'number') clockT = window.__capT; else clockT += dt;
      renderAt(clockT, 1 / 60);
      window.__mixerLastT = window.__capT;
      return;
    }
    if (!onScreen) return;
    if (!manual) clockT += dt;        // after __setTime the clock holds still; hover changes still draw
    var animating = (!REDUCED && !manual) || hv.some(function (v, k) { return Math.abs(v - hoverT[k]) > 0.001; });
    if (animating || dirty) { renderAt(clockT, dt); dirty = false; }
  }
  function start() { if (!rafId) { lastMs = null; rafId = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(rafId); rafId = 0; }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  if (window.IntersectionObserver && !CAPTURE) {
    new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; if (onScreen) dirty = true; }).observe(stage);
  }

  // deterministic hooks for filming: draw the frame at time t and hold the clock there; __setTime(null) resumes it
  window.__setTime = function (t) {
    if (t === null) { manual = false; return; }
    manual = true; clockT = t; if (model) renderAt(t, 0);
  };
  if (qs.get('debug') === '1') window.__chipDebug = { U: U, packetAt: packetAt };
  window.__chipState = function () { return { t: clockT, ready: !!model, hover: current, reduced: REDUCED, capture: CAPTURE }; };

  /* ------------------------------------------------------------------ load the model (embedded, so file:// works) */
  var t0 = performance.now();
  var b64 = window.CHIP_GLB_B64, bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (var b = 0; b < bin.length; b++) bytes[b] = bin.charCodeAt(b);
  window.CHIP_GLB_B64 = null;
  var loader = new T.GLTFLoader();
  loader.setMeshoptDecoder(T.MeshoptDecoder);
  loader.parse(bytes.buffer, '', function (gltf) {
    model = gltf.scene;
    var box = new T.Box3().setFromObject(model), c = box.getCenter(new T.Vector3());
    holder.position.set(-c.x, -c.y, -c.z);
    holder.add(model);
    var maxAniso = renderer.capabilities.getMaxAnisotropy(), seen = new Set();
    model.traverse(function (o) { if (o.isMesh && !seen.has(o.material)) { seen.add(o.material); tuneMaterial(o.material, maxAniso); } });
    fit();
    if (seqStart === null) seqStart = clockT + PULSE_DELAY;
    renderAt(clockT, 0);
    $('loading').hidden = true;
    pinsEl.classList.add('on');
    window.__chipLoadMs = Math.round(performance.now() - t0);
    window.__heroReady = true;
    window.__chipReady = true;
    dirty = true;
  }, function (err) { noGL('model failed to load: ' + (err && err.message)); });

  fit();
  start();
})();
