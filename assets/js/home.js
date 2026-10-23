/**
 * Oriel — home.js
 * Homepage only: demo add-to-cart buttons and today's opening hours.
 * Shared behaviour (nav, cart badge, reveal) lives in main.js.
 */

import { addItem } from "./cart-store.js";
import { $, $$, showToast } from "./utils.js";

/* ---------- Featured menu: add to cart (demo) ---------- */
function initAddToCart() {
  const timers = new WeakMap();

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-to-cart]");
    if (!button) return;

    const { id, name, priceCents, image } = button.dataset;
    const line = addItem({ id, name, priceCents: Number(priceCents), image });

    if (!line) {
      showToast("Sorry, that item couldn’t be added.", { type: "error" });
      return;
    }

    showToast(`${name} added to your cart (demo).`, { type: "success" });

    // Brief visual confirmation on the button itself.
    const label = button.firstChild;
    const original = label.textContent;
    button.classList.add("is-added");
    label.textContent = "Added ✓";
    clearTimeout(timers.get(button));
    timers.set(
      button,
      setTimeout(() => {
        button.classList.remove("is-added");
        label.textContent = original;
      }, 1600)
    );
  });
}

/* ---------- Opening hours: highlight today (Portland time) ---------- */

/** Weekday number (0 = Sunday) in Portland, or null if Intl can't resolve the zone. */
function portlandWeekday() {
  try {
    const name = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "America/Los_Angeles",
    }).format(new Date());
    const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
    return index === -1 ? null : index;
  } catch {
    return null;
  }
}

function initHours() {
  const list = $("[data-hours]");
  if (!list) return;

  const portland = portlandWeekday();
  const day = portland ?? new Date().getDay();
  const zoneNote = portland === null ? "" : " (Portland time)";

  const row = $$("[data-days]", list).find((el) =>
    el.dataset.days.split(" ").includes(String(day))
  );
  if (!row) return;

  row.classList.add("is-today");
  row.setAttribute("aria-current", "date");

  const hours = $("dd", row).textContent.trim();
  const status = $("[data-hours-status]");
  if (status) {
    status.textContent =
      hours.toLowerCase() === "closed"
        ? `We’re closed today${zoneNote}. See you tomorrow.`
        : `Open today, ${hours}${zoneNote}.`;
  }
}

initAddToCart();
initHours();
