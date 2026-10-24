/**
 * Lokenath Restaurant & Hotel — home.js
 * Homepage only: add-to-cart buttons and the open/closed status line.
 * Shared behaviour (nav, cart badge, reveal) lives in main.js.
 */

import { addItem } from "./cart-store.js";
import { $, showToast } from "./utils.js";

/* ---------- Featured menu: add to cart ---------- */
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

    showToast(`${name} added to your cart.`, { type: "success" });

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

/* ---------- Open / closed status (India time) ---------- */
const OPEN_MINUTES = 9 * 60; //  9:00 am
const CLOSE_MINUTES = 20 * 60; // 8:00 pm

/** Minutes since midnight in India, or null if Intl can't resolve the zone. */
function indiaMinutes() {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    }).formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    const minute = Number(parts.find((p) => p.type === "minute")?.value);
    return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null;
  } catch {
    return null;
  }
}

function initHours() {
  const status = $("[data-hours-status]");
  if (!status) return;

  const now = indiaMinutes();
  if (now === null) return;

  status.textContent =
    now >= OPEN_MINUTES && now < CLOSE_MINUTES
      ? "Open now, until 8:00 pm (India time)."
      : "Closed right now. We open at 9:00 am (India time).";
}

initAddToCart();
initHours();
