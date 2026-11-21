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
      document.querySelectorAll(".bp-chip").forEach(function (c) {
        var on = c === chip;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
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
  var soloChip = null;
  function clearSolo() {
    if (!soloChip) return;
    soloChip.classList.remove("is-solo");
    soloChip = null;
    document.querySelectorAll(".fx-chip").forEach(function (c) { c.classList.remove("is-dimmed"); });
  }
  var resetBtn = document.getElementById("fxReset");
  if (resetBtn) resetBtn.addEventListener("click", function () {
    document.querySelectorAll(".fx-chip").forEach(function (c) {
      c.setAttribute("aria-pressed", "true");
      c.classList.remove("is-dimmed");
      var t = c.textContent.replace(" · muted", "");
      if (c.textContent !== t) c.textContent = t;
    });
    if (soloChip) { soloChip.classList.remove("is-solo"); soloChip = null; }
  });
  document.querySelector(".fx-groups").addEventListener("click", function (e) {
    if (e.target.classList && e.target.classList.contains("fx-chip") && soloChip && e.target !== soloChip) clearSolo();
  });
  document.querySelectorAll(".fx-chip").forEach(function (chip) {
    var show = function () {
      if (inspectBody) {
        var mutedTag = chip.getAttribute("aria-pressed") === "false" ? " · muted" : "";
        var grp = chip.closest(".fx-group");
        var grpName = grp ? grp.querySelector("h3").textContent.trim() : "";
        var dev = grpName === "Pedal cues" ? "pd" : "bk";
        inspectBody.innerHTML = "<b>" + chip.textContent.replace(" · muted", "") + "</b>" + mutedTag +
          " — " + chip.dataset.spec +
          ' <button type="button" class="fx-audition" data-dev="' + dev + '">audition → ' + (dev === "pd" ? "pedal" : "shaker") + "</button>" +
          ' <button type="button" class="fx-solo">solo</button>';
        var aud = inspectBody.querySelector(".fx-audition");
        if (aud) aud.addEventListener("click", function () {
          var tb = document.querySelector('.test-btn[data-fire="' + dev + '"]');
          if (tb) tb.click();
        });
        var sol = inspectBody.querySelector(".fx-solo");
        if (sol) sol.addEventListener("click", function () {
          if (soloChip === chip) { clearSolo(); return; }
          clearSolo();
          soloChip = chip;
          chip.classList.add("is-solo");
          document.querySelectorAll(".fx-chip").forEach(function (c) {
            if (c !== chip) c.classList.add("is-dimmed");
          });
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
  if (line.dataset.apply || line.dataset.goto) {
    line.tabIndex = 0;
    line.setAttribute("role", "button");
  }
  line.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && (line.dataset.apply || line.dataset.goto)) {
      e.preventDefault(); line.click();
    }
  });
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
  function show(view) {
    items.forEach(function (i) { i.classList.toggle("is-active", i.dataset.view === view); });
    views.forEach(function (v) { v.classList.toggle("is-active", v.dataset.view === view); });
  }
  items.forEach(function (item) {
    item.setAttribute("aria-pressed", item.classList.contains("is-active") ? "true" : "false");
    item.addEventListener("click", function () {
      show(item.dataset.view);
      items.forEach(function (i) { i.setAttribute("aria-pressed", i === item ? "true" : "false"); });
    });
  });
  // terminal commands can jump to a pane (e.g. monitor --watch)
  document.querySelectorAll(".cmdline[data-goto]").forEach(function (el) {
    el.addEventListener("click", function () {
      show(el.dataset.goto);
      var mock = document.querySelector(".panel-mock");
      if (mock) mock.scrollIntoView({ behavior: "smooth", block: "center" });
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
  var mBk = document.getElementById("meterBk");
  var mPd = document.getElementById("meterPd");
  function tick() {
    vals.forEach(function (el) {
      var base = parseFloat(el.dataset.v), j = parseFloat(el.dataset.j || "1"), dec = +(el.dataset.d || "0");
      var v = base + (Math.random() * 2 - 1) * j;
      el.textContent = dec ? v.toFixed(dec) : String(Math.round(v));
    });
    if (mBk) mBk.style.width = (30 + Math.random() * 45) + "%";
    if (mPd) mPd.style.width = (35 + Math.random() * 50) + "%";
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

/* Bench — save/recall custom profiles (session + localStorage). */
(function () {
  var group = document.querySelector(".bench-profiles");
  var saveBtn = document.getElementById("bpSave");
  var fx = Array.prototype.slice.call(document.querySelectorAll("input.fx[data-knob]"));
  if (!group || !saveBtn || !fx.length) return;
  var KEY = "h360-bench-profiles";
  var custom = [];
  try { custom = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { custom = []; }

  function snapshot() {
    var o = {};
    fx.forEach(function (el) {
      var key = el.dataset.dev + "|" + el.dataset.fx;
      o[key] = +el.value;
    });
    return o;
  }
  function applySnap(snap) {
    fx.forEach(function (el) {
      var key = el.dataset.dev + "|" + el.dataset.fx;
      if (snap[key] != null) {
        el.value = snap[key];
        var lab = el.closest(".ctl").querySelector(".fx-val");
        if (lab) lab.textContent = snap[key] + "%";
        el.dispatchEvent(new Event("input"));
      }
    });
    document.querySelectorAll(".bp-chip").forEach(function (c) {
      c.classList.remove("is-active");
      c.setAttribute("aria-pressed", "false");
    });
    var cur = group.querySelector('[data-prof="__custom_' + currentId + '"]');
    if (cur) {
      cur.classList.add("is-active");
      cur.setAttribute("aria-pressed", "true");
    }
  }
  var currentId = null;
  function renderCustom() {
    group.querySelectorAll(".bp-custom-wrap").forEach(function (c) { c.remove(); });
    custom.forEach(function (p, i) {
      var wrap = document.createElement("span");
      wrap.className = "bp-custom-wrap";
      var b = document.createElement("button");
      b.type = "button";
      b.className = "bp-chip bp-custom";
      b.dataset.prof = "__custom_" + i;
      b.textContent = p.name;
      b.title = "Saved mix — click to recall";
      b.addEventListener("click", function () {
        currentId = i; applySnap(p.values);
      });
      var x = document.createElement("button");
      x.type = "button";
      x.className = "bp-custom-del";
      x.textContent = "×";
      x.setAttribute("aria-label", "Delete " + p.name);
      x.title = "Delete saved mix";
      x.addEventListener("click", function () {
        custom.splice(i, 1);
        try { localStorage.setItem(KEY, JSON.stringify(custom)); } catch (e) {}
        if (currentId === i) currentId = null;
        else if (currentId != null && currentId > i) currentId--;
        renderCustom();
      });
      wrap.appendChild(b); wrap.appendChild(x);
      saveBtn.parentNode.insertBefore(wrap, saveBtn);
    });
  }
  saveBtn.addEventListener("click", function () {
    var n = custom.length + 1;
    custom.push({ name: "Mix " + n, values: snapshot() });
    try { localStorage.setItem(KEY, JSON.stringify(custom.slice(-6))); } catch (e) {}
    custom = custom.slice(-6);
    currentId = custom.length - 1;
    renderCustom();
    if (custom[currentId]) applySnap(custom[currentId].values);
  });
  renderCustom();
})();

/* Profiles pane — clicking a rig profile loads it on the bench. */
(function () {
  document.querySelectorAll(".pm-prof").forEach(function (card) {
    card.addEventListener("click", function () {
      var chip = document.querySelector('.bp-chip[data-prof="' + card.dataset.prof + '"]');
      if (chip) chip.click();
      var bench = document.getElementById("bench") || document.querySelector(".bench");
      if (bench) bench.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})();

/* Bench reset — restore Reference profile and clear channel mutes. */
(function () {
  var btn = document.getElementById("benchReset");
  if (!btn) return;
  btn.addEventListener("click", function () {
    var ref = document.querySelector('.bp-chip[data-prof="reference"]');
    if (ref) ref.click();
    ["muteBtn", "muteBk", "mutePd"].forEach(function (id) {
      var b = document.getElementById(id);
      if (b && b.getAttribute("aria-pressed") === "true") b.click();
    });
    btn.classList.add("is-done"); btn.textContent = "RESET";
    setTimeout(function () { btn.classList.remove("is-done"); btn.textContent = "RESET BENCH"; }, 1400);
  });
})();

/* Bench keyboard shortcuts: M master mute, 1 shaker / 2 pedal test-fire. */
(function () {
  "use strict";
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (e.key === "m" || e.key === "M") {
      var m = document.getElementById("muteBtn");
      if (m) { m.click(); e.preventDefault(); }
    } else if (e.key === "1") {
      var b1 = document.querySelector('.test-btn[data-fire="bk"]');
      if (b1) { b1.click(); e.preventDefault(); }
    } else if (e.key === "2") {
      var b2 = document.querySelector('.test-btn[data-fire="pd"]');
      if (b2) { b2.click(); e.preventDefault(); }
    } else if (e.key === "r" || e.key === "R") {
      var rs = document.getElementById("benchReset");
      if (rs) { rs.click(); e.preventDefault(); }
    }
  });
})();

/* Crossover explorer — illustrates the split-band routing. */
(function () {
  var dial = document.getElementById("xoDial");
  var out = document.getElementById("xoOut");
  var read = document.getElementById("xoRead");
  var low = document.getElementById("xoLow");
  var high = document.getElementById("xoHigh");
  if (!dial || !low || !high) return;
  // log-ish mapping: 10Hz→15%, 100Hz→85% of the band width
  function cut() {
    var hz = +dial.value;
    var pct = Math.round(15 + (hz - 10) / 90 * 70);
    low.style.setProperty("--cut", pct + "%");
    high.style.setProperty("--cut", pct + "%");
    out.textContent = hz + " Hz";
    read.innerHTML = "below " + hz + " Hz → shaker &nbsp;·&nbsp; above → pedal";
  }
  dial.addEventListener("input", cut);
  cut();
})();
