(function () {
  "use strict";

  var Q = function (s) { return document.querySelector(s); };
  var QA = function (s) { return [].slice.call(document.querySelectorAll(s)); };

  function esc(s) {
    var t = String(s == null ? "" : s);
    t = t.split("&").join("&amp;");
    t = t.split("<").join("&lt;");
    t = t.split(">").join("&gt;");
    t = t.split('"').join("&quot;");
    return t;
  }
  function cl(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); }
  function nrm(s) { return String(s || "").toLowerCase().replace(/\u0451/g, "\u0435").replace(/[^a-z\u0430-\u044f0-9]/gi, ""); }
  function fmt(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return ("0" + Math.floor(s / 60)).slice(-2) + ":" + ("0" + (s % 60)).slice(-2);
  }
  function hsh(s) {
    var h = 1779033703, i;
    for (i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return h >>> 0;
  }
  function rnd(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuf(arr, r) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function b64e(s) {
    var b = new TextEncoder().encode(s), o = "", i;
    for (i = 0; i < b.length; i += 8192) { o += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); }
    return btoa(o);
  }
  function b64d(s) {
    var b = atob(s), u = new Uint8Array(b.length), i;
    for (i = 0; i < b.length; i++) { u[i] = b.charCodeAt(i); }
    return new TextDecoder().decode(u);
  }
  function dist(a, b, c, d) {
    var R = 6371000, r = function (x) { return x * Math.PI / 180; };
    var dl = r(c - a), dg = r(d - b);
    var h = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dg / 2) * Math.sin(dg / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function dark(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    var r = cl(Math.round(((n >> 16) & 255) * k), 0, 255);
    var g = cl(Math.round(((n >> 8) & 255) * k), 0, 255);
    var b = cl(Math.round((n & 255) * k), 0, 255);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function vib(p) { try { if (DB.set.vib && navigator.vibrate) { navigator.vibrate(p); } } catch (e) {} }

  var IC = {
    back: "<path d='M15 5l-7 7 7 7'/>",
    x: "<path d='M6 6l12 12M18 6L6 18'/>",
    tr: "<path d='M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13'/>",
    pen: "<path d='M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z'/>",
    lup: "<circle cx='10.5' cy='10.5' r='6.5'/><path d='M15.5 15.5L21 21'/>",
    dec: "<path d='M4 7h10M4 12h4M12 12h8M4 17h13'/><circle cx='16' cy='7' r='2'/><circle cx='10' cy='12' r='2'/>",
    let: "<path d='M5 19V5h9a4 4 0 0 1 0 8H5M14 13l5 6'/>",
    gps: "<circle cx='12' cy='12' r='3'/><circle cx='12' cy='12' r='8'/><path d='M12 1v4M12 19v4M1 12h4M19 12h4'/>",
    ph: "<rect x='3' y='5' width='18' height='14' rx='2'/><path d='M3 17l5-4 3 2 5-5 5 5'/>",
    zap: "<path d='M13 2L4 14h6l-1 8 9-12h-6z'/>"
  };
  function I(n) {
    return "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'>" + (IC[n] || "") + "</svg>";
  }

  var AU = {
    c: null, g: null,
    init: function () {
      if (this.c) { return; }
      try {
        var C = window.AudioContext || window.webkitAudioContext;
        this.c = new C();
        this.g = this.c.createGain();
        this.g.gain.value = DB.set.snd ? 0.9 : 0;
        this.g.connect(this.c.destination);
      } catch (e) {}
    },
    t: function (f, d, ty, v, w) {
      if (!this.c) { return; }
      var t = this.c.currentTime + (w || 0);
      var o = this.c.createOscillator(), g = this.c.createGain();
      o.type = ty; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(this.g); o.start(t); o.stop(t + d + 0.02);
    },
    n: function (d, v, fc) {
      if (!this.c) { return; }
      var n = Math.floor(this.c.sampleRate * d);
      var b = this.c.createBuffer(1, n, this.c.sampleRate), a = b.getChannelData(0), i;
      for (i = 0; i < n; i++) { a[i] = (Math.random() * 2 - 1) * (1 - i / n); }
      var s = this.c.createBufferSource(); s.buffer = b;
      var f = this.c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = fc;
      var g = this.c.createGain(); g.gain.value = v;
      s.connect(f); f.connect(g); g.connect(this.g); s.start();
    },
    p: function (k) {
      if (!this.c || !DB.set.snd) { return; }
      if (this.c.state === "suspended") { this.c.resume(); }
      var F, i;
      if (k === "tick") { this.t(1250, 0.04, "sine", 0.06); }
      else if (k === "pop") { this.t(720, 0.09, "sine", 0.12); }
      else if (k === "shot") { this.n(0.07, 0.3, 4000); this.t(300, 0.06, "square", 0.12); }
      else if (k === "hint") { this.t(660, 0.06, "square", 0.09); this.t(880, 0.06, "square", 0.09, 0.08); }
      else if (k === "scan") { this.t(520, 0.25, "sawtooth", 0.07); }
      else if (k === "bad") { this.t(150, 0.24, "sawtooth", 0.16); }
      else if (k === "win") { F = [523, 659, 784, 1047]; for (i = 0; i < 4; i++) { this.t(F[i], 0.14, "triangle", 0.16, i * 0.09); } }
      else if (k === "fail") { F = [330, 262, 196]; for (i = 0; i < 3; i++) { this.t(F[i], 0.2, "sawtooth", 0.13, i * 0.16); } }
      else if (k === "stamp") { this.n(0.13, 0.5, 240); }
      else if (k === "ping") { this.t(950, 0.35, "sine", 0.14); }
      else if (k === "reel") { this.t(1500, 0.025, "square", 0.05); }
      else if (k === "hit") { this.t(1100, 0.09, "triangle", 0.14); }
      else if (k === "miss") { this.t(160, 0.2, "sawtooth", 0.14); }
      else if (k === "wave") { F = [440, 660, 880]; for (i = 0; i < 3; i++) { this.t(F[i], 0.1, "square", 0.1, i * 0.06); } }
      else if (k === "crown") { F = [523, 659, 784, 1047, 1319]; for (i = 0; i < 5; i++) { this.t(F[i], 0.18, "triangle", 0.15, i * 0.1); } }
      else if (k === "unlock") { F = [784, 988, 1319]; for (i = 0; i < 3; i++) { this.t(F[i], 0.12, "triangle", 0.14, i * 0.07); } }
    }
  };
  document.addEventListener("pointerdown", function () {
    AU.init();
    if (AU.c && AU.c.state === "suspended") { AU.c.resume(); }
  }, { passive: true });

  var COLS = ["#2BD9FF", "#FFB020", "#8BE83C", "#FF4D8D", "#9B8CFF", "#FF7A1A"];
  var SKIN = ["#F7DCC4", "#F0C49E", "#DDA57A", "#BC8154", "#96603A", "#6E4429"];
  var HC = ["#241812", "#4A2E1E", "#8A5A32", "#C98A3C", "#E8C77A", "#B8452E", "#9B8CFF", "#2BD9FF"];
  var EC = ["#5A3A22", "#2E8B57", "#2B7FD9", "#8A93B8", "#9B8CFF", "#8BE83C"];
  var HAIRS = [["short", "Короткая"], ["spike", "Ёжик"], ["bob", "Каре"], ["pony", "Хвост"], ["curl", "Кудри"], ["mohawk", "Ирокез"], ["long", "Длинные"], ["bald", "Без волос"]];
  var GEN = [["m", "Парень"], ["f", "Девушка"], ["x", "Нейтрально"]];

  function defLook() {
    return { g: "x", skin: 1, hair: "short", hc: 1, eye: 2, acc: COLS[0], hat: "none", gls: "none", ext: "none", frm: "none" };
  }
  function hairBack(st, c) {
    if (st === "bob") { return "<path d='M23 46Q23 15 50 15Q77 15 77 46L77 66Q70 58 68 46L32 46Q30 58 23 66Z' fill='" + c + "'/>"; }
    if (st === "long") { return "<path d='M21 46Q21 13 50 13Q79 13 79 46L82 92Q66 82 64 50L36 50Q34 82 18 92Z' fill='" + c + "'/>"; }
    if (st === "pony") { return "<ellipse cx='80' cy='56' rx='9' ry='17' fill='" + c + "'/>"; }
    if (st === "curl") { return "<circle cx='25' cy='44' r='9' fill='" + c + "'/><circle cx='75' cy='44' r='9' fill='" + c + "'/>"; }
    return "";
  }
  function hairFront(st, c) {
    if (st === "short") { return "<path d='M26 42Q28 18 50 18Q72 18 74 42Q68 30 50 28Q32 30 26 42Z' fill='" + c + "'/>"; }
    if (st === "spike") { return "<path d='M26 41L30 21L36 33L42 17L48 31L54 15L60 31L66 19L72 33L74 42Q68 30 50 28Q32 30 26 41Z' fill='" + c + "'/>"; }
    if (st === "bob" || st === "pony") { return "<path d='M26 42Q28 15 50 15Q72 15 74 42Q70 27 50 25Q30 27 26 42Z' fill='" + c + "'/>"; }
    if (st === "curl") { return "<circle cx='34' cy='27' r='9' fill='" + c + "'/><circle cx='45' cy='21' r='9' fill='" + c + "'/><circle cx='56' cy='21' r='9' fill='" + c + "'/><circle cx='67' cy='27' r='9' fill='" + c + "'/>"; }
    if (st === "mohawk") { return "<path d='M43 30Q45 8 50 3Q55 8 57 30Q53 24 50 24Q47 24 43 30Z' fill='" + c + "'/>"; }
    if (st === "long") { return "<path d='M26 42Q28 13 50 13Q72 13 74 42Q66 25 50 25Q40 25 34 33Q30 37 26 42Z' fill='" + c + "'/>"; }
    return "";
  }
  var HAT = {
    cap: function
