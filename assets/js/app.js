/* Haptics360 site — hero waveform, bench scope simulation, reveals.
   All visuals are independent browser illustrations, not the application. */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- hero waveform ---------- */
  var hero = document.getElementById("heroWave");
  if (hero && hero.getContext) {
    var hx = hero.getContext("2d");
    var hw = 0, hh = 0, hraf = null, phase = 0;
    function hsize() {
      var r = hero.parentElement.getBoundingClientRect();
      hw = hero.width = Math.min(r.width, 1600);
      hh = hero.height = Math.min(r.height, 900);
    }
    hsize();
    window.addEventListener("resize", hsize);

    function hdraw() {
      hx.clearRect(0, 0, hw, hh);
      var mid = hh * 0.62;
      var amp = hh * 0.16;
      // layered motor-ish waveform: slow LFO + mid ripple + sharp tick bursts
      hx.beginPath();
      for (var x = 0; x <= hw; x += 3) {
        var t = x / hw;
        var burst = Math.sin(t * 40 + phase * 2.2) > 0.92 ? 1.6 : 1;
        var y = mid
          + Math.sin(t * 9 + phase) * amp * 0.35
          + Math.sin(t * 23 - phase * 1.4) * amp * 0.5 * burst
          + Math.sin(t * 61 + phase * 0.6) * amp * 0.22;
        if (x === 0) hx.moveTo(x, y); else hx.lineTo(x, y);
      }
      var g = hx.createLinearGradient(0, mid - amp * 2, 0, mid + amp * 2);
      g.addColorStop(0, "rgba(232,132,60,0)");
      g.addColorStop(0.5, "rgba(232,132,60,0.5)");
      g.addColorStop(1, "rgba(232,132,60,0)");
      hx.strokeStyle = g;
      hx.lineWidth = 1.6;
      hx.stroke();
      // soft fill under
      hx.lineTo(hw, mid + amp * 2); hx.lineTo(0, mid + amp * 2); hx.closePath();
      hx.fillStyle = "rgba(232,132,60,0.05)";
      hx.fill();
      phase += 0.012;
      if (!reduceMotion) hraf = requestAnimationFrame(hdraw);
    }
    hdraw();
  }

  /* ---------- bench scope ---------- */
  var scope = document.getElementById("scope");
  if (scope && scope.getContext) {
    var sx = scope.getContext("2d");
    var fx = document.querySelectorAll(".fx");
    var roMix = document.getElementById("roMix");
    var roBk = document.getElementById("roBk");
    var roPd = document.getElementById("roPd");
    var W = scope.width, H = scope.height;
    var t = 0, sraf = null;

    function gains() {
      var bk = 0, pd = 0;
      fx.forEach(function (el) {
        var v = +el.value / 100;
        if (el.dataset.dev === "bk") bk += v * (el.dataset.fx === "impacts" ? 1.2 : 0.8);
        else pd += v * (el.dataset.fx === "abs" ? 1.1 : 0.9);
      });
      return { bk: bk / 3, pd: pd / 3 };
    }

    function trace(g, color, lw, phaseOff, freqMul) {
      sx.beginPath();
      var mid = H / 2, amp = H * 0.34 * Math.min(1.4, g + 0.08);
      for (var x = 0; x <= W; x += 2) {
        var u = x / W;
        // pseudo-random pulse texture seeded by time
        var n = Math.sin(u * 40 + t * 3 + phaseOff) * Math.sin(u * 17 - t * 2 + phaseOff * 2);
        var spike = (Math.sin(u * 90 + t * 9) > 0.96 ? 1.5 : 1);
        var y = mid + n * amp * spike * freqMul;
        if (x === 0) sx.moveTo(x, y); else sx.lineTo(x, y);
      }
      sx.strokeStyle = color;
      sx.lineWidth = lw;
      sx.stroke();
    }

    function sdraw() {
      var g = gains();
      sx.clearRect(0, 0, W, H);
      // grid
      sx.strokeStyle = "rgba(255,255,255,0.045)";
      sx.lineWidth = 1;
      for (var i = 1; i < 8; i++) {
        sx.beginPath(); sx.moveTo(0, H * i / 8); sx.lineTo(W, H * i / 8); sx.stroke();
      }
      for (i = 1; i < 16; i++) {
        sx.beginPath(); sx.moveTo(W * i / 16, 0); sx.lineTo(W * i / 16, H); sx.stroke();
      }
      // centre line
      sx.strokeStyle = "rgba(255,255,255,0.09)";
      sx.setLineDash([4, 6]);
      sx.beginPath(); sx.moveTo(0, H / 2); sx.lineTo(W, H / 2); sx.stroke();
      sx.setLineDash([]);
      // pedal band (top), composite (mid), shaker (bottom glow)
      trace(g.pd * 0.55, "rgba(224,176,60,0.85)", 1.4, 1.7, 1.4);
      trace((g.bk + g.pd) / 2, "rgba(232,132,60,0.95)", 1.8, 0, 1);
      trace(g.bk * 0.6, "rgba(120,170,255,0.55)", 1.4, 3.1, 0.7);
      // readouts
      var pct = function (v) { return Math.round(Math.min(100, v * 60)) + "%"; };
      if (roMix) roMix.textContent = pct((g.bk + g.pd) / 2);
      if (roBk) roBk.textContent = pct(g.bk);
      if (roPd) roPd.textContent = pct(g.pd);
      t += 0.016;
      if (!reduceMotion) sraf = requestAnimationFrame(sdraw);
      else sdraw._done = true;
    }
    function sstart() {
      if (sraf) cancelAnimationFrame(sraf);
      sdraw();
    }
    fx.forEach(function (el) {
      el.addEventListener("input", sstart);
    });
    sstart();
    // pause when offscreen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (e.isIntersecting && !reduceMotion) sstart();
          else if (sraf) { cancelAnimationFrame(sraf); sraf = null; }
        });
      }).observe(scope);
    }
  }

  /* ---------- scroll reveals ---------- */
  var rev = document.querySelectorAll(".section-head, .card, .fx-group, .bench-grid, .split, .panel-mock, .soon-card, .knob-strip");
  rev.forEach(function (el) { el.classList.add("reveal"); });
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    rev.forEach(function (el) { io.observe(el); });
  } else {
    rev.forEach(function (el) { el.classList.add("is-in"); });
  }
})();
