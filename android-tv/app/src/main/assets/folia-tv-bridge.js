/**
 * FoliaTV runtime injected by the Android WebView shell.
 * - Marks the page as TV / 10-foot
 * - Provides spatial focus navigation for D-pad
 * - Maps media keys to common playback controls / keyboard events
 * - Integrates with Folia's command system when available
 */
(function () {
  if (window.FoliaTV && window.FoliaTV.__installed) return;

  var FOCUSABLE =
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [data-tv-focusable="true"]';

  var state = {
    installed: true,
    platform: "android-tv",
    lastFocused: null,
    backDepthHandled: false,
  };

  function log(msg) {
    try {
      if (window.FoliaNative && FoliaNative.log) FoliaNative.log(String(msg));
    } catch (_) {}
    if (window.console && console.debug) console.debug("[FoliaTV]", msg);
  }

  function isVisible(el) {
    if (!el || el.disabled) return false;
    var style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function collectFocusables() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(FOCUSABLE));
    return nodes.filter(function (el) {
      if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") return false;
      if (el.closest("[aria-hidden='true']")) return false;
      return isVisible(el);
    });
  }

  function ensureFocusStyles() {
    if (document.getElementById("folia-tv-focus-style")) return;
    var style = document.createElement("style");
    style.id = "folia-tv-focus-style";
    style.textContent = [
      "html.folia-tv body { cursor: none; }",
      "html.folia-tv *:focus { outline: none; }",
      "html.folia-tv .folia-tv-focused,",
      "html.folia-tv *:focus-visible {",
      "  outline: 3px solid #7CFFB2 !important;",
      "  outline-offset: 4px !important;",
      "  box-shadow: 0 0 0 6px rgba(124,255,178,0.25) !important;",
      "}",
      "html.folia-tv input, html.folia-tv textarea { font-size: 20px; }",
    ].join("\n");
    document.documentElement.classList.add("folia-tv");
    document.documentElement.dataset.foliaTv = "1";
    (document.head || document.documentElement).appendChild(style);
  }

  function markFocused(el) {
    var prev = document.querySelectorAll(".folia-tv-focused");
    for (var i = 0; i < prev.length; i++) prev[i].classList.remove("folia-tv-focused");
    if (!el) return;
    el.classList.add("folia-tv-focused");
    state.lastFocused = el;
    try {
      el.focus({ preventScroll: false });
    } catch (_) {
      try { el.focus(); } catch (__) {}
    }
    try {
      el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    } catch (_) {}
  }

  function centerOf(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r };
  }

  function pickSpatial(direction) {
    var items = collectFocusables();
    if (!items.length) return null;

    var current =
      document.activeElement && items.indexOf(document.activeElement) >= 0
        ? document.activeElement
        : state.lastFocused && items.indexOf(state.lastFocused) >= 0
          ? state.lastFocused
          : null;

    if (!current) return items[0];

    var c = centerOf(current);
    var best = null;
    var bestScore = Infinity;

    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      if (el === current) continue;
      var p = centerOf(el);
      var dx = p.x - c.x;
      var dy = p.y - c.y;
      var primary = 0;
      var secondary = 0;
      var ok = false;

      if (direction === "left") {
        ok = dx < -8;
        primary = -dx;
        secondary = Math.abs(dy);
      } else if (direction === "right") {
        ok = dx > 8;
        primary = dx;
        secondary = Math.abs(dy);
      } else if (direction === "up") {
        ok = dy < -8;
        primary = -dy;
        secondary = Math.abs(dx);
      } else if (direction === "down") {
        ok = dy > 8;
        primary = dy;
        secondary = Math.abs(dx);
      }

      if (!ok) continue;
      // Prefer targets roughly aligned on the secondary axis.
      var score = primary + secondary * 2.5;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return best || current;
  }

  function activate(el) {
    if (!el) return;
    markFocused(el);
    var tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") {
      el.focus();
      return;
    }
    try {
      el.click();
    } catch (_) {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    }
  }

  function emitKeyboard(key, code, keyCode) {
    var opts = { key: key, code: code, keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true };
    var target = document.activeElement || document.body;
    target.dispatchEvent(new KeyboardEvent("keydown", opts));
    target.dispatchEvent(new KeyboardEvent("keyup", opts));
  }

  function tryFoliaCommand(names) {
    try {
      var api = window.folia || window.Folia || window.__FOLIA__;
      if (!api) return false;
      if (typeof api.runCommand === "function") {
        for (var i = 0; i < names.length; i++) {
          try {
            api.runCommand(names[i]);
            return true;
          } catch (_) {}
        }
      }
      if (typeof api.executeCommand === "function") {
        for (var j = 0; j < names.length; j++) {
          try {
            api.executeCommand(names[j]);
            return true;
          } catch (_) {}
        }
      }
    } catch (_) {}
    return false;
  }

  function closeTopOverlay() {
    // Escape often closes Folia modals / command palette.
    emitKeyboard("Escape", "Escape", 27);
    var dialogs = document.querySelectorAll('[role="dialog"], [data-state="open"], .modal, [aria-modal="true"]');
    for (var i = dialogs.length - 1; i >= 0; i--) {
      if (isVisible(dialogs[i])) return true;
    }
    return false;
  }

  function handleBack() {
    // 1) Let page close overlays
    var hadOverlayHint = closeTopOverlay();
    if (hadOverlayHint) return "handled";

    // 2) History back inside SPA hash/router if possible
    if (window.history && window.history.length > 1) {
      // Signal unhandled so native may webView.goBack / finish
      return "unhandled";
    }
    try {
      if (window.FoliaNative && FoliaNative.requestExit) FoliaNative.requestExit();
    } catch (_) {}
    return "exit";
  }

  function dispatchKey(evt) {
    ensureFocusStyles();
    var action = evt && evt.action;
    if (!action) return "ignored";

    log("key " + action + (evt.repeat ? " (repeat)" : ""));

    if (action === "up" || action === "down" || action === "left" || action === "right") {
      var next = pickSpatial(action);
      if (next) markFocused(next);
      return "handled";
    }

    if (action === "select") {
      var cur =
        document.activeElement && isVisible(document.activeElement)
          ? document.activeElement
          : state.lastFocused || collectFocusables()[0];
      activate(cur);
      return "handled";
    }

    if (action === "back") {
      return handleBack();
    }

    if (action === "playPause") {
      if (tryFoliaCommand(["playback.toggle", "player.toggle", "togglePlayPause", "play-pause"])) {
        return "handled";
      }
      emitKeyboard(" ", "Space", 32);
      return "handled";
    }

    if (action === "next") {
      if (tryFoliaCommand(["playback.next", "player.next", "nextTrack", "next"])) return "handled";
      emitKeyboard("MediaTrackNext", "MediaTrackNext", 176);
      return "handled";
    }

    if (action === "prev") {
      if (tryFoliaCommand(["playback.previous", "player.previous", "prevTrack", "previous"])) return "handled";
      emitKeyboard("MediaTrackPrevious", "MediaTrackPrevious", 177);
      return "handled";
    }

    if (action === "menu") {
      if (tryFoliaCommand(["commandPalette.toggle", "openCommandPalette", "command-palette"])) return "handled";
      emitKeyboard("k", "KeyK", 75);
      return "handled";
    }

    if (action === "seekForward") {
      emitKeyboard("ArrowRight", "ArrowRight", 39);
      return "handled";
    }

    if (action === "seekBack") {
      emitKeyboard("ArrowLeft", "ArrowLeft", 37);
      return "handled";
    }

    return "ignored";
  }

  function bootstrapFocus() {
    ensureFocusStyles();
    var items = collectFocusables();
    if (items.length) markFocused(items[0]);
  }

  window.FoliaTV = {
    __installed: true,
    platform: "android-tv",
    dispatchKey: dispatchKey,
    focusFirst: bootstrapFocus,
    version: "0.1.0",
  };

  ensureFocusStyles();
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(bootstrapFocus, 400);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(bootstrapFocus, 400);
    });
  }

  try {
    if (window.FoliaNative && FoliaNative.ready) FoliaNative.ready();
  } catch (_) {}

  log("bridge installed");
})();
