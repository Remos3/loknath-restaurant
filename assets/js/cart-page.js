/**
 * Lokenath Restaurant & Hotel — cart-page.js
 * Cart page: renders lines, quantity controls, removal, totals and the empty
 * state. The "Order on WhatsApp" link opens WhatsApp with the order typed out;
 * nothing is sent until the customer presses send, and no payment is taken.
 *
 * Lines are reconciled (not re-created) on every change, so keyboard focus
 * stays on the control the person is using.
 */

import {
  MAX_QTY,
  clearCart,
  getItems,
  getTotals,
  isPersistent,
  removeItem,
  setQuantity,
  subscribe,
} from "./cart-store.js";
import { buildOrderUrl } from "./site-config.js";
import { $, createEl, formatCurrency, pluralize, showToast } from "./utils.js";

const els = {
  content: $("[data-cart-content]"),
  empty: $("[data-cart-empty]"),
  emptyTitle: $("[data-cart-empty-title]"),
  list: $("[data-cart-items]"),
  countLabel: $("[data-cart-count-label]"),
  subtotal: $("[data-summary-subtotal]"),
  tax: $("[data-summary-tax]"),
  taxLabel: $("[data-summary-tax-label]"),
  total: $("[data-summary-total]"),
  whatsapp: $("[data-whatsapp]"),
  storageWarning: $("[data-storage-warning]"),
  clearStart: $('[data-action="clear-start"]'),
  clearConfirm: $("[data-clear-confirm]"),
};

const lineEls = new Map(); // id -> <li>

/* ---------- Helpers ---------- */

/** Only allow local image paths from our own assets folder (guards tampered storage). */
function safeImage(src) {
  return typeof src === "string" && /^assets\/img\/[\w\-/]+\.(?:webp|jpe?g|png|avif)$/.test(src)
    ? src
    : "";
}

function setDisabled(button, disabled) {
  if (disabled) button.setAttribute("aria-disabled", "true");
  else button.removeAttribute("aria-disabled");
}

function readSnapshot() {
  return { items: getItems(), ...getTotals() };
}

/* ---------- Line items ---------- */

function buildLine(item) {
  const li = createEl("li", {
    className: "cart-line",
    attrs: { "data-id": item.id },
  });

  const src = safeImage(item.image);
  if (src) {
    const media = createEl("figure", { className: "cart-line__media" });
    const img = createEl("img", {
      attrs: { src, alt: "", width: 96, height: 120, loading: "lazy", decoding: "async" },
    });
    img.addEventListener("error", () => img.remove(), { once: true });
    media.append(img);
    li.append(media);
  } else {
    li.classList.add("cart-line--text"); // no empty image box
  }

  const info = createEl("div", { className: "cart-line__info" });
  info.append(
    createEl("h3", { className: "cart-line__name" }),
    createEl("p", { className: "cart-line__unit" })
  );

  const controls = createEl("div", { className: "cart-line__controls" });

  const qty = createEl("div", {
    className: "qty cart-line__qty",
    attrs: { role: "group" },
  });
  qty.append(
    createEl("button", {
      className: "qty__btn",
      text: "−",
      attrs: { type: "button", "data-action": "decrease" },
    }),
    createEl("output", { className: "qty__value", attrs: { "aria-live": "polite" } }),
    createEl("button", {
      className: "qty__btn",
      text: "+",
      attrs: { type: "button", "data-action": "increase" },
    })
  );

  const total = createEl("p", { className: "cart-line__total" });
  total.append(
    createEl("span", { className: "visually-hidden", text: "Line total: " }),
    createEl("span", { className: "cart-line__amount" })
  );

  controls.append(qty, total);

  const remove = createEl("button", {
    className: "text-btn cart-line__remove",
    text: "Remove",
    attrs: { type: "button", "data-action": "remove" },
  });

  li.append(info, controls, remove);
  return li;
}

function updateLine(li, item) {
  $(".cart-line__name", li).textContent = item.name;
  $(".cart-line__unit", li).textContent = `${formatCurrency(item.priceCents)} each`;
  $(".cart-line__amount", li).textContent = formatCurrency(item.priceCents * item.qty);

  const group = $(".cart-line__qty", li);
  group.setAttribute("aria-label", `Quantity of ${item.name}`);
  $(".qty__value", group).textContent = String(item.qty);

  const minus = $('[data-action="decrease"]', group);
  const plus = $('[data-action="increase"]', group);
  minus.setAttribute("aria-label", `Decrease quantity of ${item.name}`);
  plus.setAttribute("aria-label", `Increase quantity of ${item.name}`);
  setDisabled(minus, item.qty <= 1);
  setDisabled(plus, item.qty >= MAX_QTY);

  $('[data-action="remove"]', li).setAttribute("aria-label", `Remove ${item.name} from cart`);
}

function renderLines(items) {
  const ids = new Set(items.map((item) => item.id));

  // Remove first so the ordering pass below never moves a surviving line.
  for (const [id, li] of lineEls) {
    if (!ids.has(id)) {
      li.remove();
      lineEls.delete(id);
    }
  }

  items.forEach((item, index) => {
    let li = lineEls.get(item.id);
    if (!li) {
      li = buildLine(item);
      lineEls.set(item.id, li);
    }
    updateLine(li, item);

    const current = els.list.children[index];
    if (current !== li) els.list.insertBefore(li, current ?? null);
  });
}

/* ---------- Summary & page state ---------- */

function renderSummary({ count, subtotalCents, taxRate, taxCents, totalCents }) {
  els.countLabel.textContent = `${count} ${pluralize(count, "item")}`;
  els.subtotal.textContent = formatCurrency(subtotalCents);
  els.tax.textContent = formatCurrency(taxCents);
  els.total.textContent = formatCurrency(totalCents);
  els.taxLabel.textContent = `Tax (${Number((taxRate * 100).toFixed(2))}%)`;

  // Menu prices are final, so hide the tax row when no tax is added.
  const taxRow = els.tax.closest(".summary-line");
  if (taxRow) taxRow.hidden = taxCents === 0;
}

function resetClearConfirm() {
  els.clearConfirm.hidden = true;
  els.clearStart.hidden = false;
}

function render(snapshot = readSnapshot()) {
  const isEmpty = snapshot.items.length === 0;

  els.content.hidden = isEmpty;
  els.empty.hidden = !isEmpty;
  els.storageWarning.hidden = isPersistent();

  if (isEmpty) {
    resetClearConfirm();
  } else {
    els.whatsapp.href = buildOrderUrl(snapshot.items, snapshot);
  }

  renderLines(snapshot.items);
  renderSummary(snapshot);
}

/* ---------- Actions ---------- */

function removeLine(li, line) {
  const neighbor = li.nextElementSibling ?? li.previousElementSibling;
  removeItem(line.id); // emits synchronously, so the list is already re-rendered
  showToast(`${line.name} removed from your cart.`);

  const target = neighbor?.isConnected ? $('[data-action="remove"]', neighbor) : null;
  (target ?? els.emptyTitle).focus();
}

function onListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button || button.getAttribute("aria-disabled") === "true") return;

  const li = button.closest(".cart-line");
  const id = li?.dataset.id;
  const line = id ? getItems().find((item) => item.id === id) : null;
  if (!line) return;

  switch (button.dataset.action) {
    case "increase":
      if (line.qty >= MAX_QTY) {
        showToast(`You can order up to ${MAX_QTY} of each dish.`);
      } else {
        setQuantity(id, line.qty + 1);
      }
      break;
    case "decrease":
      if (line.qty > 1) setQuantity(id, line.qty - 1);
      break;
    case "remove":
      removeLine(li, line);
      break;
    default:
      break;
  }
}

function onContentClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  switch (button.dataset.action) {
    case "clear-start":
      els.clearStart.hidden = true;
      els.clearConfirm.hidden = false;
      $('[data-action="clear-cancel"]', els.clearConfirm).focus();
      break;
    case "clear-cancel":
      resetClearConfirm();
      els.clearStart.focus();
      break;
    case "clear-confirm":
      clearCart(); // emits synchronously and shows the empty state
      showToast("Your cart has been cleared.");
      els.emptyTitle.focus();
      break;
    default:
      break;
  }
}

/* ---------- Boot ---------- */

if (Object.values(els).every(Boolean)) {
  els.list.addEventListener("click", onListClick);
  els.content.addEventListener("click", onContentClick);

  // Fires for changes on this page, in other tabs, and after bfcache restores.
  subscribe((snapshot) => render(snapshot));
  render();
    }
