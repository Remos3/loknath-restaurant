
/**
 * Oriel — cart-store.js
 * localStorage-backed cart (DEMO ONLY: no real orders or payments).
 *
 * - Money is stored as integer cents to avoid floating-point errors.
 * - Each line keeps a snapshot of name/price/image taken at add-to-cart time.
 * - Falls back to in-memory storage if localStorage is blocked.
 * - Every change dispatches a "cart:change" event on window, so the header
 *   badge and the cart page stay in sync (including across browser tabs).
 */

const STORAGE_KEY = "oriel.cart.v1";

export const CART_EVENT = "cart:change";
export const MAX_QTY = 20;
export const TAX_RATE = 0.0875; // Demo estimate only.

let memoryCart = [];
let storageAvailable = detectStorage();

function detectStorage() {
  try {
    const probe = "__oriel_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function clampQty(value) {
  const qty = Math.floor(Number(value));
  if (!Number.isFinite(qty)) return 1;
  return Math.min(Math.max(qty, 1), MAX_QTY);
}

function sanitizeItem(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id = typeof raw.id === "string" ? raw.id.trim().slice(0, 64) : "";
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 120) : "";
  const priceCents = raw.priceCents;

  if (!id || !name) return null;
  if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 10_000_000) {
    return null;
  }

  return {
    id,
    name,
    priceCents,
    qty: clampQty(raw.qty),
    image: typeof raw.image === "string" ? raw.image.slice(0, 300) : "",
  };
}

function readCart() {
  if (!storageAvailable) return memoryCart.map((item) => ({ ...item }));

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Cart is not an array");
    return parsed.map(sanitizeItem).filter(Boolean);
  } catch {
    // Corrupt or unreadable data: reset instead of breaking the site.
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return [];
  }
}

function writeCart(items) {
  memoryCart = items.map((item) => ({ ...item }));
  if (!storageAvailable) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded or storage blocked mid-session: keep working in memory.
    storageAvailable = false;
  }
}

function computeTotals(items) {
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.priceCents * item.qty,
    0
  );
  const taxCents = Math.round(subtotalCents * TAX_RATE);

  return {
    count,
    subtotalCents,
    taxRate: TAX_RATE,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}

function snapshot() {
  const items = readCart();
  return { items, ...computeTotals(items) };
}

function emit() {
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: snapshot() }));
}

/* ---------- Public API ---------- */

/** @returns {Array<{id:string,name:string,priceCents:number,qty:number,image:string}>} */
export function getItems() {
  return readCart();
}

export function getCount() {
  return computeTotals(readCart()).count;
}

/** @returns {{count:number,subtotalCents:number,taxRate:number,taxCents:number,totalCents:number}} */
export function getTotals() {
  return computeTotals(readCart());
}

/** True when the cart survives page reloads (localStorage is working). */
export function isPersistent() {
  return storageAvailable;
}

/**
 * Add a dish to the cart (or increase its quantity).
 * @param {{id:string,name:string,priceCents:number,image?:string}} product
 * @param {number} [quantity=1]
 * @returns {object|null} the updated cart line, or null if the product is invalid
 */
export function addItem(product, quantity = 1) {
  const candidate = sanitizeItem({ ...product, qty: quantity });
  if (!candidate) return null;

  const items = readCart();
  const existing = items.find((item) => item.id === candidate.id);

  if (existing) {
    existing.qty = clampQty(existing.qty + candidate.qty);
    // Refresh the snapshot in case price or name changed in the menu data.
    existing.name = candidate.name;
    existing.priceCents = candidate.priceCents;
    existing.image = candidate.image || existing.image;
  } else {
    items.push(candidate);
  }

  writeCart(items);
  emit();
  return items.find((item) => item.id === candidate.id);
}

/** Set an exact quantity. A quantity of 0 or less removes the line. */
export function setQuantity(id, quantity) {
  const qty = Math.floor(Number(quantity));
  if (!Number.isFinite(qty) || qty <= 0) {
    removeItem(id);
    return;
  }

  const items = readCart();
  const line = items.find((item) => item.id === id);
  if (!line) return;

  line.qty = clampQty(qty);
  writeCart(items);
  emit();
}

export function removeItem(id) {
  const items = readCart();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return;

  writeCart(next);
  emit();
}

export function clearCart() {
  writeCart([]);
  emit();
}

/**
 * Listen for cart changes. The callback receives {items, count, subtotalCents,
 * taxRate, taxCents, totalCents}. Returns an unsubscribe function.
 */
export function subscribe(callback) {
  const handler = (event) => callback(event.detail);
  window.addEventListener(CART_EVENT, handler);
  return () => window.removeEventListener(CART_EVENT, handler);
}

// Keep multiple open tabs in sync.
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) emit();
});

// NEW: a page restored from the back/forward cache is a frozen snapshot, so
// re-read the cart and notify the badge, menu and cart page.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) emit();
});
