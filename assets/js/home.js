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

/* ---------- Opening hours: highlight today ---------- */
function initHours() {
  const list = $("[data-hours]");
  if (!list) return;

  const today = String(new Date().getDay());
  const row = $$("[data-days]", list).find((el) =>
    el.dataset.days.split(" ").includes(today)
  );
  if (!row) return;

  row.classList.add("is-today");
  row.setAttribute("aria-current", "date");

  const hours = $("dd", row).textContent.trim();
  const status = $("[data-hours-status]");
  if (status) {
    status.textContent =
      hours.toLowerCase() === "closed"
        ? "We’re closed today. See you tomorrow."
        : `Open today, ${hours} (Portland time).`;
  }
}

initAddToCart();
initHours();
