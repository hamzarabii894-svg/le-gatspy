/* ==========================================================================
   LE GATSBY — i18n engine (FR default / EN)
   - Dictionaries live in /locales/fr.json and /locales/en.json
   - Every visible string is keyed with data-i18n* attributes:
       data-i18n="path.to.key"              → element textContent
       data-i18n-placeholder="key"          → placeholder attribute
       data-i18n-aria="key"                 → aria-label attribute
       data-i18n-title="key"                → title attribute
       data-i18n-doc-title / -meta-desc     → <title> / meta description
   - Choice persisted in localStorage ("legatsby-lang"), <html lang> updated
   - window.I18N exposes t(key), getLocale(), setLocale(), onChange(cb)
     so main.js can render locale-driven content (menu, hours, services).
   ========================================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "legatsby-lang";
  var DEFAULT_LANG = "fr";
  var SUPPORTED = ["fr", "en"];

  var dicts = {};        // lang → dictionary object
  var current = DEFAULT_LANG;
  var listeners = [];

  /* Resolve "a.b.c" inside a nested object; returns undefined if missing */
  function lookup(dict, path) {
    return path.split(".").reduce(function (node, part) {
      return node && node[part] !== undefined ? node[part] : undefined;
    }, dict);
  }

  /* Translate a key in the current locale, falling back to French */
  function t(key) {
    var val = lookup(dicts[current], key);
    if (val === undefined) val = lookup(dicts[DEFAULT_LANG], key);
    return val !== undefined ? val : key;
  }

  function fetchDict(lang) {
    if (dicts[lang]) return Promise.resolve(dicts[lang]);
    return fetch("locales/" + lang + ".json")
      .then(function (res) {
        if (!res.ok) throw new Error("locale " + lang + " unavailable");
        return res.json();
      })
      .then(function (json) {
        dicts[lang] = json;
        return json;
      });
  }

  /* Apply the current dictionary to every tagged element */
  function applyTranslations() {
    document.documentElement.setAttribute("lang", current);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var val = t(el.getAttribute("data-i18n"));
      if (typeof val === "string") el.textContent = val;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });

    // Document title + meta description
    var titleEl = document.querySelector("title[data-i18n-doc-title]");
    if (titleEl) titleEl.textContent = t("meta.title");
    var descEl = document.querySelector("meta[data-i18n-meta-desc]");
    if (descEl) descEl.setAttribute("content", t("meta.description"));

    // Toggle buttons state (navbar + footer)
    document.querySelectorAll(".lang-toggle button[data-lang]").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === current;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    // Notify subscribers (main.js re-renders menu / info lists)
    listeners.forEach(function (cb) { cb(current); });
  }

  function setLocale(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    return fetchDict(lang).then(function () {
      current = lang;
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode */ }
      applyTranslations();
    }).catch(function () {
      /* Dictionary unreachable (e.g. opened via file://): the static HTML
         is already French, so the site stays usable. */
    });
  }

  function init() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    var lang = SUPPORTED.indexOf(saved) !== -1 ? saved : DEFAULT_LANG;

    // Wire every FR|EN toggle on the page
    document.querySelectorAll(".lang-toggle button[data-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLocale(btn.getAttribute("data-lang"));
      });
    });

    setLocale(lang);
  }

  window.I18N = {
    t: t,
    getLocale: function () { return current; },
    setLocale: setLocale,
    onChange: function (cb) { listeners.push(cb); }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
