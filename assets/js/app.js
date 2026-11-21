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
    var burst = { bk: 0, pd: 0 };

    function gains() {
      var bk = 0, pd = 0;
      fx.forEach(function (el) {
        var v = +el.value / 200;
        if (el.dataset.dev === "bk") bk += v * (el.dataset.fx === "impacts" ? 1.2 : 0.8);
        else pd += v * (el.dataset.fx === "abs" ? 1.1 : 0.9);
      });
      return { bk: bk / 3, pd: pd / 3 };
    }

    // live knob readouts + tooltip names
    fx.forEach(function (el) {
      var lab = el.closest(".ctl").querySelector(".fx-val");
      var sync = function () {
        if (lab) lab.textContent = el.value + "%";
      };
      el.addEventListener("input", sync);
      sync();
      if (el.dataset.knob) el.title = el.dataset.knob;
    });

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

    var chMute = { bk: false, pd: false };
    document.querySelectorAll(".mute-btn.ch").forEach(function (b) {
      b.addEventListener("click", function () {
        var ch = b.dataset.ch;
        chMute[ch] = !chMute[ch];
        b.setAttribute("aria-pressed", chMute[ch] ? "true" : "false");
        b.classList.toggle("is-muted", chMute[ch]);
        sstart();
      });
    });

    function sdraw() {
      var g = muted ? { bk: 0, pd: 0 } : gains();
      if (chMute.bk) g.bk = 0;
      if (chMute.pd) g.pd = 0;
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
      var bkG = g.bk + burst.bk, pdG = g.pd + burst.pd;
      trace(pdG * 0.55, "rgba(224,176,60,0.85)", 1.4, 1.7, 1.4);
      trace((bkG + pdG) / 2, "rgba(232,132,60,0.95)", 1.8, 0, 1);
      trace(bkG * 0.6, "rgba(120,170,255,0.55)", 1.4, 3.1, 0.7);
      burst.bk *= 0.90; burst.pd *= 0.90;
      // readouts
      var pct = function (v) { return Math.round(Math.min(100, v * 60)) + "%"; };
      if (roMix) roMix.textContent = pct((bkG + pdG) / 2);
      if (roBk) roBk.textContent = pct(bkG);
      if (roPd) roPd.textContent = pct(pdG);
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
    // test-fire: decaying burst on that device's channel
    document.querySelectorAll(".test-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        burst[b.dataset.fire] = muted ? 0 : 1.4;
        sstart();
      });
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

  /* ---------- rig profiles (bench presets) ---------- */
  var PROFILES = {
    reference: { bk_engine: 110, bk_road: 80, bk_impacts: 70, pd_abs: 90, pd_lock: 60, pd_roadfx: 100 },
    brake:     { bk_engine: 70,  bk_road: 50, bk_impacts: 90, pd_abs: 160, pd_lock: 120, pd_roadfx: 60 },
    road:      { bk_engine: 60,  bk_road: 160, bk_impacts: 110, pd_abs: 50, pd_lock: 40, pd_roadfx: 140 }
  };
  var FX_MAP = { bk_engine: "bk|engine", bk_road: "bk|road", bk_impacts: "bk|impacts",
                 pd_abs: "pd|abs", pd_lock: "pd|lock", pd_roadfx: "pd|roadfx" };
  document.querySelectorAll(".bp-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".bp-chip").forEach(function (c) { c.classList.toggle("is-active", c === chip); });
      var p = PROFILES[chip.dataset.prof];
      Object.keys(FX_MAP).forEach(function (k) {
        var pair = FX_MAP[k].split("|");
        var el = document.querySelector('.fx[data-dev="' + pair[0] + '"][data-fx="' + pair[1] + '"]');
        if (el) {
          el.value = p[k];
          var lab = el.closest(".ctl").querySelector(".fx-val");
          if (lab) lab.textContent = p[k] + "%";
          el.dispatchEvent(new Event("input"));
        }
      });
    });
  });

  /* ---------- master mute ---------- */
  var muteBtn = document.getElementById("muteBtn");
  var muted = false;
  if (muteBtn) {
    muteBtn.addEventListener("click", function () {
      muted = !muted;
      muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
      muteBtn.classList.toggle("is-muted", muted);
      if (scope) scope.style.opacity = muted ? "0.25" : "";
    });
  }

  /* ---------- effect inspector ---------- */
  var inspectBody = document.getElementById("fxInspectBody");
  document.querySelectorAll(".fx-chip").forEach(function (chip) {
    var show = function () {
      if (inspectBody) {
        var mutedTag = chip.getAttribute("aria-pressed") === "false" ? " · muted" : "";
        var grp = chip.closest(".fx-group");
        var grpName = grp ? grp.querySelector("h3").textContent.trim() : "";
        var dev = grpName === "Pedal cues" ? "pd" : "bk";
        inspectBody.innerHTML = "<b>" + chip.textContent.replace(" · muted", "") + "</b>" + mutedTag +
          " — " + chip.dataset.spec +
          ' <button type="button" class="fx-audition" data-dev="' + dev + '">audition → ' + (dev === "pd" ? "pedal" : "shaker") + "</button>";
        var aud = inspectBody.querySelector(".fx-audition");
        if (aud) aud.addEventListener("click", function () {
          var tb = document.querySelector('.test-btn[data-fire="' + dev + '"]');
          if (tb) tb.click();
        });
      }
    };
    chip.addEventListener("mouseenter", show);
    chip.addEventListener("focus", show);
    chip.addEventListener("click", function () {
      var on = chip.getAttribute("aria-pressed") === "true";
      chip.setAttribute("aria-pressed", on ? "false" : "true");
      show();
    });
  });

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

/* Mobile nav toggle */
(function () {
  var burger = document.getElementById("navBurger");
  var navLinks = document.getElementById("navLinks");
  if (!burger || !navLinks) return;
  burger.addEventListener("click", function () {
    var open = navLinks.classList.toggle("open");
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navLinks.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      navLinks.classList.remove("open");
      burger.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }
  });
})();

/* Runnable tune commands — clicking applies the delta to matching bench sliders. */
document.querySelectorAll(".cmdline").forEach(function (line) {
  line.addEventListener("click", function () {
    var apply = line.dataset.apply;
    if (!apply) return;
    apply.split(";").forEach(function (pair) {
      var kv = pair.split(":");
      var knob = kv[0], delta = parseInt(kv[1], 10);
      var el = document.querySelector('.fx[data-knob="' + knob + '"]');
      if (!el || isNaN(delta)) return;
      el.value = Math.max(0, Math.min(200, (+el.value) + delta));
      var lab = el.closest(".ctl").querySelector(".fx-val");
      if (lab) lab.textContent = el.value + "%";
      el.dispatchEvent(new Event("input"));
      var ctl = el.closest(".ctl");
      ctl.classList.remove("fx-flash");
      void ctl.offsetWidth;
      ctl.classList.add("fx-flash");
    });
    document.getElementById("bench").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

/* Control-panel mock — sidebar tabs swap the preview pane. */
(function () {
  var items = document.querySelectorAll(".pm-item");
  var views = document.querySelectorAll(".pm-view");
  items.forEach(function (item) {
    item.addEventListener("click", function () {
      items.forEach(function (i) { i.classList.toggle("is-active", i === item); });
      views.forEach(function (v) { v.classList.toggle("is-active", v.dataset.view === item.dataset.view); });
    });
  });
})();

/* Scroll-spy: highlight the nav link for the section in view. */
(function () {
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var links = {};
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    var id = (a.getAttribute("href") || "").replace("#", "");
    if (id && document.getElementById(id)) links[id] = a;
  });
  if (!sections.length || !("IntersectionObserver" in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting && links[en.target.id]) {
        Object.keys(links).forEach(function (k) { links[k].classList.remove("is-active"); });
        links[en.target.id].classList.add("is-active");
      }
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  sections.forEach(function (s) { io.observe(s); });
})();

/* Monitor pane — values jitter at 4 Hz while the pane is visible (mirrors the real 4 Hz monitor). */
(function () {
  var pane = document.querySelector('.pm-view[data-view="monitor"]');
  var vals = pane ? pane.querySelectorAll(".live-v") : [];
  if (!pane || !vals.length) return;
  var timer = null;
  function tick() {
    vals.forEach(function (el) {
      var base = parseFloat(el.dataset.v), j = parseFloat(el.dataset.j || "1"), dec = +(el.dataset.d || "0");
      var v = base + (Math.random() * 2 - 1) * j;
      el.textContent = dec ? v.toFixed(dec) : String(Math.round(v));
    });
  }
  function sync() {
    var on = pane.classList.contains("is-active") && !document.hidden;
    if (on && !timer) timer = setInterval(tick, 250);
    if (!on && timer) { clearInterval(timer); timer = null; }
  }
  tick(); sync();
  document.querySelectorAll(".pm-item").forEach(function (i) { i.addEventListener("click", sync); });
  document.addEventListener("visibilitychange", sync);
})();

/* Bench — copy current mix as tune-set commands. */
(function () {
  var btn = document.getElementById("copyMix");
  if (!btn) return;
  btn.addEventListener("click", function () {
    var lines = [];
    document.querySelectorAll("input.fx[data-knob]").forEach(function (el) {
      var pct = (+el.value / 2).toFixed(0); // 0-200 slider → 0-100%
      lines.push("tune set " + el.dataset.knob + "=" + pct);
    });
    lines.push("monitor --watch");
    var text = lines.join("\n");
    function done() {
      btn.classList.add("is-done"); btn.textContent = "COPIED";
      setTimeout(function () { btn.classList.remove("is-done"); btn.textContent = "COPY MIX AS TUNE SET"; }, 1600);
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
  });
})();
