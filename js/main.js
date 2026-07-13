/* ==========================================================================
   LE GATSBY — main behaviour
   Navbar, reveal-on-scroll, hero video lazy-load, menu tabs, gallery
   lightbox, practical-info lists, reservation form (API + WhatsApp fallback).
   No dependencies — IntersectionObserver + CSS transitions only.
   ========================================================================== */
(function () {
  "use strict";

  var WHATSAPP_NUMBER = "212700110110"; // wa.me target (no "+")

  document.addEventListener("DOMContentLoaded", function () {
    initNavbar();
    initReveal();
    initHeroSlides();
    initHeroVideo();
    initGallery();
    initReservationForm();

    // Locale-driven content: render now (i18n.js may already be ready)
    // and re-render on every language switch.
    renderLocaleContent();
    if (window.I18N) window.I18N.onChange(renderLocaleContent);
  });

  /* Small helper around the i18n dictionary with a safe fallback */
  function t(key) {
    return window.I18N ? window.I18N.t(key) : key;
  }

  /* ---------- Navbar: scrolled state + mobile burger ---------- */
  function initNavbar() {
    var navbar = document.getElementById("navbar");
    var burger = document.getElementById("burger");
    var links = document.getElementById("nav-links");

    function onScroll() {
      navbar.classList.toggle("is-scrolled", window.scrollY > 30);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    burger.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    // Close the mobile menu after tapping a link
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        links.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Hero slideshow (Ken Burns over real photos) ----------
     Slides are authored as .hero__slide divs in index.html. With one
     slide the CSS zoom loops on its own; with several, this rotates
     them with a crossfade every 9 seconds. */
  function initHeroSlides() {
    var container = document.getElementById("hero-slides");
    if (!container) return;
    var slides = container.querySelectorAll(".hero__slide");
    if (slides.length < 2) return;

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return; // first photo stays, static

    var current = 0;
    setInterval(function () {
      if (document.hidden) return; // don't cycle in background tabs
      slides[current].classList.remove("is-active");
      current = (current + 1) % slides.length;
      slides[current].classList.add("is-active");
    }, 9000);
  }

  /* ---------- Lazy background videos (hero, about…) ----------
     Every <video data-src> ships with only a poster; the mp4 source is
     attached after page load, and never on reduced-motion or Save-Data.
     All attached videos pause while the tab is hidden. */
  function initHeroVideo() {
    var videos = Array.prototype.slice.call(document.querySelectorAll("video[data-src]"));
    if (!videos.length) return;

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var saveData = navigator.connection && navigator.connection.saveData;
    if (reducedMotion || saveData) return; // posters only

    function attach() {
      videos.forEach(function (video) {
        if (video.src) return;
        video.src = video.getAttribute("data-src");
        video.play().catch(function () { /* autoplay blocked → poster stays */ });
      });
    }

    // Wait for full page load so videos never compete with critical assets
    if (document.readyState === "complete") attach();
    else window.addEventListener("load", attach);

    document.addEventListener("visibilitychange", function () {
      videos.forEach(function (video) {
        if (!video.src) return;
        if (document.hidden) video.pause();
        else video.play().catch(function () {});
      });
    });
  }

  /* ---------- Locale-driven content (menu, hours, services, payments) ---- */
  var activeMenuTab = 0; // preserved across language switches

  function renderLocaleContent() {
    renderMenu();
    renderInfoLists();
    renderGalleryAlts();
    updateWhatsAppLink();
  }

  /* Menu: tabs + panels built from menu.categories in the locale files */
  function renderMenu() {
    var tabsEl = document.getElementById("menu-tabs");
    var panelsEl = document.getElementById("menu-panels");
    var categories = t("menu.categories");
    if (!tabsEl || !Array.isArray(categories)) return;

    tabsEl.innerHTML = "";
    panelsEl.innerHTML = "";

    categories.forEach(function (cat, i) {
      var tab = document.createElement("button");
      tab.className = "menu__tab";
      tab.id = "tab-" + cat.id;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", "panel-" + cat.id);
      tab.setAttribute("aria-selected", String(i === activeMenuTab));
      tab.textContent = cat.label;
      tab.addEventListener("click", function () { selectMenuTab(i); });
      tabsEl.appendChild(tab);

      var panel = document.createElement("div");
      panel.className = "menu__panel";
      panel.id = "panel-" + cat.id;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", "tab-" + cat.id);
      if (i !== activeMenuTab) panel.hidden = true;

      cat.items.forEach(function (item) {
        var badges = (item.badges || []).map(function (b) {
          var label = t("menu.badge_" + (b === "veg" ? "veg" : b));
          return '<span class="badge badge--' + b + '">' + label + "</span>";
        }).join("");
        var art = document.createElement("article");
        art.className = "menu-item";
        art.innerHTML =
          '<div class="menu-item__row">' +
            '<h4 class="menu-item__name"></h4>' +
            '<span class="menu-item__dots" aria-hidden="true"></span>' +
            '<span class="menu-item__price">' + item.price + " MAD</span>" +
          "</div>" +
          '<p class="menu-item__desc"></p>' +
          (badges ? '<div class="menu-item__badges">' + badges + "</div>" : "");
        art.querySelector(".menu-item__name").textContent = item.name;
        art.querySelector(".menu-item__desc").textContent = item.desc;
        panel.appendChild(art);
      });

      panelsEl.appendChild(panel);
    });
  }

  function selectMenuTab(index) {
    activeMenuTab = index;
    var tabs = document.querySelectorAll(".menu__tab");
    var panels = document.querySelectorAll(".menu__panel");
    tabs.forEach(function (tab, i) { tab.setAttribute("aria-selected", String(i === index)); });
    panels.forEach(function (panel, i) { panel.hidden = i !== index; });
  }

  /* Practical info lists from the locale files */
  function renderInfoLists() {
    var hours = t("info.hours");
    var hoursEl = document.getElementById("info-hours");
    if (hoursEl && Array.isArray(hours)) {
      hoursEl.innerHTML = "";
      hours.forEach(function (h) {
        var li = document.createElement("li");
        var strong = document.createElement("strong");
        strong.textContent = h.days;
        li.appendChild(strong);
        li.appendChild(document.createTextNode(" · " + h.time));
        hoursEl.appendChild(li);
      });
    }
    fillList("info-services", t("info.services"));
    fillList("info-payments", t("info.payments"));
  }

  function fillList(id, items) {
    var el = document.getElementById(id);
    if (!el || !Array.isArray(items)) return;
    el.innerHTML = "";
    items.forEach(function (text) {
      var li = document.createElement("li");
      li.textContent = text;
      el.appendChild(li);
    });
  }

  /* Localised alt texts for gallery images */
  function renderGalleryAlts() {
    var alts = t("gallery.alts");
    if (!Array.isArray(alts)) return;
    document.querySelectorAll("#gallery-grid .gallery__item img").forEach(function (img, i) {
      if (alts[i]) img.alt = alts[i];
    });
  }

  /* Keep the static WhatsApp button's prefilled message in the active language */
  function updateWhatsAppLink() {
    var btn = document.getElementById("whatsapp-btn");
    if (!btn) return;
    btn.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(t("reserve.whatsapp_msg"));
  }

  /* ---------- Gallery lightbox ---------- */
  function initGallery() {
    var grid = document.getElementById("gallery-grid");
    var lightbox = document.getElementById("lightbox");
    var img = document.getElementById("lightbox-img");
    if (!grid || !lightbox) return;

    var thumbs = Array.prototype.slice.call(grid.querySelectorAll(".gallery__item img"));
    var index = 0;

    function show(i) {
      index = (i + thumbs.length) % thumbs.length;
      img.src = thumbs[index].src;
      img.alt = thumbs[index].alt;
    }
    function open(i) {
      show(i);
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
      document.getElementById("lightbox-close").focus();
    }
    function close() {
      lightbox.hidden = true;
      document.body.style.overflow = "";
    }

    grid.addEventListener("click", function (e) {
      var item = e.target.closest(".gallery__item");
      if (item) open(Number(item.getAttribute("data-index")));
    });
    document.getElementById("lightbox-close").addEventListener("click", close);
    document.getElementById("lightbox-prev").addEventListener("click", function () { show(index - 1); });
    document.getElementById("lightbox-next").addEventListener("click", function () { show(index + 1); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) close(); });
    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  }

  /* ---------- Reservation form ---------- */
  function initReservationForm() {
    var form = document.getElementById("reservation-form");
    if (!form) return;

    var timeSelect = document.getElementById("res-time");
    var guestsSelect = document.getElementById("res-guests");
    var dateInput = document.getElementById("res-date");
    var submitBtn = document.getElementById("res-submit");
    var sendError = document.getElementById("res-send-error");
    var successBox = document.getElementById("reservation-success");

    // Date picker: min = today (local timezone)
    var now = new Date();
    var today = now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");
    dateInput.min = today;

    // Time slots: 12:00 → 23:30, 30-minute steps
    fillTimeSlots(timeSelect);
    fillGuestOptions(guestsSelect);
    // Re-localise the select placeholders/labels on language switch
    if (window.I18N) {
      window.I18N.onChange(function () {
        fillTimeSlots(timeSelect);
        fillGuestOptions(guestsSelect);
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      sendError.hidden = true;

      var data = collectData(form);
      if (!validate(form, data)) return;

      // Honeypot filled → silently pretend success (bot traffic)
      if (data.company) { showSuccess(); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = t("reserve.sending");

      fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json().then(function (json) { return { ok: res.ok, json: json }; }); })
        .then(function (result) {
          if (result.ok && result.json.sent) {
            showSuccess();
          } else {
            // Email not configured (or Resend refused): WhatsApp fallback
            openWhatsAppFallback(data);
          }
        })
        .catch(function () {
          // Network error / static preview without the API: WhatsApp fallback
          openWhatsAppFallback(data);
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = t("reserve.submit");
        });
    });

    document.getElementById("res-again").addEventListener("click", function () {
      successBox.hidden = true;
      form.hidden = false;
      form.reset();
      fillTimeSlots(timeSelect);
      fillGuestOptions(guestsSelect);
      form.querySelector("input").focus();
    });

    function showSuccess() {
      form.hidden = true;
      successBox.hidden = false;
      successBox.classList.add("is-visible");
      successBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    /* When email delivery isn't available, open WhatsApp with the
       reservation prefilled so the request still reaches the restaurant. */
    function openWhatsAppFallback(data) {
      sendError.hidden = false;
      var seatingLabel = t("reserve.seat_" + data.seating);
      var lines = [
        t("reserve.wa_lead"),
        t("reserve.wa_name") + ": " + data.name,
        t("reserve.wa_phone") + ": " + data.phone,
        t("reserve.wa_date") + ": " + data.date,
        t("reserve.wa_time") + ": " + data.time,
        t("reserve.wa_guests") + ": " + data.guests,
        t("reserve.wa_seating") + ": " + seatingLabel
      ];
      if (data.requests) lines.push(t("reserve.wa_requests") + ": " + data.requests);
      window.open(
        "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n")),
        "_blank",
        "noopener"
      );
    }
  }

  function fillTimeSlots(select) {
    var previous = select.value;
    select.innerHTML = "";
    var ph = new Option(t("reserve.time_ph"), "");
    ph.disabled = true;
    ph.selected = true;
    select.appendChild(ph);
    for (var h = 12; h <= 23; h++) {
      ["00", "30"].forEach(function (m) {
        var label = String(h).padStart(2, "0") + ":" + m;
        select.appendChild(new Option(label, label));
      });
    }
    if (previous) select.value = previous;
  }

  function fillGuestOptions(select) {
    var previous = select.value;
    select.innerHTML = "";
    var ph = new Option(t("reserve.guests_ph"), "");
    ph.disabled = true;
    ph.selected = true;
    select.appendChild(ph);
    for (var n = 1; n <= 11; n++) {
      var label = n + " " + (n === 1 ? t("reserve.guest_singular") : t("reserve.guest_plural"));
      select.appendChild(new Option(label, String(n)));
    }
    select.appendChild(new Option(t("reserve.guests_12plus"), "12+"));
    if (previous) select.value = previous;
  }

  function collectData(form) {
    return {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      date: form.date.value,
      time: form.time.value,
      guests: form.guests.value,
      seating: form.seating.value,
      requests: form.requests.value.trim(),
      company: form.company.value.trim(), // honeypot
      lang: window.I18N ? window.I18N.getLocale() : "fr"
    };
  }

  /* Client-side validation with bilingual inline errors */
  function validate(form, data) {
    var valid = true;

    function setError(fieldName, hasError) {
      var errorEl = form.querySelector('[data-error-for="' + fieldName + '"]');
      var field = form[fieldName].closest(".field");
      if (errorEl) errorEl.hidden = !hasError;
      if (field) field.classList.toggle("has-error", hasError);
      if (hasError) valid = false;
    }

    setError("name", data.name.length < 2);
    setError("phone", !/^\+?[0-9 ().-]{8,20}$/.test(data.phone));
    setError("email", !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email));
    setError("date", !data.date || data.date < form.date.min);
    setError("time", !data.time);
    setError("guests", !data.guests);
    setError("seating", !data.seating);

    if (!valid) {
      var firstError = form.querySelector(".field.has-error input, .field.has-error select");
      if (firstError) firstError.focus();
    }
    return valid;
  }
})();
