/* index.html (the chip page): the 3D chip as a map of the story.
   Each part of the chip is one part of the story. Point at it to preview, click to go there.
   The left and right sides of the chip's top carry two bars, as long as the US and China shares of notable models
   in 2024 to 2026, and the die and edge lights pulse once per US export-control event when the page opens.

   Everything that moves is a function of one clock (clockT, in seconds), so the scene can be filmed frame by frame:
   ?capture=1 hides the page around the chip; window.__setTime(t) draws the frame at time t;
   the video rig's handshake (__capPause, __capT, __mixerLastT, __heroReady) is supported too.

   Loads: window.THREE (vendor/three/three.chip.min.js), window.CHIP_GLB_B64 (chip/chip_amd_model.js),
          window.COUNTRY_SHARE (country-share/data/country_share.js).
   Model: "AMD Ryzen 7 8745HS Processor 3D Tech Render", royalty-free license. Its materials were placeholders,
   so the materials below are ours. The previous model's version of this file is chip/chip_glb_backup.js. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search);
  var CAPTURE = qs.get('capture') === '1';
  var REDUCED = !CAPTURE && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EMBED = !CAPTURE && qs.get('embed') === '1';   // ?embed=1: just the chip, for an <iframe> on another page
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
  // one-line takeaways for the section menu and the label on the chip (same numbers as "take")
  SECTIONS.who.short = 'Models from universities alone fell from 46% to 2% of notable models.';
  SECTIONS.compute.short = 'The costliest training run went from about $2 million to $388 million.';
  SECTIONS.narrow.short = '119 labs released a notable model in 2023. Only 43 did in 2025.';
  SECTIONS.race.short = 'Notable models in 2024 to 2026: US ' + pct(US.p) + ', China ' + pct(CN.p) + '.';
  SECTIONS.policy.short = EVENTS.length + ' US export-control events since ' + EVENTS[0].date.slice(0, 4) + ', and how Nvidia\'s stock moved after each.';

  // The six hover regions, by part of the model (part names come from scripts/chip/build_amd_model.mjs).
  // Model units: the package is 3.53 wide (x) and 2.14 deep (z); +z faces the camera; the lid's top is at y = 1.09.
  // "pin" is where the part's floating label points, [x, y, z].
  var WIN_X = 1.144;                  // the window in the white frame spans x = -1.144..1.144
  var REGIONS = [
    { sec: 'who', parts: ['lid', 'logo'], pin: [-0.48, 1.1, 0.42] },                       // the raised lid
    { sec: 'compute', parts: ['die', 'wall'], pin: [0.18, 0.36, 0.5] },                   // the glowing die under it
    { sec: 'narrow', parts: ['floor', 'frame_wall'], pin: [-0.92, 0.35, 0.6] },          // the window's floor around the die
    { sec: 'race', parts: [], pin: [-1.45, 0.385, -0.72], color: '#3987e5', level: US.p },  // left side of the frame: US
    { sec: 'race', parts: [], pin: [1.45, 0.385, -0.72], color: '#e66767', level: CN.p },   // right side of the frame: China
    { sec: 'policy', parts: ['layer_top', 'layer_mid', 'layer_base', 'strip_top', 'strip_low', 'edge_lights'],
      pin: [1.05, 0.1, 1.08] },                                                              // the layered outer edge, and the frame's front and back
  ];
  var PART_REGION = {};
  REGIONS.forEach(function (r, i) { r.parts.forEach(function (p) { PART_REGION[p] = i; }); });
  // The two data bars run along the top of the frame's left and right sides, from the front edge toward the back.
  // Full length (front to back) = 100%; each bar is as long as that country's share of 2024-26 notable models.
  var BAR_X = 1.45, BAR_HALF_W = 0.035, BAR_FRONT = 0.98, BAR_BACK = -0.98;

  /* ------------------------------------------------------------------ page text */
  $('lgUs').textContent = pct(US.p); $('lgUsN').textContent = US.n + ' of ' + US.t;
  $('lgCn').textContent = pct(CN.p); $('lgCnN').textContent = CN.n + ' of ' + CN.t;
  $('lgEvN').textContent = EVENTS.length; $('lgEvRange').textContent = evRange;

  var list = $('sectionList');
  ORDER.forEach(function (key) {
    var s = SECTIONS[key];
    var li = document.createElement('li');
    var dot = key === 'race' ? ';--sd:linear-gradient(90deg, #3987e5 50%, #e66767 50%)' : '';
    li.innerHTML = '<a class="sec" href="' + s.href + '" data-sec="' + key + '" style="--sc:' + s.color + dot + '">' +
      '<span class="sec-dot" aria-hidden="true"></span><span class="sec-name">' + s.name + '</span>' +
      '<span class="sec-take">' + s.short + '</span></a>';
    list.appendChild(li);
  });
  var secLinks = Array.prototype.slice.call(list.querySelectorAll('.sec'));

  var ticker = { count: $('tickCount'), text: $('tickText'), replay: $('tickReplay'), shown: -2 };
  function tickerDone() {
    ticker.count.textContent = EVENTS.length;
    var years = EVENTS[0].date.slice(0, 4) + ' to ' + EVENTS[EVENTS.length - 1].date.slice(0, 4);
    // short enough to fit next to the Replay button without being cut off
    ticker.text.textContent = (window.innerWidth < 600 ? 'US export controls, ' : 'US export controls on AI chips, ') + years;
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
  scene.environmentIntensity = 0.7;

  var camera = new T.PerspectiveCamera(26, 1, 0.1, 80);
  var ELEV = 38 * Math.PI / 180;      // camera height angle above the chip's plane: shows the lid and the layered edge
  var AIM = new T.Vector3(0, 0.3, 0.14);   // a little below and in front of the middle: centers the chip on screen

  // studio light: white key from the front right, a soft fill from the left, two blue rims from behind
  var key = new T.DirectionalLight('#ffffff', 1.25); key.position.set(3, 5, 4); scene.add(key);
  var fill = new T.DirectionalLight('#cfe0ff', 0.45); fill.position.set(-4, 2.5, 2); scene.add(fill);
  var rimA = new T.DirectionalLight('#4d8cff', 2.0); rimA.position.set(-3, 1.2, -4.5); scene.add(rimA);
  var rimB = new T.DirectionalLight('#3987e5', 1.0); rimB.position.set(3.5, 0.8, -3); scene.add(rimB);

  var pivot = new T.Group(); scene.add(pivot);          // turns and tilts
  var holder = new T.Group(); pivot.add(holder);        // centers the model on the pivot
  holder.position.y = -0.45;

  // soft cyan glow: a round gradient drawn once, used under the chip and around the die
  function glowTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d'), grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(76,201,240,0.6)'); grad.addColorStop(0.4, 'rgba(76,201,240,0.22)'); grad.addColorStop(1, 'rgba(76,201,240,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    var tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; return tex;
  }
  function glowPlane(w, d, opacity) {
    var m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false,
      blending: T.AdditiveBlending, opacity: opacity }));
    m.rotation.x = -Math.PI / 2; return m;
  }
  var halo = glowPlane(4.3, 3.1, 0.45); halo.position.y = -0.17; holder.add(halo);   // under the chip
  var dieGlow = null;                                                                  // around the die (added with the model)

  // post: render, gentle bloom on the brightest lights, tone map, and a glitch pass that is off except for a blink
  var composer = new T.EffectComposer(renderer);
  composer.addPass(new T.RenderPass(scene, camera));
  var bloom = new T.UnrealBloomPass(new T.Vector2(512, 512), 0.75, 0.55, 0.88);
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

  /* ------------------------------------------------------------------ materials: one region glow shader for all parts */
  var U = {
    uToChip: { value: new T.Matrix4() },
    uRegCol: { value: REGIONS.map(function (r) { return new T.Color(r.color || SECTIONS[r.sec].color); }) },
    uRegHover: { value: [0, 0, 0, 0, 0, 0] },
    uRegFlick: { value: [0, 0, 0, 0, 0, 0] },
    uBaseCol: { value: new T.Color('#4cc9f0') },   // the site's blue, pushed a little toward cyan
    uBase: { value: 1.0 },
    uBreath: { value: 1 },
    uPacket: { value: [new T.Vector4(0, 0, 0.1, 0), new T.Vector4(0, 0, 0.1, 0)] },
    uDim: { value: 1 },
    // the two data bars: [xMin, xMax, zBack (end of the bar), zFront (start)], their colors, and how far they have grown (0..1)
    uBar: { value: [new T.Vector4(), new T.Vector4()] },
    uBarCol: { value: [new T.Color('#3987e5'), new T.Color('#e66767')] },
    uBarGrow: { value: 1 },
  };
  [[3, -BAR_X], [4, BAR_X]].forEach(function (b, k) {
    U.uBar.value[k].set(b[1] - BAR_HALF_W, b[1] + BAR_HALF_W, BAR_FRONT - REGIONS[b[0]].level * (BAR_FRONT - BAR_BACK), BAR_FRONT);
  });

  // PART_KIND: 0 plain surface, 1 die (glow from its circuit map), 2 edge light (glows everywhere),
  //            3 window floor (faint glow on its brightest circuitry), 4 white frame (split into regions by x, carries the bars)
  var FRAG_HEAD = [
    'varying vec3 vChip;',
    'uniform vec3 uRegCol[6]; uniform float uRegHover[6]; uniform float uRegFlick[6];',
    'uniform vec3 uBaseCol; uniform float uBase; uniform float uBreath; uniform vec4 uPacket[2]; uniform float uDim;',
    'uniform vec4 uBar[2]; uniform vec3 uBarCol[2]; uniform float uBarGrow;',
    'float band(float a, float b, float x, float s) { return smoothstep(a - s, a + s, x) * (1.0 - smoothstep(b - s, b + s, x)); }',
    // x: bar (lit part), y: its full-length slot
    'vec2 barMask(int k, vec2 p) {',
    '  vec4 b = uBar[k]; float zEnd = mix(b.w, b.z, uBarGrow);',
    '  float inX = band(b.x, b.y, p.x, 0.004) * step(0.37, vChip.y);',
    '  return vec2(inX * band(zEnd, b.w, p.y, 0.006), inX * band(' + BAR_BACK.toFixed(3) + ', b.w, p.y, 0.006)); }',
  ].join('\n');
  // the frame's bars sit in a dark, matte slot, so their color reads clearly against the silver
  var FRAG_COLOR = [
    'float slot = 0.0;',
    '#if PART_KIND == 4',
    '  vec2 b0 = barMask(0, vChip.xz), b1 = barMask(1, vChip.xz);',
    '  slot = max(b0.y, b1.y);',
    '  diffuseColor.rgb *= 1.0 - 0.85 * slot;',
    '  diffuseColor.rgb = mix(diffuseColor.rgb, uBarCol[0] * 0.28, b0.x);',
    '  diffuseColor.rgb = mix(diffuseColor.rgb, uBarCol[1] * 0.28, b1.x);',
    '#endif',
  ].join('\n');
  var FRAG_SURFACE = 'metalnessFactor *= 1.0 - slot; roughnessFactor = mix(roughnessFactor, 0.85, slot);';
  var FRAG_BODY = [
    'vec2 cp = vChip.xz;',
    'float m[6]; for (int i = 0; i < 6; i++) m[i] = 0.0;',
    '#if PART_KIND == 4',
    '  float sl = 1.0 - smoothstep(-' + WIN_X + ' - 0.006, -' + WIN_X + ' + 0.006, cp.x);',
    '  float sr = smoothstep(' + WIN_X + ' - 0.006, ' + WIN_X + ' + 0.006, cp.x);',
    '  m[3] = sl; m[4] = sr; m[5] = 1.0 - sl - sr;',
    '#else',
    '  m[PART_REGION] = 1.0;',
    '#endif',
    'float hov = 0.0, flick = 0.0; vec3 hc = vec3(0.0);',
    'for (int i = 0; i < 6; i++) { hc += uRegCol[i] * m[i] * uRegHover[i]; hov = max(hov, m[i] * uRegHover[i]); flick += m[i] * uRegFlick[i]; }',
    'vec3 em = vec3(0.0);',
    '#if PART_KIND == 1 || PART_KIND == 2',
    '  float trace = PART_KIND == 1 ? max(totalEmissiveRadiance.r, max(totalEmissiveRadiance.g, totalEmissiveRadiance.b)) : 1.0;',
    '  #if PART_KIND == 1',
    '    trace = pow(trace, 0.6);',   // lift the die's mid-tones so its circuitry reads as a lit block
    '  #endif',
    '  #ifdef STRIP_C',   // edge strips: a bright line along the strip's middle
    '    trace = 0.05 + 0.95 * exp(-pow((vChip.y - STRIP_C) / STRIP_W, 2.0));',
    '  #endif',
    '  em = trace * (uBaseCol * uBase * GLOW * (1.0 - hov) + hc * 1.5);',
    // data packets: a small bright spot that runs along the edge lights or across the die
    '  for (int j = 0; j < 2; j++) {',
    '    vec2 d = cp - uPacket[j].xy;',
    '    em += vec3(0.75, 0.93, 1.0) * exp(-dot(d, d) / (uPacket[j].z * uPacket[j].z)) * uPacket[j].w * trace * 1.6;',
    '  }',
    '#elif PART_KIND == 3',
    '  float trace = smoothstep(0.5, 0.85, max(totalEmissiveRadiance.r, max(totalEmissiveRadiance.g, totalEmissiveRadiance.b)));',
    '  em = trace * uBaseCol * uBase * GLOW * (1.0 - hov) + hc * (0.05 + 0.9 * trace);',
    '#else',
    '  em = hc * 0.12;',
    '#endif',
    '#if PART_KIND == 4',
    '  for (int k = 0; k < 2; k++) {',
    '    vec2 bm = barMask(k, cp);',
    '    em += uBarCol[k] * (bm.x * 0.3 * uBreath * (1.0 + 0.8 * uRegHover[3 + k]) + bm.y * 0.04);',
    '  }',
    '#endif',
    'em *= max(0.0, 1.0 + flick);',
    'totalEmissiveRadiance = em;',
    'float chipDim = mix(uDim, 1.0, hov);',
  ].join('\n');

  function chipMaterial(part, mat, kind, glow) {
    var region = PART_REGION[part] === undefined ? 5 : PART_REGION[part];
    mat.defines = Object.assign({ PART_KIND: kind, PART_REGION: region, GLOW: (glow || 1).toFixed(3) }, mat.defines);
    mat.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform mat4 uToChip;\nvarying vec3 vChip;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvChip = (uToChip * modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + FRAG_HEAD)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAG_COLOR)
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n' + FRAG_SURFACE)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + FRAG_BODY)
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb *= chipDim;');
    };
    mat.customProgramCacheKey = function () { return 'chip-' + kind + '-' + region + '-' + glow; };
    mat.needsUpdate = true;
    return mat;
  }

  // brushed-metal grain for the lid: fine streaks in the roughness, running left to right
  function brushedTexture() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 512;
    var g = c.getContext('2d'); g.fillStyle = 'rgb(84,84,84)'; g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 2600; i++) {
      var y = hash(i * 1.37) * 512, v = 60 + Math.round(hash(i * 2.11 + 4) * 60);
      g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.5)';
      g.fillRect(hash(i * 3.7) * 512 - 120, y, 80 + hash(i * 5.3) * 360, 1);
    }
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  // light walls under the lid: bright at the die, fading upward
  function fadeTexture() {
    var c = document.createElement('canvas'); c.width = 4; c.height = 128;
    var g = c.getContext('2d'), grad = g.createLinearGradient(0, 128, 0, 0);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.2, 'rgba(255,255,255,0.3)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 4, 128);
    return new T.CanvasTexture(c);
  }

  var wallMat = null;
  function styleModel(root) {
    var maxAniso = renderer.capabilities.getMaxAnisotropy();
    var P = function (o) { return new T.MeshStandardMaterial(o); };
    root.traverse(function (o) {
      if (!o.isMesh) return;
      var name = o.name, old = o.material, m;
      if (name === 'frame' || name === 'frame_wall') m = chipMaterial(name, P({ color: name === 'frame' ? '#bfc5ce' : '#9aa2ae', metalness: 0.4, roughness: 0.42 }), 4);
      else if (name === 'lid') {
        m = chipMaterial(name, P({ color: '#b4bbc5', metalness: 1, roughness: 1, roughnessMap: brushedTexture() }), 0);
      } else if (name === 'logo') m = chipMaterial(name, P({ color: '#262a31', metalness: 0.2, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 0);
      else if (name === 'die') {
        m = chipMaterial(name, P({ color: '#0a0e14', metalness: 0.3, roughness: 0.25, emissive: '#ffffff', emissiveMap: old.emissiveMap }), 1, 3.6);
        m.emissiveMap.anisotropy = maxAniso;
      } else if (name === 'floor') {
        m = chipMaterial(name, P({ color: '#434955', metalness: 0.35, roughness: 0.45, map: old.map, emissive: '#ffffff', emissiveMap: old.map }), 3, 0.14);
        m.map.anisotropy = maxAniso;
      } else if (name === 'strip_top' || name === 'strip_low') {
        // each strip glows along a thin line through its middle (heights from the build script's printout)
        m = P({ color: '#0c1018', metalness: 0.4, roughness: 0.35, emissive: '#ffffff' });
        m.defines = name === 'strip_top' ? { STRIP_C: '0.215', STRIP_W: '0.022' } : { STRIP_C: '-0.012', STRIP_W: '0.018' };
        m = chipMaterial(name, m, 2, name === 'strip_top' ? 2.4 : 1.8);
      }
      else if (name === 'edge_lights') m = chipMaterial(name, P({ color: '#0c1018', roughness: 0.4, emissive: '#ffffff' }), 2, 2.6);
      else if (name === 'wall') {
        m = wallMat = new T.MeshBasicMaterial({ color: '#43a6f2', alphaMap: fadeTexture(), transparent: true, opacity: 0.12,
          side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending });
        o.renderOrder = 2;
      } else m = chipMaterial(name, P({ color: name === 'layer_base' ? '#1d2129' : '#14171d', metalness: 0.55, roughness: 0.32 }), 0);
      if (old && old.dispose) old.dispose();
      o.material = m;
    });
  }

  /* ------------------------------------------------------------------ "life": breathing, packets, glitches */
  function hash(x) { var s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  // paths for the light packets, in model coordinates [x0, z0, x1, z1]: along the front and back edges, and across the die
  var PATHS = [[-1.75, 1.07, 1.75, 1.07], [1.75, 1.07, -1.75, 1.07], [-1.75, -1.07, 1.75, -1.07],
    [-0.45, 0.42, 0.55, 0.42], [0.55, 0.2, -0.45, 0.2], [-1.76, -1.0, -1.76, 1.0], [1.76, 1.0, 1.76, -1.0]];
  function packetAt(t, period, phase, seed, out) {
    var tt = t - phase, k = Math.floor(tt / period), local = tt - k * period, dur = 1.8;
    out.w = 0;
    if (tt < 0 || local > dur || hash(k * 7.13 + seed) < 0.3) return;
    var p = PATHS[Math.floor(hash(k * 3.71 + seed + 1) * PATHS.length)], u = local / dur;
    out.set(p[0] + (p[2] - p[0]) * u, p[1] + (p[3] - p[1]) * u, 0.11, Math.sin(Math.PI * u));
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
  var currentReg = -1, currentHow = null, touchPick = null;
  var card = $('card'), cardHome = card.parentNode, cardSlot = $('cardSlot'), label = $('partLabel');

  // how: 'pointer' (mouse on the chip), 'list' (menu item hovered or focused), 'touch' (first tap on the chip)
  function setHover(sec, how, reg) {
    if (sec && (reg === undefined || reg < 0)) reg = REGIONS.findIndex(function (r) { return r.sec === sec; });
    if (sec !== current) {
      REGIONS.forEach(function (r, i) { hoverT[i] = r.sec === sec ? 1 : 0; });
      secLinks.forEach(function (a) { a.classList.toggle('hot', a.dataset.sec === sec); });
      dirty = true;
    }
    current = sec; currentReg = sec ? reg : -1; currentHow = how;
    canvas.classList.toggle('over', !!sec && how === 'pointer');
    if (!sec) { card.hidden = true; label.hidden = true; touchPick = null; return; }
    var s = SECTIONS[sec];
    if (how === 'touch') {
      // the preview card: below the chip on phones, so it never covers it
      card.style.setProperty('--sb', sec === 'race' ? 'linear-gradient(90deg, #3987e5 50%, #e66767 50%)' : s.color);
      card.style.setProperty('--st', s.text);
      $('cardKicker').textContent = s.where;
      $('cardName').textContent = s.name;
      $('cardTake').innerHTML = s.take;
      $('cardGo').href = s.href;
      if (EMBED) $('cardGo').target = '_top';
      card.classList.add('touch');
      label.hidden = true;
      var slotOn = !EMBED && getComputedStyle(cardSlot).display !== 'none';
      if (slotOn && card.parentNode !== cardSlot) cardSlot.appendChild(card);
      if (!slotOn && card.parentNode !== cardHome) cardHome.appendChild(card);
      card.hidden = false;
      if (slotOn) { card.style.transform = ''; card.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' }); }
      else placeCard();
      return;
    }
    card.hidden = true;
    var r = REGIONS[reg];
    label.style.setProperty('--lc', r.color || s.color);
    $('plName').textContent = s.name;
    $('plTake').textContent = s.short;
    label.classList.toggle('list', how === 'list');
    label.hidden = false;
    placeLabel();
  }
  // the label sits just above its part of the chip (below it if there is no room), with a small pointer
  function placeLabel() {
    if (label.hidden || currentReg < 0 || !pinXY[currentReg]) return;
    var sw = stage.clientWidth, sh = stage.clientHeight, lw = label.offsetWidth, lh = label.offsetHeight, a = pinXY[currentReg];
    // parts left of the middle get their label pushed outward to the left, parts on the right to the right,
    // so the label covers the edge of the chip rather than its lid
    var side = a[0] < sw * 0.42 ? -1 : a[0] > sw * 0.58 ? 1 : 0;
    var px = side < 0 ? a[0] - lw + 26 : side > 0 ? a[0] - 26 : a[0] - lw / 2;
    px = Math.max(8, Math.min(px, sw - lw - 8));
    var py = a[1] - lh - 14, below = py < 8;
    if (below) py = a[1] + 14;
    label.classList.toggle('below', below);
    label.style.setProperty('--ax', Math.max(12, Math.min(lw - 12, a[0] - px)).toFixed(0) + 'px');
    label.style.transform = 'translate(' + Math.round(px) + 'px,' + Math.round(py) + 'px)';
  }
  // touch card inside the stage (embed mode and wide touch screens): beside the part, kept inside the stage
  function placeCard() {
    if (card.hidden || card.parentNode !== cardHome || currentReg < 0) return;
    var sw = stage.clientWidth, sh = stage.clientHeight, cw = card.offsetWidth, ch = card.offsetHeight;
    var pr = pinXY[currentReg] || [sw / 2, sh / 2], px = pr[0] + 22, py = pr[1] - ch / 2;
    if (px + cw > sw - 8) px = pr[0] - cw - 22;
    px = Math.max(8, Math.min(px, sw - cw - 8)); py = Math.max(8, Math.min(py, sh - ch - 8));
    card.style.transform = 'translate(' + Math.round(px) + 'px,' + Math.round(py) + 'px)';
  }

  secLinks.forEach(function (a) {
    var on = function () { setHover(a.dataset.sec, 'list'); }, off = function () { if (current === a.dataset.sec && currentHow === 'list') setHover(null); };
    a.addEventListener('mouseenter', on); a.addEventListener('focus', on);
    a.addEventListener('mouseleave', off); a.addEventListener('blur', off);
  });

  /* ------------------------------------------------------------------ picking: ray to the model's parts */
  var ray = new T.Raycaster(), ndc = new T.Vector2(), hitP = new T.Vector3(), invM = new T.Matrix4(), model = null, pickables = [];
  function regionAt(clientX, clientY) {
    if (!model) return -1;
    var r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(pickables, false);
    if (!hits.length) return -1;
    var name = hits[0].object.name;
    if (name !== 'frame') return PART_REGION[name] === undefined ? 5 : PART_REGION[name];
    hitP.copy(hits[0].point).applyMatrix4(invM.copy(model.matrixWorld).invert());
    return hitP.x < -WIN_X ? 3 : hitP.x > WIN_X ? 4 : 5;
  }

  /* ------------------------------------------------------------------ pointer: hover, click, drag, parallax */
  var mouse = { x: 0, y: 0 }, par = { x: 0, y: 0 }, user = { yaw: 0, pitch: 0 }, drag = null;
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
    var i = regionAt(e.clientX, e.clientY);
    setHover(i >= 0 ? REGIONS[i].sec : null, 'pointer', i);
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
      touchPick = sec; setHover(sec, 'touch', i); return;
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
    var phone = w < 600;                              // phone-width stage: the chip fills most of it
    baseYaw = tall ? -0.12 : -0.22; swayAmp = tall ? 0.1 : 0.14;
    // the chip's projected half size, with room for the sway (package 1.77 x 1.07, about 1.25 tall)
    var turn = Math.abs(baseYaw) + swayAmp;
    var halfW = 1.77 * Math.cos(turn) + 1.07 * Math.sin(turn);
    var halfH = ((1.07 * Math.cos(turn) + 1.77 * Math.sin(turn)) * Math.sin(ELEV) + 1.25 * Math.cos(ELEV)) / 2 + 0.1;
    var fillH = CAPTURE ? 0.62 : tall || phone ? 0.84 : 0.66, fillW = CAPTURE ? 0.82 : tall || phone ? 0.9 : 0.84;
    var dist = Math.max(halfH / (tanV * fillH), halfW / (tanV * camera.aspect * fillW));
    camera.position.set(AIM.x, AIM.y - 0.45 + Math.sin(ELEV) * dist, AIM.z + Math.cos(ELEV) * dist);
    camera.lookAt(AIM.x, AIM.y - 0.45, AIM.z);
    camera.updateProjectionMatrix();
    glitchPass.uniforms.uLines.value = h * renderer.getPixelRatio() / 3;
    placeTicker();
    dirty = true;
  }
  // desktop: the event line sits just under the chip (its lowest point over the whole sway), not at the bottom of the stage
  var tickerEl = $('ticker');
  function placeTicker() {
    tickerEl.style.top = ''; tickerEl.style.bottom = '';
    if (!model || CAPTURE || EMBED || !window.matchMedia('(min-width: 901px)').matches) return;
    camera.updateMatrixWorld();
    var sh = stage.clientHeight, low = 0, m = new T.Matrix4(), lift = new T.Matrix4().makeTranslation(0, holder.position.y, 0), v = new T.Vector3();
    [-1, 0, 1].forEach(function (k) {
      m.makeRotationY(baseYaw + k * swayAmp).multiply(lift);
      [-1.77, 1.77].forEach(function (x) { [-0.14, 1.1].forEach(function (y) { [-1.07, 1.07].forEach(function (z) {
        v.set(x, y, z).applyMatrix4(m).project(camera);
        low = Math.max(low, (1 - v.y) / 2 * sh);
      }); }); });
    });
    tickerEl.style.top = Math.round(Math.min(sh - 56, low + 22)) + 'px';
    tickerEl.style.bottom = 'auto';
  }
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage); else window.addEventListener('resize', fit);

  /* ------------------------------------------------------------------ one frame at time t */
  var baseYaw = -0.32, swayAmp = 0.16, hv = [0, 0, 0, 0, 0, 0], tmpV = new T.Vector3(), wallBase = new T.Color('#4cc9f0');
  function renderAt(t, dt) {
    var still = REDUCED;
    var ease = dt > 0 ? 1 - Math.exp(-dt * 10) : 1;
    if (!CAPTURE) { par.x += (mouse.x - par.x) * ease * 0.5; par.y += (mouse.y - par.y) * ease * 0.5; }
    pivot.rotation.y = baseYaw + (still ? 0 : Math.sin(t * 2 * Math.PI / 18) * swayAmp) + user.yaw + (still || CAPTURE ? 0 : par.x * 0.1);
    pivot.rotation.x = user.pitch + (still || CAPTURE ? 0 : par.y * 0.05);
    pivot.position.y = still ? 0 : Math.sin(t * 2 * Math.PI / 7) * 0.02;

    // life
    var breath = still ? 1 : 1 + 0.22 * Math.sin(t * 2 * Math.PI / 5.2);   // the glow breathes, about 5 s per breath
    var ev = eventPulse(t);
    U.uBreath.value = breath;
    U.uBarGrow.value = still || seqStart === null ? 1 : Math.min(1, Math.max(0, (t - seqStart + PULSE_DELAY - 0.3) / 1.4));
    if (U.uBarGrow.value < 1) U.uBarGrow.value = 1 - Math.pow(1 - U.uBarGrow.value, 3);
    U.uBase.value = 1.0 * breath + ev.amt;
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
    U.uDim.value = 1 - 0.22 * maxH;
    // the light walls under the lid follow the die: site blue, amber when "compute" is lit, brighter on each pulse
    if (wallMat) {
      wallMat.color.copy(wallBase).lerp(U.uRegCol.value[1], hv[1]);
      wallMat.opacity = (0.12 * breath + 0.25 * ev.amt) * (1 - 0.6 * (maxH - hv[1])) + 0.08 * hv[1];
    }
    if (dieGlow) {
      dieGlow.material.color.setRGB(1, 1, 1).lerp(U.uRegCol.value[1], hv[1]);
      dieGlow.material.opacity = (0.55 * breath + 0.5 * ev.amt) * (1 - 0.6 * (maxH - hv[1]));
    }
    halo.material.opacity = 0.42 * breath + 0.25 * ev.amt;

    scene.updateMatrixWorld();
    if (model) U.uToChip.value.copy(model.matrixWorld).invert();
    composer.render(dt);

    // markers follow the chip
    if (model && !CAPTURE) {
      var sw = stage.clientWidth, sh = stage.clientHeight;
      REGIONS.forEach(function (r, k) {
        tmpV.set(r.pin[0], r.pin[1], r.pin[2]).applyMatrix4(model.matrixWorld).project(camera);
        var x = (tmpV.x + 1) / 2 * sw, y = (1 - tmpV.y) / 2 * sh;
        pinXY[k] = [x, y];
      });
      placeLabel(); placeCard();
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
  if (qs.get('debug') === '1') window.__chipDebug = { U: U, packetAt: packetAt, regionAt: regionAt };
  // where each part's label points, in page pixels (used by the tests)
  window.__chipAnchors = function () {
    var r = stage.getBoundingClientRect();
    return pinXY.map(function (p) { return [r.left + p[0], r.top + p[1]]; });
  };
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
    holder.add(model);
    styleModel(model);
    dieGlow = glowPlane(2.3, 1.9, 0.5); dieGlow.position.set(0.05, 0.362, 0.0); dieGlow.renderOrder = 3; dieGlow.name = 'glow'; model.add(dieGlow);
    model.traverse(function (o) { if (o.isMesh && o.name !== 'wall' && o.name !== 'glow') pickables.push(o); });
    fit();
    if (seqStart === null) seqStart = clockT + PULSE_DELAY;
    renderAt(clockT, 0);
    $('loading').hidden = true;
    window.__chipLoadMs = Math.round(performance.now() - t0);
    window.__heroReady = true;
    window.__chipReady = true;
    dirty = true;
  }, function (err) { noGL('model failed to load: ' + (err && err.message)); });

  fit();
  start();
})();
