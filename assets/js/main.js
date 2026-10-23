/**
 * Oriel — main.js
 * Loaded on every page: <script type="module" src="assets/js/main.js"></script>
 * Handles the accessible mobile menu, header state, active link, cart badge,
 * footer year, image fallbacks and scroll reveal.
 */

import { getCount, subscribe } from "./cart-store.js";
import {
  $,
  $$,
  ensureToastRegion,
  getFocusable,
  pluralize,
  prefersReducedMotion,
  revealOnScroll,
} from "./utils.js";

const DESKTOP_QUERY = "(min-width: 900px)";

/** Run each initialiser independently so one failure can't break the rest. */
function safely(name, fn) {
  try {
    fn();
  } catch (error) {
    console.error(`[oriel] ${name} failed`, error);
  }
}

/* ---------- Mobile navigation ---------- */
function initNav() {
  const header = $("[data-site-header]");
  const toggle = $("[data-nav-toggle]");
  const nav = $("[data-site-nav]");
  if (!header || !toggle || !nav) return;

  const root = document.documentElement;
  const desktop = window.matchMedia(DESKTOP_QUERY);
  const inertTargets = $$("main, .site-footer");

  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";

  function setOpen(open, { restoreFocus = false } = {}) {
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    root.classList.toggle("is-nav-open", open);

    inertTargets.forEach((el) => {
      if (open) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });

    if (open) {
      const firstLink = $("a", nav);
      if (firstLink) firstLink.focus();
    } else if (restoreFocus) {
      toggle.focus();
    }
  }

  toggle.addEventListener("click", () => setOpen(!isOpen()));

  // Close after choosing a link (matters for same-page anchors).
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (!isOpen()) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false, { restoreFocus: true });
      return;
    }

    if (event.key !== "Tab") return;

    // Keep Tab / Shift+Tab inside the header while the menu is open.
    const focusable = getFocusable(header);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Reset when the viewport grows to the desktop layout.
  desktop.addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });

  // Restore a clean state when returning via the back/forward cache.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) setOpen(false);
  });
}

/* ---------- Active link ---------- */
/**
 * Compares full normalised paths, so it works at the domain root, under a
 * GitHub Pages repo subpath (/repo/menu.html) and with clean URLs (/repo/menu).
 * `link.pathname` resolves against <base href> when a page sets one.
 */
function markActiveLink() {
  const links = $$(".site-nav__link");
  if (!links.length) return;

  const normalize = (path) =>
    path.replace(/index\.html$/, "").replace(/\.html$/, "").replace(/\/+$/, "");

  const current = normalize(window.location.pathname);
  const match = links.find((link) => normalize(link.pathname) === current);

  if (match) match.setAttribute("aria-current", "page");
}

/* ---------- Header scroll state ---------- */
function initHeaderState() {
  const header = $("[data-site-header]");
  if (!header) return;

  let ticking = false;

  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );

  update();
}

/* ---------- Cart badge ---------- */
function renderCartBadge(count, { animate = false } = {}) {
  const label =
    count > 0 ? `Cart, ${count} ${pluralize(count, "item")}` : "Cart, empty";

  $$("[data-cart-link]").forEach((link) => link.setAttribute("aria-label", label));

  $$("[data-cart-count]").forEach((badge) => {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;

    if (animate && count > 0 && !prefersReducedMotion()) {
      badge.classList.remove("is-bumped");
      void badge.offsetWidth; // restart the animation
      badge.classList.add("is-bumped");
    }
  });
}

function initCartBadge() {
  renderCartBadge(getCount());
  subscribe(({ count }) => renderCartBadge(count, { animate: true }));
}

/* ---------- Footer year ---------- */
function initYear() {
  const year = String(new Date().getFullYear());
  $$("[data-year]").forEach((el) => {
    el.textContent = year;
  });
}

/* ---------- Image fallbacks ---------- */
/**
 * A missing image is hidden (the figure's background colour shows instead of a
 * broken-image icon). The "load" listener undoes the flag if a lazy image that
 * looked broken early turns out to load fine.
 */
function initImageFallbacks() {
  document.addEventListener(
    "error",
    (event) => {
      if (event.target instanceof HTMLImageElement) {
        event.target.classList.add("is-broken");
      }
    },
    true
  );

  document.addEventListener(
    "load",
    (event) => {
      if (event.target instanceof HTMLImageElement) {
        event.target.classList.remove("is-broken");
      }
    },
    true
  );

  // Images that already failed before this module ran.
  $$("img").forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
      img.classList.add("is-broken");
    }
  });
}

/* ---------- Boot ---------- */
const root = document.documentElement;
root.classList.add("js");
// Cancels the CSS reveal failsafe in pages.css (content shows after 4s if this never runs).
root.classList.add("js-ready");

safely("toast region", ensureToastRegion);
safely("navigation", initNav);
safely("active link", markActiveLink);
safely("header state", initHeaderState);
safely("cart badge", initCartBadge);
safely("footer year", initYear);
safely("image fallbacks", initImageFallbacks);
safely("scroll reveal", () => revealOnScroll());
