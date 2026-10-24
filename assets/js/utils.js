/**
 * Lokenath Restaurant & Hotel — utils.js
 * Small, dependency-free helpers shared across all pages.
 */

export const $ = (selector, scope = document) => scope.querySelector(selector);

export const $$ = (selector, scope = document) =>
  Array.from(scope.querySelectorAll(selector));

const rupeeWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const rupeeExact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

/** Format integer paise as rupees, e.g. 28000 -> "₹280". */
export function formatCurrency(paise) {
  const value = (Number(paise) || 0) / 100;
  return Number.isInteger(value) ? rupeeWhole.format(value) : rupeeExact.format(value);
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export function debounce(fn, wait = 200) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Create an element safely (text is set via textContent). */
export function createEl(tag, { className, text, attrs } = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, String(value));
    }
  }
  return el;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Visible, keyboard-focusable elements inside a container, in DOM order. */
export function getFocusable(container) {
  return $$(FOCUSABLE_SELECTOR, container).filter(
    (el) => el.getClientRects().length > 0
  );
}

/* ---------- Toasts ---------- */

/**
 * The live region must exist before messages are inserted so screen readers
 * announce them. main.js calls this on load.
 */
export function ensureToastRegion() {
  let region = $(".toast-region");
  if (!region) {
    region = createEl("div", {
      className: "toast-region",
      attrs: { "aria-live": "polite", "aria-atomic": "false" },
    });
    document.body.append(region);
  }
  return region;
}

/**
 * Show a transient message.
 * @param {string} message
 * @param {{type?: "info"|"success"|"error", duration?: number}} [options]
 * @returns {() => void} dismiss function
 */
export function showToast(message, { type = "info", duration } = {}) {
  const region = ensureToastRegion();
  const lifetime = duration ?? (type === "error" ? 7000 : 4500);

  const toast = createEl("div", { className: `toast toast--${type}` });
  toast.append(createEl("p", { className: "toast__message", text: message }));
  region.append(toast);

  while (region.children.length > 3) {
    region.firstElementChild.remove();
  }

  requestAnimationFrame(() =>
    requestAnimationFrame(() => toast.classList.add("is-visible"))
  );

  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 300);
  };

  timer = setTimeout(dismiss, lifetime);
  toast.addEventListener("click", dismiss);
  return dismiss;
}

/* ---------- Scroll reveal ---------- */

let revealObserver;

/**
 * Reveal [data-reveal] elements as they enter the viewport.
 * Safe to call again after rendering dynamic content.
 */
export function revealOnScroll(root = document) {
  const items = $$("[data-reveal]:not(.is-visible)", root);
  if (!items.length) return;

  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  revealObserver ??= new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
  );

  items.forEach((el) => revealObserver.observe(el));
}
