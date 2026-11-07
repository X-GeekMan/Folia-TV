(function () {
  var cfg = window.__FOLIA_TV_API_CONFIG__ || {};
  var sentinel = cfg.sentinel || {};
  var map = [
    [sentinel.netease || "https://folia-tv.invalid/netease", (cfg.neteaseApiBase || "").replace(/\/$/, "")],
    [sentinel.qq || "https://folia-tv.invalid/qq", (cfg.qqApiBase || "").replace(/\/$/, "")],
    [sentinel.kugou || "https://folia-tv.invalid/kugou", (cfg.kugouApiBase || "").replace(/\/$/, "")],
  ].filter(function (pair) {
    return pair[1];
  });

  if (!map.length) return;

  function rewrite(url) {
    if (!url || typeof url !== "string") return url;
    for (var i = 0; i < map.length; i++) {
      var from = map[i][0];
      var to = map[i][1];
      if (url === from || url.indexOf(from + "/") === 0 || url.indexOf(from + "?") === 0) {
        return to + url.slice(from.length);
      }
    }
    return url;
  }

  window.FoliaTVConfig = {
    neteaseApiBase: cfg.neteaseApiBase || "",
    qqApiBase: cfg.qqApiBase || "",
    kugouApiBase: cfg.kugouApiBase || "",
    rewrite: rewrite,
  };

  var origFetch = window.fetch;
  if (typeof origFetch === "function") {
    window.fetch = function (input, init) {
      if (typeof input === "string") {
        return origFetch.call(this, rewrite(input), init);
      }
      if (input && typeof Request !== "undefined" && input instanceof Request) {
        var next = rewrite(input.url);
        if (next !== input.url) {
          return origFetch.call(this, new Request(next, input), init);
        }
      }
      return origFetch.call(this, input, init);
    };
  }

  var XO = window.XMLHttpRequest;
  if (XO && XO.prototype) {
    var open = XO.prototype.open;
    XO.prototype.open = function (method, url) {
      var args = Array.prototype.slice.call(arguments);
      if (typeof url === "string") args[1] = rewrite(url);
      return open.apply(this, args);
    };
  }

  try {
    if (window.FoliaNative && typeof window.FoliaNative.log === "function") {
      window.FoliaNative.log("api-rewrite ready: " + JSON.stringify(map.map(function (p) { return p[0] + "->" + p[1]; })));
    }
  } catch (e) {}
})();
